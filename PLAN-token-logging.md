# 토큰 사용량 로깅 및 Admin 대시보드 구현 계획 (v2)

> Momus 검토 반영 수정본. 별도 Express 서버 → 기존 Next.js 앱 내 `/admin` 라우트로 변경.

---

## 1. 현황 분석

### AI 호출 지점 (토큰 소모 발생)
| 위치 | 방식 | 용도 |
|------|------|------|
| `POST /api/interview/stream` (`stream/route.ts:132`) | Streaming | 면접 질문/답변 실시간 대화 |
| `POST /api/interview/evaluate` (`evaluate/route.ts:69`) | Non-streaming | 개별 답변 평가 |
| `POST /api/interview/evaluate` batch (`evaluate/route.ts:138`) | Non-streaming (반복) | 세션 전체 일괄 평가 |

### claude-max-api-proxy 토큰 반환 현황
- **Non-streaming**: `usage.prompt_tokens`, `usage.completion_tokens` 반환 **O** (`cli-to-openai.ts`의 `cliResultToOpenai` 함수에서 확인)
- **Streaming**: 토큰 사용량 반환 **X** (`stream_options.include_usage` 미지원, `cliToOpenaiChunk`/`createDoneChunk`에 usage 없음)

### 토큰 수집 전략
- **Non-streaming** (evaluate): API 응답 JSON의 `usage` 필드에서 직접 추출
  - 현재 `client.ts:96`의 `chat()` 메서드가 `data.choices[0].message.content`만 반환하고 usage를 버림
  - **수정 필요**: `chat()` 반환 타입을 `{ content: string; usage?: TokenUsage }` 로 변경
- **Streaming** (stream): `js-tiktoken`으로 input/output 토큰 수 추정
  - Claude 모델은 자체 토크나이저를 사용하므로 cl100k_base(GPT-4용)와 정확히 일치하지 않음
  - **예상 오차: 20-30%** — `estimated: true` 플래그를 부여하여 추정치임을 명시
  - 추후 프록시가 스트리밍 usage를 지원하면 실측값으로 교체 가능한 구조로 설계

---

## 2. 아키텍처 (변경: 별도 서버 → 동일 앱 내 /admin 라우트)

```
┌──────────────────────────────────────┐     ┌──────────────┐
│         interview-bot (app)          │────▶│ PostgreSQL   │
│         :3000                        │     │              │
│                                      │     │ - AIUsageLog │
│  /interview/*   - 기존 면접 기능     │     │ - 기존 모델들│
│  /admin/*       - 토큰 대시보드      │     └──────────────┘
│  /api/admin/*   - admin JSON API     │
│                                      │
│  middleware.ts  - /admin IP 접근제어  │
│  lib/ai/       - 토큰 로깅 래퍼     │
└──────────────────────────────────────┘
```

### 별도 서버를 폐기하는 이유
1. Prisma 스키마 공유 문제 (symlink? 복사? 동기화?) 제거
2. 동일 Prisma 클라이언트 재사용 → 별도 generate 불필요
3. Docker 서비스 1개 유지 → 운영 복잡도 감소
4. Next.js 미들웨어에서 IP 기반 접근제어 + 404 처리 가능 확인됨

### IP 접근제어 방식
- `src/middleware.ts`에서 `/admin*` 경로 접근 시 IP 확인
- 허용되지 않은 IP → `NextResponse.rewrite('/not-found')` → 404 페이지 렌더링 (라우트 존재 자체를 숨김)
- `ADMIN_ALLOWED_IPS` 환경변수: 비어있거나 `*`이면 **전체 허용** (JWT 인증만으로 보호), IP 목록 설정 시 해당 IP만 허용
- IP 추출: `x-forwarded-for` → `x-real-ip` → `request.ip` 순서

---

## 3. DB 스키마 변경

### 새 모델: `AIUsageLog`

```prisma
model AIUsageLog {
  id                String   @id @default(cuid())

  // 요청 컨텍스트
  sessionId         String?          // 면접 세션 ID (nullable)
  endpoint          String           // "stream" | "evaluate" | "evaluate_batch"
  model             String           // 사용된 AI 모델명

  // 토큰 사용량
  promptTokens      Int              // 입력 토큰 수
  completionTokens  Int              // 출력 토큰 수
  totalTokens       Int              // 합계
  estimated         Boolean @default(false)  // 추정치 여부 (tiktoken → true, API usage → false)

  // 요청 메타데이터
  durationMs        Int?             // 응답 소요 시간 (ms)
  success           Boolean @default(true)   // 성공 여부
  errorMessage      String?          // 에러 발생 시 메시지

  createdAt         DateTime @default(now())

  @@index([sessionId])
  @@index([createdAt])
  @@index([endpoint, createdAt])
  @@index([model, createdAt])
}
```

### 데이터 보존 정책
- 기본 보존: 90일
- 90일 초과 데이터는 `/api/admin/cleanup` 엔드포인트 또는 cron으로 삭제
- 예상 데이터 증가: 세션당 ~10건 로그 → 하루 100세션 기준 ~1000건/일, 90일 ≈ 90K건

---

## 4. 구현 단계

### Phase 1: 토큰 로깅 인프라

#### 1-1. Prisma 스키마에 AIUsageLog 모델 추가
- `prisma/schema.prisma`에 위 모델 추가
- 마이그레이션 생성 및 적용

#### 1-2. 토큰 카운트 유틸리티 (`src/lib/ai/token-counter.ts` 신규)
- `npm install js-tiktoken`
- cl100k_base 인코딩 사용 (Claude 전용 토크나이저 비공개이므로 가장 근접한 대안)
- 모든 추정치에는 `estimated: true` 플래그 부여

```typescript
import { encodingForModel } from 'js-tiktoken';

let enc: ReturnType<typeof encodingForModel> | null = null;
try {
  enc = encodingForModel('gpt-4'); // cl100k_base — Claude 전용 토크나이저 비공개이므로 근사치
} catch (err) {
  console.error('[TokenCounter] Failed to load tiktoken encoder:', err);
}

export function countTokens(text: string): number {
  if (!enc) return Math.ceil(text.length / 4); // fallback: 영문 기준 ~4자/토큰
  try {
    return enc.encode(text).length;
  } catch {
    return Math.ceil(text.length / 4);
  }
}

export function countMessagesTokens(messages: AIMessage[]): number {
  // OpenAI 메시지 포맷 기준: 메시지당 ~4 토큰 오버헤드 + content
  return messages.reduce((sum, msg) => sum + countTokens(msg.content) + 4, 3);
}
```

#### 1-3. 토큰 사용량 로거 (`src/lib/ai/usage-logger.ts` 신규)

```typescript
import { prisma } from '@/lib/db/prisma';

interface UsageLogParams {
  sessionId?: string;
  endpoint: 'stream' | 'evaluate' | 'evaluate_batch';
  model: string;
  promptTokens: number;
  completionTokens: number;
  estimated: boolean;
  durationMs?: number;
  success?: boolean;
  errorMessage?: string;
}

export async function logTokenUsage(params: UsageLogParams): Promise<void> {
  try {
    await prisma.aIUsageLog.create({
      data: {
        sessionId: params.sessionId,
        endpoint: params.endpoint,
        model: params.model,
        promptTokens: params.promptTokens,
        completionTokens: params.completionTokens,
        totalTokens: params.promptTokens + params.completionTokens,
        estimated: params.estimated,
        durationMs: params.durationMs,
        success: params.success ?? true,
        errorMessage: params.errorMessage,
      },
    });
  } catch (err) {
    // 로깅 실패가 AI 응답에 영향을 주지 않음
    console.error('[TokenUsage] Failed to log:', err);
  }
}
```

#### 1-4. AI 클라이언트 수정 (`src/lib/ai/client.ts`)

**핵심 변경: `chat()` 반환 타입 확장**

현재 (`client.ts:96`):
```typescript
return data.choices?.[0]?.message?.content || '';
```

변경 후:
```typescript
// types.ts에 추가
interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

interface AIChatResult {
  content: string;
  usage?: TokenUsage;
}

// AIClient 인터페이스 변경
interface AIClient {
  streamChat(options: AIStreamOptions): AsyncIterable<string>;
  chat(options: AIStreamOptions): Promise<AIChatResult>;  // string → AIChatResult
}
```

`chat()` 구현:
```typescript
async chat(options: AIStreamOptions): Promise<AIChatResult> {
  // ... fetch ...
  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens || 0,
      completionTokens: data.usage.completion_tokens || 0,
      totalTokens: data.usage.total_tokens || 0,
    } : undefined,
  };
}
```

**호출 측 수정 필요 (기존 코드가 string을 기대)**:
- `evaluate/route.ts:69`: `const response = await aiClient.chat(...)` → `const { content: response } = await aiClient.chat(...)`
- `evaluate/route.ts:138`: 동일 패턴 적용

**`streamChat()` 수정**: 반환 타입 변경 없음. 래퍼에서 토큰 추정.

#### 1-5. 로깅 래퍼 함수 (`src/lib/ai/client.ts` 내부)

`createAIClient()` 팩토리에 context 인자 추가:

```typescript
export function createAIClient(context?: {
  sessionId?: string;
  endpoint: 'stream' | 'evaluate' | 'evaluate_batch';
}): AIClient {
  // ... 기존 코드로 baseClient 생성 ...

  // 로깅이 필요하고 비활성화되지 않은 경우 래핑
  if (context && process.env.DISABLE_TOKEN_LOGGING !== 'true') {
    return wrapWithLogging(baseClient, context);
  }
  return baseClient;
}

function wrapWithLogging(client: AIClient, context: { ... }): AIClient {
  return {
    async *streamChat(options) {
      const startTime = Date.now();
      const inputTokens = countMessagesTokens(options.messages);
      let outputText = '';
      let success = true;
      let errorMsg: string | undefined;

      try {
        for await (const chunk of client.streamChat(options)) {
          outputText += chunk;
          yield chunk;
        }
      } catch (err) {
        success = false;
        errorMsg = err instanceof Error ? err.message : 'Unknown';
        throw err;
      } finally {
        // finally는 정상 완료, 에러, 클라이언트 연결 끊김(.return() 호출) 모두에서 실행됨
        void logTokenUsage({
          ...context,
          model: options.model,
          promptTokens: inputTokens,
          completionTokens: countTokens(outputText),
          estimated: true,
          durationMs: Date.now() - startTime,
          success,
          errorMessage: errorMsg,
        });
      }
    },

    async chat(options) {
      const startTime = Date.now();
      const result = await client.chat(options);
      const estimated = !result.usage;

      void logTokenUsage({
        ...context,
        model: options.model,
        promptTokens: result.usage?.promptTokens ?? countMessagesTokens(options.messages),
        completionTokens: result.usage?.completionTokens ?? countTokens(result.content),
        estimated,
        durationMs: Date.now() - startTime,
      });

      return result;
    },
  };
}
```

**장점**: `AIStreamOptions` 인터페이스 오염 없음. context는 팩토리 시점에 주입.

#### 1-6. 호출 지점 수정

**`stream/route.ts:131`**:
```typescript
// Before:
const aiClient = createAIClient();

// After:
const aiClient = createAIClient({ sessionId, endpoint: 'stream' });
```

**`evaluate/route.ts:60`** (단일 평가):
```typescript
// Before:
const aiClient = createAIClient();
const response = await aiClient.chat({ ... });
const jsonMatch = response.match(...);

// After:
const aiClient = createAIClient({ sessionId: question.sessionId, endpoint: 'evaluate' });
const { content } = await aiClient.chat({ ... });
const jsonMatch = content.match(...);
```

**`evaluate/route.ts:125`** (배치 평가):
```typescript
// Before:
const aiClient = createAIClient();

// After:
const aiClient = createAIClient({ sessionId: sessionId!, endpoint: 'evaluate_batch' });
// 루프 내의 response → { content } 디스트럭처링으로 변경
```

---

### Phase 2: Admin 대시보드 (Next.js 내 /admin 라우트)

#### 2-1. 미들웨어 IP 접근제어 (`src/middleware.ts` 수정)

```typescript
// 기존 미들웨어에 추가
function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || request.headers.get('x-real-ip')
    || request.ip
    || 'unknown';
}

function isAdminIpAllowed(ip: string): boolean {
  const allowed = process.env.ADMIN_ALLOWED_IPS;
  if (!allowed || allowed.trim() === '' || allowed.trim() === '*') return true; // 미설정 시 전체 허용
  const list = allowed.split(',').map(s => s.trim());
  return list.includes(ip);
}

// middleware 함수 내, STATIC_PATHS 체크 직후에 추가:
if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
  const ip = getClientIp(request);
  if (!isAdminIpAllowed(ip)) {
    return NextResponse.rewrite(new URL('/not-found', request.url));
  }
  // IP 통과 후 기존 JWT 인증 로직 계속 진행
}
```

#### 2-2. Admin 페이지 구조

```
src/app/admin/
├── page.tsx                    # 대시보드 메인 (토큰 사용량 차트)
├── layout.tsx                  # Admin 레이아웃 (사이드바 등)
└── logs/
    └── page.tsx                # 상세 로그 테이블

src/app/api/admin/
├── usage/route.ts              # 토큰 사용량 집계 API (일별/주별/월별)
├── logs/route.ts               # 상세 로그 조회 API (페이지네이션)
└── cleanup/route.ts            # 90일 초과 데이터 정리 API
```

#### 2-3. Admin 대시보드 기능

1. **일별/주별/월별 토큰 사용량 추이** (Recharts 라인 차트 — `recharts@3.7.0` 이미 설치됨)
2. **엔드포인트별 토큰 사용 비율** (파이 차트)
3. **모델별 사용량 분리** (테이블)
4. **세션별 토큰 소모량** (상세 테이블)
5. **에러 발생 현황** (에러 로그 필터링)
6. **기간 필터** (오늘/7일/30일/커스텀)
7. **추정치 vs 실측값 구분 표시** (estimated 플래그 기반)

#### 2-4. 컴포넌트 패턴

- **`/admin/page.tsx`**: Server Component — Prisma로 직접 집계 쿼리 후 차트 데이터를 Client Component에 전달
- **`/admin/logs/page.tsx`**: Server Component — Prisma로 로그 목록 조회 (커서 기반 페이지네이션)
- **차트 렌더링**: Client Component (`'use client'`) — Recharts는 브라우저 렌더링 필요
- **`/api/admin/*` API 라우트**: 클라이언트 사이드 기간 필터 변경 시 데이터 재조회용

#### 2-5. 핵심 쿼리 예시

```typescript
// 일별 토큰 사용량 집계 (Prisma raw query)
const dailyUsage = await prisma.$queryRaw<Array<{
  date: string; endpoint: string; model: string;
  totalPrompt: bigint; totalCompletion: bigint; count: bigint;
}>>`
  SELECT DATE("createdAt") as date, endpoint, model,
         SUM("promptTokens") as "totalPrompt",
         SUM("completionTokens") as "totalCompletion",
         COUNT(*) as count
  FROM "AIUsageLog"
  WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
  GROUP BY DATE("createdAt"), endpoint, model
  ORDER BY date DESC
`;

// 로그 목록 (커서 기반 페이지네이션, 20건씩)
const logs = await prisma.aIUsageLog.findMany({
  take: 20,
  skip: cursor ? 1 : 0,
  cursor: cursor ? { id: cursor } : undefined,
  orderBy: { createdAt: 'desc' },
  where: filters,
});
```

#### 2-6. Docker Compose 변경

`docker-compose.yml`에 환경변수만 추가 (별도 서비스 불필요):

```yaml
app:
  environment:
    # ... 기존 환경변수 ...
    ADMIN_ALLOWED_IPS: ${ADMIN_ALLOWED_IPS:-}  # 기본값: 전체 허용 (JWT 인증으로 보호). IP 제한 시: "127.0.0.1,::1,10.0.0.1"
```

---

## 5. 파일 변경 목록

### 수정 파일
| 파일 | 변경 내용 |
|------|----------|
| `prisma/schema.prisma` | AIUsageLog 모델 추가 |
| `package.json` | js-tiktoken 의존성 추가 |
| `src/lib/ai/types.ts` | TokenUsage, AIChatResult 인터페이스 추가; AIClient.chat 반환 타입 변경 |
| `src/lib/ai/client.ts` | chat() 반환 타입 확장; createAIClient에 context 인자; wrapWithLogging 래퍼 |
| `src/app/api/interview/stream/route.ts:131` | createAIClient에 context 전달 |
| `src/app/api/interview/evaluate/route.ts:60,125` | createAIClient에 context 전달; response → { content } 디스트럭처링 |
| `src/middleware.ts` | /admin 경로 IP 접근제어 추가 |
| `docker-compose.yml` | ADMIN_ALLOWED_IPS 환경변수 추가 |

### 신규 파일
| 파일 | 설명 |
|------|------|
| `src/lib/ai/token-counter.ts` | js-tiktoken 기반 토큰 카운트 유틸리티 (encode 실패 시 문자수/4 fallback) |
| `src/lib/ai/usage-logger.ts` | DB에 토큰 사용량 저장하는 fire-and-forget 함수 |
| `src/app/not-found.tsx` | 404 페이지 (admin IP 차단 시 rewrite 대상) |
| `src/app/admin/page.tsx` | Admin 대시보드 메인 페이지 |
| `src/app/admin/layout.tsx` | Admin 레이아웃 |
| `src/app/admin/logs/page.tsx` | 상세 로그 테이블 페이지 |
| `src/app/api/admin/usage/route.ts` | 토큰 사용량 집계 JSON API |
| `src/app/api/admin/logs/route.ts` | 상세 로그 조회 JSON API |
| `src/app/api/admin/cleanup/route.ts` | 90일 초과 데이터 정리 API |

---

## 6. 주요 설계 결정 사항

1. **chat() 반환 타입 변경**: `string` → `AIChatResult { content, usage? }` — usage 데이터 유실 문제 해결
2. **래퍼 패턴**: `AIStreamOptions`에 context를 넣지 않고, `createAIClient(context)`로 팩토리 시점에 주입 — 인터페이스 오염 방지
3. **토큰 추정 오차 명시**: Claude 토크나이저 ≠ cl100k_base, estimated 플래그로 20-30% 오차 투명하게 표시
4. **로깅은 fire-and-forget**: `void logTokenUsage(...)` — 실패 시 console.error만, AI 응답 영향 없음
5. **IP 접근제어 기본 전체 허용**: ADMIN_ALLOWED_IPS 미설정 시 JWT 인증만으로 보호, IP 목록 설정 시 해당 IP만 허용 + 404 처리
6. **동일 앱 내 /admin**: 별도 서버 대신 Next.js 라우트 활용 — Prisma 공유 불필요, Docker 서비스 추가 불필요
7. **데이터 보존 90일**: cleanup API로 오래된 로그 삭제

---

## 7. 에러/엣지 케이스 처리

| 케이스 | 처리 방식 |
|--------|----------|
| 스트리밍 중 클라이언트 연결 끊김 | 부분 응답까지의 토큰 추정 후 로깅 (success: true, 부분 output) |
| 스트리밍 타임아웃 (60초) | 타임아웃까지의 부분 응답 로깅 (success: false, errorMessage 포함) |
| AI 서버 연결 실패 | promptTokens만 추정, completionTokens=0 (success: false) |
| 프록시가 usage를 반환하지 않는 경우 (non-streaming) | tiktoken fallback, estimated: true |
| 로깅 DB 쓰기 실패 | console.error 후 무시 — AI 기능에 영향 없음 |
| DB 연결 풀 소진 | Prisma의 기본 연결 풀 관리에 의존; fire-and-forget이므로 큐잉 없음 |

---

## 8. 수락 기준

1. **스트리밍 AI 호출 시 AIUsageLog 레코드 생성됨** (estimated: true)
2. **Non-streaming AI 호출 시 AIUsageLog 레코드 생성됨** (usage 있으면 estimated: false)
3. **토큰 로깅 실패해도 면접 기능 정상 동작** (fire-and-forget 검증)
4. **허용 IP에서 /admin 접근 시 대시보드 표시**
5. **비허용 IP에서 /admin 접근 시 404 페이지 표시**
6. **대시보드에서 일별 토큰 사용량 차트 확인 가능**
7. **대시보드에서 엔드포인트별/모델별 분류 확인 가능**
8. **cleanup API 호출 시 90일 초과 데이터 삭제됨**

---

## 9. 롤백 계획

- `createAIClient()`에 context를 전달하지 않으면 래핑 없이 기존과 동일하게 동작
- 환경변수 `DISABLE_TOKEN_LOGGING=true` 추가하여 런타임에 로깅 비활성화 가능
- DB 마이그레이션은 새 테이블 추가만이므로, 롤백 시 테이블 drop만 하면 됨
