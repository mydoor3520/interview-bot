import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { prisma } from '@/lib/db/prisma';

// GET /api/resume — list my resume documents
export async function GET(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  try {
    const profile = await prisma.userProfile.findFirst({
      where: { userId: auth.user.userId },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ documents: [] });
    }

    const documents = await prisma.resumeDocument.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        template: true,
        sourceType: true,
        language: true,
        appliedKeywords: true,
        status: true,
        createdAt: true,
        targetPositionId: true,
        targetPosition: {
          select: { company: true, position: true },
        },
        resumeEditId: true,
      },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('[resume GET] error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// DELETE /api/resume — delete a resume document
export async function DELETE(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  try {
    const body = await request.json();
    const { id } = body as { id?: string };

    if (!id) {
      return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });
    }

    // Fetch document and verify ownership
    const doc = await prisma.resumeDocument.findUnique({
      where: { id },
      include: { profile: { select: { userId: true } } },
    });

    if (!doc) {
      return NextResponse.json({ error: '이력서를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (doc.profile.userId !== auth.user.userId) {
      return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 });
    }

    await prisma.resumeDocument.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[resume DELETE] error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
