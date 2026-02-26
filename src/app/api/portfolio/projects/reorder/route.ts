import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { checkUserRateLimit } from '@/lib/auth/user-rate-limit';
import { prisma } from '@/lib/db/prisma';

export async function PUT(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  const rateLimit = checkUserRateLimit(auth.user.userId, 'portfolio-project', 10);
  if (rateLimit) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.', code: 'RATE_LIMIT_EXCEEDED' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
    );
  }

  try {
    const profile = await prisma.userProfile.findFirst({
      where: { userId: auth.user.userId },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: '프로필을 찾을 수 없습니다.' }, { status: 404 });
    }

    const body = await request.json();
    const { projectIds } = body;

    if (!Array.isArray(projectIds) || projectIds.length === 0) {
      return NextResponse.json({ error: 'projectIds 배열이 필요합니다.' }, { status: 400 });
    }

    // Validate all IDs belong to user
    const ownedProjects = await (prisma.portfolioProject as any).findMany({
      where: { profileId: profile.id },
      select: { id: true },
    });

    const ownedIds = new Set(ownedProjects.map((p: { id: string }) => p.id));
    for (const pid of projectIds) {
      if (!ownedIds.has(pid)) {
        return NextResponse.json({ error: '유효하지 않은 프로젝트 ID가 포함되어 있습니다.' }, { status: 400 });
      }
    }

    // Update orderIndex for each project
    await Promise.all(
      projectIds.map((pid: string, index: number) =>
        (prisma.portfolioProject as any).update({
          where: { id: pid },
          data: { orderIndex: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
