import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { StripeAdapter } from '@/lib/payment/stripe-adapter';
import { prisma } from '@/lib/db/prisma';
import { env } from '@/lib/env';
import { z } from 'zod';
import { checkUserRateLimit } from '@/lib/auth/user-rate-limit';

const checkoutSchema = z.object({
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
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: '입력 데이터가 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    // Check for existing active subscription
    const existing = await prisma.subscription.findUnique({
      where: { userId: auth.user.userId },
    });
    if (existing && existing.status === 'ACTIVE') {
      return NextResponse.json(
        { error: '이미 활성 구독이 있습니다. 구독 관리 페이지에서 변경해주세요.' },
        { status: 400 }
      );
    }

    const appUrl = env.NEXT_PUBLIC_APP_URL;
    const adapter = new StripeAdapter();
    const { url } = await adapter.createCheckoutSession({
      userId: auth.user.userId,
      tier: 'PRO',
      billingCycle: parsed.data.billingCycle,
      successUrl: `${appUrl}/billing?success=true`,
      cancelUrl: `${appUrl}/pricing`,
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: '결제 세션 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
