import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { z } from 'zod';
import { checkUserRateLimit } from '@/lib/auth/user-rate-limit';

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
  photoUrl: z.string().max(2048).refine((v) => {
    if (/^https?:\/\//.test(v)) return true;
    if (!v.startsWith('/uploads/')) return false;
    // Path traversal 방지
    if (v.includes('..') || v.includes('%2e') || v.includes('%2E') || v.includes('\0')) return false;
    return true;
  }, { message: '올바른 URL 또는 업로드 경로여야 합니다.' }).optional().nullable(),
});

export async function GET(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  try {
    const profile = await prisma.userProfile.findFirst({
      where: { userId: auth.user.userId },
      include: {
        skills: { orderBy: { createdAt: 'desc' } },
        experiences: { orderBy: [{ orderIndex: 'asc' }, { startDate: 'desc' }] },
        targetPositions: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!profile) {
      return NextResponse.json({ profile: null }, { status: 200 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

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
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
