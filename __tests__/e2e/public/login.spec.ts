import { test, expect } from '@playwright/test';
import { expectPublicNavbar, expectNoSidebar, TEST_USER } from '../fixtures';

test.describe('Login Page', () => {
  test('displays PublicNavbar and no sidebar', async ({ page }) => {
    await page.goto('/login');
    await expectPublicNavbar(page);
    await expectNoSidebar(page);
  });

  test('displays login form with email and password inputs', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  test('displays login button and signup link', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: '로그인' })).toBeVisible();
    await expect(page.getByRole('link', { name: '회원가입' })).toBeVisible();
  });

  test('shows error message with wrong credentials', async ({ page }) => {
    await page.goto('/login');

    await page.locator('#email').fill('wrong@example.com');
    await page.locator('#password').fill('wrongpassword');
    await page.getByRole('button', { name: '로그인' }).click();

    // Wait for error message to appear (may be auth error or rate limit error)
    await expect(
      page.getByText(/이메일 또는 비밀번호가 올바르지 않습니다|로그인에 실패했습니다|너무 많은 요청|잠시 후 다시 시도/i)
    ).toBeVisible();
  });

  test('redirects to dashboard with correct credentials', async ({ page }) => {
    await page.goto('/login');

    await page.locator('#email').fill(TEST_USER.email);
    await page.locator('#password').fill(TEST_USER.password);
    await page.getByRole('button', { name: '로그인' }).click();

    // Wait for navigation or rate limit error
    await page.waitForLoadState('networkidle');

    // May get rate limited from repeated login attempts in test suite
    const rateLimitError = page.getByText(/너무 많은 요청|잠시 후 다시 시도/);
    const isRateLimited = await rateLimitError.isVisible().catch(() => false);
    if (isRateLimited) {
      test.skip(true, 'Login rate limited from repeated test runs');
      return;
    }

    // Wait for navigation to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');
  });
});
