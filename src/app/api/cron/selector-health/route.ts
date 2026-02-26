import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { runHealthCheck, type SiteHealthResult } from '@/lib/health/site-health-checker';

export async function POST(request: NextRequest) {
  // Auth check (same pattern as cleanup cron)
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}` && request.headers.get('x-cron-secret') !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    // Run the health check for all 8 sites
    const results = await runHealthCheck();

    // Store results in AppConfig for admin API retrieval
    const resultsJson = JSON.stringify({
      timestamp: new Date().toISOString(),
      results,
      summary: {
        total: results.length,
        passed: results.filter((r: SiteHealthResult) => r.status === 'pass').length,
        failed: results.filter((r: SiteHealthResult) => r.status === 'fail').length,
      },
    });

    await prisma.appConfig.upsert({
      where: { key: 'selector-health-check' },
      create: {
        key: 'selector-health-check',
        value: resultsJson,
      },
      update: {
        value: resultsJson,
      },
    });

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      durationMs,
      summary: {
        total: results.length,
        passed: results.filter((r: SiteHealthResult) => r.status === 'pass').length,
        failed: results.filter((r: SiteHealthResult) => r.status === 'fail').length,
      },
      results,
    });
  } catch (err) {
    const error = (err as Error).message;
    console.error('[SelectorHealthCron] Error:', error);

    // Store error state
    await prisma.appConfig.upsert({
      where: { key: 'selector-health-check' },
      create: {
        key: 'selector-health-check',
        value: JSON.stringify({
          timestamp: new Date().toISOString(),
          error,
        }),
      },
      update: {
        value: JSON.stringify({
          timestamp: new Date().toISOString(),
          error,
        }),
      },
    });

    return NextResponse.json(
      {
        success: false,
        error,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
