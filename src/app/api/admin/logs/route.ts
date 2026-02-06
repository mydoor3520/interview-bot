import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { prismaBase as prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  const { searchParams } = request.nextUrl;
  const cursor = searchParams.get('cursor') || undefined;
  const limit = Math.min(Number(searchParams.get('limit') || '20'), 100);
  const endpoint = searchParams.get('endpoint') || undefined;
  const model = searchParams.get('model') || undefined;
  const success = searchParams.get('success');
  const estimated = searchParams.get('estimated');

  const where: Record<string, unknown> = {};
  if (endpoint) where.endpoint = endpoint;
  if (model) where.model = model;
  if (success !== null && success !== undefined) where.success = success === 'true';
  if (estimated !== null && estimated !== undefined) where.estimated = estimated === 'true';

  try {
    const logs = await prisma.aIUsageLog.findMany({
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      where,
    });

    const hasMore = logs.length > limit;
    const items = hasMore ? logs.slice(0, limit) : logs;
    const nextCursor = hasMore ? items[items.length - 1].id : undefined;

    return NextResponse.json({
      items,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error('[Admin] Logs query error:', error);
    return NextResponse.json(
      { error: '로그 데이터 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
