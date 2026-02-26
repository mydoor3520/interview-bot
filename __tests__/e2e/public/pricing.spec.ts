import { test, expect } from '@playwright/test';
import { expectPublicNavbar, expectNoSidebar } from '../fixtures';

test.describe('Pricing Page', () => {
  test('displays PublicNavbar and no sidebar', async ({ page }) => {
    await page.goto('/pricing');
    await expectPublicNavbar(page);
    await expectNoSidebar(page);
  });

  test('displays main heading with interview preparation text', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByRole('heading', { name: /면접 준비/i })).toBeVisible();
  });

  test('displays FREE plan card with price', async ({ page }) => {
    await page.goto('/pricing');

    // Look for FREE text (could be in heading or badge)
    await expect(page.getByText('FREE')).toBeVisible();

    // Look for W0 price
    await expect(page.getByText('₩0')).toBeVisible();
  });

  test('displays PRO plan card with popular badge', async ({ page }) => {
    await page.goto('/pricing');

    // Look for PRO text
    await expect(page.getByText('PRO')).toBeVisible();

    // Look for popular badge
    await expect(page.getByText('인기')).toBeVisible();
  });

  test('displays monthly/yearly billing toggle', async ({ page }) => {
    await page.goto('/pricing');

    // Look for switch role (toggle button)
    const toggle = page.locator('[role="switch"]');
    await expect(toggle).toBeVisible();
  });

  test('displays plan features and benefits', async ({ page }) => {
    await page.goto('/pricing');

    // Check for specific plan feature text that exists on the page
    await expect(page.getByText('월 1회 면접 세션').first()).toBeVisible();
  });
});
