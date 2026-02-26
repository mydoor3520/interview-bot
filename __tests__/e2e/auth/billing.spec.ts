import { test, expect } from '@playwright/test';

test.describe('Billing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/billing');
  });

  test('should load billing page successfully', async ({ page }) => {
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Verify URL
    expect(page.url()).toContain('/billing');
  });

  test('should show subscription management heading or empty state', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Billing page shows either "구독 관리" heading (if subscription exists)
    // or "구독 정보가 없습니다" empty state
    const heading = page.getByRole('heading', { name: '구독 관리' });
    const emptyState = page.getByText('구독 정보가 없습니다');

    const hasHeading = await heading.isVisible().catch(() => false);
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    expect(hasHeading || hasEmptyState).toBeTruthy();
  });

  test('should show subscription info or empty state', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Look for subscription information or empty state
    const subscriptionInfo = page.getByText('구독 관리');
    const emptyState = page.getByText('구독 정보가 없습니다');
    const viewPlansLink = page.getByRole('link', { name: '플랜 보기' });

    const hasSubscriptionInfo = await subscriptionInfo.isVisible().catch(() => false);
    const hasEmptyState = await emptyState.isVisible().catch(() => false);
    const hasViewPlans = await viewPlansLink.isVisible().catch(() => false);

    expect(hasSubscriptionInfo || hasEmptyState || hasViewPlans).toBeTruthy();
  });

  test('should show current plan or upgrade options', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Look for plan-related information or empty state with plan link
    const planInfo = page.locator('text=/FREE|PRO|플랜|구독|업그레이드/i');
    await expect(planInfo.first()).toBeVisible();
  });

  test('should show pricing information or plan selection', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Look for pricing elements or plan link
    const pricingElement = page.locator('text=/₩|원|\/월|\/년|가격/i');
    const viewPlansLink = page.getByRole('link', { name: '플랜 보기' });

    const hasPricingInfo = await pricingElement.first().isVisible().catch(() => false);
    const hasViewPlansLink = await viewPlansLink.isVisible().catch(() => false);

    expect(hasPricingInfo || hasViewPlansLink).toBeTruthy();
  });

  test('should NOT show error states on page load', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Check for error indicators
    const errorBanner = page.locator('[role="alert"]').filter({ hasText: /error|오류|실패/i });
    const errorCount = await errorBanner.count();

    expect(errorCount).toBe(0);

    // Also check for red error text
    const redErrorText = page.locator('.text-red-500, .text-red-600, .text-red-700').filter({ hasText: /error|오류/i });
    const redErrorCount = await redErrorText.count();

    expect(redErrorCount).toBe(0);
  });

  test('should show payment method, subscription status, or empty state', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Look for payment-related sections or empty state
    // In the billing page, if no subscription: "구독 정보가 없습니다" is shown
    // If subscription exists: shows status badge (활성, 취소됨, etc.) and payment history
    const noSubscription = page.getByText('구독 정보가 없습니다');
    const subscriptionStatus = page.locator('text=/활성|취소됨|결제 완료|결제 지연|체험 중/i');
    const planView = page.getByRole('link', { name: '플랜 보기' });

    const hasNoSubMessage = await noSubscription.isVisible().catch(() => false);
    const hasStatusInfo = await subscriptionStatus.first().isVisible().catch(() => false);
    const hasPlanView = await planView.isVisible().catch(() => false);

    // At least one of these should be visible
    expect(hasNoSubMessage || hasStatusInfo || hasPlanView).toBeTruthy();
  });

  test('should allow navigation to billing from user menu', async ({ page }) => {
    // Navigate to dashboard first
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Click user avatar to open menu
    const avatarButton = page.locator('header button.rounded-full');
    await avatarButton.click();

    // Wait for dropdown
    await page.waitForTimeout(300);

    // Click billing/payment management option (it's a Link element)
    const billingLink = page.locator('a[href="/billing"]').filter({ hasText: '결제 관리' });
    await billingLink.click();

    // Wait for navigation
    await page.waitForTimeout(500);

    // Verify we're on billing page
    expect(page.url()).toContain('/billing');
  });
});
