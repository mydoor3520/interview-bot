import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuthV2(request);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { userId } = authResult.user;

    // Fetch user profile with relations
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { name: true } },
        skills: { select: { id: true } },
        experiences: { select: { id: true } },
        targetPositions: { select: { id: true } },
      },
    });

    // Calculate completeness
    const items = [
      {
        label: '이름 입력',
        completed: !!(profile?.user?.name || profile?.name),
      },
      {
        label: '스킬 3개 이상 등록',
        completed: (profile?.skills?.length ?? 0) >= 3,
      },
      {
        label: '경력 사항 등록',
        completed: (profile?.experiences?.length ?? 0) >= 1,
      },
      {
        label: '목표 포지션 등록',
        completed: (profile?.targetPositions?.length ?? 0) >= 1,
      },
      {
        label: '자기소개 작성',
        completed: !!(profile?.selfIntroduction && profile.selfIntroduction.trim().length > 0),
      },
    ];

    // Calculate percentage based on scoring rules
    const scores = [20, 25, 25, 20, 10]; // weights for each item
    const percentage = items.reduce((sum, item, idx) => {
      return sum + (item.completed ? scores[idx] : 0);
    }, 0);

    return NextResponse.json({
      percentage,
      items,
    });
  } catch (error) {
    console.error('[profile/completeness] Error:', error);
    return NextResponse.json(
      { error: '프로필 완성도를 확인할 수 없습니다.' },
      { status: 500 }
    );
  }
}
