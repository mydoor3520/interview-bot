import { test, expect } from '@playwright/test';
import { expectAdminSidebar, expectAdminHeader } from '../fixtures';

test.describe('Admin Layout', () => {
  test('AdminSidebar is visible with "관리자" badge text', async ({ page }) => {
    await page.goto('/admin');
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByText('관리자')).toBeVisible();
  });

  test('Admin nav section has required links', async ({ page }) => {
    await page.goto('/admin');
    const sidebar = page.locator('aside');

    // Admin section links - actual nav items from AdminSidebar.tsx
    // Note: "대시보드" appears in both admin and app sections, use href to disambiguate
    await expect(sidebar.locator('a[href="/admin"]').filter({ hasText: '대시보드' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: '사용자 관리' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: '매출/결제' })).toBeVisible();
  });

  test('App nav section has "앱" label and app links', async ({ page }) => {
    await page.goto('/admin');
    const sidebar = page.locator('aside');

    // App section label
    await expect(sidebar.getByText('앱')).toBeVisible();

    // App section links - use href to disambiguate from admin section
    await expect(sidebar.locator('a[href="/dashboard"]')).toBeVisible();
    await expect(sidebar.locator('a[href="/interview"]')).toBeVisible();
    await expect(sidebar.locator('a[href="/history"]')).toBeVisible();
    await expect(sidebar.locator('a[href="/profile"]')).toBeVisible();
  });

  test('AdminHeader has "ADMIN" badge (amber colored text)', async ({ page }) => {
    await page.goto('/admin');
    await expectAdminHeader(page);

    const header = page.locator('header');
    const adminBadge = header.getByText('ADMIN');
    await expect(adminBadge).toBeVisible();

    // Check for amber color class (text-amber-*)
    const classes = await adminBadge.getAttribute('class');
    expect(classes).toContain('amber');
  });

  test('AdminHeader shows ADMIN badge and page title', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const header = page.locator('header');

    // AdminHeader always shows the ADMIN badge
    const adminBadge = header.getByText('ADMIN');
    await expect(adminBadge).toBeVisible();

    // AdminHeader shows the current page title in h2
    const pageTitle = header.locator('h2');
    await expect(pageTitle).toBeVisible();
  });

  test('AdminSidebar has logout button as alternative to dropdown', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // In admin layout, user actions (logout, profile) are in the sidebar
    // since AdminHeader does not render avatar dropdown without userEmail prop
    const sidebar = page.locator('aside');
    await expect(sidebar.getByRole('button', { name: '로그아웃' })).toBeVisible();

    // Profile link is in the app section of sidebar
    await expect(sidebar.locator('a[href="/profile"]')).toBeVisible();
  });

  test('"로그아웃" button exists in sidebar', async ({ page }) => {
    await page.goto('/admin');
    const sidebar = page.locator('aside');
    await expect(sidebar.getByRole('button', { name: '로그아웃' })).toBeVisible();
  });

  test('Complete layout verification with fixtures', async ({ page }) => {
    await page.goto('/admin');
    await expectAdminSidebar(page);
    await expectAdminHeader(page);
  });
});
