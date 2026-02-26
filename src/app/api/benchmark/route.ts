import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { prisma, prismaBase } from '@/lib/db/prisma';

const EXPERIENCE_BRACKETS = [
  { min: 0, max: 2, label: '0-2년차 (주니어)' },
  { min: 3, max: 5, label: '3-5년차 (미드레벨)' },
  { min: 6, max: 10, label: '6-10년차 (시니어)' },
  { min: 11, max: 999, label: '11년차 이상 (리드/아키텍트)' },
];

const MIN_COHORT_SIZE = 5;

function getExperienceBracket(years: number) {
  return EXPERIENCE_BRACKETS.find(b => years >= b.min && years <= b.max) || EXPERIENCE_BRACKETS[0];
}

function calculatePercentile(userScore: number, cohortScores: number[]): number {
  if (cohortScores.length === 0) return 0;
  const lowerCount = cohortScores.filter(s => s < userScore).length;
  return Math.round((lowerCount / cohortScores.length) * 100);
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuthV2(request);
    if (!auth.authenticated) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const topic = searchParams.get('topic');

    // 1. Get user's profile to find experience level
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: auth.user.userId },
      select: { totalYearsExp: true },
    });

    if (!userProfile) {
      return NextResponse.json(
        { error: '프로필 정보를 찾을 수 없습니다. 프로필을 먼저 완성해주세요.' },
        { status: 404 }
      );
    }

    const userBracket = getExperienceBracket(userProfile.totalYearsExp);

    // 2. Find all users in the same experience bracket
    const cohortUserIds = await prismaBase.userProfile.findMany({
      where: {
        totalYearsExp: {
          gte: userBracket.min,
          lte: userBracket.max,
        },
        userId: { not: null },
      },
      select: { userId: true },
    });

    const cohortIds = cohortUserIds
      .map(p => p.userId)
      .filter((id): id is string => id !== null);

    if (cohortIds.length < MIN_COHORT_SIZE) {
      return NextResponse.json({
        insufficient_data: true,
        experienceBracket: userBracket.label,
        message: '아직 비교 데이터가 부족합니다. 더 많은 사용자가 참여하면 벤치마크가 활성화됩니다.',
      });
    }

    // 3. Get completed sessions for the cohort
    const sessions = await prisma.interviewSession.findMany({
      where: {
        userId: { in: cohortIds },
        status: 'completed',
        totalScore: { not: null },
      },
      select: {
        id: true,
        userId: true,
        topics: true,
        totalScore: true,
      },
    });

    // 4. Get questions with evaluations for per-topic scoring
    const questionEvals = await prismaBase.question.findMany({
      where: {
        sessionId: { in: sessions.map(s => s.id) },
        status: 'answered',
        isFollowUp: false,
      },
      select: {
        id: true,
        sessionId: true,
        category: true,
        session: {
          select: { userId: true },
        },
        evaluation: {
          select: { score: true },
        },
      },
    });

    // 5. Calculate topic-level statistics
    const topicStats: Record<string, { userScores: number[]; cohortScores: number[] }> = {};

    for (const q of questionEvals) {
      if (!q.evaluation) continue;

      const topicName = q.category;
      if (!topicStats[topicName]) {
        topicStats[topicName] = { userScores: [], cohortScores: [] };
      }

      const score = q.evaluation.score;
      topicStats[topicName].cohortScores.push(score);

      if (q.session.userId === auth.user.userId) {
        topicStats[topicName].userScores.push(score);
      }
    }

    // 6. Filter by topic if specified
    const requestedTopics = topic ? [topic] : Object.keys(topicStats);

    // 7. Build topic breakdown
    const topicBreakdown = requestedTopics
      .filter(t => topicStats[t] && topicStats[t].userScores.length > 0)
      .map(topicName => {
        const { userScores, cohortScores } = topicStats[topicName];
        const userAvg = userScores.reduce((sum, s) => sum + s, 0) / userScores.length;
        const cohortAvg = cohortScores.reduce((sum, s) => sum + s, 0) / cohortScores.length;
        const percentile = calculatePercentile(userAvg, cohortScores);

        return {
          topic: topicName,
          userAvg: parseFloat(userAvg.toFixed(2)),
          cohortAvg: parseFloat(cohortAvg.toFixed(2)),
          percentile,
        };
      });

    if (topicBreakdown.length === 0) {
      return NextResponse.json({
        insufficient_data: true,
        experienceBracket: userBracket.label,
        message: topic
          ? `${topic} 주제에 대한 데이터가 부족합니다.`
          : '아직 면접 기록이 없습니다. 면접을 완료한 후 다시 시도해주세요.',
      });
    }

    // 8. Calculate overall statistics
    const allUserScores = Object.values(topicStats)
      .flatMap(t => t.userScores);
    const allCohortScores = Object.values(topicStats)
      .flatMap(t => t.cohortScores);

    const userScore = allUserScores.length > 0
      ? allUserScores.reduce((sum, s) => sum + s, 0) / allUserScores.length
      : 0;

    const cohortAvg = allCohortScores.length > 0
      ? allCohortScores.reduce((sum, s) => sum + s, 0) / allCohortScores.length
      : 0;

    const percentile = calculatePercentile(userScore, allCohortScores);

    // 9. Return response
    return NextResponse.json({
      topic: topic || null,
      userScore: parseFloat(userScore.toFixed(2)),
      cohortAvg: parseFloat(cohortAvg.toFixed(2)),
      cohortSize: cohortIds.length,
      experienceBracket: userBracket.label,
      percentile,
      insufficient_data: false,
      topicBreakdown,
    });
  } catch (error) {
    console.error('Benchmark API error:', error);
    return NextResponse.json(
      { error: '벤치마크 데이터를 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}
