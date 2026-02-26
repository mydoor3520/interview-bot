import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { prisma } from '@/lib/db/prisma';
import { logAuditEvent } from '@/lib/audit-log';

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.authenticated) return auth.response;

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));
  const includeDeleted = searchParams.get('includeDeleted') === 'true';

  try {
    const whereClause = includeDeleted ? {} : { deletedAt: null };

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.announcement.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      announcements,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Announcements API error:', error);
    return NextResponse.json(
      { error: '공지사항을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.authenticated) return auth.response;

  try {
    const body = await request.json();
    const { title, content, target, displayType, startsAt, endsAt } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: '제목과 내용은 필수입니다.' },
        { status: 400 }
      );
    }

    if (title.length > 200) {
      return NextResponse.json(
        { error: '제목은 200자 이내여야 합니다.' },
        { status: 400 }
      );
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { error: '내용은 2000자 이내여야 합니다.' },
        { status: 400 }
      );
    }

    const validTargets = ['ALL', 'FREE', 'PRO'];
    const validDisplayTypes = ['BANNER', 'POPUP'];

    if (target && !validTargets.includes(target)) {
      return NextResponse.json(
        { error: '유효하지 않은 대상입니다.' },
        { status: 400 }
      );
    }

    if (displayType && !validDisplayTypes.includes(displayType)) {
      return NextResponse.json(
        { error: '유효하지 않은 표시 유형입니다.' },
        { status: 400 }
      );
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        target: target || 'ALL',
        displayType: displayType || 'BANNER',
        startsAt: startsAt ? new Date(startsAt) : new Date(),
        endsAt: endsAt ? new Date(endsAt) : null,
        createdBy: auth.user.userId,
      },
    });

    await logAuditEvent({
      userId: auth.user.userId,
      action: 'announcement.created',
      resource: 'announcement',
      resourceId: announcement.id,
      details: { title, target: target || 'ALL', displayType: displayType || 'BANNER' },
    });

    return NextResponse.json({ success: true, announcement }, { status: 201 });
  } catch (error) {
    console.error('Announcement create error:', error);
    return NextResponse.json(
      { error: '공지사항 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
