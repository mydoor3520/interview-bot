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
  evaluationMode: z.enum(['immediate', 'after_complete']),
});

const updateSessionSchema = z.object({
  id: z.string(),
  status: z.enum(['completed', 'abandoned']),
  endReason: z.string(),
  totalScore: z.number().min(0).max(10).optional(),
  summary: z.string().optional(),
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
    const body = await request.json();
    const result = createSessionSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: '입력 데이터가 올바르지 않습니다.', details: result.error.issues },
        { status: 400 }
      );
    }

    const { targetPositionId, topics, difficulty, evaluationMode } = result.data;

    // Validate target position if provided (read operation, can stay outside transaction)
    if (targetPositionId) {
      const position = await prisma.targetPosition.findUnique({
        where: { id: targetPositionId },
      });
      if (!position) {
        return NextResponse.json({ error: '존재하지 않는 포지션입니다.' }, { status: 404 });
      }
    }

    // Session quota check + creation in transaction to prevent race condition
    const tier = auth.user.tier as TierKey;

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
            error: `이번 달 무료 면접 횟수(${limit}회)를 모두 사용했습니다. PRO로 업그레이드하면 무제한으로 이용할 수 있습니다.`
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
          evaluationMode,
          status: 'in_progress',
        },
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
          _count: { select: { questions: true } },
        },
      });

      if (!session || session.deletedAt) {
        return NextResponse.json({ error: '세션을 찾을 수 없습니다.' }, { status: 404 });
      }

      return NextResponse.json(session);
    }

    // List sessions
    const statusFilter = searchParams.get('status');

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
    });

    return NextResponse.json({ sessions });
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

    const { id, status, endReason, totalScore, summary } = result.data;

    const existing = await prisma.interviewSession.findFirst({
      where: { id, userId: auth.user.userId },
    });

    if (!existing) {
      return NextResponse.json({ error: '세션을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 종료 시 미답변 질문 정리: pending 상태의 질문을 unanswered로 변경
    await prisma.question.updateMany({
      where: { sessionId: id, status: 'pending' },
      data: { status: 'unanswered' },
    });

    // 종료 시 데이터 정리: questionCount를 실제 Question 수로 동기화
    const actualQuestionCount = await prisma.question.count({
      where: { sessionId: id },
    });

    const session = await prisma.interviewSession.update({
      where: { id },
      data: {
        status,
        endReason,
        totalScore,
        summary,
        questionCount: actualQuestionCount,
        completedAt: new Date(),
      },
      include: {
        targetPosition: true,
        _count: { select: { questions: true } },
      },
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
