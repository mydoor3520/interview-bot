# Phase 2: 결제 시스템 - Stripe (Week 13-17)

> **Last Updated:** 2026-02-06
> **Reviewed by:** Momus (Score: 6/10 REVISE → Updated)
>
> **상위 문서:** [monetization-strategy.md](./monetization-strategy.md)
> **목표:** Stripe 결제 연동, 구독 관리, Webhook 멱등성, 결제 UI
> **기간:** 5주
> **선행 조건:**
> - **CRITICAL:** Phase 1 완료 (User 모델, 인증 완비, Redis, GDPR 기본 - Subscription.userId FK 의존성)
> **산출물:** 완전한 Stripe 결제 시스템, 가격 페이지, 구독 관리 대시보드

> **Phase 1 전제조건 (필수 검증):**
> - `User` 모델 존재 (`prisma db pull` 후 확인)
> - `requireAuth(req)` → `{ userId: string; tier: SubscriptionTier }` 반환
> - `SubscriptionTier` enum: `FREE | PRO`
> - User 모델에 `stripeCustomerId String?` 필드 존재

---

## 목차

1. [Week 13: Stripe 기초 설정 + DB 스키마](#week-13)
2. [Week 14: Checkout + Customer Portal](#week-14)
3. [Week 15: Webhook 엔드포인트 + 멱등성](#week-15)
4. [Week 16: 구독 관리 (업/다운그레이드, 취소, 환불)](#week-16)
5. [Week 17: 결제 UI + 테스트](#week-17)
6. [완료 기준](#완료-기준)

---

## 중요 전제조건 및 아키텍처 결정

### User 모델 의존성 (CRITICAL)

Phase 2를 시작하기 전에 **Phase 1이 완료되어 User 모델이 존재해야 합니다**.

```prisma
// Phase 1에서 생성된 User 모델 (필수)
model User {
  id                String   @id @default(cuid())
  email             String   @unique
  subscriptionTier  SubscriptionTier @default(FREE)
  // ... 기타 필드
}
```

**이유:**
- `Subscription.userId`는 `User.id`에 대한 Foreign Key
- User 모델 없이 마이그레이션 실행 시 실패
- Webhook 핸들러에서 `user.update()` 수행 불가

**검증:**
```bash
# Phase 2 시작 전 확인
npx prisma db pull  # User 테이블 존재 확인
```

### Stripe API 버전 정책

Stripe API 버전은 **날짜만 지정**하고, extension(`.acacia` 등)은 자동 선택됩니다.

```typescript
// WRONG: extension을 수동 지정하면 오류
apiVersion: '2025-12-18.acacia'

// CORRECT: 날짜만 지정
apiVersion: '2024-12-18'
```

### Webhook 멱등성 전략

Stripe는 동일 이벤트를 최대 3일간 재전송할 수 있습니다. Race condition을 방지하기 위해:

1. **DB 트랜잭션 사용**: 모든 webhook 처리를 트랜잭션으로 래핑
2. **externalId UNIQUE 제약**: DB 레벨에서 중복 방지
3. **Serializable Isolation**: 필요시 최고 수준의 격리 레벨 사용
4. **외부 API 호출 분리**: Stripe API 호출은 트랜잭션 외부에서 수행 (데드락/타임아웃 방지)

> **주의:** Prisma의 `findUnique()`는 `SELECT FOR UPDATE`를 수행하지 않습니다.
> Serializable isolation level만으로 충분하거나, 명시적 row lock이 필요하면 `$queryRaw`를 사용하세요:
> ```typescript
> const existing = await tx.$queryRaw<WebhookEvent[]>`
>   SELECT * FROM "WebhookEvent" WHERE "externalId" = ${event.id} FOR UPDATE
> `;
> ```

### 한국 전자상거래법 준수

**7일 환불 정책** (전자상거래법 제17조):
- 구매 후 7일 이내 청약 철회 가능
- **단, 사용량이 30% 이상인 경우 비례 정산** (시행령 제21조)
- 최소 환불 금액: 1,000원

**환불 계산 로직:**
```
사용률 < 30%  → 전액 환불
사용률 >= 30% → (1 - 사용률) × 결제금액
```

---

## Week 13: Stripe 기초 설정 + DB 스키마 {#week-13}

### 13.1 의존성 설치

```bash
npm install stripe
```

### 13.2 DB 스키마 추가

**파일:** `prisma/schema.prisma`에 추가

```prisma
enum PaymentProvider {
  STRIPE
  PORTONE  // Phase 7에서 활성화
}

enum SubscriptionStatus {
  TRIALING
  ACTIVE
  PAST_DUE
  CANCELED
  SUSPENDED
  PAUSED
}

enum BillingCycle {
  MONTHLY
  YEARLY
}

enum PaymentStatus {
  PENDING
  SUCCEEDED
  FAILED
  REFUNDED
  PARTIALLY_REFUNDED
}

model Subscription {
  id                String   @id @default(cuid())
  userId            String   @unique
  user              User     @relation(fields: [userId], references: [id])

  provider          PaymentProvider  @default(STRIPE)
  externalId        String           // Stripe subscription ID
  customerId        String           // Stripe customer ID

  status            SubscriptionStatus @default(TRIALING)
  tier              SubscriptionTier
  billingCycle      BillingCycle       @default(MONTHLY)

  amount            Int                // 원 단위 (KRW)
  currency          String             @default("KRW")

  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  trialEnd           DateTime?
  canceledAt         DateTime?
  cancelReason       String?

  payments          Payment[]

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([externalId])
  @@index([status])
}

model Payment {
  id              String   @id @default(cuid())
  subscriptionId  String
  subscription    Subscription @relation(fields: [subscriptionId], references: [id])

  provider        PaymentProvider
  externalId      String          // Stripe payment intent ID
  amount          Int
  currency        String
  status          PaymentStatus

  taxAmount       Int?
  description     String?
  receiptUrl      String?
  failureReason   String?
  refundedAmount  Int?
  refundedAt      DateTime?

  createdAt       DateTime @default(now())

  @@index([subscriptionId])
  @@index([createdAt])
}

model WebhookEvent {
  id              String   @id @default(cuid())
  provider        PaymentProvider
  eventType       String
  externalId      String   @unique  // 이벤트 ID (멱등성)
  payload         Json
  processed       Boolean  @default(false)
  processedAt     DateTime?
  error           String?
  retryCount      Int      @default(0)

  createdAt       DateTime @default(now())

  @@index([processed, createdAt])
}
```

### 13.3 Stripe 서비스 초기화

**파일:** `src/lib/payment/stripe-client.ts`

```typescript
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18', // 날짜만 지정 (extension은 자동 선택)
  typescript: true,
});
```

### 13.4 Stripe Product/Price 생성 스크립트

**Note:** 1개 Product 생성 (Pro) - Free는 Stripe 없이 무료 제공 (2-tier: FREE + PRO)

```typescript
// scripts/setup-stripe-products.ts
// Stripe 대시보드 또는 스크립트로 생성
// Product/Price 생성 (1 tier x 2 cycles = 2개 Price)

const PRODUCTS = [
  {
    name: 'Interview Bot Pro',
    metadata: { tier: 'PRO' },
    prices: [
      { currency: 'krw', unit_amount: 24900, recurring: { interval: 'month' } },
      { currency: 'krw', unit_amount: 249000, recurring: { interval: 'year' } },
    ],
  },
];

// AppConfig에 price ID 저장
// key: "stripe_price_pro_monthly" -> value: "price_xxx"
// key: "stripe_price_pro_yearly" -> value: "price_xxx"
```

### 13.5 결제 추상화 레이어

**파일:** `src/lib/payment/types.ts`

```typescript
export interface PaymentAdapter {
  createCheckoutSession(params: {
    userId: string;
    tier: SubscriptionTier;
    billingCycle: BillingCycle;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }>;

  createCustomerPortalSession(params: {
    customerId: string;
    returnUrl: string;
  }): Promise<{ url: string }>;

  cancelSubscription(subscriptionId: string): Promise<void>;
  refundPayment(paymentIntentId: string, amount?: number): Promise<void>;
}
```

**파일:** `src/lib/payment/stripe-adapter.ts`

```typescript
export class StripeAdapter implements PaymentAdapter {
  async createCheckoutSession(params) {
    const priceId = await getPriceId(params.tier, params.billingCycle);

    // 기존 Stripe customer 조회 또는 생성
    let customerId = await getOrCreateStripeCustomer(params.userId);

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
      // 한국 결제 로케일
      locale: 'ko',
    });

    return { url: session.url! };
  }

  // ... 기타 메서드 구현
}

// getPriceId() 구현
async function getPriceId(tier: SubscriptionTier, cycle: BillingCycle): Promise<string> {
  const key = `stripe_price_${tier.toLowerCase()}_${cycle.toLowerCase()}`;
  const config = await prisma.appConfig.findUnique({ where: { key } });
  if (!config) throw new Error(`Price ID not found for ${tier}/${cycle}. Run setup script first.`);
  return config.value;
}

// getOrCreateStripeCustomer() 구현
// 전제: Phase 1의 User 모델에 `stripeCustomerId String?` 필드 추가 필요
async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.stripeCustomerId) return user.stripeCustomerId;

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
```

---

## Week 14: Checkout + Customer Portal {#week-14}

### 14.1 Checkout API

**파일:** `src/app/api/payment/checkout/route.ts`

```typescript
export async function POST(req: NextRequest) {
  const { userId, tier } = requireAuth(req);
  const { billingCycle } = await req.json();

  // 이미 구독 중인지 확인
  const existing = await prisma.subscription.findUnique({
    where: { userId },
  });
  if (existing && existing.status === 'ACTIVE') {
    return Response.json({ error: '이미 활성 구독이 있습니다.' }, { status: 400 });
  }

  const adapter = new StripeAdapter();
  const { url } = await adapter.createCheckoutSession({
    userId,
    tier: billingCycle.tier,
    billingCycle: billingCycle.cycle,
    successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true`,
    cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
  });

  return Response.json({ url });
}
```

### 14.2 Customer Portal (구독 관리)

```typescript
// src/app/api/payment/portal/route.ts
export async function POST(req: NextRequest) {
  const { userId } = requireAuth(req);

  const subscription = await prisma.subscription.findUnique({ where: { userId } });
  if (!subscription) {
    return Response.json({ error: '활성 구독이 없습니다.' }, { status: 400 });
  }

  const adapter = new StripeAdapter();
  const { url } = await adapter.createCustomerPortalSession({
    customerId: subscription.customerId,
    returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
  });

  return Response.json({ url });
}
```

---

## Week 15: Webhook 엔드포인트 + 멱등성 {#week-15}

#### middleware.ts 수정 필요

**파일:** `src/middleware.ts` Line 4
```typescript
// 현재:
const PUBLIC_PATHS = ['/login', '/api/auth'];

// 변경:
const PUBLIC_PATHS = ['/login', '/api/auth', '/api/webhooks'];
```
> Stripe webhook은 인증 없이 접근 가능해야 합니다. Stripe-Signature 헤더로 별도 검증합니다.

### 15.1 Webhook 핸들러

**파일:** `src/app/api/webhooks/stripe/route.ts`

```typescript
import { stripe } from '@/lib/payment/stripe-client';
import { headers } from 'next/headers';

// Next.js App Router: raw body 접근을 위한 설정
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // Next.js App Router에서 ArrayBuffer 방식으로 body 읽기
  const buffer = await req.arrayBuffer();
  const body = Buffer.from(buffer);

  // headers() 유틸리티 사용 (App Router 권장)
  const headersList = await headers();
  const sig = headersList.get('stripe-signature');

  if (!sig) {
    return Response.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // 멱등성 처리
  await handleWebhookWithIdempotency(event);

  return Response.json({ received: true });
}
```

### 15.2 멱등성 보장 핸들러 (Race Condition 방지)

**파일:** `src/lib/payment/webhook-handler.ts`

```typescript
export async function handleWebhookWithIdempotency(event: Stripe.Event) {
  // 1. Stripe API 호출은 트랜잭션 외부에서 수행 (데드락/타임아웃 방지)
  //    외부 API 호출이 Serializable 트랜잭션 내부에 있으면
  //    긴 응답 시간으로 인해 DB 락이 오래 유지되어 데드락 위험
  const externalData = await prefetchStripeData(event);

  // 2. DB 트랜잭션: 순수 DB 작업만 수행
  return await prisma.$transaction(async (tx) => {
    // 멱등성 체크: 이미 처리된 이벤트는 스킵
    const existing = await tx.webhookEvent.findUnique({
      where: { externalId: event.id },
    });

    if (existing?.processed) {
      console.log(`Webhook ${event.id} already processed, skipping`);
      return;
    }

    // 2. 처리 중 레코드 생성 (다른 요청이 중복 처리 방지)
    await tx.webhookEvent.upsert({
      where: { externalId: event.id },
      create: {
        externalId: event.id,
        provider: 'STRIPE',
        eventType: event.type,
        payload: event.data.object as any,
        processed: false,
      },
      update: {},
    });

    try {
      // 3. 이벤트 타입별 처리
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, tx, externalData);
          break;

        case 'invoice.paid':
          await handleInvoicePaid(event.data.object as Stripe.Invoice, tx, externalData);
          break;

        case 'invoice.payment_failed':
          await handlePaymentFailed(event.data.object as Stripe.Invoice, tx);
          break;

        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, tx);
          break;

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, tx);
          break;

        case 'charge.refunded':
          await handleChargeRefunded(event.data.object as Stripe.Charge, tx);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      // 4. 처리 성공 기록
      await tx.webhookEvent.update({
        where: { externalId: event.id },
        data: {
          processed: true,
          processedAt: new Date(),
        }
      });
    } catch (error) {
      // 5. 실패 기록
      await tx.webhookEvent.update({
        where: { externalId: event.id },
        data: {
          error: error instanceof Error ? error.message : String(error),
          retryCount: { increment: 1 },
        }
      });
      throw error; // Stripe 재시도 유도
    }
  }, {
    isolationLevel: 'Serializable', // 최고 수준의 격리 (필요시)
    timeout: 10000, // 10초 타임아웃
  });
}

// Stripe API 호출을 트랜잭션 외부에서 미리 수행
// 이렇게 하면 Serializable 트랜잭션 내부에서 외부 네트워크 호출로 인한
// 데드락/타임아웃 위험을 제거할 수 있음
async function prefetchStripeData(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      );
      return { subscription };
    }
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      const subscription = await stripe.subscriptions.retrieve(
        invoice.subscription as string
      );
      return { subscription };
    }
    default:
      return {};
  }
}
```

### 15.3 이벤트 핸들러 구현

**중요:** 모든 핸들러는 트랜잭션 객체를 받아 데이터 일관성을 보장합니다.
Stripe API 호출은 `prefetchStripeData()`에서 미리 수행되어 `externalData`로 전달됩니다.

```typescript
// Type definition for transaction client
import { Prisma } from '@prisma/client';
type PrismaTransactionClient = Prisma.TransactionClient;

// 모든 핸들러는 tx (트랜잭션 객체)를 받아서 일관성 보장
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  tx: PrismaTransactionClient,
  externalData: { subscription?: Stripe.Subscription }
) {
  const userId = session.metadata?.userId;
  const tier = session.metadata?.tier as SubscriptionTier;
  if (!userId || !tier) throw new Error('Missing metadata');

  // externalData에서 미리 조회된 Stripe 구독 정보 사용 (트랜잭션 내 외부 호출 제거)
  const stripeSubscription = externalData.subscription!;

  // 트랜잭션 내에서 DB 작업만 수행
  await tx.subscription.create({
    data: {
      userId,
      provider: 'STRIPE',
      externalId: stripeSubscription.id,
      customerId: session.customer as string,
      status: 'ACTIVE',
      tier,
      billingCycle: stripeSubscription.items.data[0].price.recurring?.interval === 'year' ? 'YEARLY' : 'MONTHLY',
      amount: session.amount_total || 0,
      currency: session.currency || 'krw',
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
    }
  });

  // User 티어 업데이트
  await tx.user.update({
    where: { id: userId },
    data: { subscriptionTier: tier }
  });

  // 캐시 무효화 (트랜잭션 외부에서 실행하려면 after commit hook 사용)
  // await invalidateUserCache(userId);
}

async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  tx: PrismaTransactionClient,
  externalData: { subscription?: Stripe.Subscription }
) {
  const subscriptionId = invoice.subscription as string;
  const subscription = await tx.subscription.findFirst({
    where: { externalId: subscriptionId }
  });
  if (!subscription) return;

  // Payment 기록
  await tx.payment.create({
    data: {
      subscriptionId: subscription.id,
      provider: 'STRIPE',
      externalId: invoice.payment_intent as string,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: 'SUCCEEDED',
      receiptUrl: invoice.hosted_invoice_url,
    }
  });

  // 구독 기간 갱신 (externalData에서 미리 조회된 Stripe 구독 정보 사용)
  const stripeSubscription = externalData.subscription\!;
  await tx.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'ACTIVE',
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
    }
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice, tx: PrismaTransactionClient) {
  const subscriptionId = invoice.subscription as string;
  const subscription = await tx.subscription.findFirst({
    where: { externalId: subscriptionId }
  });
  if (!subscription) return;

  // PAST_DUE 전환 (3일 Grace Period)
  await tx.subscription.update({
    where: { id: subscription.id },
    data: { status: 'PAST_DUE' }
  });

  // 사용자 알림 이메일 (트랜잭션 외부에서 실행 권장)
  const user = await tx.user.findUnique({ where: { id: subscription.userId } });
  if (user) {
    // 이메일 발송은 트랜잭션 커밋 후 비동기로 처리
    await sendEmail({
      to: user.email,
      subject: '[InterviewBot] 결제 실패 안내',
      html: '<p>결제가 실패했습니다. 3일 이내에 결제 수단을 업데이트해주세요.</p>',
    });
  }
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription, tx: PrismaTransactionClient) {
  const subscription = await tx.subscription.findFirst({
    where: { externalId: sub.id }
  });
  if (!subscription) return;

  await tx.subscription.update({
    where: { id: subscription.id },
    data: { status: 'CANCELED', canceledAt: new Date() }
  });

  await tx.user.update({
    where: { id: subscription.userId },
    data: { subscriptionTier: 'FREE' }
  });

  // 캐시 무효화 (트랜잭션 커밋 후 실행)
  // await invalidateUserCache(subscription.userId);
}
```

---

## Week 16: 구독 관리 {#week-16}

### 16.1 업그레이드/다운그레이드

```typescript
// src/app/api/payment/change-plan/route.ts
export async function POST(req: NextRequest) {
  const { userId } = requireAuth(req);
  const { newTier, billingCycle } = await req.json();

  const subscription = await prisma.subscription.findUnique({ where: { userId } });
  if (!subscription || subscription.status !== 'ACTIVE') {
    return Response.json({ error: '활성 구독이 없습니다.' }, { status: 400 });
  }

  const newPriceId = await getPriceId(newTier, billingCycle);

  // Stripe 프로레이션 처리
  const stripeSubscription = await stripe.subscriptions.retrieve(subscription.externalId);
  await stripe.subscriptions.update(subscription.externalId, {
    items: [{
      id: stripeSubscription.items.data[0].id,
      price: newPriceId,
    }],
    proration_behavior: 'create_prorations', // 비례 배분
  });

  // Webhook에서 customer.subscription.updated 이벤트로 DB 업데이트됨
  return Response.json({ success: true });
}
```

### 16.2 구독 취소

```typescript
// src/app/api/payment/cancel/route.ts
export async function POST(req: NextRequest) {
  const { userId } = requireAuth(req);
  const { reason } = await req.json();

  const subscription = await prisma.subscription.findUnique({ where: { userId } });
  if (!subscription) {
    return Response.json({ error: '구독이 없습니다.' }, { status: 400 });
  }

  // 기간 종료 시 취소 (즉시 취소 아님)
  await stripe.subscriptions.update(subscription.externalId, {
    cancel_at_period_end: true,
  });

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { cancelReason: reason }
  });

  return Response.json({
    message: `구독이 ${subscription.currentPeriodEnd.toLocaleDateString('ko-KR')}에 종료됩니다.`
  });
}
```

### 16.3 환불 처리 (한국 전자상거래법 준수)

```typescript
// 전자상거래법 7일 환불 정책 + 사용량 비례 정산
// src/app/api/payment/refund/route.ts
export async function POST(req: NextRequest) {
  const { userId } = requireAuth(req);
  const { paymentId } = await req.json();

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, subscription: { userId } },
    include: { subscription: true }
  });
  if (!payment) return Response.json({ error: 'Not found' }, { status: 404 });

  // 7일 이내 환불 가능
  const daysSincePurchase = (Date.now() - payment.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSincePurchase > 7) {
    return Response.json({ error: '구매 후 7일이 경과하여 환불이 불가합니다.' }, { status: 400 });
  }

  // 사용량 기반 비례 정산 (한국 전자상거래법 시행령 제21조)
  const usageData = await calculateUsage(userId, payment.createdAt);
  const usageRatio = usageData.sessionsUsed / usageData.sessionsTotal;

  // 30% 이상 사용 시 비례 환불, 미만 시 전액 환불
  let refundAmount = payment.amount;
  if (usageRatio >= 0.3) {
    refundAmount = Math.floor(payment.amount * (1 - usageRatio));
  }

  // 최소 환불 금액 (1000원 미만은 환불하지 않음)
  if (refundAmount < 1000) {
    return Response.json({
      error: '환불 가능 금액이 최소 금액(1,000원) 미만입니다.',
      usageInfo: { used: usageData.sessionsUsed, total: usageData.sessionsTotal }
    }, { status: 400 });
  }

  await stripe.refunds.create({
    payment_intent: payment.externalId,
    amount: refundAmount, // 원 단위 → cents 변환 필요시 처리
    reason: 'requested_by_customer',
    metadata: {
      usageRatio: usageRatio.toFixed(2),
      originalAmount: payment.amount,
    }
  });
  // charge.refunded 웹훅에서 DB 업데이트 처리

  return Response.json({
    success: true,
    refundAmount,
    usageInfo: usageData
  });
}

async function calculateUsage(userId: string, startDate: Date) {
  const sessions = await prisma.interviewSession.count({
    where: {
      userId,
      createdAt: { gte: startDate }
    }
  });

  const subscription = await prisma.subscription.findUnique({ where: { userId } });
  const limit = TIER_LIMITS[subscription!.tier].maxSessions;

  // Pro 티어 무제한 세션 환불 계산
  if (limit === null) {
    // Pro 티어: 기간 기반 비례 계산 (세션 수 무의미)
    const payment = await prisma.payment.findFirst({
      where: { subscriptionId: subscription!.id },
      orderBy: { createdAt: 'desc' },
    });
    const daysPassed = (Date.now() - (payment?.createdAt ?? startDate).getTime()) / (1000 * 60 * 60 * 24);
    const periodTotal = 30; // 월간 구독 기준
    const usageRatio = daysPassed / periodTotal;
    return { sessionsUsed: Math.round(usageRatio * 100), sessionsTotal: 100 }; // 비율로 반환
  }

  return { sessionsUsed: sessions, sessionsTotal: limit };
}
```

---

## Week 17: 결제 UI + 테스트 {#week-17}

### 17.1 가격 페이지

**파일:** `src/app/pricing/page.tsx`

```
레이아웃 (2-column: FREE vs PRO):
┌──────────────────────────────────────────────────────────────┐
│                    요금제 비교                                 │
│                                                              │
│  [월간] / [연간 (17% 할인)]  토글                              │
│                                                              │
│  ┌────────────────┐  ┌────────────────┐                      │
│  │  Free           │  │  Pro    인기!  │                      │
│  │  ₩0/월          │  │  ₩24,900/월    │                      │
│  │                 │  │                │                      │
│  │ 3세션/월        │  │ 무제한 세션    │                      │
│  │ Haiku 4.5      │  │ Haiku 4.5     │                      │
│  │ 10질문/세션     │  │ 30질문/세션    │                      │
│  │ 맞춤 코스      │  │ 맞춤 코스     │                      │
│  │ 사후평가        │  │ 실시간 피드백  │                      │
│  │                 │  │               │                      │
│  │ 현재 플랜       │  │ [시작하기]     │                      │
│  └────────────────┘  └────────────────┘                      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ 상세 기능 비교표 (토글로 펼침)                         │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### 17.2 구독 관리 페이지

**파일:** `src/app/billing/page.tsx`

```
레이아웃:
┌──────────────────────────────────────────────┐
│  내 구독                                      │
│                                              │
│  현재 플랜: Pro (월간)                        │
│  결제 금액: ₩24,900/월                       │
│  다음 결제일: 2026-03-05                      │
│                                              │
│  [플랜 변경]  [구독 관리 (Stripe Portal)]     │
│  [구독 취소]                                  │
│                                              │
│  ──── 결제 내역 ────                         │
│  2026-02-05  ₩24,900  결제 완료  [영수증]    │
│  2026-01-05  ₩24,900  결제 완료  [영수증]    │
│  ...                                         │
└──────────────────────────────────────────────┘
```

### 17.3 업그레이드 유도 UI

```typescript
// src/components/UpgradePrompt.tsx
// 세션 한도 도달 시 표시

export function UpgradePrompt({ currentTier, limit }: Props) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <h3>월간 세션 한도에 도달했습니다</h3>
      <p>{limit}개의 세션을 모두 사용했습니다.</p>
      <Link href="/pricing">
        <button>플랜 업그레이드</button>
      </Link>
    </div>
  );
}
```

### 17.4 일일 정합성 체크

```typescript
// src/app/api/cron/stripe-reconciliation/route.ts
// 일 1회: Stripe 구독 상태와 DB 상태 비교

export async function POST(req: NextRequest) {
  const subscriptions = await prisma.subscription.findMany({
    where: { status: { in: ['ACTIVE', 'PAST_DUE'] } }
  });

  for (const sub of subscriptions) {
    const stripeSub = await stripe.subscriptions.retrieve(sub.externalId);
    const expectedStatus = mapStripeStatus(stripeSub.status);

    if (sub.status !== expectedStatus) {
      console.error(`Subscription mismatch: ${sub.id} DB=${sub.status} Stripe=${expectedStatus}`);
      // 자동 수정 또는 알림
    }
  }
}
```

---

## 완료 기준 {#완료-기준}

```
[ ] Stripe Checkout → 결제 완료 → 구독 활성화 → 티어 업그레이드
[ ] 결제 실패 → PAST_DUE → Grace Period (3일) → 기능 제한
[ ] 환불 처리 → 7일 이내 전액 환불
[ ] 업그레이드/다운그레이드 프로레이션 정상 동작
[ ] 구독 취소 → 기간 종료 시 FREE 전환
[ ] 웹훅 멱등성: 동일 이벤트 중복 처리 안 함
[ ] 웹훅 실패율 < 0.1%
[ ] Stripe/DB 정합성 100% (일일 체크)
[ ] 카드 데이터 서버 미접촉 확인 (PCI DSS - Stripe Elements)
[ ] 통신판매업 신고 완료 확인 (Phase 0에서 시작)
[ ] 가격 페이지 (/pricing) 정상 표시
[ ] 구독 관리 UI (/billing) 정상 동작
[ ] 업그레이드 유도 UI 동작
```

---

## 파일 변경 매트릭스

```
신규:
  src/lib/payment/stripe-client.ts
  src/lib/payment/stripe-adapter.ts
  src/lib/payment/types.ts
  src/lib/payment/webhook-handler.ts
  src/app/api/payment/checkout/route.ts
  src/app/api/payment/portal/route.ts
  src/app/api/payment/change-plan/route.ts
  src/app/api/payment/cancel/route.ts
  src/app/api/payment/refund/route.ts
  src/app/api/webhooks/stripe/route.ts
  src/app/api/cron/stripe-reconciliation/route.ts
  src/app/pricing/page.tsx
  src/app/billing/page.tsx
  src/components/UpgradePrompt.tsx
  scripts/setup-stripe-products.ts

수정:
  prisma/schema.prisma          - Subscription, Payment, WebhookEvent, enums
  package.json                  - stripe 추가
  src/middleware.ts              - /api/webhooks public path 추가
  src/app/settings/page.tsx     - 구독 섹션 활성화

환경 변수:
  STRIPE_SECRET_KEY=
  STRIPE_PUBLISHABLE_KEY=
  STRIPE_WEBHOOK_SECRET=
```

#### 환경변수 (.env.example 추가)

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### 개발/운영 환경 구분

| 기간 | 모드 | 환경변수 접두사 | 비고 |
|------|------|---------------|------|
| Week 13-16 | Test Mode | `sk_test_*` / `pk_test_*` | 개발 및 통합 테스트 |
| Week 17 배포 전 | Live Mode 전환 | `sk_live_*` / `pk_live_*` | 프로덕션 |

**Live Mode 전환 체크리스트:**
- [ ] Stripe Dashboard에서 Live API keys 발급
- [ ] Webhook endpoint를 프로덕션 URL로 변경
- [ ] 환경변수 업데이트 (.env.production)
- [ ] 테스트 카드로 Live Mode 결제 검증
- [ ] Webhook 수신 확인 (Stripe Dashboard > Developers > Webhooks)

---

## Momus 리뷰 반영 사항 (2026-02-06)

본 계획은 Momus의 6/10 REVISE 평가를 받아 다음 사항을 수정했습니다.

### 1. User 모델 의존성 명시 (CRITICAL)
- **문제:** Phase 1 완료 전제조건이 명확하지 않음
- **해결:** 선행 조건에 "Phase 1 완료 (User 모델 존재 필수)" 명시
- **추가:** "중요 전제조건 및 아키텍처 결정" 섹션 신설

### 2. Stripe API 버전 수정 (CRITICAL)
- **문제:** `apiVersion: '2025-12-18.acacia'` 형식 오류
- **해결:** `apiVersion: '2024-12-18'` (날짜만 지정)
- **위치:** `src/lib/payment/stripe-client.ts` 13.3절

### 3. Webhook Signature Verification (HIGH)
- **문제:** `req.text()` 방식은 App Router에서 권장되지 않음
- **해결:** `req.arrayBuffer()` + `Buffer.from()` 패턴 사용
- **추가:** `headers()` 유틸리티 사용 (Next.js 권장)
- **위치:** `src/app/api/webhooks/stripe/route.ts` 15.1절

### 4. Webhook 멱등성 Race Condition 방지 (HIGH)
- **문제:** 단순 upsert는 동시 요청 시 중복 처리 위험
- **해결:**
  - `prisma.$transaction()` 래핑
  - Serializable isolation level 사용
  - 모든 핸들러에 트랜잭션 객체 전달
  - `PrismaTransactionClient` 타입 정의 추가
- **위치:** `src/lib/payment/webhook-handler.ts` 15.2-15.3절

### 5. 한국 전자상거래법 환불 정책 (MEDIUM)
- **문제:** 7일 환불 정책이 단순 전액 환불로 구현됨
- **해결:**
  - 사용량 30% 미만: 전액 환불
  - 사용량 30% 이상: 비례 정산
  - 최소 환불 금액 1,000원 체크
  - `calculateUsage()` 함수 추가
- **위치:** `src/app/api/payment/refund/route.ts` 16.3절

### 6. 문서 메타데이터 추가
- **추가:** "Last Updated: 2026-02-06"
- **추가:** "Reviewed by: Momus (Score: 6/10 REVISE → Updated)"

**검토자 노트:**
Phase 2 구현 시 위 변경사항을 모두 반영해야 하며, 특히 User 모델 의존성 확인과 Webhook 트랜잭션 패턴은 필수입니다.
```
