import { request } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalSetup() {
  const authDir = path.join(process.cwd(), '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const context = await request.newContext({
    baseURL: 'http://localhost:3000',
  });

  // Authenticate by posting to the login endpoint
  const response = await context.post('/api/auth/login', {
    data: { password: 'changeme' },
  });

  if (!response.ok()) {
    throw new Error(
      `Global setup: authentication failed with status ${response.status()}`
    );
  }

  // Save the storage state (cookies) for reuse across tests
  await context.storageState({
    path: path.join(authDir, 'storage-state.json'),
  });

  await context.dispose();
}

export default globalSetup;
