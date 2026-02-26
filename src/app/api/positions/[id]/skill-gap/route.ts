import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { prisma } from '@/lib/db/prisma';
import { analyzeSkillGap } from '@/lib/analysis/skill-gap';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  try {
    const { id } = await params;

    // Get user's profile first
    const profile = await prisma.userProfile.findFirst({
      where: { userId: auth.user.userId },
    });

    if (!profile) {
      return NextResponse.json(
        { error: '프로필을 먼저 생성해주세요.', code: 'PROFILE_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Get position with owner verification
    // Use type assertion for Prisma $extends() compatibility - new fields exist in schema
    const position = await (prisma.targetPosition as any).findFirst({
      where: {
        id,
        profileId: profile.id,
      },
    }) as { id: string; techStack: string[]; requirements: string[]; preferredQualifications: string[] } | null;

    if (!position) {
      return NextResponse.json(
        { error: '포지션을 찾을 수 없습니다.', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Get user's skills
    const skills = await prisma.userSkill.findMany({
      where: { profileId: profile.id },
    });

    const userSkills = skills.map(s => ({
      name: s.name,
      category: s.category,
      proficiency: s.proficiency,
    }));

    // Run analysis
    const analysis = analyzeSkillGap(
      userSkills,
      position.techStack || [],
      position.requirements || [],
      position.preferredQualifications || [],
    );

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('[SkillGap] Error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
