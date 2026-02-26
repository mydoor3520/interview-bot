import { test, expect } from '@playwright/test';
import { expectAdminSidebar, expectAdminHeader } from '../fixtures';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin');
  });

  test('Page loads successfully', async ({ page }) => {
    await expect(page).toHaveURL('/admin');
    await expectAdminHeader(page);
    await expectAdminSidebar(page);
  });

  test('"운영 지표" text is visible', async ({ page }) => {
    await expect(page.getByText('운영 지표')).toBeVisible();
  });

  test('Stats visible: "오늘 활성 사용자" or similar stat cards', async ({ page }) => {
    // Look for stat cards - could contain various metrics
    const statsText = [
      '오늘 활성 사용자',
      '총 사용자',
      '활성 사용자',
      '총 매출',
      '이번 달 매출',
      '총 세션',
    ];

    // At least one stat should be visible
    let foundStat = false;
    for (const stat of statsText) {
      const element = page.getByText(stat);
      if (await element.isVisible().catch(() => false)) {
        foundStat = true;
        break;
      }
    }

    // Alternative: check for stat card containers
    if (!foundStat) {
      const statCards = page.locator('[class*="grid"]').locator('[class*="border"]');
      await expect(statCards.first()).toBeVisible();
    }
  });

  test('No error state', async ({ page }) => {
    // Check no error messages
    const errorIndicators = [
      page.getByText('오류가 발생했습니다'),
      page.getByText('Error'),
      page.getByText('실패'),
      page.locator('[class*="error"]'),
    ];

    for (const indicator of errorIndicators) {
      await expect(indicator).toHaveCount(0);
    }

    // Check page is not in error state (should have content)
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('Dashboard renders without uncaught exceptions', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
  });
});
