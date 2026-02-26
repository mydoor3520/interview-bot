import { type Page, expect } from '@playwright/test';

// ── Test Account Credentials ──
export const TEST_USER = {
  email: 'mydoor3520@naver.com',
  password: 'Wjdgh306!',
};

export const ADMIN_USER = {
  email: 'admin-test@interviewbot.local',
  password: 'AdminTest123!',
};

// ── Shared Layout Assertions ──

/** Assert PublicNavbar is visible with expected elements */
export async function expectPublicNavbar(page: Page) {
  const nav = page.locator('nav');
  await expect(nav).toBeVisible();
  await expect(nav.getByRole('link', { name: 'InterviewBot' })).toBeVisible();
  await expect(nav.getByRole('link', { name: '요금제' })).toBeVisible();
}

/** Assert no sidebar is present */
export async function expectNoSidebar(page: Page) {
  // Sidebar has the "Interview Bot" text inside an aside or a nav with specific structure
  // We check that the sidebar container (lg:pl-64 wrapper) is NOT present
  await expect(page.locator('aside')).toHaveCount(0);
}

/** Assert regular user Sidebar is visible */
export async function expectSidebar(page: Page) {
  const sidebar = page.locator('aside');
  await expect(sidebar).toBeVisible();
  await expect(sidebar.getByText('Interview Bot')).toBeVisible();
  await expect(sidebar.getByRole('link', { name: '대시보드' })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: '면접 시작' })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: '히스토리' })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: '프로필' })).toBeVisible();
}

/** Assert AdminSidebar is visible with admin and app sections */
export async function expectAdminSidebar(page: Page) {
  const sidebar = page.locator('aside');
  await expect(sidebar).toBeVisible();
  await expect(sidebar.getByText('관리자')).toBeVisible();
  // Admin section items
  await expect(sidebar.getByRole('link', { name: '사용자 관리' })).toBeVisible();
  // App section items
  await expect(sidebar.getByText('앱')).toBeVisible();
}

/** Assert Header has user info elements */
export async function expectHeaderWithUserInfo(page: Page) {
  const header = page.locator('header');
  await expect(header).toBeVisible();
  // Tier badge
  await expect(header.locator('text=FREE').or(header.locator('text=PRO'))).toBeVisible();
}

/** Assert AdminHeader has ADMIN badge */
export async function expectAdminHeader(page: Page) {
  const header = page.locator('header');
  await expect(header).toBeVisible();
  await expect(header.getByText('ADMIN')).toBeVisible();
}
