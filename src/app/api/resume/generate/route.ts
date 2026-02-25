import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { prisma } from '@/lib/db/prisma';
import { optimizeResumeForPosition } from '@/lib/resume/optimizer';
import { RATE_LIMITS } from '@/lib/resume/constants';
import { photoUrlToBase64 } from '@/lib/resume/photo-utils';
import type { TemplateType, SourceType, OutputFormat } from '@/lib/resume/types';

export async function POST(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  try {
    const tier = (auth.user.tier || 'FREE') as 'FREE' | 'PRO';

    const body = await request.json();
    const {
      targetPositionId,
      resumeEditId,
      sourceType = 'profile',
      template = 'clean-modern',
      format = 'pdf',
    } = body as {
      targetPositionId?: string;
      resumeEditId?: string;
      sourceType?: SourceType;
      template?: TemplateType;
      format?: OutputFormat;
    };

    // Validate inputs
    const validTemplates: TemplateType[] = ['clean-modern', 'professional', 'executive'];
    const validSourceTypes: SourceType[] = ['profile', 'coaching'];
    const validFormats: OutputFormat[] = ['pdf', 'docx', 'both'];

    if (!validTemplates.includes(template)) {
      return NextResponse.json({ error: '유효하지 않은 템플릿입니다.' }, { status: 400 });
    }
    if (!validSourceTypes.includes(sourceType)) {
      return NextResponse.json({ error: '유효하지 않은 소스 타입입니다.' }, { status: 400 });
    }
    if (!validFormats.includes(format)) {
      return NextResponse.json({ error: '유효하지 않은 형식입니다.' }, { status: 400 });
    }

    // Fetch profile
    const profile = await prisma.userProfile.findFirst({
      where: { userId: auth.user.userId },
      include: {
        skills: true,
        experiences: { orderBy: [{ orderIndex: 'asc' }, { startDate: 'desc' }] },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: '프로필을 먼저 작성해주세요.' }, { status: 400 });
    }

    // Rate limit: count today's documents
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayCount = await prisma.resumeDocument.count({
      where: {
        profileId: profile.id,
        createdAt: { gte: startOfDay },
      },
    });

    const dailyLimit = RATE_LIMITS.generate[tier];
    if (todayCount >= dailyLimit) {
      return NextResponse.json(
        {
          error: `오늘 이력서 생성 한도(${dailyLimit}회)를 초과했습니다. 내일 다시 시도하거나 플랜을 업그레이드하세요.`,
          code: 'DAILY_LIMIT_EXCEEDED',
          upgradeUrl: '/pricing',
        },
        { status: 429 }
      );
    }

    // Fetch target position if provided
    let targetPosition = null;
    if (targetPositionId) {
      targetPosition = await prisma.targetPosition.findFirst({
        where: { id: targetPositionId, profileId: profile.id },
      });
      if (!targetPosition) {
        return NextResponse.json({ error: '해당 포지션을 찾을 수 없습니다.' }, { status: 404 });
      }
    }

    // Fetch resume edit if provided
    let resumeEdit = null;
    if (resumeEditId) {
      resumeEdit = await prisma.resumeEdit.findFirst({
        where: { id: resumeEditId, profileId: profile.id },
      });
      if (!resumeEdit) {
        return NextResponse.json({ error: '해당 이력서 첨삭을 찾을 수 없습니다.' }, { status: 404 });
      }
    }

    // coaching sourceType requires a resumeEdit
    if (sourceType === 'coaching' && !resumeEdit) {
      return NextResponse.json(
        { error: 'coaching 소스 타입은 이력서 첨삭 결과가 필요합니다.' },
        { status: 400 }
      );
    }

    // Generate optimized resume data
    const resumeData = await optimizeResumeForPosition(
      profile,
      targetPosition,
      resumeEdit,
      sourceType
    );

    // Convert photo URL to base64 data URI for Playwright PDF rendering
    // (Playwright SSRF interceptor blocks external image URLs)
    if (resumeData.photoUrl && !resumeData.photoUrl.startsWith('data:')) {
      const base64Photo = await photoUrlToBase64(resumeData.photoUrl);
      resumeData.photoUrl = base64Photo; // undefined if fetch failed → no photo in output
    }

    // Determine applied keywords for metadata
    const appliedKeywords: string[] = targetPosition
      ? targetPosition.techStack.slice(0, 10)
      : [];

    // Save ResumeDocument with "generated" status
    const doc = await prisma.resumeDocument.create({
      data: {
        profileId: profile.id,
        targetPositionId: targetPositionId ?? null,
        resumeEditId: resumeEditId ?? null,
        template,
        sourceType,
        language: 'ko',
        appliedKeywords,
        content: resumeData as object,
        status: 'generated',
      },
    });

    return NextResponse.json({
      documentId: doc.id,
      pdf: { url: `/api/resume/download/${doc.id}?format=pdf` },
      docx: { url: `/api/resume/download/${doc.id}?format=docx` },
      previewUrl: `/api/resume/preview/${doc.id}`,
    });
  } catch (error) {
    console.error('[resume/generate] error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
