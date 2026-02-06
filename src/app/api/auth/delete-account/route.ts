import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { verifyPassword } from '@/lib/auth/password';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const deleteAccountSchema = z.object({
  password: z.string().min(1),
  confirmation: z.literal('DELETE'),
});

export async function POST(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  try {
    const body = await request.json();
    const parsed = deleteAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: '비밀번호와 "DELETE" 확인 문구가 필요합니다.' },
        { status: 400 }
      );
    }

    const { password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: auth.user.userId },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401 });
    }

    // Delete all user data in order (respecting FK constraints)
    await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
      // Delete evaluations (via questions -> sessions)
      const sessions = await tx.interviewSession.findMany({
        where: { userId: user.id },
        select: { id: true },
      });
      const sessionIds = sessions.map((s: { id: string }) => s.id);

      if (sessionIds.length > 0) {
        // Delete follow-ups and evaluations for all questions in user's sessions
        const questions = await tx.question.findMany({
          where: { sessionId: { in: sessionIds } },
          select: { id: true },
        });
        const questionIds = questions.map((q: { id: string }) => q.id);

        if (questionIds.length > 0) {
          await tx.followUp.deleteMany({ where: { questionId: { in: questionIds } } });
          await tx.evaluation.deleteMany({ where: { questionId: { in: questionIds } } });
        }

        await tx.question.deleteMany({ where: { sessionId: { in: sessionIds } } });
        await tx.interviewSession.deleteMany({ where: { userId: user.id } });
      }

      // Delete AI usage logs
      await tx.aIUsageLog.deleteMany({ where: { userId: user.id } });

      // Delete profile data (cascades to skills, experiences, positions)
      await tx.userProfile.deleteMany({ where: { userId: user.id } });

      // Delete login attempts
      await tx.loginAttempt.deleteMany({ where: { userId: user.id } });

      // Finally delete the user
      await tx.user.delete({ where: { id: user.id } });
    });

    // Clear auth cookie
    const response = NextResponse.json({
      success: true,
      message: '계정이 삭제되었습니다.',
    });
    response.cookies.set('token', '', { maxAge: 0, path: '/' });
    return response;
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json({ error: '계정 삭제 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
