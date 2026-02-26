import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.authenticated) return auth.response;

  try {
    const [
      popularTopicsRaw,
      topicScoresRaw,
      weaknessPatternsRaw,
      engagementMetrics,
      signupSourcesRaw,
      companyDemandRaw,
    ] = await Promise.all([
      // Popular Topics (top 20)
      prisma.$queryRaw<Array<{ topic: string; count: bigint }>>(
        Prisma.sql`
          SELECT unnest(topics) as topic, COUNT(*) as count
          FROM "InterviewSession"
          WHERE "deletedAt" IS NULL
          GROUP BY topic
          ORDER BY count DESC
          LIMIT 20
        `
      ),

      // Average Scores by Topic (top 20)
      prisma.$queryRaw<Array<{ topic: string; avg_score: number; count: bigint }>>(
        Prisma.sql`
          SELECT q.category as topic, AVG(e.score) as avg_score, COUNT(*) as count
          FROM "Question" q
          JOIN "Evaluation" e ON e."questionId" = q.id
          GROUP BY q.category
          ORDER BY count DESC
          LIMIT 20
        `
      ),

      // Weakness Patterns (avg score < 5, min 3 evaluations)
      prisma.$queryRaw<Array<{ topic: string; avg_score: number; count: bigint }>>(
        Prisma.sql`
          SELECT q.category as topic, AVG(e.score) as avg_score, COUNT(*) as count
          FROM "Question" q
          JOIN "Evaluation" e ON e."questionId" = q.id
          GROUP BY q.category
          HAVING AVG(e.score) < 5 AND COUNT(*) >= 3
          ORDER BY avg_score ASC
          LIMIT 20
        `
      ),

      // Engagement Metrics (raw SQL to avoid $extends() type issues)
      (async () => {
        const [userStats] = await prisma.$queryRaw<Array<{
          total_users: bigint;
          verified_users: bigint;
          profile_users: bigint;
          ai_consent_users: bigint;
        }>>(Prisma.sql`
          SELECT
            COUNT(*) FILTER (WHERE "deletedAt" IS NULL) as total_users,
            COUNT(*) FILTER (WHERE "deletedAt" IS NULL AND "emailVerified" = true) as verified_users,
            COUNT(*) FILTER (WHERE "deletedAt" IS NULL AND id IN (SELECT "userId" FROM "UserProfile" WHERE "userId" IS NOT NULL)) as profile_users,
            COUNT(*) FILTER (WHERE "deletedAt" IS NULL AND "aiDataConsent" = true) as ai_consent_users
          FROM "User"
        `);

        const [sessionStats] = await prisma.$queryRaw<Array<{
          total_sessions: bigint;
          completed_sessions: bigint;
          rated_sessions: bigint;
          avg_duration: number | null;
          avg_rating: number | null;
        }>>(Prisma.sql`
          SELECT
            COUNT(*) as total_sessions,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
            COUNT(*) FILTER (WHERE status = 'completed' AND "userRating" IS NOT NULL) as rated_sessions,
            AVG("sessionDurationSec") as avg_duration,
            AVG("userRating"::float) FILTER (WHERE "userRating" IS NOT NULL) as avg_rating
          FROM "InterviewSession"
          WHERE "deletedAt" IS NULL
        `);

        const total = Number(sessionStats.total_sessions);
        const completed = Number(sessionStats.completed_sessions);
        const rated = Number(sessionStats.rated_sessions);

        return {
          totalUsers: Number(userStats.total_users),
          verifiedUsers: Number(userStats.verified_users),
          profileUsers: Number(userStats.profile_users),
          aiConsentUsers: Number(userStats.ai_consent_users),
          completionRate: total > 0 ? (completed / total) * 100 : 0,
          avgSessionDuration: sessionStats.avg_duration || 0,
          avgUserRating: sessionStats.avg_rating || 0,
          surveyResponseRate: completed > 0 ? (rated / completed) * 100 : 0,
        };
      })(),

      // Signup Sources (top 10)
      prisma.$queryRaw<Array<{ source: string; count: bigint }>>(
        Prisma.sql`
          SELECT "signupSource" as source, COUNT(*) as count
          FROM "User"
          WHERE "deletedAt" IS NULL AND "signupSource" IS NOT NULL
          GROUP BY "signupSource"
          ORDER BY count DESC
          LIMIT 10
        `
      ),

      // Company/Position Demand (top 15)
      prisma.$queryRaw<Array<{ company: string; count: bigint; positions: string }>>(
        Prisma.sql`
          SELECT company, COUNT(*) as count,
                 ARRAY_AGG(DISTINCT position ORDER BY position) as positions
          FROM "TargetPosition"
          WHERE "deletedAt" IS NULL
          GROUP BY company
          ORDER BY count DESC
          LIMIT 15
        `
      ),
    ]);

    // Transform results (convert BigInt to number for JSON serialization)
    const popularTopics = popularTopicsRaw.map((row) => ({
      topic: row.topic,
      count: Number(row.count),
    }));

    const topicScores = topicScoresRaw.map((row) => ({
      topic: row.topic,
      avgScore: Math.round(row.avg_score * 10) / 10,
      count: Number(row.count),
    }));

    const weaknessPatterns = weaknessPatternsRaw.map((row) => ({
      topic: row.topic,
      avgScore: Math.round(row.avg_score * 10) / 10,
      count: Number(row.count),
    }));

    const signupSources = signupSourcesRaw.map((row) => ({
      source: row.source || 'unknown',
      count: Number(row.count),
    }));

    const companyDemand = companyDemandRaw.map((row) => ({
      company: row.company,
      count: Number(row.count),
      positions: Array.isArray(row.positions) ? row.positions : [],
    }));

    return NextResponse.json({
      popularTopics,
      topicScores,
      weaknessPatterns,
      engagement: {
        totalUsers: engagementMetrics.totalUsers,
        verifiedUsers: engagementMetrics.verifiedUsers,
        profileUsers: engagementMetrics.profileUsers,
        aiConsentUsers: engagementMetrics.aiConsentUsers,
        completionRate: Math.round(engagementMetrics.completionRate * 10) / 10,
        avgSessionDuration: Math.round(engagementMetrics.avgSessionDuration),
        avgUserRating: Math.round(engagementMetrics.avgUserRating * 10) / 10,
        surveyResponseRate: Math.round(engagementMetrics.surveyResponseRate * 10) / 10,
      },
      signupSources,
      companyDemand,
    });
  } catch (error) {
    console.error('Insights API error:', error);
    return NextResponse.json(
      { error: '데이터를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
