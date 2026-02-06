import { stripe } from './stripe-client';
import { prisma } from '@/lib/db/prisma';
import type { PaymentAdapter, CheckoutParams, PortalParams } from './types';
import type { SubscriptionTier, BillingCycle } from '@prisma/client';

export class StripeAdapter implements PaymentAdapter {
  async createCheckoutSession(params: CheckoutParams): Promise<{ url: string }> {
    const priceId = await getPriceId(params.tier, params.billingCycle);
    const customerId = await getOrCreateStripeCustomer(params.userId);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        userId: params.userId,
        tier: params.tier,
      },
      locale: 'ko',
    });

    if (!session.url) {
      throw new Error('Stripe checkout session URL not available');
    }

    return { url: session.url };
  }

  async createCustomerPortalSession(params: PortalParams): Promise<{ url: string }> {
    const session = await stripe.billingPortal.sessions.create({
      customer: params.customerId,
      return_url: params.returnUrl,
    });

    return { url: session.url };
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }

  async refundPayment(paymentIntentId: string, amount?: number): Promise<void> {
    await stripe.refunds.create({
      payment_intent: paymentIntentId,
      ...(amount ? { amount } : {}),
      reason: 'requested_by_customer',
    });
  }
}

async function getPriceId(tier: SubscriptionTier, cycle: BillingCycle): Promise<string> {
  const key = `stripe_price_${tier.toLowerCase()}_${cycle.toLowerCase()}`;
  const config = await prisma.appConfig.findUnique({ where: { key } });
  if (!config) {
    // Fallback to env vars
    const envKey = `STRIPE_PRICE_${tier}_${cycle}`;
    const envValue = process.env[envKey];
    if (!envValue) {
      throw new Error(
        `Price ID not found for ${tier}/${cycle}. Set AppConfig key "${key}" or env var "${envKey}".`
      );
    }
    return envValue;
  }
  return config.value;
}

async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { userId },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}
