import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { prismaBase } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.authenticated) return auth.response;

  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const rating = searchParams.get('rating');

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (status) where.status = status;
    if (rating) where.rating = parseInt(rating);

    const [feedbacks, total, stats] = await Promise.all([
      prismaBase.betaFeedback.findMany({
        where,
        include: { user: { select: { email: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prismaBase.betaFeedback.count({ where }),
      prismaBase.betaFeedback.aggregate({
        _avg: { rating: true },
        _count: true,
      }),
    ]);

    const unresolvedCount = await prismaBase.betaFeedback.count({
      where: { OR: [{ status: null }, { status: 'open' }, { status: 'in_progress' }] },
    });

    return NextResponse.json({
      feedbacks,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      stats: {
        total: stats._count,
        avgRating: stats._avg.rating ? Math.round(stats._avg.rating * 10) / 10 : null,
        unresolvedCount,
      },
    });
  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json({ error: '피드백 데이터를 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
