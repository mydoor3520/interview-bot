import { test, expect } from '@playwright/test';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should load dashboard page successfully', async ({ page }) => {
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Verify URL
    expect(page.url()).toContain('/dashboard');
  });

  test('should show stat cards with metrics or empty state', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Dashboard shows either stat cards (if sessions exist) or empty state
    // Stat card labels: "총 세션", "총 질문", "평균 점수", "최근 7일 세션"
    const totalSessions = page.getByText('총 세션');
    const emptyState = page.getByText('아직 면접 기록이 없습니다.');

    const hasStats = await totalSessions.isVisible().catch(() => false);
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    // One of the two states must be shown
    expect(hasStats || hasEmptyState).toBeTruthy();
  });

  test('should show score trend or recent interviews section or empty state', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // These sections appear only if stats.totalSessions > 0
    const scoreTrendSection = page.getByText('점수 추이 (최근 30일)');
    const recentInterviewsSection = page.getByText('최근 면접');
    const emptyState = page.getByText('아직 면접 기록이 없습니다.');

    const hasSections = await scoreTrendSection.isVisible().catch(() => false) ||
                        await recentInterviewsSection.isVisible().catch(() => false) ||
                        await emptyState.isVisible().catch(() => false);

    expect(hasSections).toBeTruthy();
  });

  test('should NOT show error states', async ({ page }) => {
    // Check for common error indicators
    const errorBanner = page.locator('[role="alert"]').filter({ hasText: /error|오류|실패/i });
    const errorCount = await errorBanner.count();

    expect(errorCount).toBe(0);

    // Also check for red error text
    const redErrorText = page.locator('.text-red-500, .text-red-600, .text-red-700').filter({ hasText: /error|오류/i });
    const redErrorCount = await redErrorText.count();

    expect(redErrorCount).toBe(0);
  });

  test('should display page content without loading spinners', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Wait a bit for any loading states to clear
    await page.waitForTimeout(500);

    // Check that main content is visible (dashboard heading should always be rendered)
    // Scope to main to avoid matching the h2 "대시보드" in the Header banner
    const heading = page.locator('main').getByRole('heading', { name: '대시보드' });
    await expect(heading).toBeVisible();
  });
});
