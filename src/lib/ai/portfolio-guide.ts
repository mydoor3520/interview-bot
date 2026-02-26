import { z } from 'zod';
import { sanitizeForPrompt, truncateContextIfNeeded } from './prompts';
import type { AIMessage } from './types';

// === Local Input Types ===

export interface PortfolioProjectData {
  id: string;
  title: string;
  description: string;
  role: string;
  teamSize?: number | null;
  startDate: string;
  endDate?: string | null;
  techStack: string[];
  achievements: string[];
  troubleshooting?: string | null;
  category: string;
}

export interface WorkExperienceData {
  company: string;
  position: string;
  startDate: string;
  endDate?: string | null;
  description: string;
  techStack: string[];
  achievements: string[];
}

export interface ProfileContext {
  name: string;
  bio?: string | null;
  skills: string[];
  yearsOfExperience?: number | null;
}

export interface TargetPositionData {
  company: string;
  position: string;
  description?: string | null;
  requirements?: string[];
  preferredSkills?: string[];
  techStack?: string[];
}

// === Zod Schemas ===

const troubleshootingGuideSchema = z.object({
  suggested: z.string(),
  reasoning: z.string(),
});

const projectGuideSchema = z.object({
  projectId: z.string(),
  projectSource: z.enum(['portfolio', 'experience']),
  projectTitle: z.string(),
  relevanceScore: z.number().min(0).max(10),
  recommendedOrder: z.number().int().min(1),
  highlightPoints: z.array(z.string()).default([]),
  descriptionImproved: z.string(),
  achievementsImproved: z.array(z.string()).default([]),
  techStackHighlight: z.array(z.string()).default([]),
  troubleshootingGuide: troubleshootingGuideSchema.optional(),
  reasoning: z.string(),
});

const skillStrategySchema = z.object({
  leadWith: z.array(z.string()).default([]),
  emphasize: z.array(z.string()).default([]),
  deemphasize: z.array(z.string()).default([]),
  missing: z.array(z.string()).default([]),
  reasoning: z.string(),
});

const introOptimizationSchema = z.object({
  original: z.string().default(''),
  improved: z.string(),
  reasoning: z.string(),
});

const keywordMatchSchema = z.object({
  matched: z.array(z.string()).default([]),
  missing: z.array(z.string()).default([]),
  coverage: z.number().min(0).max(100),
  suggestions: z.array(z.string()).default([]),
});

export const portfolioGuideResponseSchema = z.object({
  positioning: z.string(),
  keyMessage: z.string(),
  projectGuides: z.array(projectGuideSchema).min(1),
  skillStrategy: skillStrategySchema,
  introOptimization: introOptimizationSchema,
  keywordMatch: keywordMatchSchema.optional(),
  additionalSuggestions: z.array(z.string()).default([]),
});

export type PortfolioGuideResponse = z.infer<typeof portfolioGuideResponseSchema>;

// === Prompt Builder ===

export function buildPortfolioGuidePrompt(
  profile: ProfileContext,
  projects: PortfolioProjectData[],
  experiences: WorkExperienceData[],
  mode: 'general' | 'targeted',
  targetPosition?: TargetPositionData
): AIMessage[] {
  // Profile section
  const profileLines: string[] = [
    `## 지원자 프로필`,
    `- 이름: ${sanitizeForPrompt(profile.name)}`,
  ];
  if (profile.yearsOfExperience != null) {
    profileLines.push(`- 경력: ${profile.yearsOfExperience}년`);
  }
  if (profile.bio) {
    profileLines.push(`- 소개: ${sanitizeForPrompt(profile.bio)}`);
  }
  if (profile.skills.length > 0) {
    profileLines.push(`- 보유 기술: ${profile.skills.join(', ')}`);
  }

  // Portfolio projects section
  const projectsSection = projects.length > 0
    ? projects.map((p) => {
        const period = p.endDate
          ? `${p.startDate} ~ ${p.endDate}`
          : `${p.startDate} ~ 진행중`;
        const parts = [
          `### [포트폴리오] ${sanitizeForPrompt(p.title)} (id: ${p.id})`,
          `- 카테고리: ${sanitizeForPrompt(p.category)}`,
          `- 기간: ${period}`,
          `- 역할: ${sanitizeForPrompt(p.role)}`,
          p.teamSize != null ? `- 팀 규모: ${p.teamSize}명` : null,
          `- 설명: ${sanitizeForPrompt(p.description)}`,
          p.techStack.length > 0 ? `- 기술 스택: ${p.techStack.join(', ')}` : null,
          p.achievements.length > 0
            ? `- 성과:\n${p.achievements.map(a => `  - ${sanitizeForPrompt(a)}`).join('\n')}`
            : null,
          p.troubleshooting
            ? `- 트러블슈팅: ${sanitizeForPrompt(p.troubleshooting)}`
            : null,
        ].filter(Boolean).join('\n');
        return parts;
      }).join('\n\n')
    : '포트폴리오 프로젝트 없음';

  // Work experience section
  const experiencesSection = experiences.length > 0
    ? experiences.map((e) => {
        const period = e.endDate
          ? `${e.startDate} ~ ${e.endDate}`
          : `${e.startDate} ~ 현재`;
        const parts = [
          `### [경력] ${sanitizeForPrompt(e.company)} - ${sanitizeForPrompt(e.position)} (${period})`,
          `- 업무: ${sanitizeForPrompt(e.description)}`,
          e.techStack.length > 0 ? `- 기술: ${e.techStack.join(', ')}` : null,
          e.achievements.length > 0
            ? `- 성과:\n${e.achievements.map(a => `  - ${sanitizeForPrompt(a)}`).join('\n')}`
            : null,
        ].filter(Boolean).join('\n');
        return parts;
      }).join('\n\n')
    : '경력 정보 없음';

  // Target position section (targeted mode only)
  const targetSection = mode === 'targeted' && targetPosition
    ? `\n## 지원 포지션 정보
- 회사: ${sanitizeForPrompt(targetPosition.company)}
- 포지션: ${sanitizeForPrompt(targetPosition.position)}
${targetPosition.description ? `- 직무 설명:\n${sanitizeForPrompt(targetPosition.description)}` : ''}
${targetPosition.requirements && targetPosition.requirements.length > 0
  ? `- 자격 요건:\n${targetPosition.requirements.map(r => `  - ${sanitizeForPrompt(r)}`).join('\n')}`
  : ''}
${targetPosition.preferredSkills && targetPosition.preferredSkills.length > 0
  ? `- 우대 사항:\n${targetPosition.preferredSkills.map(s => `  - ${sanitizeForPrompt(s)}`).join('\n')}`
  : ''}
${targetPosition.techStack && targetPosition.techStack.length > 0
  ? `- 기술 스택: ${targetPosition.techStack.join(', ')}`
  : ''}`
    : '';

  const modeInstruction = mode === 'targeted'
    ? `포지션 맞춤 포트폴리오 전략을 제공하세요. 지원 포지션의 요구사항과 키워드를 분석하여 각 프로젝트의 연관성 점수를 평가하고, 어떤 프로젝트를 강조해야 하는지 구체적으로 안내하세요.
keywordMatch 필드를 반드시 포함하여 포지션 키워드 커버리지를 분석해주세요.`
    : `일반 포트폴리오 전략을 제공하세요. 프로젝트의 완성도, 기술 다양성, 성장 스토리를 중심으로 포트폴리오를 강화하는 방향을 제시하세요.
keywordMatch 필드는 포함하지 마세요.`;

  const systemPrompt = `당신은 한국 IT 업계 포트폴리오 전문 컨설턴트입니다. 개발자의 포트폴리오와 경력을 분석하여 취업 및 이직에 최적화된 포트폴리오 전략을 제공합니다.

${profileLines.join('\n')}

## 포트폴리오 프로젝트
${projectsSection}

## 경력 사항
${experiencesSection}
${targetSection}

## 분석 모드: ${mode === 'targeted' ? '포지션 맞춤 전략' : '일반 포트폴리오 강화'}
${modeInstruction}

## 포트폴리오 컨설팅 핵심 원칙 (필수 준수)

1. **트러블슈팅 섹션 필수**
   - 모든 주요 프로젝트에 문제→분석→해결→결과 형식의 트러블슈팅이 있어야 합니다
   - 트러블슈팅이 없는 프로젝트는 troubleshootingGuide에 제안을 작성하세요
   - 예: "배포 시 메모리 부족 → 프로파일링으로 메모리 누수 발견 → 커넥션 풀 최적화 → 메모리 사용 40% 감소"

2. **정량적 성과 중심 서술**
   - "성능 개선" ❌ → "응답시간 8초→2초 (75% 개선)" ⭕
   - 원본에 수치가 없는 경우 추측 수치를 날조하지 마세요
   - 정성적 개선도 before/after 서술로 임팩트를 전달하세요: "수동 배포 → CI/CD 자동화로 배포 오류 제거"

3. **기술 선택 이유 (WHY) 설명**
   - 단순 기술 나열이 아닌, 왜 그 기술을 선택했는지 설명해야 합니다
   - "React 사용" ❌ → "컴포넌트 재사용성과 상태 관리 편의성을 위해 React 채택" ⭕

4. **STAR 방식 적용**
   - Situation(상황) → Task(과제) → Action(행동) → Result(결과) 구조로 성과를 서술하세요

5. **선택과 집중: 3-5개 핵심 프로젝트**
   - 10개 이상의 평범한 프로젝트보다 3-5개의 완성도 높은 프로젝트가 효과적입니다
   - recommendedOrder와 relevanceScore로 우선순위를 명확히 제시하세요

6. **성과 서술 패턴 다양화**
   - "~를 통해 ~% 개선" 구조 반복 금지. 다양한 패턴을 사용하세요
   - 권장 패턴: "A를 B로 전환", "C 도입으로 D 문제 해결", "E 설계/구축하여 F 실현"

7. **기술 스택 하이라이트**
   - 모든 기술을 나열하지 말고, 해당 프로젝트에서 핵심적으로 활용한 기술만 강조하세요
   - 특히 문제 해결에 결정적이었던 기술을 앞에 배치하세요

8. **면접 질문 유발 서술**
   - 면접관이 "어떻게 했나요?", "왜 그 방법을 선택했나요?"라고 묻고 싶어지는 서술이 좋습니다
   - 구현 세부사항은 생략하고 결과와 맥락을 명확히 하세요

## 응답 JSON 스키마
반드시 아래 JSON 스키마만 반환하세요. 다른 텍스트는 포함하지 마세요.
\`\`\`json
{
  "positioning": "지원자의 포지셔닝 한 줄 요약 (예: '풀스택 경험을 가진 백엔드 전문 개발자')",
  "keyMessage": "포트폴리오 전체를 관통하는 핵심 메시지 (2-3문장)",
  "projectGuides": [
    {
      "projectId": "프로젝트 id (포트폴리오는 실제 id, 경력은 'exp-회사명' 형식)",
      "projectSource": "portfolio" | "experience",
      "projectTitle": "프로젝트 제목",
      "relevanceScore": 8,
      "recommendedOrder": 1,
      "highlightPoints": ["강조할 포인트1", "강조할 포인트2"],
      "descriptionImproved": "개선된 프로젝트 설명 (STAR 방식, 1-2문장)",
      "achievementsImproved": ["개선된 성과1", "개선된 성과2"],
      "techStackHighlight": ["핵심기술1", "핵심기술2"],
      "troubleshootingGuide": {
        "suggested": "제안하는 트러블슈팅 내용 (문제→분석→해결→결과)",
        "reasoning": "이 트러블슈팅을 제안하는 이유"
      },
      "reasoning": "이 프로젝트를 해당 순서/점수로 추천하는 이유"
    }
  ],
  "skillStrategy": {
    "leadWith": ["가장 먼저 내세울 기술"],
    "emphasize": ["강조할 기술"],
    "deemphasize": ["비중을 줄일 기술"],
    "missing": ["포트폴리오에 추가하면 좋을 기술"],
    "reasoning": "기술 전략 설명"
  },
  "introOptimization": {
    "original": "원본 소개 텍스트",
    "improved": "개선된 소개 텍스트 (포지셔닝 반영, 2-3문장)",
    "reasoning": "개선 이유"
  },
  "keywordMatch": {
    "matched": ["포지션과 매칭된 키워드"],
    "missing": ["포지션에서 요구하지만 포트폴리오에 없는 키워드"],
    "coverage": 75,
    "suggestions": ["키워드 커버리지를 높이기 위한 제안"]
  },
  "additionalSuggestions": ["추가 제안1", "추가 제안2"]
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
      content: '위 포트폴리오와 경력을 분석하여 최적화된 포트폴리오 전략을 JSON으로 제공해주세요.',
    },
  ];
}

// === Response Parser ===

export function parsePortfolioGuideResponse(content: string): PortfolioGuideResponse {
  // Extract JSON from markdown code block if wrapped
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonString = codeBlockMatch ? codeBlockMatch[1].trim() : content.trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    throw new Error(
      `포트폴리오 가이드 응답을 JSON으로 파싱할 수 없습니다: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const result = portfolioGuideResponseSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map(i => `${i.path.join('.')}: ${i.message}`)
      .join(', ');
    throw new Error(`포트폴리오 가이드 응답 스키마 검증 실패: ${issues}`);
  }

  return result.data;
}
