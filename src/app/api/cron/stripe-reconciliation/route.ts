import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { stripe } from '@/lib/payment/stripe-client';
import { cache } from '@/lib/redis/client';

// Cron-triggered reconciliation: compare DB subscription state with Stripe
// Protect with a secret header in production
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}` && request.headers.get('x-cron-secret') !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const lockKey = 'cron:stripe-reconciliation:lock';
  const existing = await cache.get(lockKey);
  if (existing) {
    return NextResponse.json({ skipped: true, reason: 'Already running or recently ran' });
  }
  await cache.set(lockKey, new Date().toISOString(), 3600);

  const subscriptions = await prisma.subscription.findMany({
    where: { status: { in: ['ACTIVE', 'PAST_DUE', 'TRIALING'] } },
  });

  const mismatches: Array<{ id: string; dbStatus: string; stripeStatus: string }> = [];

  for (const sub of subscriptions) {
    try {
      const stripeSub = await stripe.subscriptions.retrieve(sub.externalId);
      const statusMap: Record<string, string> = {
        trialing: 'TRIALING',
        active: 'ACTIVE',
        past_due: 'PAST_DUE',
        canceled: 'CANCELED',
        unpaid: 'SUSPENDED',
        paused: 'PAUSED',
      };
      const expectedStatus = statusMap[stripeSub.status] || 'ACTIVE';

      if (sub.status !== expectedStatus) {
        mismatches.push({
          id: sub.id,
          dbStatus: sub.status,
          stripeStatus: expectedStatus,
        });
        console.error(
          `[RECONCILIATION] Mismatch: ${sub.id} DB=${sub.status} Stripe=${expectedStatus}`
        );
      }
    } catch (error) {
      console.error(`[RECONCILIATION] Error checking ${sub.id}:`, error);
    }
  }

  return NextResponse.json({
    checked: subscriptions.length,
    mismatches: mismatches.length,
    details: mismatches,
  });
}
