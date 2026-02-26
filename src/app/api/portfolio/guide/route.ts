import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { checkUserRateLimit } from '@/lib/auth/user-rate-limit';
import { checkPortfolioGuideLimit, type TierKey } from '@/lib/feature-gate';
import { prisma } from '@/lib/db/prisma';
import { createAIClient } from '@/lib/ai/client';
import { buildPortfolioGuidePrompt, parsePortfolioGuideResponse } from '@/lib/ai/portfolio-guide';
import { env } from '@/lib/env';

export async function GET(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  try {
    const profile = await prisma.userProfile.findFirst({
      where: { userId: auth.user.userId },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ guides: [] });
    }

    const { searchParams } = new URL(request.url);
    const targetPositionId = searchParams.get('targetPositionId');

    const guides = await (prisma.portfolioGuide as any).findMany({
      where: {
        profileId: profile.id,
        ...(targetPositionId ? { targetPositionId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        overallScore: true,
        overallFeedback: true,
        version: true,
        createdAt: true,
        targetPositionId: true,
        targetPosition: {
          select: { company: true, position: true },
        },
      },
    });

    return NextResponse.json({ guides });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  const rateLimit = checkUserRateLimit(auth.user.userId, 'portfolio-guide', 5);
  if (rateLimit) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.', code: 'RATE_LIMIT_EXCEEDED' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
    );
  }

  try {
    const tier = (auth.user.tier || 'FREE') as TierKey;

    // Feature gate check
    const guideLimit = await checkPortfolioGuideLimit(auth.user.userId, tier);
    if (!guideLimit.allowed) {
      return NextResponse.json(
        { error: guideLimit.message, code: 'PORTFOLIO_GUIDE_LIMIT_REACHED', upgradeUrl: '/pricing' },
        { status: 403 }
      );
    }

    const profile = await prisma.userProfile.findFirst({
      where: { userId: auth.user.userId },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: '프로필을 먼저 생성해주세요.' }, { status: 400 });
    }

    const profileId = profile.id;

    const body = await request.json();
    const { mode = 'general', targetPositionId } = body as { mode?: 'general' | 'targeted'; targetPositionId?: string };

    if (mode !== 'general' && mode !== 'targeted') {
      return NextResponse.json({ error: '유효하지 않은 모드입니다.' }, { status: 400 });
    }

    // Load full user data for AI prompt
    const [portfolioProjects, fullProfile] = await Promise.all([
      (prisma.portfolioProject as any).findMany({
        where: { profileId },
        orderBy: { orderIndex: 'asc' },
      }),
      prisma.userProfile.findFirst({
        where: { id: profileId },
        include: {
          experiences: true,
          skills: true,
        },
      }),
    ]);

    const experiences = fullProfile?.experiences ?? [];
    const hasMinimumData = portfolioProjects.length > 0 || experiences.length > 0;

    if (!hasMinimumData) {
      return NextResponse.json(
        { error: '포트폴리오 가이드를 생성하려면 프로젝트 또는 경력사항을 하나 이상 입력해주세요.' },
        { status: 400 }
      );
    }

    // If targeted mode, validate and load targetPosition
    let targetPosition = undefined;
    if (mode === 'targeted') {
      if (!targetPositionId) {
        return NextResponse.json({ error: '타겟 포지션 ID가 필요합니다.' }, { status: 400 });
      }
      const tp = await prisma.targetPosition.findFirst({
        where: { id: targetPositionId, profileId },
      });
      if (!tp) {
        return NextResponse.json({ error: '해당 포지션을 찾을 수 없습니다.' }, { status: 404 });
      }
      targetPosition = {
        company: tp.company,
        position: tp.position,
        description: tp.jobDescription || undefined,
        requirements: (tp.requirements as string[]) || [],
        preferredSkills: (tp.preferredQualifications as string[]) || [],
        techStack: (tp.techStack as string[]) || [],
      };
    }

    // Build profile context
    const profileContext = {
      name: fullProfile?.name || '',
      bio: fullProfile?.selfIntroduction || undefined,
      skills: (fullProfile?.skills || []).map((s: any) => s.name || s),
      yearsOfExperience: fullProfile?.totalYearsExp || undefined,
    };

    // Map projects
    const projectsData = portfolioProjects.map((p: any) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      role: p.role,
      teamSize: p.teamSize,
      startDate: p.startDate,
      endDate: p.endDate,
      techStack: (p.techStack as string[]) || [],
      achievements: (p.achievements as string[]) || [],
      troubleshooting: p.troubleshooting,
      category: p.category,
    }));

    // Map experiences
    const experiencesData = experiences.map((e: any) => ({
      company: e.company,
      position: e.role || e.position || '',
      startDate: e.startDate || '',
      endDate: e.endDate,
      description: e.description || '',
      techStack: (e.techStack as string[]) || [],
      achievements: (e.achievements as string[]) || [],
    }));

    // Build AI prompt
    const messages = buildPortfolioGuidePrompt(profileContext, projectsData, experiencesData, mode, targetPosition);

    // Call AI
    const aiClient = createAIClient({ endpoint: 'portfolio_guide' });
    let aiResponseText: string;
    try {
      const result = await aiClient.chat({
        model: env.AI_MODEL,
        messages,
        temperature: 0.7,
        maxTokens: 8192,
      });
      aiResponseText = result.content;
    } catch (err) {
      console.error('[PortfolioGuide] AI call failed:', err);
      return NextResponse.json(
        { error: 'AI 분석 중 오류가 발생했습니다.', code: 'AI_ERROR', retryable: true },
        { status: 500 }
      );
    }

    // Parse and validate AI response
    let validatedData;
    try {
      validatedData = parsePortfolioGuideResponse(aiResponseText);
    } catch (parseErr) {
      console.warn('[PortfolioGuide] First parse failed:', (parseErr as Error).message);

      // Retry with lower temperature
      try {
        const retryResult = await aiClient.chat({
          model: env.AI_MODEL,
          messages,
          temperature: 0.5,
          maxTokens: 8192,
        });
        validatedData = parsePortfolioGuideResponse(retryResult.content);
      } catch (retryErr) {
        console.error('[PortfolioGuide] Retry also failed:', (retryErr as Error).message);
        return NextResponse.json(
          { error: 'AI 응답을 파싱할 수 없습니다. 잠시 후 다시 시도해주세요.', code: 'AI_PARSE_FAILED', retryable: true },
          { status: 500 }
        );
      }
    }

    // Auto-increment version
    const latest = await (prisma.portfolioGuide as any).findFirst({
      where: { profileId, targetPositionId: targetPositionId ?? null },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const newVersion = (latest?.version ?? 0) + 1;

    // Save to DB
    const guide = await (prisma.portfolioGuide as any).create({
      data: {
        profileId,
        targetPositionId: targetPositionId ?? null,
        strategy: validatedData as any,
        overallScore: validatedData.projectGuides.length > 0
          ? Math.round(validatedData.projectGuides.reduce((s: number, g: any) => s + g.relevanceScore, 0) / validatedData.projectGuides.length)
          : null,
        overallFeedback: validatedData.positioning,
        version: newVersion,
      },
    });

    return NextResponse.json({
      id: guide.id,
      strategy: validatedData,
      overallScore: guide.overallScore,
      overallFeedback: guide.overallFeedback,
      version: newVersion,
      mode,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
