import { test, expect } from '@playwright/test';

test.describe('Profile Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/profile');
  });

  test('should load profile page successfully', async ({ page }) => {
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Verify URL
    expect(page.url()).toContain('/profile');
  });

  test('should show profile management heading', async ({ page }) => {
    // The actual heading is "프로필 관리"
    await expect(page.getByRole('heading', { name: '프로필 관리' })).toBeVisible();
  });

  test('should show basic info section with email', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // The profile page has a "기본 정보" section with "이메일:" label
    const emailLabel = page.getByText('이메일:');
    await expect(emailLabel.first()).toBeVisible();
  });

  test('should show edit button', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // The edit button text is "편집" (not "수정")
    const editButton = page.getByRole('button', { name: '편집' });
    await expect(editButton.first()).toBeVisible();
  });

  test('should show strengths and weaknesses section', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // The section heading is "강점 & 약점" and sub-labels are "강점" and "약점"
    const sectionHeading = page.getByText('강점 & 약점');
    await expect(sectionHeading).toBeVisible();
  });

  test('should show profile information fields', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Look for common profile fields that exist in the "기본 정보" section
    // Actual labels: "이름:", "이메일:", "경력:", "직무:", "회사:"
    const nameField = page.getByText('이름:');
    const jobField = page.getByText('직무:');

    const fieldCount = await Promise.all([
      nameField.first().isVisible().catch(() => false),
      jobField.first().isVisible().catch(() => false),
    ]).then(results => results.filter(Boolean).length);

    expect(fieldCount).toBeGreaterThan(0);
  });

  test('should NOT show error states', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Check for error indicators - but not the "프로필 로딩에 실패했습니다" which is a transient error
    const errorBanner = page.locator('[role="alert"]').filter({ hasText: /error|오류|실패/i });
    const errorCount = await errorBanner.count();

    expect(errorCount).toBe(0);
  });

  test('should allow navigation to profile from sidebar', async ({ page }) => {
    // Navigate away first
    await page.goto('/dashboard');

    // Click profile link in sidebar
    const profileLink = page.getByRole('link', { name: '프로필' });
    await profileLink.click();

    // Wait for navigation
    await page.waitForURL('**/profile');

    // Verify we're on profile page
    expect(page.url()).toContain('/profile');
  });
});
