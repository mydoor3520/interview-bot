import { z } from 'zod';
import type { ResumeEdit, WorkExperience, UserSkill } from '@prisma/client';
import type { ResumeData, ResumeExperience, ResumeSkill } from './types';
import { stripMarkdown, stripBracketTags } from '@/lib/utils/strip-markdown';
import { MAX_STRENGTHS } from './constants';

// Inline schema definitions for decoupling from resume-editor.ts internals
const coerceToArray = z.preprocess(
  (val) => (typeof val === 'string' ? [val] : val),
  z.array(z.string()).default([])
);

const careerItemSchema = z.object({
  careerIndex: z.number(),
  company: z.string(),
  originalDescription: z.string().default(''),
  improvedDescription: z.string(),
  originalAchievements: coerceToArray,
  improvedAchievements: coerceToArray,
  reasoning: z.string(),
});

const sectionFeedbackSchema = z.object({
  section: z.enum(['selfIntro', 'career', 'strengths', 'weaknesses', 'resume', 'skills']),
  sectionLabel: z.string(),
  originalText: z.string().default(''),
  improvedText: z.string().default(''),
  improvedList: z.array(z.string()).optional(),
  reasoning: z.string(),
  keywords: z.array(z.string()).default([]),
  score: z.number().min(0).max(10),
  improvements: z.array(z.string()).default([]),
  careerItems: z.array(careerItemSchema).optional(),
});

const sectionsSchema = z.array(sectionFeedbackSchema);

type SectionFeedback = z.infer<typeof sectionFeedbackSchema>;

/** description이 60자 초과 시 첫 문장만 사용 */
function truncateDescription(desc: string): string {
  const trimmed = desc.trim();
  if (trimmed.length <= 60) return trimmed;
  const firstSentence = trimmed.match(/^[^.!?。]+[.!?。]/);
  return firstSentence ? firstSentence[0].trim() : trimmed.slice(0, 60);
}

function toYYYYMM(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function mapExperiences(
  careerSection: SectionFeedback | undefined,
  originalExperiences: WorkExperience[]
): ResumeExperience[] {
  // Fall back to original experiences if no coaching data
  if (!careerSection?.careerItems || careerSection.careerItems.length === 0) {
    return originalExperiences.map((exp) => ({
      company: exp.company,
      role: exp.role,
      startDate: toYYYYMM(exp.startDate),
      endDate: exp.endDate ? toYYYYMM(exp.endDate) : undefined,
      description: truncateDescription(stripMarkdown(exp.description ?? '')),
      techStack: exp.techStack,
      achievements: exp.achievements.map(a => stripMarkdown(a)),
    }));
  }

  // Build a map from company name to coaching data for robust matching
  // (careerIndex is unreliable when experience order changes after coaching)
  const coachingByCompany = new Map<string, typeof careerSection.careerItems[number]>();
  for (const item of careerSection.careerItems) {
    // Extract company name from coaching data (format: "㈜회사명 | 직책 (날짜)")
    const companyMatch = item.company.match(/^(.+?)\s*\|/);
    const companyName = companyMatch ? companyMatch[1].trim() : item.company.trim();
    coachingByCompany.set(companyName, item);
  }

  // Follow originalExperiences order (already sorted by orderIndex)
  const mapped: ResumeExperience[] = originalExperiences.map((exp) => {
    const coaching = coachingByCompany.get(exp.company);
    if (coaching) {
      return {
        company: exp.company,
        role: exp.role,
        startDate: toYYYYMM(exp.startDate),
        endDate: exp.endDate ? toYYYYMM(exp.endDate) : undefined,
        description: truncateDescription(stripBracketTags(stripMarkdown(coaching.improvedDescription || exp.description || ''))),
        techStack: exp.techStack,
        achievements:
          coaching.improvedAchievements.length > 0
            ? coaching.improvedAchievements.map(a => stripBracketTags(stripMarkdown(a)))
            : exp.achievements.map(a => stripMarkdown(a)),
      };
    }
    return {
      company: exp.company,
      role: exp.role,
      startDate: toYYYYMM(exp.startDate),
      endDate: exp.endDate ? toYYYYMM(exp.endDate) : undefined,
      description: truncateDescription(stripMarkdown(exp.description ?? '')),
      techStack: exp.techStack,
      achievements: exp.achievements.map(a => stripMarkdown(a)),
    };
  });

  return mapped;
}

function mapSkills(originalSkills: UserSkill[]): ResumeSkill[] {
  return originalSkills.map((skill) => ({
    name: skill.name,
    category: skill.category,
    proficiency: skill.proficiency,
    yearsUsed: skill.yearsUsed ?? undefined,
  }));
}

export function mapCoachingToResumeData(
  resumeEdit: ResumeEdit,
  originalExperiences: WorkExperience[],
  originalSkills: UserSkill[]
): Partial<ResumeData> {
  // Defensive parse of sections JSON
  let sections: SectionFeedback[] = [];
  try {
    const raw = Array.isArray(resumeEdit.sections)
      ? resumeEdit.sections
      : typeof resumeEdit.sections === 'string'
        ? JSON.parse(resumeEdit.sections)
        : resumeEdit.sections;

    const parsed = sectionsSchema.safeParse(raw);
    if (parsed.success) {
      sections = parsed.data;
    }
  } catch {
    // Malformed JSON — fall back to empty sections
  }

  const selfIntroSection = sections.find((s) => s.section === 'selfIntro');
  const careerSection = sections.find((s) => s.section === 'career');
  const strengthsSection = sections.find((s) => s.section === 'strengths');
  // 'weaknesses' is intentionally excluded from resume output
  // 'skills' section provides text-only commentary — use original UserSkill[] instead
  // 'resume' section used as fallback summary if selfIntro is missing

  const resumeSection = sections.find((s) => s.section === 'resume');

  const rawSummary =
    selfIntroSection?.improvedText ||
    resumeSection?.improvedText ||
    undefined;
  const summary = rawSummary ? stripMarkdown(rawSummary) : undefined;

  const strengths =
    strengthsSection?.improvedList && strengthsSection.improvedList.length > 0
      ? strengthsSection.improvedList.slice(0, MAX_STRENGTHS).map(s => stripBracketTags(stripMarkdown(s))).filter(s => s.trim().length > 0)
      : undefined;

  const experiences = mapExperiences(careerSection, originalExperiences);
  const skills = mapSkills(originalSkills);

  return {
    ...(summary !== undefined && { summary }),
    ...(strengths !== undefined && { strengths }),
    experiences,
    skills,
  };
}
