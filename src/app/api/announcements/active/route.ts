import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  try {
    const now = new Date();
    const userTier = auth.user.tier;

    const targetFilter: ('ALL' | 'FREE' | 'PRO')[] =
      userTier === 'PRO' ? ['ALL', 'PRO'] : ['ALL', 'FREE'];

    const announcements = await prisma.announcement.findMany({
      where: {
        deletedAt: null,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
        target: { in: targetFilter },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        content: true,
        displayType: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { announcements },
      { headers: { 'Cache-Control': 'public, max-age=300' } }
    );
  } catch (error) {
    console.error('Active announcements error:', error);
    return NextResponse.json({ announcements: [] });
  }
}
