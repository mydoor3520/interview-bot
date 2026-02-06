import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { sendPasswordResetEmail } from '@/lib/email';

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: '유효한 이메일을 입력해주세요.' },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // Always return success to prevent email enumeration
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const resetToken = randomBytes(32).toString('hex');

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: resetToken,
          passwordResetExpiry: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });

      // Send reset email (non-blocking)
      sendPasswordResetEmail(email, resetToken).catch((err) =>
        console.error('[AUTH] Failed to send password reset email:', err)
      );
    }

    return NextResponse.json({
      success: true,
      message: '비밀번호 재설정 이메일이 발송되었습니다. 이메일을 확인해주세요.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: '비밀번호 재설정 요청 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
