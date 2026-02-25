import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { z } from 'zod';
import { checkUserRateLimit } from '@/lib/auth/user-rate-limit';

const experienceSchema = z.object({
  company: z.string().min(2).max(100),
  role: z.string().min(2).max(100),
  startDate: z.string().transform((s) => new Date(s)),
  endDate: z.string().transform((s) => new Date(s)).optional().nullable(),
  description: z.string().max(2000).optional(),
  techStack: z.array(z.string().max(50)).max(20).optional().default([]),
  achievements: z.array(z.string().max(500)).max(10).optional().default([]),
  orderIndex: z.number().int().min(0).optional().default(0),
});

const updateExperienceSchema = experienceSchema.partial().extend({
  id: z.string(),
});

const reorderSchema = z.object({
  reorder: z.array(z.object({ id: z.string(), orderIndex: z.number().int().min(0) })).min(2).max(50),
});

export async function POST(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  // Rate limit check: 20 requests per minute for profile mutations
  const rateLimit = checkUserRateLimit(auth.user.userId, 'profile-mutation', 20);
  if (rateLimit) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
    );
  }

  try {
    const profile = await prisma.userProfile.findFirst({
      where: { userId: auth.user.userId },
    });
    if (!profile) {
      return NextResponse.json({ error: '프로필을 먼저 생성해주세요.' }, { status: 404 });
    }

    const body = await request.json();
    const result = experienceSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: '입력 데이터가 올바르지 않습니다.', details: result.error.issues }, { status: 400 });
    }

    // Auto-set orderIndex: always append to end
    const count = await prisma.workExperience.count({ where: { profileId: profile.id } });
    result.data.orderIndex = count;

    const experience = await prisma.workExperience.create({
      data: {
        ...result.data,
        profileId: profile.id,
      },
    });

    return NextResponse.json({ experience }, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  // Rate limit check: 20 requests per minute for profile mutations
  const rateLimit = checkUserRateLimit(auth.user.userId, 'profile-mutation', 20);
  if (rateLimit) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
    );
  }

  try {
    const profile = await prisma.userProfile.findFirst({
      where: { userId: auth.user.userId },
    });
    if (!profile) {
      return NextResponse.json({ error: '프로필을 먼저 생성해주세요.' }, { status: 404 });
    }

    const body = await request.json();
    const result = updateExperienceSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: '입력 데이터가 올바르지 않습니다.' }, { status: 400 });
    }

    const { id, ...data } = result.data;

    // Verify experience belongs to user's profile
    const existing = await prisma.workExperience.findFirst({
      where: { id, profileId: profile.id },
    });
    if (!existing) {
      return NextResponse.json({ error: '경력을 찾을 수 없습니다.' }, { status: 404 });
    }

    const experience = await prisma.workExperience.update({
      where: { id },
      data,
    });

    return NextResponse.json({ experience });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  // Rate limit check: 20 requests per minute for profile mutations
  const rateLimit = checkUserRateLimit(auth.user.userId, 'profile-mutation', 20);
  if (rateLimit) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
    );
  }

  try {
    const profile = await prisma.userProfile.findFirst({
      where: { userId: auth.user.userId },
    });
    if (!profile) {
      return NextResponse.json({ error: '프로필을 먼저 생성해주세요.' }, { status: 404 });
    }

    const body = await request.json();
    const result = reorderSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: '입력 데이터가 올바르지 않습니다.', details: result.error.issues }, { status: 400 });
    }

    const { reorder } = result.data;

    // Verify reorder count matches total experience count (prevent partial reorder)
    const totalCount = await prisma.workExperience.count({ where: { profileId: profile.id } });
    if (reorder.length !== totalCount) {
      return NextResponse.json(
        { error: `모든 경력을 포함해야 합니다. (전체: ${totalCount}개, 요청: ${reorder.length}개)` },
        { status: 400 }
      );
    }

    // Verify all ids belong to user's profile
    const existingIds = await prisma.workExperience.findMany({
      where: { profileId: profile.id },
      select: { id: true },
    });
    const existingIdSet = new Set(existingIds.map((e) => e.id));
    const invalidIds = reorder.filter((item) => !existingIdSet.has(item.id));
    if (invalidIds.length > 0) {
      return NextResponse.json({ error: '유효하지 않은 경력 ID가 포함되어 있습니다.' }, { status: 400 });
    }

    // Batch update all orderIndex in a transaction
    await prisma.$transaction(
      reorder.map((item) =>
        prisma.workExperience.update({
          where: { id: item.id },
          data: { orderIndex: item.orderIndex },
        })
      )
    );

    const experiences = await prisma.workExperience.findMany({
      where: { profileId: profile.id },
      orderBy: [{ orderIndex: 'asc' }, { startDate: 'desc' }],
    });

    return NextResponse.json({ experiences });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  // Rate limit check: 20 requests per minute for profile mutations
  const rateLimit = checkUserRateLimit(auth.user.userId, 'profile-mutation', 20);
  if (rateLimit) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
    );
  }

  try {
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

    // Verify experience belongs to user's profile
    const existing = await prisma.workExperience.findFirst({
      where: { id, profileId: profile.id },
    });
    if (!existing) {
      return NextResponse.json({ error: '경력을 찾을 수 없습니다.' }, { status: 404 });
    }

    await prisma.workExperience.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
