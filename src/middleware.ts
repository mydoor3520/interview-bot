import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/api/auth', '/api/webhooks'];
const STATIC_PATHS = ['/_next', '/favicon.ico', '/next.svg', '/vercel.svg', '/globe.svg', '/window.svg', '/file.svg'];

/**
 * 클라이언트 IP 추출.
 * TRUSTED_PROXY_IPS 환경변수가 설정된 경우, 해당 프록시에서 온 요청만
 * X-Forwarded-For 헤더를 신뢰합니다.
 * 설정되지 않은 경우 X-Forwarded-For를 그대로 사용합니다 (리버스 프록시 뒤에서만 사용).
 */
function getClientIp(request: NextRequest): string {
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
    return NextResponse.next();
  }

  // Protected routes - require authentication
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (!jwtSecret) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret);

    // V1 token detection -> force re-login
    if (!payload.version || payload.version !== 2 || !payload.userId) {
      const response = NextResponse.redirect(new URL('/login?reason=upgrade', request.url));
      response.cookies.set('token', '', { maxAge: 0, path: '/' });
      return response;
    }

    // V2 token -> inject user context headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId as string);
    requestHeaders.set('x-user-email', (payload.email as string) || '');
    requestHeaders.set('x-user-tier', (payload.tier as string) || 'FREE');

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch {
    // Token expired or invalid
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.set('token', '', { maxAge: 0, path: '/' });
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
