import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { prisma } from '@/lib/db/prisma';

interface SiteHealthData {
  domain: string;
  status: 'pass' | 'fail' | 'unknown';
  lastChecked: string | null;
  extractedChars?: number;
  error?: string;
  durationMs?: number;
}

export async function GET(request: NextRequest) {
  // Admin auth check
  const auth = requireAdmin(request);
  if (!auth.authenticated) return auth.response;

  try {
    // Retrieve latest health check results from AppConfig
    const config = await prisma.appConfig.findUnique({
      where: { key: 'selector-health-check' },
    });

    if (!config) {
      return NextResponse.json({
        sites: [],
        lastChecked: null,
        message: 'No health check data available. Run the cron job first.',
      });
    }

    const data = JSON.parse(config.value);

    // Handle error state
    if (data.error) {
      return NextResponse.json({
        sites: [],
        lastChecked: data.timestamp,
        error: data.error,
      });
    }

    // Transform results into admin-friendly format
    const sites: SiteHealthData[] = data.results.map((result: any) => ({
      domain: result.domain,
      status: result.status,
      lastChecked: data.timestamp,
      extractedChars: result.extractedChars,
      error: result.error,
      durationMs: result.durationMs,
    }));

    return NextResponse.json({
      sites,
      lastChecked: data.timestamp,
      summary: data.summary,
      updatedAt: config.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error('[AdminSiteHealth] Error:', (err as Error).message);
    return NextResponse.json(
      {
        error: 'Failed to retrieve site health data',
        details: (err as Error).message,
      },
      { status: 500 }
    );
  }
}
