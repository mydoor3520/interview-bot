import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { cache } from '@/lib/redis/client';
import { env } from '@/lib/env';
import { healthMonitor } from '@/lib/ai/health-monitor';

interface ServiceHealth {
  status: 'ok' | 'down' | 'degraded' | 'not_configured';
  latencyMs?: number;
  error?: string;
}

export async function GET(request: NextRequest) {
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

  // AI Proxy check (only when proxy is the primary provider)
  if (env.AI_PRIMARY_PROVIDER === 'proxy') {
    const proxyUrl = env.AI_PROXY_URL;
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
  } else {
    checks.services.aiProxy = { status: 'not_configured' };
  }

  // AI Provider Health (passive monitoring)
  const providerHealth = healthMonitor.getAllHealth();
  checks.services.aiProviderHealth = {
    proxy: {
      status: providerHealth.proxy.status,
      consecutiveFailures: providerHealth.proxy.consecutiveFailures,
      avgLatencyMs: Math.round(providerHealth.proxy.avgLatencyMs),
    },
    api: {
      status: providerHealth.api.status,
      consecutiveFailures: providerHealth.api.consecutiveFailures,
      avgLatencyMs: Math.round(providerHealth.api.avgLatencyMs),
    },
  } as any;

  // AI Direct API check (config-based, no active probe)
  checks.services.aiDirect = {
    status: env.ANTHROPIC_API_KEY ? 'ok' : 'not_configured',
  };

  // Stripe check (simple API test)
  if (process.env.STRIPE_SECRET_KEY) {
    checks.services.stripe = { status: 'ok' };
  } else {
    checks.services.stripe = { status: 'not_configured' };
  }

  const statusCode = checks.status === 'down' ? 503 : 200;

  // Only expose detailed info to admins
  const isAdmin = request.headers.get('x-user-is-admin') === 'true';
  if (!isAdmin) {
    return NextResponse.json(
      { status: checks.status, timestamp: checks.timestamp },
      { status: statusCode }
    );
  }

  const environment = {
    nodeEnv: process.env.NODE_ENV || 'development',
    aiModel: env.AI_MODEL,
    emailService: process.env.RESEND_API_KEY ? 'resend' : 'console',
    adminIpWhitelist: !!process.env.ADMIN_ALLOWED_IPS && process.env.ADMIN_ALLOWED_IPS !== '*',
    aiActiveProvider: env.AI_PRIMARY_PROVIDER,
    aiAnthropicKeyConfigured: !!env.ANTHROPIC_API_KEY,
  };

  return NextResponse.json({ ...checks, environment }, { status: statusCode });
}
