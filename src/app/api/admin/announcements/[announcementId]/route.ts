import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { prisma } from '@/lib/db/prisma';
import { logAuditEvent } from '@/lib/audit-log';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ announcementId: string }> }
) {
  const auth = requireAdmin(request);
  if (!auth.authenticated) return auth.response;
  const { announcementId } = await params;

  try {
    const body = await request.json();
    const { title, content, target, displayType, startsAt, endsAt } = body;

    const updateData: Record<string, unknown> = {};

    if (title !== undefined) {
      if (title.length > 200) {
        return NextResponse.json(
          { error: '제목은 200자 이내여야 합니다.' },
          { status: 400 }
        );
      }
      updateData.title = title;
    }

    if (content !== undefined) {
      if (content.length > 2000) {
        return NextResponse.json(
          { error: '내용은 2000자 이내여야 합니다.' },
          { status: 400 }
        );
      }
      updateData.content = content;
    }

    if (target !== undefined) {
      const validTargets = ['ALL', 'FREE', 'PRO'];
      if (!validTargets.includes(target)) {
        return NextResponse.json(
          { error: '유효하지 않은 대상입니다.' },
          { status: 400 }
        );
      }
      updateData.target = target;
    }

    if (displayType !== undefined) {
      const validDisplayTypes = ['BANNER', 'POPUP'];
      if (!validDisplayTypes.includes(displayType)) {
        return NextResponse.json(
          { error: '유효하지 않은 표시 유형입니다.' },
          { status: 400 }
        );
      }
      updateData.displayType = displayType;
    }

    if (startsAt !== undefined) updateData.startsAt = new Date(startsAt);
    if (endsAt !== undefined) updateData.endsAt = endsAt ? new Date(endsAt) : null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: '수정할 내용이 없습니다.' },
        { status: 400 }
      );
    }

    const updated = await prisma.announcement.update({
      where: { id: announcementId },
      data: updateData,
    });

    await logAuditEvent({
      userId: auth.user.userId,
      action: 'announcement.updated',
      resource: 'announcement',
      resourceId: announcementId,
      details: { changes: Object.keys(updateData) },
    });

    return NextResponse.json({ success: true, announcement: updated });
  } catch (error) {
    console.error('Announcement update error:', error);
    return NextResponse.json(
      { error: '공지사항 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ announcementId: string }> }
) {
  const auth = requireAdmin(request);
  if (!auth.authenticated) return auth.response;
  const { announcementId } = await params;

  try {
    await prisma.announcement.update({
      where: { id: announcementId },
      data: { deletedAt: new Date() },
    });

    await logAuditEvent({
      userId: auth.user.userId,
      action: 'announcement.deleted',
      resource: 'announcement',
      resourceId: announcementId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Announcement delete error:', error);
    return NextResponse.json(
      { error: '공지사항 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
