import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  const subscription = await prisma.subscription.findUnique({
    where: { userId: auth.user.userId },
    include: {
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  return NextResponse.json({ subscription });
}
