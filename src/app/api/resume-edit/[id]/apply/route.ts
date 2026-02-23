import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { prisma } from '@/lib/db/prisma';
import type { SectionFeedback, CareerItemFeedback } from '@/lib/ai/resume-editor';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const { sections: requestedSections } = body as { sections: string[] };

    if (!Array.isArray(requestedSections) || requestedSections.length === 0) {
      return NextResponse.json({ error: '적용할 섹션을 선택해주세요.' }, { status: 400 });
    }

    // Fetch profile
    const profile = await prisma.userProfile.findFirst({
      where: { userId: auth.user.userId },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: '프로필을 찾을 수 없습니다.' }, { status: 404 });
    }

    // Fetch resume edit with ownership check
    const edit = await prisma.resumeEdit.findFirst({
      where: { id, profileId: profile.id },
    });

    if (!edit) {
      return NextResponse.json({ error: '첨삭 결과를 찾을 수 없습니다.' }, { status: 404 });
    }

    const feedbackSections = edit.sections as unknown as SectionFeedback[];
    const appliedSections: string[] = [];
    const skippedSections: string[] = [];
    const warnings: string[] = [];

    for (const sectionName of requestedSections) {
      const feedback = feedbackSections.find(s => s.section === sectionName);
      if (!feedback) {
        skippedSections.push(sectionName);
        continue;
      }

      switch (sectionName) {
        case 'selfIntro': {
          if (feedback.improvedText) {
            await prisma.userProfile.update({
              where: { id: profile.id },
              data: { selfIntroduction: feedback.improvedText },
            });
            appliedSections.push('selfIntro');
          } else {
            skippedSections.push('selfIntro');
          }
          break;
        }

        case 'resume': {
          if (feedback.improvedText) {
            await prisma.userProfile.update({
              where: { id: profile.id },
              data: { resumeText: feedback.improvedText },
            });
            appliedSections.push('resume');
          } else {
            skippedSections.push('resume');
          }
          break;
        }

        case 'strengths': {
          if (feedback.improvedList && feedback.improvedList.length > 0) {
            await prisma.userProfile.update({
              where: { id: profile.id },
              data: { strengths: feedback.improvedList },
            });
            appliedSections.push('strengths');
          } else {
            skippedSections.push('strengths');
          }
          break;
        }

        case 'weaknesses': {
          if (feedback.improvedList && feedback.improvedList.length > 0) {
            await prisma.userProfile.update({
              where: { id: profile.id },
              data: { weaknesses: feedback.improvedList },
            });
            appliedSections.push('weaknesses');
          } else {
            skippedSections.push('weaknesses');
          }
          break;
        }

        case 'career': {
          if (!feedback.careerItems || feedback.careerItems.length === 0) {
            skippedSections.push('career');
            break;
          }

          // Fetch experiences ordered by orderIndex to match by array index
          const experiences = await prisma.workExperience.findMany({
            where: { profileId: profile.id },
            orderBy: { orderIndex: 'asc' },
          });

          let careerApplied = false;
          for (const item of feedback.careerItems as CareerItemFeedback[]) {
            const exp = experiences[item.careerIndex];
            if (!exp) {
              warnings.push(`경력 [${item.careerIndex}] ${item.company}: 해당 인덱스의 경력을 찾을 수 없습니다.`);
              continue;
            }

            // Double-check company name matches
            if (exp.company !== item.company) {
              warnings.push(`경력 [${item.careerIndex}] ${item.company}: 프로필이 변경되어 적용을 건너뛰었습니다.`);
              continue;
            }

            await prisma.workExperience.update({
              where: { id: exp.id },
              data: {
                description: item.improvedDescription,
                achievements: item.improvedAchievements,
              },
            });
            careerApplied = true;
          }

          if (careerApplied) {
            appliedSections.push('career');
          } else {
            skippedSections.push('career');
          }
          break;
        }

        case 'skills': {
          // Skills are feedback-only, cannot be applied
          skippedSections.push('skills');
          break;
        }

        default:
          skippedSections.push(sectionName);
      }
    }

    return NextResponse.json({
      success: true,
      appliedSections,
      skippedSections,
      warnings,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
