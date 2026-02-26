# Interview Bot 수익화 전략 및 기술 구현 계획

> **작성일:** 2026-02-05
> **상태:** v4 - Haiku-only Simplification
> **범위:** 사업 전략 + 기술 구현 로드맵 (~9개월)
> **분석 기반:** 기존 계획 문서 5건 + Metis 리스크 분석 + 현재 코드베이스 분석 + Momus 비평 리뷰
> **변경 이력:** v1 Draft (2026-02-05) -> v2 Post-Momus Review (2026-02-05) -> v3 Product Simplification (2026-02-06) -> v4 Haiku-only Simplification (2026-02-06)

---

## 목차

1. [Executive Summary](#1-executive-summary)
2. [현재 상태 분석](#2-현재-상태-분석)
3. [수익 모델 및 가격 전략](#3-수익-모델-및-가격-전략)
4. [기술 아키텍처 전환 계획](#4-기술-아키텍처-전환-계획)
5. [구현 로드맵 (8 Phases)](#5-구현-로드맵)
6. [기존 계획과의 통합](#6-기존-계획과의-통합)
7. [리스크 관리](#7-리스크-관리)
8. [법적/규제 요구사항](#8-법적규제-요구사항)
9. [인프라 및 운영](#9-인프라-및-운영)
10. [성공 지표](#10-성공-지표)
11. [Momus Review Responses (부록 D)](#부록-d-momus-review-responses)
12. [상세 Phase 계획 문서 링크 (부록 E)](#부록-e-상세-phase-계획-문서-링크)

---

## 1. Executive Summary

### 목표
AI 모의 면접 플랫폼을 **단일 사용자 도구**에서 **멀티 테넌트 Freemium SaaS**로 전환하여 수익 사업화.

### 핵심 전환 요소

| 항목 | 현재 (As-Is) | 목표 (To-Be) |
|------|-------------|-------------|
| 사용자 모델 | 단일 사용자 (공유 비밀번호) | 멀티 테넌트 (개별 계정) |
| 인증 | APP_PASSWORD 환경변수 | Email/OAuth + JWT V2 (사용자 식별) |
| 결제 | 없음 | Stripe (기본) + PortOne (한국 시장) |
| 가격 | 무료 | Free / Pro |
| AI 모델 | Claude Sonnet 4 (단일) | Claude Haiku 4.5 (전 티어 동일) |
| 인프라 | Docker Compose (로컬 개발) | Vercel + Managed DB/Redis (프로덕션) |
| 법적 요건 | 없음 | 통신판매업, 개인정보보호법, GDPR 기본 준비 |
| 비밀번호 해싱 | 없음 | bcrypt 12 salt rounds |
| PCI DSS | 없음 | Stripe에 완전 위임 (카드 데이터 미저장) |

### 기존 프로젝트 계획과의 관계

현재 프로젝트에는 아래 5개의 기존 계획 문서가 존재합니다:

| 문서 | 상태 | 수익화와의 관계 |
|------|------|----------------|
| `interview-bot-plan.md` | MVP 구현 중 | 기반 아키텍처 -> 수익화 전환의 출발점 |
| `prompts-design.md` | 구현 완료/진행 중 | 프롬프트 시스템 -> Haiku 4.5 최적화 및 기능 차등화에 활용 |
| `streaming-error-handling.md` | 구현 완료/진행 중 | 에러 핸들링 -> 결제 사용자 SLA 보장에 필수 |
| `fix-question-saving.md` | 구현 대기 | **수익화 전 반드시 해결** (핵심 기능 버그) |
| `PLAN-token-logging.md` | **구현 완료** | 토큰 로깅 -> 사용량 기반 과금의 기술적 기반 (이미 구현됨) |

### v2 주요 변경사항 (Momus 리뷰 반영)

- AI 비용 계산을 2026년 실제 가격으로 재산정
- User/UserProfile 이중 신원 문제 해결 (1:1 관계 명확화)
- JWT 버저닝 전략 추가 (V1->V2 마이그레이션)
- Feature Gate를 상수 기반으로 단순화 (DB 테이블 제거)
- 타임라인을 현실적 41주로 확장
- 결제를 Stripe + PortOne 병행 (한국 시장 대응)
- 법적 타이밍 수정 (통신판매업 Phase 0, GDPR 기본 Phase 1)
- Prisma 미들웨어 / Webhook 멱등성 구체 코드 추가
- Redis 장애 대응 전략 추가
- PCI DSS 명시적 성명 추가

### v3 주요 변경사항 (제품 단순화)

- Phase 1A + 1B 통합: 단일 "Phase 1: 인증 시스템 완성" (9주)
- LinkedIn 기능 완전 제거: OAuth, 프로필 연동 제거로 복잡도 감소
- PDF 리포트 기능 제거: Pro/Enterprise 티어에서 제거
- Phase 4 단순화: "분석 대시보드 & 이메일 알림"으로 축소 (4주)
- 타임라인 단축: ~35주 (~9개월)로 감소 (6주 단축)
- Google OAuth만 지원으로 단순화

### v4 주요 변경사항 (Haiku 단일 모델 + 3티어)

- AI 모델 차등화 완전 제거: Haiku 4.5 단일 모델 (전 티어)
- Enterprise 티어 제거: 2단계(Free/Pro)로 단순화
- 차등 기준 변경: AI 모델 → 사용 횟수 + 기능으로 전환
- 비용 대폭 절감: Opus/Sonnet 대비 Haiku만 사용으로 전 티어 흑자
- Free 티어: 5세션 → 3세션/월

---

## 2. 현재 상태 분석

### 2.1 기술 스택

```
Frontend:  Next.js 16.1.6 + React 19.2.3 + TypeScript + Tailwind 4
Backend:   Next.js App Router API Routes
Database:  PostgreSQL 16 + Prisma 6.19.2
AI:        Claude Haiku 4.5 (via AI Proxy)
Auth:      jose + jsonwebtoken (단일 비밀번호)
Infra:     Docker Compose (로컬 개발), Vercel (프로덕션 배포)
Testing:   Playwright 1.58.1
```

### 2.2 현재 데이터 모델의 한계

```prisma
// 현재: userId 개념이 없는 단일 사용자 모델
model UserProfile {
  id    String @id @default(cuid())
  name  String
  email String?
  // userId 없음 -> 모든 데이터가 암묵적으로 단일 사용자 소유
}

model InterviewSession {
  id              String @id @default(cuid())
  targetPositionId String?
  // userId 없음 -> 누가 이 세션을 생성했는지 추적 불가
}
```

### 2.3 현재 인증의 한계

```typescript
// 현재 middleware.ts - JWT에 사용자 정보 없음
// payload: { authenticated: true } (사용자 식별 불가)
// -> JWT V1으로 간주, V2 전환 시 마이그레이션 필요
```

### 2.4 수익화 전 해결해야 할 기술 부채

| 우선순위 | 항목 | 영향 |
|---------|------|------|
| **P0** | 질문 저장 버그 (`fix-question-saving.md`) | 핵심 기능 결함 -> 유료 사용자 경험 직결 |
| **P0** | 단일 사용자 아키텍처 | 멀티 테넌트 전환의 근본적 장벽 |
| **P0** | 인증 시스템 부재 (사용자 식별 불가) | 과금, 사용량 추적, 데이터 격리 모두 불가 |
| **P0** | 통신판매업 신고 미완 | 결제 기능 개발 전 법적 요건 선행 필요 |
| **P1** | 인메모리 rate limiting | 서버 재시작 시 초기화, 스케일 불가 |
| **P1** | AI 비용 추적 미흡 (추정치만 사용) | 정확한 과금 불가 (토큰 로깅은 이미 구현됨, userId/cost 확장 필요) |
| **P1** | DB 커넥션 풀링 미설정 | 동시 접속 100+ 시 병목 |
| **P2** | 이메일 알림 시스템 없음 | 가입/결제 알림 불가 |
| **P2** | 에러 모니터링 없음 (Sentry 등) | 프로덕션 장애 감지 불가 |

---

## 3. 수익 모델 및 가격 전략

### 3.1 티어 구조

```
+-------------+--------------+
|    Free      |     Pro      |
|   ₩0/월      |  ₩24,900/월  |
|              | ₩249,000/연   |
|              |  (17% 할인)   |
+-------------+--------------+
| 면접 세션     |              |
|  1회/월       |  월 50회      |
+-------------+--------------+
| 질문/세션     |              |
|  7개         |  15개         |
+-------------+--------------+
| 평가 모드     |              |
|  사후 평가만   |  실시간+사후   |
+-------------+--------------+
| 분석 대시보드  |              |
|  기본 통계    |  고급 분석     |
+-------------+--------------+
| 면접 코스     |              |
|  프리셋만     |  맞춤 코스     |
+-------------+--------------+
| 이력 보관     |              |
|  30일        |  무제한       |
+-------------+--------------+
| 팔로업 질문   |              |
|  1단계       |  3단계        |
+-------------+--------------+
| 우선 지원     |              |
|  X           |  우선 이메일   |
+-------------+--------------+
```

### 3.2 AI 비용 분석 및 수익성 (2026 실제 가격 기준)

#### 3.2.1 2026년 Claude 모델 가격표

```
모델              | 입력 (per MTok) | 출력 (per MTok) | 질문당 비용*
──────────────────+────────────────+────────────────+────────────
Haiku 4.5         |     $1.00      |     $5.00      |   $0.006

* 질문당 평균 토큰: 입력 ~2,000 (시스템 프롬프트+컨텍스트+대화 이력), 출력 ~800
* 전 티어 동일 모델 사용 (Haiku 4.5)
```

> **출처:** [Anthropic API Pricing](https://docs.anthropic.com/en/docs/about-claude/pricing)
> **확인일:** 2026-02-05
> **주의:** AI 모델 가격은 변동 가능하므로 구현 시점에 재확인 필수

#### 3.2.2 질문당 비용 계산 상세

```
Haiku 4.5 (전 티어 동일):
  입력: 2,000 tokens x $1.00/1M = 2,000 x $0.000001 = $0.002
  출력:   800 tokens x $5.00/1M =   800 x $0.000005 = $0.004
  합계: $0.006/질문
```

#### 3.2.3 티어별 비용 및 수익성 분석

```
[Free 티어]
  모델: Haiku 4.5 ($0.006/질문)
  월 최대: 1세션 x 7질문 = 7질문
  사용자당 월 최대 비용: 7 x $0.006 = $0.042
  실제 사용량 (100%): 7질문 x $0.006 = $0.042
  수익: $0
  → 1,000 무료 사용자 = -$42/월

[Pro 티어]
  모델: Haiku 4.5 ($0.006/질문)
  월 최대: 50세션 x 15질문 = 750질문 (실제 40%: 300질문)
  사용자당 월 비용: 300 x $0.006 = $1.80
  최대 비용 (전량 사용 시): 750 x $0.006 = $4.50
  수익: ₩24,900 (~$19)
  → 실제 마진: +$17.20/사용자/월
  → 최대 사용 시에도 마진: +$14.50/사용자/월
```

### 3.3 손익분기점 분석

```
월 고정비용 (예상):
  서버/인프라:     $300~500
  AI API 기본비:   $100~300 (실사용 기반, 고정비 아님)
  결제 수수료:     매출의 3.4% + W400/건 (Stripe)
  모니터링/도구:   $100~200
  ────────────────────────
  합계:           $500~1,000/월

손익분기 (AI 변동비 + 고정비 기준):
  Pro:      순마진 $17.20 → ~29~58명 유료 사용자

목표: 10개월 내 유료 사용자 200명 달성
  -> Free-to-Paid 전환율 15% 가정 시 총 사용자 ~1,350명 필요
```

---

## 4. 기술 아키텍처 전환 계획

### 4.1 데이터베이스 스키마 전환

#### 4.1.1 User / UserProfile 관계 정의

> **Momus 리뷰 반영:** User와 UserProfile의 이중 신원 문제를 해결합니다.

**현재 상태 (As-Is - 2026-02-06 검증):**
- `User` 모델: **없음** (Phase 1에서 생성 예정)
- `UserProfile.email`: 존재 (`prisma/schema.prisma` Line 16)
- `UserProfile.name`: 존재 (`prisma/schema.prisma` Line 15)
- `SubscriptionTier` enum: **없음** (Phase 1에서 생성 예정)
- `userId` 필드: **없음** (Phase 1에서 추가 예정)

**목표 상태 (To-Be - Phase 1 구현 후):**

**원칙:**
- `User`: 인증/구독 데이터의 소유자. `User.name`과 `User.email`이 **신뢰의 원천(source of truth)**.
- `UserProfile`: 면접 관련 프로필 데이터 (스킬, 경력, 자기소개 등). User와 **1:1 관계** (`UserProfile.userId @unique`).
- `UserProfile.email` 필드는 **제거** (User.email 사용).
- UserProfile은 User 생성 시 자동으로 함께 생성됨.

```
+────────────────────────────────+     +────────────────────────────────+
|           User                 |     |        UserProfile             |
| (인증/구독 - Source of Truth)    |     | (면접 프로필 - Interview Data)   |
+────────────────────────────────+     +────────────────────────────────+
| id          (PK)               |<─┐  | id           (PK)              |
| email       (unique, 필수)      |  |  | userId       (unique FK -> User)|
| name        (선택)              |  └──|                                |
| passwordHash (OAuth=null)      |     | totalYearsExp                  |
| emailVerified                  |     | currentRole                    |
| subscriptionTier               |     | currentCompany                 |
| ...auth/subscription fields    |     | selfIntroduction               |
+────────────────────────────────+     | resumeText                     |
                                       | strengths, weaknesses          |
                                       | skills[], experiences[]        |
                                       | targetPositions[]              |
                                       +────────────────────────────────+
```

#### 4.1.2 새로운 핵심 모델

```prisma
// ===== 신규 모델 =====

model User {
  id              String    @id @default(cuid())
  email           String    @unique
  passwordHash    String?   // OAuth 사용자는 null (bcrypt 12 rounds)
  name            String?
  emailVerified   Boolean   @default(false)
  emailVerifyToken String?
  emailVerifyTokenExpiry DateTime?  // 토큰 만료 시간 (Momus MR-12)
  passwordResetToken String?
  passwordResetExpiry DateTime?

  // OAuth 연결
  oauthProvider   String?   // "google", "github"
  oauthProviderId String?

  // 구독 정보
  subscriptionTier SubscriptionTier @default(FREE)
  subscriptionId   String?  // Stripe subscription ID

  // 사용량 추적
  monthlySessionCount  Int      @default(0)
  monthlySessionReset  DateTime @default(now())

  // 관계
  profile          UserProfile?     // 1:1 면접 프로필
  sessions         InterviewSession[]
  subscription     Subscription?
  usageLogs        AIUsageLog[]

  // 감사
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  lastLoginAt     DateTime?
  isActive        Boolean   @default(true)
  deletedAt       DateTime?

  @@unique([oauthProvider, oauthProviderId])
  @@index([email])
  @@index([subscriptionTier])
}

// UserProfile: 면접 관련 데이터만 보유 (email 필드 제거됨)
// User.name, User.email이 Source of Truth
model UserProfile {
  id                String      @id @default(cuid())
  userId            String      @unique  // User와 1:1 관계
  user              User        @relation(fields: [userId], references: [id])

  // 면접 프로필 정보 (email 없음 - User.email 사용)
  totalYearsExp     Int
  currentRole       String
  currentCompany    String?
  selfIntroduction  String?
  resumeText        String?
  strengths         String[]
  weaknesses        String[]

  // 관계
  skills            UserSkill[]
  experiences       WorkExperience[]
  targetPositions   TargetPosition[]

  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
}

enum SubscriptionTier {
  FREE
  PRO
}

model Subscription {
  id                String   @id @default(cuid())
  userId            String   @unique
  user              User     @relation(fields: [userId], references: [id])

  // 결제 정보 (런칭 시 Stripe만)
  provider          PaymentProvider  @default(STRIPE)
  externalId        String           // Stripe subscription ID
  customerId        String           // Stripe customer ID

  // 상태
  status            SubscriptionStatus @default(TRIALING)
  tier              SubscriptionTier
  billingCycle      BillingCycle       @default(MONTHLY)

  // 금액
  amount            Int                // 원 단위 (KRW) 또는 센트 단위 (USD)
  currency          String             @default("KRW")

  // 기간
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  trialEnd           DateTime?
  canceledAt         DateTime?
  cancelReason       String?

  // 결제 이력
  payments          Payment[]

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([externalId])
  @@index([status])
}

enum PaymentProvider {
  STRIPE
  PORTONE  // 포스트 런칭(Phase 7)에서 추가
}

enum SubscriptionStatus {
  TRIALING
  ACTIVE
  PAST_DUE
  CANCELED
  SUSPENDED
  PAUSED
}

enum BillingCycle {
  MONTHLY
  YEARLY
}

model Payment {
  id              String   @id @default(cuid())
  subscriptionId  String
  subscription    Subscription @relation(fields: [subscriptionId], references: [id])

  provider        PaymentProvider
  externalId      String          // Stripe payment intent ID
  amount          Int
  currency        String
  status          PaymentStatus

  taxAmount       Int?
  taxInvoiceId    String?

  description     String?
  receiptUrl      String?
  failureReason   String?
  refundedAmount  Int?
  refundedAt      DateTime?

  createdAt       DateTime @default(now())

  @@index([subscriptionId])
  @@index([createdAt])
}

enum PaymentStatus {
  PENDING
  SUCCEEDED
  FAILED
  REFUNDED
  PARTIALLY_REFUNDED
}

// FeatureGate DB 테이블은 제거됨 -> 상수 기반 접근 (섹션 4.4 참조)
// A/B 테스트가 필요해질 때 DB 기반으로 전환 가능

model WebhookEvent {
  id              String   @id @default(cuid())
  provider        PaymentProvider
  eventType       String
  externalId      String   @unique // 이벤트 ID (멱등성)
  payload         Json
  processed       Boolean  @default(false)
  processedAt     DateTime?
  error           String?
  retryCount      Int      @default(0)

  createdAt       DateTime @default(now())

  @@index([processed, createdAt])
}

// ===== 기존 모델 변경사항 =====
// UserProfile: userId @unique FK 추가, email 필드 제거
// InterviewSession: userId FK 추가
// AIUsageLog: userId FK 추가, cost 필드 추가, tier 필드 추가
// Question: 변경 없음 (sessionId 통해 userId 간접 참조)
// Evaluation: 변경 없음
```

#### 4.1.3 기존 모델 마이그레이션

```
단계 1: User 테이블 생성
단계 2: 기존 UserProfile 데이터에서 "초기 사용자" 생성
         (UserProfile.name -> User.name, UserProfile.email -> User.email)
단계 3: UserProfile에 userId 컬럼 추가 (nullable), email 컬럼 유지 (아직 제거 안 함)
단계 4: InterviewSession, AIUsageLog에 userId 컬럼 추가 (nullable)
단계 5: 기존 데이터의 userId를 초기 사용자 ID로 채우기
단계 6: userId를 non-nullable로 변경 + @unique 제약 추가 (UserProfile)
단계 7: UserProfile.email 컬럼 제거 (User.email이 source of truth)
단계 8: userId 인덱스 추가
단계 9: Subscription, Payment, WebhookEvent 등 신규 테이블 생성
```

### 4.2 인증 시스템 전환

#### 4.2.1 새로운 인증 아키텍처

```
+─────────────────────────────────────────────────+
|                    Middleware                      |
|  +─────────────────────────────────────────────+ |
|  | 1. JWT 검증 (V1/V2 버전 분기)               | |
|  | 2. V1 토큰 -> 재로그인 리다이렉트             | |
|  | 3. V2: userId, subscriptionTier 추출         | |
|  | 4. 구독 상태 확인 (active/expired)            | |
|  | 5. Feature Gate 검증 (상수 기반)             | |
|  | 6. Rate Limit 확인 (티어별)                   | |
|  | 7. 요청 컨텍스트에 사용자 정보 주입            | |
|  +─────────────────────────────────────────────+ |
+─────────────────────────────────────────────────+
                        |
          +─────────────+─────────────+
          v             v             v
     Public Routes  Auth Routes   Protected Routes
     /login         /api/auth/*   /dashboard
     /signup                      /interview/*
     /pricing                     /api/interview/*
     /api/webhooks/*              /api/profile/*
```

#### 4.2.2 JWT 버저닝 전략

> **Momus 리뷰 반영:** 기존 V1 토큰과 새로운 V2 토큰의 공존 및 마이그레이션 전략.

```typescript
// JWT 페이로드 버전 정의

// 실제 현재 코드 (검증됨 - src/lib/auth/jwt.ts Line 13-17):
interface TokenPayload {
  authenticated: boolean;  // 항상 true
  iat: number;
  exp: number;
}
// version 필드 없음 → V1으로 간주
// signToken() 위치: src/lib/auth/jwt.ts Line 19-25

// V1 (현재): 사용자 식별 불가
interface JWTPayloadV1 {
  version: 1;           // 기존 토큰에는 없으나, version 필드 없음 = V1으로 간주
  authenticated: boolean; // true만 존재
}

// V2 (목표): 완전한 사용자 정보
interface JWTPayloadV2 {
  version: 2;
  userId: string;
  email: string;
  tier: SubscriptionTier;
  iat: number;
  exp: number;
}

type JWTPayload = JWTPayloadV1 | JWTPayloadV2;

// 버전 판별 로직
function getJWTVersion(payload: any): 1 | 2 {
  if (payload.version === 2 && payload.userId) return 2;
  return 1; // version 필드 없거나 1이면 V1
}

// V1 -> V2 마이그레이션 전략:
// 1. V1 토큰 감지 시 -> /auth/re-login 페이지로 리다이렉트
// 2. 재로그인 페이지에서 새 인증 방식으로 로그인 유도
// 3. 새 V2 토큰 발급
// 4. Phase 1 완료 후 3개월 뒤 V1 토큰 지원 완전 제거
```

#### 4.2.3 비밀번호 해싱

> **Momus 리뷰 반영:** 해싱 알고리즘 및 설정 명시.

```typescript
// bcrypt with 12 salt rounds (using existing bcryptjs dependency)
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// 12 rounds 선택 근거:
// - 10 rounds: ~10ms (약간 빠름, 보안 최소)
// - 12 rounds: ~40ms (적절한 보안/성능 균형)
// - 14 rounds: ~160ms (느림, 서버 부하 우려)
```

#### 4.2.4 새로운 인증 API 엔드포인트

```
POST /api/auth/signup          - 이메일 가입
POST /api/auth/login           - 이메일 로그인
POST /api/auth/logout          - 로그아웃
POST /api/auth/verify-email    - 이메일 인증
POST /api/auth/forgot-password - 비밀번호 재설정 요청
POST /api/auth/reset-password  - 비밀번호 재설정
GET  /api/auth/me              - 현재 사용자 정보
POST /api/auth/refresh         - 토큰 갱신

// OAuth
GET  /api/auth/oauth/google    - Google OAuth 시작
GET  /api/auth/oauth/callback  - OAuth 콜백
```

### 4.3 결제 시스템 아키텍처

#### 4.3.1 Stripe 단독 런칭 (PortOne은 Phase 7)

> **Momus 리뷰 반영:** 런칭 시 Stripe만 구현. PortOne은 포스트 런칭으로 연기.
> 추상화 레이어 설계는 유지하되, 초기에는 StripeAdapter만 구현.

```
+──────────────────────────────────────────────────────────+
|                    Payment Abstraction Layer               |
|  +──────────────────+    +───────────────────────────+   |
|  |  PaymentService   |    |  SubscriptionService       |   |
|  |  - createPayment  |    |  - create/cancel/update    |   |
|  |  - refund         |    |  - checkQuota              |   |
|  |  - getInvoice     |    |  - enforceLimit            |   |
|  +────────┬─────────+    +─────────────┬─────────────+   |
|           |                             |                  |
|  +────────┴─────────────────────────────+                  |
|  v                                                         |
|  +──────────────+    +──────────────+                     |
|  | StripeAdapter |    |PortOneAdapter| <- Phase 7 (미래)    |
|  | - checkout    |    | (미구현)      |                     |
|  | - webhook     |    |              |                     |
|  | - subscription|    |              |                     |
|  +──────┬───────+    +──────────────+                     |
+─────────+────────────────────────────────────────────────+
          v
   Stripe API
   (글로벌 + 한국 결제 지원)
```

#### 4.3.2 PCI DSS 준수 성명

> **Momus 리뷰 반영:** PCI DSS 관련 명시적 성명.

```
PCI DSS 정책:
  "본 애플리케이션은 결제 카드 데이터를 직접 저장, 처리, 또는 전송하지 않습니다.
   모든 결제 카드 처리는 PCI DSS Level 1 인증을 받은 Stripe 인프라에
   Stripe Elements를 통해 완전히 위임됩니다."

구체적으로:
  - 카드 번호, CVC, 만료일 등은 서버를 경유하지 않음
  - Stripe Elements가 클라이언트에서 직접 Stripe로 전송
  - 서버는 Stripe token/payment intent ID만 처리
  - 민감 결제 데이터는 DB에 저장하지 않음
```

#### 4.3.3 Webhook 처리 아키텍처

```
Stripe -> POST /api/webhooks/stripe
                  |
          +───────┴───────+
          v               v
    서명 검증          멱등성 확인
    (signature)     (WebhookEvent 테이블)
          |               |
          +───────┬───────+
                  v
            이벤트 처리
            +- invoice.paid -> 구독 활성화/갱신
            +- invoice.payment_failed -> PAST_DUE 전환
            +- customer.subscription.deleted -> 취소 처리
            +- customer.subscription.updated -> 업그레이드/다운그레이드
            +- charge.refunded -> 환불 처리
                  |
          +───────┴───────+
          v               v
     DB 업데이트      이메일 알림
    (트랜잭션)     (결제 확인/실패 등)
```

#### 4.3.4 Webhook 멱등성 구현 코드

> **Momus 리뷰 반영:** 구체적인 멱등성 처리 코드.

```typescript
// src/lib/payment/webhook-handler.ts

async function handleWebhook(eventId: string, handler: () => Promise<void>) {
  // 1. 이미 처리된 이벤트인지 확인
  const existing = await prisma.webhookEvent.findUnique({
    where: { externalId: eventId }
  });
  if (existing?.processed) return; // 이미 처리됨 - 멱등성 보장

  try {
    // 2. 비즈니스 로직 실행
    await handler();

    // 3. 성공 기록
    await prisma.webhookEvent.upsert({
      where: { externalId: eventId },
      create: {
        externalId: eventId,
        provider: 'STRIPE',
        eventType: '', // 호출자가 설정
        payload: {},   // 호출자가 설정
        processed: true,
        processedAt: new Date(),
      },
      update: {
        processed: true,
        processedAt: new Date(),
      }
    });
  } catch (error) {
    // 4. 실패 기록 (재시도 카운트 증가)
    await prisma.webhookEvent.upsert({
      where: { externalId: eventId },
      create: {
        externalId: eventId,
        provider: 'STRIPE',
        eventType: '',
        payload: {},
        error: error instanceof Error ? error.message : String(error),
        retryCount: 1,
      },
      update: {
        error: error instanceof Error ? error.message : String(error),
        retryCount: { increment: 1 },
      }
    });
    throw error; // Stripe가 재시도하도록 에러 전파
  }
}

// 사용 예시
app.post('/api/webhooks/stripe', async (req, res) => {
  const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

  await handleWebhook(event.id, async () => {
    switch (event.type) {
      case 'invoice.paid':
        await activateSubscription(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await cancelSubscription(event.data.object);
        break;
      // ...
    }
  });

  res.json({ received: true });
});
```

### 4.4 Feature Gate 시스템 (상수 기반)

> **Momus 리뷰 반영:** FeatureGate DB 테이블을 상수 기반으로 교체.
> A/B 테스트가 필요해지면 그때 DB 기반으로 전환.

#### 4.4.1 상수 기반 Feature Gate

```typescript
// src/lib/feature-gate.ts

import { SubscriptionTier } from '@prisma/client';

export const TIER_LIMITS = {
  FREE: {
    monthlySessions: 1,
    questionsPerSession: 7,
    realtimeEvaluation: false,
    customInterviewCourse: false,
    advancedAnalytics: false,
    historyRetentionDays: 30,
    followupDepth: 1,
    prioritySupport: false,
  },
  PRO: {
    monthlySessions: 50,
    questionsPerSession: 15,
    realtimeEvaluation: true,
    customInterviewCourse: true,
    advancedAnalytics: true,
    historyRetentionDays: null, // 무제한
    followupDepth: 3,
    prioritySupport: true,
  },
} as const;

export type TierLimits = typeof TIER_LIMITS[SubscriptionTier];

// Feature 접근 체크 유틸리티
export async function checkFeatureAccess(
  userId: string,
  feature: keyof TierLimits,
  context?: { sessionId?: string }
): Promise<{ allowed: boolean; reason?: string; upgradeUrl?: string }> {
  const user = await getUser(userId);
  const limits = TIER_LIMITS[user.subscriptionTier];
  const value = limits[feature];

  // boolean 기능: 활성/비활성
  if (typeof value === 'boolean') {
    if (!value) {
      return { allowed: false, reason: 'FEATURE_NOT_AVAILABLE', upgradeUrl: '/pricing' };
    }
    return { allowed: true };
  }

  // null = 무제한
  if (value === null) {
    return { allowed: true };
  }

  // 숫자 제한: 사용량 확인
  if (typeof value === 'number') {
    const usage = await getUsageCount(userId, feature);
    if (usage >= value) {
      return { allowed: false, reason: 'LIMIT_EXCEEDED', upgradeUrl: '/pricing' };
    }
    return { allowed: true };
  }

  return { allowed: true };
}
```

#### 4.4.2 Feature Gate 요약표

```
Feature                    | Free | Pro
───────────────────────────+──────+──────
monthly_sessions           | 3    | null
questions_per_session      | 10   | 30
realtime_evaluation        | X    | O
custom_interview_course    | X    | O
advanced_analytics         | X    | O
history_retention_days     | 30   | null
followup_depth            | 1    | 3
priority_support          | X    | O
```

### 4.5 멀티 테넌트 데이터 격리 (Prisma 미들웨어)

> **Momus 리뷰 반영:** Prisma 미들웨어를 통한 자동 userId 필터링 구체 코드.

```typescript
// src/lib/db/tenant-middleware.ts

import { AsyncLocalStorage } from 'async_hooks';

// AsyncLocalStorage를 통한 현재 사용자 ID 전달
const userContext = new AsyncLocalStorage<{ userId: string }>();

export function getCurrentUserId(): string | undefined {
  return userContext.getStore()?.userId;
}

export function runWithUser<T>(userId: string, fn: () => T): T {
  return userContext.run({ userId }, fn);
}

// 테넌트 격리 에러
export class TenantIsolationError extends Error {
  constructor() {
    super('Tenant isolation violation: no userId in context');
    this.name = 'TenantIsolationError';
  }
}

// 테넌트 스코프 모델 목록
const TENANT_SCOPED_MODELS = [
  'UserProfile',
  'InterviewSession',
  'AIUsageLog',
  'UserSkill',
  'WorkExperience',
  'TargetPosition',
  'Subscription',
  'Payment',
];

// Prisma Client Extensions: 자동 userId 필터링 (Prisma 6.x $extends() 사용)
const basePrisma = new PrismaClient();

const prisma = basePrisma.$extends({
  query: {
    $allOperations({ model, operation, args, query }) {
      if (!model || !TENANT_SCOPED_MODELS.includes(model)) {
        return query(args);
      }

      const userId = getCurrentUserId();
      if (!userId) {
        throw new TenantIsolationError();
      }

      // 읽기 쿼리: where 절에 userId 자동 주입
      if (['findMany', 'findFirst', 'findUnique'].includes(operation)) {
        args.where = { ...args.where, userId };
      }

      // 생성: userId 자동 주입
      if (operation === 'create') {
        args.data = { ...args.data, userId };
      }

      // 수정/삭제: where 절에 userId 자동 주입
      if (['update', 'delete'].includes(operation)) {
        args.where = { ...args.where, userId };
      }

      if (['updateMany', 'deleteMany'].includes(operation)) {
        args.where = { ...args.where, userId };
      }

      return query(args);
    }
  }
});

// 사용 예시 (API Route에서)
export async function GET(req: Request) {
  const userId = extractUserIdFromJWT(req);

  return runWithUser(userId, async () => {
    // 이 컨텍스트 내 모든 Prisma 쿼리는 자동으로 userId 필터링됨
    const sessions = await prisma.interviewSession.findMany({
      orderBy: { createdAt: 'desc' }
    });
    // -> 실제 쿼리: WHERE userId = '...' ORDER BY createdAt DESC

    return Response.json(sessions);
  });
}
```

### 4.6 AI 모델 설정

```
+──────────────────────────────────────────────+
|              AI Model Configuration            |
|                                                |
|  전 티어 동일: Claude Haiku 4.5                 |
|                                                |
|  요청 → Haiku 4.5 호출                         |
|  → AI Proxy → 응답                             |
|  → 토큰 사용량 로깅 (userId, 비용 포함)          |
|  → 월간 사용량 카운터 업데이트                    |
+──────────────────────────────────────────────+
```

### 4.7 기존 토큰 로깅 시스템 확장

> **참고:** 토큰 로깅 시스템(`PLAN-token-logging.md`)은 **이미 구현 완료**입니다.
> Phase 3에서 userId/cost 필드 확장만 필요합니다.

```
현재 구현 상태 (검증됨):
  - 모델 위치: prisma/schema.prisma Line 183-208
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

### 4.8 Redis 장애 대응 전략

> **Momus 리뷰 반영:** Redis 가용성 장애 시 폴백 전략.

```typescript
// src/lib/redis.ts

// Redis 영속성 설정
// - AOF (Append Only File): 모든 쓰기 연산 기록 -> 데이터 손실 최소화
// - RDB snapshots: 60초마다 1회 이상 변경 시 스냅샷 -> 빠른 복구

// 폴백 전략
class ResilientCache {
  private redis: Redis | null;
  private inMemoryFallback: Map<string, { value: string; expiry: number }>;

  async get(key: string): Promise<string | null> {
    try {
      if (this.redis) return await this.redis.get(key);
    } catch (error) {
      console.error('Redis unavailable, falling back to in-memory:', error);
      this.redis = null; // 마킹
      this.scheduleReconnect();
    }
    // 인메모리 폴백
    const entry = this.inMemoryFallback.get(key);
    if (entry && entry.expiry > Date.now()) return entry.value;
    return null;
  }
}

// 기능별 폴백 전략:
// 1. 세션 스토어: Redis 불가 시 -> DB 기반 세션 (느리지만 기능 유지)
// 2. Rate Limiting: Redis 불가 시 -> 인메모리 (정확도 감소하지만 기본 보호 유지)
// 3. 캐시: Redis 불가 시 -> 캐시 미스, DB 직접 조회 (성능 저하)
```

---

## 5. 구현 로드맵

> **Momus 리뷰 반영:** 타임라인을 현실적 ~41주(~10개월)로 확장.
> Phase를 더 세분화하고, PortOne을 Phase 7(포스트 런칭)으로 분리.

### Phase 0: 사전 준비 (Week 1-3, 3주)
> **목표:** 수익화 전환 전 기존 기술 부채 해결, 법적 선행 요건 착수

```
[ ] P0 버그 수정: fix-question-saving.md 구현
    - 서버 사이드 질문 자동 저장
    - 사용자 답변 자동 연결
    - 세션 종료 상태 정리

[ ] 토큰 로깅 시스템 검증 (이미 구현됨, 확인만)
    - AIUsageLog 모델 정상 동작 확인
    - 어드민 대시보드 기능 확인
    - 비용 추적 기초 데이터 수집 시작

[ ] 기존 스트리밍/에러 핸들링 안정화
    - streaming-error-handling.md 미구현 항목 확인
    - 프로덕션 안정성에 필요한 항목 우선 구현

[ ] E2E 테스트 보강
    - 핵심 플로우 커버리지 확보
    - CI 파이프라인 정비

[ ] 법적 선행 요건 착수 (Momus 리뷰 반영)
    - 통신판매업 신고 절차 시작 (결제 개발 전 필수!)
    - 사업자등록증 확인/발급
    - 관할 시/군/구청 신고 접수
```

### Phase 1: 인증 시스템 완성 (Week 4-12, 9주)
> **목표:** 멀티 테넌트 아키텍처 전환, User 모델, JWT V2, OAuth, Redis, GDPR 기본
> **상세 계획:** [phase-1-auth-complete.md](./phase-1-auth-complete.md)

```
[ ] 데이터베이스 스키마 전환 (Week 4-6)
    +- User 모델 생성
    +- UserProfile 1:1 관계 설정 (userId @unique)
    +- UserProfile.email 제거 (User.email = source of truth)
    +- 기존 모델에 userId FK 추가
    +- 데이터 마이그레이션 스크립트 작성
    +- Prisma 테넌트 미들웨어 구현 (섹션 4.5 참조)
    +- 마이그레이션 롤백 스크립트 준비

[ ] 인증 시스템 재구축 (Week 4-7)
    +- 이메일/비밀번호 가입/로그인
    +- 비밀번호 해싱: bcrypt 12 rounds
    +- 이메일 인증 플로우 (emailVerifyTokenExpiry 포함)
    +- 비밀번호 재설정 플로우
    +- JWT V2 페이로드 (userId, email, tier)
    +- JWT V1->V2 마이그레이션 로직 (재로그인 유도)
    +- 리프레시 토큰 구현
    +- 이메일 발송 서비스 연동 (Resend)

[ ] 미들웨어 업데이트 (Week 5-6)
    +- JWT 버전 분기 처리 (V1->재로그인, V2->정상 처리)
    +- 사용자 컨텍스트 주입 (AsyncLocalStorage)
    +- 구독 상태 검증
    +- 티어별 Rate Limiting (인메모리, Week 9+ Redis로)

[ ] OAuth 연동 (Week 8-10)
    +- Google OAuth

[ ] Redis 도입 (Week 9-11)
    +- 세션 스토어
    +- Rate Limiting 저장소
    +- 캐시 레이어
    +- Redis 장애 대응 전략 (섹션 4.8 참조)

[ ] UI 전환 (Week 7-11)
    +- 회원가입 페이지
    +- 로그인 페이지 (이메일 + OAuth)
    +- 비밀번호 재설정 페이지
    +- 계정 설정 페이지

[ ] GDPR 기본 준비 (Week 10-12)
    +- 쿠키 동의 배너
    +- 계정 삭제 기능 (soft delete + 30일 유예)
    +- 데이터 내보내기 기능 (JSON)

파일 변경 예상:
  수정: middleware.ts, prisma/schema.prisma, 모든 API routes (userId 추가), docker-compose.yml (로컬 개발용 Redis 추가), vercel.json (Cron 작업 추가)
  신규: src/lib/auth/*, src/lib/db/tenant-middleware.ts, src/app/(auth)/, src/lib/redis.ts, src/components/CookieConsent.tsx
```

### Phase 2: 결제 시스템 - Stripe (Week 13-17, 5주)
> **목표:** Stripe 결제 연동 및 구독 관리 (PortOne은 Phase 7로 연기)

```
[ ] Stripe 연동
    +- Stripe SDK 설치 및 설정
    +- Product/Price 생성 (2 tiers x 2 cycles)
    +- Checkout Session 생성 API
    +- Customer Portal 연동 (구독 관리)
    +- Webhook 엔드포인트 (/api/webhooks/stripe)
    +- 웹훅 서명 검증
    +- 웹훅 이벤트 처리 (멱등성 보장, 섹션 4.3.4 참조)

[ ] 결제 추상화 레이어
    +- PaymentService 인터페이스
    +- StripeAdapter 구현
    +- (PortOneAdapter는 Phase 7에서 구현)

[ ] 구독 관리
    +- Subscription 상태 머신 구현
    +- 업그레이드/다운그레이드 프로레이션
    +- 결제 실패 시 Grace Period (3일)
    +- 구독 취소 플로우
    +- 환불 처리

[ ] 가격 페이지 & 결제 UI
    +- /pricing 페이지 (티어 비교표)
    +- Stripe Elements 결제 모달/페이지
    +- 구독 관리 대시보드 (내 구독)
    +- 결제 이력 조회
    +- 업그레이드 유도 UI (limit 도달 시)

[ ] PCI DSS 준수 확인
    +- Stripe Elements 사용으로 카드 데이터 미접촉 확인
    +- 결제 페이지 보안 검토

파일 변경 예상:
  신규: src/lib/payment/*, src/app/api/webhooks/stripe/,
        src/app/pricing/page.tsx, src/app/billing/page.tsx
  수정: package.json (stripe 추가)
```

### Phase 3: Feature Gate & 사용량 제어 (Week 18-22, 5주)
> **목표:** 티어별 기능 분리, 사용량 제한, 토큰 로깅 확장

```
[ ] Feature Gate 시스템 (상수 기반)
    +- TIER_LIMITS 상수 정의 (섹션 4.4.1 참조)
    +- checkFeatureAccess() 유틸리티
    +- API 미들웨어 통합
    +- React Hook: useFeatureGate()
    +- UI 컴포넌트: FeatureGate, UpgradePrompt

[ ] 사용량 추적 및 제한
    +- 월간 세션 카운트 추적
    +- 세션당 질문 수 제한
    +- 이력 보관 기간 적용
    +- 사용량 대시보드 UI
    +- 한도 도달 시 알림 (이메일 + 인앱)

[ ] AI 설정
    +- 단일 모델 상수 설정 (Haiku 4.5)
    +- AI Client 모델 설정 통합
    +- 비용 계산 로직 ($0.006/질문 기준)

[ ] 토큰 로깅 확장 (기존 구현에 필드 추가)
    +- AIUsageLog에 userId, cost, tier 추가
    +- 사용자별/티어별 비용 대시보드
    +- 일일 비용 알림 설정

[ ] 맞춤형 면접 코스 (Pro 기능)
    +- CustomCourse 모델 설계
    +- 코스 생성/편집 API
    +- AI 기반 커리큘럼 생성
    +- 코스 진행 추적
    +- 코스 관리 UI

[ ] 평가 모드 차등화
    +- Free: 사후 평가만 허용
    +- Pro: 실시간 평가 허용
    +- UI에서 모드 선택 제한

파일 변경 예상:
  수정: src/lib/ai/client.ts (Haiku 4.5 설정),
        src/lib/ai/usage-logger.ts (userId, cost 확장),
        src/app/api/interview/stream/route.ts (질문 수 제한),
        src/hooks/useInterviewStream.ts (기능 게이트)
  신규: src/lib/feature-gate.ts, src/hooks/useFeatureGate.ts,
        src/components/UpgradePrompt.tsx, src/app/courses/*
```

### Phase 4: 분석 대시보드 & 이메일 알림 (Week 23-26, 4주)
> **목표:** 고급 분석 대시보드, 이메일 알림 시스템

```
[ ] 고급 분석 대시보드 (Pro)
    +- 토픽별 상세 성과 트렌드
    +- 취약 분야 AI 분석
    +- 면접 역량 레이더 차트
    +- 동료 비교 (익명화)
    +- 학습 추천 시스템

[ ] 이메일 알림 시스템
    +- 가입 환영 이메일
    +- 결제 확인/실패 알림
    +- 구독 갱신 알림 (3일 전)
    +- 사용량 한도 경고 (80%, 100%)
    +- 주간 학습 리마인더
    +- 이메일 수신 설정

파일 변경 예상:
  신규: src/lib/email/*, src/app/api/analytics/*
```

### Phase 5: 법적 요건 & 프로덕션 준비 (Week 27-31, 5주)
> **목표:** 전체 법적 준수 검토, 프로덕션 안정성, 보안 감사

```
[ ] 법적 요건 구현 (전체 검토)
    +- 개인정보처리방침 (한국어 + 영문)
    +- 이용약관
    +- 환불 정책 (전자상거래법 7일 규정)
    +- 사업자 정보 표시 (통신판매업 - Phase 0에서 신고 완료 확인)
    +- GDPR 전체 준수 검토 (기본은 Phase 1에서 구현됨)
    +- DPA (Data Processing Agreement) with Stripe, Anthropic
    +- 법률 자문 (예산 $2,000~3,000)

[ ] 계정 관리 & 데이터 삭제 (강화)
    +- 계정 탈퇴 플로우 개선 (Phase 1 기본 구현 위에)
    +- 데이터 삭제 요청 처리 프로세스 문서화
    +- 데이터 내보내기 (JSON + CSV)
    +- 감사 로그 시스템

[ ] 프로덕션 인프라
    +- Sentry 에러 모니터링 연동
    +- 헬스체크 고도화 (DB, Redis, AI Proxy, Stripe)
    +- PostgreSQL 커넥션 풀링 (PgBouncer 또는 Prisma Pool)
    +- 자동 백업 설정
    +- CI/CD 파이프라인 (GitHub Actions)
    +- 스테이징 환경 구축
    +- SSL/HTTPS 설정

[ ] 보안 강화 & 감사
    +- 결제 관련 감사 로깅
    +- 비정상 사용 탐지 (토큰 스파이크 등)
    +- OWASP 기본 보안 체크리스트
    +- 민감 데이터 암호화 (결제 메타데이터)
    +- 보안 헤더 설정 (CSP, HSTS 등)
    +- 기본 펜테스팅 (보안 검수)

[ ] 어드민 대시보드 고도화
    +- 사용자 관리 (조회, 정지, 티어 변경)
    +- 매출 대시보드 (MRR, 전환율, 해지율)
    +- AI 비용 대시보드 (사용자별, 티어별)
    +- 결제 관리 (환불 처리, 수동 구독 관리)
    +- 시스템 헬스 모니터링
```

### Phase 6: 베타 테스트 & 런칭 (Week 32-35, 4주)
> **목표:** 검증된 상태로 서비스 런칭

```
[ ] 베타 테스트
    +- 클로즈드 베타 (20~50명)
    +- 결제 플로우 실제 테스트 (W100 테스트 결제)
    +- 부하 테스트 (20 동시 사용자)
    +- 보안 검수 결과 반영
    +- 사용자 피드백 수집 및 반영

[ ] 런칭 준비
    +- 랜딩 페이지 제작
    +- SEO 최적화
    +- 소셜 미디어 준비
    +- 런칭 캠페인 (ProductHunt, 개발자 커뮤니티)
    +- 고객 지원 체계 구축 (이메일 기반)

[ ] 포스트 런칭 모니터링
    +- 일일 매출/비용 리포트
    +- 전환율 추적
    +- AI 비용 모니터링 (일일 알림)
    +- 에러율 모니터링
    +- 사용자 피드백 루프
```

### [미래] Phase 7: PortOne 통합 (포스트 런칭)
> **목표:** 한국 결제 시장을 위한 PortOne 추가 연동
> **시기:** 런칭 후 안정화 이후 (Week 37+)

```
[ ] PortOne 연동
    +- PortOne V2 SDK 설치 및 설정
    +- KG이니시스 가맹점 설정
    +- 정기결제(빌링키) 연동
    +- Webhook 엔드포인트 (/api/webhooks/portone)
    +- 카드/계좌이체/간편결제 지원
    +- PortOneAdapter 구현 (결제 추상화 레이어에 추가)

[ ] 결제 제공업체 선택 로직
    +- 한국 사용자 (locale=ko, IP=KR) -> PortOne 우선 (Stripe 대안 제공)
    +- 글로벌 사용자 -> Stripe
    +- 사용자가 직접 선택 가능

[ ] 통합 테스트 및 정합성 검증
    +- Stripe <-> PortOne 간 데이터 정합성
    +- 이중 결제 방지
    +- 통합 어드민 대시보드
```

### 타임라인 요약

```
Week  1-3  : Phase 0  - 사전 준비 + 법적 선행 (3주)
Week  4-12 : Phase 1  - 인증 시스템 완성 (User, DB 마이그레이션, JWT V2, OAuth, Redis, GDPR 기본) (9주)
Week 13-17 : Phase 2  - Stripe 결제 (5주)
Week 18-22 : Phase 3  - Feature Gate, 사용량 제어 (5주)
Week 23-26 : Phase 4  - 분석 대시보드 & 이메일 알림 (4주)
Week 27-31 : Phase 5  - 법적 준수, 프로덕션 인프라, 보안 (5주)
Week 32-35 : Phase 6  - 베타 테스트, 런칭 (4주)
──────────────────────────────────────────────────
합계: ~35주 (버퍼 포함 ~38주, ~9개월)

[포스트 런칭] Phase 7 - PortOne 통합 (런칭 후)
```

---

## 6. 기존 계획과의 통합

### 6.1 의존성 맵

```
interview-bot-plan.md (MVP 구현)
  +- 대부분 구현 완료 -> Phase 0에서 미완성 항목 확인
  +- 프롬프트 시스템, AI 클라이언트, UI 레이아웃이 수익화 기반

prompts-design.md (프롬프트 엔지니어링)
  +- 현재 Sonnet 4 기준 → Haiku 4.5로 최적화 필요
  +- 맞춤형 면접 코스용 프롬프트 확장 필요

streaming-error-handling.md (스트리밍/에러 처리)
  +- 유료 사용자에게는 더 높은 안정성 보장 필요
  +- 재시도 로직에 과금 중복 방지 고려
  +- Rate limit 에러를 티어별로 차등 처리

fix-question-saving.md (질문 저장 버그)
  ** Phase 0에서 반드시 해결 (수익화 전 필수)
  +- 유료 사용자가 질문이 저장 안 되면 환불 사유

PLAN-token-logging.md (토큰 사용량 로깅)
  ** 이미 구현 완료 (Phase 0에서 동작 확인만)
  +- Phase 3에서 userId, cost, tier 필드 확장
  +- 어드민 대시보드에 사용자별/티어별 필터 추가
```

### 6.2 기존 코드 변경이 필요한 주요 파일

```
반드시 수정:
  prisma/schema.prisma          - User 모델 추가, UserProfile 1:1 관계, email 제거
  src/middleware.ts              - JWT V1/V2 분기, 사용자 컨텍스트, Feature Gate
  src/lib/ai/client.ts          - Haiku 4.5 설정, 비용 추적
  src/lib/ai/usage-logger.ts    - userId, cost 필드 추가
  src/lib/ai/prompts.ts         - Haiku 4.5용 프롬프트 최적화
  src/app/api/interview/route.ts     - userId 필터, 세션 제한
  src/app/api/interview/stream/route.ts - 질문 수 제한
  src/app/api/interview/evaluate/route.ts - 평가 모드 제한
  src/app/interview/[sessionId]/page.tsx - Feature Gate UI
  src/hooks/useInterviewStream.ts    - 기능 제한 반영
  docker-compose.yml             - 로컬 개발용 Redis 추가
  vercel.json                    - Vercel Cron 작업 추가

주요 신규 파일:
  src/lib/auth/              - 인증 시스템 전체
  src/lib/db/tenant-middleware.ts - Prisma 테넌트 격리 미들웨어
  src/lib/payment/           - 결제 추상화 레이어 (StripeAdapter)
  src/lib/payment/webhook-handler.ts - Webhook 멱등성 처리
  src/lib/feature-gate.ts    - 상수 기반 Feature Gate
  src/lib/email/             - 이메일 서비스
  src/lib/redis.ts           - Redis 클라이언트 + 장애 대응
  src/app/(auth)/            - 회원가입, 로그인 페이지
  src/app/pricing/           - 가격 페이지
  src/app/billing/           - 구독/결제 관리
  src/app/api/webhooks/stripe/ - Stripe 웹훅
  src/app/api/auth/          - 인증 API 확장
```

---

## 7. 리스크 관리

### 7.1 Critical 리스크

| # | 리스크 | 영향 | 확률 | 대응 |
|---|--------|------|------|------|
| R1 | **AI 비용 폭주** - Free 티어 사용자 급증 시 AI 비용이 수익을 초과 | 사업 지속성 위협 | 높음 | Free 티어에 Haiku 강제, 월 1세션 하드캡, 이메일 인증 필수, 비용 일일 모니터링, 킬스위치(무료 가입 중단) 준비. 2026 가격 기준 최대 $0.042/무료사용자/월. |
| R2 | **데이터 유출** - 멀티 테넌트 전환 시 사용자 간 데이터 격리 실패 | 법적 책임, 신뢰 상실 | 중간 | Prisma 테넌트 미들웨어로 자동 userId 필터(섹션 4.5), E2E 테스트(User A -> User B 데이터 접근 불가 검증), 런칭 전 보안 검수 |
| R3 | **결제 웹훅 장애** - 결제 성공했으나 구독 활성화 안 됨 | 매출 손실, CS 부담 | 중간 | 멱등성 보장(섹션 4.3.4), 일일 정합성 체크(Stripe <-> DB), 수동 조정 도구, 장애 알림 (5분 이내) |
| R4 | **마이그레이션 실패** - 단일 사용자 -> 멀티 테넌트 스키마 전환 중 데이터 손실 | 서비스 중단, 데이터 유실 | 낮음 | 스테이징 3회 반복 테스트, 즉시 롤백 스크립트, 마이그레이션 전 풀백업, 점검 시간 운영 |

### 7.2 High 리스크

| # | 리스크 | 대응 |
|---|--------|------|
| R5 | **낮은 전환율** (Free -> Paid < 5%) | 무료 한도를 점진적으로 조정, A/B 테스트(이때 DB 기반 Feature Gate 도입), 업그레이드 유도 UI 최적화 |
| R7 | **타사 API 의존성** | (LinkedIn 기능 제거로 완화됨) Google OAuth 장애 시 이메일 로그인으로 폴백, 핵심 기능은 독립 동작 |
| R8 | **법적 요건 미준수로 과태료** | Phase 0에서 통신판매업 신고 시작, Phase 1에서 GDPR 기본 구현, Phase 5에서 법률 자문 (예산 $2,000~3,000) |
| R9 | **Redis 장애** | Redis 장애 대응 전략 (섹션 4.8 참조): DB 기반 세션 폴백, 인메모리 rate limiting 폴백 |
| R10 | **타임라인 지연** | 41주 타임라인에 이미 버퍼 포함, Phase별 독립성으로 부분 출시 가능, PortOne을 Phase 7으로 분리해 런칭 부담 감소 |

### 7.3 리스크 모니터링 대시보드

```
일일 확인:
  - AI 비용 / 매출 비율 (목표: < 40%)
  - 사용자당 평균 AI 비용 (목표: Free < $0.05, Pro < $9)
  - 웹훅 실패율 (목표: < 0.1%)
  - 에러율 (목표: < 1%)
  - Redis 가용성

주간 확인:
  - Free -> Paid 전환율 (목표: > 10%)
  - 해지율 (목표: < 5%/월)
  - MRR 추이
  - 사용자별 세션 수 분포
  - Stripe/DB 정합성 100% 확인
```

---

## 8. 법적/규제 요구사항

> **Momus 리뷰 반영:** 법적 타이밍을 수정. 통신판매업은 Phase 0, GDPR 기본은 Phase 1.

### 8.1 한국 법적 요건

```
통신판매업 신고 (필수) ** Phase 0에서 시작
  +- 사업자등록증 필요
  +- 관할 시/군/구청에 신고
  +- 사업자 정보 웹사이트 표시 의무
  +- 시기: Phase 0에서 착수 -> Phase 2(결제 개발) 시작 전까지 완료 필수

개인정보보호법 (PIPA)
  +- 개인정보처리방침 공개 (필수)
  +- 수집 항목, 목적, 보유 기간 명시
  +- 제3자 제공 동의 (Stripe, Anthropic)
  +- 개인정보 파기 절차 규정
  +- 정보주체 권리 보장 (열람, 정정, 삭제)
  +- 14세 미만 가입 제한 또는 법정대리인 동의

전자상거래법
  +- 청약 철회 (구매 후 7일 내 환불)
  +- 디지털 콘텐츠 예외 조항 명시 (이미 사용한 경우)
  +- 결제 영수증 / 세금계산서 발행
  +- 분쟁 해결 절차 안내

부가가치세법
  +- B2C: 부가세 포함 가격 표시
  +- B2B: 세금계산서 발행 의무
  +- 분기별 부가세 신고
```

### 8.2 GDPR 준비 (단계적 구현)

```
Phase 1 (기본 구현):
  +- 쿠키 동의 배너
  +- 계정 삭제 기능 (soft delete + 30일 유예)
  +- 데이터 내보내기 기능 (JSON)

Phase 5 (전체 검토):
  +- GDPR 전체 준수 점검
  +- 데이터 내보내기 CSV 추가
  +- DPA (Data Processing Agreement) with Stripe, Anthropic
  +- 데이터 보유/삭제 정책 문서화
  +- 법률 자문을 통한 최종 검토
```

---

## 9. 인프라 및 운영

### 9.1 인프라 아키텍처 (목표 상태)

```
                    +──────────────+
                    |   CDN/DNS    |
                    | (Cloudflare) |
                    +──────┬───────+
                           |
                    +──────┴───────+
                    | Load Balancer|
                    |  (Nginx)     |
                    +──────┬───────+
                           |
              +────────────+────────────+
              v            v            v
       +────────────+ +────────+ +────────────+
       | Next.js App| |Next.js | | Next.js App|
       | Instance 1 | |Inst. 2 | | Instance N |
       +─────┬──────+ +───┬────+ +─────┬──────+
             |             |             |
      +──────┴─────────────┴─────────────┴──────+
      |                                          |
+─────┴─────+  +──────────+  +──────────────+  |
| PostgreSQL |  |  Redis   |  |  AI Proxy    |  |
| (Primary)  |  | (Cache/  |  |  (Claude)    |  |
| + Replica  |  |  Session)|  |              |  |
+────────────+  +──────────+  +──────────────+  |
                                                 |
                +──────────+  +──────────────+  |
                |  Sentry  |  | Email Service|  |
                |(Monitor) |  |  (Resend)    |  |
                +──────────+  +──────────────+  |
                                                 |
                +──────────+                     |
                | Stripe   |─────────────────────+
                | (결제)    |
                +──────────+
```

### 9.2 Docker Compose (로컬 개발 환경)

```yaml
# 추가 서비스
services:
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes: ["redis_data:/data"]
    command: redis-server --appendonly yes --save 60 1  # AOF + RDB

  # PgBouncer (커넥션 풀링) - Phase 5
  pgbouncer:
    image: edoburu/pgbouncer
    depends_on: [db]
```

### 9.3 필요한 환경 변수 (추가)

```env
# 인증
JWT_SECRET=                    # JWT V2 서명 키
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
# 결제 (Stripe만 - 런칭 시)
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# 이메일
RESEND_API_KEY=
EMAIL_FROM=noreply@interviewbot.com

# Redis
REDIS_URL=redis://localhost:6379

# 모니터링
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

# Cron 작업 인증
CRON_SECRET=                   # Vercel Cron 작업 인증용

# 기능 제어 (상수 기반이지만 오버라이드용)
FREE_TIER_SESSION_LIMIT=1
FREE_TIER_QUESTION_LIMIT=7
```

### 9.4 월간 운영 비용 예상 (1,000 사용자 기준)

```
서버 (VPS/Cloud):           W200,000 ~ W400,000
PostgreSQL (Managed):        W150,000 ~ W300,000
Redis (Managed):             W50,000 ~ W100,000
AI API (Anthropic):          W800,000 ~ W2,000,000  <- 최대 비용 항목 (2026 가격 기준)
Stripe 수수료 (3.4%+W400):  매출의 ~4%
이메일 서비스:               W20,000 ~ W50,000
모니터링 (Sentry):           W30,000 ~ W50,000
도메인 + SSL:               W20,000
──────────────────────────────────────────
합계:                       W1,300,000 ~ W3,000,000/월

참고: PortOne 수수료는 Phase 7에서 추가 시 반영
      AI API 비용은 v1 대비 하향 조정 (2026 실제 가격 기준)
```

---

## 10. 성공 지표

### 10.1 Phase별 완료 기준

```
Phase 0 (사전 준비):
  V 질문 저장 버그 0건
  V 토큰 로깅 정상 동작 확인
  V E2E 테스트 통과율 > 95%
  V 통신판매업 신고 접수 완료

Phase 1 (인증 시스템 완성):
  V 이메일 가입 -> 로그인 -> 면접 진행 플로우 동작
  V JWT V2 토큰 정상 발급
  V JWT V1 토큰 -> 재로그인 리다이렉트 동작
  V User A가 User B 데이터에 접근 불가 (Prisma 미들웨어 테스트)
  V 기존 데이터 마이그레이션 성공 (무손실)
  V UserProfile.email 제거, User.email이 source of truth
  V OAuth (Google) 로그인 성공
  V Redis 세션/캐시 정상 동작
  V Redis 장애 시 폴백 동작 확인
  V 쿠키 동의 배너 표시
  V 계정 삭제 및 데이터 내보내기 동작

Phase 2 (결제):
  V Stripe 결제 -> 구독 활성화 -> 기능 해제 정상 동작
  V 결제 실패 -> Grace Period -> 기능 제한 정상 동작
  V 환불 처리 정상 동작
  V 웹훅 멱등성 확인 (동일 이벤트 중복 처리 안 함)
  V 웹훅 실패율 < 0.1%
  V Stripe/DB 정합성 100%
  V 카드 데이터 서버 미접촉 확인 (PCI DSS)
  V 통신판매업 신고 완료 확인

Phase 3 (Feature Gate):
  V Free 사용자 4번째 세션 생성 시 차단 → 업그레이드 유도
  V 사용량 대시보드 정확도 > 99%
  V AIUsageLog에 userId, cost 기록 정상
  V 맞춤 면접 코스 Pro 사용자만 접근 가능
  V 실시간 평가 Pro 사용자만 접근 가능

Phase 4 (분석 대시보드 & 이메일):
  V 고급 분석 대시보드 정상 동작
  V 이메일 알림 발송 성공 (가입, 결제, 알림)

Phase 5 (프로덕션):
  V 개인정보처리방침 + 이용약관 게시
  V 법률 자문 완료
  V 에러 모니터링 알림 동작
  V 20 동시 사용자 부하 테스트 통과
  V 보안 감사 완료

Phase 6 (런칭):
  V 베타 20명 테스트 완료
  V 실제 결제 테스트 완료 (소액)
  V 런칭 후 30일: 유료 사용자 50명+ 달성
```

### 10.2 10개월 후 비즈니스 목표

```
사용자:
  총 가입자: 1,000+
  월 활성 사용자 (MAU): 500+
  유료 사용자: 100+ (전환율 10%+)

매출:
  MRR: W1,500,000+ (~$1,100)
  AI 비용 대비 매출: > 2.5x (2026 가격 기준으로 개선됨)

서비스 품질:
  업타임: > 99.5%
  에러율: < 1%
  평균 응답 시간: < 2초 (스트리밍 제외)
  고객 만족도: NPS > 30
```

---

## 부록 A: 기술 스택 추가 의존성

```json
{
  "dependencies": {
    "stripe": "^17.x",

    "bcryptjs": "^2.x",

    "resend": "^4.x",

    "ioredis": "^5.x",

    "@sentry/nextjs": "^8.x",

    "nanoid": "^5.x",
    "date-fns": "^4.x"
  }
}
```

## 부록 B: 데이터베이스 마이그레이션 스크립트 (개요)

```sql
-- Step 1: User 테이블 생성
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT,
  "name" TEXT,
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  "emailVerifyToken" TEXT,
  "emailVerifyTokenExpiry" TIMESTAMP(3),
  "passwordResetToken" TEXT,
  "passwordResetExpiry" TIMESTAMP(3),
  "subscriptionTier" TEXT NOT NULL DEFAULT 'FREE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Step 2: 초기 사용자 생성 (기존 UserProfile 기반)
INSERT INTO "User" (id, email, name, "updatedAt")
  SELECT gen_random_uuid()::text,
         COALESCE(email, 'legacy@placeholder.com'),
         name,
         NOW()
  FROM "UserProfile" LIMIT 1;

-- Step 3: UserProfile에 userId 추가 (nullable)
ALTER TABLE "UserProfile" ADD COLUMN "userId" TEXT;

-- Step 4: 기존 모델에 userId 추가
ALTER TABLE "InterviewSession" ADD COLUMN "userId" TEXT;
ALTER TABLE "AIUsageLog" ADD COLUMN "userId" TEXT;

-- Step 5: 기존 데이터 연결
UPDATE "UserProfile" SET "userId" = (SELECT id FROM "User" LIMIT 1);
UPDATE "InterviewSession" SET "userId" = (SELECT id FROM "User" LIMIT 1);
UPDATE "AIUsageLog" SET "userId" = (SELECT id FROM "User" LIMIT 1);

-- Step 6: NOT NULL + UNIQUE 제약 추가
ALTER TABLE "UserProfile" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_key" UNIQUE ("userId");
ALTER TABLE "InterviewSession" ALTER COLUMN "userId" SET NOT NULL;

-- Step 7: UserProfile.email 컬럼 제거 (User.email이 source of truth)
ALTER TABLE "UserProfile" DROP COLUMN "email";

-- Step 8: FK 및 인덱스 추가
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id);
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id);
CREATE INDEX "idx_interview_session_user" ON "InterviewSession"("userId");
CREATE INDEX "idx_ai_usage_log_user" ON "AIUsageLog"("userId");

-- Step 9: 신규 테이블 생성
CREATE TABLE "Subscription" (...);
CREATE TABLE "Payment" (...);
CREATE TABLE "WebhookEvent" (...);
-- FeatureGate 테이블은 생성하지 않음 (상수 기반 접근)
```

## 부록 C: 주요 결정 사항 (Decision Log)

| # | 결정 | 선택 | 근거 |
|---|------|------|------|
| D1 | 멀티 테넌트 패턴 | 공유 DB + userId 필터 (Prisma 미들웨어) | 1만 사용자 미만에서 충분, 복잡도 낮음, AsyncLocalStorage로 자동화 |
| D2 | 결제 우선순위 | **Stripe 단독 런칭** | MVP 복잡도 대폭 감소, Stripe만으로도 한국 결제 가능, PortOne은 포스트 런칭(Phase 7) |
| D3 | AI 모델 전략 | Haiku 4.5 단일 모델 (전 티어) | 비용 최소화 ($0.006/질문), 전 티어 흑자 확보, 모델 차등화 대신 사용량+기능으로 차별화 |
| D4 | 인증 방식 | 직접 구현 (JWT V2) | 기존 코드 호환, NextAuth 의존성 최소화, V1->V2 마이그레이션 전략 포함 |
| D5 | 이메일 서비스 | Resend | 개발자 친화적 API, Next.js 생태계 |
| D6 | PortOne 타이밍 | **Phase 7 (포스트 런칭)** | 런칭 전 복잡도 감소, 추상화 레이어 설계는 유지하되 StripeAdapter만 먼저 구현 |
| D7 | Feature Gate 접근 | **상수 기반 (TIER_LIMITS const)** | DB 기반은 A/B 테스트 필요 시 전환, 초기에는 상수로 충분하고 타입 안전성 확보 |
| D8 | GDPR 타이밍 | **Phase 1 기본 구현** | 쿠키 동의, 계정 삭제, 데이터 내보내기를 인증과 함께 초기 구현, 전체 검토는 Phase 5 |
| D9 | 비밀번호 해싱 | **bcrypt 12 salt rounds** | 보안/성능 균형 (~40ms), 기존 bcryptjs 의존성 활용, 업계 표준 |
| D10 | AI 모델 차등화 제거 | 단일 모델 (Haiku 4.5) | Sonnet/Opus 차등화 → 사용 횟수+기능 차등으로 전환. Haiku만으로 전 티어 흑자 확보 가능. UI/UX 단순화. 비용 리스크 제거. |
| D11 | PostgreSQL | Prisma 6 호환성 + Vercel Postgres 지원 |
| D12 | Vercel 배포 | Next.js 네이티브 지원, Edge 런타임 |
| D13 | 2-tier 가격 구조 | 초기 단순화, BASIC 제거로 운영 복잡도 감소 |
| D14 | Haiku 단일 모델 | 전 티어 동일 모델로 비용 절감, AI 차등화 불필요 |

---

## 부록 D: Momus Review Responses

> 이 섹션은 Momus 비평 리뷰에서 제기된 각 우려 사항과 v2에서의 대응을 기록합니다.

### MR-1: AI 비용 계산 오류
**Momus 우려:** v1의 AI 비용 계산이 부정확한 가격 데이터에 기반하고 있음.
**v2 대응:** 2026년 실제 가격표(Haiku $1/$5, Sonnet $3/$15, Opus $15/$75 per MTok)로 전면 재산정. 질문당 비용을 입력 2,000 토큰, 출력 800 토큰 기준으로 정밀 계산. 섹션 3.2 전면 재작성.

### MR-2: User/UserProfile 이중 신원
**Momus 우려:** User와 UserProfile 모두 name/email을 가지고 있어 데이터 불일치 리스크.
**v2 대응:** UserProfile.email 제거, User.email/User.name을 source of truth로 명확화. UserProfile은 userId @unique로 1:1 관계 설정. 면접 관련 데이터만 보유. 섹션 4.1.1 신규 추가.

### MR-3: JWT 버저닝 부재
**Momus 우려:** 기존 V1 토큰에서 V2 토큰으로의 마이그레이션 전략이 없음.
**v2 대응:** JWTPayloadV1/V2 타입 정의, 버전 판별 로직, V1 토큰 감지 시 재로그인 리다이렉트 전략 추가. 3개월 후 V1 지원 완전 제거 계획. 섹션 4.2.2 전면 재작성.

### MR-4: Feature Gate DB 과설계
**Momus 우려:** FeatureGate DB 테이블은 초기 단계에서 불필요한 복잡성.
**v2 대응:** TIER_LIMITS 상수 기반 접근으로 교체. 타입 안전성 확보, 배포 없이 변경 불가하나 초기에는 충분. A/B 테스트 필요 시 DB 기반으로 전환 가능 명시. 섹션 4.4 전면 재작성.

### MR-5: 비현실적 타임라인
**Momus 우려:** 6개월(26주) 타임라인이 비현실적.
**v2 대응:** ~41주(~10개월)로 확장. Phase 1을 1A/1B로 분리, Phase별 주수 증가, PortOne을 포스트 런칭으로 분리하여 런칭 부담 감소. 섹션 5 전면 재구성.

### MR-6: 이중 결제 시스템 복잡도
**Momus 우려:** Stripe + PortOne 동시 개발은 런칭 리스크를 높임.
**v2 대응:** 런칭 시 Stripe 단독. 추상화 레이어 설계는 유지하되 StripeAdapter만 구현. PortOne은 Phase 7(포스트 런칭)으로 연기. D2, D6 결정 업데이트.

### MR-7: 법적 타이밍 문제
**Momus 우려:** 통신판매업 신고가 Phase 5(런칭 직전)에 있어 너무 늦음. GDPR 기본 요소도 늦음.
**v2 대응:** 통신판매업 신고를 Phase 0으로 이동 (결제 개발 전 필수). GDPR 기본(쿠키 동의, 계정 삭제, 데이터 내보내기)을 Phase 1로 이동. Phase 5는 전체 법적 검토로 유지. 섹션 8 업데이트.

### MR-8: Prisma 미들웨어 구체성 부족
**Momus 우려:** 테넌트 격리 미들웨어의 구체적 구현이 없음.
**v2 대응:** AsyncLocalStorage 기반 사용자 컨텍스트 관리, TENANT_SCOPED_MODELS 목록, 자동 userId 필터링 미들웨어 구체 코드 추가. 사용 예시 포함. 섹션 4.5 신규 추가.

### MR-9: Webhook 멱등성 구체성 부족
**Momus 우려:** Webhook 멱등성 처리의 구체적 구현 코드가 없음.
**v2 대응:** handleWebhook() 함수의 전체 구현 코드 추가. 이미 처리된 이벤트 스킵, 성공/실패 기록, 재시도 카운트 관리 포함. 사용 예시 포함. 섹션 4.3.4 신규 추가.

### MR-10: 토큰 로깅 중복 작업
**Momus 우려:** Phase 0에 "토큰 로깅 시스템 완성"이 있으나 이미 구현 완료됨.
**v2 대응:** Phase 0에서 "구현 완료 확인만"으로 변경. userId/cost 확장은 Phase 3으로 이동. 기존 계획과의 통합 섹션에서도 "이미 구현 완료" 명시.

### MR-11: LinkedIn 중복 구현
**Momus 우려:** LinkedIn OAuth와 프로필 가져오기가 여러 Phase에 분산되어 혼란.
**v2 대응 (이후 제거됨):** 사용자 요청에 따라 LinkedIn 기능 전체를 제거하여 제품 복잡도 감소. Phase 1에서 Google OAuth만 지원.

### MR-12: 이메일 인증 토큰 만료
**Momus 우려:** emailVerifyToken에 만료 시간이 없어 보안 취약.
**v2 대응:** emailVerifyTokenExpiry DateTime? 필드 추가. User 모델 및 마이그레이션 스크립트에 반영.

### MR-13: Redis 장애 대응 부재
**Momus 우려:** Redis 다운 시 서비스 전체 장애 가능성.
**v2 대응:** Redis 영속성 설정(AOF + RDB), 기능별 폴백 전략 추가. 세션: DB 폴백, Rate Limiting: 인메모리 폴백, 캐시: 캐시 미스. 섹션 4.8 신규 추가.

### MR-14: 비밀번호 해싱 미명시
**Momus 우려:** 비밀번호 해싱 알고리즘과 설정이 명시되지 않음.
**v2 대응:** bcrypt 12 salt rounds 명시. 기존 bcryptjs 의존성 활용. 라운드 수 선택 근거(성능/보안 균형) 문서화. 섹션 4.2.3 신규 추가.

### MR-15: PCI DSS 미언급
**Momus 우려:** 결제 데이터 처리에 대한 PCI DSS 관련 성명이 없음.
**v2 대응:** "카드 데이터를 저장/처리/전송하지 않으며, Stripe Elements를 통해 PCI DSS Level 1 인증 인프라에 완전 위임" 명시적 성명 추가. 섹션 4.3.2 신규 추가.

### MR-16: LinkedIn 및 PDF 제거
**Momus 우려:** (해당 없음)
**v3 대응:** 사용자 요청에 따라 LinkedIn 및 PDF 리포트 기능 제거. Phase 1A+1B를 단일 Phase 1로 통합(9주). Phase 4를 "분석 대시보드 & 이메일 알림"으로 단순화(4주). 총 타임라인 ~35주로 단축.

### MR-17: Decision Log 미흡
**Momus 우려:** 주요 기술 결정에 대한 문서화 부족.
**v2 대응:** D7(Feature Gate 접근), D8(GDPR 타이밍), D9(비밀번호 해싱) 추가. D2, D6 업데이트.

---

> **다음 단계:** 이 v3 계획을 기반으로 `/sisyphus`로 Phase 0 구현을 시작합니다. Phase 0 완료 후 통합된 Phase 1로 진행합니다.

---

## 부록 F: Phase 간 의존관계 및 산출물

### 의존관계 다이어그램

```
Phase 0 (사전 준비, Week 1-3)
  │ 산출물: 버그 수정, E2E 테스트, 통신판매업 신고 접수
  ▼
Phase 1 (인증, Week 4-12)
  │ 산출물: User 모델, JWT V2, requireAuth({userId,tier}), SubscriptionTier enum, Redis, Google OAuth
  ▼
Phase 2 (결제, Week 13-17)
  │ 산출물: Subscription 모델, Stripe Webhook, 가격 페이지, stripeCustomerId
  ▼
Phase 3 (Feature Gate, Week 18-22)
  │ 산출물: TIER_LIMITS 상수, checkSessionLimit(), checkBooleanFeature(), AIUsageLog 확장
  ▼
Phase 4 (분석, Week 23-26)
  │ 산출물: 분석 대시보드, 이메일 알림, 역량 레이더 차트
  ▼
Phase 5 (법적/보안, Week 27-31)
  │ 산출물: 보안 감사 통과, 법률 자문 완료, Admin 고도화, 프로덕션 인프라
  ▼
Phase 6 (베타/런칭, Week 32-35)
  │ 산출물: 베타 피드백, 부하 테스트 통과, 랜딩 페이지, 런칭
  ▼
[포스트 런칭] Phase 7 (PortOne)
```

### Phase별 핵심 산출물 (다음 Phase의 전제조건)

| Phase | 핵심 산출물 | 의존하는 Phase |
|-------|-----------|--------------|
| Phase 0 | 버그 제로, E2E 커버리지 | Phase 1 |
| Phase 1 | `User` 모델, `requireAuth()` → `{userId, tier}`, JWT V2, Redis | Phase 2, 3, 4, 5, 6 |
| Phase 2 | `Subscription` 모델, Stripe Webhook, `stripeCustomerId` | Phase 3 |
| Phase 3 | `TIER_LIMITS`, `checkSessionLimit()`, AIUsageLog 확장 | Phase 4 |
| Phase 4 | 분석 대시보드, 이메일 알림 | Phase 5 (간접) |
| Phase 5 | 보안 감사, 법률 준수, 프로덕션 인프라 | Phase 6 |

### 용어 정의

| 용어 | 정의 |
|------|------|
| `User` | 인증/구독의 주체 (Phase 1에서 생성). email, name, subscriptionTier 등 포함 |
| `UserProfile` | 면접 프로필 데이터 (기존). 스킬, 경력, 자기소개 등. User와 1:1 관계 |
| `SubscriptionTier` | Prisma enum: `FREE \| PRO` (2-tier) |
| `requireAuth()` | 인증 미들웨어. Phase 1 전: `{authenticated}` 반환. Phase 1 후: `{userId, tier}` 반환 |

---

## 부록 E: 상세 Phase 계획 문서 링크

각 Phase의 상세 구현 계획은 아래 별도 문서에서 확인할 수 있습니다:

| Phase | 문서 | 기간 | 주요 내용 |
|-------|------|------|-----------|
| Phase 0 | [phase-0-prerequisites.md](./phase-0-prerequisites.md) | Week 1-3 | 질문 저장 버그, 토큰 로깅 검증, 스트리밍 안정화, E2E 테스트, 통신판매업 신고, CI |
| Phase 1 | [phase-1-auth-complete.md](./phase-1-auth-complete.md) | Week 4-12 | User 모델, DB 마이그레이션, 이메일 인증, JWT V2, Prisma 테넌트 미들웨어, Google OAuth, Redis, 인증 UI, GDPR 기본 (쿠키 동의, 계정 삭제, 데이터 내보내기) |
| Phase 2 | [phase-2-stripe-payment.md](./phase-2-stripe-payment.md) | Week 13-17 | Stripe 결제, Checkout, Webhook 멱등성, 구독 관리, 가격 페이지 |
| Phase 3 | [phase-3-feature-gate-ai-routing.md](./phase-3-feature-gate-ai-routing.md) | Week 18-22 | TIER_LIMITS 상수, Feature Gate, 사용량 제어, 토큰 로깅 확장, 맞춤 면접 코스 |
| Phase 4 | [phase-4-analytics-dashboard.md](./phase-4-analytics-dashboard.md) | Week 23-26 | 고급 분석 대시보드, 이메일 알림 시스템 |
| Phase 5 | [phase-5-legal-production.md](./phase-5-legal-production.md) | Week 27-31 | 법적 전체 준수, Sentry, 보안 감사, 어드민 고도화, 스테이징 |
| Phase 6 | [phase-6-beta-launch.md](./phase-6-beta-launch.md) | Week 32-35 | 베타 테스트, 부하 테스트, 랜딩 페이지, SEO, 런칭 |

> **참고:** phase-1a-auth-multitenancy.md와 phase-1b-oauth-redis-gdpr.md는 phase-1-auth-complete.md로 통합되었습니다. phase-4-linkedin-advanced.md는 phase-4-analytics-dashboard.md로 이름 변경되었으며 LinkedIn 및 PDF 기능이 제거되었습니다.
> Phase 7 (PortOne)은 별도 상세 문서 미작성 (포스트 런칭 단계)
