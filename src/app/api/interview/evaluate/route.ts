import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { createAIClient } from '@/lib/ai/client';
import { buildEvaluationPrompt } from '@/lib/ai/prompts';
import { checkAIRateLimit } from '@/lib/ai/rate-limit';
import { z } from 'zod';

const evaluateRequestSchema = z.object({
  questionId: z.string().optional(),
  sessionId: z.string().optional(),
}).refine((data) => data.questionId || data.sessionId, {
  message: 'questionId 또는 sessionId 중 하나는 필수입니다.',
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
  const result = evaluateRequestSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: '입력 데이터가 올바르지 않습니다.', details: result.error.issues },
      { status: 400 }
    );
  }

  const { questionId, sessionId } = result.data;

  // Single question evaluation
  if (questionId) {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { evaluation: true, session: { select: { userId: true } } },
    });

    if (!question || question.session.userId !== auth.user.userId) {
      return NextResponse.json({ error: '질문을 찾을 수 없습니다.' }, { status: 404 });
    }

    if (!question.userAnswer) {
      return NextResponse.json({ error: '답변이 없습니다.' }, { status: 400 });
    }

    if (question.evaluation) {
      return NextResponse.json({ evaluation: question.evaluation });
    }

    // Call AI for evaluation
    const aiClient = createAIClient({ sessionId: question.sessionId, endpoint: 'evaluate' });
    const evaluationMessages = buildEvaluationPrompt(
      question.content,
      question.userAnswer,
      question.category,
      question.difficulty
    );

    try {
      const { content } = await aiClient.chat({
        messages: evaluationMessages,
        model: process.env.AI_MODEL || 'claude-sonnet-4',
        temperature: 0.3,
      });

      // Parse JSON response
      const jsonMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (!jsonMatch) {
        throw new Error('AI 응답에서 JSON을 찾을 수 없습니다.');
      }

      const parsed = JSON.parse(jsonMatch[1]);

      // Create evaluation record
      const evaluation = await prisma.evaluation.create({
        data: {
          questionId: question.id,
          score: parsed.score,
          feedback: parsed.feedback,
          modelAnswer: parsed.modelAnswer,
          strengths: parsed.strengths || [],
          weaknesses: parsed.weaknesses || [],
        },
      });

      return NextResponse.json({ evaluation });
    } catch (error: unknown) {
      console.error('Evaluation error:', error);
      return NextResponse.json(
        { error: '평가 생성 중 오류가 발생했습니다.', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  }

  // Batch evaluation for entire session
  if (sessionId) {
    const session = await prisma.interviewSession.findFirst({
      where: { id: sessionId, userId: auth.user.userId },
      include: {
        questions: {
          where: {
            status: 'answered',
            userAnswer: { not: null },
            evaluation: null,
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: '세션을 찾을 수 없습니다.' }, { status: 404 });
    }

    const aiClient = createAIClient({ sessionId: sessionId!, endpoint: 'evaluate_batch' });
    const evaluations = [];
    const errors = [];

    for (const question of session.questions) {
      try {
        const evaluationMessages = buildEvaluationPrompt(
          question.content,
          question.userAnswer!,
          question.category,
          question.difficulty
        );

        const { content } = await aiClient.chat({
          messages: evaluationMessages,
          model: process.env.AI_MODEL || 'claude-sonnet-4',
          temperature: 0.3,
        });

        const jsonMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        if (!jsonMatch) {
          throw new Error('AI 응답에서 JSON을 찾을 수 없습니다.');
        }

        const parsed = JSON.parse(jsonMatch[1]);

        const evaluation = await prisma.evaluation.create({
          data: {
            questionId: question.id,
            score: parsed.score,
            feedback: parsed.feedback,
            modelAnswer: parsed.modelAnswer,
            strengths: parsed.strengths || [],
            weaknesses: parsed.weaknesses || [],
          },
        });

        evaluations.push(evaluation);
      } catch (error: unknown) {
        console.error(`Evaluation error for question ${question.id}:`, error);
        errors.push({ questionId: question.id, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    // Calculate average score and update session
    if (evaluations.length > 0) {
      const totalScore =
        evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length;

      await prisma.interviewSession.update({
        where: { id: sessionId },
        data: { totalScore },
      });
    }

    return NextResponse.json({
      evaluations,
      errors: errors.length > 0 ? errors : undefined,
      totalEvaluated: evaluations.length,
      totalErrors: errors.length,
    });
  }

  return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
}
