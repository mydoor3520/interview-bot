import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { prisma } from '@/lib/db/prisma';
import { TIER_LIMITS, checkSessionLimit } from '@/lib/feature-gate';
import type { TierKey } from '@/lib/feature-gate';

export async function GET(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  const tier = auth.user.tier as TierKey;
  const quota = await checkSessionLimit(auth.user.userId, tier);
  const limits = TIER_LIMITS[tier];

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthlyCost = await prisma.aIUsageLog.aggregate({
    where: {
      userId: auth.user.userId,
      createdAt: { gte: monthStart },
    },
    _sum: { cost: true },
    _count: true,
  });

  const sessionsThisMonth = limits.monthlySessions !== null && quota.remaining !== null
    ? limits.monthlySessions - quota.remaining
    : null;

  return NextResponse.json({
    tier,
    limits: {
      monthlySessions: limits.monthlySessions,
      questionsPerSession: limits.questionsPerSession,
      customCourse: limits.customCourse,
      advancedAnalytics: limits.advancedAnalytics,
    },
    usage: {
      sessionsThisMonth,
      remainingSessions: quota.remaining,
      monthlyQuestions: monthlyCost._count,
      monthlyCostUsd: monthlyCost._sum.cost ?? 0,
    },
  });
}
