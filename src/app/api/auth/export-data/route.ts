import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionTier: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    const profile = await prisma.userProfile.findFirst({
      where: { userId: auth.user.userId },
      include: {
        skills: true,
        experiences: { orderBy: [{ orderIndex: 'asc' }, { startDate: 'desc' }] },
        targetPositions: true,
      },
    });

    const sessions = await prisma.interviewSession.findMany({
      where: { userId: auth.user.userId },
      include: {
        questions: {
          include: {
            evaluation: true,
            followUps: true,
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    const exportData = {
      exportedAt: new Date().toISOString(),
      user,
      profile,
      sessions,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="interview-bot-data-${user.id}.json"`,
      },
    });
  } catch (error) {
    console.error('Export data error:', error);
    return NextResponse.json({ error: '데이터 내보내기 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
