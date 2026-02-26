import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth/password';
import { signTokenV2 } from '@/lib/auth/jwt';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { sendVerificationEmail } from '@/lib/email';
import { checkUserRateLimit } from '@/lib/auth/user-rate-limit';

const signupSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해주세요.'),
  password: z
    .string()
    .min(8, '비밀번호는 8자 이상이어야 합니다.')
    .max(100, '비밀번호는 100자 이하여야 합니다.'),
  name: z.string().min(1, '이름을 입력해주세요.').max(50).optional(),
  signupSource: z.string().max(500).optional(),
  aiDataConsent: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || '127.0.0.1';

    // IP-based rate limit: 5 signups per hour
    const rateLimit = checkUserRateLimit(ip, 'signup', 5, 60 * 60 * 1000);
    if (rateLimit) {
      return NextResponse.json(
        { error: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
      );
    }

    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || '입력 데이터가 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    const { email, password, name, signupSource, aiDataConsent } = parsed.data;

    // Check for existing user
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: '이미 등록된 이메일입니다.' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate email verification token
    const skipVerification = process.env.SKIP_EMAIL_VERIFICATION === 'true';
    const emailVerifyToken = skipVerification ? null : randomBytes(32).toString('hex');

    // Create User + UserProfile in transaction
    const user = await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          name: name || null,
          emailVerified: skipVerification ? true : false,
          emailVerifyToken,
          emailVerifyTokenExpiry: skipVerification ? null : new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          signupSource: signupSource || null,
          aiDataConsent: aiDataConsent ?? false,
          profile: {
            create: {
              name: name || '',
              totalYearsExp: 0,
              currentRole: '',
            },
          },
        },
      });
      return newUser;
    });

    // Send verification email (non-blocking) - skip if verification is disabled
    if (!skipVerification && emailVerifyToken) {
      sendVerificationEmail(email, emailVerifyToken).catch((err) =>
        console.error('[AUTH] Failed to send verification email:', err)
      );
    }

    // Sign JWT V2 with user identity
    const token = signTokenV2(user.id, user.email, user.subscriptionTier, false);

    const response = NextResponse.json(
      {
        success: true,
        user: { id: user.id, email: user.email },
      },
      { status: 201 }
    );

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: '회원가입 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
