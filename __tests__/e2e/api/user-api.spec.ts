import { test, expect, request } from '@playwright/test';
import fs from 'fs';
import path from 'path';

function loadCookies(storageFile: string) {
  const state = JSON.parse(fs.readFileSync(path.join(process.cwd(), storageFile), 'utf-8'));
  return state.cookies || [];
}

test.describe('User API', () => {
  let context: Awaited<ReturnType<typeof request.newContext>>;

  test.beforeAll(async () => {
    const cookies = loadCookies('.auth/user-storage-state.json');
    const tokenCookie = cookies.find((c: any) => c.name === 'token');
    const headers: Record<string, string> = {};
    if (tokenCookie) {
      headers['Cookie'] = `token=${tokenCookie.value}`;
    }

    context = await request.newContext({
      baseURL: 'http://localhost:3000',
      extraHTTPHeaders: headers,
    });
  });

  test.afterAll(async () => {
    await context.dispose();
  });

  test('GET /api/usage should return 200 with usage data', async () => {
    const response = await context.get('/api/usage');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toBeDefined();
    expect(typeof data).toBe('object');
    // API returns { tier, limits: {...}, usage: { sessionsThisMonth, remainingSessions, ... } }
    expect(data).toHaveProperty('tier');
    expect(data).toHaveProperty('limits');
    expect(data).toHaveProperty('usage');
    expect(data.usage).toHaveProperty('sessionsThisMonth');
    expect(data.usage).toHaveProperty('remainingSessions');
  });

  test('GET /api/profile should return 200 with profile data', async () => {
    const response = await context.get('/api/profile');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toBeDefined();
    expect(typeof data).toBe('object');
    // API returns { profile: <object | null> }
    expect(data).toHaveProperty('profile');

    if (data.profile !== null) {
      // If profile exists, it should have common fields
      expect(typeof data.profile).toBe('object');
    } else {
      expect(data.profile).toBeNull();
    }
  });

  test('GET /api/history should return 200 with history data', async () => {
    const response = await context.get('/api/history');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toBeDefined();
    expect(typeof data).toBe('object');
    // API returns { sessions: [...], total, page, totalPages }
    expect(data).toHaveProperty('sessions');
    expect(Array.isArray(data.sessions)).toBe(true);
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('page');
    expect(data).toHaveProperty('totalPages');
  });
});
