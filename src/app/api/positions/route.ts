import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { z } from 'zod';
import { checkUserRateLimit } from '@/lib/auth/user-rate-limit';
import { checkPositionLimit, type TierKey } from '@/lib/feature-gate';

const positionSchema = z.object({
  company: z.string().min(1).max(100),
  position: z.string().min(1).max(100),
  jobDescription: z.string().max(10000).optional(),
  requirements: z.array(z.string().max(200)).max(20).optional().default([]),
  preferredQualifications: z.array(z.string().max(200)).max(20).optional().default([]),
  requiredExperience: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
});

export async function GET(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  try {
    const profile = await prisma.userProfile.findFirst({
      where: { userId: auth.user.userId },
    });
    if (!profile) {
      return NextResponse.json({ positions: [] });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status');
    const sort = searchParams.get('sort') || 'created';
    const order = searchParams.get('order') || 'desc';

    // Build where clause
    const where: any = { profileId: profile.id };

    if (search) {
      where.OR = [
        { company: { contains: search, mode: 'insensitive' as const } },
        { position: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    // Build orderBy clause
    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'company') {
      orderBy = { company: order };
    } else if (sort === 'deadline') {
      orderBy = { deadline: order };
    } else if (sort === 'created') {
      orderBy = { createdAt: order };
    }

    const positions = await prisma.targetPosition.findMany({
      where,
      select: {
        id: true,
        company: true,
        position: true,
        isActive: true,
        techStack: true,
        requirements: true,
        jobDescription: true,
        preferredQualifications: true,
        requiredExperience: true,
        notes: true,
        salaryRange: true,
        location: true,
        employmentType: true,
        deadline: true,
        benefits: true,
        companySize: true,
        sourceUrl: true,
        sourceSite: true,
        lastFetched: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { sessions: true, generatedQuestions: true } },
      },
      orderBy,
    });

    return NextResponse.json({ positions });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  // Rate limit check: 20 requests per minute for positions mutations
  const rateLimit = checkUserRateLimit(auth.user.userId, 'positions-mutation', 20);
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

    // Feature gate: check position limit
    const tier = (auth.user.tier || 'FREE') as TierKey;
    const positionCheck = await checkPositionLimit(profile.id, tier);
    if (!positionCheck.allowed) {
      return NextResponse.json(
        { error: positionCheck.message, code: 'POSITION_LIMIT_REACHED', upgradeUrl: '/pricing', retryable: false },
        { status: 403 }
      );
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
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  // Rate limit check: 20 requests per minute for positions mutations
  const rateLimit = checkUserRateLimit(auth.user.userId, 'positions-mutation', 20);
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
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  // Rate limit check: 20 requests per minute for positions mutations
  const rateLimit = checkUserRateLimit(auth.user.userId, 'positions-mutation', 20);
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
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  // Rate limit check: 20 requests per minute for positions mutations
  const rateLimit = checkUserRateLimit(auth.user.userId, 'positions-mutation', 20);
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

    // Verify position belongs to user's profile
    const existing = await prisma.targetPosition.findFirst({
      where: { id, profileId: profile.id },
    });
    if (!existing) {
      return NextResponse.json({ error: '포지션을 찾을 수 없습니다.' }, { status: 404 });
    }

    await prisma.targetPosition.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
