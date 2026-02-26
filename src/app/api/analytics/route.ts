import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { prisma } from '@/lib/db/prisma';
import { checkBooleanFeature } from '@/lib/feature-gate';
import type { TierKey } from '@/lib/feature-gate';
import {
  calculateAverage,
  analyzeByTopic,
  analyzeProgress,
  identifyWeakAreas,
  identifyStrengths,
  generateRadarData,
  generateRecommendations,
} from '@/lib/analytics';

export async function GET(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  try {
    const { userId, tier } = auth.user;
    const tierKey = tier as TierKey;
    const hasAdvanced = checkBooleanFeature(tierKey, 'advancedAnalytics');

    if (!hasAdvanced) {
      // Free tier: basic stats only (select only score from evaluation)
      const sessions = await prisma.interviewSession.findMany({
        where: { userId, status: 'completed', deletedAt: null },
        include: { questions: { select: { category: true, evaluation: { select: { score: true } } } } },
        orderBy: { completedAt: 'desc' },
        take: 10,
      }) as unknown as Parameters<typeof calculateAverage>[0];

      return NextResponse.json({
        tier: tierKey,
        totalSessions: sessions.length,
        averageScore: calculateAverage(sessions),
        recentSessions: sessions.slice(0, 5).map(s => ({
          id: s.id,
          topics: s.topics,
          completedAt: s.completedAt,
          questionCount: s.questions.length,
          averageScore: calculateAverage([s]),
        })),
      });
    }

    // Pro: full analytics (select only score from evaluation)
    const sessions = await prisma.interviewSession.findMany({
      where: { userId, status: 'completed', deletedAt: null },
      include: { questions: { select: { category: true, evaluation: { select: { score: true } } } } },
      orderBy: { completedAt: 'desc' },
      take: 100,
    }) as unknown as Parameters<typeof calculateAverage>[0];

    const totalSessions = sessions.length;
    const averageScore = calculateAverage(sessions);

    return NextResponse.json({
      tier: tierKey,
      totalSessions,
      averageScore,
      recentSessions: sessions.slice(0, 5).map(s => ({
        id: s.id,
        topics: s.topics,
        completedAt: s.completedAt,
        questionCount: s.questions.length,
        averageScore: calculateAverage([s]),
      })),
      topicPerformance: analyzeByTopic(sessions),
      progressOverTime: analyzeProgress(sessions),
      weakAreas: identifyWeakAreas(sessions),
      strengths: identifyStrengths(sessions),
      radarChart: generateRadarData(sessions),
      recommendations: generateRecommendations(sessions),
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
