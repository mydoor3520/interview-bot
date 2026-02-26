import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { prisma } from '@/lib/db/prisma';
import { stripe } from '@/lib/payment/stripe-client';
import { z } from 'zod';
import { checkUserRateLimit } from '@/lib/auth/user-rate-limit';

const changePlanSchema = z.object({
  billingCycle: z.enum(['MONTHLY', 'YEARLY']),
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
    const parsed = changePlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: '입력 데이터가 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: auth.user.userId },
    });

    if (!subscription || subscription.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: '활성 구독이 없습니다.' },
        { status: 400 }
      );
    }

    // Get new price ID from env
    const cycle = parsed.data.billingCycle;
    const envKey = `STRIPE_PRICE_PRO_${cycle}`;
    const newPriceId = process.env[envKey];

    if (!newPriceId) {
      // Try AppConfig fallback
      const config = await prisma.appConfig.findUnique({
        where: { key: `stripe_price_pro_${cycle.toLowerCase()}` },
      });
      if (!config) {
        return NextResponse.json(
          { error: '가격 정보를 찾을 수 없습니다.' },
          { status: 500 }
        );
      }
    }

    const priceId = newPriceId || (await prisma.appConfig.findUnique({
      where: { key: `stripe_price_pro_${cycle.toLowerCase()}` },
    }))!.value;

    // Update Stripe subscription with proration
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.externalId
    );

    await stripe.subscriptions.update(subscription.externalId, {
      items: [
        {
          id: stripeSubscription.items.data[0].id,
          price: priceId,
        },
      ],
      proration_behavior: 'create_prorations',
    });

    return NextResponse.json({
      success: true,
      message: '플랜이 변경되었습니다. 비례 정산이 적용됩니다.',
    });
  } catch (error) {
    console.error('Change plan error:', error);
    return NextResponse.json(
      { error: '플랜 변경 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
