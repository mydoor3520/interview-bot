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
    ? `이 이력서를 위 지원 포지션에 맞춰 첨삭해주세요. 해당 포지션의 키워드와 요구사항에 맞게 경험과 성과를 강조하고, 부족한 부분을 보완하세요.
또한 keywordMatch 필드를 반드시 포함하여 포지션 키워드 매칭 분석을 제공하세요.`
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

## 품질 규칙 (필수 준수)
1. 자기소개(selfIntro improvedText)는 반드시 \\n\\n으로 구분된 2문단으로 작성 (문단당 2-3문장, 총 4-6문장). 경력/강점 섹션과 내용 중복 금지
   - 1문단: 경력 요약 + 전문 분야 (예: "7년차 백엔드 개발자로서...")
   - 2문단: 핵심 강점/차별점 (예: "특히 대규모 트래픽 처리와...")
2. 강점(strengths improvedList)은 5개 이하. 경력 성과의 단순 반복 금지. 역량/관점 중심으로 작성
3. "JD"라는 줄임말 사용 절대 금지. "JD 충족", "JD 요구사항", "JD에서 요구하는" 등 모든 형태 금지. 직무기술서를 지칭할 경우 "해당 포지션 요구사항" 등으로 표현
4. 동일 성과를 여러 섹션에 반복 금지. 각 섹션은 고유한 관점 담당:
   - selfIntro: 커리어 서사와 비전 (why)
   - career: 구체적 성과와 수치 (what)
   - strengths: 업무 역량과 차별점 (how)
5. improvedDescription은 역할 요약 1문장(60자 이내). improvedAchievements와 내용 겹침 금지
6. 모든 섹션의 출력에서 [대괄호] 패턴 사용 절대 금지:
   - "[JD 매칭]", "[필수 자격요건]", "[우대사항 매칭]" 등 JD 태그 금지
   - "[인프라 관리]", "[데이터 처리]" 등 대괄호 제목 패턴 금지
   - 순수 텍스트만 작성. 분류/태깅이 필요하면 키워드로 자연스럽게 포함
7. 성과 수치화 규칙:
   - 원본에 구체적 수치가 없는 성과에 임의의 퍼센트/숫자를 날조하지 말 것 (예: 원본 "배포 자동화 구축" → "80% 단축" 날조 금지)
   - "업무량", "역량 확보율", "생산성" 등 객관적 측정이 불가능한 지표에 수치를 붙이지 말 것
   - 100%, 90% 등 극단적 수치는 지양. 단, 원본에 이미 명시된 수치는 그대로 보존할 것
   - 실제 측정 가능한 지표(응답 시간, 장애 건수, 배포 횟수 등)에만 수치 사용
   - 수치 없이도 임팩트 전달 가능: "수동 배포를 CI/CD 파이프라인으로 전환하여 배포 안정성 확보" 처럼 before/after 서술
8. 성과 서술 패턴 다양화:
   - "~를 통해 ~를 ~% 단축/감소/개선" 구조의 반복 금지. 최소 3가지 이상 서술 패턴 혼용
   - 권장 패턴: "A를 B로 전환", "C 도입으로 D 문제 해결", "E 설계/구축하여 F 실현", "G 환경에서 H 주도"
9. "역량 보유", "역량 확보", "능력 입증" 등 추상적 마무리 금지. 성과는 구체적 결과물이나 행동으로 마무리
   - 나쁜 예: "시스템 설계 역량 보유" → 좋은 예: "마이크로서비스 아키텍처 설계 및 운영"
10. "Testable한", "Readable한", "Scalable한" 등 영어+한국어 혼용 지양. "테스트 용이한", "가독성 높은", "확장 가능한" 등 한글 표현 사용. 단, 기술 고유명사(Spring Boot, PostgreSQL, CI/CD 등)는 영문 유지
11. 면접 질문 유발 서술 (궁금증 유발 원칙):
   - 성과 불릿은 "결과와 변화"를 명확히 쓰되, 구현 방법은 기술명 또는 접근법 이름 한 어구 이내로 포함하거나 생략
   - 성과의 규모나 맥락(레거시, 대규모, 무중단 등)은 반드시 유지할 것
   - 면접관이 "어떻게 했나요?"라고 질문하고 싶어지는 수준이 적절
   - 좋은 예: "모놀리식 시스템을 마이크로서비스로 전환하여 배포 주기를 주 단위에서 일 단위로 단축"
   - 나쁜 예: "DDD 기반으로 Bounded Context를 정의하고, API Gateway를 적용하며, 이벤트 기반 통신으로 결합도를 낮춰 전환" → 이미 다 설명되어 질문할 것이 없음
   - 단, 원본에 수치가 없는 경우 규칙 7에 따라 수치를 날조하지 말 것. 결과는 정성적 변화로 표현 가능
12. 도전적 맥락 포함 권장:
   - 성과에 도전적 상황(레거시 전환, 무중단 마이그레이션, 트래픽 급증 대응, 기술 부채 해소 등)이 있으면 자연스럽게 포함
   - 도전적 맥락은 면접관의 후속 질문을 자연스럽게 유발함
   - 좋은 예: "레거시 모놀리스 무중단 전환으로 서비스 연속성 확보"
   - 나쁜 예: "시스템 전환 수행"

## 첨삭 대상 섹션
다음 섹션들을 분석하고 개선안을 제시하세요:
1. **selfIntro** (자기소개): 자기소개 텍스트 개선. 반드시 \\n\\n으로 구분된 2문단으로 작성. 1문단=경력 서사, 2문단=강점/차별점
2. **career** (경력사항): 각 경력의 업무 설명과 성과 개선 (careerItems 배열 사용, careerIndex는 위 번호와 동일)
   - improvedDescription: 해당 포지션 핵심 역할 1문장 요약 (60자 이내, 예: "프론트엔드 아키텍처 설계 및 팀 리드")
   - improvedAchievements: 구체적 성과 3-5개 불릿. 각 불릿은 "변화/결과"를 명확히 쓰되 구현 세부사항은 축약. description과 내용 겹침 금지
3. **strengths** (강점): 강점 목록 개선 → improvedList (JSON 배열, 최대 5개)로 반환. 각 강점은 구체적 경험 기반으로 작성하되, 면접에서 더 깊이 물어볼 여지를 남길 것
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
