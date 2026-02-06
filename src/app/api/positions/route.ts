import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { z } from 'zod';

const positionSchema = z.object({
  company: z.string().min(1).max(100),
  position: z.string().min(1).max(100),
  jobDescription: z.string().max(10000).optional(),
  requirements: z.array(z.string().max(200)).max(20).optional().default([]),
  notes: z.string().max(2000).optional(),
});

export async function GET(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  const profile = await prisma.userProfile.findFirst({
    where: { userId: auth.user.userId },
  });
  if (!profile) {
    return NextResponse.json({ positions: [] });
  }

  const positions = await prisma.targetPosition.findMany({
    where: { profileId: profile.id },
    include: { _count: { select: { sessions: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ positions });
}

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
  const result = positionSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: '입력 데이터가 올바르지 않습니다.' }, { status: 400 });
  }

  const position = await prisma.targetPosition.create({
    data: { ...result.data, profileId: profile.id },
  });

  return NextResponse.json({ position }, { status: 201 });
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
  const { id, ...data } = body;
  if (!id) {
    return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });
  }

  const result = positionSchema.partial().safeParse(data);
  if (!result.success) {
    return NextResponse.json({ error: '입력 데이터가 올바르지 않습니다.' }, { status: 400 });
  }

  // Verify position belongs to user's profile
  const existing = await prisma.targetPosition.findFirst({
    where: { id, profileId: profile.id },
  });
  if (!existing) {
    return NextResponse.json({ error: '포지션을 찾을 수 없습니다.' }, { status: 404 });
  }

  const position = await prisma.targetPosition.update({
    where: { id },
    data: result.data,
  });

  return NextResponse.json({ position });
}

export async function PATCH(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  const profile = await prisma.userProfile.findFirst({
    where: { userId: auth.user.userId },
  });
  if (!profile) {
    return NextResponse.json({ error: '프로필을 먼저 생성해주세요.' }, { status: 404 });
  }

  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });
  }

  // Verify position belongs to user's profile
  const current = await prisma.targetPosition.findFirst({
    where: { id, profileId: profile.id },
  });
  if (!current) {
    return NextResponse.json({ error: '포지션을 찾을 수 없습니다.' }, { status: 404 });
  }

  const position = await prisma.targetPosition.update({
    where: { id },
    data: { isActive: !current.isActive },
  });

  return NextResponse.json({ position });
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

  // Verify position belongs to user's profile
  const existing = await prisma.targetPosition.findFirst({
    where: { id, profileId: profile.id },
  });
  if (!existing) {
    return NextResponse.json({ error: '포지션을 찾을 수 없습니다.' }, { status: 404 });
  }

  await prisma.targetPosition.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
