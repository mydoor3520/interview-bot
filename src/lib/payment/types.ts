import type { SubscriptionTier, BillingCycle } from '@prisma/client';

export interface CheckoutParams {
  userId: string;
  tier: SubscriptionTier;
  billingCycle: BillingCycle;
  successUrl: string;
  cancelUrl: string;
}

export interface PortalParams {
  customerId: string;
  returnUrl: string;
}

export interface PaymentAdapter {
  createCheckoutSession(params: CheckoutParams): Promise<{ url: string }>;
  createCustomerPortalSession(params: PortalParams): Promise<{ url: string }>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  refundPayment(paymentIntentId: string, amount?: number): Promise<void>;
}

// Price configuration (environment-driven)
export const PRICE_CONFIG = {
  PRO: {
    monthly: 19_900, // KRW
    yearly: 189_000, // KRW (~21% 할인, 월 ₩15,750)
  },
} as const;
