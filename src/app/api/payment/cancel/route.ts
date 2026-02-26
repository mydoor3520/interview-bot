import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { prisma } from '@/lib/db/prisma';
import { stripe } from '@/lib/payment/stripe-client';
import { z } from 'zod';
import { checkUserRateLimit } from '@/lib/auth/user-rate-limit';

const cancelSchema = z.object({
  reason: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  const rateLimit = checkUserRateLimit(auth.user.userId, 'payment', 5);
  if (rateLimit) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
    );
  }

  try {
    const body = await request.json();
    const parsed = cancelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: '입력 데이터가 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: auth.user.userId },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: '구독이 없습니다.' },
        { status: 400 }
      );
    }

    if (subscription.status === 'CANCELED') {
      return NextResponse.json(
        { error: '이미 취소된 구독입니다.' },
        { status: 400 }
      );
    }

    // Cancel at period end (not immediately)
    await stripe.subscriptions.update(subscription.externalId, {
      cancel_at_period_end: true,
    });

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { cancelReason: parsed.data.reason || null },
    });

    const endDate = subscription.currentPeriodEnd.toLocaleDateString('ko-KR');

    return NextResponse.json({
      success: true,
      message: `구독이 ${endDate}에 종료됩니다. 그때까지 모든 기능을 이용하실 수 있습니다.`,
      cancelAt: subscription.currentPeriodEnd,
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json(
      { error: '구독 취소 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
