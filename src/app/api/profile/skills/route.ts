import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { z } from 'zod';

const addSkillSchema = z.object({
  name: z.string().min(1).max(50),
  category: z.string().min(1),
  proficiency: z.number().int().min(1).max(5),
  yearsUsed: z.number().int().min(0).max(30).optional(),
});

const updateSkillSchema = z.object({
  id: z.string(),
  proficiency: z.number().int().min(1).max(5).optional(),
  yearsUsed: z.number().int().min(0).max(30).optional(),
  category: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  const profile = await prisma.userProfile.findFirst({
    where: { userId: auth.user.userId },
  });
  if (!profile) {
    return NextResponse.json({ error: '프로필을 먼저 생성해주세요.' }, { status: 404 });
  }

  const body = await request.json();
  const result = addSkillSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: '입력 데이터가 올바르지 않습니다.', details: result.error.issues }, { status: 400 });
  }

  const skill = await prisma.userSkill.create({
    data: {
      ...result.data,
      profileId: profile.id,
    },
  });

  return NextResponse.json({ skill }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  const profile = await prisma.userProfile.findFirst({
    where: { userId: auth.user.userId },
  });
  if (!profile) {
    return NextResponse.json({ error: '프로필을 먼저 생성해주세요.' }, { status: 404 });
  }

  const body = await request.json();
  const result = updateSkillSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: '입력 데이터가 올바르지 않습니다.' }, { status: 400 });
  }

  const { id, ...data } = result.data;

  // Verify skill belongs to user's profile
  const existing = await prisma.userSkill.findFirst({
    where: { id, profileId: profile.id },
  });
  if (!existing) {
    return NextResponse.json({ error: '스킬을 찾을 수 없습니다.' }, { status: 404 });
  }

  const skill = await prisma.userSkill.update({
    where: { id },
    data,
  });

  return NextResponse.json({ skill });
}

export async function DELETE(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  const profile = await prisma.userProfile.findFirst({
    where: { userId: auth.user.userId },
  });
  if (!profile) {
    return NextResponse.json({ error: '프로필을 먼저 생성해주세요.' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });
  }

  // Verify skill belongs to user's profile
  const existing = await prisma.userSkill.findFirst({
    where: { id, profileId: profile.id },
  });
  if (!existing) {
    return NextResponse.json({ error: '스킬을 찾을 수 없습니다.' }, { status: 404 });
  }

  await prisma.userSkill.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
