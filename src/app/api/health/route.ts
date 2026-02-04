import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  const proxyUrl = process.env.AI_PROXY_URL || 'http://localhost:3456';

  const health: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    proxy: { status: 'unknown', url: proxyUrl },
  };

  // Database check
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.database = { status: 'connected' };
  } catch (err) {
    health.database = {
      status: 'disconnected',
      error: err instanceof Error ? err.message : 'Unknown error',
    };
    health.status = 'degraded';
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${proxyUrl}/v1/models`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      health.proxy = { status: 'connected', url: proxyUrl, models: data };
    } else {
      health.proxy = { status: 'error', url: proxyUrl, statusCode: res.status };
      health.status = 'degraded';
    }
  } catch (err) {
    health.proxy = {
      status: 'disconnected',
      url: proxyUrl,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
    health.status = 'degraded';
  }

  return NextResponse.json(health);
}
