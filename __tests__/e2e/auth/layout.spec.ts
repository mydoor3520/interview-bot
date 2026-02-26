import { test, expect } from '@playwright/test';
import { expectSidebar, expectHeaderWithUserInfo } from '../fixtures';

test.describe('Authenticated Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should show Sidebar with navigation items', async ({ page }) => {
    await expectSidebar(page);

    // Verify specific nav items
    await expect(page.getByRole('link', { name: '대시보드' })).toBeVisible();
    await expect(page.getByRole('link', { name: '면접 시작' })).toBeVisible();
    await expect(page.getByRole('link', { name: '히스토리' })).toBeVisible();
    await expect(page.getByRole('link', { name: '프로필' })).toBeVisible();
  });

  test('should show logout button in Sidebar', async ({ page }) => {
    const logoutButton = page.getByRole('button', { name: /로그아웃/i });
    await expect(logoutButton).toBeVisible();
  });

  test('should show Header with page title', async ({ page }) => {
    // Header should be visible
    const header = page.locator('header').first();
    await expect(header).toBeVisible();
  });

  test('should show tier badge in Header', async ({ page }) => {
    await expectHeaderWithUserInfo(page);

    // Verify tier badge shows FREE or PRO
    const tierBadge = page.locator('text=/FREE|PRO/').first();
    await expect(tierBadge).toBeVisible();
  });

  test('should show user avatar button in Header', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // The avatar button is a w-8 h-8 rounded-full button inside header
    // It contains a single character initial. Wait for user info to load.
    const avatarButton = page.locator('header button.rounded-full');
    await expect(avatarButton).toBeVisible();
  });

  test('should show dropdown menu when avatar clicked', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Find and click avatar button (the rounded-full button in header)
    const avatarButton = page.locator('header button.rounded-full');
    await avatarButton.click();

    // Wait for dropdown to appear
    await page.waitForTimeout(300);

    // Verify dropdown items - scope to header to avoid matching sidebar links
    // The dropdown has: "프로필" (link), "결제 관리" (link), "로그아웃" (button)
    const headerArea = page.locator('header');
    await expect(headerArea.locator('a[href="/profile"]').filter({ hasText: '프로필' })).toBeVisible();
    await expect(headerArea.locator('a[href="/billing"]').filter({ hasText: '결제 관리' })).toBeVisible();
    // Logout button within dropdown (not sidebar)
    const dropdownLogout = headerArea.locator('div.absolute').getByText('로그아웃');
    await expect(dropdownLogout).toBeVisible();
  });

  test('should NOT show PublicNavbar on authenticated pages', async ({ page }) => {
    // Public navbar should not be present
    const publicNav = page.locator('nav').filter({ has: page.getByRole('link', { name: 'InterviewBot' }) });
    await expect(publicNav).not.toBeVisible();
  });
});
