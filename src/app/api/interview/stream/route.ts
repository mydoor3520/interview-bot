import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { createAIClient } from '@/lib/ai/client';
import { buildInterviewSystemPrompt } from '@/lib/ai/prompts';
import { ProfileContext } from '@/lib/ai/types';
import { z } from 'zod';

const streamRequestSchema = z.object({
  sessionId: z.string(),
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string(),
    })
  ),
  questionIndex: z.number().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  const body = await request.json();
  const result = streamRequestSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: '입력 데이터가 올바르지 않습니다.', details: result.error.issues },
      { status: 400 }
    );
  }

  const { sessionId, messages, questionIndex } = result.data;

  // Load session with profile data
  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
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

  // Build system prompt if it's the first message
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

  // Stream AI response
  const encoder = new TextEncoder();
  let fullResponse = '';

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const aiClient = createAIClient();
        for await (const chunk of aiClient.streamChat({
          messages: finalMessages,
          model: process.env.AI_MODEL || 'claude-sonnet-4',
          temperature: 0.7,
        })) {
          fullResponse += chunk;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (error: any) {
        console.error('AI streaming error:', error);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: 'AI 응답 생성 중 오류가 발생했습니다.' })}\n\n`
          )
        );
      } finally {
        controller.close();

        // Save question/answer to DB if this was a question
        if (fullResponse && questionIndex !== undefined) {
          try {
            // Try to parse the response as JSON to extract question details
            const jsonMatch = fullResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[1]);
              if (parsed.type === 'question') {
                await prisma.question.create({
                  data: {
                    sessionId,
                    orderIndex: questionIndex,
                    content: parsed.question,
                    category: parsed.category || session.topics[0] || 'General',
                    difficulty: parsed.difficulty || session.difficulty,
                    status: 'pending',
                  },
                });

                // Update session question count
                await prisma.interviewSession.update({
                  where: { id: sessionId },
                  data: { questionCount: { increment: 1 } },
                });
              }
            }
          } catch (error) {
            console.error('Error saving question:', error);
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
