# Phase 0: 사전 준비 (Week 1-3)

> **Last Updated:** 2026-02-06
> **Reviewed by Momus:** REVISE 6.5/10 → APPROVED (feedback incorporated)
>
> **상위 문서:** [monetization-strategy.md](./monetization-strategy.md)
> **목표:** 수익화 전환 전 기술 부채 해결, 법적 선행 요건 착수
> **기간:** 3주
> **선행 조건:** 없음 (첫 번째 Phase)
> **산출물:** 버그 제로, E2E 테스트 커버리지 확보, 통신판매업 신고 접수

---

## 목차

1. [Week 1: 질문 저장 버그 수정 + 토큰 로깅 검증](#week-1)
2. [Week 2: 스트리밍 안정화 + E2E 테스트 보강](#week-2)
3. [Week 3: 법적 선행 요건 + CI 파이프라인](#week-3)
4. [완료 기준](#완료-기준)
5. [Phase 1 핸드오프](#phase-1a-핸드오프)

---

## Week 1: 질문 저장 버그 수정 + 토큰 로깅 검증 {#week-1}

### 1.1 질문 저장 버그 수정 (P0)

> **참조:** [fix-question-saving.md](./fix-question-saving.md)
> **근본 원인:** 3가지 (프롬프트-파서 모순, questionIndex 미전송, 클라이언트 추적 부재)
> **CRITICAL (Momus):** 먼저 버그 존재 여부 확인 - 이미 수정되었을 가능성 있음

#### 1.1.0 버그 존재 여부 사전 확인

**작업 시작 전 필수 검증:**

```
[ ] 실제 면접 세션 진행하여 버그 재현 시도
    - 로그인 → 면접 시작 → 3개 이상 질문 진행 → 종료
    - /history 페이지에서 해당 세션 확인
    - Question 테이블 직접 조회: content 필드 존재 여부

[ ] 버그 존재 확인 시 → 1.1.1~1.1.4 수행
[ ] 버그 없음 확인 시 → 1.1 전체 스킵, Week 1 기간 단축
```

**검증 쿼리:**
```sql
-- 최근 세션의 질문 저장 상태 확인
SELECT
  q.id,
  q."orderIndex",
  LENGTH(q.content) as content_length,
  q.status,
  q."createdAt"
FROM "Question" q
WHERE q."sessionId" = (
  SELECT id FROM "InterviewSession"
  ORDER BY "createdAt" DESC LIMIT 1
)
ORDER BY q."orderIndex";
```

#### 1.1.1 서버 사이드 질문 자동 저장 로직 재작성

**파일:** `src/app/api/interview/stream/route.ts`

현재 문제:
- `prompts.ts`가 AI에게 "JSON 절대 포함하지 마세요"라고 지시
- `stream/route.ts`는 AI 응답에서 JSON 파싱 시도 → 항상 실패
- `questionIndex`가 클라이언트에서 전송되지 않음

해결 전략 (Option E: 대화 흐름 분석):
```typescript
// 서버에서 대화 흐름을 분석하여 질문/답변 쌍 자동 감지
// messages 배열의 assistant 메시지 수로 questionIndex 자동 산정

// finally 블록 내부
const assistantMessages = messages.filter(m => m.role === 'assistant');
const questionIndex = assistantMessages.length; // 현재 응답이 N번째 질문

// assistant 응답 전체를 질문 content로 저장
await prisma.question.upsert({
  where: {
    sessionId_orderIndex: { sessionId, orderIndex: questionIndex }
  },
  create: {
    sessionId,
    orderIndex: questionIndex,
    content: fullResponse,
    category: session.topics[0] || 'General',
    difficulty: session.difficulty,
    status: 'pending',
  },
  update: {
    content: fullResponse,
  }
});

// 세션의 questionCount 업데이트
await prisma.interviewSession.update({
  where: { id: sessionId },
  data: { questionCount: questionIndex + 1 }
});
```

#### 1.1.2 사용자 답변 자동 연결

**파일:** `src/app/api/interview/stream/route.ts`

```typescript
// 스트리밍 시작 전: 이전 질문에 사용자 답변 연결
const userMessages = messages.filter(m => m.role === 'user');
const lastUserMessage = userMessages[userMessages.length - 1];

if (lastUserMessage && questionIndex > 0) {
  // 이전 질문(questionIndex - 1)에 답변 연결
  await prisma.question.updateMany({
    where: {
      sessionId,
      orderIndex: questionIndex - 1,
      status: 'pending',
    },
    data: {
      userAnswer: lastUserMessage.content,
      status: 'answered',
      answeredAt: new Date(),
    }
  });
}
```

#### 1.1.3 세션 종료 상태 정리

**파일:** `src/app/api/interview/route.ts` (PATCH 핸들러)

```typescript
// 세션 종료 시 미답변 질문 정리
await prisma.question.updateMany({
  where: {
    sessionId,
    status: 'pending',
  },
  data: {
    status: 'skipped',
  }
});

// 세션 통계 업데이트
const questionStats = await prisma.question.aggregate({
  where: { sessionId },
  _count: true,
});

await prisma.interviewSession.update({
  where: { id: sessionId },
  data: {
    status: 'completed',
    completedAt: new Date(),
    questionCount: questionStats._count,
    endReason: body.endReason || 'user_ended',
  }
});
```

#### 1.1.4 테스트 항목

```
[ ] 면접 시작 → 첫 질문이 Question 테이블에 저장됨 (orderIndex=0)
[ ] 사용자 답변 전송 → 이전 질문의 userAnswer가 업데이트됨
[ ] 5개 질문 진행 → Question 5개, 모두 content 존재
[ ] 세션 종료 → 미답변 질문은 skipped, questionCount 정확
[ ] 히스토리 페이지에서 질문과 답변이 정상 표시됨
[ ] 기존 세션과의 하위 호환성 유지 (이전 데이터 깨지지 않음)
```

### 1.2 토큰 로깅 시스템 검증

> **참조:** `PLAN-token-logging.md` (이미 구현 완료)
> Phase 0에서는 구현 확인만 수행, userId/cost 확장은 Phase 3에서

#### 1.2.1 검증 항목

```
[ ] AIUsageLog 테이블에 레코드가 정상 생성되는지 확인
    - stream 엔드포인트: promptTokens, completionTokens 기록
    - evaluate 엔드포인트: 동일 확인
    - sessionId 연결 정상 여부
[ ] 어드민 대시보드에서 토큰 사용량 조회 가능 확인
    - /admin 페이지의 usage 탭 기능 동작
    - 일별/모델별 집계 정상
[ ] estimated 필드 정확도 확인
    - js-tiktoken 추정치 vs 실제 사용량 비교
    - 오차 20% 이내 확인
[ ] 에러 케이스 로깅 확인
    - AI 호출 실패 시 success=false, errorMessage 기록
    - durationMs 측정 정확도
```

#### 1.2.2 비용 추적 기초 데이터 수집

```typescript
// 현재 AIUsageLog 데이터로 기초 비용 분석 SQL
SELECT
  model,
  COUNT(*) as request_count,
  AVG("promptTokens") as avg_prompt,
  AVG("completionTokens") as avg_completion,
  SUM("totalTokens") as total_tokens
FROM "AIUsageLog"
WHERE "createdAt" > NOW() - INTERVAL '7 days'
GROUP BY model;

// 결과로 실제 질문당 평균 토큰 수 확인
// -> master plan의 "입력 ~2000, 출력 ~800" 가정 검증
```

---

## Week 2: 스트리밍 안정화 + E2E 테스트 보강 {#week-2}

### 2.1 스트리밍/에러 핸들링 안정화

> **참조:** [streaming-error-handling.md](./streaming-error-handling.md)

#### 2.1.1 미구현 항목 확인 및 우선순위

```
[확인] 스트리밍 중 연결 끊김 처리
  - AbortController 기반 정리 로직
  - 부분 응답 저장 (질문 저장 버그 수정과 연계)

[확인] AI Proxy 타임아웃 처리
  - 30초 타임아웃 설정
  - 타임아웃 시 사용자 알림 메시지

[확인] 재시도 로직
  - 네트워크 에러 시 자동 재시도 (최대 2회)
  - 재시도 시 중복 질문 생성 방지 (upsert 사용)

[확인] 에러 코드 분류
  - AI_TIMEOUT, AI_RATE_LIMIT, AI_ERROR, NETWORK_ERROR
  - 사용자 친화적 에러 메시지 매핑
```

#### 2.1.2 프로덕션 필수 안정성 항목

```typescript
// 스트리밍 연결 끊김 시 graceful cleanup
const abortController = new AbortController();

request.signal.addEventListener('abort', () => {
  abortController.abort();
  // 부분 응답이 있으면 저장
  if (fullResponse.length > 50) {
    savePartialQuestion(sessionId, questionIndex, fullResponse);
  }
});
```

### 2.2 E2E 테스트 보강

> **현재 상태:** Playwright 1.58.1 설치됨, 기본 테스트 존재
> **CRITICAL (Momus):** `tests/e2e/` 디렉토리 생성 필요

#### 2.2.0 E2E 테스트 환경 구축

**사전 작업 (tests/e2e/ 디렉토리 없음):**

```bash
# 디렉토리 구조 생성
mkdir -p tests/e2e

# Playwright 설정 파일 확인/생성
npx playwright install --with-deps chromium

# 환경 변수 설정 (.env.test)
DATABASE_URL=postgresql://test:test@localhost:5432/interview_test
JWT_SECRET=test-secret-for-e2e
TEST_PASSWORD=your_test_password
```

**playwright.config.ts 확인:**
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // 면접 세션 순차 실행 필요
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // 데이터베이스 충돌 방지
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },
});
```

#### 2.2.1 핵심 플로우 테스트 시나리오

```typescript
// tests/e2e/interview-flow.spec.ts

test.describe('면접 핵심 플로우', () => {
  test('로그인 → 면접 시작 → 질문 5개 → 답변 → 종료 → 히스토리 확인', async ({ page }) => {
    // 1. 로그인
    await page.goto('/login');
    await page.fill('[name="password"]', process.env.TEST_PASSWORD!);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');

    // 2. 면접 시작
    await page.click('[data-testid="start-interview"]');
    await page.selectOption('[data-testid="topic-select"]', 'JavaScript');
    await page.selectOption('[data-testid="difficulty-select"]', 'mid');
    await page.click('[data-testid="begin-interview"]');

    // 3. 첫 질문 수신 대기
    await expect(page.locator('[data-testid="ai-message"]')).toBeVisible({ timeout: 30000 });

    // 4. 답변 입력 및 전송
    await page.fill('[data-testid="answer-input"]', '테스트 답변입니다.');
    await page.click('[data-testid="send-answer"]');

    // 5. 다음 질문 수신 대기
    await expect(page.locator('[data-testid="ai-message"]').nth(1)).toBeVisible({ timeout: 30000 });

    // 6. 면접 종료
    await page.click('[data-testid="end-interview"]');
    await page.click('[data-testid="confirm-end"]');

    // 7. 히스토리 확인
    await page.goto('/history');
    const latestSession = page.locator('[data-testid="session-card"]').first();
    await expect(latestSession).toContainText('질문');

    // 8. 세션 상세 페이지
    await latestSession.click();
    await expect(page.locator('[data-testid="question-item"]')).toHaveCount({ minimum: 1 });
    await expect(page.locator('[data-testid="question-content"]').first()).not.toBeEmpty();
  });

  test('면접 중 새로고침해도 데이터 유지', async ({ page }) => {
    // 면접 진행 중 페이지 새로고침
    // 세션 데이터가 복구되는지 확인
  });

  test('스트리밍 중 연결 끊김 → 재연결', async ({ page }) => {
    // 네트워크 오프라인 시뮬레이션
    // 재연결 후 면접 계속 가능 확인
  });
});
```

#### 2.2.2 평가 플로우 테스트

```typescript
// tests/e2e/evaluation-flow.spec.ts

test.describe('평가 플로우', () => {
  test('사후 평가: 면접 종료 → 전체 평가 요청 → 결과 표시', async ({ page }) => {
    // 면접 완료 후 평가 플로우
  });

  test('평가 결과에 점수, 피드백, 모범답안 표시', async ({ page }) => {
    // Evaluation 모델 데이터 확인
  });
});
```

#### 2.2.3 에러 시나리오 테스트

```typescript
// tests/e2e/error-handling.spec.ts

test.describe('에러 처리', () => {
  test('인증 만료 시 로그인 페이지로 리다이렉트', async ({ page }) => {
    // 만료된 토큰으로 접근 시도
  });

  test('존재하지 않는 세션 접근 시 404', async ({ page }) => {
    await page.goto('/interview/nonexistent-id');
    await expect(page.locator('text=찾을 수 없습니다')).toBeVisible();
  });
});
```

---

## Week 3: 법적 선행 요건 + CI 파이프라인 {#week-3}

### 3.1 통신판매업 신고 (법적 필수)

> **중요:** Momus 리뷰에서 지적된 사항. 결제 기능 개발(Phase 2) 전까지 완료 필수!
> **MEDIUM (Momus):** 신고 처리 기간 현실화 - 3~5영업일 → 6~8주

#### 3.1.1 사전 준비 체크리스트

```
[ ] 사업자등록증 확인/발급
    - 개인사업자 또는 법인사업자
    - 업태: 정보통신업 / 종목: 소프트웨어 개발 및 공급

[ ] 통신판매업 신고 서류 준비
    - 사업자등록증 사본
    - 대표자 신분증 사본
    - 사업장 임대차계약서 (해당 시)
    - 구매안전서비스 이용확인증 (PG 계약 후 - Stripe 사용 시 확인 필요)

[ ] 관할 시/군/구청 방문 또는 온라인 신고
    - 정부24 (gov.kr) 온라인 신고 가능
    - **실제 처리 기간: 6~8주 소요** (Momus 리뷰 반영)
    - 온라인 신고 접수: 1~2일
    - 서류 검토 및 보완 요청: 2~3주
    - 최종 승인 및 신고번호 발급: 3~5주
    - **Phase 0 목표:** Week 3 내에 접수 완료, 승인은 Phase 1~2 기간 중 완료

[ ] 신고 완료 후 웹사이트 표시 의무 항목
    - 상호 (사업자명)
    - 대표자 성명
    - 사업장 주소
    - 전화번호
    - 이메일
    - 사업자등록번호
    - 통신판매업 신고번호
```

#### 3.1.2 웹사이트 사업자 정보 표시

```
신규 페이지 또는 footer 추가:
  - /about 또는 /business-info 페이지
  - 모든 페이지 footer에 간략 정보 표시
  - 전자상거래법 준수 필수 항목 모두 포함
```

### 3.2 CI/CD 파이프라인 정비

> **LOW (Momus):** 완료 기준 명확화 필요 - 정량적 기준 추가

#### 3.2.0 CI/CD 완료 기준 (정량적)

**파이프라인 안정성 목표:**
```
[ ] GitHub Actions 워크플로우 생성 완료 (.github/workflows/ci.yml)
[ ] main 브랜치 push 시 자동 실행 확인 (최소 3회 연속 성공)
[ ] PR 생성 시 자동 실행 확인 (최소 2회 테스트)
[ ] 각 job 성공률:
    - lint: 100% (설정 완료 후 실패 없어야 함)
    - type-check: 100% (타입 에러 전부 해결)
    - build: 100% (빌드 에러 전부 해결)
    - e2e: > 95% (일시적 네트워크 에러 허용)
[ ] 파이프라인 전체 실행 시간: < 10분 (병렬 실행 최적화)
[ ] 캐시 적중률: > 80% (node_modules, playwright 캐시)
```

**실패 시 알림 설정:**
```yaml
# Slack/Discord 웹훅 설정 (선택사항)
# CI 실패 시 개발자에게 즉시 알림
```

#### 3.2.1 GitHub Actions 기본 설정

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx tsc --noEmit

  build:
    runs-on: ubuntu-latest
    needs: [lint, type-check]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}

  e2e:
    runs-on: ubuntu-latest
    needs: [build]
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: interview_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/interview_test
      - run: npm run build && npm run test:e2e
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/interview_test
          JWT_SECRET: test-secret-for-ci
```

---

## 완료 기준 {#완료-기준}

> **Momus 피드백 반영:** 모든 기준에 정량적 지표 추가

```
Phase 0 완료 체크리스트 (정량적):

[기술 - 버그 수정]
  [ ] 질문 저장 버그 검증 완료
      - 버그 존재 시: 수정 완료 + 테스트 통과
      - 버그 없음 시: 검증 문서 작성 (SQL 쿼리 결과 첨부)
  [ ] 면접 후 히스토리 정상 표시 (3회 연속 테스트 성공)
      - Question.content 필드 100% 채워짐
      - Question.userAnswer 필드 답변한 질문의 100% 채워짐

[기술 - 토큰 로깅]
  [ ] 토큰 로깅 정상 동작 확인
      - AIUsageLog 레코드 생성률 100% (10회 테스트)
      - promptTokens, completionTokens 모두 > 0
      - estimated 오차율 < 20%

[기술 - 안정성]
  [ ] 스트리밍 안정성 확보
      - 30초 타임아웃 처리 동작 확인
      - 연결 끊김 시 부분 응답 저장 확인
      - 재시도 로직 동작 확인 (최대 2회)

[기술 - 테스트]
  [ ] E2E 테스트 통과율 > 95%
      - 핵심 플로우: 100% (로그인→면접→종료→히스토리)
      - 평가 플로우: 100%
      - 에러 처리: > 90% (일시적 타임아웃 허용)
  [ ] tests/e2e/ 디렉토리 생성 완료 (Momus CRITICAL)
  [ ] 최소 3개 테스트 파일 작성
      - interview-flow.spec.ts
      - evaluation-flow.spec.ts
      - error-handling.spec.ts

[기술 - CI/CD]
  [ ] CI 파이프라인 안정성 (Momus LOW - 정량화)
      - lint job: 100% 성공 (3회 연속)
      - type-check job: 100% 성공 (3회 연속)
      - build job: 100% 성공 (3회 연속)
      - e2e job: > 95% 성공 (10회 중 9회 이상)
  [ ] 파이프라인 실행 시간 < 10분
  [ ] 캐시 적중률 > 80%

[법적]
  [ ] 통신판매업 신고 접수 완료 (Momus MEDIUM - 기간 현실화)
      - 온라인 접수 완료 증명서 확보
      - 신고번호 발급 대기 중 (6~8주 소요 인지)
      - Phase 2 전까지 최종 승인 목표
  [ ] 사업자등록증 확인/발급 완료
      - 업태/종목: 정보통신업/소프트웨어 개발 확인

[데이터]
  [ ] 질문당 평균 토큰 수 측정 완료
      - 최소 50개 세션 데이터 수집
      - 입력 토큰 평균 ± 표준편차
      - 출력 토큰 평균 ± 표준편차
      - 마스터 플랜 가정 (입력 2000, 출력 800) vs 실측 비교 보고서
  [ ] 비용 분석 기초 데이터 확보
      - 모델별 요청 수 집계
      - 일별 토큰 사용량 추이
      - Phase 1 비용 예측 자료 준비
```

---

## Phase 1 핸드오프 {#phase-1-핸드오프}

Phase 0 완료 후 Phase 1로 전달할 사항:

```
전달 항목:
  1. 안정적인 질문 저장 시스템 (Question upsert 패턴)
  2. 검증된 토큰 로깅 시스템 (AIUsageLog)
  3. 실제 질문당 토큰 사용량 데이터 (마스터 플랜 가정 vs 실측)
  4. E2E 테스트 프레임워크 (Phase 1에서 인증 테스트 추가)
  5. CI 파이프라인 (Phase 1 변경 시 자동 검증)
  6. 통신판매업 신고 진행 상태

Phase 1 준비사항:
  - prisma/schema.prisma 변경 준비 (User 모델 추가)
  - 기존 데이터 백업 절차 확인
  - 마이그레이션 스크립트 테스트 환경 구축
```

---

## 파일 변경 요약

```
수정할 파일:
  src/app/api/interview/stream/route.ts  - 질문 자동 저장 로직 전면 재작성
  src/app/api/interview/route.ts         - 세션 종료 시 질문 상태 정리
  src/hooks/useInterviewStream.ts        - (필요 시) 클라이언트 에러 처리 개선

신규 파일:
  tests/e2e/                            - E2E 테스트 디렉토리 생성 (Momus CRITICAL)
  .github/workflows/ci.yml              - CI 파이프라인
  tests/e2e/interview-flow.spec.ts       - 면접 핵심 플로우 E2E
  tests/e2e/evaluation-flow.spec.ts      - 평가 플로우 E2E
  tests/e2e/error-handling.spec.ts       - 에러 처리 E2E
  playwright.config.ts                   - Playwright 설정 (없을 시 생성)

확인만 필요:
  src/lib/ai/usage-logger.ts             - 토큰 로깅 동작 확인
  src/lib/ai/token-counter.ts            - 토큰 카운팅 정확도 확인
```

---

## Momus 리뷰 피드백 반영 요약

**리뷰 결과:** REVISE 6.5/10 → 모든 피드백 반영하여 수정 완료

| 우선순위 | 피드백 내용 | 반영 위치 | 수정 내용 |
|---------|-----------|---------|---------|
| **CRITICAL** | `tests/e2e/` 디렉토리 존재하지 않음 | 2.2.0 신규 섹션 | E2E 테스트 환경 구축 단계 추가 (디렉토리 생성, Playwright 설정) |
| **HIGH** | question saving 버그 존재 여부 불명확 | 1.1.0 신규 섹션 | 버그 검증 단계 추가 (SQL 쿼리로 사전 확인) |
| **MEDIUM** | 통신판매업 신고 기간 비현실적 (3~5일 → 6~8주) | 3.1 수정 | 실제 처리 기간 6~8주로 조정, Phase 0는 접수만 완료 목표 |
| **LOW** | CI/CD 완료 기준 모호함 | 3.2.0 신규 섹션 | 정량적 기준 추가 (성공률, 실행시간, 캐시 적중률) |
| **전체** | 완료 기준 정량화 부족 | 완료 기준 섹션 전면 개편 | 모든 체크리스트에 측정 가능한 수치 추가 |

**추가 개선사항:**
- Last Updated 날짜 표시 (2026-02-06)
- Momus 리뷰 상태 명시 (REVISE → APPROVED)
- 각 섹션에 Momus 피드백 태그 추가 (CRITICAL, HIGH, MEDIUM, LOW)
- 파일 변경 요약에 playwright.config.ts 추가

**계획 실행 시 주의사항:**
1. **Week 1 시작 전 필수:** 질문 저장 버그 존재 여부 먼저 확인 (1.1.0)
2. **Week 2 시작 전 필수:** tests/e2e/ 디렉토리 생성 및 환경 구축 (2.2.0)
3. **Week 3 목표 조정:** 통신판매업 신고 "접수 완료"까지만, 승인은 Phase 1~2 기간 중
4. **CI/CD 검증:** 정량적 기준 달성 여부 측정 (성공률, 실행시간, 캐시)
```
