import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, isV2Token } from '@/lib/auth/jwt';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload || !payload.authenticated) {
    return NextResponse.json({ error: '토큰이 만료되었거나 유효하지 않습니다.' }, { status: 401 });
  }

  // V2 token: extract userId directly from token
  if (isV2Token(payload)) {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionTier: true,
        emailVerified: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.subscriptionTier,
        emailVerified: user.emailVerified,
      },
    });
  }

  // V1 token: no userId, return first user as fallback
  const user = await prisma.user.findFirst({
    select: {
      id: true,
      email: true,
      name: true,
      subscriptionTier: true,
      emailVerified: true,
    },
  });

  if (!user) {
    return NextResponse.json({ authenticated: true, user: null });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      tier: user.subscriptionTier,
      emailVerified: user.emailVerified,
    },
  });
}
