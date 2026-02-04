import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

const createSessionSchema = z.object({
  targetPositionId: z.string().optional(),
  topics: z.array(z.string().max(100)).min(1, '최소 1개 이상의 주제를 선택해주세요.').max(20),
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
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  const body = await request.json();
  const result = createSessionSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: '입력 데이터가 올바르지 않습니다.', details: result.error.issues },
      { status: 400 }
    );
  }

  const { targetPositionId, topics, difficulty, evaluationMode } = result.data;

  // Validate target position if provided
  if (targetPositionId) {
    const position = await prisma.targetPosition.findUnique({
      where: { id: targetPositionId },
    });
    if (!position) {
      return NextResponse.json({ error: '존재하지 않는 포지션입니다.' }, { status: 404 });
    }
  }

  const session = await prisma.interviewSession.create({
    data: {
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

  return NextResponse.json({ session }, { status: 201 });
}

// GET - List sessions
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status');

  const where: Prisma.InterviewSessionWhereInput = {
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
}

// PUT - Update session (for ending)
export async function PUT(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  const body = await request.json();
  const result = updateSessionSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: '입력 데이터가 올바르지 않습니다.', details: result.error.issues },
      { status: 400 }
    );
  }

  const { id, status, endReason, totalScore, summary } = result.data;

  const existing = await prisma.interviewSession.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: '세션을 찾을 수 없습니다.' }, { status: 404 });
  }

  const session = await prisma.interviewSession.update({
    where: { id },
    data: {
      status,
      endReason,
      totalScore,
      summary,
      completedAt: new Date(),
    },
    include: {
      targetPosition: true,
      _count: { select: { questions: true } },
    },
  });

  return NextResponse.json({ session });
}
