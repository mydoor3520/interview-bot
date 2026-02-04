import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { z } from 'zod';

const experienceSchema = z.object({
  company: z.string().min(2).max(100),
  role: z.string().min(2).max(100),
  startDate: z.string().transform((s) => new Date(s)),
  endDate: z.string().transform((s) => new Date(s)).optional().nullable(),
  description: z.string().max(2000).optional(),
  techStack: z.array(z.string()).optional().default([]),
  achievements: z.array(z.string().max(500)).optional().default([]),
  orderIndex: z.number().int().min(0).optional().default(0),
});

const updateExperienceSchema = experienceSchema.partial().extend({
  id: z.string(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  const profile = await prisma.userProfile.findFirst();
  if (!profile) {
    return NextResponse.json({ error: '프로필을 먼저 생성해주세요.' }, { status: 404 });
  }

  const body = await request.json();
  const result = experienceSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: '입력 데이터가 올바르지 않습니다.', details: result.error.issues }, { status: 400 });
  }

  // Auto-set orderIndex if not provided
  if (result.data.orderIndex === 0) {
    const count = await prisma.workExperience.count({ where: { profileId: profile.id } });
    result.data.orderIndex = count;
  }

  const experience = await prisma.workExperience.create({
    data: {
      ...result.data,
      profileId: profile.id,
    },
  });

  return NextResponse.json({ experience }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  const body = await request.json();
  const result = updateExperienceSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: '입력 데이터가 올바르지 않습니다.' }, { status: 400 });
  }

  const { id, ...data } = result.data;
  const experience = await prisma.workExperience.update({
    where: { id },
    data,
  });

  return NextResponse.json({ experience });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });
  }

  await prisma.workExperience.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
