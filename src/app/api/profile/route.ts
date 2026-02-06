import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { z } from 'zod';

const createProfileSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.email().optional(),
  totalYearsExp: z.number().int().min(0).max(50),
  currentRole: z.string().min(2).max(100),
  currentCompany: z.string().max(100).optional(),
});

const updateProfileSchema = createProfileSchema.partial().extend({
  selfIntroduction: z.string().max(5000).optional(),
  resumeText: z.string().max(10000).optional(),
  strengths: z.array(z.string().max(200)).max(10).optional(),
  weaknesses: z.array(z.string().max(200)).max(10).optional(),
});

export async function GET(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  const profile = await prisma.userProfile.findFirst({
    where: { userId: auth.user.userId },
    include: {
      skills: { orderBy: { createdAt: 'desc' } },
      experiences: { orderBy: { orderIndex: 'asc' } },
      targetPositions: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!profile) {
    return NextResponse.json({ profile: null }, { status: 200 });
  }

  return NextResponse.json({ profile });
}

export async function POST(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  // Check if profile already exists
  const existing = await prisma.userProfile.findFirst({
    where: { userId: auth.user.userId },
  });
  if (existing) {
    return NextResponse.json({ error: '프로필이 이미 존재합니다.' }, { status: 409 });
  }

  const body = await request.json();
  const result = createProfileSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: '입력 데이터가 올바르지 않습니다.', details: result.error.issues }, { status: 400 });
  }

  const profile = await prisma.userProfile.create({
    data: { ...result.data, userId: auth.user.userId },
    include: {
      skills: true,
      experiences: true,
      targetPositions: true,
    },
  });

  return NextResponse.json({ profile }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  const profile = await prisma.userProfile.findFirst({
    where: { userId: auth.user.userId },
  });
  if (!profile) {
    return NextResponse.json({ error: '프로필이 존재하지 않습니다.' }, { status: 404 });
  }

  const body = await request.json();
  const result = updateProfileSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: '입력 데이터가 올바르지 않습니다.', details: result.error.issues }, { status: 400 });
  }

  const updated = await prisma.userProfile.update({
    where: { id: profile.id },
    data: result.data,
    include: {
      skills: true,
      experiences: true,
      targetPositions: true,
    },
  });

  return NextResponse.json({ profile: updated });
}
