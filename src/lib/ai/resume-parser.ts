import { z } from 'zod';
import { createAIClient } from './client';
import { env } from '@/lib/env';
import type { AIMessage, AIContentBlock } from './types';

// Helper: coerce string to single-element array (AI sometimes returns string instead of array)
const coerceToArray = z.preprocess(
  (val) => (typeof val === 'string' ? [val] : val),
  z.array(z.string().max(500)).max(10).default([])
);

// Zod Schemas
const parsedExperienceSchema = z.object({
  company: z.string().min(1).max(200),
  role: z.string().min(1).max(200),
  startDate: z.string().regex(/^\d{4}(-\d{2})?$/),
  endDate: z.string().regex(/^\d{4}(-\d{2})?$/).nullable(),
  description: z.string().max(2000).default(''),
  techStack: z.preprocess(
    (val) => (typeof val === 'string' ? [val] : val),
    z.array(z.string().max(50)).max(20).default([])
  ),
  achievements: coerceToArray,
});

const parsedSkillSchema = z.object({
  name: z.string().min(1).max(50),
  category: z.enum([
    'frontend',
    'backend',
    'devops',
    'language',
    'database',
    'tool',
    'soft',
    'other',
  ]),
  proficiency: z.number().int().min(1).max(5),
  yearsUsed: z.number().int().min(0).max(30).nullable(),
});

export const parsedResumeSchema = z.object({
  selfIntroduction: z.string().max(5000).default(''),
  experiences: z.array(parsedExperienceSchema).max(20).default([]),
  skills: z.array(parsedSkillSchema).max(50).default([]),
});

export type ParsedResume = z.infer<typeof parsedResumeSchema>;
export type ParsedExperience = z.infer<typeof parsedExperienceSchema>;
export type ParsedSkill = z.infer<typeof parsedSkillSchema>;

// System prompt for Korean resume parsing
const SYSTEM_PROMPT = `당신은 한국어 이력서/경력기술서 파싱 전문가입니다.

첨부된 PDF 이력서를 분석하고 다음 정보를 JSON으로 추출해주세요.

## 추출 항목
1. **자기소개** (selfIntroduction): 자기소개서, 지원동기, 커버레터 등의 내용. 없으면 빈 문자열.
2. **경력사항** (experiences): 각 경력별로:
   - company: 회사명
   - role: 직무/직책
   - startDate: 시작일 (YYYY-MM 형식, 월 모르면 YYYY)
   - endDate: 종료일 (현재 재직중이면 null)
   - description: 담당 업무 설명
   - techStack: 사용 기술 목록
   - achievements: 주요 성과/실적
3. **기술스택** (skills): 이력서에 언급된 모든 기술/도구:
   - name: 기술명 (예: "React", "Python", "Figma")
   - category: frontend|backend|devops|language|database|tool|soft|other
   - proficiency: 1-5 (이력서 맥락에서 추정: 주력=5, 자주사용=4, 사용경험=3, 기초=2, 학습중=1)
   - yearsUsed: 사용 연차 (알 수 없으면 null)

## 한국어 이력서 특수 사항
- "경력기술서", "업무경험", "프로젝트 경력" 등은 모두 experiences로 분류
- "보유 기술", "기술 스택", "사용 가능 언어/도구" 등은 skills로 분류
- "자기소개서", "지원동기", "소개" 등은 selfIntroduction으로 분류
- 표(table) 형식의 경력 정보도 정확히 읽어주세요
- 군 경력은 포함하지 마세요
- 학력은 추출 대상이 아닙니다

## 응답 형식
반드시 아래 JSON만 반환하세요. 다른 텍스트는 포함하지 마세요.
{
  "selfIntroduction": "...",
  "experiences": [...],
  "skills": [...]
}`;

/**
 * Parse a PDF resume into structured data using Claude Vision
 * @param pdfBuffer - PDF file buffer
 * @returns Parsed resume data
 */
export async function parseResumePDF(pdfBuffer: Buffer): Promise<ParsedResume> {
  // Convert PDF to base64 and send directly to Anthropic API (native PDF support)
  const pdfBase64 = pdfBuffer.toString('base64');

  // Build messages array with PDF document block
  const messages: AIMessage[] = [
    {
      role: 'system',
      content: SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: pdfBase64,
          },
        } as AIContentBlock,
        {
          type: 'text',
          text: '이 이력서 PDF를 분석하고 경력사항, 기술스택, 자기소개를 추출해주세요.',
        },
      ],
    },
  ];

  // Call AI
  const aiClient = createAIClient({ endpoint: 'resume_parse' });
  const response = await aiClient.chat({
    model: env.AI_MODEL,
    messages,
    temperature: 0.2,
    maxTokens: 4096,
  });

  // Parse JSON from response
  let parsed: unknown;
  const responseText = response.content; // AIChatResult.content is always a string

  console.log('[resume-parser] AI response length:', responseText.length);
  console.log('[resume-parser] AI response preview:', responseText.substring(0, 500));

  try {
    // Try direct JSON parse
    parsed = JSON.parse(responseText);
  } catch {
    // Try extracting from markdown code block
    const match = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        parsed = JSON.parse(match[1]);
      } catch {
        console.error('[resume-parser] Failed to parse code block JSON:', match[1].substring(0, 200));
        throw new Error('AI 응답을 파싱할 수 없습니다.');
      }
    } else {
      // Try to find JSON object in the response text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          console.error('[resume-parser] Failed to extract JSON from response');
          throw new Error('AI 응답을 파싱할 수 없습니다.');
        }
      } else {
        console.error('[resume-parser] No JSON found in response');
        throw new Error('AI 응답을 파싱할 수 없습니다.');
      }
    }
  }

  // Validate with Zod
  const validationResult = parsedResumeSchema.safeParse(parsed);

  if (validationResult.success) {
    return validationResult.data;
  }

  // Try to recover: normalize each experience before re-parsing
  try {
    const raw = parsed as any;
    const normalizedExperiences = (raw?.experiences || []).map((exp: any) => ({
      ...exp,
      techStack: typeof exp?.techStack === 'string' ? [exp.techStack] : (exp?.techStack || []),
      achievements: typeof exp?.achievements === 'string' ? [exp.achievements] : (exp?.achievements || []),
      description: exp?.description || '',
    }));
    return parsedResumeSchema.parse({
      selfIntroduction: raw?.selfIntroduction || '',
      experiences: normalizedExperiences,
      skills: raw?.skills || [],
    });
  } catch (error) {
    console.error('Resume parse validation error:', validationResult.error);
    throw new Error('이력서 파싱 결과가 유효하지 않습니다.');
  }
}
