import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { prisma } from '@/lib/db/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;

  try {
    const position = await prisma.targetPosition.findUnique({
      where: { id },
      include: {
        profile: { select: { userId: true } },
        generatedQuestions: { orderBy: { orderIndex: 'asc' } },
      },
    });

    if (!position || position.profile.userId !== auth.user.userId) {
      return NextResponse.json(
        { error: '포지션을 찾을 수 없습니다.', code: 'POSITION_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({ position });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
