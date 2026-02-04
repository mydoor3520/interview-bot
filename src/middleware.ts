import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PATHS = ['/login', '/api/auth'];
const STATIC_PATHS = ['/_next', '/favicon.ico', '/next.svg', '/vercel.svg', '/globe.svg', '/window.svg', '/file.svg'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const jwtSecret = process.env.JWT_SECRET;

  // Skip static files
  if (STATIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Skip public API routes
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    // If user is authenticated and visiting login page, redirect to dashboard
    if (pathname === '/login') {
      const token = request.cookies.get('token')?.value;
      if (token) {
        if (!jwtSecret) return NextResponse.next();
        try {
          const secret = new TextEncoder().encode(jwtSecret);
          await jwtVerify(token, secret);
          return NextResponse.redirect(new URL('/dashboard', request.url));
        } catch {
          // Token invalid, let them see login page
        }
      }
    }
    return NextResponse.next();
  }

  // Check authentication for protected routes
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (!jwtSecret) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const secret = new TextEncoder().encode(jwtSecret);
    await jwtVerify(token, secret);
    return NextResponse.next();
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
