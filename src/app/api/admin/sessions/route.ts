import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.authenticated) return auth.response;

  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const difficulty = searchParams.get('difficulty');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (difficulty) where.difficulty = difficulty;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
      if (endDate) (where.createdAt as Record<string, unknown>).lte = new Date(endDate);
    }

    const [sessions, total, stats] = await Promise.all([
      prisma.interviewSession.findMany({
        where,
        include: {
          user: { select: { email: true, name: true } },
          _count: { select: { questions: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.interviewSession.count({ where }),
      // Aggregate stats
      prisma.interviewSession.aggregate({
        where,
        _avg: { totalScore: true },
        _count: true,
      }),
    ]);

    return NextResponse.json({
      sessions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      stats: {
        total: stats._count,
        avgScore: stats._avg.totalScore ? Math.round(stats._avg.totalScore * 10) / 10 : null,
      },
    });
  } catch (error) {
    console.error('Sessions API error:', error);
    return NextResponse.json({ error: '세션 데이터를 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
