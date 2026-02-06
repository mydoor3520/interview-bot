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

// Tier limits configuration
export const TIER_LIMITS = {
  FREE: {
    maxSessions: 3, // per month
    maxQuestionsPerSession: 10,
  },
  PRO: {
    maxSessions: null, // unlimited
    maxQuestionsPerSession: 30,
  },
} as const;

// Price configuration (environment-driven)
export const PRICE_CONFIG = {
  PRO: {
    monthly: 24_900, // KRW
    yearly: 249_000, // KRW (2 months free)
  },
} as const;
