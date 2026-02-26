import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { prismaBase } from '@/lib/db/prisma';
import { logAuditEvent } from '@/lib/audit-log';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ feedbackId: string }> }) {
  const auth = requireAdmin(request);
  if (!auth.authenticated) return auth.response;

  const { feedbackId } = await params;

  try {
    const body = await request.json();
    const { status, adminNote } = body;

    const validStatuses = ['open', 'in_progress', 'resolved', 'dismissed'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: '유효하지 않은 상태입니다.' }, { status: 400 });
    }

    const existing = await prismaBase.betaFeedback.findUnique({ where: { id: feedbackId } });
    if (!existing) {
      return NextResponse.json({ error: '피드백을 찾을 수 없습니다.' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (adminNote !== undefined) updateData.adminNote = adminNote;
    if (status === 'resolved') {
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = auth.user.userId;
    }

    const updated = await prismaBase.betaFeedback.update({
      where: { id: feedbackId },
      data: updateData,
    });

    await logAuditEvent({
      userId: auth.user.userId,
      action: 'feedback.status.changed',
      resource: 'betaFeedback',
      resourceId: feedbackId,
      details: { from: existing.status, to: status, adminNote },
    });

    return NextResponse.json({ success: true, feedback: updated });
  } catch (error) {
    console.error('Feedback update error:', error);
    return NextResponse.json({ error: '피드백 업데이트 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
