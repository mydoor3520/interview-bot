import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { prisma } from '@/lib/db/prisma';
import { TIER_LIMITS, checkSessionLimit, checkResumeEditLimit, checkPortfolioGuideLimit } from '@/lib/feature-gate';
import type { TierKey } from '@/lib/feature-gate';

export async function GET(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  try {
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

    // Get user's profile to query position count
    const profile = await prisma.userProfile.findFirst({
      where: { userId: auth.user.userId },
      select: { id: true },
    });

    const positionCount = profile
      ? await prisma.targetPosition.count({
          where: { profileId: profile.id, isActive: true },
        })
      : 0;

    const resumeEditQuota = await checkResumeEditLimit(auth.user.userId, tier);
    const portfolioGuideQuota = await checkPortfolioGuideLimit(auth.user.userId, tier);

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
        targetPositionInterview: limits.targetPositionInterview,
        maxTargetPositions: limits.maxTargetPositions,
        aiJobParsing: limits.aiJobParsing,
        monthlyJobParses: limits.monthlyJobParses,
        generateQuestions: limits.generateQuestions,
        techKnowledge: limits.techKnowledge,
        companyStyles: limits.companyStyles,
        adaptiveDifficulty: limits.adaptiveDifficulty,
        crossTechQuestions: limits.crossTechQuestions,
        monthlyResumeEdits: limits.monthlyResumeEdits,
        monthlyPortfolioGuides: limits.monthlyPortfolioGuides,
        maxPortfolioProjects: limits.maxPortfolioProjects,
      },
      usage: {
        sessionsThisMonth,
        remainingSessions: quota.remaining,
        monthlyQuestions: monthlyCost._count,
        monthlyCostUsd: monthlyCost._sum.cost ?? 0,
        currentPositionCount: positionCount,
        remainingResumeEdits: resumeEditQuota.remaining,
        remainingPortfolioGuides: portfolioGuideQuota.remaining,
      },
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
