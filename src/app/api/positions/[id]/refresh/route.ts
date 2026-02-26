import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { checkUserRateLimit } from '@/lib/auth/user-rate-limit';
import { prisma } from '@/lib/db/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Auth
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  // 2. Rate limit: 3 refresh per minute
  const rateLimit = checkUserRateLimit(auth.user.userId, 'position-refresh', 3);
  if (rateLimit) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.', code: 'RATE_LIMIT_EXCEEDED' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
    );
  }

  try {
    const { id } = await params;

    // 3. Find position and verify ownership
    const position = await prisma.targetPosition.findFirst({
      where: {
        id,
        profile: { userId: auth.user.userId },
      },
      include: { profile: true },
    });

    if (!position) {
      return NextResponse.json(
        { error: '포지션을 찾을 수 없습니다.', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // 4. Check if sourceUrl exists
    if (!(position as any).sourceUrl) {
      return NextResponse.json(
        { error: '원본 URL이 없어 새로고침할 수 없습니다. 수동으로 입력된 포지션입니다.', code: 'NO_SOURCE_URL' },
        { status: 400 }
      );
    }

    // 5. Call the parse API internally
    // Build internal request to reuse parse logic
    const parseUrl = new URL('/api/positions/parse', request.url);
    const parseResponse = await fetch(parseUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': auth.user.userId,
        'x-user-email': auth.user.email,
        'x-user-tier': auth.user.tier || 'FREE',
      },
      body: JSON.stringify({
        url: (position as any).sourceUrl,
        forceRefresh: true,
      }),
    });

    if (!parseResponse.ok) {
      const errorData = await parseResponse.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: errorData.error || '채용 공고를 새로고침하는 중 오류가 발생했습니다.',
          code: errorData.code || 'REFRESH_FAILED',
          retryable: true,
        },
        { status: parseResponse.status }
      );
    }

    const parseData = await parseResponse.json();
    const parsed = parseData.parsed;

    if (!parsed) {
      return NextResponse.json(
        { error: '파싱 결과가 없습니다.', code: 'PARSE_EMPTY' },
        { status: 500 }
      );
    }

    // 6. Update the position with new data
    const updated = await prisma.targetPosition.update({
      where: { id },
      data: {
        company: parsed.company || position.company,
        position: parsed.position || position.position,
        jobDescription: parsed.jobDescription || position.jobDescription,
        requirements: parsed.requirements || position.requirements,
        preferredQualifications: parsed.preferredQualifications || position.preferredQualifications,
        requiredExperience: parsed.requiredExperience ?? position.requiredExperience,
        techStack: parsed.techStack || (position as any).techStack,
        salaryRange: parsed.salaryRange ?? (position as any).salaryRange,
        location: parsed.location ?? (position as any).location,
        employmentType: parsed.employmentType ?? (position as any).employmentType,
        deadline: parsed.deadline ?? (position as any).deadline,
        benefits: parsed.benefits || (position as any).benefits,
        companySize: parsed.companySize ?? (position as any).companySize,
        lastFetched: new Date(),
      } as any,
    });

    return NextResponse.json({
      position: updated,
      refreshedAt: new Date().toISOString(),
      changes: getChangeSummary(position, updated),
    });
  } catch (error) {
    console.error('[PositionRefresh] Error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// Helper to summarize what changed
function getChangeSummary(
  old: Record<string, any>,
  updated: Record<string, any>
): string[] {
  const changes: string[] = [];
  const fields: Array<{ key: string; label: string }> = [
    { key: 'company', label: '회사명' },
    { key: 'position', label: '포지션' },
    { key: 'jobDescription', label: '직무 설명' },
    { key: 'salaryRange', label: '연봉 범위' },
    { key: 'location', label: '근무지' },
    { key: 'employmentType', label: '고용 형태' },
    { key: 'deadline', label: '마감일' },
    { key: 'companySize', label: '회사 규모' },
  ];

  for (const { key, label } of fields) {
    if (JSON.stringify(old[key]) !== JSON.stringify(updated[key])) {
      changes.push(label);
    }
  }

  // Check array fields
  if (JSON.stringify(old.requirements) !== JSON.stringify(updated.requirements)) {
    changes.push('자격요건');
  }
  if (JSON.stringify(old.techStack) !== JSON.stringify(updated.techStack)) {
    changes.push('기술 스택');
  }
  if (JSON.stringify(old.benefits) !== JSON.stringify(updated.benefits)) {
    changes.push('복리후생');
  }

  return changes;
}
