import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sendEmail } from '@/lib/email';
import { emailTemplates } from '@/lib/email/templates';
import { cache } from '@/lib/redis/client';

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}` && request.headers.get('x-cron-secret') !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const lockKey = 'cron:weekly-reminder:lock';
  const existing = await cache.get(lockKey);
  if (existing) {
    return NextResponse.json({ skipped: true, reason: 'Already running or recently ran' });
  }
  await cache.set(lockKey, new Date().toISOString(), 3600);

  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);

  const users = await prisma.user.findMany({
    where: {
      emailNotifications: true,
      isActive: true,
      deletedAt: null,
    },
    select: { id: true, email: true },
  });

  // Batch-fetch all completed sessions for the week to avoid N+1
  const allSessions = await prisma.interviewSession.findMany({
    where: {
      userId: { in: users.map(u => u.id) },
      createdAt: { gte: lastWeek },
      status: 'completed',
      deletedAt: null,
    },
    include: {
      questions: { select: { evaluation: { select: { score: true } } } },
    },
  });

  // Group sessions by userId
  const sessionsByUser = new Map<string, typeof allSessions>();
  for (const session of allSessions) {
    if (!session.userId) continue;
    const list = sessionsByUser.get(session.userId) || [];
    list.push(session);
    sessionsByUser.set(session.userId, list);
  }

  let sent = 0;

  for (const user of users) {
    if (!user.email) continue;

    const sessions = sessionsByUser.get(user.id) || [];

    const scores = sessions
      .flatMap(s => s.questions)
      .map(q => q.evaluation?.score ?? 0)
      .filter(s => s > 0);

    const stats = {
      sessions: sessions.length,
      avgScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
    };

    const template = emailTemplates.weeklyReminder(stats);
    await sendEmail({ to: user.email, ...template });
    sent++;
  }

  return NextResponse.json({ sent, timestamp: new Date().toISOString() });
}
