import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { checkUserRateLimit } from '@/lib/auth/user-rate-limit';
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

    const guide = await (prisma.portfolioGuide as any).findFirst({
      where: { id, profileId: profile.id },
    });

    if (!guide) {
      return NextResponse.json({ error: '포트폴리오 가이드를 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ guide });
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

  const rateLimit = checkUserRateLimit(auth.user.userId, 'portfolio-guide', 5);
  if (rateLimit) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.', code: 'RATE_LIMIT_EXCEEDED' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
    );
  }

  try {
    const { id } = await params;

    const profile = await prisma.userProfile.findFirst({
      where: { userId: auth.user.userId },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: '프로필을 찾을 수 없습니다.' }, { status: 404 });
    }

    const existing = await (prisma.portfolioGuide as any).findFirst({
      where: { id, profileId: profile.id },
    });

    if (!existing) {
      return NextResponse.json({ error: '포트폴리오 가이드를 찾을 수 없습니다.' }, { status: 404 });
    }

    await (prisma.portfolioGuide as any).delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
