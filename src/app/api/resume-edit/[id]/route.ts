import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { prisma } from '@/lib/db/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  try {
    const { id } = await params;

    const profile = await prisma.userProfile.findFirst({
      where: { userId: auth.user.userId },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: '프로필을 찾을 수 없습니다.' }, { status: 404 });
    }

    const edit = await prisma.resumeEdit.findFirst({
      where: { id, profileId: profile.id },
      include: {
        targetPosition: {
          select: { company: true, position: true },
        },
      },
    });

    if (!edit) {
      return NextResponse.json({ error: '첨삭 결과를 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ edit });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  try {
    const { id } = await params;

    const profile = await prisma.userProfile.findFirst({
      where: { userId: auth.user.userId },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: '프로필을 찾을 수 없습니다.' }, { status: 404 });
    }

    const edit = await prisma.resumeEdit.findFirst({
      where: { id, profileId: profile.id },
    });

    if (!edit) {
      return NextResponse.json({ error: '첨삭 결과를 찾을 수 없습니다.' }, { status: 404 });
    }

    await prisma.resumeEdit.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
