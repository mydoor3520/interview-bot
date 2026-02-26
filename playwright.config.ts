import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },

  globalSetup: './__tests__/e2e/global-setup.ts',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'public',
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 720 },
        storageState: { cookies: [], origins: [] },
      },
      testMatch: '**/public/**',
    },
    {
      name: 'authenticated',
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 720 },
        storageState: '.auth/user-storage-state.json',
      },
      testMatch: '**/auth/**',
    },
    {
      name: 'api',
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 720 },
      },
      testMatch: '**/api/**',
    },
    {
      name: 'admin',
      fullyParallel: false,
      retries: 1,
      dependencies: ['api'],
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 720 },
        storageState: '.auth/admin-storage-state.json',
      },
      testMatch: '**/admin/**',
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
