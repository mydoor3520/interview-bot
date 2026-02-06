import Stripe from 'stripe';
import { stripe } from './stripe-client';
import { prisma } from '@/lib/db/prisma';

// Transaction client type from Prisma
type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

// Helper: extract current period from SubscriptionItem (Stripe v20+ moved these from Subscription)
function getSubscriptionPeriod(sub: Stripe.Subscription) {
  const item = sub.items.data[0];
  return {
    currentPeriodStart: new Date(item.current_period_start * 1000),
    currentPeriodEnd: new Date(item.current_period_end * 1000),
  };
}

// Helper: extract subscription ID from Invoice (Stripe v20+ moved to parent.subscription_details)
function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const sub = invoice.parent?.subscription_details?.subscription;
  if (!sub) return null;
  return typeof sub === 'string' ? sub : sub.id;
}

export async function handleWebhookWithIdempotency(event: Stripe.Event) {
  // 1. Prefetch Stripe data outside transaction (prevent deadlock from external API calls)
  const externalData = await prefetchStripeData(event);

  // 2. DB transaction with Serializable isolation for idempotency
  return await prisma.$transaction(
    async (tx: TxClient) => {
      // Check idempotency: skip if already processed
      const existing = await tx.webhookEvent.findUnique({
        where: { externalId: event.id },
      });

      if (existing?.processed) {
        console.log(`Webhook ${event.id} already processed, skipping`);
        return;
      }

      // Create/update webhook event record
      await tx.webhookEvent.upsert({
        where: { externalId: event.id },
        create: {
          externalId: event.id,
          provider: 'STRIPE',
          eventType: event.type,
          payload: event.data.object as object,
          processed: false,
        },
        update: {},
      });

      try {
        // Route to event handler
        switch (event.type) {
          case 'checkout.session.completed':
            await handleCheckoutCompleted(
              event.data.object as Stripe.Checkout.Session,
              tx,
              externalData
            );
            break;

          case 'invoice.paid':
            await handleInvoicePaid(
              event.data.object as Stripe.Invoice,
              tx,
              externalData
            );
            break;

          case 'invoice.payment_failed':
            await handlePaymentFailed(
              event.data.object as Stripe.Invoice,
              tx
            );
            break;

          case 'customer.subscription.updated':
            await handleSubscriptionUpdated(
              event.data.object as Stripe.Subscription,
              tx
            );
            break;

          case 'customer.subscription.deleted':
            await handleSubscriptionDeleted(
              event.data.object as Stripe.Subscription,
              tx
            );
            break;

          case 'charge.refunded':
            await handleChargeRefunded(
              event.data.object as Stripe.Charge,
              tx
            );
            break;

          default:
            console.log(`Unhandled webhook event type: ${event.type}`);
        }

        // Mark as processed
        await tx.webhookEvent.update({
          where: { externalId: event.id },
          data: {
            processed: true,
            processedAt: new Date(),
          },
        });
      } catch (error) {
        // Record failure
        await tx.webhookEvent.update({
          where: { externalId: event.id },
          data: {
            error: error instanceof Error ? error.message : String(error),
            retryCount: { increment: 1 },
          },
        });
        throw error; // Re-throw to trigger Stripe retry
      }
    },
    {
      isolationLevel: 'Serializable',
      timeout: 10000,
    }
  );
}

async function prefetchStripeData(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id
        );
        return { subscription };
      }
      return {};
    }
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = getInvoiceSubscriptionId(invoice);
      if (subId) {
        const subscription = await stripe.subscriptions.retrieve(subId);
        return { subscription };
      }
      return {};
    }
    default:
      return {};
  }
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  tx: TxClient,
  externalData: { subscription?: Stripe.Subscription }
) {
  const userId = session.metadata?.userId;
  const tier = session.metadata?.tier;
  if (!userId || !tier) {
    throw new Error('Missing userId or tier in checkout session metadata');
  }

  const stripeSubscription = externalData.subscription;
  if (!stripeSubscription) {
    throw new Error('Subscription not found in prefetched data');
  }

  const interval =
    stripeSubscription.items.data[0]?.price?.recurring?.interval;
  const period = getSubscriptionPeriod(stripeSubscription);

  await tx.subscription.create({
    data: {
      userId,
      provider: 'STRIPE',
      externalId: stripeSubscription.id,
      customerId: typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id || '',
      status: 'ACTIVE',
      tier: tier as 'FREE' | 'PRO',
      billingCycle: interval === 'year' ? 'YEARLY' : 'MONTHLY',
      amount: session.amount_total || 0,
      currency: session.currency || 'krw',
      currentPeriodStart: period.currentPeriodStart,
      currentPeriodEnd: period.currentPeriodEnd,
    },
  });

  // Update user tier
  await tx.user.update({
    where: { id: userId },
    data: { subscriptionTier: tier as 'FREE' | 'PRO' },
  });
}

async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  tx: TxClient,
  externalData: { subscription?: Stripe.Subscription }
) {
  const subscriptionExternalId = getInvoiceSubscriptionId(invoice);
  if (!subscriptionExternalId) return;

  const subscription = await tx.subscription.findFirst({
    where: { externalId: subscriptionExternalId },
  });
  if (!subscription) return;

  // Record payment
  await tx.payment.create({
    data: {
      subscriptionId: subscription.id,
      provider: 'STRIPE',
      externalId: invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: 'SUCCEEDED',
      receiptUrl: invoice.hosted_invoice_url,
    },
  });

  // Renew subscription period from prefetched data
  const stripeSubscription = externalData.subscription;
  if (stripeSubscription) {
    const period = getSubscriptionPeriod(stripeSubscription);
    await tx.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'ACTIVE',
        currentPeriodStart: period.currentPeriodStart,
        currentPeriodEnd: period.currentPeriodEnd,
      },
    });
  }
}

async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  tx: TxClient
) {
  const subscriptionExternalId = getInvoiceSubscriptionId(invoice);
  if (!subscriptionExternalId) return;

  const subscription = await tx.subscription.findFirst({
    where: { externalId: subscriptionExternalId },
  });
  if (!subscription) return;

  // Transition to PAST_DUE
  await tx.subscription.update({
    where: { id: subscription.id },
    data: { status: 'PAST_DUE' },
  });
}

async function handleSubscriptionUpdated(
  sub: Stripe.Subscription,
  tx: TxClient
) {
  const subscription = await tx.subscription.findFirst({
    where: { externalId: sub.id },
  });
  if (!subscription) return;

  const statusMap: Record<string, 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'SUSPENDED' | 'PAUSED'> = {
    trialing: 'TRIALING',
    active: 'ACTIVE',
    past_due: 'PAST_DUE',
    canceled: 'CANCELED',
    unpaid: 'SUSPENDED',
    paused: 'PAUSED',
  };

  const newStatus = statusMap[sub.status] || 'ACTIVE';
  const interval = sub.items.data[0]?.price?.recurring?.interval;
  const period = getSubscriptionPeriod(sub);

  await tx.subscription.update({
    where: { id: subscription.id },
    data: {
      status: newStatus,
      billingCycle: interval === 'year' ? 'YEARLY' : 'MONTHLY',
      currentPeriodStart: period.currentPeriodStart,
      currentPeriodEnd: period.currentPeriodEnd,
      canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
    },
  });
}

async function handleSubscriptionDeleted(
  sub: Stripe.Subscription,
  tx: TxClient
) {
  const subscription = await tx.subscription.findFirst({
    where: { externalId: sub.id },
  });
  if (!subscription) return;

  await tx.subscription.update({
    where: { id: subscription.id },
    data: { status: 'CANCELED', canceledAt: new Date() },
  });

  // Downgrade user to FREE
  await tx.user.update({
    where: { id: subscription.userId },
    data: { subscriptionTier: 'FREE' },
  });
}

async function handleChargeRefunded(
  charge: Stripe.Charge,
  tx: TxClient
) {
  if (!charge.payment_intent) return;

  const piId = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent.id;

  const payment = await tx.payment.findFirst({
    where: { externalId: piId },
  });
  if (!payment) return;

  const refundedAmount = charge.amount_refunded;
  const isFullRefund = refundedAmount >= charge.amount;

  await tx.payment.update({
    where: { id: payment.id },
    data: {
      status: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
      refundedAmount,
      refundedAt: new Date(),
    },
  });
}
