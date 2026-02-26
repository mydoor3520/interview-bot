/**
 * Stripe Product/Price 생성 스크립트
 * Usage: npx tsx scripts/setup-stripe-products.ts
 *
 * 이 스크립트는 Stripe에 Product와 Price를 생성하고,
 * AppConfig 테이블에 Price ID를 저장합니다.
 *
 * 필수 환경변수:
 *  - STRIPE_SECRET_KEY
 *  - DATABASE_URL
 */

import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error('Error: STRIPE_SECRET_KEY is required');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-12-18.acacia' as Stripe.LatestApiVersion,
});

async function main() {
  console.log('Creating Stripe products and prices...\n');

  // Create Pro product
  const product = await stripe.products.create({
    name: 'Interview Bot Pro',
    description: 'AI 모의 면접 프로 플랜 - 월 50회 세션, 15질문/세션, 실시간 피드백',
    metadata: { tier: 'PRO' },
  });
  console.log(`✓ Product created: ${product.id} (${product.name})`);

  // Monthly price (KRW 19,900)
  const monthlyPrice = await stripe.prices.create({
    product: product.id,
    currency: 'krw',
    unit_amount: 19900,
    recurring: { interval: 'month' },
    metadata: { tier: 'PRO', cycle: 'MONTHLY' },
  });
  console.log(`✓ Monthly price created: ${monthlyPrice.id} (₩19,900/월)`);

  // Yearly price (KRW 189,000 — ~21% discount, ₩15,750/mo equivalent)
  const yearlyPrice = await stripe.prices.create({
    product: product.id,
    currency: 'krw',
    unit_amount: 189000,
    recurring: { interval: 'year' },
    metadata: { tier: 'PRO', cycle: 'YEARLY' },
  });
  console.log(`✓ Yearly price created: ${yearlyPrice.id} (₩189,000/년)`);

  console.log('\n--- Environment Variables ---');
  console.log(`STRIPE_PRICE_PRO_MONTHLY=${monthlyPrice.id}`);
  console.log(`STRIPE_PRICE_PRO_YEARLY=${yearlyPrice.id}`);

  console.log('\n--- AppConfig SQL (optional) ---');
  console.log(`INSERT INTO "AppConfig" (id, key, value, "updatedAt") VALUES`);
  console.log(`  (gen_random_uuid(), 'stripe_price_pro_monthly', '${monthlyPrice.id}', NOW()),`);
  console.log(`  (gen_random_uuid(), 'stripe_price_pro_yearly', '${yearlyPrice.id}', NOW());`);

  console.log('\nDone! Add the env vars to your .env.local file.');
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
