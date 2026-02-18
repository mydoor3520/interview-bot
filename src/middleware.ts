import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { validateOrigin } from '@/lib/auth/csrf';

const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/api/auth', '/api/webhooks', '/api/health', '/api/cron', '/api/demo', '/legal', '/pricing', '/demo', '/robots.txt', '/sitemap.xml'];
const STATIC_PATHS = ['/_next', '/favicon.ico', '/next.svg', '/vercel.svg', '/globe.svg', '/window.svg', '/file.svg'];

/**
 * 클라이언트 IP 추출.
 * TRUSTED_PROXY_IPS 환경변수가 설정된 경우, 해당 프록시에서 온 요청만
 * X-Forwarded-For 헤더를 신뢰합니다.
 * 설정되지 않은 경우 X-Forwarded-For를 그대로 사용합니다 (리버스 프록시 뒤에서만 사용).
 */
function getClientIp(request: NextRequest): string {
  // Cloudflare Tunnel sets CF-Connecting-IP to the real client IP
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  const trustedProxies = process.env.TRUSTED_PROXY_IPS;

  if (trustedProxies) {
    // 신뢰 가능한 프록시가 설정된 경우, X-Forwarded-For의 마지막(가장 오른쪽)
    // 신뢰할 수 없는 IP를 실제 클라이언트 IP로 사용
    const trusted = new Set(trustedProxies.split(',').map(s => s.trim()));
    const forwardedFor = request.headers.get('x-forwarded-for');

    if (forwardedFor) {
      const ips = forwardedFor.split(',').map(s => s.trim());
      // 오른쪽에서 왼쪽으로 순회하여 첫 번째 신뢰할 수 없는 IP를 찾음
      for (let i = ips.length - 1; i >= 0; i--) {
        if (!trusted.has(ips[i])) {
          return ips[i];
        }
      }
    }
  } else {
    // 프록시 설정 없음 - X-Forwarded-For의 첫 번째 IP 사용
    // 주의: 리버스 프록시 뒤에서만 안전합니다
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }
  }

  return request.headers.get('x-real-ip') || 'unknown';
}

function isAdminIpAllowed(ip: string): boolean {
  const allowed = process.env.ADMIN_ALLOWED_IPS;
  if (!allowed || allowed.trim() === '' || allowed.trim() === '*') return true;
  const list = allowed.split(',').map(s => s.trim());
  return list.includes(ip);
}

/** Admin API 요청 인메모리 rate limiter */
const ADMIN_RATE_LIMIT = 30; // 분당 최대 요청 수
const ADMIN_RATE_WINDOW = 60_000; // 1분
const adminRequestTimestamps: number[] = [];

function checkAdminRateLimit(): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  while (adminRequestTimestamps.length > 0 && adminRequestTimestamps[0] < now - ADMIN_RATE_WINDOW) {
    adminRequestTimestamps.shift();
  }
  if (adminRequestTimestamps.length >= ADMIN_RATE_LIMIT) {
    const oldest = adminRequestTimestamps[0];
    const retryAfter = Math.ceil((oldest + ADMIN_RATE_WINDOW - now) / 1000);
    return { allowed: false, retryAfter };
  }
  adminRequestTimestamps.push(now);
  return { allowed: true };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const jwtSecret = process.env.JWT_SECRET;

  // Skip static files
  if (STATIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // CSRF validation for state-changing requests
  if (pathname.startsWith('/api/') && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    // Skip CSRF for webhooks, crons, and initial auth endpoints
    const skipCsrf = pathname.startsWith('/api/webhooks/') ||
                     pathname.startsWith('/api/cron/') ||
                     pathname.startsWith('/api/demo/') ||
                     pathname === '/api/auth/login' ||
                     pathname === '/api/auth/signup';

    if (!skipCsrf) {
      const csrfError = validateOrigin(request);
      if (csrfError) return csrfError;
    }
  }

  // Admin route IP access control + rate limiting
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const ip = getClientIp(request);
    if (!isAdminIpAllowed(ip)) {
      return NextResponse.rewrite(new URL('/not-found', request.url));
    }

    // Admin API rate limiting
    if (pathname.startsWith('/api/admin')) {
      const rateLimit = checkAdminRateLimit();
      if (!rateLimit.allowed) {
        return NextResponse.json(
          { error: 'Admin API 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
          { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
        );
      }
    }
  }

  // Landing page is public
  if (pathname === '/') {
    return NextResponse.next();
  }

  // Skip public paths
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    // Authenticated user visiting login/signup -> redirect to dashboard
    if (pathname === '/login' || pathname === '/signup') {
      const token = request.cookies.get('token')?.value;
      if (token && jwtSecret) {
        try {
          const secret = new TextEncoder().encode(jwtSecret);
          const { payload } = await jwtVerify(token, secret);
          // Only redirect if V2 token (V1 users need to re-login)
          if (payload.version === 2 && payload.userId) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
          }
        } catch { /* Token invalid, show login page */ }
      }
    }

    // For public API paths, still inject user context if token exists
    // (needed for endpoints like resend-verification that require auth)
    if (pathname.startsWith('/api/auth/') && pathname !== '/api/auth/login' && pathname !== '/api/auth/signup') {
      const token = request.cookies.get('token')?.value;
      if (token && jwtSecret) {
        try {
          const secret = new TextEncoder().encode(jwtSecret);
          const { payload } = await jwtVerify(token, secret);
          if (payload.version === 2 && payload.userId) {
            const requestHeaders = new Headers(request.headers);
            requestHeaders.set('x-user-id', payload.userId as string);
            requestHeaders.set('x-user-email', (payload.email as string) || '');
            requestHeaders.set('x-user-tier', (payload.tier as string) || 'FREE');
            requestHeaders.set('x-user-is-admin', String((payload.isAdmin as boolean) ?? false));
            return NextResponse.next({ request: { headers: requestHeaders } });
          }
        } catch { /* Token invalid, proceed without headers */ }
      }
    }

    return NextResponse.next();
  }

  // Protected routes - require authentication
  const token = request.cookies.get('token')?.value;
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: '인증이 만료되었습니다. 다시 로그인해주세요.', code: 'SESSION_EXPIRED' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (!jwtSecret) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: '서버 인증 설정 오류', code: 'AUTH_CONFIG_ERROR' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret);

    // V1 token detection -> force re-login
    if (!payload.version || payload.version !== 2 || !payload.userId) {
      if (pathname.startsWith('/api/')) {
        const response = NextResponse.json(
          { error: '인증이 만료되었습니다. 다시 로그인해주세요.', code: 'SESSION_EXPIRED' },
          { status: 401 }
        );
        response.cookies.set('token', '', { maxAge: 0, path: '/' });
        return response;
      }
      const response = NextResponse.redirect(new URL('/login?reason=upgrade', request.url));
      response.cookies.set('token', '', { maxAge: 0, path: '/' });
      return response;
    }

    // V2 token -> inject user context headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId as string);
    requestHeaders.set('x-user-email', (payload.email as string) || '');
    requestHeaders.set('x-user-tier', (payload.tier as string) || 'FREE');

    const isAdmin = (payload.isAdmin as boolean) ?? false;
    requestHeaders.set('x-user-is-admin', String(isAdmin));

    // Admin route protection (layer 2: role check after JWT verification)
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
      const emergencyEmails = (process.env.EMERGENCY_ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
      const userEmail = payload.email as string;
      const isEmergencyAdmin = emergencyEmails.includes(userEmail);

      if (!isAdmin && !isEmergencyAdmin) {
        if (pathname.startsWith('/api/admin')) {
          return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch {
    // Token expired or invalid
    if (pathname.startsWith('/api/')) {
      const response = NextResponse.json(
        { error: '인증이 만료되었습니다. 다시 로그인해주세요.', code: 'SESSION_EXPIRED' },
        { status: 401 }
      );
      response.cookies.set('token', '', { maxAge: 0, path: '/' });
      return response;
    }
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.set('token', '', { maxAge: 0, path: '/' });
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
