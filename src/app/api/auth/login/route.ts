import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/auth/jwt';
import { checkRateLimit, recordLoginAttempt } from '@/lib/auth/rate-limit';
import { timingSafeEqual } from 'node:crypto';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || request.headers.get('x-real-ip') 
      || '127.0.0.1';

    // Rate limit check
    const { allowed, remaining } = await checkRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.' },
        { 
          status: 429,
          headers: { 'Retry-After': '60' },
        }
      );
    }

    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: '비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // Verify password - compare directly with APP_PASSWORD
    const appPassword = process.env.APP_PASSWORD;
    if (!appPassword) {
      return NextResponse.json(
        { error: '서버 설정 오류입니다.' },
        { status: 500 }
      );
    }

    // Timing-safe comparison to prevent timing attacks
    const isValid = password.length === appPassword.length &&
      timingSafeEqual(Buffer.from(password), Buffer.from(appPassword));

    // Record the attempt
    await recordLoginAttempt(ip, isValid);

    if (!isValid) {
      return NextResponse.json(
        { error: '비밀번호가 올바르지 않습니다.' },
        { 
          status: 401,
          headers: { 'X-RateLimit-Remaining': String(remaining - 1) },
        }
      );
    }

    // Generate JWT token
    const token = signToken();

    // Create response with httpOnly cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
