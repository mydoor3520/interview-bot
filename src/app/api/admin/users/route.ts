import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.authenticated) return auth.response;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const search = searchParams.get('search') || '';
  const tier = searchParams.get('tier') || '';

  const where: Record<string, unknown> = { deletedAt: null };
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (tier) {
    where.subscriptionTier = tier;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: where as any,
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionTier: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        _count: { select: { sessions: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where: where as any }),
  ]);

  return NextResponse.json({
    users,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
