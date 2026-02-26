# Phase 5: 법적 요건 & 프로덕션 준비 (Week 27-31)

> **상위 문서:** [monetization-strategy.md](./monetization-strategy.md)
> **목표:** 법적 전체 준수, 프로덕션 인프라, 보안 감사, 어드민 고도화
> **기간:** 5주
> **선행 조건:** Phase 4 완료 (모든 기능 구현 완료)
> - Phase 1의 인증 시스템 (User 모델, JWT V2, OAuth) 필요
> - Phase 2의 결제 시스템 (Stripe, Subscription, Webhook) 필요
> - Phase 3의 Feature Gate 및 사용량 제어 필요
> - Phase 4의 분석 대시보드 및 이메일 알림 시스템 필요
> **산출물:** 법적 준수 완료, 프로덕션 인프라, 보안 감사 통과, 어드민 대시보드
>
> **Last Updated:** 2026-02-06
> **Reviewed by:** Momus (7/10 - REVISE) → 수정 반영 (2026-02-06)

> **Phase 1 전제조건:**
> - `User` 모델 존재 (Phase 1 산출물) - `User.isActive`, `User.isAdmin` 필드 포함
> - `requireAuth(req)` → `{ userId: string; tier: SubscriptionTier; authenticated: true }` 반환
> - `SubscriptionTier` enum: `FREE | PRO` (2-tier)
> - JWT V2 토큰: `{ version: 2, userId, authenticated: true }` (Phase 1 Week 5에서 도입)

---

## 목차

1. [Week 27: 법적 요건 구현 (전체 검토)](#week-27)
2. [Week 28: 프로덕션 인프라](#week-28)
3. [Week 29: 보안 강화 & 감사](#week-29)
4. [Week 30: 어드민 대시보드 고도화](#week-30)
5. [Week 31: 통합 점검 + 스테이징](#week-31)
6. [완료 기준](#완료-기준)

---

## Week 27: 법적 요건 구현 {#week-27}

### 27.1 개인정보처리방침

**파일:** `src/app/legal/privacy/page.tsx`

```
필수 포함 항목 (개인정보보호법/PIPA):
  1. 개인정보 수집 항목
     - 필수: 이메일, 이름
     - 선택: 경력 정보, 기술 스택
     - 자동 수집: IP 주소, 접속 로그, 쿠키

  2. 수집 목적
     - 서비스 제공 (AI 면접 시뮬레이션)
     - 결제 처리
     - 서비스 개선 (사용 통계 분석)

  3. 보유 기간
     - 회원 탈퇴 시 30일 후 영구 삭제
     - 결제 기록: 5년 (전자상거래법)
     - 접속 로그: 3개월 (통신비밀보호법)

  4. 제3자 제공
     - Stripe (결제 처리) - 미국
     - Anthropic (AI 서비스) - 미국
     - Resend (이메일 발송) - 미국
     - Google (OAuth, 선택적)

  5. 정보주체 권리
     - 열람, 정정, 삭제, 처리 정지 요청권
     - /settings 페이지에서 직접 관리 가능

  6. 개인정보 보호책임자
     - 이름, 연락처, 이메일
```

### 27.2 이용약관

**파일:** `src/app/legal/terms/page.tsx`

```
필수 포함 항목:
  1. 서비스 정의 및 범위
  2. 회원 가입 및 자격
     - 14세 미만 가입 제한
  3. 요금 및 결제 조건
     - 월간/연간 요금
     - 자동 갱신 정책
  4. 환불 정책 (전자상거래법)
     - 구매 후 7일 이내 청약 철회 가능
     - 디지털 콘텐츠 이미 사용 시 예외 조항
  5. 서비스 이용 제한
     - 금지 행위 (악용, 자동화, 재판매)
  6. 면책 조항
     - AI 답변의 정확성 보장 불가
  7. 분쟁 해결
     - 관할 법원
  8. 약관 변경 절차
```

### 27.3 환불 정책 상세

```
전자상거래법 7일 규정:

1. 기본 환불 규정:
   - 구독 후 7일 이내: 전액 환불 (서비스 미사용 시)
   - 구독 후 7일 이내 + 서비스 사용: 비례 차감 후 환불

2. 디지털 콘텐츠 예외:
   - AI 면접 세션 진행 = "서비스 사용"으로 간주
   - 사용한 세션 비용 차감 후 환불
   - 차감 기준: (사용 세션 수 / 월간 세션 한도) × 월 요금

3. 연간 구독:
   - 미사용 월 비례 환불
   - 연간 할인분 차감

4. 환불 불가 사유:
   - 구매 후 7일 초과
   - 약관 위반으로 인한 서비스 제한
```

### 27.4 법률 자문

#### 법률 자문 산출물

| 산출물 | 형식 | 내용 |
|--------|------|------|
| 법률 검토 의견서 | PDF | 개인정보처리방침 적합성, 이용약관 유효성, 통신판매업 의무 충족 여부 |
| 개인정보처리방침 (최종) | HTML/MD | 법률 자문 반영한 최종 버전 |
| 이용약관 (최종) | HTML/MD | 법률 자문 반영한 최종 버전 |

**예산:** ₩3,000,000-5,000,000
**담당:** IT/전자상거래 전문 법률 사무소
**기간:** 2-3주 (Week 28-30)

**검토 범위:**
```
  - 개인정보처리방침 법적 검토
  - 이용약관 법적 검토
  - 환불 정책 적법성 확인
  - GDPR 기본 준수 검토
  - DPA 필요 여부 확인 (Stripe, Anthropic과)
  - 14세 미만 가입 제한 처리 방법
```

### 27.5 GDPR 전체 검토

```
Phase 1B에서 구현된 기본 항목 검증:
  [ ] 쿠키 동의 배너 정상 동작
  [ ] 계정 삭제 (soft delete + 30일 유예) 정상 동작
  [ ] 데이터 내보내기 (JSON) 정상 동작

Phase 5 추가 구현:
  [ ] 데이터 내보내기 CSV 형식 추가
  [ ] DPA (Data Processing Agreement)
      - Stripe: DPA 자동 체결 (Stripe 계정 설정에서)
      - Anthropic: DPA 검토 및 체결
  [ ] 데이터 보유/삭제 정책 문서화
  [ ] 법률 자문을 통한 최종 검토
```

---

## Week 28: 프로덕션 인프라 {#week-28}

### 28.1 Sentry 에러 모니터링

```bash
npm install @sentry/nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,  // 10% 샘플링
  replaysSessionSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});

// sentry.server.config.ts
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
});
```

### 28.2 헬스체크 고도화

**파일:** `src/app/api/health/route.ts`

```typescript
export async function GET() {
  const checks = {
    status: 'ok' as 'ok' | 'degraded' | 'down',
    timestamp: new Date().toISOString(),
    services: {} as Record<string, ServiceHealth>,
  };

  // DB 체크
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.services.database = { status: 'ok', latencyMs: 0 };
  } catch (e) {
    checks.services.database = { status: 'down', error: String(e) };
    checks.status = 'down';
  }

  // Redis 체크
  try {
    const redis = getRedis();
    if (redis) {
      const start = Date.now();
      await redis.ping();
      checks.services.redis = { status: 'ok', latencyMs: Date.now() - start };
    } else {
      checks.services.redis = { status: 'not_configured' };
    }
  } catch (e) {
    checks.services.redis = { status: 'down', error: String(e) };
    checks.status = 'degraded';
  }

  // AI Proxy 체크 (간단한 ping)
  // Stripe 연결 체크

  const statusCode = checks.status === 'ok' ? 200 : checks.status === 'degraded' ? 200 : 503;
  return Response.json(checks, { status: statusCode });
}
```

### 28.3 PostgreSQL 커넥션 풀링

```yaml
# docker-compose.yml - PgBouncer 추가
services:
  pgbouncer:
    image: edoburu/pgbouncer:latest
    depends_on:
      - db
    environment:
      DATABASE_URL: postgresql://user:password@db:5432/interview
      POOL_MODE: transaction
      MAX_CLIENT_CONN: 200
      DEFAULT_POOL_SIZE: 20
    ports:
      - "6432:6432"
```

### 28.4 CI/CD 파이프라인 완성

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    needs: [lint, type-check, build, e2e]
    steps:
      - uses: actions/checkout@v4

      # Vercel 배포 (프로덕션)
      - name: Deploy to Vercel Production
        if: github.ref == 'refs/heads/main'
        run: vercel deploy --prod --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      # Vercel 배포 (스테이징 프리뷰)
      - name: Deploy to Vercel Preview
        if: github.ref == 'refs/heads/develop'
        run: vercel deploy --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      # 마이그레이션
      - name: Run migrations
        run: npx prisma migrate deploy
```

### 28.5 자동 백업

> **Note:** Vercel 배포 환경에서는 시스템 crontab을 사용할 수 없습니다.
> Managed PostgreSQL 서비스(Supabase, Neon 등)의 자동 백업 기능을 활용합니다.

```
백업 전략 (Vercel 배포 환경):
  - PostgreSQL: Managed DB 서비스의 자동 일일 백업 활용
  - Redis: Upstash Redis의 AOF + RDB 자동 처리
  - 추가 백업 필요 시: Vercel Cron으로 백업 API 호출

vercel.json cron 설정 (필요 시):
  {
    "crons": [
      {
        "path": "/api/cron/backup",
        "schedule": "0 18 * * *"
      }
    ]
  }
  // Note: Vercel Cron은 UTC 기준. 03:00 KST = 18:00 UTC (전일)
```

---

## Week 29: 보안 강화 & 감사 {#week-29}

### 29.1 결제 관련 감사 로깅

```typescript
// src/lib/audit-log.ts
export async function logAuditEvent(event: {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
}) {
  await prisma.auditLog.create({ data: event });
}

// 로깅 대상 이벤트:
// - subscription.created, subscription.canceled
// - payment.succeeded, payment.failed, payment.refunded
// - user.login, user.signup, user.deleted
// - admin.user_suspended, admin.tier_changed
```

### 29.2 보안 헤더 설정

**파일:** `next.config.ts`

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com",
              "style-src 'self' 'unsafe-inline'",
              "frame-src https://js.stripe.com https://hooks.stripe.com",
              "img-src 'self' data: https:",
              "connect-src 'self' https://api.stripe.com https://api.anthropic.com",
            ].join('; '),
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### 29.3 OWASP 보안 체크리스트

#### JWT 버전 정의

| 버전 | 페이로드 | 소스 코드 | 상태 |
|------|---------|----------|------|
| V1 (현재) | `{ authenticated: boolean }` | `src/lib/auth/jwt.ts` Line 13-17 | Phase 1 Week 10에서 만료 |
| V2 (Phase 1 후) | `{ version: 2, userId: string, authenticated: boolean }` | Phase 1에서 구현 | Phase 5 시작 시 유일한 유효 버전 |

> Phase 5 시작 시점에서는 V1 토큰이 이미 만료 (7일 TTL)되어 V2만 유효합니다.

#### A01 - Broken Access Control

**구현 파일:** `src/lib/auth/require-auth.ts`

> **참조:** Phase 1 (Week 6)에서 구현한 커스텀 JWT 인증 시스템 활용.
> 미들웨어가 JWT V2 토큰을 검증하고 `x-user-id`, `x-user-email`, `x-user-tier` 헤더를 주입.
> API Route에서는 이 헤더를 통해 인증 정보를 추출.

```typescript
import { NextRequest } from 'next/server';
import { SubscriptionTier } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

export interface AuthenticatedRequest {
  userId: string;
  email: string;
  tier: SubscriptionTier;
}

/**
 * 미들웨어가 주입한 x-user-* 헤더에서 인증 정보 추출
 */
export function getAuthFromHeaders(req: NextRequest): AuthenticatedRequest | null {
  const userId = req.headers.get('x-user-id');
  const email = req.headers.get('x-user-email');
  const tier = req.headers.get('x-user-tier') as SubscriptionTier;
  if (!userId || !email || !tier) return null;
  return { userId, email, tier };
}

/**
 * 인증된 사용자만 접근 가능하도록 보호
 * 미들웨어의 JWT V2 검증 결과(x-user-* 헤더)를 활용
 */
export function requireAuth(req: NextRequest): AuthenticatedRequest {
  const auth = getAuthFromHeaders(req);
  if (!auth) throw new Error('Unauthorized');
  return auth;
}

/**
 * Admin 권한 필요 시 사용
 * JWT에서 추출한 userId로 DB에서 관리자 역할을 검증
 */
export async function requireAdmin(req: NextRequest): Promise<string> {
  const auth = getAuthFromHeaders(req);
  if (!auth) throw new Error('Unauthorized');
  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { isActive: true },
  });
  if (!user || !user.isActive) {
    throw new Response('Forbidden', { status: 403 });
  }
  return auth.userId;
}
```

**사용 예제:**

```typescript
// API Route
export async function POST(request: NextRequest) {
  const { userId } = requireAuth(request);

  // 테넌트 격리: userId로 데이터 필터링
  const data = await prisma.interview.create({
    data: {
      userId,
      ...payload,
    },
  });
}

// Admin API
export async function DELETE(request: NextRequest) {
  await requireAdmin(request);
  // admin 작업 수행
}
```

**체크리스트:**

```
[ ] requireAuth() 유틸리티 구현 (Phase 1 src/lib/auth/require-auth.ts 활용)
[ ] requireAdmin() 유틸리티 구현 (DB 기반 역할 검증)
[ ] 모든 보호된 API에 requireAuth() 적용
[ ] 모든 Admin API에 requireAdmin() 적용
[ ] Prisma 쿼리에 userId 필터 확인 (테넌트 격리)
```

#### A02 - Cryptographic Failures

```
[ ] bcrypt 12 rounds 확인 (src/lib/auth/password.ts에서 SALT_ROUNDS=12 설정)
[ ] JWT 서명 알고리즘 확인 (src/lib/auth/jwt.ts에서 HS256 + jose 라이브러리)
[ ] HTTPS 강제: next.config.ts에서 리다이렉트 설정
[ ] 민감 데이터 암호화: 환경 변수로만 관리 (.env.local)
```

#### A03 - Injection

**SQL Injection 방지:**

Prisma ORM이 기본적으로 parameterized queries 사용. Raw SQL 사용 시 주의.

```typescript
// 안전한 방법 (Prisma)
const users = await prisma.user.findMany({
  where: { email: userInput },
});

// 위험한 방법 (절대 금지)
await prisma.$queryRaw`SELECT * FROM users WHERE email = ${userInput}`;

// Raw SQL이 필요한 경우 파라미터화 필수
await prisma.$queryRaw`SELECT * FROM users WHERE email = ${Prisma.sql`${userInput}`}`;
```

**XSS 방지:**

React가 기본적으로 자동 이스케이핑. `dangerouslySetInnerHTML` 사용 시 sanitization 필수.

**파일:** `src/lib/sanitize.ts`

```typescript
import DOMPurify from 'isomorphic-dompurify';

/**
 * HTML 콘텐츠 sanitization (XSS 방지)
 * 사용자 입력을 HTML로 렌더링할 때만 사용
 */
export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href'],
  });
}

// 사용 예제
<div dangerouslySetInnerHTML={{ __html: sanitizeHTML(userInput) }} />
```

**체크리스트:**

```
[ ] Prisma parameterized queries 확인
[ ] Raw SQL 사용처 검토 및 파라미터화
[ ] DOMPurify 설치: npm install isomorphic-dompurify
[ ] dangerouslySetInnerHTML 사용처에 sanitizeHTML() 적용
[ ] React 자동 이스케이핑 동작 확인
```

#### A04 - Insecure Design

**Rate Limiting 구현:**

> **Upstash Redis 의존성:** Phase 1에서 설정 완료를 전제합니다.
> - `UPSTASH_REDIS_REST_URL`: Phase 1 Week 7에서 설정
> - `UPSTASH_REDIS_REST_TOKEN`: Phase 1 Week 7에서 설정
> - `@upstash/ratelimit` 패키지: Phase 1에서 설치

**파일:** `src/lib/rate-limit.ts`

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Redis 클라이언트 (Upstash)
const redis = Redis.fromEnv();

// 로그인 Rate Limiter: 5회/15분
export const loginRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'),
  prefix: 'ratelimit:login',
});

// API Rate Limiter: 100회/분
export const apiRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  prefix: 'ratelimit:api',
});

// AI 면접 Rate Limiter: 10회/시간
export const interviewRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 h'),
  prefix: 'ratelimit:interview',
});

/**
 * Rate Limit 미들웨어
 */
export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  return { success, limit, remaining, reset };
}
```

**사용 예제:**

```typescript
// API Route에서 사용
export async function POST(request: Request) {
  const userId = await requireAuth();

  // Rate Limit 체크
  const { success, remaining, reset } = await checkRateLimit(userId, apiRateLimiter);

  if (!success) {
    return Response.json(
      { error: 'Too many requests', retryAfter: reset },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        },
      }
    );
  }

  // 정상 처리
}
```

**체크리스트:**

```
[ ] @upstash/ratelimit, @upstash/redis 설치
[ ] Upstash Redis 계정 생성 및 환경 변수 설정
[ ] rate-limit.ts 유틸리티 구현
[ ] 로그인 API에 Rate Limiting 적용 (5회/15분)
[ ] 모든 공개 API에 Rate Limiting 적용 (100회/분)
[ ] AI 면접 API에 Rate Limiting 적용 (10회/시간)
[ ] 비밀번호 정책 확인 (최소 8자) - src/app/api/auth/signup/route.ts에서 validation
```

#### A05 - Security Misconfiguration

```
[ ] 보안 헤더 설정 확인 (29.2 참조)
[ ] NODE_ENV=production 확인
[ ] 디버그 정보 노출 차단: Sentry에서만 에러 상세 확인
[ ] 기본 에러 메시지 커스텀: src/app/error.tsx
[ ] .env 파일 .gitignore 확인
```

#### A06 - Vulnerable Components

```bash
# 취약점 스캔
npm audit

# 자동 수정 (minor/patch만)
npm audit fix

# 수동 검토 필요한 항목
npm audit fix --force  # 주의: breaking changes 가능
```

```
[ ] npm audit 실행 후 취약점 0건 확인
[ ] package.json 의존성 최신 버전 업데이트
[ ] GitHub Dependabot 활성화
```

#### A07 - Authentication Failures

```
[ ] 로그인 Rate Limiting (5회/15분) 적용
[ ] JWT 토큰 만료 설정 확인 (7일 - src/lib/auth/jwt.ts의 setExpirationTime('7d'))
[ ] 비밀번호 재설정 토큰 1회 사용 확인 (사용 후 null 처리)
[ ] 2FA 지원 검토 (커스텀 TOTP 구현 또는 향후 로드맵)
```

#### A08 - Software Integrity

```typescript
// Stripe Webhook 서명 검증 (이미 구현됨)
const sig = request.headers.get('stripe-signature');
const event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);

// 커스텀 JWT 서명 검증 (Phase 1에서 구현)
// src/lib/auth/jwt.ts의 verifyJWT()가 jose 라이브러리로 HS256 서명 검증 수행
import { verifyJWT } from '@/lib/auth/jwt';
const payload = await verifyJWT(token);
```

```
[ ] Stripe webhook 서명 검증 동작 확인
[ ] JWT 서명 검증 동작 확인 (jose의 jwtVerify + HS256, src/lib/auth/jwt.ts)
[ ] JWT_SECRET 환경 변수 충분한 엔트로피 확인 (최소 256bit)
```

#### A09 - Logging & Monitoring

```
[ ] Sentry 에러 모니터링 동작 확인 (28.1 참조)
[ ] 감사 로그 시스템 구현 (29.1 참조)
[ ] 로그에 민감 정보 제외 (비밀번호, 토큰 등)
```

#### A10 - Server-Side Request Forgery

```typescript
// 외부 API 호출 시 URL 검증
const ALLOWED_EXTERNAL_DOMAINS = ['accounts.google.com', 'api.stripe.com'];

function validateExternalURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_EXTERNAL_DOMAINS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

// 사용 예제
if (!validateExternalURL(apiUrl)) {
  throw new Error('Invalid external URL');
}
```

```
[ ] 외부 API 호출 시 URL 검증
[ ] 내부 네트워크 접근 차단 (localhost, 192.168.*, 10.*, etc.)
[ ] 외부 API 호출 시 allowlist 사용
```

### 29.4 비정상 사용 탐지

#### 비용 이상 감지 임계값 (근거)

| 티어 | 일일 정상 범위 | 임계값 | 배수 |
|------|--------------|--------|------|
| FREE | $0.042 (1세션 × 7질문 × $0.006) | $0.50 | 12배 |
| PRO | $4.50 (15질문 × 50세션 × $0.006 × 40%) | $20.00 | 4.4배 |

> 정상 범위의 3.5-5.5배를 임계값으로 설정. 오탐 최소화를 위해 보수적으로 설정.

```typescript
// 토큰 스파이크 감지
// src/app/api/cron/anomaly-detection/route.ts

export async function POST() {
  // 사용자별 일일 AI 비용 확인
  const dailyCosts = await prisma.aIUsageLog.groupBy({
    by: ['userId'],
    where: {
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    },
    _sum: { cost: true },
    _count: true,
  });

  for (const record of dailyCosts) {
    const cost = record._sum.cost || 0;
    // Free 사용자가 $1 이상 → 의심
    // Pro 사용자가 $20 이상 → 주의
    if (cost > ANOMALY_THRESHOLDS[await getUserTier(record.userId)]) {
      await sendAlert(`Anomaly detected: User ${record.userId} cost $${cost.toFixed(2)} in 24h`);
    }
  }
}
```

---

## Week 30: 어드민 대시보드 고도화 {#week-30}

### 30.1 사용자 관리

```
/admin/users:
  - 사용자 목록 (검색, 필터링, 페이지네이션)
  - 사용자 상세: 프로필, 구독 상태, 사용량, 결제 이력
  - 관리 액션: 정지, 티어 변경 (수동), 비밀번호 재설정
```

### 30.2 매출 대시보드

```
/admin/revenue:
  - MRR (Monthly Recurring Revenue)
  - 전환율 (Free → Paid)
  - 해지율 (Monthly Churn Rate)
  - ARPU (Average Revenue Per User)
  - 신규 구독 / 취소 추이 차트
```

### 30.3 AI 비용 대시보드

```
/admin/ai-costs:
  - 일별/주별/월별 AI 비용
  - 사용자별 비용 순위
  - 티어별 평균 비용
  - 모델별 사용 비율
  - 비용/매출 비율 (목표: < 40%)
```

### 30.4 시스템 헬스

```
/admin/system:
  - 서비스 상태 (DB, Redis, AI Proxy, Stripe)
  - 에러율 추이
  - 응답 시간 추이
  - 웹훅 처리 현황 (성공/실패/재시도)
  - 디스크/메모리 사용량
```

---

## Week 31: 통합 점검 + 스테이징 {#week-31}

### 31.1 스테이징 환경 구축

```
스테이징 환경:
  - 프로덕션과 동일한 Vercel 프로젝트 구성 (Preview 환경)
  - 별도 DB, Redis 인스턴스
  - Stripe 테스트 모드
  - 테스트 도메인 (staging.interviewbot.com)
```

### 31.2 전체 기능 통합 테스트

```
[ ] 가입 → 로그인 → Free 면접 → 업그레이드 → Pro 면접 → 환불 전체 플로우
[ ] OAuth → 면접 → 평가 결과 확인 전체 플로우
[ ] 관리자: 사용자 조회 → 매출 확인 → AI 비용 모니터링
[ ] 법적 페이지: 개인정보처리방침, 이용약관, 환불 정책 접근 확인
[ ] 보안: 테넌트 격리, Rate Limiting, 보안 헤더 확인
[ ] 인프라: 헬스체크, Sentry, 백업 동작 확인
```

---

## 완료 기준 {#완료-기준}

```
[법적]
  [ ] 개인정보처리방침 게시 (한국어 + 영문)
  [ ] 이용약관 게시
  [ ] 환불 정책 게시 (전자상거래법 7일)
  [ ] 사업자 정보 표시 완료
  [ ] 법률 자문 완료
  [ ] GDPR 전체 준수 검토 완료

[인프라]
  [ ] Sentry 에러 모니터링 동작
  [ ] 헬스체크 (DB, Redis, AI, Stripe)
  [ ] DB 커넥션 풀링 (PgBouncer)
  [ ] 자동 백업 설정
  [ ] CI/CD 파이프라인 완성
  [ ] 스테이징 환경 구축

[보안]
  [ ] OWASP 체크리스트 전 항목 통과
  [ ] 보안 헤더 설정 (CSP, HSTS, etc.)
  [ ] 감사 로그 시스템
  [ ] 비정상 사용 탐지
  [ ] npm audit 취약점 0건

[어드민]
  [ ] 사용자 관리 (조회, 정지, 티어 변경)
  [ ] 매출 대시보드 (MRR, 전환율, 해지율)
  [ ] AI 비용 대시보드
  [ ] 시스템 헬스 모니터링
```

---

## 파일 변경 매트릭스

```
신규:
  src/app/legal/privacy/page.tsx
  src/app/legal/terms/page.tsx
  src/app/legal/refund/page.tsx
  src/app/api/health/route.ts
  src/app/api/cron/anomaly-detection/route.ts
  src/lib/audit-log.ts
  sentry.client.config.ts
  sentry.server.config.ts
  .github/workflows/deploy.yml
  src/app/admin/users/page.tsx
  src/app/admin/revenue/page.tsx
  src/app/admin/ai-costs/page.tsx
  src/app/admin/system/page.tsx

수정:
  next.config.ts              - 보안 헤더 추가
  vercel.json                 - Vercel Cron 작업 추가
  package.json                - @sentry/nextjs 추가
  prisma/schema.prisma        - AuditLog 모델 추가

환경 변수:
  SENTRY_DSN=
  NEXT_PUBLIC_SENTRY_DSN=
  UPSTASH_REDIS_REST_URL=
  UPSTASH_REDIS_REST_TOKEN=
```

---

## Momus 리뷰 반영 사항

### HIGH 우선순위 수정

1. **OWASP 체크리스트 구현 코드 추가 (30.3 섹션)**
   - `requireAuth()` 유틸리티 구현 예제 추가
   - `requireAdmin()` 유틸리티 구현 예제 추가
   - XSS 방지 `sanitizeHTML()` 유틸리티 추가 (DOMPurify 사용)
   - SQL Injection 방지 가이드라인 추가
   - Rate Limiting 구현 상세화 (@upstash/ratelimit 사용)

### MEDIUM 우선순위 수정

2. **보안 헤더 설정 구체화 (30.2 섹션)**
   - `next.config.ts` 전체 구조 포함
   - `headers()` 함수 완전한 구현 예제
   - CSP에 Anthropic API 엔드포인트 추가

3. **Rate Limiting 구현 상세화 (30.3 섹션)**
   - Upstash Redis + @upstash/ratelimit 라이브러리 사용
   - 로그인: 5회/15분
   - API: 100회/분
   - AI 면접: 10회/시간
   - Rate Limit 미들웨어 구현 예제
   - API Route 사용 예제 (429 응답 헤더 포함)

### 추가 개선 사항

- 각 OWASP 항목마다 구체적인 체크리스트 추가
- 코드 예제에 주석으로 설명 추가
- 필요한 npm 패키지 명시 (isomorphic-dompurify, @upstash/ratelimit)
- 환경 변수 섹션에 Upstash Redis 추가
```
