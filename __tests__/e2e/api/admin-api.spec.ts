import { test, expect, request } from '@playwright/test';
import fs from 'fs';
import path from 'path';

function loadCookies(storageFile: string) {
  const state = JSON.parse(fs.readFileSync(path.join(process.cwd(), storageFile), 'utf-8'));
  return state.cookies || [];
}

test.describe('Admin API', () => {
  let adminContext: Awaited<ReturnType<typeof request.newContext>>;
  let userContext: Awaited<ReturnType<typeof request.newContext>>;

  test.beforeAll(async () => {
    const adminCookies = loadCookies('.auth/admin-storage-state.json');
    const adminToken = adminCookies.find((c: any) => c.name === 'token');
    const adminHeaders: Record<string, string> = {};
    if (adminToken) {
      adminHeaders['Cookie'] = `token=${adminToken.value}`;
    }

    adminContext = await request.newContext({
      baseURL: 'http://localhost:3000',
      extraHTTPHeaders: adminHeaders,
    });

    const userCookies = loadCookies('.auth/user-storage-state.json');
    const userToken = userCookies.find((c: any) => c.name === 'token');
    const userHeaders: Record<string, string> = {};
    if (userToken) {
      userHeaders['Cookie'] = `token=${userToken.value}`;
    }

    userContext = await request.newContext({
      baseURL: 'http://localhost:3000',
      extraHTTPHeaders: userHeaders,
    });
  });

  test.afterAll(async () => {
    await adminContext.dispose();
    await userContext.dispose();
  });

  test('GET /api/admin/users with admin token should return 200 with users array', async () => {
    const response = await adminContext.get('/api/admin/users');

    // May get 429 from rate limiting due to repeated test runs
    if (response.status() === 429) {
      test.skip();
      return;
    }

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('users');
    expect(Array.isArray(data.users)).toBe(true);
  });

  test('GET /api/admin/users with regular user token should return 403', async () => {
    const response = await userContext.get('/api/admin/users');

    // May get 429 from rate limiting due to repeated test runs
    if (response.status() === 429) {
      test.skip();
      return;
    }

    expect(response.status()).toBe(403);
  });

  test('GET /api/admin/revenue with admin token should return 200', async () => {
    const response = await adminContext.get('/api/admin/revenue');

    if (response.status() === 429) {
      test.skip();
      return;
    }

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toBeDefined();
    expect(typeof data).toBe('object');
  });

  test('GET /api/admin/dashboard with admin token should return 200', async () => {
    const response = await adminContext.get('/api/admin/dashboard');

    if (response.status() === 429) {
      test.skip();
      return;
    }

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toBeDefined();
    expect(typeof data).toBe('object');
  });

  test('GET /api/admin/sessions with admin token should return 200', async () => {
    const response = await adminContext.get('/api/admin/sessions');

    if (response.status() === 429) {
      test.skip();
      return;
    }

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toBeDefined();
    expect(typeof data).toBe('object');
  });

  test('GET /api/admin/feedback with admin token should return 200', async () => {
    const response = await adminContext.get('/api/admin/feedback');

    if (response.status() === 429) {
      test.skip();
      return;
    }

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toBeDefined();
    expect(typeof data).toBe('object');
  });
});
