import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { checkUserRateLimit } from '@/lib/auth/user-rate-limit';
import { checkResumeEditLimit, type TierKey } from '@/lib/feature-gate';
import { prisma } from '@/lib/db/prisma';
import { createAIClient } from '@/lib/ai/client';
import { env } from '@/lib/env';
import { buildResumeEditPrompt, resumeEditResponseSchema } from '@/lib/ai/resume-editor';
import type { ProfileContext } from '@/lib/ai/types';

export async function POST(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  // Rate limit: 5/min
  const rateLimit = checkUserRateLimit(auth.user.userId, 'resume-edit', 5);
  if (rateLimit) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.', code: 'RATE_LIMIT_EXCEEDED' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
    );
  }

  try {
    const tier = (auth.user.tier || 'FREE') as TierKey;

    // Feature gate check
    const editLimit = await checkResumeEditLimit(auth.user.userId, tier);
    if (!editLimit.allowed) {
      return NextResponse.json(
        { error: editLimit.message, code: 'RESUME_EDIT_LIMIT_EXCEEDED', upgradeUrl: '/pricing' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { targetPositionId, mode = 'general' } = body as { targetPositionId?: string; mode?: 'general' | 'targeted' };

    if (mode !== 'general' && mode !== 'targeted') {
      return NextResponse.json({ error: '유효하지 않은 모드입니다.' }, { status: 400 });
    }

    // Fetch profile
    const profile = await prisma.userProfile.findFirst({
      where: { userId: auth.user.userId },
      include: {
        skills: true,
        experiences: { orderBy: { orderIndex: 'asc' } },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: '프로필을 먼저 작성해주세요.' }, { status: 400 });
    }

    // Minimum profile check
    const hasContent = profile.experiences.length > 0 || profile.selfIntroduction || profile.resumeText;
    if (!hasContent) {
      return NextResponse.json(
        { error: '이력서 첨삭을 받으려면 경력사항, 자기소개, 또는 이력서 중 하나 이상을 입력해주세요.' },
        { status: 400 }
      );
    }

    const profileId = profile.id;

    // Fetch target position if targeted mode
    let targetPosition: {
      company: string;
      position: string;
      jobDescription?: string | null;
      requirements: string[];
      preferredQualifications: string[];
      requiredExperience?: string | null;
      techStack: string[];
    } | undefined;

    if (targetPositionId) {
      const tp = await prisma.targetPosition.findFirst({
        where: { id: targetPositionId, profileId },
      });
      if (!tp) {
        return NextResponse.json({ error: '해당 포지션을 찾을 수 없습니다.' }, { status: 404 });
      }
      targetPosition = {
        company: tp.company,
        position: tp.position,
        jobDescription: tp.jobDescription,
        requirements: (tp.requirements as string[]) || [],
        preferredQualifications: (tp.preferredQualifications as string[]) || [],
        requiredExperience: tp.requiredExperience,
        techStack: (tp.techStack as string[]) || [],
      };
    }

    // Build ProfileContext (targetPosition = undefined to avoid duplication)
    const profileContext: ProfileContext = {
      name: profile.name,
      totalYearsExp: profile.totalYearsExp || 0,
      currentRole: profile.currentRole || '',
      currentCompany: profile.currentCompany || undefined,
      skills: profile.skills.map(s => ({
        name: s.name,
        category: s.category,
        proficiency: s.proficiency,
        yearsUsed: s.yearsUsed ?? undefined,
      })),
      experiences: profile.experiences.map(e => ({
        company: e.company,
        role: e.role,
        startDate: e.startDate.toISOString().split('T')[0],
        endDate: e.endDate ? e.endDate.toISOString().split('T')[0] : undefined,
        description: e.description || undefined,
        techStack: (e.techStack as string[]) || [],
        achievements: (e.achievements as string[]) || [],
      })),
      selfIntroduction: profile.selfIntroduction || undefined,
      resumeText: profile.resumeText || undefined,
      strengths: (profile.strengths as string[]) || [],
      weaknesses: (profile.weaknesses as string[]) || [],
      targetPosition: undefined,
    };

    const experiences = profile.experiences.map(e => ({
      company: e.company,
      role: e.role,
      description: e.description || undefined,
      techStack: (e.techStack as string[]) || [],
      achievements: (e.achievements as string[]) || [],
    }));

    // Build prompt
    const messages = buildResumeEditPrompt(profileContext, experiences, mode, targetPosition);

    // Call AI
    const aiClient = createAIClient({ endpoint: 'resume_edit' });

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
      console.error('[ResumeEdit] AI call failed:', err);
      return NextResponse.json(
        { error: 'AI 분석 중 오류가 발생했습니다.', code: 'AI_ERROR', retryable: true },
        { status: 500 }
      );
    }

    // Parse JSON from AI response
    let parsed: unknown;
    try {
      parsed = JSON.parse(aiResponseText);
    } catch {
      // Try extracting from markdown code block
      const match = aiResponseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        try {
          parsed = JSON.parse(match[1]);
        } catch {
          // Fall through to retry
        }
      }
      if (!parsed) {
        const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch {
            // Fall through to retry
          }
        }
      }
    }

    // Validate with Zod
    let validatedData;
    if (parsed) {
      const validation = resumeEditResponseSchema.safeParse(parsed);
      if (validation.success) {
        validatedData = validation.data;
      }
    }

    // Retry once with lower temperature if parse/validation failed
    if (!validatedData) {
      console.warn('[ResumeEdit] First attempt parse failed, retrying with temperature 0.5');
      try {
        const retryResult = await aiClient.chat({
          model: env.AI_MODEL,
          messages,
          temperature: 0.5,
          maxTokens: 8192,
        });

        let retryParsed: unknown;
        try {
          retryParsed = JSON.parse(retryResult.content);
        } catch {
          const match = retryResult.content.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (match) {
            try { retryParsed = JSON.parse(match[1]); } catch {}
          }
          if (!retryParsed) {
            const jsonMatch = retryResult.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try { retryParsed = JSON.parse(jsonMatch[0]); } catch {}
            }
          }
        }

        if (retryParsed) {
          const retryValidation = resumeEditResponseSchema.safeParse(retryParsed);
          if (retryValidation.success) {
            validatedData = retryValidation.data;
          }
        }
      } catch (retryErr) {
        console.error('[ResumeEdit] Retry AI call failed:', retryErr);
      }

      if (!validatedData) {
        return NextResponse.json(
          { error: 'AI 응답을 파싱할 수 없습니다. 잠시 후 다시 시도해주세요.', code: 'AI_PARSE_FAILED', retryable: true },
          { status: 500 }
        );
      }
    }

    // Auto-increment version
    const latest = await prisma.resumeEdit.findFirst({
      where: { profileId, targetPositionId: targetPositionId ?? null },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const newVersion = (latest?.version ?? 0) + 1;

    // Save to DB
    const resumeEdit = await prisma.resumeEdit.create({
      data: {
        profileId,
        targetPositionId: targetPositionId ?? null,
        mode,
        sections: validatedData.sections as any,
        overallScore: validatedData.overallScore,
        overallFeedback: validatedData.overallFeedback,
        keywordMatch: validatedData.keywordMatch as any ?? undefined,
        version: newVersion,
      },
    });

    return NextResponse.json({
      id: resumeEdit.id,
      ...validatedData,
      version: newVersion,
      mode,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  try {
    const profile = await prisma.userProfile.findFirst({
      where: { userId: auth.user.userId },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ edits: [] });
    }

    const { searchParams } = new URL(request.url);
    const targetPositionId = searchParams.get('targetPositionId');
    const latest = searchParams.get('latest') === 'true';

    if (latest) {
      const edit = await prisma.resumeEdit.findFirst({
        where: {
          profileId: profile.id,
          ...(targetPositionId ? { targetPositionId } : {}),
        },
        orderBy: { version: 'desc' },
      });
      return NextResponse.json({ edit: edit ?? null });
    }

    const edits = await prisma.resumeEdit.findMany({
      where: {
        profileId: profile.id,
        ...(targetPositionId ? { targetPositionId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        mode: true,
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

    return NextResponse.json({ edits });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
