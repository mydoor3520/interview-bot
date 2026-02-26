import { NextRequest, NextResponse } from 'next/server';
import { signToken, signTokenV2 } from '@/lib/auth/jwt';
import { checkRateLimit, recordLoginAttempt } from '@/lib/auth/rate-limit';
import { verifyPassword } from '@/lib/auth/password';
import { prisma } from '@/lib/db/prisma';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const loginSchema = z.object({
  // New: email + password login
  email: z.string().email().optional(),
  password: z.string().min(1),
});

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
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: '입력 데이터가 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // Route 1: Email/password login (new)
    if (email) {
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user || !user.passwordHash) {
        await recordLoginAttempt(ip, false);
        return NextResponse.json(
          { error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
          { status: 401, headers: { 'X-RateLimit-Remaining': String(remaining - 1) } }
        );
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        await recordLoginAttempt(ip, false);
        return NextResponse.json(
          { error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
          { status: 401, headers: { 'X-RateLimit-Remaining': String(remaining - 1) } }
        );
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      await recordLoginAttempt(ip, true);

      const token = signTokenV2(user.id, user.email, user.subscriptionTier, user.isAdmin);

      const response = NextResponse.json({
        success: true,
        user: { id: user.id, email: user.email, tier: user.subscriptionTier },
      });
      response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });
      return response;
    }

    // Route 2: Legacy APP_PASSWORD login (backward compatible)
    const appPassword = process.env.APP_PASSWORD;
    if (!appPassword) {
      return NextResponse.json(
        { error: '서버 설정 오류입니다.' },
        { status: 500 }
      );
    }

    const isValid = password.length === appPassword.length &&
      timingSafeEqual(Buffer.from(password), Buffer.from(appPassword));

    await recordLoginAttempt(ip, isValid);

    if (!isValid) {
      return NextResponse.json(
        { error: '비밀번호가 올바르지 않습니다.' },
        { status: 401, headers: { 'X-RateLimit-Remaining': String(remaining - 1) } }
      );
    }

    if (isValid) {
      console.warn('[AUTH] Legacy APP_PASSWORD login used. This will be deprecated.');
    }

    const token = signToken();
    const response = NextResponse.json({ success: true });
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
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
