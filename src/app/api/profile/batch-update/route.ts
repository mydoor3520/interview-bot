import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { prismaBase } from '@/lib/db/prisma';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { checkUserRateLimit } from '@/lib/auth/user-rate-limit';
import { z } from 'zod';

const experienceSchema = z.object({
  company: z.string().min(1).max(200),
  role: z.string().min(1).max(200),
  startDate: z.string().regex(/^\d{4}(-\d{2})?$/),
  endDate: z.string().regex(/^\d{4}(-\d{2})?$/).nullable(),
  description: z.string().max(2000).default(''),
  techStack: z.array(z.string().max(50)).max(20).default([]),
  achievements: z.array(z.string().max(500)).max(10).default([]),
});

const skillSchema = z.object({
  name: z.string().min(1).max(50),
  category: z.enum(['frontend', 'backend', 'devops', 'language', 'database', 'tool', 'soft', 'other']),
  proficiency: z.number().int().min(1).max(5),
  yearsUsed: z.number().int().min(0).max(30).nullable(),
});

const batchUpdateSchema = z.object({
  mode: z.enum(['merge', 'replace']),
  selfIntroduction: z.string().max(5000).optional(),
  experiences: z.array(experienceSchema).max(20).optional(),
  skills: z.array(skillSchema).max(50).optional(),
});

function parseYearMonth(dateStr: string): Date {
  if (dateStr.includes('-')) {
    const [year, month] = dateStr.split('-').map(Number);
    return new Date(year, (month || 1) - 1, 1);
  }
  return new Date(parseInt(dateStr, 10), 0, 1);
}

export async function POST(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  // Rate limit: 20 requests per minute for profile mutations
  const rateLimit = checkUserRateLimit(auth.user.userId, 'profile-mutation', 20);
  if (rateLimit) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
    );
  }

  try {
    const body = await request.json();
    const result = batchUpdateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: '입력 데이터가 올바르지 않습니다.', details: result.error.issues },
        { status: 400 }
      );
    }

    const { mode, selfIntroduction, experiences, skills } = result.data;

    // Find user profile
    const profile = await prisma.userProfile.findFirst({
      where: { userId: auth.user.userId },
      include: { skills: true, experiences: true },
    });

    if (!profile) {
      return NextResponse.json({ error: '프로필이 존재하지 않습니다. 먼저 프로필을 생성해주세요.' }, { status: 404 });
    }

    // Execute in transaction
    await prismaBase.$transaction(async (tx) => {
      // Update self introduction if provided
      if (selfIntroduction !== undefined) {
        await tx.userProfile.update({
          where: { id: profile.id },
          data: { selfIntroduction },
        });
      }

      // Handle experiences
      if (experiences && experiences.length > 0) {
        if (mode === 'replace') {
          // Delete all existing experiences
          await tx.workExperience.deleteMany({ where: { profileId: profile.id } });
        }

        // For merge mode, find existing experiences to avoid duplicates
        const existingExps = mode === 'merge' ? profile.experiences : [];

        let orderIndex = mode === 'merge' ? existingExps.length : 0;

        for (const exp of experiences) {
          // Check for duplicate in merge mode (same company + role + startDate)
          if (mode === 'merge') {
            const expStartDate = parseYearMonth(exp.startDate);
            const isDuplicate = existingExps.some(
              (existing) =>
                existing.company.toLowerCase() === exp.company.toLowerCase() &&
                existing.role.toLowerCase() === exp.role.toLowerCase() &&
                existing.startDate.getFullYear() === expStartDate.getFullYear() &&
                existing.startDate.getMonth() === expStartDate.getMonth()
            );
            if (isDuplicate) continue;
          }

          await tx.workExperience.create({
            data: {
              profileId: profile.id,
              company: exp.company,
              role: exp.role,
              startDate: parseYearMonth(exp.startDate),
              endDate: exp.endDate ? parseYearMonth(exp.endDate) : null,
              description: exp.description || null,
              techStack: exp.techStack,
              achievements: exp.achievements,
              orderIndex: orderIndex++,
            },
          });
        }
      }

      // Handle skills
      if (skills && skills.length > 0) {
        if (mode === 'replace') {
          // Delete all existing skills
          await tx.userSkill.deleteMany({ where: { profileId: profile.id } });
        }

        // For merge mode, find existing skills to avoid duplicates
        const existingSkills = mode === 'merge' ? profile.skills : [];

        for (const skill of skills) {
          // Check for duplicate in merge mode (same name, case-insensitive)
          if (mode === 'merge') {
            const isDuplicate = existingSkills.some(
              (existing) => existing.name.toLowerCase() === skill.name.toLowerCase()
            );
            if (isDuplicate) continue;
          }

          await tx.userSkill.create({
            data: {
              profileId: profile.id,
              name: skill.name,
              category: skill.category,
              proficiency: skill.proficiency,
              yearsUsed: skill.yearsUsed,
            },
          });
        }
      }
    });

    // Fetch updated profile
    const updatedProfile = await prisma.userProfile.findFirst({
      where: { userId: auth.user.userId },
      include: {
        skills: { orderBy: { createdAt: 'desc' } },
        experiences: { orderBy: [{ orderIndex: 'asc' }, { startDate: 'desc' }] },
        targetPositions: { orderBy: { createdAt: 'desc' } },
      },
    });

    return NextResponse.json({ success: true, profile: updatedProfile });
  } catch (error) {
    console.error('[batch-update] Error:', error);
    return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 });
  }
}
