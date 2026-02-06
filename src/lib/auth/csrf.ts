import { NextRequest, NextResponse } from 'next/server';

/**
 * Validates that the request origin matches the server host.
 * Returns null if valid, or a NextResponse error if invalid.
 */
export function validateOrigin(request: NextRequest): NextResponse | null {
  // Skip CSRF check for:
  // 1. GET/HEAD/OPTIONS requests (safe methods)
  // 2. Webhook routes (they use their own verification like Stripe signatures)
  // 3. Cron routes (they use CRON_SECRET)
  const method = request.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return null;

  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  // In development, allow localhost origins
  if (process.env.NODE_ENV === 'development') return null;

  // If no origin header (e.g., server-to-server), check referer
  if (!origin) {
    const referer = request.headers.get('referer');
    if (!referer) {
      return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
    }
    const refererUrl = new URL(referer);
    if (refererUrl.host !== host) {
      return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
    }
    return null;
  }

  const originUrl = new URL(origin);
  if (originUrl.host !== host) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
  }

  return null;
}
