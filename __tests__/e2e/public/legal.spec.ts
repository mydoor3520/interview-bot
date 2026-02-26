import { test, expect } from '@playwright/test';
import { expectPublicNavbar, expectNoSidebar } from '../fixtures';

test.describe('Legal Pages', () => {
  test.describe('Privacy Policy', () => {
    test('displays PublicNavbar and no sidebar', async ({ page }) => {
      await page.goto('/legal/privacy');
      await expectPublicNavbar(page);
      await expectNoSidebar(page);
    });

    test('displays privacy policy heading and content', async ({ page }) => {
      await page.goto('/legal/privacy');
      // Use exact: true to avoid matching "9. 개인정보처리방침 변경" h2
      await expect(page.getByRole('heading', { name: '개인정보처리방침', exact: true })).toBeVisible();
      await expect(page.getByText('1. 개인정보 수집 항목')).toBeVisible();
    });
  });

  test.describe('Terms of Service', () => {
    test('displays PublicNavbar and no sidebar', async ({ page }) => {
      await page.goto('/legal/terms');
      await expectPublicNavbar(page);
      await expectNoSidebar(page);
    });

    test('displays terms heading and content', async ({ page }) => {
      await page.goto('/legal/terms');
      await expect(page.getByRole('heading', { name: '이용약관' })).toBeVisible();
      await expect(page.getByText('제1조')).toBeVisible();
    });
  });

  test.describe('Refund Policy', () => {
    test('displays PublicNavbar and no sidebar', async ({ page }) => {
      await page.goto('/legal/refund');
      await expectPublicNavbar(page);
      await expectNoSidebar(page);
    });

    test('displays refund policy heading and content', async ({ page }) => {
      await page.goto('/legal/refund');
      await expect(page.getByRole('heading', { name: '환불 정책' })).toBeVisible();
      await expect(page.getByText('1. 기본 환불 규정')).toBeVisible();
    });
  });
});
