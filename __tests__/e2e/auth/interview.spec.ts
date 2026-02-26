import { test, expect } from '@playwright/test';

test.describe('Interview Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/interview');
  });

  test('should load interview page successfully', async ({ page }) => {
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Verify URL
    expect(page.url()).toContain('/interview');
  });

  test('should show interview related content', async ({ page }) => {
    // Look for interview-related headings or text
    const interviewHeading = page.locator('h1, h2, h3').filter({ hasText: /모의 면접|면접/i });
    await expect(interviewHeading.first()).toBeVisible();
  });

  test('should show quick start button', async ({ page }) => {
    // Look for quick start or immediate start button
    const quickStartButton = page.getByRole('button', { name: /빠른 시작|바로 면접 시작/i });
    await expect(quickStartButton).toBeVisible();
  });

  test('should show detailed settings toggle button', async ({ page }) => {
    // Look for settings toggle button
    const settingsToggle = page.getByRole('button', { name: /상세 설정/i });
    await expect(settingsToggle).toBeVisible();
  });

  test('should expand subject selection when settings toggle clicked', async ({ page }) => {
    // Find and click settings toggle
    const settingsToggle = page.getByRole('button', { name: /상세 설정/i });
    await settingsToggle.click();

    // Wait for expansion animation
    await page.waitForTimeout(300);

    // Look for subject selection area with topic keywords
    const backendOption = page.locator('text=/Backend/i');
    const frontendOption = page.locator('text=/Frontend/i');

    const hasSubjectOptions = await backendOption.isVisible().catch(() => false) ||
                               await frontendOption.isVisible().catch(() => false);

    expect(hasSubjectOptions).toBeTruthy();
  });

  test('should show form fields in detailed settings', async ({ page }) => {
    // Click settings toggle
    const settingsToggle = page.getByRole('button', { name: /상세 설정/i });
    await settingsToggle.click();

    // Wait for expansion
    await page.waitForTimeout(300);

    // Look for common form elements (any of these)
    const hasFormElements = await page.locator('input[type="text"], select, textarea, [role="combobox"]').count() > 0;
    expect(hasFormElements).toBeTruthy();
  });

  test('should NOT show error states', async ({ page }) => {
    // Check for error indicators
    const errorBanner = page.locator('[role="alert"]').filter({ hasText: /error|오류|실패/i });
    const errorCount = await errorBanner.count();

    expect(errorCount).toBe(0);
  });
});
