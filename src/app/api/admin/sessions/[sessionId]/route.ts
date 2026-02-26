import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const auth = requireAdmin(request);
  if (!auth.authenticated) return auth.response;

  const { sessionId } = await params;

  try {
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: {
        user: { select: { email: true, name: true, subscriptionTier: true } },
        questions: {
          orderBy: { orderIndex: 'asc' },
          include: {
            evaluation: true,
            followUps: { orderBy: { orderIndex: 'asc' } },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: '세션을 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Session detail error:', error);
    return NextResponse.json({ error: '세션 정보를 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
