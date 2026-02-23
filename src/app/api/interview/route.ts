import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { TIER_LIMITS } from '@/lib/feature-gate';
import type { TierKey } from '@/lib/feature-gate';
import { checkUserRateLimit } from '@/lib/auth/user-rate-limit';

const createSessionSchema = z.object({
  targetPositionId: z.string().nullish().transform(v => v ?? undefined),
  topics: z.array(z.string().max(100)).min(1, '최소 1개 이상의 주제를 선택해주세요.').max(50),
  difficulty: z.enum(['junior', 'mid', 'senior']),
  evaluationMode: z.string().optional().transform(() => 'immediate'), // Always force immediate mode
  interviewType: z.enum(['technical', 'behavioral', 'mixed']).optional().default('technical'),
  companyStyle: z.string().max(50).nullish().transform(v => v ?? undefined),
  jobFunction: z.string().max(50).optional().default('developer'),
  resumeEditId: z.string().nullish().transform(v => v ?? undefined),
  abandonExisting: z.boolean().optional(),
});

const updateSessionSchema = z.object({
  id: z.string(),
  status: z.enum(['completed', 'abandoned']).optional(),
  endReason: z.string().optional(),
  totalScore: z.number().min(0).max(10).optional(),
  summary: z.string().optional(),
  userRating: z.number().int().min(1).max(5).optional(),
  mostHelpfulQuestionId: z.string().optional(),
  sessionDurationSec: z.number().int().min(0).optional(),
});

// POST - Create new session
export async function POST(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  // Rate limit check: 10 requests per minute for session creation
  const rateLimit = checkUserRateLimit(auth.user.userId, 'interview-create', 10);
  if (rateLimit) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
    );
  }

  try {
    // Email verification check (allow first session without verification)
    const user = await prisma.user.findUnique({
      where: { id: auth.user.userId },
      select: { emailVerified: true },
    });

    if (!user?.emailVerified) {
      // Count existing sessions to determine if this is the first session
      const existingSessionCount = await prisma.interviewSession.count({
        where: { userId: auth.user.userId, deletedAt: null }
      });

      // Block if trying to create second or later session without email verification
      if (existingSessionCount >= 1) {
        return NextResponse.json(
          { error: '이메일 인증 후 추가 면접을 진행할 수 있습니다. 가입 시 입력한 이메일을 확인해주세요.', requireVerification: true },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const result = createSessionSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: '입력 데이터가 올바르지 않습니다.', details: result.error.issues },
        { status: 400 }
      );
    }

    const { targetPositionId, topics, difficulty, evaluationMode, interviewType, companyStyle, jobFunction, resumeEditId, abandonExisting } = result.data;

    // Handle abandonExisting: mark existing in_progress session as abandoned
    if (abandonExisting) {
      const existingSession = await prisma.interviewSession.findFirst({
        where: {
          userId: auth.user.userId,
          status: 'in_progress',
          deletedAt: null,
        },
      });

      if (existingSession) {
        await prisma.interviewSession.update({
          where: { id: existingSession.id },
          data: {
            status: 'abandoned',
            endReason: 'new_session',
            completedAt: new Date(),
          },
        });
      }
    }


    // Validate target position if provided (read operation, can stay outside transaction)
    if (targetPositionId) {
      const position = await prisma.targetPosition.findUnique({
        where: { id: targetPositionId },
      });
      if (!position) {
        return NextResponse.json({ error: '존재하지 않는 포지션입니다.' }, { status: 404 });
      }
    }

    // Validate resumeEditId ownership + position matching
    if (resumeEditId) {
      const edit = await prisma.resumeEdit.findFirst({
        where: {
          id: resumeEditId,
          profile: { userId: auth.user.userId },
          targetPositionId: targetPositionId ?? null,
        },
      });
      if (!edit) {
        return NextResponse.json({ error: '이력서 코칭 결과를 찾을 수 없습니다.' }, { status: 404 });
      }
    }

    // Session quota check + creation in transaction to prevent race condition
    const tier = auth.user.tier as TierKey;

    // Check companyStyle tier gating
    if (companyStyle) {
      const allowedStyles = TIER_LIMITS[tier].companyStyles;
      if (allowedStyles !== 'all' && !((allowedStyles as readonly string[]).includes(companyStyle))) {
        return NextResponse.json(
          {
            error: `${companyStyle} 스타일은 현재 지원되지 않습니다.`,
            upgradeUrl: '/pricing',
          },
          { status: 403 }
        );
      }
    }

    const transactionResult = await prisma.$transaction(async (tx) => {
      // Check quota inside transaction
      const limit = TIER_LIMITS[tier].monthlySessions;

      if (limit !== null) {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const count = await tx.interviewSession.count({
          where: {
            userId: auth.user.userId,
            createdAt: { gte: monthStart },
            deletedAt: null,
          },
        });

        if (count >= limit) {
          return {
            error: `이번 달 무료 면접 횟수(${limit}회)를 모두 사용했습니다. 무료 베타 기간 중이며, 다음 달에 초기화됩니다.`
          };
        }
      }

      // Create session inside same transaction
      const session = await tx.interviewSession.create({
        data: {
          userId: auth.user.userId,
          targetPositionId,
          topics,
          difficulty,
          evaluationMode: 'immediate', // Always use immediate mode
          interviewType: interviewType || 'technical',
          companyStyle: companyStyle || null,
          jobFunction: jobFunction || 'developer',
          techKnowledgeEnabled: true,
          status: 'in_progress',
          resumeEditId: resumeEditId || null,
        } as any, // Cast needed for Prisma $extends() compatibility
        include: {
          targetPosition: true,
          _count: { select: { questions: true } },
        },
      });

      return { session };
    });

    if ('error' in transactionResult) {
      return NextResponse.json(
        { error: transactionResult.error, upgradeUrl: '/pricing' },
        { status: 403 }
      );
    }

    return NextResponse.json({ session: transactionResult.session }, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// GET - List sessions
export async function GET(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Single session lookup
    if (id) {
      const session = await prisma.interviewSession.findFirst({
        where: { id, userId: auth.user.userId },
        include: {
          targetPosition: {
            select: {
              id: true,
              company: true,
              position: true,
            },
          },
          questions: {
            orderBy: { orderIndex: 'asc' },
            include: {
              evaluation: true,
              followUps: {
                orderBy: { orderIndex: 'asc' },
              },
            },
          },
          _count: { select: { questions: true } },
        },
      });

      if (!session || session.deletedAt) {
        return NextResponse.json({ error: '세션을 찾을 수 없습니다.' }, { status: 404 });
      }

      // Reconstruct conversation messages from questions
      const messages: Array<{ role: 'user' | 'assistant'; content: string; questionId?: string; isFollowUp?: boolean }> = [];
      for (const q of session.questions) {
        // Main AI question
        messages.push({ role: 'assistant', content: q.content, questionId: q.id, isFollowUp: q.isFollowUp });
        // User answer to main question
        if (q.userAnswer) {
          messages.push({ role: 'user', content: q.userAnswer });
        }
        // Follow-up questions
        if (q.followUps && q.followUps.length > 0) {
          for (const fu of q.followUps) {
            messages.push({ role: 'assistant', content: fu.content, isFollowUp: true });
            if (fu.userAnswer) {
              messages.push({ role: 'user', content: fu.userAnswer });
            }
          }
        }
      }

      const { questions: _questions, ...sessionData } = session;
      return NextResponse.json({ ...sessionData, messages });
    }

    // List sessions with pagination
    const statusFilter = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50));

    const where: Prisma.InterviewSessionWhereInput = {
      userId: auth.user.userId,
      deletedAt: null,
    };

    if (statusFilter) {
      where.status = statusFilter;
    }

    const sessions = await prisma.interviewSession.findMany({
      where,
      include: {
        targetPosition: {
          select: {
            id: true,
            company: true,
            position: true,
          },
        },
        _count: { select: { questions: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return NextResponse.json({ sessions, page, limit });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// PUT - Update session (for ending)
export async function PUT(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  // Rate limit check: 30 requests per minute for session updates
  const rateLimit = checkUserRateLimit(auth.user.userId, 'interview-update', 30);
  if (rateLimit) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
    );
  }

  try {
    const body = await request.json();
    const result = updateSessionSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: '입력 데이터가 올바르지 않습니다.', details: result.error.issues },
        { status: 400 }
      );
    }

    const { id, status, endReason, totalScore, summary, userRating, mostHelpfulQuestionId, sessionDurationSec } = result.data;

    const existing = await prisma.interviewSession.findFirst({
      where: { id, userId: auth.user.userId },
    });

    if (!existing) {
      return NextResponse.json({ error: '세션을 찾을 수 없습니다.' }, { status: 404 });
    }

    // Wrap session-end operations in a transaction for consistency
    const session = await prisma.$transaction(async (tx) => {
      // Only run end-session logic when status is provided
      if (status) {
        // 종료 시 미답변 질문 정리: pending 상태의 질문을 unanswered로 변경
        await tx.question.updateMany({
          where: { sessionId: id, status: 'pending' },
          data: { status: 'unanswered' },
        });
      }

      // 종료 시 데이터 정리: questionCount를 실제 Question 수로 동기화
      const actualQuestionCount = status ? await tx.question.count({
        where: { sessionId: id, isFollowUp: false },
      }) : undefined;

      return tx.interviewSession.update({
        where: { id },
        data: {
          ...(status && { status }),
          ...(endReason && { endReason }),
          ...(totalScore !== undefined && { totalScore }),
          ...(summary && { summary }),
          ...(userRating !== undefined && { userRating }),
          ...(mostHelpfulQuestionId && { mostHelpfulQuestionId }),
          ...(sessionDurationSec !== undefined && { sessionDurationSec }),
          ...(actualQuestionCount !== undefined && { questionCount: actualQuestionCount }),
          ...(status && { completedAt: new Date() }),
        },
        include: {
          targetPosition: true,
          _count: { select: { questions: true } },
        },
      });
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
