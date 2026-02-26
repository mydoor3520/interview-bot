import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { sendVerificationEmail } from '@/lib/email';
import { randomBytes } from 'node:crypto';
import { checkUserRateLimit } from '@/lib/auth/user-rate-limit';

export async function POST(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  // Rate limit: 3 requests per 10 minutes
  const rateLimit = checkUserRateLimit(auth.user.userId, 'resend-verification', 3, 600_000);
  if (rateLimit) {
    return NextResponse.json(
      { error: '인증 메일 재발송 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.user.userId },
      select: { email: true, emailVerified: true },
    });

    if (!user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: '이미 인증된 이메일입니다.' }, { status: 400 });
    }

    const emailVerifyToken = randomBytes(32).toString('hex');

    await prisma.user.update({
      where: { id: auth.user.userId },
      data: {
        emailVerifyToken,
        emailVerifyTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await sendVerificationEmail(user.email, emailVerifyToken);

    return NextResponse.json({ success: true, message: '인증 메일이 재발송되었습니다.' });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: '인증 메일 발송 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
