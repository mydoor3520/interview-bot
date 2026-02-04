import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  const { searchParams } = new URL(request.url);
  const weakQuestions = searchParams.get('weakQuestions') === 'true';

  // If requesting weak questions
  if (weakQuestions) {
    const questions = await prisma.question.findMany({
      where: {
        evaluation: { score: { lte: 6 } },
        session: { deletedAt: null },
      },
      include: {
        evaluation: true,
        session: { select: { difficulty: true, startedAt: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ weakQuestions: questions });
  }

  // Get dashboard statistics
  const [
    totalSessions,
    totalQuestions,
    avgScoreResult,
    topicScoresRaw,
    difficultyScoresRaw,
    recentTrendRaw,
    weakTopicsRaw,
    recentSessions,
  ] = await Promise.all([
    // Total completed sessions
    prisma.interviewSession.count({
      where: {
        deletedAt: null,
        status: 'completed',
      },
    }),

    // Total questions
    prisma.question.count(),

    // Average score
    prisma.evaluation.aggregate({
      _avg: { score: true },
    }),

    // Topic scores (group by category)
    prisma.$queryRaw<Array<{ topic: string; avgScore: number; count: number }>>`
      SELECT
        q.category as topic,
        CAST(AVG(e.score) AS FLOAT) as "avgScore",
        COUNT(*)::int as count
      FROM "Question" q
      JOIN "Evaluation" e ON e."questionId" = q.id
      JOIN "InterviewSession" s ON q."sessionId" = s.id
      WHERE s."deletedAt" IS NULL
      GROUP BY q.category
      ORDER BY "avgScore" DESC
    `,

    // Difficulty scores
    prisma.$queryRaw<Array<{ difficulty: string; avgScore: number; count: number }>>`
      SELECT
        s.difficulty,
        CAST(AVG(e.score) AS FLOAT) as "avgScore",
        COUNT(DISTINCT s.id)::int as count
      FROM "InterviewSession" s
      JOIN "Question" q ON q."sessionId" = s.id
      JOIN "Evaluation" e ON e."questionId" = q.id
      WHERE s."deletedAt" IS NULL AND s.status = 'completed'
      GROUP BY s.difficulty
      ORDER BY "avgScore" DESC
    `,

    // Recent trend (last 30 days)
    (async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return prisma.$queryRaw<Array<{ date: Date; avgScore: number; count: number }>>`
        SELECT
          DATE(s."startedAt") as date,
          CAST(AVG(e.score) AS FLOAT) as "avgScore",
          COUNT(DISTINCT s.id)::int as count
        FROM "InterviewSession" s
        JOIN "Question" q ON q."sessionId" = s.id
        JOIN "Evaluation" e ON e."questionId" = q.id
        WHERE s."deletedAt" IS NULL AND s."startedAt" >= ${thirtyDaysAgo}
        GROUP BY DATE(s."startedAt")
        ORDER BY date ASC
      `;
    })(),

    // Weak topics (bottom 5 by average score, min 2 questions)
    prisma.$queryRaw<Array<{ topic: string; avgScore: number; count: number }>>`
      SELECT
        q.category as topic,
        CAST(AVG(e.score) AS FLOAT) as "avgScore",
        COUNT(*)::int as count
      FROM "Question" q
      JOIN "Evaluation" e ON e."questionId" = q.id
      JOIN "InterviewSession" s ON q."sessionId" = s.id
      WHERE s."deletedAt" IS NULL
      GROUP BY q.category
      HAVING COUNT(*) >= 2
      ORDER BY "avgScore" ASC
      LIMIT 5
    `,

    // Recent 5 sessions
    prisma.interviewSession.findMany({
      where: {
        deletedAt: null,
        status: 'completed',
      },
      include: {
        _count: { select: { questions: true } },
        targetPosition: { select: { company: true, position: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: 5,
    }),
  ]);

  const averageScore = avgScoreResult._avg.score ?? 0;

  // Format recent trend dates to string
  const recentTrend = recentTrendRaw.map((item) => ({
    date: item.date.toISOString().split('T')[0],
    avgScore: item.avgScore,
    count: item.count,
  }));

  return NextResponse.json({
    totalSessions,
    totalQuestions,
    averageScore: Number(averageScore.toFixed(2)),
    topicScores: topicScoresRaw.map((item) => ({
      topic: item.topic,
      avgScore: Number(item.avgScore.toFixed(2)),
      count: item.count,
    })),
    difficultyScores: difficultyScoresRaw.map((item) => ({
      difficulty: item.difficulty,
      avgScore: Number(item.avgScore.toFixed(2)),
      count: item.count,
    })),
    recentTrend,
    weakTopics: weakTopicsRaw.map((item) => ({
      topic: item.topic,
      avgScore: Number(item.avgScore.toFixed(2)),
    })),
    recentSessions,
  });
}
