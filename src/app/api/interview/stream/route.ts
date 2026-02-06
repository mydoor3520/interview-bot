import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { createAIClient } from '@/lib/ai/client';
import { buildInterviewSystemPrompt } from '@/lib/ai/prompts';
import { ProfileContext } from '@/lib/ai/types';
import { checkAIRateLimit } from '@/lib/ai/rate-limit';
import { ERROR_CODES } from '@/lib/ai/error-codes';
import { z } from 'zod';

// 면접 시작 트리거 메시지 (정확한 매칭으로 필터링)
const START_TRIGGER = '면접을 시작해주세요. 인사와 함께 첫 번째 질문을 해주세요.';

// 스킵/다음 질문 트리거 (정확한 매칭)
const SKIP_TRIGGER = '[질문 스킵] 다음 질문으로 넘어가주세요.';
const NEXT_TRIGGER = '[다음 질문] 다음 질문을 해주세요.';

const streamRequestSchema = z.object({
  sessionId: z.string(),
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string().max(50000),
    })
  ).max(100),
});

export async function POST(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  // AI rate limit check
  const rateLimit = checkAIRateLimit();
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'AI 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
    );
  }

  const body = await request.json();
  const result = streamRequestSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: '입력 데이터가 올바르지 않습니다.', details: result.error.issues },
      { status: 400 }
    );
  }

  const { sessionId, messages } = result.data;

  // Load session with profile data
  const session = await prisma.interviewSession.findFirst({
    where: { id: sessionId, userId: auth.user.userId },
    include: { targetPosition: true },
  });

  if (!session) {
    return NextResponse.json({ error: '세션을 찾을 수 없습니다.' }, { status: 404 });
  }

  if (session.status !== 'in_progress') {
    return NextResponse.json({ error: '진행 중인 세션이 아닙니다.' }, { status: 400 });
  }

  // Load profile data
  const profile = await prisma.userProfile.findFirst({
    where: { userId: auth.user.userId },
    include: {
      skills: true,
      experiences: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  if (!profile) {
    return NextResponse.json({ error: '프로필을 찾을 수 없습니다.' }, { status: 404 });
  }

  // Build profile context
  const profileContext: ProfileContext = {
    name: profile.name,
    totalYearsExp: profile.totalYearsExp,
    currentRole: profile.currentRole,
    currentCompany: profile.currentCompany || undefined,
    skills: profile.skills.map((s) => ({
      name: s.name,
      category: s.category,
      proficiency: s.proficiency,
      yearsUsed: s.yearsUsed || undefined,
    })),
    experiences: profile.experiences.map((e) => ({
      company: e.company,
      role: e.role,
      startDate: e.startDate.toISOString().split('T')[0],
      endDate: e.endDate ? e.endDate.toISOString().split('T')[0] : undefined,
      description: e.description || undefined,
      techStack: e.techStack,
      achievements: e.achievements,
    })),
    selfIntroduction: profile.selfIntroduction || undefined,
    resumeText: profile.resumeText || undefined,
    strengths: profile.strengths,
    weaknesses: profile.weaknesses,
    targetPosition: session.targetPosition
      ? {
          company: session.targetPosition.company,
          position: session.targetPosition.position,
          jobDescription: session.targetPosition.jobDescription || undefined,
          requirements: session.targetPosition.requirements,
        }
      : undefined,
  };

  // Build system prompt
  const systemPrompt = buildInterviewSystemPrompt(
    profileContext,
    session.topics,
    session.difficulty,
    session.evaluationMode as 'immediate' | 'after_complete'
  );

  // Prepare messages with system prompt
  const finalMessages =
    messages.length === 0 || messages[0].role !== 'system'
      ? [{ role: 'system' as const, content: systemPrompt }, ...messages]
      : messages;

  // --- 대화 흐름 분석: 사용자의 마지막 메시지와 기존 assistant 메시지 수 파악 ---
  const userMessages = messages.filter((m) => m.role === 'user');
  const lastUserMessage = userMessages.length > 0 ? userMessages[userMessages.length - 1].content : null;
  const existingAssistantCount = messages.filter((m) => m.role === 'assistant').length;

  // 시작 트리거 여부 판별
  const isStartTrigger = lastUserMessage === START_TRIGGER;
  // 스킵 판별 (정확한 매칭)
  const isSkip = lastUserMessage === SKIP_TRIGGER;
  // 다음 질문 판별 (정확한 매칭)
  const isNextQuestion = lastUserMessage === NEXT_TRIGGER;
  // 실제 사용자 답변인지 판별: 시작 트리거도 아니고, 스킵도 아니고, 다음 질문 요청도 아닌 경우
  const isRealAnswer = lastUserMessage !== null && !isStartTrigger && !isSkip && !isNextQuestion;

  // --- 사용자 답변 저장 (AI 스트리밍 시작 전에 await로 저장) ---
  if (isRealAnswer && lastUserMessage) {
    try {
      // 가장 최근 pending 상태의 질문에 답변을 연결
      const pendingQuestion = await prisma.question.findFirst({
        where: { sessionId, status: 'pending' },
        orderBy: { orderIndex: 'desc' },
      });

      if (pendingQuestion) {
        await prisma.question.update({
          where: { id: pendingQuestion.id },
          data: {
            userAnswer: lastUserMessage,
            status: 'answered',
            answeredAt: new Date(),
          },
        });
      }
    } catch (err) {
      console.error('[Stream] Error saving user answer:', err);
    }
  }

  // --- 스킵 처리: pending 질문을 skipped 상태로 변경 ---
  if (isSkip) {
    try {
      const pendingQuestion = await prisma.question.findFirst({
        where: { sessionId, status: 'pending' },
        orderBy: { orderIndex: 'desc' },
      });

      if (pendingQuestion) {
        await prisma.question.update({
          where: { id: pendingQuestion.id },
          data: { status: 'skipped' },
        });
      }
    } catch (err) {
      console.error('[Stream] Error marking question as skipped:', err);
    }
  }

  // Stream AI response with timeout
  const encoder = new TextEncoder();
  let fullResponse = '';
  const abortController = new AbortController();
  const streamTimeout = setTimeout(() => abortController.abort(), 30_000);

  // Monitor client disconnect
  request.signal.addEventListener('abort', () => {
    abortController.abort();
  });

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const aiClient = createAIClient({ sessionId, endpoint: 'stream' });
        for await (const chunk of aiClient.streamChat({
          messages: finalMessages,
          model: process.env.AI_MODEL || 'claude-sonnet-4',
          temperature: 0.7,
        })) {
          fullResponse += chunk;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
        }
        clearTimeout(streamTimeout);
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (error: unknown) {
        clearTimeout(streamTimeout);
        const isTimeout = error instanceof DOMException && error.name === 'AbortError';
        console.error('AI streaming error:', error);

        let errorMessage: string;
        let errorCode: string;
        if (isTimeout) {
          errorMessage = 'AI 응답 시간이 초과되었습니다. (30초 제한)';
          errorCode = ERROR_CODES.TIMEOUT;
        } else if (error instanceof TypeError && error.message === 'fetch failed') {
          const cause = (error as TypeError & { cause?: Error }).cause;
          const causeMsg = cause?.message || '';
          if (causeMsg.includes('ECONNREFUSED')) {
            errorMessage = `AI 프록시 서버에 연결할 수 없습니다. (${process.env.AI_PROXY_URL || 'http://localhost:3456'}) - 서버가 실행 중인지 확인하세요.`;
            errorCode = ERROR_CODES.PROXY_UNAVAILABLE;
          } else {
            errorMessage = `AI 서버 연결 실패: ${causeMsg || error.message}`;
            errorCode = ERROR_CODES.NETWORK_ERROR;
          }
        } else if (error instanceof Error && 'status' in error && (error as Error & { status?: number }).status === 429) {
          errorMessage = 'AI 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
          errorCode = ERROR_CODES.RATE_LIMITED;
        } else if (error instanceof Error) {
          errorMessage = `AI 오류: ${error.message}`;
          errorCode = ERROR_CODES.STREAM_ERROR;
        } else {
          errorMessage = 'AI 응답 생성 중 알 수 없는 오류가 발생했습니다.';
          errorCode = ERROR_CODES.STREAM_ERROR;
        }

        // Save partial response if we have content
        if (fullResponse && fullResponse.length > 50) {
          try {
            await prisma.question.upsert({
              where: {
                sessionId_orderIndex: { sessionId, orderIndex: existingAssistantCount }
              },
              create: {
                sessionId,
                orderIndex: existingAssistantCount,
                content: fullResponse + '\n\n[응답이 중단되었습니다]',
                category: session.topics[0] || 'General',
                difficulty: session.difficulty,
                status: 'pending',
              },
              update: {
                content: fullResponse + '\n\n[응답이 중단되었습니다]',
              },
            });
          } catch (saveErr) {
            console.error('[Stream] Failed to save partial response:', saveErr);
          }
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: errorMessage, code: errorCode })}\n\n`
          )
        );
      } finally {
        controller.close();

        // --- AI 응답을 질문으로 DB에 저장 ---
        // AI의 모든 응답을 질문(Question)으로 저장한다.
        // orderIndex는 이 응답이 몇 번째 assistant 메시지인지로 결정.
        // (existingAssistantCount는 이 요청 이전의 assistant 메시지 수이므로,
        //  새로운 응답의 orderIndex = existingAssistantCount)
        if (fullResponse) {
          const newOrderIndex = existingAssistantCount;
          try {
            await prisma.question.upsert({
              where: {
                sessionId_orderIndex: {
                  sessionId,
                  orderIndex: newOrderIndex,
                },
              },
              create: {
                sessionId,
                orderIndex: newOrderIndex,
                content: fullResponse,
                category: session.topics[0] || 'General',
                difficulty: session.difficulty,
                status: 'pending',
              },
              update: {
                // 이미 존재하면 내용만 업데이트 (중복 요청 방지)
                content: fullResponse,
              },
            });
          } catch (err) {
            console.error('[Stream] Error saving question to DB:', err);
          }
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
