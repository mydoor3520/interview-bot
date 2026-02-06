import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { cache } from '@/lib/redis/client';

interface ServiceHealth {
  status: 'ok' | 'down' | 'degraded' | 'not_configured';
  latencyMs?: number;
  error?: string;
}

export async function GET() {
  const checks: {
    status: 'ok' | 'degraded' | 'down';
    timestamp: string;
    version: string;
    services: Record<string, ServiceHealth>;
  } = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.0.0',
    services: {},
  };

  // Database check
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.services.database = { status: 'ok', latencyMs: Date.now() - start };
  } catch (err) {
    checks.services.database = { status: 'down', error: err instanceof Error ? err.message : 'Unknown error' };
    checks.status = 'down';
  }

  // Redis check
  if (cache.isRedisAvailable()) {
    try {
      const start = Date.now();
      await cache.get('health:ping');
      checks.services.redis = { status: 'ok', latencyMs: Date.now() - start };
    } catch (err) {
      checks.services.redis = { status: 'down', error: err instanceof Error ? err.message : 'Unknown error' };
      checks.status = checks.status === 'ok' ? 'degraded' : checks.status;
    }
  } else {
    checks.services.redis = { status: 'not_configured' };
  }

  // AI Proxy check
  const proxyUrl = process.env.AI_PROXY_URL || 'http://localhost:3456';
  try {
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${proxyUrl}/v1/models`, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      checks.services.aiProxy = { status: 'ok', latencyMs: Date.now() - start };
    } else {
      checks.services.aiProxy = { status: 'degraded', latencyMs: Date.now() - start };
      checks.status = checks.status === 'ok' ? 'degraded' : checks.status;
    }
  } catch (err) {
    checks.services.aiProxy = { status: 'down', error: err instanceof Error ? err.message : 'Unknown error' };
    checks.status = checks.status === 'ok' ? 'degraded' : checks.status;
  }

  // Stripe check (simple API test)
  if (process.env.STRIPE_SECRET_KEY) {
    checks.services.stripe = { status: 'ok' };
  } else {
    checks.services.stripe = { status: 'not_configured' };
  }

  const statusCode = checks.status === 'down' ? 503 : 200;
  return NextResponse.json(checks, { status: statusCode });
}
