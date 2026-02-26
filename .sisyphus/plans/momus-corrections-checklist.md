# Momus 검토 결과 - 전체 수정사항 체크리스트

> **작성일:** 2026-02-06
> **기반:** Momus 5개 에이전트 병렬 리뷰 결과
> **결정사항:** 2-tier (FREE + PRO), Enterprise 제거, BASIC 제거
> **대상 문서:** 9개 (2개 APPROVED, 7개 REVISE/REJECT)

---

## 목차

1. [Systemic Issues (전체 공통 수정)](#1-systemic-issues)
2. [monetization-strategy.md 수정사항](#2-monetization-strategymd)
3. [phase-1-auth-complete.md 수정사항](#3-phase-1-auth-completemd)
4. [phase-2-stripe-payment.md 수정사항](#4-phase-2-stripe-paymentmd)
5. [phase-3-feature-gate-ai-routing.md 수정사항](#5-phase-3-feature-gate-ai-routingmd)
6. [phase-4-analytics-dashboard.md 수정사항](#6-phase-4-analytics-dashboardmd)
7. [phase-5-legal-production.md 수정사항](#7-phase-5-legal-productionmd)
8. [phase-6-beta-launch.md 수정사항](#8-phase-6-beta-launchmd)
9. [Cross-Plan 정합성 수정](#9-cross-plan-정합성)
10. [수정 우선순위 및 의존관계](#10-수정-우선순위)

---

## 1. Systemic Issues

모든 수익화 계획 문서(phase-1~6 + monetization-strategy)에 공통으로 적용되는 수정사항.

### S-1. 티어 구조 2-tier로 통일 (FREE + PRO)

**결정:** BASIC 티어 제거, Enterprise 티어 제거. FREE + PRO 2단계로 단순화.

**영향받는 모든 문서에서 수정:**

```
[ ] monetization-strategy.md
    - 3.1 티어 구조 표 (Line ~152): 3-tier → 2-tier로 재작성
      - FREE: ₩0 / 1세션/월 / 7질문/세션 / 사후평가만 / 기본통계 / 30일보관 / 2단계팔로업 / 이메일인증필수
      - PRO: ₩24,900/월 (₩249,000/연) / 월50회 / 15질문/세션 / 실시간+사후 / 고급분석 / 무제한보관 / 2단계팔로업 / 맞춤코스 / 우선지원
    - 3.2.2 질문당 비용 표: BASIC 행 제거
    - 3.2.3 수익성 분석: BASIC 행 제거, FREE/PRO만
    - v4 변경사항 섹션: "3단계(Free/Basic/Pro)" → "2단계(Free/Pro)"
    - Executive Summary 표: "Free / Basic / Pro" → "Free / Pro"

[ ] phase-1-auth-complete.md
    - SubscriptionTier enum: BASIC 제거 → enum SubscriptionTier { FREE PRO }
    - User 모델 기본값: @default(FREE) 유지
    - monthlySessionReset 관련 로직: BASIC 조건분기 제거

[ ] phase-2-stripe-payment.md
    - Stripe 제품 설정: BASIC 제품/가격 행 제거
    - 가격 페이지 UI: 2-column (FREE vs PRO)으로 변경
    - Webhook 핸들러: BASIC tier 참조 제거
    - 한국 전자상거래법 환불 로직: BASIC 케이스 제거

[ ] phase-3-feature-gate-ai-routing.md
    - TIER_LIMITS 상수: BASIC 키 제거
    - Feature Gate 로직: BASIC 조건분기 제거
    - 세션 자동 삭제 cron: BASIC 티어 참조 제거

[ ] phase-4-analytics-dashboard.md
    - 대시보드 접근 레벨: BASIC 레벨 제거
    - 이메일 알림 기준: FREE/PRO만

[ ] phase-6-beta-launch.md
    - 테스트 시나리오: BASIC 관련 시나리오 제거/병합
```

### S-2. User 모델이 현재 존재하지 않음을 명시

**현재 상태 (검증됨):**
- `prisma/schema.prisma`: `User` 모델 없음, `UserProfile` 모델만 존재 (Line 11-34)
- `SubscriptionTier` enum 없음
- `UserProfile`에 `userId` 필드 없음

**수정:**

```
[ ] 모든 문서에서 "현재 상태" vs "목표 상태" 명확히 구분

[ ] monetization-strategy.md (Line ~264-271)
    - "UserProfile.email 필드는 제거" → "UserProfile.email 필드는 Phase 1에서 제거 예정 (현재 존재: schema.prisma Line 16)"
    - "User.email이 source of truth" → "Phase 1 완료 후 User.email이 source of truth가 됨"
    - 현재 상태 블록 추가:
      ```
      현재 상태 (As-Is - 2026-02-06 검증):
        - User 모델: 없음
        - UserProfile.email: 존재 (schema.prisma Line 16)
        - UserProfile.name: 존재 (schema.prisma Line 15)
        - SubscriptionTier enum: 없음
        - userId 필드: 없음
      ```

[ ] phase-2~6: 각 문서 서두에 "Phase 1 완료 전제: User 모델, JWT V2, requireAuth() userId 반환" 명시
```

### S-3. requireAuth() 반환값 불일치

**현재 상태 (검증됨):**
- `src/lib/auth/middleware.ts` Line 5: `Promise<{ authenticated: boolean; response?: NextResponse }>`
- `src/lib/auth/jwt.ts` Line 13-17: `TokenPayload = { authenticated: boolean; iat; exp }`
- JWT에 userId 없음. `signToken()`은 `{ authenticated: true }`만 포함 (jwt.ts Line 20-24)

**수정:**

```
[ ] phase-1-auth-complete.md
    - requireAuth() 변경 명세 추가:
      현재: requireAuth() → { authenticated: boolean; response?: NextResponse }
      목표: requireAuth(req) → { userId: string; tier: SubscriptionTier; authenticated: true }
    - signToken() 변경 명세 추가:
      현재: signToken() → jwt.sign({ authenticated: true }, ...)
      목표: signToken(userId) → jwt.sign({ version: 2, userId, authenticated: true }, ...)
    - 기존 코드 위치 정확히 명시:
      - src/lib/auth/middleware.ts Line 5-25
      - src/lib/auth/jwt.ts Line 13-17 (TokenPayload), Line 19-25 (signToken)
      - src/middleware.ts Line 126-129 (jwtVerify 사용처)

[ ] phase-2~6: requireAuth()가 Phase 1에서 변경됨을 전제조건에 명시
    - "requireAuth(req)는 Phase 1 (Week 6)에서 { userId, tier }를 반환하도록 변경됨"
```

### S-4. 마이그레이션 전략 통일

**수정:**

```
[ ] 모든 문서에 마이그레이션 원칙 섹션 추가 (또는 monetization-strategy.md에 중앙 정의 후 참조):

    마이그레이션 원칙:
    1. 코드 변경 먼저, 스키마 변경 나중 (zero-downtime)
    2. 컬럼 추가 → 코드 배포 → 컬럼 삭제 (3단계)
    3. 모든 마이그레이션에 롤백 SQL 포함
    4. 마이그레이션 파일 경로 명시 (prisma/migrations/YYYYMMDD_name/)

[ ] phase-1-auth-complete.md
    - Step 7 (UserProfile.email 삭제) 순서 수정:
      1단계: 코드 배포 (User.email 사용하도록 변경) - 기존 참조 파일:
        - src/lib/ai/prompts.ts Line 35 (profile.name → user.name)
        - src/app/profile/page.tsx Line 89,90,368,369,387,393 (profile.email/name)
        - src/app/api/interview/stream/route.ts Line 81 (profile.name)
      2단계: 프로덕션에서 1주간 검증
      3단계: 마이그레이션 실행 (ALTER TABLE DROP COLUMN)
    - 롤백 SQL 추가 (각 Step에 대해)

[ ] phase-3~6: 각 스키마 변경에 마이그레이션 파일 경로 명시
```

---

## 2. monetization-strategy.md

**현재 점수:** 6.5/10 → **목표:** 8.5+/10

### CI-1. AI 가격 출처 부재 (Line ~191)

```
[ ] 가격표에 출처 추가:
    "출처: Anthropic API Pricing (https://docs.anthropic.com/en/docs/about-claude/pricing)
     확인일: 2026-02-05
     주의: AI 모델 가격은 변동 가능하므로 구현 시 재확인 필수"
```

### CI-2. 현재 상태/목표 상태 혼동 (Line ~264-271)

```
[ ] Section 4.1.1 재구성:
    - "현재 상태 (As-Is)" 블록과 "목표 상태 (To-Be)" 블록 분리
    - S-2에서 정의한 형식 적용
```

### CI-3. AIUsageLog 확장 필드 명확화 (Line ~962-977)

```
[ ] Section 4.7 수정:
    현재 구현 상태 (검증됨):
      - 모델 위치: schema.prisma Line 183-208
      - 구현 위치: src/lib/ai/usage-logger.ts Line 3-13
      - 기존 필드: sessionId, endpoint, model, promptTokens, completionTokens, totalTokens, estimated, durationMs, success, errorMessage
      - 누락 필드: userId, cost, tier, quotaImpact

    Phase 3 확장 계획:
      + userId      String   // User FK (Phase 1에서 User 모델 생성 후)
      + cost        Float?   // 실제 비용 (USD)
      + tier        String?  // 사용 시점의 티어
      + quotaImpact Int?     // 쿼타 영향
      마이그레이션: prisma/migrations/YYYYMMDD_extend_ai_usage_log/
```

### CI-4. JWT V1 토큰 구조 검증 (Line ~534-538)

```
[ ] 실제 코드 기반으로 수정:
    현재 JWT 페이로드 (검증됨 - src/lib/auth/jwt.ts Line 13-17):
      interface TokenPayload {
        authenticated: boolean;  // 항상 true
        iat: number;
        exp: number;
      }
    결론: version 필드 없음 → V1으로 간주
    signToken() 위치: src/lib/auth/jwt.ts Line 19-25
```

### CI-5. Phase 문서 링크 테이블 (Line ~1855-1869)

```
[ ] phase-0-prerequisites.md 존재 확인됨 → Momus 오탐. 수정 불필요.
[ ] Phase 7 (PortOne) 행 추가 또는 "Phase 7은 별도 문서 미작성 (포스트 런칭)" 명시
```

### W-1. Webhook 멱등성 race condition

```
[ ] upsert 패턴으로 변경:
    await prisma.webhookEvent.upsert({
      where: { externalId: eventId },
      create: { externalId: eventId, type, processed: false },
      update: {}  // 이미 존재하면 무시
    });
```

### W-2. Prisma 미들웨어 Admin bypass

```
[ ] 시스템 작업 우회 메커니즘 추가:
    if (userId === 'SYSTEM') return query(args);  // 필터링 안 함
```

### W-3. 결정 로그 누락 항목 (부록 C)

```
[ ] 추가할 결정사항:
    D11: PostgreSQL 선택 이유 (Prisma 호환성, Vercel Postgres)
    D12: Vercel 배포 선택 이유 (Next.js 네이티브, Edge 런타임)
    D13: 2-tier 가격 구조 선택 이유 (초기 단순화, BASIC 제거)
    D14: Haiku 단일 모델 선택 이유 (비용 절감, 차등화 불필요)
```

---

## 3. phase-1-auth-complete.md

**현재 점수:** 6.5/10 → **목표:** 8+/10

### CI-1. APP_PASSWORD → User 기반 인증 전환 계획 부재 (SHOWSTOPPER)

```
[ ] "Section 3.5: 레거시 인증 전환 계획" 신규 추가:

    현재 인증 시스템 (검증됨):
      - src/app/api/auth/login/route.ts: APP_PASSWORD 환경변수로 단일 비밀번호 검증
      - src/lib/auth/jwt.ts: signToken()이 { authenticated: true }만 포함
      - src/middleware.ts: jwtVerify로 토큰 유효성만 확인 (userId 없음)

    전환 전략:
      Week 4-5: User 모델 + 이메일/비밀번호 회원가입 구현
      Week 5: signToken(userId) 변경, JWT V2 도입
      Week 6: requireAuth() → { userId, tier } 반환하도록 변경
      Week 7: APP_PASSWORD 로그인 deprecation (환경변수 유지하되 경고 로그)
      Week 8: Google OAuth 추가 (대체 인증 수단)
      Week 10: APP_PASSWORD 완전 제거 (기존 V1 토큰 자동 만료 대기)

    기존 세션 처리:
      - V1 토큰 (authenticated만): 7일 TTL로 자연 만료
      - V2 토큰 (userId 포함): 새 로그인 시 자동 발급
      - 전환 기간 (Week 6-10): V1/V2 모두 유효, V1은 읽기 전용 모드
```

### CI-2. 마이그레이션 순서 위험 (UserProfile.email 삭제)

```
[ ] S-4에서 정의한 3단계 접근법 적용:
    - Step 7의 DROP COLUMN을 별도 마이그레이션으로 분리
    - 코드 변경 PR → 1주 검증 → 컬럼 삭제 마이그레이션 순서 명시
    - 영향받는 파일 목록 (검증됨):
      - src/lib/ai/prompts.ts:35 (profile.name)
      - src/app/profile/page.tsx:89,90,368,369,387,393 (profile.email/name)
      - src/app/api/interview/stream/route.ts:81 (profile.name)
```

### CI-3. Prisma Client Extensions 타입 안전성

```
[ ] 타입 마이그레이션 가이드 추가:
    현재 (src/lib/db/prisma.ts Line 27-34):
      export const prisma = ... (soft-delete 확장 적용)
      export const prismaBase = ... (기본 PrismaClient)
      export type ExtendedPrismaClient = typeof prisma;

    변경 계획:
      - tenant 확장 추가 시 prisma 타입 변경됨
      - 기존 import 전부 호환 (ExtendedPrismaClient 활용)
      - Admin 라우트: prismaBase 사용 (tenant 필터링 우회)
      - AI 로깅: prismaBase 유지 (현재와 동일, usage-logger.ts Line 1)
```

### CI-4. gen_random_uuid() 확장 검증

```
[ ] 마이그레이션 Step 0에 검증 추가:
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
        RAISE EXCEPTION 'pgcrypto extension not available - contact DB admin';
      END IF;
    END $$;
```

### W-1. 수용 기준 테스트 가능성 (67.7% → 90%+)

```
[ ] 모호한 기준 구체화:
    - "User A가 User B 데이터에 접근 불가" →
      "TEST-AUTH-001: User A로 인증 후 GET /api/interview?sessionId={User B의 세션ID} → 403 또는 404 반환"
    - "Redis 정상 동작 + 장애 시 폴백" →
      "TEST-REDIS-001: Redis 컨테이너 중단 후 로그인 시도 → 5초 내 성공 (인메모리 폴백)"
    - "E2E 테스트 통과율 > 95%" →
      "E2E 테스트 20개 중 19개 이상 통과 (현재 __tests__/e2e/ 디렉토리 기준)"
```

### W-2. Redis 설정 (docker-compose.yml)

```
[ ] Redis 커맨드 수정:
    현재: redis-server --appendonly yes --save 60 1
    변경: redis-server --appendonly no --maxmemory 256mb --maxmemory-policy allkeys-lru
    이유: Rate limiting용이므로 영속성보다 성능 우선
```

### W-3. OAuth 상태 관리

```
[ ] Cookie 기반 → Redis 기반 state 저장 검토 추가:
    - 쿠키 비활성화 사용자 대응
    - Redis에 state:nonce 형태로 10분 TTL 저장
    - 또는 현재 쿠키 방식 유지하되 제한사항 문서화
```

---

## 4. phase-2-stripe-payment.md

**현재 점수:** 7/10 → **목표:** 8.5+/10

### CI-1. Webhook 공개 경로 누락

```
[ ] middleware.ts 수정 명세 추가:
    파일: src/middleware.ts Line 4
    현재: const PUBLIC_PATHS = ['/login', '/api/auth'];
    변경: const PUBLIC_PATHS = ['/login', '/api/auth', '/api/webhooks'];
```

### CI-2. 누락된 헬퍼 함수 구현 명세

```
[ ] getPriceId() 구현 추가:
    async function getPriceId(tier: SubscriptionTier, cycle: BillingCycle): Promise<string> {
      const key = `stripe_price_${tier.toLowerCase()}_${cycle.toLowerCase()}`;
      const config = await prisma.appConfig.findUnique({ where: { key } });
      if (!config) throw new Error(`Price ID not found: ${key}`);
      return config.value;
    }
    위치: src/lib/payment/stripe-adapter.ts
    참고: AppConfig 모델 이미 존재 (schema.prisma Line 165-170)

[ ] getOrCreateStripeCustomer() 구현 추가:
    async function getOrCreateStripeCustomer(userId: string): Promise<string> {
      const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
      if (user.stripeCustomerId) return user.stripeCustomerId;
      const customer = await stripe.customers.create({ email: user.email, metadata: { userId } });
      await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customer.id } });
      return customer.id;
    }
    전제: Phase 1의 User 모델에 stripeCustomerId String? 필드 추가 필요
```

### CI-3. 환경변수 누락

```
[ ] .env.example 수정 명세 추가:
    + STRIPE_SECRET_KEY=sk_test_...
    + STRIPE_PUBLISHABLE_KEY=pk_test_...
    + STRIPE_WEBHOOK_SECRET=whsec_...
```

### W-1. findUnique FOR UPDATE 주석 오류

```
[ ] Webhook 핸들러의 SELECT FOR UPDATE 주석 제거 또는 실제 구현:
    옵션 A (주석 제거): Serializable isolation만으로 충분하다면 주석 삭제
    옵션 B (실제 구현):
      const existing = await tx.$queryRaw`
        SELECT * FROM "WebhookEvent" WHERE "externalId" = ${event.id} FOR UPDATE
      `;
```

### W-2. Pro 티어 월 50회 세션 환불 계산

```
[ ] 환불 로직에 월 50회 세션 처리 추가:
    if (limit === Infinity) {
      // Pro 티어: 기간 기반 비례 계산
      const daysPassed = (Date.now() - payment.createdAt.getTime()) / 86400000;
      usageRatio = daysPassed / 30;
    }
```

### W-3. Stripe Test/Live 환경 구분

```
[ ] "개발 환경 구성" 섹션 추가:
    - Week 13-16: Stripe Test Mode (sk_test_*)
    - Week 17 배포 전: Live Mode 전환 체크리스트
    - 환경별 환경변수 분리 (.env.development / .env.production)
```

---

## 5. phase-3-feature-gate-ai-routing.md

**현재 점수:** 3/10 (REJECT) → **전면 재작성 필요**

### 재작성 원칙

```
[ ] Phase 1 완료를 전제로 재작성
    - 현재 코드 기반이 아닌, Phase 1 산출물 기반으로 작성
    - 각 코드 스니펫에 "Phase 1에서 제공되는 인터페이스" 명시

[ ] 재작성 시 필수 포함 항목:
    1. Phase 1 산출물 검증 체크리스트 (재작성의 전제조건):
       - User 모델 존재 확인 (prisma db pull)
       - requireAuth()가 { userId, tier } 반환 확인
       - SubscriptionTier enum 존재 확인
       - JWT V2 동작 확인

    2. TIER_LIMITS 상수 (2-tier):
       FREE: { monthlySessions: 1, questionsPerSession: 7, evaluationMode: 'after_complete', followUpDepth: 2, historyRetention: 30, customCourse: false }
       PRO: { monthlySessions: 50, questionsPerSession: 15, evaluationMode: 'both', followUpDepth: 2, historyRetention: null, customCourse: true }

    3. checkSessionLimit() 구현:
       - prisma.interviewSession.count()로 이번 달 세션 수 확인
       - FREE: 3개 초과 시 차단 + 업그레이드 유도 메시지
       - PRO: 50 → 월 50회 제한

    4. checkBooleanFeature() 구현:
       - TIER_LIMITS[tier][feature] boolean 체크

    5. AIUsageLog 확장 마이그레이션:
       - 파일 경로: prisma/migrations/YYYYMMDD_extend_ai_usage_log/
       - userId, cost, tier 필드 추가
       - usage-logger.ts 업데이트 (현재 위치: src/lib/ai/usage-logger.ts)

    6. 세션 자동 정리 cron (Vercel Cron):
       - FREE: 30일 초과 세션 soft delete
       - PRO: 정리 없음 (무제한 보관)

    7. 수용 기준:
       - "Free 사용자 4번째 세션 생성 시 403 + 업그레이드 메시지"
       - "Pro 사용자 월 50회 세션 생성 가능"
       - "AIUsageLog에 userId, cost, tier 필드 기록 확인"
```

---

## 6. phase-4-analytics-dashboard.md

**현재 점수:** 6/10 → **목표:** 8+/10

### CI-1. Phase 3 의존성 검증

```
[ ] 전제조건 섹션에 구체적 검증 추가:
    Phase 3 산출물 확인:
    - TIER_LIMITS 상수 존재: src/lib/feature-gate.ts
    - checkBooleanFeature() 함수 존재: src/lib/feature-gate.ts
    - AIUsageLog에 userId/cost 필드 존재: schema.prisma
```

### CI-2. Redis 설정 선행조건

```
[ ] Redis 의존성 명확화:
    옵션 A: Phase 1에서 Redis 설정 (rate limiting용) → Phase 4에서 캐싱에 재활용
    옵션 B: Phase 4에서 선택적 Redis 캐싱 (Redis 없이도 동작, 성능만 저하)
    → 선택한 옵션 명시 필요

    Upstash Redis 환경변수:
    - UPSTASH_REDIS_REST_URL: Phase 1에서 설정됨
    - UPSTASH_REDIS_REST_TOKEN: Phase 1에서 설정됨
```

### CI-3. recharts 패키지

```
[ ] Momus 오탐 - recharts 이미 설치됨 (package.json Line 25: "recharts": "^3.7.0")
    → 수정 불필요
```

### W-1. 수용 기준 구체화

```
[ ] "역량 레이더 차트 정상 표시" →
    "레이더 차트가 5개 이상의 카테고리를 표시하며, 각 축에 0-10 범위의 정확한 점수가 표시됨"

[ ] User.emailNotifications 마이그레이션 파일 경로 추가:
    prisma/migrations/YYYYMMDD_add_email_notifications/
```

---

## 7. phase-5-legal-production.md

**현재 점수:** 7/10 → **목표:** 8.5+/10

### CI-1. Schema User vs UserProfile

```
[ ] 모든 User 참조를 Phase 1 산출물 기준으로 정렬:
    - requireAuth()와 requireAdmin()이 Phase 1의 User 모델 기반
    - User.isActive 필드: Phase 1에서 추가됨을 명시
```

### CI-2. JWT V1/V2 구분 명확화

```
[ ] JWT 버전 정의 섹션 추가 (또는 Phase 1 참조):
    V1 (현재): { authenticated: boolean } - src/lib/auth/jwt.ts Line 13-17
    V2 (Phase 1 후): { version: 2, userId: string, authenticated: boolean }
    전환 완료 시점: Phase 1 Week 10 (V1 토큰 자연 만료)
    Phase 5 시작 시점: V2만 유효
```

### CI-3. Upstash Redis 설정 시점

```
[ ] 선행 조건에 추가:
    "Phase 1에서 Upstash Redis 계정 생성 및 환경 변수 설정 완료"
    또는 Phase 5 Week 27에 "Upstash Redis 미설정 시 여기서 설정" 대안 경로 추가
```

### CI-4. 법률 자문 구체화

```
[ ] "법률 자문" → 구체적 산출물:
    - 산출물: 법률 검토 의견서 (PDF)
    - 포함 내용: 개인정보처리방침 적합성, 이용약관 유효성, 통신판매업 의무 충족 여부
    - 예산: ₩3,000,000-5,000,000
    - 담당: 법률 사무소 (IT/전자상거래 전문)
```

### W-1. Anomaly Detection 임계값 근거

```
[ ] 임계값 계산 근거 추가:
    FREE 사용자 월 최대 비용: 1세션 × 7질문 × $0.006 = $0.042 → $0.50 임계값 (12배)
    PRO 사용자 월 최대 비용: 50세션 × 15질문 × $0.006 = $4.50 → $20 임계값 (4.4배)
    → "일일 정상 범위의 5-20배를 임계값으로 설정"
```

---

## 8. phase-6-beta-launch.md

**현재 점수:** 6/10 → **목표:** 8+/10

### CI-1. 베타 환경 정의 모순 해결

```
[ ] 환경 명확화:
    "Staging 환경 (프로덕션 인프라와 동일 구성):
     - Vercel Preview Deployment (별도 URL)
     - 별도 PostgreSQL 데이터베이스 (스테이징용)
     - Stripe LIVE 모드 (실제 결제 테스트용 테스트 카드 사용)
     - Upstash Redis (별도 인스턴스)"
```

### CI-2. BetaFeedback 마이그레이션 파일 경로

```
[ ] 마이그레이션 명세 추가:
    파일: prisma/migrations/YYYYMMDD_add_beta_feedback/migration.sql
    롤백: DROP TABLE "BetaFeedback";
```

### CI-3. 부하 테스트 목표 정리

```
[ ] 목표 통일:
    "목표: 20 동시 사용자, 각 세션 30초 유지
     기준: p95 응답시간 < 2초, 에러율 < 1%
     도구: k6 (로컬 실행)"
    k6 스크립트의 stages를 목표와 일치시킴
```

### CI-4. 침투 테스트 도구 명시

```
[ ] 구체화:
    "도구: OWASP ZAP (자동 스캔) + 수동 테스트
     범위: OWASP Top 10 체크리스트
     수행자: 내부 (개발자 본인)
     결과물: 취약점 보고서 (severity별 분류)"
```

### W-1. 베타 참가자 수 구체화

```
[ ] "20~50명" → "목표 30명, 최소 20명 (통계적 유의미), 최대 50명 (인프라 제한)"
```

### W-2. 랜딩 페이지 디자인

```
[ ] 디자인 확보 방안 추가:
    "Week 33: Tailwind UI / Shadcn 템플릿 기반 랜딩 페이지 구현
     외부 디자이너 불필요 (개발자가 직접 구현)"
```

---

## 9. Cross-Plan 정합성

### 9-1. 의존관계 그래프

```
[ ] monetization-strategy.md 부록에 의존관계 다이어그램 추가:

    Phase 0 (prerequisites)
      ↓
    Phase 1 (auth) ──산출물──→ User 모델, JWT V2, requireAuth({userId,tier}), Redis
      ↓
    Phase 2 (payment) ──산출물──→ Subscription 모델, Stripe webhook, 가격 페이지
      ↓
    Phase 3 (feature gate) ──산출물──→ TIER_LIMITS, checkSessionLimit(), AIUsageLog 확장
      ↓
    Phase 4 (analytics) ──산출물──→ 분석 대시보드, 이메일 알림
      ↓
    Phase 5 (legal/prod) ──산출물──→ 보안 감사 통과, 법적 준수, Admin 고도화
      ↓
    Phase 6 (beta/launch) ──산출물──→ 베타 피드백, 부하 테스트 통과, 런칭
```

### 9-2. 각 Phase 시작 전 검증 체크리스트

```
[ ] 각 Phase 문서에 "시작 전 검증" 섹션 추가:
    예시 (Phase 3):
      [ ] prisma db pull 후 User 모델 확인
      [ ] requireAuth() 테스트: curl → { userId, tier } 반환 확인
      [ ] SubscriptionTier enum import 성공 확인
      [ ] npm run build 성공 확인
```

### 9-3. User vs UserProfile 통일

```
[ ] 용어 정의 (monetization-strategy.md Section 4.1.1):
    - User: 인증/구독의 주체 (Phase 1에서 생성)
    - UserProfile: 면접 프로필 데이터 (기존, User에 1:1 연결)
    - 모든 문서에서 이 구분 일관성 유지
```

---

## 10. 수정 우선순위

### P0 (즉시 - 다른 수정의 전제조건)

| # | 수정 항목 | 대상 문서 | 이유 |
|---|----------|----------|------|
| 1 | S-1: 2-tier 통일 | 전체 7개 | 모든 티어 참조에 영향 |
| 2 | S-2: User 모델 현재/목표 분리 | 전체 7개 | 현실과 계획의 혼동 방지 |
| 3 | S-3: requireAuth() 변경 명세 | phase-1 + 전체 | 모든 API의 기반 |

### P1 (높음 - 실행 가능성에 직결)

| # | 수정 항목 | 대상 문서 | 이유 |
|---|----------|----------|------|
| 4 | CI: APP_PASSWORD 전환 계획 | phase-1 | Phase 1 실행의 핵심 |
| 5 | CI: 마이그레이션 순서 수정 | phase-1 | 프로덕션 장애 방지 |
| 6 | CI: Phase 3 전면 재작성 | phase-3 | REJECT 상태 |
| 7 | CI: Webhook 공개 경로 | phase-2 | Stripe 연동 실패 방지 |

### P2 (중간 - 품질 향상)

| # | 수정 항목 | 대상 문서 |
|---|----------|----------|
| 8 | AI 가격 출처 | monetization |
| 9 | 헬퍼 함수 구현 | phase-2 |
| 10 | 수용 기준 구체화 | phase-1, 4, 6 |
| 11 | 베타 환경 명확화 | phase-6 |
| 12 | 법률 자문 구체화 | phase-5 |

### P3 (낮음 - 선택적 개선)

| # | 수정 항목 | 대상 문서 |
|---|----------|----------|
| 13 | Cross-plan 의존관계 다이어그램 | monetization |
| 14 | 결정 로그 추가 | monetization |
| 15 | Redis 설정 최적화 | phase-1 |
| 16 | 부하 테스트 스크립트 일치 | phase-6 |

---

## 검증 기준

이 체크리스트의 모든 항목이 적용된 후:

```
[ ] 모든 문서에서 "BASIC" 또는 "Enterprise" 검색 시 0건
[ ] 모든 문서에서 User 모델 참조 시 "Phase 1에서 생성" 명시
[ ] requireAuth() 사용 시 Phase 1 전제조건 명시
[ ] 모든 스키마 변경에 마이그레이션 파일 경로 존재
[ ] 수용 기준 테스트 가능성 90%+ (각 문서별)
[ ] Momus 재검토 시 Critical Issue 0건
```
