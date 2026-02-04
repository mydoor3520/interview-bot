import { test, expect } from '@playwright/test';

test.describe('History and navigation', () => {
  test('dashboard page loads', async ({ page }) => {
    await page.goto('/dashboard');

    const main = page.locator('main');

    // The dashboard should show the heading (scoped to main to avoid Header h2 duplicate)
    await expect(main.getByRole('heading', { name: '대시보드' })).toBeVisible({
      timeout: 15_000,
    });

    // Wait for loading to finish before checking content
    await expect(page.getByText('로딩 중...')).toBeHidden({ timeout: 15_000 }).catch(() => {});

    // It may show either stats or the "no history" empty state
    const hasStats = await main.getByText('총 세션').isVisible().catch(() => false);
    const hasEmptyState = await main.getByText('아직 면접 기록이 없습니다.').isVisible().catch(() => false);

    // One of these must be true
    expect(hasStats || hasEmptyState).toBe(true);
  });

  test('history page loads', async ({ page }) => {
    await page.goto('/history');

    const main = page.locator('main');

    // The history page heading should be visible (scoped to main)
    await expect(main.getByRole('heading', { name: '면접 기록' })).toBeVisible({
      timeout: 15_000,
    });

    // There should be a "new interview" button
    await expect(main.getByRole('button', { name: '새 면접 시작' })).toBeVisible();

    // The filter section should be visible (use label text scoped to main to avoid sidebar match)
    await expect(main.getByText('주제', { exact: true })).toBeVisible();
    await expect(main.getByText('난이도', { exact: true })).toBeVisible();

    // Wait for loading to finish
    await expect(page.getByText('로딩 중...')).toBeHidden({ timeout: 15_000 }).catch(() => {});

    // Either sessions exist or the empty state message appears
    const hasSessions = await main.locator('.bg-zinc-900.border').first().isVisible().catch(() => false);
    const hasEmptyState = await main.getByText('면접 기록이 없습니다.').isVisible().catch(() => false);

    expect(hasSessions || hasEmptyState).toBe(true);
  });

  test('topics page shows preset topics', async ({ page }) => {
    await page.goto('/topics');

    const main = page.locator('main');

    // The topics page heading should be visible (scoped to main)
    await expect(main.getByRole('heading', { name: '주제 관리' })).toBeVisible({
      timeout: 15_000,
    });

    // Wait for loading to finish
    await expect(page.getByText('로딩 중...')).toBeHidden({ timeout: 15_000 }).catch(() => {});

    // There should be a button to add custom topics
    await expect(main.getByRole('button', { name: /커스텀 주제 추가/ })).toBeVisible();

    // Verify category headings from the seeded topics are present.
    // Categories are rendered as <h2> headings in the main content.
    // Use heading role to avoid matching hidden <option> elements in the select filter.
    await expect(main.getByRole('heading', { name: 'Backend' })).toBeVisible();
    await expect(main.getByRole('heading', { name: 'Frontend' })).toBeVisible();

    // Verify some preset topic names and the "preset" badge.
    // Use topic card names from the seeded data (not category names which are in hidden <option> elements).
    await expect(main.getByText('Node.js', { exact: true }).first()).toBeVisible();
    await expect(main.getByText('프리셋').first()).toBeVisible();

    // Verify the filter controls are present
    await expect(main.getByPlaceholder('주제 이름 또는 설명으로 검색')).toBeVisible();
  });

  test('review page loads', async ({ page }) => {
    await page.goto('/review');

    const main = page.locator('main');

    // The review page heading should be visible (scoped to main)
    await expect(main.getByRole('heading', { name: '복습' })).toBeVisible({
      timeout: 15_000,
    });

    // Either there are weak questions or the empty state message
    const hasQuestions = await main.getByText('점수가 낮았던 질문들을 다시 연습해보세요.').isVisible().catch(() => false);
    const hasEmptyState = await main.getByText('복습이 필요한 질문이 없습니다.').isVisible().catch(() => false);

    expect(hasQuestions || hasEmptyState).toBe(true);
  });

  test('positions page loads', async ({ page }) => {
    await page.goto('/positions');

    const main = page.locator('main');

    // The positions page heading should be visible (scoped to main to avoid Header h2 duplicate)
    await expect(main.getByRole('heading', { name: '지원 포지션' })).toBeVisible({
      timeout: 15_000,
    });

    // Verify the descriptive text is shown
    await expect(main.getByText('지원 포지션 관리 페이지입니다.')).toBeVisible();
  });

  test('sidebar navigation works', async ({ page }) => {
    await page.goto('/dashboard');

    const main = page.locator('main');

    // Scope heading assertions to main to avoid Header h2 duplicates
    await expect(main.getByRole('heading', { name: '대시보드' })).toBeVisible({
      timeout: 15_000,
    });

    // The sidebar should be visible on desktop viewport (1280px)
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    // Verify the sidebar shows the app title
    await expect(sidebar.getByText('Interview Bot')).toBeVisible();

    // Navigate to interview page via sidebar
    await sidebar.getByRole('link', { name: '면접 시작' }).click();
    await page.waitForURL('**/interview', { timeout: 10_000 });
    await expect(main.getByRole('heading', { name: '모의 면접 설정' })).toBeVisible({
      timeout: 15_000,
    });

    // Navigate to history page via sidebar
    await sidebar.getByRole('link', { name: '히스토리' }).click();
    await page.waitForURL('**/history', { timeout: 10_000 });
    await expect(main.getByRole('heading', { name: '면접 기록' })).toBeVisible({
      timeout: 15_000,
    });

    // Navigate to topics page via sidebar
    await sidebar.getByRole('link', { name: '주제 관리' }).click();
    await page.waitForURL('**/topics', { timeout: 10_000 });
    await expect(main.getByRole('heading', { name: '주제 관리' })).toBeVisible({
      timeout: 15_000,
    });

    // Navigate to review page via sidebar
    await sidebar.getByRole('link', { name: '복습' }).click();
    await page.waitForURL('**/review', { timeout: 10_000 });
    await expect(main.getByRole('heading', { name: '복습' })).toBeVisible({
      timeout: 15_000,
    });

    // Navigate to profile page via sidebar
    await sidebar.getByRole('link', { name: '프로필' }).click();
    await page.waitForURL('**/profile**', { timeout: 10_000 });

    // Navigate to positions page via sidebar
    await sidebar.getByRole('link', { name: '지원 포지션' }).click();
    await page.waitForURL('**/positions', { timeout: 10_000 });
    await expect(main.getByRole('heading', { name: '지원 포지션' })).toBeVisible({
      timeout: 15_000,
    });

    // Navigate back to dashboard
    await sidebar.getByRole('link', { name: '대시보드' }).click();
    await page.waitForURL('**/dashboard', { timeout: 10_000 });
    await expect(main.getByRole('heading', { name: '대시보드' })).toBeVisible({
      timeout: 15_000,
    });
  });
});
