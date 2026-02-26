import { test, expect, request } from '@playwright/test';
import fs from 'fs';
import path from 'path';

function loadCookies(storageFile: string) {
  const state = JSON.parse(fs.readFileSync(path.join(process.cwd(), storageFile), 'utf-8'));
  return state.cookies || [];
}

test.describe('Auth API', () => {
  test('GET /api/auth/me with user token should return 200 with user data', async () => {
    const cookies = loadCookies('.auth/user-storage-state.json');
    const tokenCookie = cookies.find((c: any) => c.name === 'token');
    const headers: Record<string, string> = {};
    if (tokenCookie) {
      headers['Cookie'] = `token=${tokenCookie.value}`;
    }

    const context = await request.newContext({
      baseURL: 'http://localhost:3000',
      extraHTTPHeaders: headers,
    });

    const response = await context.get('/api/auth/me');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('user');
    expect(data.user).toHaveProperty('id');
    expect(data.user).toHaveProperty('email');
    expect(data.user).toHaveProperty('tier');

    await context.dispose();
  });

  test('GET /api/auth/me without token should return 401', async () => {
    const context = await request.newContext({
      baseURL: 'http://localhost:3000',
    });

    const response = await context.get('/api/auth/me');
    expect(response.status()).toBe(401);

    await context.dispose();
  });

  test('POST /api/auth/login with correct credentials should return 200', async () => {
    const context = await request.newContext({
      baseURL: 'http://localhost:3000',
    });

    const response = await context.post('/api/auth/login', {
      data: {
        email: 'mydoor3520@naver.com',
        password: 'Wjdgh306!',
      },
    });

    // May get 429 from rate limiting due to repeated test runs
    if (response.status() === 429) {
      test.skip();
      return;
    }

    expect(response.status()).toBe(200);

    const data = await response.json();
    // Login API returns { success: true, user: {...} }, token is set as httpOnly cookie
    expect(data).toHaveProperty('success');
    expect(data.success).toBe(true);
    expect(data).toHaveProperty('user');

    await context.dispose();
  });

  test('POST /api/auth/login with wrong password should return 401', async () => {
    const context = await request.newContext({
      baseURL: 'http://localhost:3000',
    });

    const response = await context.post('/api/auth/login', {
      data: {
        email: 'mydoor3520@naver.com',
        password: 'WrongPassword123!',
      },
    });

    // May get 429 from rate limiting due to repeated test runs
    if (response.status() === 429) {
      test.skip();
      return;
    }

    expect(response.status()).toBe(401);

    await context.dispose();
  });

  test('GET /api/health should return 200 with status ok', async () => {
    const context = await request.newContext({
      baseURL: 'http://localhost:3000',
    });

    const response = await context.get('/api/health');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('status');
    expect(data.status).toBe('ok');

    await context.dispose();
  });
});
