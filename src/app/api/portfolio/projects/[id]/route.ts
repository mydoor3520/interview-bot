import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { checkUserRateLimit } from '@/lib/auth/user-rate-limit';
import { prisma } from '@/lib/db/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  try {
    const { id } = await params;

    const profile = await prisma.userProfile.findFirst({
      where: { userId: auth.user.userId },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: '프로필을 찾을 수 없습니다.' }, { status: 404 });
    }

    const project = await (prisma.portfolioProject as any).findFirst({
      where: { id, profileId: profile.id },
    });

    if (!project) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  const rateLimit = checkUserRateLimit(auth.user.userId, 'portfolio-project', 10);
  if (rateLimit) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.', code: 'RATE_LIMIT_EXCEEDED' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
    );
  }

  try {
    const { id } = await params;

    const profile = await prisma.userProfile.findFirst({
      where: { userId: auth.user.userId },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: '프로필을 찾을 수 없습니다.' }, { status: 404 });
    }

    const existing = await (prisma.portfolioProject as any).findFirst({
      where: { id, profileId: profile.id },
    });

    if (!existing) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, role, techStack, achievements, startDate, endDate, githubUrl, demoUrl, troubleshooting, teamSize, category } = body;

    // Input length validation
    if (title !== undefined && typeof title === 'string' && title.length > 200) {
      return NextResponse.json({ error: '프로젝트 제목은 200자 이하여야 합니다.' }, { status: 400 });
    }
    if (description !== undefined && typeof description === 'string' && description.length > 5000) {
      return NextResponse.json({ error: '프로젝트 설명은 5000자 이하여야 합니다.' }, { status: 400 });
    }
    if (role !== undefined && typeof role === 'string' && role.length > 200) {
      return NextResponse.json({ error: '역할은 200자 이하여야 합니다.' }, { status: 400 });
    }
    if (troubleshooting !== undefined && typeof troubleshooting === 'string' && troubleshooting.length > 5000) {
      return NextResponse.json({ error: '트러블슈팅 사례는 5000자 이하여야 합니다.' }, { status: 400 });
    }

    const validCategories = ['personal', 'work', 'opensource', 'hackathon'];

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = typeof title === 'string' ? title.trim() : title;
    if (description !== undefined) updateData.description = typeof description === 'string' ? description.trim() : description;
    if (role !== undefined) updateData.role = typeof role === 'string' ? role.trim() : role;
    if (teamSize !== undefined) updateData.teamSize = teamSize != null ? Math.min(Math.max(1, parseInt(teamSize) || 1), 1000) : null;
    if (techStack !== undefined) updateData.techStack = Array.isArray(techStack) ? techStack : [];
    if (achievements !== undefined) updateData.achievements = Array.isArray(achievements) ? achievements : [];
    if (startDate !== undefined) updateData.startDate = String(startDate);
    if (endDate !== undefined) updateData.endDate = endDate ? String(endDate) : null;
    if (troubleshooting !== undefined) updateData.troubleshooting = troubleshooting ? String(troubleshooting).trim() : null;
    if (githubUrl !== undefined) updateData.githubUrl = githubUrl || null;
    if (demoUrl !== undefined) updateData.demoUrl = demoUrl || null;
    if (category !== undefined && validCategories.includes(category)) updateData.category = category;

    const project = await (prisma.portfolioProject as any).update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ project });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  const rateLimit = checkUserRateLimit(auth.user.userId, 'portfolio-project', 10);
  if (rateLimit) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.', code: 'RATE_LIMIT_EXCEEDED' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
    );
  }

  try {
    const { id } = await params;

    const profile = await prisma.userProfile.findFirst({
      where: { userId: auth.user.userId },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: '프로필을 찾을 수 없습니다.' }, { status: 404 });
    }

    const existing = await (prisma.portfolioProject as any).findFirst({
      where: { id, profileId: profile.id },
    });

    if (!existing) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 });
    }

    await (prisma.portfolioProject as any).delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
