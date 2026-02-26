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

  // Read launch date from env
  const launchDateStr = process.env.CONVERSION_LAUNCH_DATE;
  if (!launchDateStr) {
    return NextResponse.json({ skipped: true, reason: 'CONVERSION_LAUNCH_DATE not configured' });
  }

  const launchDate = new Date(launchDateStr);
  const now = new Date();
  const daysUntilLaunch = Math.floor((launchDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Determine which phase to run based on days remaining
  let phase: 'preview' | 'earlybird' | 'launch' | null = null;
  if (daysUntilLaunch === 21) {
    phase = 'preview';
  } else if (daysUntilLaunch === 7) {
    phase = 'earlybird';
  } else if (daysUntilLaunch === 0) {
    phase = 'launch';
  }

  if (!phase) {
    return NextResponse.json({
      skipped: true,
      reason: 'No email scheduled for today',
      daysUntilLaunch
    });
  }

  // Redis lock to prevent duplicate sends
  const lockKey = `cron:conversion-email:${phase}:lock`;
  const existing = await cache.get(lockKey);
  if (existing) {
    return NextResponse.json({
      skipped: true,
      reason: 'Already running or recently ran',
      phase
    });
  }
  await cache.set(lockKey, new Date().toISOString(), 86400); // 24 hour lock

  // Fetch target users (FREE tier, active, email notifications enabled)
  const users = await prisma.user.findMany({
    where: {
      emailNotifications: true,
      isActive: true,
      deletedAt: null,
      subscriptionTier: 'FREE',
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  if (users.length === 0) {
    return NextResponse.json({
      sent: 0,
      phase,
      daysUntilLaunch,
      reason: 'No eligible users'
    });
  }

  // Batch-fetch all completed sessions for stats
  const allSessions = await prisma.interviewSession.findMany({
    where: {
      userId: { in: users.map(u => u.id) },
      status: 'completed',
      deletedAt: null,
    },
    include: {
      questions: {
        select: {
          evaluation: {
            select: { score: true }
          }
        }
      },
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
  const errors: string[] = [];

  // Process in batches of 10 with 100ms delay
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    if (!user.email) continue;

    const sessions = sessionsByUser.get(user.id) || [];
    const sessionsCompleted = sessions.length;

    const scores = sessions
      .flatMap(s => s.questions)
      .map(q => q.evaluation?.score ?? 0)
      .filter(s => s > 0);

    const avgScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    const userName = user.name || user.email.split('@')[0];

    try {
      let template;
      if (phase === 'preview') {
        template = emailTemplates.conversionPreview(userName, sessionsCompleted, avgScore);
      } else if (phase === 'earlybird') {
        template = emailTemplates.conversionEarlybird(userName);
      } else {
        template = emailTemplates.conversionLaunch(userName, sessionsCompleted);
      }

      await sendEmail({ to: user.email, ...template });
      sent++;
    } catch (error) {
      errors.push(`Failed to send to ${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Batch delay: pause after every 10 emails
    if ((i + 1) % 10 === 0 && i + 1 < users.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return NextResponse.json({
    sent,
    phase,
    daysUntilLaunch,
    totalUsers: users.length,
    errors: errors.length > 0 ? errors : undefined,
    timestamp: new Date().toISOString()
  });
}
