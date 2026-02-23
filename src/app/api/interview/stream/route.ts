import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { createAIClient } from '@/lib/ai/client';
import { buildInterviewSystemPrompt, buildAdaptiveDifficultyHint } from '@/lib/ai/prompts';
import { ProfileContext } from '@/lib/ai/types';
import { checkAIRateLimit } from '@/lib/ai/rate-limit';
import { ERROR_CODES } from '@/lib/ai/error-codes';
import { TIER_LIMITS } from '@/lib/feature-gate';
import type { TierKey } from '@/lib/feature-gate';
import { env } from '@/lib/env';
import { z } from 'zod';
import { loadKnowledgeForSession } from '@/lib/interview-knowledge';
import { getCompanyStyle } from '@/lib/interview-knowledge/company-styles';
import type { DifficultyLevel } from '@/lib/interview-knowledge/types';
import type { SectionFeedback, CareerItemFeedback } from '@/lib/ai/resume-editor';

// 면접 시작 트리거 메시지 (정확한 매칭으로 필터링)
const START_TRIGGER = '면접을 시작해주세요. 인사와 함께 첫 번째 질문을 해주세요.';

// 스킵 트리거 (정확한 매칭)
const SKIP_TRIGGER = '[건너뛰기]';

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
    include: { targetPosition: true, resumeEdit: true },
  });

  if (!session) {
    return NextResponse.json({ error: '세션을 찾을 수 없습니다.' }, { status: 404 });
  }

  if (session.status !== 'in_progress') {
    return NextResponse.json({ error: '진행 중인 세션이 아닙니다.' }, { status: 400 });
  }

  // Question limit check — enforce questionsPerSession from tier limits (본질문만 카운트)
  const tier = (auth.user.tier || 'FREE') as TierKey;
  const questionLimit = TIER_LIMITS[tier].questionsPerSession;
  const maxFollowUps = TIER_LIMITS[tier].followUpDepth;
  const mainQuestionCount = await prisma.question.count({
    where: { sessionId, isFollowUp: false },
  });

  if (questionLimit !== null && mainQuestionCount >= questionLimit) {
    // Auto-complete the session
    await prisma.question.updateMany({
      where: { sessionId, status: 'pending' },
      data: { status: 'unanswered' },
    });
    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
        endReason: 'question_limit',
        questionCount: mainQuestionCount,
        completedAt: new Date(),
      },
    });
    return NextResponse.json(
      {
        error: `질문 한도(${questionLimit}개)에 도달하여 면접이 자동 종료되었습니다.`,
        sessionEnded: true,
      },
      { status: 403 }
    );
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
          preferredQualifications: session.targetPosition.preferredQualifications,
          requiredExperience: session.targetPosition.requiredExperience || undefined,
        }
      : undefined,
  };

  // Override profile fields with position-specific resume edit
  if (session.resumeEdit) {
    const sections = session.resumeEdit.sections as unknown as SectionFeedback[];
    for (const section of sections) {
      switch (section.section) {
        case 'selfIntro':
          if (section.improvedText) profileContext.selfIntroduction = section.improvedText;
          break;
        case 'resume':
          if (section.improvedText) profileContext.resumeText = section.improvedText;
          break;
        case 'strengths':
          if (section.improvedList && section.improvedList.length > 0) profileContext.strengths = section.improvedList;
          break;
        case 'weaknesses':
          if (section.improvedList && section.improvedList.length > 0) profileContext.weaknesses = section.improvedList;
          break;
        case 'career':
          if (section.careerItems && section.careerItems.length > 0) {
            for (const item of section.careerItems as CareerItemFeedback[]) {
              const exp = profileContext.experiences[item.careerIndex];
              if (!exp) {
                console.warn(`[ResumeEdit] Career index ${item.careerIndex} out of range`);
                continue;
              }
              if (exp.company !== item.company) {
                console.warn(`[ResumeEdit] Career mismatch at [${item.careerIndex}]: expected "${item.company}", got "${exp.company}"`);
                continue;
              }
              exp.description = item.improvedDescription;
              exp.achievements = item.improvedAchievements;
            }
          }
          break;
      }
    }
  }

  // Load tech knowledge base for session
  let techKnowledge = undefined;
  let companyStyleData = undefined;

  try {
    // Apply tier-based filtering to tech knowledge
    const allowedTechIds = TIER_LIMITS[tier].techKnowledge;
    let filteredTopics = session.topics;

    // Filter topics if not 'all'
    if (allowedTechIds !== 'all') {
      const { resolveTechIds } = await import('@/lib/interview-knowledge');
      const resolvedIds = resolveTechIds(session.topics);
      const allowedIds = resolvedIds.filter(id => (allowedTechIds as readonly string[]).includes(id));

      // If no allowed tech IDs, skip knowledge loading
      if (allowedIds.length === 0) {
        filteredTopics = [];
      } else {
        filteredTopics = session.topics; // Will be filtered inside loadKnowledgeForSession
      }
    }

    if (filteredTopics.length > 0) {
      // Map user skills to tech/proficiency pairs for per-skill difficulty
      const userSkillsForKnowledge = profile.skills.map(s => ({
        tech: s.name,
        proficiency: s.proficiency,
      }));

      techKnowledge = await loadKnowledgeForSession(
        filteredTopics,
        session.difficulty as DifficultyLevel,
        userSkillsForKnowledge
      );

      // Filter loaded knowledge by tier limits
      if (allowedTechIds !== 'all' && techKnowledge) {
        techKnowledge.technologies = techKnowledge.technologies.filter(tech =>
          (allowedTechIds as readonly string[]).includes(tech.techId)
        );

        // Skip cross-tech topics if not allowed
        if (!TIER_LIMITS[tier].crossTechQuestions) {
          techKnowledge.crossTechTopics = [];
        }
      }
    }
  } catch (err) {
    console.warn('[Stream] Failed to load tech knowledge:', err);
  }

  // Load company style if set
  // Use type assertion for Prisma $extends() compatibility
  const sessionCompanyStyle = (session as any).companyStyle as string | null;
  if (sessionCompanyStyle) {
    companyStyleData = getCompanyStyle(sessionCompanyStyle);
  }

  // Compute follow-up context: how many follow-ups the last main question has
  const lastMainQuestion = await prisma.question.findFirst({
    where: { sessionId, isFollowUp: false },
    orderBy: { orderIndex: 'desc' },
  });
  let currentFollowUpCount = 0;
  if (lastMainQuestion) {
    currentFollowUpCount = await prisma.question.count({
      where: { sessionId, isFollowUp: true, orderIndex: { gt: lastMainQuestion.orderIndex } },
    });
  }
  const canAskFollowUp = currentFollowUpCount < maxFollowUps;
  const followUpContext = { maxFollowUps, currentFollowUpCount, canAskFollowUp };

  // Load evaluation data for adaptive difficulty
  let adaptiveHint = '';
  try {
    const evaluatedQuestions = await (prisma.question as any).findMany({
      where: {
        sessionId,
        status: 'evaluated',
        evaluation: {
          isNot: null,
        },
      },
      select: {
        category: true,
        evaluation: {
          select: {
            score: true,
          },
        },
      },
      orderBy: { orderIndex: 'asc' },
    }) as Array<{ category: string; evaluation: { score: number } | null }>;

    if (evaluatedQuestions.length >= 2) {
      const evaluations = evaluatedQuestions
        .filter((q): q is typeof q & { evaluation: { score: number } } => q.evaluation !== null)
        .map(q => ({ score: q.evaluation.score, category: q.category }));

      if (evaluations.length >= 2) {
        adaptiveHint = buildAdaptiveDifficultyHint(evaluations, session.difficulty);
      }
    }
  } catch (err) {
    console.warn('[Stream] Failed to load evaluation data for adaptive difficulty:', err);
  }

  // Build system prompt with question progress and follow-up context
  const sessionInterviewType = (session as any).interviewType as string | undefined;
  const systemPrompt = buildInterviewSystemPrompt(
    profileContext,
    session.topics,
    session.difficulty,
    session.evaluationMode as 'immediate' | 'after_complete',
    questionLimit !== null ? { current: mainQuestionCount, total: questionLimit } : undefined,
    followUpContext,
    techKnowledge,
    companyStyleData,
    adaptiveHint,
    sessionInterviewType as 'technical' | 'behavioral' | 'mixed' | undefined
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
  // 실제 사용자 답변인지 판별: 시작 트리거도 아니고, 스킵도 아닌 경우
  const isRealAnswer = lastUserMessage !== null && !isStartTrigger && !isSkip;

  // --- 사용자 답변 저장 (AI 스트리밍 시작 전에 await로 저장) ---
  let answeredQuestionId: string | null = null;
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
        answeredQuestionId = pendingQuestion.id;
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

  let detectedFollowUp = false; // Will be set after marker detection

  const stream = new ReadableStream({
    async start(controller) {
      // Emit answeredQuestionId metadata if a user answer was saved
      if (answeredQuestionId) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ answeredQuestionId })}\n\n`));
      }

      // Marker detection state
      let markerBuffer = '';
      let markerDetected = false;
      const MARKER_MAIN = '[MAIN_Q]';
      const MARKER_FOLLOWUP = '[FOLLOW_UP]';
      const MARKER_BUFFER_SIZE = 15; // Enough to capture longest marker + whitespace

      function flushMarkerBuffer() {
        if (markerBuffer && !markerDetected) {
          // No marker found in buffer — treat as main question, send buffer as content
          markerDetected = true;
          detectedFollowUp = false;
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ isFollowUp: false })}\n\n`
          ));
          // Send progress for main question
          if (questionLimit !== null) {
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ progress: { current: mainQuestionCount + 1, total: questionLimit } })}\n\n`
            ));
          }
          fullResponse += markerBuffer;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: markerBuffer })}\n\n`));
          markerBuffer = '';
        }
      }

      function processChunk(chunk: string) {
        if (markerDetected) {
          // Marker already processed — pass through content directly
          fullResponse += chunk;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
          return;
        }

        // Still buffering to detect marker
        markerBuffer += chunk;

        // Check if we have enough data to detect marker
        const trimmedBuffer = markerBuffer.trimStart();
        if (trimmedBuffer.startsWith(MARKER_FOLLOWUP)) {
          markerDetected = true;
          detectedFollowUp = true;
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ isFollowUp: true })}\n\n`
          ));
          // Follow-up doesn't increment main question count — send current progress
          if (questionLimit !== null) {
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ progress: { current: mainQuestionCount, total: questionLimit } })}\n\n`
            ));
          }
          // Strip marker and send remaining content
          const remaining = trimmedBuffer.slice(MARKER_FOLLOWUP.length).replace(/^\n/, '');
          if (remaining) {
            fullResponse += remaining;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: remaining })}\n\n`));
          }
          markerBuffer = '';
        } else if (trimmedBuffer.startsWith(MARKER_MAIN)) {
          markerDetected = true;
          detectedFollowUp = false;
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ isFollowUp: false })}\n\n`
          ));
          // Main question — send incremented progress
          if (questionLimit !== null) {
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ progress: { current: mainQuestionCount + 1, total: questionLimit } })}\n\n`
            ));
          }
          // Strip marker and send remaining content
          const remaining = trimmedBuffer.slice(MARKER_MAIN.length).replace(/^\n/, '');
          if (remaining) {
            fullResponse += remaining;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: remaining })}\n\n`));
          }
          markerBuffer = '';
        } else if (markerBuffer.length >= MARKER_BUFFER_SIZE) {
          // Buffer full, no marker found — default to main question
          flushMarkerBuffer();
        }
        // Otherwise keep buffering
      }

      try {
        const aiClient = createAIClient({ sessionId, endpoint: 'stream' });
        for await (const chunk of aiClient.streamChat({
          messages: finalMessages,
          model: env.AI_MODEL,
          temperature: 0.7,
        })) {
          processChunk(chunk);
        }
        // Flush any remaining buffer (if stream ended before marker detection)
        flushMarkerBuffer();
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
            errorMessage = `AI 프록시 서버에 연결할 수 없습니다. (${env.AI_PROXY_URL}) - 서버가 실행 중인지 확인하세요.`;
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
                isFollowUp: detectedFollowUp,
                status: 'pending',
              },
              update: {
                content: fullResponse + '\n\n[응답이 중단되었습니다]',
                isFollowUp: detectedFollowUp,
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
                isFollowUp: detectedFollowUp,
                status: 'pending',
              },
              update: {
                // 이미 존재하면 내용만 업데이트 (중복 요청 방지)
                content: fullResponse,
                isFollowUp: detectedFollowUp,
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
