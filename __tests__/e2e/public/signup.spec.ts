import { test, expect } from '@playwright/test';
import { expectPublicNavbar, expectNoSidebar } from '../fixtures';

test.describe('Signup Page', () => {
  test('displays PublicNavbar and no sidebar', async ({ page }) => {
    await page.goto('/signup');
    await expectPublicNavbar(page);
    await expectNoSidebar(page);
  });

  test('displays signup heading', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: '회원가입' })).toBeVisible();
  });

  test('displays all required form fields', async ({ page }) => {
    await page.goto('/signup');

    // Check for name field
    await expect(page.locator('input[name="name"], input[id="name"]')).toBeVisible();

    // Check for email field
    await expect(page.locator('input[type="email"], input[name="email"], input[id="email"]')).toBeVisible();

    // Check for password field
    await expect(page.locator('input[type="password"]').first()).toBeVisible();

    // Check for confirm password field (should have 2 password inputs)
    await expect(page.locator('input[type="password"]')).toHaveCount(2);
  });

  test('displays password requirements', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByText('8자 이상')).toBeVisible();
  });

  test('displays login link', async ({ page }) => {
    await page.goto('/signup');
    // The "로그인" text is a link inside "이미 계정이 있으신가요? 로그인"
    // PublicNavbar also has "로그인" link. Use .first() to avoid strict mode violation.
    await expect(page.getByRole('link', { name: '로그인' }).first()).toBeVisible();
  });
});
