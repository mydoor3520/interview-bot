import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { prisma } from '@/lib/db/prisma';
import { stripe } from '@/lib/payment/stripe-client';
import { TIER_LIMITS } from '@/lib/feature-gate';
import { z } from 'zod';
import { checkUserRateLimit } from '@/lib/auth/user-rate-limit';

const refundSchema = z.object({
  paymentId: z.string(),
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
    const parsed = refundSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: '입력 데이터가 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findFirst({
      where: {
        id: parsed.data.paymentId,
        subscription: { userId: auth.user.userId },
      },
      include: { subscription: true },
    });

    if (!payment) {
      return NextResponse.json(
        { error: '결제 내역을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (payment.status === 'REFUNDED') {
      return NextResponse.json(
        { error: '이미 환불된 결제입니다.' },
        { status: 400 }
      );
    }

    // 7-day refund window (Korean e-commerce law Article 17)
    const daysSincePurchase =
      (Date.now() - payment.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSincePurchase > 7) {
      return NextResponse.json(
        { error: '구매 후 7일이 경과하여 환불이 불가합니다.' },
        { status: 400 }
      );
    }

    // Calculate usage-based proration (시행령 제21조)
    const usageData = await calculateUsage(
      auth.user.userId,
      payment.createdAt,
      payment.subscription
    );

    let refundAmount = payment.amount;
    if (usageData.usageRatio >= 0.3) {
      // 30% or more usage: proportional refund
      refundAmount = Math.floor(payment.amount * (1 - usageData.usageRatio));
    }

    // Minimum refund amount check (1,000 KRW)
    if (refundAmount < 1000) {
      return NextResponse.json(
        {
          error: '환불 가능 금액이 최소 금액(1,000원) 미만입니다.',
          usageInfo: {
            usageRatio: usageData.usageRatio,
            sessionsUsed: usageData.sessionsUsed,
          },
        },
        { status: 400 }
      );
    }

    // Process refund via Stripe
    await stripe.refunds.create({
      payment_intent: payment.externalId,
      amount: refundAmount,
      reason: 'requested_by_customer',
      metadata: {
        usageRatio: usageData.usageRatio.toFixed(2),
        originalAmount: String(payment.amount),
      },
    });

    // charge.refunded webhook will update DB, but update local state too
    return NextResponse.json({
      success: true,
      refundAmount,
      originalAmount: payment.amount,
      usageInfo: {
        usageRatio: usageData.usageRatio,
        sessionsUsed: usageData.sessionsUsed,
      },
    });
  } catch (error) {
    console.error('Refund error:', error);
    return NextResponse.json(
      { error: '환불 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

async function calculateUsage(
  userId: string,
  startDate: Date,
  subscription: { tier: string; id: string }
) {
  const sessionsUsed = await prisma.interviewSession.count({
    where: {
      userId,
      createdAt: { gte: startDate },
    },
  });

  const tierKey = subscription.tier as keyof typeof TIER_LIMITS;
  const limit = TIER_LIMITS[tierKey]?.monthlySessions;

  // For PRO tier (unlimited sessions): use time-based proration
  if (limit === null) {
    const payment = await prisma.payment.findFirst({
      where: { subscriptionId: subscription.id },
      orderBy: { createdAt: 'desc' },
    });
    const daysPassed =
      (Date.now() - (payment?.createdAt ?? startDate).getTime()) /
      (1000 * 60 * 60 * 24);
    const periodTotal = 30; // monthly billing period
    const usageRatio = Math.min(daysPassed / periodTotal, 1);
    return { sessionsUsed, usageRatio };
  }

  const usageRatio = Math.min(sessionsUsed / limit, 1);
  return { sessionsUsed, usageRatio };
}
