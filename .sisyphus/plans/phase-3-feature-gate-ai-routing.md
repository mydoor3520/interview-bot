# Phase 3: Feature Gate & 사용량 제어 (Week 18-22)

> **Last Updated:** 2026-02-06
> **Reviewed by:** Momus (REJECT 3/10 → 전면 재작성)
>
> **상위 문서:** [monetization-strategy.md](./monetization-strategy.md)
> **목표:** 티어별 기능 제한, 세션 쿼타 관리, 토큰 로깅 확장
> **기간:** 5주
> **선행 조건:** Phase 2 완료 (Stripe 결제 + Subscription 모델)
> **산출물:** TIER_LIMITS 상수, Feature Gate 유틸리티, AIUsageLog 확장, 세션 자동 정리

---

## Phase 1-2 산출물 검증 체크리스트

> **CRITICAL:** Phase 3 시작 전 반드시 아래 항목을 검증하세요.

```bash
# 1. User 모델 존재 확인
npx prisma db pull && grep "model User" prisma/schema.prisma

# 2. SubscriptionTier enum 확인
grep "enum SubscriptionTier" prisma/schema.prisma
# 예상: enum SubscriptionTier { FREE PRO }

# 3. requireAuth() 시그니처 확인
grep -A5 "async function requireAuth" src/lib/auth/middleware.ts
# 예상: { userId: string; tier: SubscriptionTier; authenticated: true }

# 4. Subscription 모델 확인 (Phase 2 산출물)
grep "model Subscription" prisma/schema.prisma

# 5. 빌드 성공 확인
npm run build
```

> 위 검증이 하나라도 실패하면 Phase 3를 시작하지 마세요.

---

## 목차

1. [TIER_LIMITS 상수 정의](#1-tier_limits-상수-정의)
2. [Feature Gate 유틸리티](#2-feature-gate-유틸리티)
3. [세션 쿼타 관리](#3-세션-쿼타-관리)
4. [API 라우트 통합](#4-api-라우트-통합)
5. [AIUsageLog 확장](#5-aiusagelog-확장)
6. [사용량 대시보드 API](#6-사용량-대시보드-api)
7. [세션 자동 정리 (Vercel Cron)](#7-세션-자동-정리)
8. [맞춤 면접 코스 (PRO 전용)](#8-맞춤-면접-코스)
9. [구현 일정](#9-구현-일정)
10. [완료 기준](#10-완료-기준)

---

## 1. TIER_LIMITS 상수 정의

> **파일:** `src/lib/feature-gate.ts` (신규 생성)

```typescript
import { SubscriptionTier } from '@prisma/client';

// Phase 1에서 생성된 SubscriptionTier enum: FREE | PRO

export const TIER_LIMITS = {
  FREE: {
    monthlySessions: 3,          // 월 3회
    questionsPerSession: 10,     // 세션당 10개
    evaluationMode: 'after_complete' as const,  // 사후 평가만
    followUpDepth: 1,            // 팔로업 1단계
    historyRetentionDays: 30,    // 30일 보관
    customCourse: false,         // 맞춤 코스 비활성
    advancedAnalytics: false,    // 기본 통계만
    prioritySupport: false,
  },
  PRO: {
    monthlySessions: null,       // 무제한 (null = unlimited)
    questionsPerSession: 30,     // 세션당 30개
    evaluationMode: 'both' as const,  // 실시간 + 사후
    followUpDepth: 3,            // 팔로업 3단계
    historyRetentionDays: null,  // 무제한 보관
    customCourse: true,          // 맞춤 코스 활성
    advancedAnalytics: true,     // 고급 분석
    prioritySupport: true,
  },
} as const;

export type TierLimits = (typeof TIER_LIMITS)[SubscriptionTier];
export type TierFeature = keyof TierLimits;
```

---

## 2. Feature Gate 유틸리티

> **파일:** `src/lib/feature-gate.ts` (위 파일에 추가)

```typescript
/**
 * Boolean 기능 체크 (customCourse, advancedAnalytics 등)
 */
export function checkBooleanFeature(tier: SubscriptionTier, feature: keyof TierLimits): boolean {
  const value = TIER_LIMITS[tier][feature];
  return typeof value === 'boolean' ? value : true;
}

/**
 * 숫자 제한 조회 (null = 무제한)
 */
export function getNumericLimit(tier: SubscriptionTier, feature: keyof TierLimits): number | null {
  const value = TIER_LIMITS[tier][feature];
  return typeof value === 'number' ? value : null;
}
```

### 클라이언트 훅

> **파일:** `src/hooks/useFeatureGate.ts` (신규 생성)

```typescript
'use client';

import { useEffect, useState } from 'react';

interface FeatureGateData {
  tier: 'FREE' | 'PRO';
  limits: {
    monthlySessions: number | null;
    questionsPerSession: number;
    customCourse: boolean;
    advancedAnalytics: boolean;
  };
  usage: {
    sessionsThisMonth: number;
    remainingSessions: number | null;  // null = unlimited
  };
}

export function useFeatureGate() {
  const [data, setData] = useState<FeatureGateData | null>(null);

  useEffect(() => {
    fetch('/api/usage')
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, []);

  return data;
}
```

---

## 3. 세션 쿼타 관리

> **파일:** `src/lib/feature-gate.ts` (추가)

```typescript
import { prisma } from '@/lib/db/prisma';

/**
 * 세션 생성 가능 여부 확인 + 에러 메시지
 * Phase 1에서 제공: requireAuth() -> { userId, tier }
 */
export async function checkSessionLimit(userId: string, tier: SubscriptionTier): Promise<{
  allowed: boolean;
  remaining: number | null;
  message?: string;
}> {
  const limit = TIER_LIMITS[tier].monthlySessions;

  // PRO: 무제한
  if (limit === null) {
    return { allowed: true, remaining: null };
  }

  // FREE: 이번 달 세션 수 확인
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const count = await prisma.interviewSession.count({
    where: {
      // Phase 1에서 InterviewSession에 userId 필드 추가됨
      userId,
      createdAt: { gte: monthStart },
      deletedAt: null,  // soft delete 제외
    },
  });

  const remaining = limit - count;

  if (remaining <= 0) {
    return {
      allowed: false,
      remaining: 0,
      message: `이번 달 무료 면접 횟수(${limit}회)를 모두 사용했습니다. PRO로 업그레이드하면 무제한으로 이용할 수 있습니다.`,
    };
  }

  return { allowed: true, remaining };
}
```

---

## 4. API 라우트 통합

### 4.1 면접 세션 생성 (`src/app/api/interview/route.ts`)

```typescript
import { requireAuth } from '@/lib/auth/middleware';
import { checkSessionLimit, TIER_LIMITS } from '@/lib/feature-gate';

export async function POST(req: NextRequest) {
  // Phase 1에서 변경된 requireAuth() 사용
  const auth = await requireAuth(req);
  if (!auth.authenticated) return auth.response;

  const { userId, tier } = auth;

  // 세션 쿼타 확인
  const quota = await checkSessionLimit(userId, tier);
  if (!quota.allowed) {
    return NextResponse.json(
      { error: quota.message, upgradeUrl: '/pricing' },
      { status: 403 }
    );
  }

  // 질문 수 제한 적용
  const maxQuestions = TIER_LIMITS[tier].questionsPerSession;

  // ... 기존 세션 생성 로직 (userId 포함)
}
```

### 4.2 스트리밍 응답 (`src/app/api/interview/stream/route.ts`)

```typescript
// 평가 모드 체크
const evaluationMode = TIER_LIMITS[tier].evaluationMode;
// FREE: 'after_complete' -> 실시간 평가 비활성
// PRO: 'both' -> 실시간 + 사후 모두 가능

// 팔로업 깊이 체크
const maxFollowUp = TIER_LIMITS[tier].followUpDepth;
```

---

## 5. AIUsageLog 확장

### 5.1 스키마 마이그레이션

> **현재 상태 (검증됨):**
> - 모델 위치: `prisma/schema.prisma` Line 183-208
> - 구현 위치: `src/lib/ai/usage-logger.ts` Line 3-13
> - 기존 필드: sessionId, endpoint, model, promptTokens, completionTokens, totalTokens, estimated, durationMs, success, errorMessage

```prisma
// prisma/schema.prisma - AIUsageLog 확장
model AIUsageLog {
  // ... 기존 필드 유지 ...

  // Phase 3에서 추가
  userId            String?          // 사용자 ID (User FK)
  cost              Float?           // 실제 비용 (USD)
  tier              String?          // 사용 시점의 티어 ("FREE" | "PRO")

  // 관계 (Phase 1의 User 모델)
  user              User?  @relation(fields: [userId], references: [id])

  // 인덱스 추가
  @@index([userId, createdAt])
}
```

**마이그레이션:**
```bash
# 파일: prisma/migrations/YYYYMMDD_extend_ai_usage_log/migration.sql
npx prisma migrate dev --name extend_ai_usage_log
```

```sql
-- migration.sql
ALTER TABLE "AIUsageLog" ADD COLUMN "userId" TEXT;
ALTER TABLE "AIUsageLog" ADD COLUMN "cost" DOUBLE PRECISION;
ALTER TABLE "AIUsageLog" ADD COLUMN "tier" TEXT;
ALTER TABLE "AIUsageLog" ADD CONSTRAINT "AIUsageLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL;
CREATE INDEX "AIUsageLog_userId_createdAt_idx" ON "AIUsageLog"("userId", "createdAt");
```

**롤백:**
```sql
DROP INDEX IF EXISTS "AIUsageLog_userId_createdAt_idx";
ALTER TABLE "AIUsageLog" DROP CONSTRAINT IF EXISTS "AIUsageLog_userId_fkey";
ALTER TABLE "AIUsageLog" DROP COLUMN IF EXISTS "tier";
ALTER TABLE "AIUsageLog" DROP COLUMN IF EXISTS "cost";
ALTER TABLE "AIUsageLog" DROP COLUMN IF EXISTS "userId";
```

### 5.2 usage-logger.ts 업데이트

> **현재 파일:** `src/lib/ai/usage-logger.ts`

```typescript
// 변경: UsageLogParams에 새 필드 추가
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
  // Phase 3 추가 필드
  userId?: string;
  tier?: string;
}

// 비용 계산 (Haiku 4.5 기준)
function calculateCost(promptTokens: number, completionTokens: number): number {
  const inputCostPerMTok = 1.00;   // $1.00 per MTok
  const outputCostPerMTok = 5.00;  // $5.00 per MTok
  return (promptTokens * inputCostPerMTok + completionTokens * outputCostPerMTok) / 1_000_000;
}

export async function logTokenUsage(params: UsageLogParams): Promise<void> {
  try {
    const cost = calculateCost(params.promptTokens, params.completionTokens);
    await prismaBase.aIUsageLog.create({
      data: {
        ...existing fields...,
        userId: params.userId,
        cost,
        tier: params.tier,
      },
    });
  } catch (err) {
    console.error('[TokenUsage] Failed to log:', err);
  }
}
```

---

## 6. 사용량 대시보드 API

> **파일:** `src/app/api/usage/route.ts` (신규 생성)

```typescript
import { requireAuth } from '@/lib/auth/middleware';
import { TIER_LIMITS, checkSessionLimit } from '@/lib/feature-gate';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) return auth.response;
  const { userId, tier } = auth;

  const quota = await checkSessionLimit(userId, tier);
  const limits = TIER_LIMITS[tier];

  // 이번 달 비용 집계
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthlyCost = await prisma.aIUsageLog.aggregate({
    where: { userId, createdAt: { gte: monthStart } },
    _sum: { cost: true },
    _count: true,
  });

  return NextResponse.json({
    tier,
    limits: {
      monthlySessions: limits.monthlySessions,
      questionsPerSession: limits.questionsPerSession,
      customCourse: limits.customCourse,
      advancedAnalytics: limits.advancedAnalytics,
    },
    usage: {
      sessionsThisMonth: quota.remaining !== null
        ? (limits.monthlySessions! - quota.remaining)
        : null,
      remainingSessions: quota.remaining,
      monthlyQuestions: monthlyCost._count,
      monthlyCostUsd: monthlyCost._sum.cost ?? 0,
    },
  });
}
```

---

## 7. 세션 자동 정리 (Vercel Cron)

> **파일:** `src/app/api/cron/cleanup/route.ts` (신규 생성)

```typescript
import { NextRequest, NextResponse } from 'next/server';

// Vercel Cron: 매일 02:00 UTC 실행
// vercel.json: { "crons": [{ "path": "/api/cron/cleanup", "schedule": "0 2 * * *" }] }

export async function POST(req: NextRequest) {
  // Cron 인증 (Vercel이 CRON_SECRET 헤더 전송)
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  // FREE 티어: 30일 초과 세션 soft delete
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const deleted = await prisma.interviewSession.updateMany({
    where: {
      user: { subscriptionTier: 'FREE' },
      createdAt: { lt: thirtyDaysAgo },
      deletedAt: null,
    },
    data: { deletedAt: now },
  });

  // PRO 티어: 정리 없음 (무제한 보관)

  return NextResponse.json({
    cleaned: deleted.count,
    timestamp: now.toISOString(),
  });
}
```

**환경변수:**
```env
CRON_SECRET=cron_secret_value_here
```

---

## 8. 맞춤 면접 코스 (PRO 전용)

> PRO 사용자만 맞춤 면접 코스를 생성/사용할 수 있습니다.

```typescript
// API 라우트에서 Feature Gate 적용
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) return auth.response;

  if (!checkBooleanFeature(auth.tier, 'customCourse')) {
    return NextResponse.json(
      { error: '맞춤 면접 코스는 PRO 플랜에서 사용할 수 있습니다.', upgradeUrl: '/pricing' },
      { status: 403 }
    );
  }

  // ... 맞춤 코스 생성 로직
}
```

---

## 9. 구현 일정

| 주차 | 작업 | 산출물 |
|------|------|--------|
| Week 18 | TIER_LIMITS 상수 + Feature Gate 유틸리티 | `src/lib/feature-gate.ts` |
| Week 18 | 클라이언트 훅 | `src/hooks/useFeatureGate.ts` |
| Week 19 | 세션 쿼타 관리 + API 라우트 통합 | 기존 API 수정 |
| Week 19 | 업그레이드 유도 UI | 쿼타 초과 시 PRO 안내 |
| Week 20 | AIUsageLog 확장 마이그레이션 | DB 마이그레이션 + usage-logger.ts 수정 |
| Week 20 | 사용량 대시보드 API | `src/app/api/usage/route.ts` |
| Week 21 | 세션 자동 정리 Cron | `src/app/api/cron/cleanup/route.ts` |
| Week 21 | 맞춤 면접 코스 Feature Gate | PRO 전용 기능 |
| Week 22 | 통합 테스트 + 엣지 케이스 | 전체 검증 |

---

## 10. 완료 기준

### 필수 (Must Have)

```
[ ] FREE 사용자 4번째 세션 생성 시 -> 403 + "PRO로 업그레이드" 메시지
    테스트: POST /api/interview (4번째) -> { error: "이번 달 무료 면접 횟수(3회)를...", upgradeUrl: "/pricing" }

[ ] PRO 사용자 무제한 세션 생성 -> 성공
    테스트: POST /api/interview (100번째) -> 201 Created

[ ] FREE 사용자 실시간 평가 요청 -> 차단 (사후 평가만 허용)
    테스트: POST /api/interview/evaluate (evaluationMode: 'immediate', tier: FREE) -> 403

[ ] AIUsageLog에 userId, cost, tier 필드 기록
    테스트: 면접 완료 후 SELECT userId, cost, tier FROM "AIUsageLog" WHERE "sessionId" = :id -> NOT NULL

[ ] 사용량 대시보드 API 정상 응답
    테스트: GET /api/usage -> { tier, limits, usage } 정상 반환

[ ] 맞춤 코스 FREE 사용자 차단
    테스트: POST /api/course (tier: FREE) -> 403 + upgradeUrl

[ ] 세션 자동 정리 Cron 동작
    테스트: FREE 31일 전 세션 -> deletedAt NOT NULL, PRO 31일 전 세션 -> deletedAt NULL

[ ] npm run build 성공 (타입 에러 0건)
```

### 선택 (Nice to Have)

```
[ ] 쿼타 초과 시 클라이언트 업그레이드 모달
[ ] 사용량 프로그레스 바 (FREE: 1/3, 2/3, 3/3)
[ ] 월간 비용 요약 이메일 (PRO 사용자)
```

---

## 파일 변경 매트릭스

| 파일 | 작업 | 주차 |
|------|------|------|
| `src/lib/feature-gate.ts` | **신규** | Week 18 |
| `src/hooks/useFeatureGate.ts` | **신규** | Week 18 |
| `src/app/api/interview/route.ts` | 수정 (쿼타 체크 추가) | Week 19 |
| `src/app/api/interview/stream/route.ts` | 수정 (평가 모드 체크) | Week 19 |
| `prisma/schema.prisma` | 수정 (AIUsageLog 확장) | Week 20 |
| `src/lib/ai/usage-logger.ts` | 수정 (userId/cost/tier 추가) | Week 20 |
| `src/app/api/usage/route.ts` | **신규** | Week 20 |
| `src/app/api/cron/cleanup/route.ts` | **신규** | Week 21 |
| `vercel.json` | 수정 (cron 설정 추가) | Week 21 |

---

> **Momus 재검토 참고:** 이 문서는 Phase 1-2 완료를 전제로 작성되었습니다.
> Phase 1의 User 모델, requireAuth() 변경, SubscriptionTier enum이 모두 구현된 후에만 실행 가능합니다.
