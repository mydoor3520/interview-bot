import type { ResumeEdit, WorkExperience, UserSkill, TargetPosition } from '@prisma/client';
import type { ResumeData, ResumeExperience, ResumeSkill, SourceType, ProfileWithRelations } from './types';
import { mapCoachingToResumeData } from './coaching-mapper';
import { getProviders } from '@/lib/ai/providers';
import { BUZZWORDS, MAX_CORE_COMPETENCIES, MIN_CORE_COMPETENCIES, MAX_STRENGTHS, MAX_SUMMARY_PARAGRAPHS } from './constants';
import { stripMarkdown } from '@/lib/utils/strip-markdown';

// ─── Date helpers ───

function toYYYYMM(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// ─── Map from original profile ───

function mapOriginalExperiences(experiences: WorkExperience[]): ResumeExperience[] {
  return experiences.map((exp) => ({
    company: exp.company,
    role: exp.role,
    startDate: toYYYYMM(exp.startDate),
    endDate: exp.endDate ? toYYYYMM(exp.endDate) : undefined,
    description: exp.description ? stripMarkdown(exp.description) : '',
    techStack: exp.techStack,
    achievements: exp.achievements.map(a => stripMarkdown(a)),
  }));
}

function mapOriginalSkills(skills: UserSkill[]): ResumeSkill[] {
  return skills.map((s) => ({
    name: s.name,
    category: s.category,
    proficiency: s.proficiency,
    yearsUsed: s.yearsUsed ?? undefined,
  }));
}

// ─── AI core competency generation ───

async function generateCoreCompetencies(
  profile: ProfileWithRelations,
  targetPosition: TargetPosition | null | undefined
): Promise<string[]> {
  const { primary } = getProviders();

  const experienceSummary = profile.experiences
    .slice(0, 5)
    .map(
      (e) =>
        `- ${e.company} / ${e.role}: ${e.achievements.slice(0, 3).join(', ')}`
    )
    .join('\n');

  const skillSummary = profile.skills
    .filter((s) => s.proficiency >= 3)
    .slice(0, 10)
    .map((s) => s.name)
    .join(', ');

  const jdContext = targetPosition
    ? `
지원 포지션: ${targetPosition.position} at ${targetPosition.company}
주요 요구사항: ${targetPosition.requirements.slice(0, 5).join(', ')}
기술 스택: ${targetPosition.techStack.slice(0, 8).join(', ')}
`
    : '';

  const buzzwordList = BUZZWORDS.join(', ');

  const prompt = `당신은 전문 이력서 컨설턴트입니다. 아래 지원자 정보를 바탕으로 이력서 핵심역량 ${MIN_CORE_COMPETENCIES}-${MAX_CORE_COMPETENCIES}개를 생성하세요.

규칙:
- 각 핵심역량은 한 줄(20자 이내)의 명사형 구문
- 구체적 성과/기술이 드러나도록
- 격식체, 전문적 표현 사용
- 다음 버즈워드 절대 사용 금지: ${buzzwordList}
- Google X-Y-Z 공식 (X를 Y하여 Z를 달성) 압축 적용
- JD 키워드 자연스럽게 포함
- "~능력", "~역량", "~스킬" 같은 추상적 접미사 대신 구체적 결과물/기술명 사용 (좋은 예: "대규모 트래픽 시스템 설계", 나쁜 예: "시스템 설계 능력")
${jdContext}
지원자 경력:
${experienceSummary}

핵심 기술: ${skillSummary}

응답 형식 (JSON 배열만, 다른 텍스트 없이):
["핵심역량1", "핵심역량2", "핵심역량3"]`;

  try {
    const result = await primary.client.chat({
      messages: [{ role: 'user', content: prompt }],
      model: 'claude-haiku-4-5-20251001',
      temperature: 0.6,
      maxTokens: 256,
    });

    const text = result.content.trim();
    // Extract JSON array from response
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];

    const parsed = JSON.parse(match[0]);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is string => typeof item === 'string')
        .slice(0, MAX_CORE_COMPETENCIES);
    }
    return [];
  } catch {
    // Fallback: derive from skills and experiences
    return profile.skills
      .filter((s) => s.proficiency >= 4)
      .slice(0, MAX_CORE_COMPETENCIES)
      .map((s) => `${s.name} 전문가`);
  }
}

// ─── Main optimizer ───

export async function optimizeResumeForPosition(
  profile: ProfileWithRelations,
  targetPosition?: TargetPosition | null,
  resumeEdit?: ResumeEdit | null,
  sourceType: SourceType = 'profile'
): Promise<ResumeData> {
  // Use user-defined order (orderIndex) — do not re-sort by relevance
  const sortedExperiences = [...profile.experiences];

  // Build base resume data depending on sourceType
  let experiences: ResumeExperience[];
  let skills: ResumeSkill[];
  let summary: string | undefined;
  let strengths: string[] | undefined;

  if (sourceType === 'coaching' && resumeEdit) {
    const coachingData = mapCoachingToResumeData(
      resumeEdit,
      sortedExperiences,
      profile.skills
    );
    experiences = coachingData.experiences ?? mapOriginalExperiences(sortedExperiences);
    skills = coachingData.skills ?? mapOriginalSkills(profile.skills);
    summary = coachingData.summary;
    strengths = coachingData.strengths;
  } else {
    // 'profile' source — use original data directly
    experiences = mapOriginalExperiences(sortedExperiences);
    skills = mapOriginalSkills(profile.skills);
    summary = profile.selfIntroduction ? stripMarkdown(profile.selfIntroduction) : undefined;
    strengths = profile.strengths.length > 0 ? profile.strengths.slice(0, MAX_STRENGTHS).map(s => stripMarkdown(s)).filter(s => s.trim().length > 0) : undefined;
  }

  // 자기소개 문단 제한 (최대 2문단) — coaching/profile 양쪽 커버
  if (summary) {
    const paragraphs = summary.split(/\n\n+/).filter(p => p.trim());
    if (paragraphs.length > MAX_SUMMARY_PARAGRAPHS) {
      summary = paragraphs.slice(0, MAX_SUMMARY_PARAGRAPHS).map(p => p.trim()).join('\n\n');
    }
  }

  // Generate core competencies via AI
  const coreCompetencies = await generateCoreCompetencies(profile, targetPosition);

  return {
    name: profile.name,
    email: profile.email ?? undefined,
    currentRole: profile.currentRole,
    totalYearsExp: profile.totalYearsExp,
    coreCompetencies,
    experiences,
    skills,
    summary,
    strengths,
    targetCompany: targetPosition?.company,
    targetPosition: targetPosition?.position,
    photoUrl: profile.photoUrl ?? undefined,
  };
}
