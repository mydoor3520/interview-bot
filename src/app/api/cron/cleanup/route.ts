import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}` && request.headers.get('x-cron-secret') !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // FREE tier: soft delete sessions older than 30 days
  const deleted = await prisma.interviewSession.updateMany({
    where: {
      user: { subscriptionTier: 'FREE' },
      createdAt: { lt: thirtyDaysAgo },
      deletedAt: null,
    },
    data: { deletedAt: now },
  });

  return NextResponse.json({
    cleaned: deleted.count,
    timestamp: now.toISOString(),
  });
}
