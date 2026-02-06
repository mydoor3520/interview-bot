import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { prismaBase as prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  const { searchParams } = request.nextUrl;
  const period = searchParams.get('period') || '7d';
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case '1d':
      startDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '7d':
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
  }

  try {
    // Daily usage aggregation
    const dailyUsage = await prisma.$queryRaw<Array<{
      date: string;
      endpoint: string;
      model: string;
      totalPrompt: bigint;
      totalCompletion: bigint;
      count: bigint;
    }>>`
      SELECT DATE("createdAt") as date, endpoint, model,
             SUM("promptTokens") as "totalPrompt",
             SUM("completionTokens") as "totalCompletion",
             COUNT(*) as count
      FROM "AIUsageLog"
      WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${now}
      GROUP BY DATE("createdAt"), endpoint, model
      ORDER BY date DESC
    `;

    // Summary stats
    const summary = await prisma.aIUsageLog.aggregate({
      where: { createdAt: { gte: startDate, lte: now } },
      _sum: { promptTokens: true, completionTokens: true, totalTokens: true },
      _count: true,
    });

    // Endpoint breakdown
    const endpointBreakdown = await prisma.aIUsageLog.groupBy({
      by: ['endpoint'],
      where: { createdAt: { gte: startDate, lte: now } },
      _sum: { totalTokens: true },
      _count: true,
    });

    // Model breakdown
    const modelBreakdown = await prisma.aIUsageLog.groupBy({
      by: ['model'],
      where: { createdAt: { gte: startDate, lte: now } },
      _sum: { totalTokens: true },
      _count: true,
    });

    // Error count
    const errorCount = await prisma.aIUsageLog.count({
      where: { createdAt: { gte: startDate, lte: now }, success: false },
    });

    // Estimated vs actual count
    const estimatedCount = await prisma.aIUsageLog.count({
      where: { createdAt: { gte: startDate, lte: now }, estimated: true },
    });

    // BigInt 안전 직렬화 (Number.MAX_SAFE_INTEGER 초과 시 문자열 사용)
    const safeBigInt = (v: bigint): number | string =>
      v <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(v) : v.toString();

    const serializedDaily = dailyUsage.map(d => ({
      date: d.date,
      endpoint: d.endpoint,
      model: d.model,
      totalPrompt: safeBigInt(d.totalPrompt),
      totalCompletion: safeBigInt(d.totalCompletion),
      count: safeBigInt(d.count),
    }));

    return NextResponse.json({
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      daily: serializedDaily,
      summary: {
        totalPromptTokens: summary._sum.promptTokens || 0,
        totalCompletionTokens: summary._sum.completionTokens || 0,
        totalTokens: summary._sum.totalTokens || 0,
        totalRequests: summary._count,
        errorCount,
        estimatedCount,
        actualCount: summary._count - estimatedCount,
      },
      endpointBreakdown: endpointBreakdown.map(e => ({
        endpoint: e.endpoint,
        totalTokens: e._sum.totalTokens || 0,
        count: e._count,
      })),
      modelBreakdown: modelBreakdown.map(m => ({
        model: m.model,
        totalTokens: m._sum.totalTokens || 0,
        count: m._count,
      })),
    });
  } catch (error) {
    console.error('[Admin] Usage query error:', error);
    return NextResponse.json(
      { error: '사용량 데이터 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
