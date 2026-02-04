import { test, expect } from '@playwright/test';

test.describe('Authentication flow', () => {
  test('login page shows password input', async ({ browser }) => {
    // Use a fresh context without stored auth state
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();

    await page.goto('/login');

    // Verify the login page renders with Korean UI elements
    await expect(page.getByRole('heading', { name: 'Interview Bot' })).toBeVisible();
    await expect(page.getByText('AI 모의 면접을 시작하려면 비밀번호를 입력하세요')).toBeVisible();
    await expect(page.getByLabel('비밀번호')).toBeVisible();
    await expect(page.getByPlaceholder('비밀번호를 입력하세요')).toBeVisible();
    await expect(page.getByRole('button', { name: '로그인' })).toBeVisible();

    await context.close();
  });

  test('login with wrong password shows error', async ({ browser }) => {
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();

    await page.goto('/login');

    // Fill in the wrong password
    await page.getByPlaceholder('비밀번호를 입력하세요').fill('wrong-password');
    await page.getByRole('button', { name: '로그인' }).click();

    // Wait for the error message to appear
    await expect(page.getByText('비밀번호가 올바르지 않습니다.')).toBeVisible();

    // Verify we are still on the login page
    await expect(page).toHaveURL(/\/login/);

    await context.close();
  });

  test('login with correct password redirects to dashboard', async ({ browser }) => {
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();

    await page.goto('/login');

    // Fill in the correct password
    await page.getByPlaceholder('비밀번호를 입력하세요').fill('changeme');
    await page.getByRole('button', { name: '로그인' }).click();

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 15_000 });
    await expect(page).toHaveURL(/\/dashboard/);

    await context.close();
  });

  test('logout clears session', async ({ browser }) => {
    // Start with an authenticated session
    const context = await browser.newContext({
      storageState: '.auth/storage-state.json',
    });
    const page = await context.newPage();

    // Visit the dashboard to confirm we are authenticated
    await page.goto('/dashboard');
    await page.waitForURL('**/dashboard', { timeout: 10_000 });

    // Click the logout button in the sidebar
    await page.getByRole('button', { name: '로그아웃' }).click();

    // After logout, we should be redirected to the login page
    await page.waitForURL('**/login', { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);

    // Trying to visit a protected route should redirect back to login
    await page.goto('/dashboard');
    await page.waitForURL('**/login', { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);

    await context.close();
  });
});
