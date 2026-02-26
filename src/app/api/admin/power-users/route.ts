import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';

interface PowerUser {
  id: string;
  email: string;
  name: string | null;
  signupDate: string;
  lastActive: string | null;
  signupSource: string | null;
  aiConsent: boolean;
  totalSessions: number;
  avgScore: number;
  totalQuestions: number;
  avgDuration: number;
  sessionsPerWeek: number;
}

interface PowerUserSummary {
  total: number;
  avgSessionsPerUser: number;
  avgScoreOverall: number;
  withAiConsent: number;
  withProfile: number;
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (!auth.authenticated) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const minSessions = parseInt(searchParams.get('minSessions') || '10', 10);
    const period = parseInt(searchParams.get('period') || '30', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Validate parameters
    if (minSessions < 1 || minSessions > 1000) {
      return NextResponse.json(
        { error: '최소 세션 수는 1-1000 사이여야 합니다.' },
        { status: 400 }
      );
    }

    if (period < 1 || period > 365) {
      return NextResponse.json(
        { error: '기간은 1-365일 사이여야 합니다.' },
        { status: 400 }
      );
    }

    if (limit < 1 || limit > 200) {
      return NextResponse.json(
        { error: '조회 개수는 1-200 사이여야 합니다.' },
        { status: 400 }
      );
    }

    // Raw SQL query for efficiency (Prisma $extends() type issues with complex aggregations)
    const results = await prisma.$queryRaw<Array<{
      id: string;
      email: string;
      name: string | null;
      signup_date: Date;
      last_active: Date | null;
      signup_source: string | null;
      ai_consent: boolean;
      has_profile: boolean;
      total_sessions: bigint;
      avg_score: number | null;
      total_questions: bigint | null;
      avg_duration: number | null;
    }>>`
      SELECT
        u.id,
        u.email,
        u.name,
        u."createdAt" as signup_date,
        u."lastLoginAt" as last_active,
        u."signupSource" as signup_source,
        u."aiDataConsent" as ai_consent,
        CASE WHEN up.id IS NOT NULL THEN true ELSE false END as has_profile,
        COUNT(s.id) as total_sessions,
        AVG(s."totalScore") as avg_score,
        SUM(s."questionCount") as total_questions,
        AVG(s."sessionDurationSec") as avg_duration
      FROM "User" u
      LEFT JOIN "UserProfile" up ON up."userId" = u.id AND up."deletedAt" IS NULL
      JOIN "InterviewSession" s ON s."userId" = u.id
      WHERE s.status = 'completed'
        AND s."deletedAt" IS NULL
        AND s."createdAt" >= NOW() - INTERVAL '${Prisma.raw(period.toString())} days'
        AND u."deletedAt" IS NULL
      GROUP BY u.id, up.id
      HAVING COUNT(s.id) >= ${minSessions}
      ORDER BY COUNT(s.id) DESC
      LIMIT ${limit}
    `;

    // Transform results and calculate sessions per week
    const powerUsers: PowerUser[] = results.map((row) => {
      const totalSessions = Number(row.total_sessions);
      const weeksInPeriod = period / 7;
      const sessionsPerWeek = parseFloat((totalSessions / weeksInPeriod).toFixed(2));

      return {
        id: row.id,
        email: row.email,
        name: row.name,
        signupDate: row.signup_date.toISOString(),
        lastActive: row.last_active?.toISOString() || null,
        signupSource: row.signup_source,
        aiConsent: row.ai_consent,
        totalSessions,
        avgScore: row.avg_score ? parseFloat(row.avg_score.toFixed(2)) : 0,
        totalQuestions: Number(row.total_questions || 0),
        avgDuration: row.avg_duration ? Math.round(row.avg_duration) : 0,
        sessionsPerWeek,
      };
    });

    // Calculate summary statistics
    const summary: PowerUserSummary = {
      total: powerUsers.length,
      avgSessionsPerUser:
        powerUsers.length > 0
          ? parseFloat(
              (
                powerUsers.reduce((sum, u) => sum + u.totalSessions, 0) /
                powerUsers.length
              ).toFixed(1)
            )
          : 0,
      avgScoreOverall:
        powerUsers.length > 0
          ? parseFloat(
              (
                powerUsers.reduce((sum, u) => sum + u.avgScore, 0) /
                powerUsers.length
              ).toFixed(2)
            )
          : 0,
      withAiConsent: powerUsers.filter((u) => u.aiConsent).length,
      withProfile: results.filter((r) => r.has_profile).length,
    };

    return NextResponse.json({
      powerUsers,
      summary,
    });
  } catch (error) {
    console.error('[Admin Power Users] Error:', error);
    return NextResponse.json(
      { error: '파워 유저 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
