import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, isV2Token } from '@/lib/auth/jwt';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { checkUserRateLimit } from '@/lib/auth/user-rate-limit';

const updateUserSchema = z.object({
  jobFunction: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(100).optional(),
});

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
        isAdmin: true,
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
        isAdmin: user.isAdmin,
      },
    });
  }

  // V1 token: no userId - reject as insecure
  return NextResponse.json(
    { error: '토큰이 만료되었습니다. 다시 로그인해주세요.' },
    { status: 401 }
  );
}

export async function PATCH(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload || !payload.authenticated || !isV2Token(payload)) {
    return NextResponse.json({ error: '토큰이 만료되었거나 유효하지 않습니다.' }, { status: 401 });
  }

  // Rate limit check: 20 requests per minute for user updates
  const rateLimit = checkUserRateLimit(payload.userId, 'user-update', 20);
  if (rateLimit) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
    );
  }

  try {
    const body = await request.json();
    const result = updateUserSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: '입력 데이터가 올바르지 않습니다.', details: result.error.issues },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: payload.userId },
      data: result.data,
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionTier: true,
        emailVerified: true,
        isAdmin: true,
        jobFunction: true,
      },
    });

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        tier: updatedUser.subscriptionTier,
        emailVerified: updatedUser.emailVerified,
        isAdmin: updatedUser.isAdmin,
        jobFunction: updatedUser.jobFunction,
      },
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
