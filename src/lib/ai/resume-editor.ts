import { z } from 'zod';
import { sanitizeForPrompt, buildProfileContext, truncateContextIfNeeded } from './prompts';
import type { ProfileContext, AIMessage } from './types';

// coerceToArray 인라인 정의 (resume-parser.ts에서 미export)
const coerceToArray = z.preprocess(
  (val) => (typeof val === 'string' ? [val] : val),
  z.array(z.string()).default([])
);

// === Zod Schemas ===

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

export const resumeEditResponseSchema = z.object({
  sections: z.array(sectionFeedbackSchema).min(1),
  overallScore: z.number().min(0).max(10),
  overallFeedback: z.string(),
  keywordMatch: z.object({
    matched: z.array(z.string()),
    missing: z.array(z.string()),
    coverage: z.number().min(0).max(100),
    suggestions: z.array(z.string()),
  }).optional(),
});

// === TypeScript Types ===

export type CareerItemFeedback = z.infer<typeof careerItemSchema>;
export type SectionFeedback = z.infer<typeof sectionFeedbackSchema>;
export type ResumeEditResponse = z.infer<typeof resumeEditResponseSchema>;

// === Prompt Builder ===

export function buildResumeEditPrompt(
  profile: ProfileContext,
  experiences: Array<{ company: string; role: string; description?: string; techStack: string[]; achievements: string[] }>,
  mode: 'general' | 'targeted',
  targetPosition?: {
    company: string;
    position: string;
    jobDescription?: string | null;
    requirements: string[];
    preferredQualifications: string[];
    requiredExperience?: string | null;
    techStack: string[];
  }
): AIMessage[] {
  // Profile context without targetPosition (passed separately to avoid duplication)
  const profileContext = buildProfileContext({ ...profile, targetPosition: undefined });

  // Build career section with numbered indices for matching
  const careerSection = experiences.length > 0
    ? experiences.map((exp, idx) => {
        const parts = [
          `[${idx}] ${sanitizeForPrompt(exp.company)} - ${sanitizeForPrompt(exp.role)}`,
          exp.description ? `  업무: ${sanitizeForPrompt(exp.description)}` : null,
          exp.techStack.length > 0 ? `  기술: ${exp.techStack.join(', ')}` : null,
          exp.achievements.length > 0 ? `  성과:\n${exp.achievements.map(a => `    - ${sanitizeForPrompt(a)}`).join('\n')}` : null,
        ].filter(Boolean).join('\n');
        return parts;
      }).join('\n\n')
    : '경력 정보 없음';

  // Build target position section for targeted mode
  const targetSection = mode === 'targeted' && targetPosition
    ? `\n## 지원 포지션 정보
- 회사: ${sanitizeForPrompt(targetPosition.company)}
- 포지션: ${sanitizeForPrompt(targetPosition.position)}
${targetPosition.requiredExperience ? `- 필요 경력: ${sanitizeForPrompt(targetPosition.requiredExperience)}` : ''}
${targetPosition.jobDescription ? `- 직무 설명:\n${sanitizeForPrompt(targetPosition.jobDescription)}` : ''}
${targetPosition.requirements.length > 0 ? `- 자격 요건:\n${targetPosition.requirements.map(r => `  - ${sanitizeForPrompt(r)}`).join('\n')}` : ''}
${targetPosition.preferredQualifications.length > 0 ? `- 우대 사항:\n${targetPosition.preferredQualifications.map(q => `  - ${sanitizeForPrompt(q)}`).join('\n')}` : ''}
${targetPosition.techStack.length > 0 ? `- 기술 스택: ${targetPosition.techStack.join(', ')}` : ''}`
    : '';

  const modeInstruction = mode === 'targeted'
    ? `이 이력서를 위 지원 포지션에 맞춰 첨삭해주세요. JD의 키워드와 요구사항에 맞게 경험과 성과를 강조하고, 부족한 부분을 보완하세요.
또한 keywordMatch 필드를 반드시 포함하여 JD 키워드 매칭 분석을 제공하세요.`
    : `이 이력서의 전반적인 품질을 개선해주세요. 구조, 표현, 구체성, 성과 중심 서술 등을 개선하세요.
keywordMatch 필드는 포함하지 마세요.`;

  const systemPrompt = `당신은 한국 IT 업계 전문 이력서 컨설턴트입니다. 이력서 첨삭 및 코칭을 제공합니다.

## 지원자 프로필
${profileContext}

## 경력 사항 (번호 인덱스 포함)
${careerSection}
${targetSection}

## 첨삭 모드: ${mode === 'targeted' ? '포지션 맞춤 첨삭' : '일반 품질 개선'}
${modeInstruction}

## 첨삭 대상 섹션
다음 섹션들을 분석하고 개선안을 제시하세요:
1. **selfIntro** (자기소개): 자기소개 텍스트 개선
2. **career** (경력사항): 각 경력의 업무 설명과 성과 개선 (careerItems 배열 사용, careerIndex는 위 번호와 동일)
3. **strengths** (강점): 강점 목록 개선 → improvedList (JSON 배열)로 반환
4. **weaknesses** (약점): 약점 표현 개선 → improvedList (JSON 배열)로 반환
5. **resume** (이력서 전문): 이력서 전문 텍스트 개선 (있는 경우)
6. **skills** (기술스택): 기술 스택 구성에 대한 피드백 (개선안 텍스트만, 적용 불가)

해당 섹션에 내용이 없으면 해당 섹션은 건너뛰세요.
strengths, weaknesses 섹션은 반드시 improvedList 필드에 JSON 문자열 배열로 반환하세요 (쉼표 구분 문자열 아님).

## 응답 JSON 스키마
반드시 아래 JSON 스키마만 반환하세요. 다른 텍스트는 포함하지 마세요.
\`\`\`json
{
  "sections": [
    {
      "section": "selfIntro" | "career" | "strengths" | "weaknesses" | "resume" | "skills",
      "sectionLabel": "섹션 한글 이름",
      "originalText": "원본 텍스트 (career는 빈 문자열)",
      "improvedText": "개선된 텍스트 (career는 빈 문자열, strengths/weaknesses는 빈 문자열)",
      "improvedList": ["개선항목1", "개선항목2"],  // strengths, weaknesses 전용
      "reasoning": "개선 이유 설명",
      "keywords": ["강조된 키워드"],  // targeted 모드에서 강조 키워드
      "score": 7,  // 1-10점
      "improvements": ["개선사항1", "개선사항2"],
      "careerItems": [  // career 섹션 전용
        {
          "careerIndex": 0,
          "company": "회사명",
          "originalDescription": "원본 업무 설명",
          "improvedDescription": "개선된 업무 설명",
          "originalAchievements": ["원본 성과1"],
          "improvedAchievements": ["개선된 성과1"],
          "reasoning": "개선 이유"
        }
      ]
    }
  ],
  "overallScore": 7,
  "overallFeedback": "전체 이력서에 대한 종합 피드백",
  "keywordMatch": {  // targeted 모드 전용
    "matched": ["매칭된 키워드"],
    "missing": ["누락된 키워드"],
    "coverage": 65,
    "suggestions": ["키워드 추가 제안"]
  }
}
\`\`\``;

  const truncatedPrompt = truncateContextIfNeeded(systemPrompt);

  return [
    {
      role: 'system' as const,
      content: truncatedPrompt,
    },
    {
      role: 'user' as const,
      content: '위 이력서를 분석하고 섹션별 개선안을 JSON으로 제공해주세요.',
    },
  ];
}
