import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { checkUserRateLimit } from '@/lib/auth/user-rate-limit';
import { checkPortfolioProjectLimit, type TierKey } from '@/lib/feature-gate';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  try {
    const profile = await prisma.userProfile.findFirst({
      where: { userId: auth.user.userId },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ projects: [] });
    }

    const projects = await (prisma.portfolioProject as any).findMany({
      where: { profileId: profile.id },
      orderBy: { orderIndex: 'asc' },
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
    const tier = (auth.user.tier || 'FREE') as TierKey;

    // Get or create profile
    let profile = await prisma.userProfile.findFirst({
      where: { userId: auth.user.userId },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: '프로필을 먼저 생성해주세요.' }, { status: 400 });
    }

    const profileId = profile.id;

    // Feature gate check
    const projectLimit = await checkPortfolioProjectLimit(profileId, tier);
    if (!projectLimit.allowed) {
      return NextResponse.json(
        { error: projectLimit.message, code: 'PORTFOLIO_PROJECT_LIMIT_REACHED', upgradeUrl: '/pricing' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, role, techStack, achievements, startDate, endDate, githubUrl, demoUrl, troubleshooting, teamSize, category } = body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({ error: '프로젝트 제목은 필수입니다.' }, { status: 400 });
    }
    if (!description || typeof description !== 'string' || description.trim() === '') {
      return NextResponse.json({ error: '프로젝트 설명은 필수입니다.' }, { status: 400 });
    }
    if (!role || typeof role !== 'string' || role.trim() === '') {
      return NextResponse.json({ error: '담당 역할은 필수입니다.' }, { status: 400 });
    }
    if (!startDate || typeof startDate !== 'string') {
      return NextResponse.json({ error: '시작일은 필수입니다.' }, { status: 400 });
    }

    // Input length validation
    if (title.length > 200) {
      return NextResponse.json({ error: '프로젝트 제목은 200자 이하여야 합니다.' }, { status: 400 });
    }
    if (description.length > 5000) {
      return NextResponse.json({ error: '프로젝트 설명은 5000자 이하여야 합니다.' }, { status: 400 });
    }
    if (role.length > 200) {
      return NextResponse.json({ error: '역할은 200자 이하여야 합니다.' }, { status: 400 });
    }
    if (troubleshooting && typeof troubleshooting === 'string' && troubleshooting.length > 5000) {
      return NextResponse.json({ error: '트러블슈팅 사례는 5000자 이하여야 합니다.' }, { status: 400 });
    }

    const validCategories = ['personal', 'work', 'opensource', 'hackathon'];
    const validatedCategory = validCategories.includes(category) ? category : 'personal';

    const validatedTeamSize = teamSize != null ? Math.min(Math.max(1, parseInt(teamSize) || 1), 1000) : null;

    // Determine next orderIndex
    const lastProject = await (prisma.portfolioProject as any).findFirst({
      where: { profileId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });
    const nextOrderIndex = (lastProject?.orderIndex ?? -1) + 1;

    const project = await (prisma.portfolioProject as any).create({
      data: {
        profileId,
        title: title.trim(),
        description: description.trim(),
        role: role.trim(),
        teamSize: validatedTeamSize,
        techStack: Array.isArray(techStack) ? techStack : [],
        achievements: Array.isArray(achievements) ? achievements : [],
        startDate: String(startDate),
        endDate: endDate ? String(endDate) : null,
        troubleshooting: troubleshooting ? String(troubleshooting).trim() : null,
        githubUrl: githubUrl || null,
        demoUrl: demoUrl || null,
        category: validatedCategory,
        orderIndex: nextOrderIndex,
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
