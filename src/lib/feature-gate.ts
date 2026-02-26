import { prisma } from '@/lib/db/prisma';

export const TIER_LIMITS = {
  FREE: {
    monthlySessions: 15,
    questionsPerSession: 7,
    evaluationMode: 'immediate' as const,
    followUpDepth: 2,
    historyRetentionDays: 90,
    customCourse: false,
    advancedAnalytics: true,
    prioritySupport: false,
    /** @deprecated maxTargetPositions로 대체. Phase 8 완료 후 4주 이내 제거 예정. */
    targetPositionInterview: false,
    maxTargetPositions: 5,
    aiJobParsing: true,
    monthlyJobParses: 5 as number | null,
    generateQuestions: true,
    techKnowledge: 'all' as const,
    companyStyles: 'all' as const,
    behavioralKnowledge: ['behavioral-self-intro', 'behavioral-project', 'behavioral-collaboration', 'behavioral-leadership', 'behavioral-career'] as const,
    behavioralStyles: ['general-behavioral'] as const,
    adaptiveDifficulty: true,
    crossTechQuestions: true,
    monthlyResumeEdits: 3 as number | null,
    monthlyPortfolioGuides: 2 as number | null,
    maxPortfolioProjects: 5 as number | null,
  },
  PRO: {
    monthlySessions: 30,
    questionsPerSession: 15,
    evaluationMode: 'immediate' as const,
    followUpDepth: 2,
    historyRetentionDays: null,
    customCourse: true,
    advancedAnalytics: true,
    prioritySupport: true,
    /** @deprecated maxTargetPositions로 대체. Phase 8 완료 후 4주 이내 제거 예정. */
    targetPositionInterview: true,
    maxTargetPositions: 10,
    aiJobParsing: true,
    monthlyJobParses: null as number | null,
    generateQuestions: true,
    techKnowledge: 'all' as const,
    companyStyles: 'all' as const,
    behavioralKnowledge: 'all' as const,
    behavioralStyles: 'all' as const,
    adaptiveDifficulty: true,
    crossTechQuestions: true,
    monthlyResumeEdits: null as number | null,
    monthlyPortfolioGuides: null as number | null,
    maxPortfolioProjects: 20 as number | null,
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
      message: tier === 'FREE'
        ? `이번 달 무료 면접 횟수(${limit}회)를 모두 사용했습니다. 무료 베타 기간 중이며, 다음 달에 초기화됩니다.`
        : `이번 달 면접 횟수(${limit}회)를 모두 사용했습니다. 다음 달에 초기화됩니다.`,
    };
  }

  return { allowed: true, remaining };
}

export async function checkPositionLimit(
  profileId: string,
  tier: TierKey
): Promise<{ allowed: boolean; current: number; limit: number; message?: string }> {
  const limit = TIER_LIMITS[tier].maxTargetPositions;
  const count = await prisma.targetPosition.count({
    where: { profileId, isActive: true },
  });

  if (count >= limit) {
    return {
      allowed: false,
      current: count,
      limit,
      message: tier === 'FREE'
        ? `무료 베타 기간 중 포지션은 ${limit}개까지 등록할 수 있습니다.`
        : `포지션 등록 한도(${limit}개)에 도달했습니다.`,
    };
  }

  return { allowed: true, current: count, limit };
}

export async function checkJobParseLimit(
  userId: string,
  tier: TierKey
): Promise<{ allowed: boolean; remaining: number | null; message?: string }> {
  const limit = TIER_LIMITS[tier].monthlyJobParses;

  // null = 무제한 (PRO)
  if (limit === null) {
    return { allowed: true, remaining: null };
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const count = await prisma.aIUsageLog.count({
    where: {
      userId,
      endpoint: 'job_parse',
      success: true,
      createdAt: { gte: monthStart },
    },
  });

  const remaining = limit - count;

  if (remaining <= 0) {
    return {
      allowed: false,
      remaining: 0,
      message: `이번 달 AI 파싱 횟수(${limit}회)를 모두 사용했습니다. 무료 베타 기간 중이며, 다음 달에 초기화됩니다.`,
    };
  }

  return { allowed: true, remaining };
}

export async function checkResumeEditLimit(
  userId: string,
  tier: TierKey
): Promise<{ allowed: boolean; remaining: number | null; message?: string }> {
  const limit = TIER_LIMITS[tier].monthlyResumeEdits;

  // null = 무제한 (PRO)
  if (limit === null) {
    return { allowed: true, remaining: null };
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const count = await prisma.aIUsageLog.count({
    where: {
      userId,
      endpoint: 'resume_edit',
      success: true,
      createdAt: { gte: monthStart },
    },
  });

  const remaining = limit - count;

  if (remaining <= 0) {
    return {
      allowed: false,
      remaining: 0,
      message: `이번 달 이력서 첨삭 횟수(${limit}회)를 모두 사용했습니다. 무료 베타 기간 중이며, 다음 달에 초기화됩니다.`,
    };
  }

  return { allowed: true, remaining };
}

export async function checkPortfolioGuideLimit(
  userId: string,
  tier: TierKey
): Promise<{ allowed: boolean; remaining: number | null; message?: string }> {
  const limit = TIER_LIMITS[tier].monthlyPortfolioGuides;

  // null = 무제한 (PRO)
  if (limit === null) {
    return { allowed: true, remaining: null };
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const count = await prisma.aIUsageLog.count({
    where: {
      userId,
      endpoint: 'portfolio_guide',
      success: true,
      createdAt: { gte: monthStart },
    },
  });

  if (count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      message: `이번 달 포트폴리오 가이드 횟수(${limit}회)를 모두 사용했습니다.`,
    };
  }

  return { allowed: true, remaining: limit - count };
}

export async function checkPortfolioProjectLimit(
  profileId: string,
  tier: TierKey
): Promise<{ allowed: boolean; current: number; limit: number | null; message?: string }> {
  const limit = TIER_LIMITS[tier].maxPortfolioProjects;

  if (limit === null) {
    return { allowed: true, current: 0, limit: null };
  }

  const count = await prisma.portfolioProject.count({
    where: { profileId },
  });

  if (count >= limit) {
    return {
      allowed: false,
      current: count,
      limit,
      message: `포트폴리오 프로젝트는 최대 ${limit}개까지 등록할 수 있습니다.`,
    };
  }

  return { allowed: true, current: count, limit };
}

export async function checkDailySessionLimit(
  userId: string,
  tier: TierKey
): Promise<{ allowed: boolean; remaining: number | null; message?: string }> {
  // Only FREE tier has daily limit
  if (tier !== 'FREE') {
    return { allowed: true, remaining: null };
  }

  const dailyLimit = 3;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const count = await prisma.interviewSession.count({
    where: {
      userId,
      createdAt: {
        gte: today,
        lt: tomorrow,
      },
      deletedAt: null,
    },
  });

  const remaining = dailyLimit - count;

  if (remaining <= 0) {
    return {
      allowed: false,
      remaining: 0,
      message: `오늘 무료 면접 횟수(${dailyLimit}회)를 모두 사용했습니다. 무료 베타 기간 중이며, 내일 초기화됩니다.`,
    };
  }

  return { allowed: true, remaining };
}
