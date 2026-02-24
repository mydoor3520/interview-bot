import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, requireAdminStrict } from '@/lib/auth/require-admin';
import { prisma } from '@/lib/db/prisma';
import { logAuditEvent } from '@/lib/audit-log';
import { sendPasswordResetEmail } from '@/lib/email';
import { randomBytes } from 'node:crypto';

// GET - Detailed user view
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = requireAdmin(request);
  if (!auth.authenticated) return auth.response;

  const { userId } = await params;

  try {
    const user = await (prisma.user as any).findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        profile: true,
        _count: {
          select: {
            sessions: true,
            usageLogs: true,
            betaFeedback: true,
          },
        },
        subscription: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('User detail error:', error);
    return NextResponse.json(
      { error: '사용자 정보를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// PATCH - User actions (changeTier, suspend, unsuspend, forcePasswordReset)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireAdminStrict(request);
  if (!auth.authenticated) return auth.response;

  const { userId } = await params;

  try {
    const body = await request.json();
    const { action } = body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'changeTier': {
        const { tier } = body;
        if (!['FREE', 'PRO'].includes(tier)) {
          return NextResponse.json(
            { error: '유효하지 않은 등급입니다.' },
            { status: 400 }
          );
        }
        await prisma.user.update({
          where: { id: userId },
          data: { subscriptionTier: tier },
        });
        await logAuditEvent({
          userId: auth.user.userId,
          action: 'user.tier.changed',
          resource: 'user',
          resourceId: userId,
          details: { from: user.subscriptionTier, to: tier },
        });
        return NextResponse.json({
          success: true,
          message: `등급이 ${tier}(으)로 변경되었습니다.`,
        });
      }

      case 'suspend': {
        const { reason } = body;
        await prisma.user.update({
          where: { id: userId },
          data: { isActive: false },
        });
        await logAuditEvent({
          userId: auth.user.userId,
          action: 'user.suspended',
          resource: 'user',
          resourceId: userId,
          details: { reason: reason || '관리자에 의한 정지' },
        });
        return NextResponse.json({
          success: true,
          message: '사용자가 정지되었습니다.',
        });
      }

      case 'unsuspend': {
        await prisma.user.update({
          where: { id: userId },
          data: { isActive: true },
        });
        await logAuditEvent({
          userId: auth.user.userId,
          action: 'user.unsuspended',
          resource: 'user',
          resourceId: userId,
        });
        return NextResponse.json({
          success: true,
          message: '정지가 해제되었습니다.',
        });
      }

      case 'forcePasswordReset': {
        const token = randomBytes(32).toString('hex');
        await prisma.user.update({
          where: { id: userId },
          data: {
            passwordResetToken: token,
            passwordResetExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
        // Attempt to send email (non-blocking)
        try {
          await sendPasswordResetEmail(user.email, token);
        } catch (emailErr) {
          console.error('Failed to send reset email:', emailErr);
        }
        await logAuditEvent({
          userId: auth.user.userId,
          action: 'user.password.reset',
          resource: 'user',
          resourceId: userId,
        });
        return NextResponse.json({
          success: true,
          message: '비밀번호 초기화 토큰이 생성되었습니다.',
        });
      }

      default:
        return NextResponse.json(
          { error: '유효하지 않은 작업입니다.' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('User action error:', error);
    return NextResponse.json(
      { error: '작업 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete user (uses requireAdminStrict for DB verification)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireAdminStrict(request);
  if (!auth.authenticated) return auth.response;

  const { userId } = await params;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Prevent self-deletion
    if (userId === auth.user.userId) {
      return NextResponse.json(
        { error: '자기 자신을 삭제할 수 없습니다.' },
        { status: 400 }
      );
    }

    // Soft delete
    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date(), isActive: false },
    });

    await logAuditEvent({
      userId: auth.user.userId,
      action: 'user.deleted',
      resource: 'user',
      resourceId: userId,
      details: { email: user.email },
    });

    return NextResponse.json({
      success: true,
      message: '사용자가 삭제되었습니다.',
    });
  } catch (error) {
    console.error('User delete error:', error);
    return NextResponse.json(
      { error: '삭제 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
