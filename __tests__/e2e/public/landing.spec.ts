import { test, expect } from '@playwright/test';
import { expectPublicNavbar, expectNoSidebar } from '../fixtures';

test.describe('Landing Page', () => {
  test('displays PublicNavbar and no sidebar', async ({ page }) => {
    await page.goto('/');
    await expectPublicNavbar(page);
    await expectNoSidebar(page);
  });

  test('displays hero section with main headings', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('면접 준비,')).toBeVisible();
    await expect(page.getByText('AI와 함께')).toBeVisible();
  });

  test('displays features section with 4 feature cards', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('왜 InterviewBot인가요?')).toBeVisible();

    // Verify 4 feature cards by checking for their actual headings from page.tsx
    await expect(page.getByText('AI 면접관')).toBeVisible();
    await expect(page.getByText('맞춤 피드백')).toBeVisible();
    await expect(page.getByText('다양한 주제')).toBeVisible();
    await expect(page.getByText('성과 분석')).toBeVisible();
  });

  test('displays how it works section', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('이렇게 시작하세요')).toBeVisible();
  });

  test('displays CTA section with signup link', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('지금 시작하세요')).toBeVisible();
    // Two "무료로 시작하기" links exist (hero + CTA), use .last() for the CTA one
    await expect(page.getByRole('link', { name: '무료로 시작하기' }).last()).toBeVisible();
  });

  test('displays footer with legal links', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: '개인정보처리방침' })).toBeVisible();
    await expect(page.getByRole('link', { name: '이용약관' })).toBeVisible();
    await expect(page.getByRole('link', { name: '환불 정책' })).toBeVisible();
  });
});
