import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}` && request.headers.get('x-cron-secret') !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  // 1. Auto-expire: in_progress sessions older than 2 hours → abandoned
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const expired = await prisma.interviewSession.updateMany({
    where: {
      status: 'in_progress',
      createdAt: { lt: twoHoursAgo },
      deletedAt: null,
    },
    data: {
      status: 'abandoned',
      endReason: 'timeout',
      completedAt: now,
    },
  });

  // Mark pending questions of expired sessions as unanswered
  if (expired.count > 0) {
    await prisma.question.updateMany({
      where: {
        session: {
          status: 'abandoned',
          endReason: 'timeout',
          completedAt: now,
        },
        status: 'pending',
      },
      data: { status: 'unanswered' },
    });
  }

  // 2. FREE tier: soft delete sessions older than 30 days
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const deleted = await prisma.interviewSession.updateMany({
    where: {
      user: { subscriptionTier: 'FREE' },
      createdAt: { lt: thirtyDaysAgo },
      deletedAt: null,
    },
    data: { deletedAt: now },
  });

  return NextResponse.json({
    expired: expired.count,
    cleaned: deleted.count,
    timestamp: now.toISOString(),
  });
}
