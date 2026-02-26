import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { prisma, prismaBase } from '@/lib/db/prisma';
import { PRICE_CONFIG } from '@/lib/payment/types';

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.authenticated) return auth.response;

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Run all queries in parallel for performance
    const [
      // Operations KPIs
      activeUsersToday,
      activeUsersYesterday,
      interviewsToday,
      interviewsYesterday,
      aiCostToday,
      aiCostYesterday,
      aiTotalToday,
      aiFailedToday,
      aiTotalYesterday,
      aiFailedYesterday,
      // Business KPIs
      totalUsers,
      proUsers,
      newSignupsThisWeek,
      newSignupsLastWeek,
      dauCount,
      mauCount,
      // Revenue
      mrrCurrent,
    ] = await Promise.all([
      // Active users today (users with lastLoginAt today)
      prisma.user.count({ where: { lastLoginAt: { gte: todayStart } } }),
      // Active users yesterday
      prisma.user.count({ where: { lastLoginAt: { gte: yesterdayStart, lt: todayStart } } }),
      // Interviews today
      prisma.interviewSession.count({ where: { createdAt: { gte: todayStart } } }),
      // Interviews yesterday
      prisma.interviewSession.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }),
      // AI cost today
      prismaBase.aIUsageLog.aggregate({ where: { createdAt: { gte: todayStart } }, _sum: { cost: true } }),
      // AI cost yesterday
      prismaBase.aIUsageLog.aggregate({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } }, _sum: { cost: true } }),
      // AI total requests today
      prismaBase.aIUsageLog.count({ where: { createdAt: { gte: todayStart } } }),
      // AI failed today
      prismaBase.aIUsageLog.count({ where: { createdAt: { gte: todayStart }, success: false } }),
      // AI total yesterday
      prismaBase.aIUsageLog.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }),
      // AI failed yesterday
      prismaBase.aIUsageLog.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart }, success: false } }),
      // Total users
      prisma.user.count(),
      // PRO users
      prisma.user.count({ where: { subscriptionTier: 'PRO' } }),
      // New signups this week
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      // New signups last week
      prisma.user.count({ where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
      // DAU (today)
      prisma.user.count({ where: { lastLoginAt: { gte: todayStart } } }),
      // MAU (30 days)
      prisma.user.count({ where: { lastLoginAt: { gte: monthAgo } } }),
      // MRR - count of active PRO subscriptions * price
      prisma.user.count({ where: { subscriptionTier: 'PRO' } }),
    ]);

    const errorRateToday = aiTotalToday > 0 ? (aiFailedToday / aiTotalToday) * 100 : 0;
    const errorRateYesterday = aiTotalYesterday > 0 ? (aiFailedYesterday / aiTotalYesterday) * 100 : 0;
    const conversionRate = totalUsers > 0 ? (proUsers / totalUsers) * 100 : 0;
    const dauMauRatio = mauCount > 0 ? (dauCount / mauCount) * 100 : 0;

    // Helper to determine trend
    function getTrend(current: number, previous: number): 'up' | 'down' | 'neutral' {
      if (current > previous) return 'up';
      if (current < previous) return 'down';
      return 'neutral';
    }

    const dashboard = {
      operations: {
        activeUsersToday: {
          value: activeUsersToday,
          trend: getTrend(activeUsersToday, activeUsersYesterday),
          previousValue: activeUsersYesterday,
        },
        interviewsToday: {
          value: interviewsToday,
          trend: getTrend(interviewsToday, interviewsYesterday),
          previousValue: interviewsYesterday,
        },
        aiCostToday: {
          value: Number(aiCostToday._sum.cost ?? 0),
          trend: getTrend(Number(aiCostToday._sum.cost ?? 0), Number(aiCostYesterday._sum.cost ?? 0)),
          previousValue: Number(aiCostYesterday._sum.cost ?? 0),
        },
        errorRateToday: {
          value: Math.round(errorRateToday * 10) / 10,
          trend: getTrend(errorRateYesterday, errorRateToday), // lower error rate is better, so reversed
          previousValue: Math.round(errorRateYesterday * 10) / 10,
        },
      },
      business: {
        mrr: {
          value: mrrCurrent * PRICE_CONFIG.PRO.monthly,
          trend: 'neutral' as const,
          previousValue: 0,
        },
        newSignupsThisWeek: {
          value: newSignupsThisWeek,
          trend: getTrend(newSignupsThisWeek, newSignupsLastWeek),
          previousValue: newSignupsLastWeek,
        },
        conversionRate: {
          value: Math.round(conversionRate * 10) / 10,
          trend: 'neutral' as const,
          previousValue: 0,
        },
        churnRate: {
          value: 0, // Placeholder - needs subscription cancellation tracking
          trend: 'neutral' as const,
          previousValue: 0,
        },
        dauMauRatio: {
          value: Math.round(dauMauRatio * 10) / 10,
          trend: 'neutral' as const,
          previousValue: 0,
        },
      },
    };

    return NextResponse.json(dashboard);
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: '대시보드 데이터를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
