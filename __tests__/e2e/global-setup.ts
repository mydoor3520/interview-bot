import { request } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';

const TEST_USER = {
  email: 'mydoor3520@naver.com',
  password: 'Wjdgh306!',
};

const ADMIN_USER = {
  email: 'admin-test@interviewbot.local',
  password: 'AdminTest123!',
};

async function loginAndSave(
  email: string,
  password: string,
  storageFile: string
) {
  const context = await request.newContext({ baseURL: BASE_URL });

  const response = await context.post('/api/auth/login', {
    data: { email, password },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(
      `Login failed for ${email}: ${response.status()} - ${body}`
    );
  }

  await context.storageState({ path: storageFile });
  await context.dispose();
}

async function globalSetup() {
  const authDir = path.join(process.cwd(), '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Login test user
  await loginAndSave(
    TEST_USER.email,
    TEST_USER.password,
    path.join(authDir, 'user-storage-state.json')
  );

  // Login admin user
  await loginAndSave(
    ADMIN_USER.email,
    ADMIN_USER.password,
    path.join(authDir, 'admin-storage-state.json')
  );
}

export default globalSetup;
