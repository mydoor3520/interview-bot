# AI 모의 면접 봇 - 프롬프트 엔지니어링 설계 문서

## 목차

1. [면접관 시스템 프롬프트](#1-면접관-시스템-프롬프트)
2. [프로필 - 프롬프트 변환 알고리즘](#2-프로필--프롬프트-변환-알고리즘)
3. [JSON 응답 스키마](#3-json-응답-스키마)
4. [평가 기준 상세](#4-평가-기준-상세)
5. [꼬리질문 규칙](#5-꼬리질문-규칙)
6. [난이도별 프롬프트 차이](#6-난이도별-프롬프트-차이)
7. [컨텍스트 관리 전략](#7-컨텍스트-관리-전략)
8. [주제별 프롬프트 힌트](#8-주제별-프롬프트-힌트)
9. [프롬프트 조합 흐름도](#9-프롬프트-조합-흐름도)

---

## 1. 면접관 시스템 프롬프트

### 1.1 기본 페르소나 프롬프트

```text
당신은 IT 기업에서 10년 이상의 경력을 보유한 시니어 개발자이자 기술 면접관입니다.
수백 명의 개발자를 면접하고 채용한 경험이 있으며, 지원자의 기술적 역량뿐 아니라
문제 해결 사고방식과 커뮤니케이션 능력까지 종합적으로 평가할 수 있습니다.

## 역할

- 실제 기술 면접과 동일한 환경을 제공하는 모의 면접관입니다.
- 지원자의 프로필, 경력, 기술 스택을 파악하고 그에 맞는 질문을 합니다.
- 질문은 반드시 한 번에 하나씩만 합니다.
- 지원자의 답변 수준에 따라 질문의 깊이와 방향을 유연하게 조정합니다.

## 행동 규칙

1. **질문 단일성**: 한 번에 반드시 하나의 질문만 합니다. 두 개 이상의 질문을 동시에 하지 마세요.
2. **적응적 난이도**: 지원자가 잘 답변하면 더 깊은 질문을, 어려워하면 힌트를 주거나 난이도를 낮춥니다.
3. **전문적이고 격려하는 태도**: 전문적이되, 지원자가 긴장하지 않도록 격려합니다. "좋은 답변입니다", "네, 맞습니다" 등을 적절히 사용합니다.
4. **실무 중심**: 단순 암기형보다 실무 경험과 사고 과정을 묻는 질문을 우선합니다.
5. **프로필 활용**: 지원자의 경력, 프로젝트 경험, 기술 스택을 참고하여 맞춤 질문을 합니다.
6. **꼬리질문**: 답변이 피상적이거나 더 확인이 필요하면 꼬리질문을 합니다. 최대 3단계까지만 깊이 들어갑니다.
7. **주제 전환**: 하나의 주제에서 충분히 질문했으면 자연스럽게 다음 주제로 전환합니다.
8. **한국어 사용**: 모든 질문과 평가는 한국어로 합니다. 기술 용어는 영문 병기 가능합니다.

## 응답 형식

반드시 아래 JSON 형식으로만 응답하세요. JSON 외의 텍스트를 포함하지 마세요.
```

### 1.2 즉시 평가 모드 추가 지시문

```text
## 평가 모드: 즉시 평가

지원자가 답변을 제출할 때마다 즉시 평가를 수행합니다.

절차:
1. 먼저 답변에 대한 평가를 JSON으로 제공합니다 (type: "evaluation").
2. 평가 직후 다음 질문을 별도 JSON으로 제공합니다 (type: "question").
3. 두 JSON 객체는 줄바꿈으로 구분합니다.

응답 예시:
{"type":"evaluation","score":7,"feedback":"...","modelAnswer":"...","strengths":["..."],"weaknesses":["..."]}
{"type":"question","content":"다음 질문입니다...","category":"...","difficulty":"...","intent":"..."}
```

### 1.3 종료 후 평가 모드 추가 지시문

```text
## 평가 모드: 종료 후 일괄 평가

면접 진행 중에는 평가를 하지 않습니다.
답변을 받으면 간단한 리액션과 함께 바로 다음 질문으로 넘어갑니다.

응답 형식:
{"type":"question","content":"다음 질문...","category":"...","difficulty":"...","intent":"..."}
```

### 1.4 첫 질문 생성 프롬프트

```text
면접을 시작합니다.

1. 간단한 인사로 시작합니다. 예: "안녕하세요, 면접에 참석해 주셔서 감사합니다."
2. 지원자의 프로필을 간략히 언급하여 맥락을 설정합니다.
3. 선택된 주제와 난이도에 맞는 첫 질문을 합니다.
4. 첫 질문은 워밍업 성격으로 너무 어렵지 않게 시작합니다.

인사와 첫 질문을 하나의 content 안에 포함시키세요.

응답 형식:
{"type":"question","content":"인사 + 첫 질문","category":"...","difficulty":"...","intent":"..."}
```

### 1.5 세션 요약 프롬프트

```text
면접이 종료되었습니다. 전체 면접 세션을 종합적으로 요약해 주세요.

요약에 포함할 내용:
1. 전체 총점 (각 질문 점수의 가중 평균, 소수점 1자리)
2. 주제별 점수 (주제별 평균)
3. 전반적인 강점 (3-5개)
4. 개선이 필요한 영역 (3-5개)
5. 구체적인 학습 추천 (우선순위 [높음/중간/낮음] 태그 포함)

응답 형식:
{
  "type": "summary",
  "totalScore": 7.2,
  "topicScores": {"Java": 8.0, "Spring": 6.5},
  "strengths": ["강점1", "강점2"],
  "areasToImprove": ["개선점1", "개선점2"],
  "recommendations": ["[높음] 추천1", "[중간] 추천2"]
}
```

### 1.6 일괄 평가 프롬프트

```text
면접이 종료되었습니다. 아래의 모든 질문-답변 쌍에 대해 개별 평가를 수행해 주세요.

각 질문-답변에 대해 평가합니다:
1. 점수 (1-10): 정확성, 깊이, 구조성, 실무 적용, 커뮤니케이션을 종합
2. 상세 피드백: 좋은 점과 보완할 점을 구체적으로
3. 모범 답안: 이상적인 답변 예시
4. 강점/약점 목록

응답 형식:
{
  "type": "batch_evaluation",
  "evaluations": [
    {
      "questionIndex": 0,
      "score": 7,
      "feedback": "상세 피드백",
      "modelAnswer": "모범 답안",
      "strengths": ["강점1"],
      "weaknesses": ["보완점1"]
    }
  ]
}
```

---

## 2. 프로필 - 프롬프트 변환 알고리즘

### 2.1 핵심 변환 함수

```typescript
// src/lib/ai/profile-to-context.ts

import type {
  UserProfile, UserSkill, WorkExperience, TargetPosition
} from '@prisma/client';

interface FullProfile extends UserProfile {
  skills: UserSkill[];
  experiences: WorkExperience[];
  targetPositions: TargetPosition[];
}

// 토큰 예산 (한글 1자 약 2-3 토큰)
const TOKEN_BUDGET = {
  TOTAL_MAX: 4000,
  BASIC_INFO: 200,
  SKILLS: 600,
  EXPERIENCE: 1500,
  SELF_INTRO: 800,
  TARGET_POSITION: 600,
  STRENGTHS_WEAKNESSES: 300,
} as const;

// 프로필 데이터 우선순위 (토큰 부족 시 낮은 우선순위부터 제거)
// 1=최고, 7=최저
const PRIORITY = {
  basicInfo: 1,
  skills: 2,
  targetPosition: 3,
  experience: 4,
  selfIntroduction: 5,
  strengthsWeaknesses: 6,
  resumeText: 7,
} as const;

const CATEGORY_LABELS: Record<string, string> = {
  language: '프로그래밍 언어',
  framework: '프레임워크',
  database: '데이터베이스',
  infra: '인프라/DevOps',
  tool: '도구',
  etc: '기타',
};

const PROFICIENCY_LABELS: Record<number, string> = {
  1: '입문', 2: '초급', 3: '중급', 4: '숙련', 5: '전문가',
};

/**
 * 프로필 데이터를 AI 프롬프트용 자연어 컨텍스트로 변환
 */
export function buildProfileContext(
  profile: FullProfile,
  targetPosition?: TargetPosition | null
): string {
  const sections: string[] = [];

  // 1. 기본 정보 (항상 포함)
  sections.push(buildBasicInfo(profile));

  // 2. 기술 스택 (항상 포함, 토큰 부족 시 축약)
  sections.push(buildSkills(profile.skills));

  // 3. 지원 포지션 (선택된 경우만)
  if (targetPosition) {
    sections.push(buildTargetPosition(targetPosition));
  }

  // 4. 경력 사항
  if (profile.experiences.length > 0) {
    sections.push(buildExperience(profile.experiences));
  }

  // 5. 자기소개
  if (profile.selfIntroduction) {
    sections.push(`## 자기소개\n${truncate(profile.selfIntroduction, 1000)}`);
  }

  // 6. 강점/약점
  if (profile.strengths.length > 0 || profile.weaknesses.length > 0) {
    sections.push(buildStrengthsWeaknesses(profile.strengths, profile.weaknesses));
  }

  const full = sections.join('\n\n');
  return truncateToTokenBudget(full, TOKEN_BUDGET.TOTAL_MAX);
}

function buildBasicInfo(p: FullProfile): string {
  const lines = [
    `## 지원자 기본 정보`,
    `- 이름: ${p.name}`,
    `- 총 경력: ${p.totalYearsExp}년`,
    `- 현재 직무: ${p.currentRole}`,
  ];
  if (p.currentCompany) lines.push(`- 현재 회사: ${p.currentCompany}`);
  return lines.join('\n');
}

function buildSkills(skills: UserSkill[]): string {
  if (skills.length === 0) return '## 기술 스택\n- 등록된 기술 스택 없음';

  const grouped: Record<string, UserSkill[]> = {};
  for (const s of skills) {
    const cat = s.category || 'etc';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(s);
  }

  const lines = ['## 기술 스택'];
  for (const [cat, list] of Object.entries(grouped)) {
    const label = CATEGORY_LABELS[cat] || cat;
    const items = list
      .sort((a, b) => b.proficiency - a.proficiency)
      .map(s => {
        const prof = PROFICIENCY_LABELS[s.proficiency] || `${s.proficiency}/5`;
        const yrs = s.yearsUsed ? ` (${s.yearsUsed}년)` : '';
        return `${s.name} [${prof}]${yrs}`;
      })
      .join(', ');
    lines.push(`- ${label}: ${items}`);
  }
  return lines.join('\n');
}

function buildTargetPosition(pos: TargetPosition): string {
  const lines = [
    `## 지원 포지션`,
    `- 회사: ${pos.company}`,
    `- 포지션: ${pos.position}`,
  ];
  if (pos.jobDescription) {
    lines.push(`- JD:\n${truncate(pos.jobDescription, 1500)}`);
  }
  if (pos.requirements.length > 0) {
    lines.push(`- 주요 요구사항: ${pos.requirements.join(', ')}`);
  }
  if (pos.notes) {
    lines.push(`- 메모: ${pos.notes}`);
  }
  return lines.join('\n');
}

function buildExperience(exps: WorkExperience[]): string {
  const lines = ['## 경력 사항'];
  const recent = exps
    .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
    .slice(0, 3);

  for (const exp of recent) {
    const end = exp.endDate ? fmtYM(exp.endDate) : '재직중';
    lines.push(`### ${exp.company} | ${exp.role} (${fmtYM(exp.startDate)} ~ ${end})`);
    if (exp.description) lines.push(truncate(exp.description, 500));
    if (exp.techStack.length > 0) lines.push(`- 사용 기술: ${exp.techStack.join(', ')}`);
    if (exp.achievements.length > 0) {
      lines.push(`- 주요 성과:`);
      for (const a of exp.achievements.slice(0, 3)) {
        lines.push(`  - ${truncate(a, 200)}`);
      }
    }
  }
  if (exps.length > 3) lines.push(`\n(이외 ${exps.length - 3}개 경력 생략)`);
  return lines.join('\n');
}

function buildStrengthsWeaknesses(strengths: string[], weaknesses: string[]): string {
  const lines = ['## 자가 평가'];
  if (strengths.length > 0) lines.push(`- 강점: ${strengths.join(', ')}`);
  if (weaknesses.length > 0) lines.push(`- 약점(보완 필요): ${weaknesses.join(', ')}`);
  return lines.join('\n');
}

function fmtYM(d: Date): string {
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max) + '...';
}

function estimateTokens(text: string): number {
  const korean = (text.match(/[\u3131-\uD79D]/g) || []).length;
  return Math.ceil(korean * 2.5 + (text.length - korean) * 0.4);
}

function truncateToTokenBudget(text: string, max: number): string {
  if (estimateTokens(text) <= max) return text;
  const sections = text.split('\n\n');
  while (sections.length > 1 && estimateTokens(sections.join('\n\n')) > max) {
    sections.pop();
  }
  const result = sections.join('\n\n');
  if (estimateTokens(result) > max) {
    return result.slice(0, Math.floor(max / 2))
      + '\n\n(프로필이 토큰 제한으로 축약됨)';
  }
  return result;
}
```

### 2.2 필드별 프롬프트 매핑

| 프로필 필드 | 프롬프트 영향 | 우선순위 |
|-------------|-------------|---------|
| `name` | 인사 시 호칭 | 1 (필수) |
| `totalYearsExp` | 난이도 기준선 | 1 (필수) |
| `currentRole` | 질문 영역 포커스 | 1 (필수) |
| `skills[].proficiency` | 숙련도별 질문 깊이 | 2 (핵심) |
| `experiences[].techStack` | 기술 경험 검증 | 3 (최근 3개) |
| `experiences[].achievements` | 성과 기반 심화 질문 | 4 (축약 가능) |
| `targetPosition.requirements` | JD 기반 맞춤 질문 | 2 (선택 시) |
| `selfIntroduction` | "자기소개에서 ~를 언급" 질문 | 5 (여유 시) |
| `weaknesses[]` | 약점 보강 우선 출제 | 4 (여유 시) |
| `resumeText` | 이력서 기반 질문 | 7 (제거 대상) |

### 2.3 출력 예시

**입력 프로필 (요약):** 박정호, 5년차, 백엔드, Java[4], Spring Boot[4], PostgreSQL[3]

**생성된 컨텍스트:**
```text
## 지원자 기본 정보
- 이름: 박정호
- 총 경력: 5년
- 현재 직무: 백엔드 개발자
- 현재 회사: A테크

## 기술 스택
- 프로그래밍 언어: Java [숙련] (5년), Python [초급] (1년)
- 프레임워크: Spring Boot [숙련] (4년)
- 데이터베이스: PostgreSQL [중급] (3년)
- 인프라/DevOps: Docker [중급] (2년), Kubernetes [초급] (1년)

## 지원 포지션
- 회사: 네이버
- 포지션: 시니어 백엔드 개발자
- 주요 요구사항: Java/Kotlin 5년 이상, 대규모 트래픽 처리, MSA 경험

## 경력 사항
### A테크 | 백엔드 개발자 (2022.03 ~ 재직중)
이커머스 플랫폼 백엔드 개발, MSA 전환 프로젝트
- 사용 기술: Java, Spring Boot, PostgreSQL, Kafka, Docker
- 주요 성과:
  - 주문 시스템 MSA 전환으로 응답 시간 40% 개선
  - 일 평균 주문 처리량 50만건 달성

## 자가 평가
- 강점: 문제 해결 능력, 새로운 기술 학습 속도
- 약점(보완 필요): 대규모 시스템 설계 경험 부족
```

---

## 3. JSON 응답 스키마

### 3.1 질문 (Question)

```typescript
interface QuestionResponse {
  type: "question";
  content: string;      // 질문 전체 내용
  category: string;     // 주제 카테고리 (예: "Java", "Spring")
  difficulty: "junior" | "mid" | "senior";
  intent: string;       // 확인하려는 역량 (예: "동시성 프로그래밍 이해도")
}
```

예시:
```json
{
  "type": "question",
  "content": "안녕하세요, 박정호님. 이력서를 보니 A테크에서 MSA 전환 프로젝트에 참여하신 경험이 있으시네요.\n\nJava에서 synchronized와 ReentrantLock의 차이점을 설명하고, 각각 어떤 상황에서 적절한지 말씀해 주세요.",
  "category": "Java",
  "difficulty": "mid",
  "intent": "Java 동시성 메커니즘 이해도"
}
```

### 3.2 평가 (Evaluation)

```typescript
interface EvaluationResponse {
  type: "evaluation";
  score: number;              // 1-10
  feedback: string;           // 상세 피드백
  modelAnswer: string;        // 모범 답안
  strengths: string[];        // 강점
  weaknesses: string[];       // 약점
  followUpSuggestion?: string; // 꼬리질문 제안
}
```

예시:
```json
{
  "type": "evaluation",
  "score": 7,
  "feedback": "synchronized와 ReentrantLock의 기본 차이를 정확히 설명하셨습니다. tryLock과 공정성 설정을 언급한 점이 좋았습니다. 다만 실무 활용 사례가 부족합니다.",
  "modelAnswer": "synchronized는 JVM 내장 키워드로 사용이 간편하고 자동 해제됩니다. ReentrantLock은 tryLock() 타임아웃, 공정성 옵션, Condition 객체를 제공합니다. 단순 동기화는 synchronized, 세밀한 제어가 필요하면 ReentrantLock을 사용합니다.",
  "strengths": ["핵심 차이점 정확히 이해", "ReentrantLock 고급 기능 인지"],
  "weaknesses": ["실무 활용 사례 부족", "Java 6 이후 성능 최적화 미언급"],
  "followUpSuggestion": "A테크에서 동시성 이슈를 경험한 적이 있나요?"
}
```

### 3.3 꼬리질문 (Follow-up)

```typescript
interface FollowUpResponse {
  type: "followup";
  content: string;   // 꼬리질문 내용
  context: string;   // 질문 맥락/이유
}
```

예시:
```json
{
  "type": "followup",
  "content": "MSA 전환 시 분산 트랜잭션 문제는 어떻게 처리하셨나요? 주문 생성과 재고 차감이 다른 서비스에 있을 때 데이터 정합성을 어떻게 보장하셨는지 설명해 주세요.",
  "context": "MSA 전환 경험 언급했으나 분산 트랜잭션 처리 깊이를 확인하기 위함"
}
```

### 3.4 세션 요약 (Summary)

```typescript
interface SummaryResponse {
  type: "summary";
  totalScore: number;                    // 전체 평균 (소수점 1자리)
  topicScores: Record<string, number>;   // 주제별 평균
  strengths: string[];                   // 강점 3-5개
  areasToImprove: string[];              // 개선점 3-5개
  recommendations: string[];            // 학습 추천 (우선순위 태그)
}
```

예시:
```json
{
  "type": "summary",
  "totalScore": 7.2,
  "topicScores": {"Java": 8.0, "Spring": 6.5, "System Design": 7.0},
  "strengths": [
    "Java 핵심 개념에 대한 탄탄한 이해",
    "MSA 전환 경험 기반 실무 사례 설명이 구체적",
    "문제 해결 과정을 논리적으로 설명하는 능력"
  ],
  "areasToImprove": [
    "Spring Security 내부 동작 원리 이해 부족",
    "대규모 트래픽 캐싱 전략 경험 필요",
    "DB 인덱스 최적화 실무 경험 보충 필요"
  ],
  "recommendations": [
    "[높음] Spring Security 공식 문서 Architecture 섹션 정독",
    "[높음] 시스템 디자인 인터뷰 준비 - 캐싱, 로드밸런싱",
    "[중간] Redis 캐싱 패턴 학습 및 사이드 프로젝트 적용"
  ]
}
```

### 3.5 일괄 평가 (Batch Evaluation)

```typescript
interface BatchEvaluationResponse {
  type: "batch_evaluation";
  evaluations: Array<{
    questionIndex: number;   // 0-based
    score: number;           // 1-10
    feedback: string;
    modelAnswer: string;
    strengths: string[];
    weaknesses: string[];
  }>;
}
```

### 3.6 JSON 파싱 전략

```typescript
// src/lib/ai/response-parser.ts

type AIResponse =
  | QuestionResponse
  | EvaluationResponse
  | FollowUpResponse
  | SummaryResponse
  | BatchEvaluationResponse;

/**
 * AI 스트리밍 응답에서 JSON 객체를 추출 및 파싱
 * - 여러 JSON 객체가 줄바꿈으로 구분될 수 있음 (즉시 평가 모드)
 * - 코드 블록으로 감싸져 있을 수 있음
 */
export function parseAIResponse(rawText: string): AIResponse[] {
  const results: AIResponse[] = [];
  let cleaned = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  const jsonStrings = extractJsonObjects(cleaned);

  for (const str of jsonStrings) {
    try {
      const parsed = JSON.parse(str);
      if (parsed.type && validateResponse(parsed)) {
        results.push(parsed);
      }
    } catch (e) {
      console.warn('[PARSER] JSON parse failed:', str.slice(0, 100));
    }
  }
  return results;
}

function extractJsonObjects(text: string): string[] {
  const objects: string[] = [];
  let depth = 0, start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') { if (depth === 0) start = i; depth++; }
    else if (text[i] === '}') {
      depth--;
      if (depth === 0 && start !== -1) { objects.push(text.slice(start, i + 1)); start = -1; }
    }
  }
  return objects;
}

function validateResponse(obj: any): boolean {
  switch (obj.type) {
    case 'question':
      return typeof obj.content === 'string' && typeof obj.category === 'string';
    case 'evaluation':
      return typeof obj.score === 'number' && obj.score >= 1 && obj.score <= 10;
    case 'followup':
      return typeof obj.content === 'string' && typeof obj.context === 'string';
    case 'summary':
      return typeof obj.totalScore === 'number' && typeof obj.topicScores === 'object';
    case 'batch_evaluation':
      return Array.isArray(obj.evaluations);
    default:
      return false;
  }
}
```

---

## 4. 평가 기준 상세

### 4.1 10점 척도 정의

| 점수 범위 | 등급 | 설명 |
|-----------|------|------|
| **1-2점** | 불충분 | 질문을 이해하지 못했거나 완전히 틀린 답변. 핵심 개념 자체를 모름. |
| **3-4점** | 미흡 | 기본 개념은 알지만 정확하지 않음. 핵심을 놓치거나 중요한 오류 포함. |
| **5-6점** | 보통 | 기본적인 이해는 있으나 깊이 부족. 정의는 맞지만 왜/어떻게에 대한 설명이 약함. |
| **7-8점** | 우수 | 정확하고 체계적인 답변. 개념 이해가 확실하나 실무 적용 사례가 부족하거나 일부 누락. |
| **9-10점** | 탁월 | 정확하고 깊이 있으며 실무 경험까지 녹여낸 답변. 트레이드오프 분석, 대안 제시 포함. |

### 4.2 평가 차원 (5개)

| 차원 | 설명 | 평가 관점 |
|------|------|----------|
| **정확성** (Accuracy) | 기술적으로 정확한가 | 틀린 정보 없는지, 핵심 개념을 정확히 설명하는지 |
| **깊이** (Depth) | 단순 암기를 넘어 원리를 이해하는가 | why/how를 설명하는지, 내부 동작을 아는지 |
| **구조성** (Structure) | 논리적으로 구조화되었는가 | 답변 흐름이 체계적인지, 분류/정리 능력 |
| **실무 적용** (Practical) | 실무에서 어떻게 사용하는지 아는가 | 실제 프로젝트 경험, 구체적 사례, 트레이드오프 |
| **커뮤니케이션** (Communication) | 명확하게 전달하는가 | 간결한 설명, 비유 활용, 질문 의도 파악 |

### 4.3 난이도별 차원 가중치

| 차원 | Junior | Mid | Senior |
|------|--------|-----|--------|
| 정확성 | **35%** | 25% | 20% |
| 깊이 | 15% | **25%** | **25%** |
| 구조성 | 20% | 20% | 15% |
| 실무 적용 | 10% | **20%** | **30%** |
| 커뮤니케이션 | 20% | 10% | 10% |

### 4.4 평가 프롬프트에 삽입하는 기준 텍스트

```text
## 평가 기준

다음 5개 차원으로 답변을 평가하세요:

1. **정확성** (가중치: {{ACCURACY_WEIGHT}}%)
   - 기술적으로 틀린 내용이 없는가?
   - 핵심 개념을 정확히 설명했는가?
   - 오해의 소지가 있는 표현은 없는가?

2. **깊이** (가중치: {{DEPTH_WEIGHT}}%)
   - 단순 정의를 넘어 원리를 설명했는가?
   - 내부 동작 방식을 이해하고 있는가?
   - "왜 그런지"를 설명할 수 있는가?

3. **구조성** (가중치: {{STRUCTURE_WEIGHT}}%)
   - 답변이 논리적으로 구조화되어 있는가?
   - 핵심 포인트를 먼저 말하고 상세를 뒤에 붙이는가?
   - 분류, 비교, 정리가 체계적인가?

4. **실무 적용** (가중치: {{PRACTICAL_WEIGHT}}%)
   - 실제 프로젝트에서의 활용 경험을 언급했는가?
   - 구체적인 사례나 수치를 제시했는가?
   - 트레이드오프를 이해하고 있는가?

5. **커뮤니케이션** (가중치: {{COMMUNICATION_WEIGHT}}%)
   - 질문 의도를 정확히 파악했는가?
   - 설명이 간결하고 명확한가?
   - 비유나 예시를 적절히 활용했는가?

## 점수 기준

- 1-2점 (불충분): 질문을 이해하지 못했거나 완전히 틀린 답변
- 3-4점 (미흡): 기본 개념은 알지만 정확하지 않거나 핵심을 놓침
- 5-6점 (보통): 기본 이해는 있으나 깊이 부족, 정의만 맞고 원리 설명 부족
- 7-8점 (우수): 정확하고 체계적, 실무 적용 사례가 일부 부족
- 9-10점 (탁월): 정확하고 깊이 있으며 실무 경험과 트레이드오프 분석 포함
```

### 4.5 가중치 삽입 함수

```typescript
// src/lib/ai/evaluation-weights.ts

type Difficulty = 'junior' | 'mid' | 'senior';

interface DimensionWeights {
  accuracy: number;
  depth: number;
  structure: number;
  practical: number;
  communication: number;
}

const WEIGHTS: Record<Difficulty, DimensionWeights> = {
  junior:  { accuracy: 35, depth: 15, structure: 20, practical: 10, communication: 20 },
  mid:     { accuracy: 25, depth: 25, structure: 20, practical: 20, communication: 10 },
  senior:  { accuracy: 20, depth: 25, structure: 15, practical: 30, communication: 10 },
};

export function getEvaluationCriteriaPrompt(difficulty: Difficulty): string {
  const w = WEIGHTS[difficulty];
  return EVALUATION_CRITERIA_TEMPLATE
    .replace('{{ACCURACY_WEIGHT}}', String(w.accuracy))
    .replace('{{DEPTH_WEIGHT}}', String(w.depth))
    .replace('{{STRUCTURE_WEIGHT}}', String(w.structure))
    .replace('{{PRACTICAL_WEIGHT}}', String(w.practical))
    .replace('{{COMMUNICATION_WEIGHT}}', String(w.communication));
}
```

### 4.6 점수별 평가 예시

**질문:** "Java에서 HashMap과 ConcurrentHashMap의 차이를 설명해 주세요."

**3점 답변 예시:**
> "HashMap은 동기화가 안 되고 ConcurrentHashMap은 동기화가 됩니다."

평가: 맞지만 너무 단순. 어떻게 동기화되는지, 왜 Hashtable 대신 쓰는지 미설명.

**6점 답변 예시:**
> "HashMap은 thread-safe하지 않아 멀티스레드 환경에서 문제가 됩니다. ConcurrentHashMap은 세그먼트 단위로 락을 걸어 동시성을 지원합니다. Hashtable은 전체 락이라 느리고 ConcurrentHashMap이 성능이 더 좋습니다."

평가: 기본 이해가 있으나, Java 8 이후 구현 변경(Node 단위 CAS)을 모르고, 실무 활용 사례 없음.

**9점 답변 예시:**
> "HashMap은 single-thread 환경용으로, 멀티스레드에서 race condition이 발생합니다. ConcurrentHashMap은 Java 7까지 Segment 기반 락이었으나 Java 8부터 Node 단위 CAS + synchronized로 변경되어 lock granularity가 더 세밀해졌습니다. 실무에서는 로컬 캐시나 thread-safe한 카운터에 ConcurrentHashMap을 사용했고, computeIfAbsent로 원자적 연산도 활용했습니다. 다만 복합 연산의 원자성이 필요하면 별도 동기화가 필요합니다."

평가: 정확하고, 버전별 변화도 알며, 실무 경험과 주의사항까지 언급.

---

## 5. 꼬리질문 규칙

### 5.1 꼬리질문 트리거 조건

```text
## 꼬리질문 규칙

다음 조건에 해당하면 꼬리질문을 합니다:

### 1. 답변 품질 기반 트리거
- **피상적 답변**: 정의만 말하고 원리를 설명하지 않은 경우
  -> "좋습니다. 그러면 왜 그런 방식으로 동작하는지 조금 더 설명해 주시겠어요?"
- **불완전한 답변**: 핵심 요소 중 일부만 언급한 경우
  -> "맞습니다. 추가로 ~에 대해서도 말씀해 주시겠어요?"
- **모호한 답변**: 구체성이 부족한 경우
  -> "조금 더 구체적으로 설명해 주시겠어요? 예를 들어 ~한 상황에서는 어떻게 하시겠어요?"

### 2. 깊이 탐색 트리거
- **잘 답변한 경우**: 기본을 넘어 심화 주제를 탐색
  -> "잘 설명해 주셨습니다. 그렇다면 ~한 상황에서는 어떻게 달라질까요?"
- **트레이드오프 확인**: 선택의 근거를 심화 탐색
  -> "~를 선택하셨다고 했는데, 다른 대안과 비교했을 때 장단점은 무엇인가요?"

### 3. 프로필 기반 트리거
- 경력에 관련 기술/프로젝트 경험이 있는 경우
  -> "이력서에서 ~프로젝트를 하셨다고 했는데, 그때 ~한 문제를 경험하신 적이 있나요?"
- 약점으로 등록된 영역의 질문인 경우
  -> 해당 영역에서 더 깊은 질문으로 약점을 정확히 파악

### 4. 시나리오 기반 트리거
- 이론적 답변만 한 경우 실무 시나리오 제시
  -> "실제로 ~한 상황이 발생했다고 가정하면, 어떤 순서로 접근하시겠어요?"
```

### 5.2 꼬리질문 깊이 제한

```text
## 꼬리질문 깊이 제한

- 최대 깊이: 3단계 (원래 질문 포함)
- 1단계: 원래 질문에 대한 답변 확인
- 2단계: 첫 번째 꼬리질문 (심화/명확화)
- 3단계: 두 번째 꼬리질문 (최종 확인) - 이후 반드시 새 주제로 전환

깊이별 질문 성격:
- 1단계 -> 2단계: 명확화 또는 심화 ("왜?", "어떻게?", "예를 들면?")
- 2단계 -> 3단계: 시나리오 또는 경험 ("실제로 ~한 상황에서는?", "~를 경험하셨다면?")
```

### 5.3 꼬리질문 유형별 프롬프트 패턴

| 유형 | 트리거 | 프롬프트 패턴 |
|------|--------|-------------|
| **명확화** | 모호하거나 불완전한 답변 | "~라고 하셨는데, 좀 더 구체적으로 설명해 주시겠어요?" |
| **심화** | 정확하지만 깊이 부족 | "잘 설명해 주셨습니다. 그렇다면 ~는 어떻게 되나요?" |
| **경험** | 프로필에 관련 경험 존재 | "~에서 ~를 하셨다고 했는데, 그때 ~한 문제는 없었나요?" |
| **시나리오** | 이론만 답변, 실무 검증 필요 | "만약 ~한 상황이 발생한다면 어떻게 대처하시겠어요?" |
| **비교** | 하나만 언급, 대안 비교 필요 | "~를 선택하셨는데, ~와 비교했을 때 장단점은요?" |
| **반론** | 확신 있는 답변, 견고함 검증 | "~라는 의견도 있는데, 이에 대해서는 어떻게 생각하세요?" |

### 5.4 프로필 기반 꼬리질문 매핑

```typescript
// src/lib/ai/followup-triggers.ts

interface FollowUpTrigger {
  condition: string;        // 프로필 조건
  topicMatch: string[];     // 매칭되는 주제
  promptTemplate: string;   // 꼬리질문 템플릿
}

const PROFILE_FOLLOWUP_TRIGGERS: FollowUpTrigger[] = [
  {
    condition: "경력에 MSA 관련 키워드 존재",
    topicMatch: ["MSA", "System Design", "Spring Cloud"],
    promptTemplate: "이전 프로젝트에서 MSA를 경험하셨다고 하셨는데, 서비스 간 통신 방식으로 무엇을 사용하셨나요? 동기(REST)와 비동기(메시지 큐)의 선택 기준은 무엇이었나요?"
  },
  {
    condition: "경력에 대규모 트래픽 관련 성과 존재",
    topicMatch: ["System Design", "Performance", "Database"],
    promptTemplate: "일 {{N}}건의 트래픽을 처리하셨다고 했는데, 그 규모에서 가장 큰 병목 지점은 어디였고 어떻게 해결하셨나요?"
  },
  {
    condition: "기술 스택에 Kafka/RabbitMQ 존재",
    topicMatch: ["MSA", "Architecture", "Backend"],
    promptTemplate: "메시지 큐를 사용하신 경험이 있으시다면, 메시지 유실 방지를 위해 어떤 전략을 사용하셨나요? exactly-once 처리는 어떻게 보장하셨나요?"
  },
  {
    condition: "기술 스택에 Redis 존재",
    topicMatch: ["Database", "Performance", "Backend"],
    promptTemplate: "Redis를 사용하신 경험이 있으시다면, 캐시 일관성(Cache Consistency) 문제는 어떻게 처리하셨나요? 캐시 무효화 전략은 무엇을 사용하셨나요?"
  },
  {
    condition: "약점에 '설계' 또는 '아키텍처' 관련 키워드",
    topicMatch: ["System Design", "Architecture"],
    promptTemplate: "스스로 시스템 설계 경험이 부족하다고 하셨는데, 만약 새로운 서비스를 처음부터 설계한다면 어떤 점들을 가장 먼저 고려하시겠어요?"
  },
];

/**
 * 프로필과 현재 주제를 기반으로 적용 가능한 꼬리질문 트리거 반환
 */
export function getApplicableTriggers(
  profile: FullProfile,
  currentTopic: string
): string[] {
  // 경력 키워드 추출
  const expKeywords = profile.experiences
    .flatMap(e => [...e.techStack, e.description || '', ...e.achievements])
    .join(' ').toLowerCase();

  const skillNames = profile.skills.map(s => s.name.toLowerCase());
  const weaknessText = profile.weaknesses.join(' ').toLowerCase();

  return PROFILE_FOLLOWUP_TRIGGERS
    .filter(trigger => {
      if (!trigger.topicMatch.some(t =>
        currentTopic.toLowerCase().includes(t.toLowerCase())
      )) return false;

      const cond = trigger.condition.toLowerCase();
      if (cond.includes('msa') && expKeywords.includes('msa')) return true;
      if (cond.includes('트래픽') && expKeywords.match(/\d+만?\s*(건|tps|qps)/)) return true;
      if (cond.includes('kafka') && skillNames.some(s => ['kafka','rabbitmq'].includes(s))) return true;
      if (cond.includes('redis') && skillNames.includes('redis')) return true;
      if (cond.includes('약점') && weaknessText.match(/설계|아키텍처|architecture/)) return true;
      return false;
    })
    .map(t => t.promptTemplate);
}
```

---

## 6. 난이도별 프롬프트 차이

### 6.1 난이도별 시스템 프롬프트 삽입문

#### Junior (주니어)

```text
## 난이도: 주니어 (Junior)

이 면접은 주니어 레벨 (0-2년차) 지원자를 대상으로 합니다.

질문 방향:
- 기본 개념과 정의를 정확히 알고 있는지 확인합니다.
- "~이 무엇인지 설명해 주세요", "~의 차이점은?" 형태의 질문을 합니다.
- 간단한 코드 예시나 기본적인 동작 원리를 물어봅니다.
- 복잡한 설계나 트레이드오프보다는 기초 이해에 집중합니다.
- 모르는 것이 있으면 힌트를 주고 학습 방향을 안내합니다.

질문 예시:
- "Java에서 인터페이스와 추상 클래스의 차이점은 무엇인가요?"
- "HTTP GET과 POST의 차이를 설명해 주세요."
- "트랜잭션의 ACID 속성에 대해 설명해 주세요."

톤앤매너:
- 친근하고 격려하는 톤을 사용합니다.
- 틀려도 "아쉽지만"이 아니라 "좋은 시도입니다. 사실은 ~"로 안내합니다.
- 답변 후 "잘 하셨습니다", "기본기가 탄탄하시네요" 등의 격려를 합니다.
```

#### Mid (미들)

```text
## 난이도: 미들 (Mid-level)

이 면접은 미들 레벨 (3-5년차) 지원자를 대상으로 합니다.

질문 방향:
- 개념 이해를 넘어 설계 결정과 트레이드오프를 물어봅니다.
- "왜 ~를 선택하셨나요?", "~와 비교했을 때 장단점은?" 형태입니다.
- 실무 시나리오를 제시하고 접근 방법을 물어봅니다.
- 프레임워크의 내부 동작 원리와 설계 철학을 확인합니다.
- 디버깅 경험, 성능 이슈 해결 경험을 확인합니다.

질문 예시:
- "JPA의 N+1 문제가 무엇이고, 어떻게 해결하셨나요?"
- "Redis를 캐시로 도입할 때 고려해야 할 사항들은?"
- "API 응답 시간이 갑자기 느려졌을 때 어떤 순서로 원인을 찾으시겠어요?"

톤앤매너:
- 전문적이면서 동료 개발자와 대화하는 톤입니다.
- 경험 기반 답변을 유도합니다.
- 깊이 있는 답변에는 인정을, 부족한 부분에는 구체적 피드백을 합니다.
```

#### Senior (시니어)

```text
## 난이도: 시니어 (Senior)

이 면접은 시니어 레벨 (6년차 이상) 지원자를 대상으로 합니다.

질문 방향:
- 아키텍처 설계, 시스템 디자인, 기술 의사결정 역량을 평가합니다.
- "~를 설계한다면 어떻게 접근하시겠어요?", "~의 한계를 어떻게 극복하셨나요?" 형태입니다.
- 대규모 시스템, 복잡한 문제, 조직적 영향을 고려한 답변을 기대합니다.
- 멘토링, 코드 리뷰, 기술 표준 수립 경험을 확인합니다.
- 최신 기술 트렌드에 대한 비판적 시각을 물어봅니다.

질문 예시:
- "초당 10만 건의 요청을 처리하는 주문 시스템을 설계한다면 어떤 구조로 하시겠어요?"
- "모놀리스에서 MSA로 전환할 때 가장 어려운 점은 무엇이고, 어떤 전략을 취하시겠어요?"
- "주니어 개발자가 잘못된 설계 방향을 제안했을 때 어떻게 피드백하시겠어요?"

톤앤매너:
- 동등한 전문가 간 기술 토론 형태입니다.
- 답변의 논리적 근거와 경험 기반의 깊이를 기대합니다.
- 단순 정답/오답이 아닌 사고방식과 접근법을 평가합니다.
```

### 6.2 난이도와 숙련도 교차 규칙

```text
## 난이도-숙련도 교차 조정 규칙

지원자의 기술 스택 숙련도와 면접 난이도 설정이 다를 수 있습니다.
이 경우 다음 규칙을 적용합니다:

### 규칙 1: 숙련도가 난이도보다 낮은 경우
- 예: 시니어 난이도 면접인데 Kubernetes 숙련도가 1(입문)인 경우
- 해당 기술에 대해서는 난이도를 낮춰서 질문합니다.
- "Kubernetes는 입문 단계이시네요. 기본적인 질문부터 시작하겠습니다."

### 규칙 2: 숙련도가 난이도보다 높은 경우
- 예: 주니어 난이도 면접인데 Java 숙련도가 5(전문가)인 경우
- 해당 기술에 대해서는 더 깊은 질문을 해도 됩니다.
- "Java는 전문가 수준이시군요. 조금 더 깊은 질문을 드리겠습니다."

### 규칙 3: 매핑 테이블
| 숙련도 \ 난이도 | Junior | Mid | Senior |
|:---:|:---:|:---:|:---:|
| 1 (입문) | 기초 정의 | 기초 정의 | 기초 + 학습 계획 |
| 2 (초급) | 기초 + 간단 예시 | 기초 + 원리 | 기초 + 왜 학습했는지 |
| 3 (중급) | 활용 + 비교 | 활용 + 트레이드오프 | 설계 참여 관점 |
| 4 (숙련) | 심화 + 내부 동작 | 설계 결정 + 경험 | 아키텍처 + 리더십 |
| 5 (전문가) | 심화 + 멘토 관점 | 설계 + 최적화 | 전략 + 비전 |
```

---

## 7. 컨텍스트 관리 전략

### 7.1 토큰 예산 배분

```
전체 컨텍스트 윈도우: 약 200,000 토큰 (claude-sonnet-4 기준)
실질 사용 가능: 약 150,000 토큰 (응답용 예약 제외)

구성요소별 예산:
+----------------------------------+----------+--------+
| 구성요소                          | 예상 토큰 | 비율   |
+----------------------------------+----------+--------+
| 시스템 프롬프트 (페르소나)          | 800      | 0.5%   |
| 난이도별 지시문                    | 400      | 0.3%   |
| 평가 기준                         | 600      | 0.4%   |
| 주제별 프롬프트 힌트               | 300      | 0.2%   |
| 프로필 컨텍스트                    | 2,000    | 1.3%   |
| JD/지원 포지션                    | 1,000    | 0.7%   |
| 대화 히스토리 (질문+답변+평가)      | ~30,000  | 20%    |
| 응답 생성용 예약                   | 4,096    | 2.7%   |
+----------------------------------+----------+--------+
| 합계 (일반적 세션)                 | ~40,000  | 27%    |
+----------------------------------+----------+--------+

* 충분한 여유가 있으므로, 보통 20-30문항 세션까지 문제없음
```

### 7.2 대화 히스토리 슬라이딩 윈도우

```typescript
// src/lib/ai/context-manager.ts

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  tokenCount: number;
}

const MAX_HISTORY_TOKENS = 30_000;
const MIN_RECENT_MESSAGES = 6;  // 최소 최근 3 Q&A 쌍

/**
 * 대화 히스토리를 토큰 예산 내로 관리
 *
 * 전략:
 * 1. 최근 메시지는 항상 유지 (최소 6개 = 3 Q&A)
 * 2. 초과 시 오래된 메시지부터 요약으로 대체
 * 3. 요약도 초과하면 제거
 */
export function buildConversationHistory(
  messages: ConversationMessage[]
): { messages: ConversationMessage[]; summary?: string } {

  const totalTokens = messages.reduce((sum, m) => sum + m.tokenCount, 0);

  // 예산 내면 전체 유지
  if (totalTokens <= MAX_HISTORY_TOKENS) {
    return { messages };
  }

  // 최근 메시지 보존
  const recent = messages.slice(-MIN_RECENT_MESSAGES);
  const older = messages.slice(0, -MIN_RECENT_MESSAGES);

  // 오래된 메시지 요약
  const summary = summarizeOlderMessages(older);

  return {
    messages: recent,
    summary,
  };
}

function summarizeOlderMessages(msgs: ConversationMessage[]): string {
  // 질문-답변 쌍을 추출하여 요약
  const pairs: string[] = [];
  for (let i = 0; i < msgs.length; i += 2) {
    const q = msgs[i]?.content.slice(0, 100) || '';
    const a = msgs[i + 1]?.content.slice(0, 100) || '';
    if (q) pairs.push(`Q: ${q}... / A: ${a}...`);
  }
  return `[이전 대화 요약 - ${pairs.length}개 Q&A]\n${pairs.join('\n')}`;
}
```

### 7.3 컨텍스트 초과 시 단계적 축소

```
컨텍스트 초과 시 축소 단계:

1단계: 프로필의 resumeText 제거
2단계: 프로필의 selfIntroduction 축약 (앞 500자만)
3단계: 경력 사항을 최근 2개로 제한, achievements 제거
4단계: 오래된 대화 히스토리 요약으로 대체
5단계: 평가 결과(modelAnswer)를 히스토리에서 제거
6단계: 주제별 프롬프트 힌트 제거
7단계: (최후) 대화 히스토리를 최근 3 Q&A만 유지
```

---

## 8. 주제별 프롬프트 힌트

### 8.1 힌트 구조

주제별 힌트는 기본 시스템 프롬프트에 추가되어 해당 주제에 특화된 질문을 유도합니다.

```typescript
// src/lib/ai/topic-hints.ts

const TOPIC_HINTS: Record<string, string> = {

  // === Backend ===

  "Java": `## 주제 힌트: Java
이 주제에서는 다음 영역을 중심으로 질문하세요:
- OOP 원칙 (SOLID, 캡슐화, 다형성, 상속 vs 합성)
- 컬렉션 프레임워크 (List, Set, Map 구현체별 특성, 시간복잡도)
- 동시성 (synchronized, Lock, Atomic, volatile, ExecutorService)
- JVM (GC 알고리즘, 메모리 구조, 클래스 로딩, JIT)
- Stream API / Optional / 함수형 프로그래밍
- Java 버전별 주요 변경사항 (8, 11, 17, 21)
- 예외 처리 전략, 제네릭, 리플렉션`,

  "Spring": `## 주제 힌트: Spring
이 주제에서는 다음 영역을 중심으로 질문하세요:
- Spring Core (IoC, DI, AOP, Bean 라이프사이클)
- Spring Boot (자동 설정, 스타터, 프로파일, Actuator)
- Spring MVC (DispatcherServlet, 인터셉터, 예외 핸들링)
- Spring Security (인증/인가 아키텍처, 필터 체인, JWT, OAuth2)
- Spring Data JPA (Repository, 쿼리 메서드, Specification, Auditing)
- Spring WebFlux (리액티브 프로그래밍, Mono/Flux, 백프레셔)
- 트랜잭션 관리 (@Transactional 전파, 격리 수준)`,

  "Database": `## 주제 힌트: Database
이 주제에서는 다음 영역을 중심으로 질문하세요:
- RDBMS 기본 (정규화, 반정규화, ERD 설계)
- SQL 최적화 (실행 계획, 인덱스 설계, 쿼리 튜닝)
- 트랜잭션 (ACID, 격리 수준, 데드락, MVCC)
- 인덱스 (B-Tree, Hash, Covering Index, 복합 인덱스)
- NoSQL (Redis, MongoDB, Elasticsearch 각각의 적합한 사용처)
- 대규모 데이터 처리 (파티셔닝, 샤딩, 레플리케이션)
- ORM (N+1, Lazy/Eager, 캐싱, Bulk 연산)`,

  "Infrastructure": `## 주제 힌트: Infrastructure
이 주제에서는 다음 영역을 중심으로 질문하세요:
- Docker (이미지 레이어, 멀티스테이지 빌드, 네트워크, 볼륨)
- Kubernetes (Pod, Service, Deployment, HPA, Ingress)
- CI/CD (파이프라인 설계, 배포 전략 Blue/Green/Canary/Rolling)
- AWS/GCP/Azure (주요 서비스, 아키텍처 패턴, 비용 최적화)
- 모니터링 (메트릭, 로깅, 트레이싱, 알림 설계)
- IaC (Terraform, CloudFormation)`,

  // === Frontend ===

  "React": `## 주제 힌트: React
이 주제에서는 다음 영역을 중심으로 질문하세요:
- React 핵심 (Virtual DOM, Reconciliation, Fiber Architecture)
- Hooks (useState, useEffect, useMemo, useCallback, useRef, 커스텀 훅)
- 상태 관리 (Context, Redux, Zustand, Recoil/Jotai)
- 렌더링 최적화 (React.memo, useMemo, useCallback, 코드 스플리팅)
- Server Components / Suspense / Concurrent Mode
- 테스트 (React Testing Library, 단위/통합 테스트)
- Next.js (SSR, SSG, ISR, App Router, Server Actions)`,

  "TypeScript": `## 주제 힌트: TypeScript
이 주제에서는 다음 영역을 중심으로 질문하세요:
- 타입 시스템 (유니온, 인터섹션, 제네릭, 조건부 타입)
- 고급 타입 (Mapped Types, Template Literal Types, infer)
- 타입 가드 (typeof, instanceof, in, 사용자 정의)
- 구조적 타이핑 vs 명목적 타이핑
- 타입 안전성 전략 (strict mode, unknown vs any, 타입 좁히기)
- d.ts, Declaration Merging, Module Augmentation`,

  // === Architecture ===

  "System Design": `## 주제 힌트: System Design
이 주제에서는 다음 영역을 중심으로 질문하세요:
- 확장성 (수평/수직 확장, 로드밸런싱, CDN)
- 가용성 (장애 허용, Circuit Breaker, Retry/Timeout)
- 캐싱 (전략, 일관성, TTL, Cache-Aside/Write-Through)
- 메시지 큐 (비동기 처리, 이벤트 소싱, CQRS)
- 데이터 저장소 선택 (SQL vs NoSQL vs 검색엔진)
- API 설계 (REST vs GraphQL vs gRPC, 버전 관리)
- 실제 시스템 설계 (URL 단축기, 피드 시스템, 채팅)`,

  "MSA": `## 주제 힌트: MSA (마이크로서비스)
이 주제에서는 다음 영역을 중심으로 질문하세요:
- 서비스 분리 기준 (도메인 경계, Bounded Context)
- 서비스 간 통신 (동기 REST/gRPC vs 비동기 메시지큐)
- 분산 트랜잭션 (Saga 패턴, 보상 트랜잭션, Outbox 패턴)
- 서비스 디스커버리, API Gateway, BFF
- 장애 전파 방지 (Circuit Breaker, Bulkhead, Timeout)
- 데이터 관리 (Database per Service, 이벤트 소싱)
- 모놀리스에서 MSA 전환 전략 (Strangler Fig)`,

  "Design Pattern": `## 주제 힌트: Design Pattern
이 주제에서는 다음 영역을 중심으로 질문하세요:
- 생성 패턴 (Singleton, Factory, Builder, Prototype)
- 구조 패턴 (Adapter, Decorator, Proxy, Facade)
- 행동 패턴 (Strategy, Observer, Template Method, Command)
- SOLID 원칙의 실무 적용
- 패턴의 장단점과 적용 시점
- 안티패턴과 리팩토링`,

  // === Behavioral ===

  "Behavioral": `## 주제 힌트: Behavioral (행동 면접)
이 주제에서는 다음 영역을 중심으로 질문하세요:
- 자기소개 (경력 요약, 핵심 강점, 지원 동기)
- 프로젝트 경험 (역할, 기술적 도전, 성과, 교훈)
- 갈등 해결 (팀원과의 의견 충돌, 해결 과정)
- 리더십 (멘토링, 코드 리뷰, 기술 의사결정)
- 실패 경험 (실수에서 배운 점, 개선 과정)
- 커리어 비전 (성장 방향, 관심 기술)

행동 면접은 STAR 기법(Situation-Task-Action-Result)으로 답변하도록 유도합니다.`,
};

/**
 * 선택된 주제 목록에 맞는 힌트를 결합하여 반환
 */
export function buildTopicHints(topics: string[]): string {
  const hints = topics
    .map(topic => TOPIC_HINTS[topic])
    .filter(Boolean);

  if (hints.length === 0) return '';
  return hints.join('\n\n');
}
```

### 8.2 힌트가 기본 프롬프트를 변형하는 방식

힌트는 기본 시스템 프롬프트 뒤에 추가됩니다. 기본 프롬프트의 행동 규칙은 유지하면서, 해당 주제에서 어떤 영역을 질문해야 하는지 구체적인 방향을 제공합니다.

```
[기본 페르소나 프롬프트]
+
[주제 힌트: 해당 영역의 구체적 질문 방향]
=
주제에 맞는 깊이 있는 질문 생성
```

---

## 9. 프롬프트 조합 흐름도

### 9.1 전체 조합 구조

```
+---------------------------------------------------------------+
|                    최종 시스템 프롬프트                          |
+---------------------------------------------------------------+
|                                                               |
|  1. 페르소나 프롬프트 (섹션 1.1)                                |
|     "당신은 10년 이상 경력의 시니어 개발자이자 기술 면접관..."      |
|                                                               |
|  2. 난이도별 지시문 (섹션 6.1)                                  |
|     "## 난이도: 미들 (Mid-level)..."                            |
|                                                               |
|  3. 평가 모드 지시문 (섹션 1.2 또는 1.3)                        |
|     "## 평가 모드: 즉시 평가..."                                |
|                                                               |
|  4. 평가 기준 (섹션 4.4, 가중치 삽입됨)                         |
|     "## 평가 기준..."                                          |
|                                                               |
|  5. 프로필 컨텍스트 (섹션 2.1 함수 출력)                        |
|     "## 지원자 기본 정보..."                                    |
|                                                               |
|  6. 주제별 힌트 (섹션 8.1)                                     |
|     "## 주제 힌트: Java..."                                    |
|                                                               |
|  7. 꼬리질문 규칙 (섹션 5.1)                                   |
|     "## 꼬리질문 규칙..."                                      |
|                                                               |
|  8. 난이도-숙련도 교차 규칙 (섹션 6.2)                          |
|     "## 난이도-숙련도 교차 조정 규칙..."                         |
|                                                               |
|  9. 응답 포맷 지시 (섹션 3의 JSON 스키마)                       |
|     "반드시 JSON 형식으로만 응답하세요..."                       |
|                                                               |
+---------------------------------------------------------------+

+---------------------------------------------------------------+
|                    메시지 배열 (messages)                       |
+---------------------------------------------------------------+
|                                                               |
|  [0] system: 위의 최종 시스템 프롬프트                           |
|                                                               |
|  [1] user: (첫 질문 생성 요청 OR 이전 대화 요약)                 |
|                                                               |
|  [...] assistant/user: 대화 히스토리                            |
|        (슬라이딩 윈도우 적용, 섹션 7.2)                         |
|                                                               |
|  [N] user: 현재 사용자 답변                                    |
|                                                               |
+---------------------------------------------------------------+
```

### 9.2 조합 함수

```typescript
// src/lib/ai/prompts.ts

import { buildProfileContext } from './profile-to-context';
import { getEvaluationCriteriaPrompt } from './evaluation-weights';
import { buildTopicHints } from './topic-hints';
import { buildConversationHistory } from './context-manager';

interface BuildPromptOptions {
  profile: FullProfile;
  session: InterviewSession & {
    questions: Question[];
    targetPosition?: TargetPosition | null;
  };
  action: 'question' | 'evaluate' | 'follow_up' | 'summary' | 'batch_evaluate';
}

// 각 프롬프트 조각의 조합 순서를 정의
const ASSEMBLY_ORDER = [
  'persona',           // 1. 기본 페르소나
  'difficulty',        // 2. 난이도 지시문
  'evaluationMode',    // 3. 평가 모드
  'evaluationCriteria',// 4. 평가 기준 (가중치 적용)
  'profileContext',    // 5. 프로필 컨텍스트
  'topicHints',        // 6. 주제별 힌트
  'followUpRules',     // 7. 꼬리질문 규칙
  'crossRules',        // 8. 난이도-숙련도 교차
  'formatInstructions',// 9. JSON 응답 포맷
] as const;

export function buildSystemPrompt(options: BuildPromptOptions): string {
  const { profile, session, action } = options;
  const parts: string[] = [];

  // 1. 페르소나
  parts.push(BASE_PERSONA_PROMPT);

  // 2. 난이도 지시문
  parts.push(getDifficultyPrompt(session.difficulty as Difficulty));

  // 3. 평가 모드 (action에 따라 다름)
  if (action === 'question' || action === 'follow_up') {
    parts.push(
      session.evaluationMode === 'immediate'
        ? IMMEDIATE_EVAL_PROMPT
        : AFTER_COMPLETE_EVAL_PROMPT
    );
  } else if (action === 'evaluate' || action === 'batch_evaluate') {
    parts.push(
      action === 'batch_evaluate'
        ? BATCH_EVALUATION_PROMPT
        : IMMEDIATE_EVAL_PROMPT
    );
  } else if (action === 'summary') {
    parts.push(SESSION_SUMMARY_PROMPT);
  }

  // 4. 평가 기준
  if (action !== 'summary') {
    parts.push(getEvaluationCriteriaPrompt(session.difficulty as Difficulty));
  }

  // 5. 프로필 컨텍스트
  parts.push(buildProfileContext(profile, session.targetPosition));

  // 6. 주제별 힌트
  const hints = buildTopicHints(session.topics);
  if (hints) parts.push(hints);

  // 7. 꼬리질문 규칙
  if (action === 'question' || action === 'follow_up') {
    parts.push(FOLLOWUP_RULES_PROMPT);
  }

  // 8. 난이도-숙련도 교차 규칙
  parts.push(CROSS_DIFFICULTY_RULES);

  // 9. 응답 포맷
  parts.push(getFormatInstructions(action));

  return parts.join('\n\n');
}

/**
 * 대화 히스토리 메시지 배열 구성
 */
export function buildMessageHistory(
  session: InterviewSession & { questions: Question[] },
  currentUserMessage: string,
  action: string
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  // 이전 질문-답변 히스토리 구성
  for (const q of session.questions) {
    // AI 질문
    messages.push({ role: 'assistant', content: q.content });
    // 사용자 답변 (있는 경우)
    if (q.userAnswer) {
      messages.push({ role: 'user', content: q.userAnswer });
    }
    // 꼬리질문이 있는 경우
    for (const fu of (q as any).followUps || []) {
      messages.push({ role: 'assistant', content: fu.content });
      if (fu.userAnswer) {
        messages.push({ role: 'user', content: fu.userAnswer });
      }
    }
  }

  // 현재 메시지 추가
  if (currentUserMessage) {
    messages.push({ role: 'user', content: currentUserMessage });
  }

  // 슬라이딩 윈도우 적용
  const managed = buildConversationHistory(
    messages.map(m => ({
      ...m,
      tokenCount: estimateTokens(m.content),
    }))
  );

  // 요약이 있으면 첫 메시지로 삽입
  const result: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  if (managed.summary) {
    result.push({ role: 'user', content: managed.summary });
  }
  for (const m of managed.messages) {
    result.push({ role: m.role, content: m.content });
  }

  return result;
}

function getFormatInstructions(action: string): string {
  switch (action) {
    case 'question':
    case 'follow_up':
      return '반드시 위에 명시된 JSON 형식으로만 응답하세요. JSON 외의 텍스트를 포함하지 마세요.';
    case 'evaluate':
      return '반드시 evaluation JSON 형식으로 응답하세요.';
    case 'batch_evaluate':
      return '반드시 batch_evaluation JSON 형식으로 응답하세요.';
    case 'summary':
      return '반드시 summary JSON 형식으로 응답하세요.';
    default:
      return '반드시 JSON 형식으로만 응답하세요.';
  }
}
```

### 9.3 조합 예시 (시나리오)

**시나리오:** 5년차 백엔드 개발자가 네이버 시니어 포지션에 지원, Java+Spring 주제, Mid 난이도, 즉시 평가 모드

**조합 결과 (요약):**
```
[시스템 프롬프트]
1. "당신은 10년+ 경력의 시니어 개발자 면접관입니다..."
2. "## 난이도: 미들 (Mid-level) - 설계 결정과 트레이드오프를 물어봅니다..."
3. "## 평가 모드: 즉시 평가 - 답변마다 평가 JSON + 질문 JSON..."
4. "## 평가 기준 - 정확성 25%, 깊이 25%, 구조성 20%, 실무 20%, 커뮤 10%..."
5. "## 지원자: 박정호, 5년차, Java[숙련], Spring Boot[숙련]..."
6. "## 주제 힌트: Java - OOP, 컬렉션, 동시성, JVM..."
   "## 주제 힌트: Spring - IoC, DI, AOP, Security..."
7. "## 꼬리질문 규칙 - 피상적 답변 시 심화, 최대 3단계..."
8. "## 난이도-숙련도 교차 - Java[숙련]+Mid = 설계 결정+경험..."
9. "반드시 JSON 형식으로만 응답하세요."

[메시지 배열]
user: "면접을 시작해 주세요." (첫 질문 요청)
```

---

## 부록: 상수 프롬프트 텍스트 참조

이 문서에서 정의한 모든 프롬프트 텍스트는 `src/lib/ai/prompts.ts` 파일에 TypeScript 상수로 구현됩니다. 각 상수는 다음과 같이 매핑됩니다:

| 상수명 | 문서 섹션 |
|--------|----------|
| `BASE_PERSONA_PROMPT` | 1.1 기본 페르소나 |
| `IMMEDIATE_EVAL_PROMPT` | 1.2 즉시 평가 모드 |
| `AFTER_COMPLETE_EVAL_PROMPT` | 1.3 종료 후 평가 모드 |
| `FIRST_QUESTION_PROMPT` | 1.4 첫 질문 생성 |
| `SESSION_SUMMARY_PROMPT` | 1.5 세션 요약 |
| `BATCH_EVALUATION_PROMPT` | 1.6 일괄 평가 |
| `EVALUATION_CRITERIA_TEMPLATE` | 4.4 평가 기준 텍스트 |
| `FOLLOWUP_RULES_PROMPT` | 5.1 꼬리질문 규칙 |
| `JUNIOR_DIFFICULTY_PROMPT` | 6.1 Junior |
| `MID_DIFFICULTY_PROMPT` | 6.1 Mid |
| `SENIOR_DIFFICULTY_PROMPT` | 6.1 Senior |
| `CROSS_DIFFICULTY_RULES` | 6.2 교차 규칙 |
| `TOPIC_HINTS` | 8.1 주제별 힌트 |
