import { test, expect, request } from '@playwright/test';
import fs from 'fs';
import path from 'path';

function loadCookies(storageFile: string) {
  const state = JSON.parse(fs.readFileSync(path.join(process.cwd(), storageFile), 'utf-8'));
  return state.cookies || [];
}

test.describe('Payment API', () => {
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

  test('GET /api/payment/subscription should return 200 with subscription info or null', async () => {
    const response = await context.get('/api/payment/subscription');
    expect(response.status()).toBe(200);

    const data = await response.json();
    // API returns { subscription: <Subscription | null> }
    expect(data).toHaveProperty('subscription');

    if (data.subscription !== null) {
      // If subscription exists, it should have common fields
      expect(typeof data.subscription).toBe('object');
    } else {
      expect(data.subscription).toBeNull();
    }
  });
});
