import { test, expect } from '@playwright/test';

test.describe('Interview setup', () => {
  test('interview setup page loads with topics', async ({ page }) => {
    await page.goto('/interview');

    const main = page.locator('main');

    // Wait for the page to load (it fetches data from API)
    await expect(main.getByRole('heading', { name: '모의 면접 설정' })).toBeVisible({
      timeout: 15_000,
    });

    // Wait for loading to finish
    await expect(page.getByText('로딩 중...')).toBeHidden({ timeout: 15_000 }).catch(() => {});

    // Verify the main sections are present
    await expect(main.getByText('1. 지원 포지션 선택 (선택사항)')).toBeVisible();
    await expect(main.getByText('2. 면접 주제 선택')).toBeVisible();
    await expect(main.getByText('3. 난이도 선택')).toBeVisible();
    await expect(main.getByText('4. 평가 방식 선택')).toBeVisible();

    // Verify topic categories are rendered (as h3 headings in the main content)
    await expect(main.getByText('Backend', { exact: true })).toBeVisible();
    await expect(main.getByText('Frontend', { exact: true })).toBeVisible();
    await expect(main.getByText('Architecture', { exact: true })).toBeVisible();
    await expect(main.getByText('Database', { exact: true })).toBeVisible();
    await expect(main.getByText('Infrastructure', { exact: true })).toBeVisible();
    await expect(main.getByText('CS Fundamentals', { exact: true })).toBeVisible();
    await expect(main.getByText('Behavioral', { exact: true })).toBeVisible();

    // Verify some specific topic buttons exist (use exact: true to avoid substring matches)
    await expect(main.getByRole('button', { name: 'React', exact: true })).toBeVisible();
    await expect(main.getByRole('button', { name: 'Java', exact: true })).toBeVisible();
    await expect(main.getByRole('button', { name: 'Next.js', exact: true })).toBeVisible();
  });

  test('can select topics and difficulty', async ({ page }) => {
    await page.goto('/interview');

    const main = page.locator('main');

    await expect(main.getByRole('heading', { name: '모의 면접 설정' })).toBeVisible({
      timeout: 15_000,
    });

    // Wait for loading to finish
    await expect(page.getByText('로딩 중...')).toBeHidden({ timeout: 15_000 }).catch(() => {});

    // Initially, no topics selected
    await expect(main.getByText('선택된 주제: 0개')).toBeVisible();

    // Select some topics
    await main.getByRole('button', { name: 'React' }).click();
    await expect(main.getByText('선택된 주제: 1개')).toBeVisible();

    await main.getByRole('button', { name: 'Next.js' }).click();
    await expect(main.getByText('선택된 주제: 2개')).toBeVisible();

    // Deselect a topic by clicking again
    await main.getByRole('button', { name: 'React' }).click();
    await expect(main.getByText('선택된 주제: 1개')).toBeVisible();

    // Re-select React for the next assertion
    await main.getByRole('button', { name: 'React' }).click();

    // Select difficulty -- click '주니어' button within section 3
    const juniorButton = main.locator('section').filter({ hasText: '3. 난이도 선택' }).getByText('주니어');
    await juniorButton.click();

    // Verify difficulty descriptions are visible
    await expect(main.getByText('1-3년차, 기본 개념 중심')).toBeVisible();

    // Select evaluation mode
    await main.getByText('즉시 평가').click();
    await expect(main.getByText('각 답변마다 실시간 피드백')).toBeVisible();

    // The start button should be enabled now (topics selected)
    const startButton = main.getByRole('button', { name: '면접 시작하기' });
    await expect(startButton).toBeEnabled();
  });

  test('creating session navigates to chat page', async ({ page }) => {
    await page.goto('/interview');

    const main = page.locator('main');

    await expect(main.getByRole('heading', { name: '모의 면접 설정' })).toBeVisible({
      timeout: 15_000,
    });

    // Wait for loading to finish
    await expect(page.getByText('로딩 중...')).toBeHidden({ timeout: 15_000 }).catch(() => {});

    // Select a topic
    await main.getByRole('button', { name: 'React' }).click();
    await expect(main.getByText('선택된 주제: 1개')).toBeVisible();

    // Click the start button
    const startButton = main.getByRole('button', { name: '면접 시작하기' });
    await expect(startButton).toBeEnabled();
    await startButton.click();

    // Should show loading state then navigate to interview/[id] page
    // We wait for the URL to change to the interview session page
    await page.waitForURL(/\/interview\/[a-zA-Z0-9-]+/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/interview\/[a-zA-Z0-9-]+/);
  });
});
