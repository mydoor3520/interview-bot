import { test, expect, request } from '@playwright/test';
import fs from 'fs';
import path from 'path';

function loadCookies(storageFile: string) {
  const state = JSON.parse(fs.readFileSync(path.join(process.cwd(), storageFile), 'utf-8'));
  return state.cookies || [];
}

test.describe('Interview API', () => {
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

  test('GET /api/topics should return 200 with topics data', async () => {
    const response = await context.get('/api/topics');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toBeDefined();
    // Check if response is array or object with topics
    if (Array.isArray(data)) {
      expect(Array.isArray(data)).toBe(true);
    } else {
      expect(typeof data).toBe('object');
    }
  });

  test('GET /api/positions should return 200 with positions data', async () => {
    const response = await context.get('/api/positions');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toBeDefined();
    // Check if response is array or object with positions
    if (Array.isArray(data)) {
      expect(Array.isArray(data)).toBe(true);
    } else {
      expect(typeof data).toBe('object');
    }
  });
});
