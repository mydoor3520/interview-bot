import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { StripeAdapter } from '@/lib/payment/stripe-adapter';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: auth.user.userId },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: '활성 구독이 없습니다.' },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const adapter = new StripeAdapter();
    const { url } = await adapter.createCustomerPortalSession({
      customerId: subscription.customerId,
      returnUrl: `${appUrl}/billing`,
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Portal error:', error);
    return NextResponse.json(
      { error: '구독 관리 포탈 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
