import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: '인증 토큰이 필요합니다.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        emailVerifyToken: token,
        emailVerifyTokenExpiry: { gte: new Date() },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: '유효하지 않거나 만료된 인증 토큰입니다.' },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyTokenExpiry: null,
      },
    });

    return NextResponse.json({ success: true, message: '이메일이 인증되었습니다.' });
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: '이메일 인증 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
