import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

const ANOMALY_THRESHOLDS: Record<string, number> = {
  FREE: 1.0,
  PRO: 20.0,
};

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}` && request.headers.get('x-cron-secret') !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const dailyCosts = await prisma.aIUsageLog.groupBy({
    by: ['userId'],
    where: {
      createdAt: { gte: oneDayAgo },
      userId: { not: null },
    },
    _sum: { cost: true },
    _count: true,
  });

  // Batch-fetch all user tiers in one query to avoid N+1
  const userIds = dailyCosts.map(r => r.userId).filter((id): id is string => id !== null);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, subscriptionTier: true },
  });
  const userTierMap = new Map(users.map(u => [u.id, u.subscriptionTier]));

  const anomalies: { userId: string; cost: number; tier: string; requests: number }[] = [];

  for (const record of dailyCosts) {
    if (!record.userId) continue;
    const cost = record._sum.cost || 0;

    const tier = userTierMap.get(record.userId) || 'FREE';
    const threshold = ANOMALY_THRESHOLDS[tier] || 1.0;

    if (cost > threshold) {
      anomalies.push({
        userId: record.userId,
        cost,
        tier,
        requests: record._count,
      });

      console.warn(`[ANOMALY] User ${record.userId} (${tier}): $${cost.toFixed(2)} in 24h (threshold: $${threshold})`);
    }
  }

  return NextResponse.json({
    checked: dailyCosts.length,
    anomalies: anomalies.length,
    details: anomalies,
    timestamp: new Date().toISOString(),
  });
}
