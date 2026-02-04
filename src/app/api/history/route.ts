import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { z } from 'zod';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  topic: z.string().optional(),
  difficulty: z.enum(['junior', 'mid', 'senior']).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  minScore: z.coerce.number().min(0).max(10).optional(),
  maxScore: z.coerce.number().min(0).max(10).optional(),
  sessionId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  const { searchParams } = new URL(request.url);
  const params = Object.fromEntries(searchParams.entries());

  const result = querySchema.safeParse(params);
  if (!result.success) {
    return NextResponse.json({ error: '입력 데이터가 올바르지 않습니다.' }, { status: 400 });
  }

  const { page, limit, topic, difficulty, dateFrom, dateTo, minScore, maxScore, sessionId } = result.data;

  // If sessionId is provided, return full session detail
  if (sessionId) {
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: {
        questions: {
          include: {
            evaluation: true,
            followUps: { orderBy: { orderIndex: 'asc' } },
          },
          orderBy: { orderIndex: 'asc' },
        },
        targetPosition: true,
      },
    });

    if (!session || session.deletedAt) {
      return NextResponse.json({ error: '세션을 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ session });
  }

  // Build filter conditions
  const where: any = {
    deletedAt: null,
  };

  if (topic) {
    where.topics = { has: topic };
  }

  if (difficulty) {
    where.difficulty = difficulty;
  }

  if (dateFrom || dateTo) {
    where.startedAt = {};
    if (dateFrom) where.startedAt.gte = dateFrom;
    if (dateTo) where.startedAt.lte = dateTo;
  }

  if (minScore !== undefined || maxScore !== undefined) {
    where.totalScore = {};
    if (minScore !== undefined) where.totalScore.gte = minScore;
    if (maxScore !== undefined) where.totalScore.lte = maxScore;
  }

  // Get total count
  const total = await prisma.interviewSession.count({ where });

  // Get sessions with pagination
  const sessions = await prisma.interviewSession.findMany({
    where,
    include: {
      _count: { select: { questions: true } },
      targetPosition: { select: { company: true, position: true } },
    },
    orderBy: { startedAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  });

  return NextResponse.json({
    sessions,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });
  }

  const session = await prisma.interviewSession.findUnique({ where: { id } });
  if (!session) {
    return NextResponse.json({ error: '세션을 찾을 수 없습니다.' }, { status: 404 });
  }

  // Soft delete
  await prisma.interviewSession.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
