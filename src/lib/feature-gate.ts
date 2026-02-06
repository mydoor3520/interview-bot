import { prisma } from '@/lib/db/prisma';

export const TIER_LIMITS = {
  FREE: {
    monthlySessions: 3,
    questionsPerSession: 10,
    evaluationMode: 'after_complete' as const,
    followUpDepth: 1,
    historyRetentionDays: 30,
    customCourse: false,
    advancedAnalytics: false,
    prioritySupport: false,
  },
  PRO: {
    monthlySessions: null,
    questionsPerSession: 30,
    evaluationMode: 'both' as const,
    followUpDepth: 3,
    historyRetentionDays: null,
    customCourse: true,
    advancedAnalytics: true,
    prioritySupport: true,
  },
} as const;

export type TierKey = 'FREE' | 'PRO';
export type TierLimits = (typeof TIER_LIMITS)[TierKey];

export function checkBooleanFeature(tier: TierKey, feature: keyof TierLimits): boolean {
  const value = TIER_LIMITS[tier][feature];
  return typeof value === 'boolean' ? value : true;
}

export function getNumericLimit(tier: TierKey, feature: keyof TierLimits): number | null {
  const value = TIER_LIMITS[tier][feature];
  return typeof value === 'number' ? value : null;
}

export async function checkSessionLimit(
  userId: string,
  tier: TierKey
): Promise<{ allowed: boolean; remaining: number | null; message?: string }> {
  const limit = TIER_LIMITS[tier].monthlySessions;

  if (limit === null) {
    return { allowed: true, remaining: null };
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const count = await prisma.interviewSession.count({
    where: {
      userId,
      createdAt: { gte: monthStart },
      deletedAt: null,
    },
  });

  const remaining = limit - count;

  if (remaining <= 0) {
    return {
      allowed: false,
      remaining: 0,
      message: `이번 달 무료 면접 횟수(${limit}회)를 모두 사용했습니다. PRO로 업그레이드하면 무제한으로 이용할 수 있습니다.`,
    };
  }

  return { allowed: true, remaining };
}
