# Phase 1: 완전한 인증 시스템 (Week 4-12)

> **상위 문서:** [monetization-strategy.md](./monetization-strategy.md)
> **목표:** 이메일/비밀번호 인증, OAuth (Google), JWT V2, User 모델, 멀티테넌트 격리, Redis 인프라, GDPR 기본
> **기간:** 9주 (Phase 1A + 1B 통합)
> **선행 조건:** Phase 0 완료 (질문 저장 버그 수정, E2E 테스트 기반)
> **산출물:** 완전한 인증 시스템, Redis 인프라, 회원가입/로그인 UI, GDPR 기본

---

## 목차

1. [Week 4: DB 스키마 전환 + 마이그레이션](#week-4)
2. [Week 5: 인증 API 구현](#week-5)
3. [Week 6: JWT V2 + 미들웨어 재작성](#week-6)
4. [Week 7: API Routes userId 통합 + Prisma 테넌트 미들웨어](#week-7)
5. [Week 8: 이메일 발송 + E2E 테스트 + 보안 감사](#week-8)
6. [Week 9: Google OAuth + 회원가입/로그인 UI](#week-9)
7. [Week 10: Redis 도입](#week-10)
8. [Week 11: Redis 기반 세션/캐시/Rate Limiting](#week-11)
9. [Week 12: GDPR 기본 + 계정 설정 + 통합 테스트](#week-12)
10. [롤백 전략](#롤백-전략)
11. [완료 기준](#완료-기준)
12. [Phase 2 핸드오프](#phase-2-핸드오프)

---

## Momus 리뷰 피드백 반영 사항

### CRITICAL 이슈 대응

1. **Prisma 6.x `$use()` deprecated 문제**
   - `$use()` → `$extends()` Client Extensions로 변경
   - Week 7에서 구현 (섹션 7.1, 7.2 참조)

2. **pgcrypto extension 확인**
   - Week 4 마이그레이션에 pgcrypto 활성화 확인 단계 추가
   - `gen_random_uuid()` 사용 전 extension 체크

3. **JWT V1→V2 마이그레이션 전략 명확화**
   - 현재 JWT V1은 `{ authenticated: boolean }` 만 포함 (userId 없음)
   - V1 토큰 감지 시 즉시 로그아웃 + 재로그인 유도
   - Week 6에서 명확한 마이그레이션 플로우 구현

4. **UserProfile.email 제거 영향 분석**
   - 현재 코드베이스에서 `UserProfile.email` 참조 분석 필요
   - Week 4에서 전체 검색 후 User.email 사용으로 변경
   - 파일 참조를 "modify" vs "create"로 명확히 구분

### 파일 참조 구분

- **CREATE**: 새로 생성되는 파일
- **MODIFY**: 기존 파일 수정 (현재 codebase에 존재)
- Week별 변경 사항에서 이를 명확히 표시

---

### 3.5 레거시 인증 전환 계획 (APP_PASSWORD → User 기반)

> **CRITICAL (Momus):** 기존 인증 시스템에서 새 시스템으로의 전환 계획이 필수

**현재 인증 시스템 (검증됨):**
- `src/app/api/auth/login/route.ts`: `APP_PASSWORD` 환경변수로 단일 비밀번호 검증
- `src/lib/auth/jwt.ts` Line 19-25: `signToken()`이 `{ authenticated: true }`만 포함
- `src/lib/auth/middleware.ts` Line 5: `requireAuth()` → `{ authenticated: boolean; response?: NextResponse }`
- `src/middleware.ts` Line 126-129: `jwtVerify`로 토큰 유효성만 확인 (userId 없음)

**전환 전략 (단계적):**

| 주차 | 작업 | 상세 |
|------|------|------|
| Week 4-5 | User 모델 + 이메일/비밀번호 회원가입 | `POST /api/auth/register` 신규 생성 |
| Week 5 | JWT V2 도입 | `signToken(userId)` → `{ version: 2, userId, authenticated: true }` |
| Week 6 | `requireAuth()` 시그니처 변경 | 반환: `{ userId: string; tier: SubscriptionTier; authenticated: true }` |
| Week 7 | APP_PASSWORD deprecation | 환경변수 유지, 로그인 시 deprecation 경고 로그 |
| Week 8 | Google OAuth 추가 | 대체 인증 수단 확보 |
| Week 10 | APP_PASSWORD 완전 제거 | 기존 V1 토큰 자연 만료 (7일 TTL) 후 |

**기존 세션 처리:**
- V1 토큰 (`{ authenticated: true }`): 7일 TTL로 자연 만료
- V2 토큰 (`{ version: 2, userId, ... }`): 새 로그인 시 자동 발급
- 전환 기간 (Week 6-10): V1/V2 모두 유효
  - V1 토큰 사용자: 읽기 전용 모드 (세션 목록 조회만 가능, 새 면접 시작 불가)
  - "새 로그인이 필요합니다" 배너 표시

**`requireAuth()` 변경 명세:**
```typescript
// 현재 (src/lib/auth/middleware.ts Line 5-25):
export async function requireAuth(): Promise<{ authenticated: boolean; response?: NextResponse }>

// 목표 (Phase 1 Week 6):
export async function requireAuth(req: NextRequest): Promise<{
  userId: string;
  tier: SubscriptionTier;
  authenticated: true;
} | {
  authenticated: false;
  response: NextResponse;
}>
```

**`signToken()` 변경 명세:**
```typescript
// 현재 (src/lib/auth/jwt.ts Line 19-25):
export function signToken(): string {
  return jwt.sign({ authenticated: true }, getJwtSecret(), { expiresIn: JWT_EXPIRY_SECONDS });
}

// 목표 (Phase 1 Week 5):
export function signToken(userId: string): string {
  return jwt.sign({ version: 2, userId, authenticated: true }, getJwtSecret(), { expiresIn: JWT_EXPIRY_SECONDS });
}
```

---

## Week 4: DB 스키마 전환 + 마이그레이션 {#week-4}

### 4.0 사전 작업: pgcrypto extension 확인

**CRITICAL**: `gen_random_uuid()` 사용을 위해 PostgreSQL extension 활성화 필요

```sql
-- Migration 최상단에 추가
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### 4.1 User 모델 추가

**파일 (MODIFY):** `prisma/schema.prisma`

```prisma
enum SubscriptionTier {
  FREE
  PRO
}

model User {
  id              String    @id @default(cuid())
  email           String    @unique
  passwordHash    String?   // OAuth 사용자는 null (bcrypt 12 rounds)
  name            String?
  emailVerified   Boolean   @default(false)
  emailVerifyToken String?
  emailVerifyTokenExpiry DateTime?

  passwordResetToken String?
  passwordResetExpiry DateTime?

  // OAuth (Week 9-10에서 활성화, 스키마는 선행 추가)
  oauthProvider   String?   // "google"
  oauthProviderId String?

  // 구독 정보
  subscriptionTier SubscriptionTier @default(FREE)
  subscriptionId   String?

  // 사용량 추적
  monthlySessionCount  Int      @default(0)

  // 관계
  profile          UserProfile?
  sessions         InterviewSession[]
  usageLogs        AIUsageLog[]

  // Phase 2에서 추가
  // subscription Subscription?

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
```

### 4.2 기존 모델 변경

```prisma
// UserProfile: userId 추가, email 제거, name 제거 (User.email/name이 source of truth)
model UserProfile {
  id                String      @id @default(cuid())
  userId            String      @unique  // NEW: User와 1:1 관계
  user              User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  // REMOVED: name, email 필드 → User.name, User.email 사용
  totalYearsExp     Int
  currentRole       String
  currentCompany    String?
  selfIntroduction  String?
  resumeText        String?
  strengths         String[]
  weaknesses        String[]

  skills            UserSkill[]
  experiences       WorkExperience[]
  targetPositions   TargetPosition[]

  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
}

// InterviewSession: userId 추가
model InterviewSession {
  id              String      @id @default(cuid())
  userId          String      // NEW: 세션 소유자
  user            User        @relation(fields: [userId], references: [id])
  targetPositionId String?
  targetPosition  TargetPosition? @relation(fields: [targetPositionId], references: [id])
  // ... 나머지 동일

  @@index([userId, startedAt])  // NEW
}

// AIUsageLog: userId 추가
model AIUsageLog {
  id                String   @id @default(cuid())
  userId            String?  // NEW: nullable (Phase 3에서 required로 변경)
  user              User?    @relation(fields: [userId], references: [id])
  // ... 나머지 동일

  @@index([userId])  // NEW
}
```

### 4.3 마이그레이션 전략 (10단계)

> **핵심 원칙:** 데이터 무손실, 즉시 롤백 가능, 스테이징 3회 반복 테스트

#### 마이그레이션 SQL

```sql
-- ============================================
-- Step 0: pgcrypto extension 활성화 (CRITICAL)
-- ============================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 확장 설치 검증 (Step 0 직후)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    RAISE EXCEPTION 'pgcrypto extension not available - contact DB admin';
  END IF;
END $$;

-- ============================================
-- Step 1: User 테이블 생성
-- ============================================
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
  "oauthProvider" TEXT,
  "oauthProviderId" TEXT,
  "subscriptionTier" TEXT NOT NULL DEFAULT 'FREE',
  "subscriptionId" TEXT,
  "monthlySessionCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastLoginAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_oauthProvider_oauthProviderId_key"
  ON "User"("oauthProvider", "oauthProviderId");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_subscriptionTier_idx" ON "User"("subscriptionTier");

-- ============================================
-- Step 2: 기존 UserProfile에서 초기 사용자 생성
-- ============================================
INSERT INTO "User" ("id", "email", "name", "updatedAt")
SELECT
  gen_random_uuid()::text,
  COALESCE("email", 'legacy@placeholder.com'),
  "name",
  NOW()
FROM "UserProfile"
LIMIT 1;  -- 현재 단일 사용자이므로 1개만

-- ============================================
-- Step 3: UserProfile에 userId 컬럼 추가 (nullable)
-- ============================================
ALTER TABLE "UserProfile" ADD COLUMN "userId" TEXT;

-- ============================================
-- Step 4: InterviewSession, AIUsageLog에 userId 추가
-- ============================================
ALTER TABLE "InterviewSession" ADD COLUMN "userId" TEXT;
ALTER TABLE "AIUsageLog" ADD COLUMN "userId" TEXT;

-- ============================================
-- Step 5: 기존 데이터의 userId를 초기 사용자로 채우기
-- ============================================
UPDATE "UserProfile" SET "userId" = (SELECT "id" FROM "User" LIMIT 1);
UPDATE "InterviewSession" SET "userId" = (SELECT "id" FROM "User" LIMIT 1);
UPDATE "AIUsageLog" SET "userId" = (SELECT "id" FROM "User" LIMIT 1);

-- ============================================
-- Step 6: NOT NULL + UNIQUE 제약 추가
-- ============================================
ALTER TABLE "UserProfile" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "UserProfile"
  ADD CONSTRAINT "UserProfile_userId_key" UNIQUE ("userId");
ALTER TABLE "InterviewSession" ALTER COLUMN "userId" SET NOT NULL;
-- AIUsageLog.userId는 nullable 유지 (Phase 3에서 변경)

-- ============================================
-- Step 7: UserProfile.email/name 제거 (3단계 접근)
-- CRITICAL (Momus): 코드 변경 먼저, 컬럼 삭제 나중 (zero-downtime 원칙)
-- ============================================
-- 1단계: 코드 변경 배포 (Week N)
-- 영향받는 파일 (검증됨):
--   src/lib/ai/prompts.ts Line 35: profile.name → user.name (User include 추가)
--   src/app/profile/page.tsx Line 89,90,368,369,387,393: profile.email/name → user.email/name
--   src/app/api/interview/stream/route.ts Line 81: profile.name → user.name
--
-- 2단계: 프로덕션 검증 (1주)
--   모든 API 응답에서 User.email/name 사용 확인
--   UserProfile.email/name 컬럼 접근 로그 모니터링 (접근 0건 확인)
--
-- 3단계: 마이그레이션 실행 (Week N+1)
ALTER TABLE "UserProfile" DROP COLUMN IF EXISTS "email";
ALTER TABLE "UserProfile" DROP COLUMN IF EXISTS "name";
-- 롤백:
--   ALTER TABLE "UserProfile" ADD COLUMN "email" TEXT;
--   ALTER TABLE "UserProfile" ADD COLUMN "name" TEXT NOT NULL DEFAULT '';
--   데이터 복구: UPDATE "UserProfile" SET email = u.email, name = u.name FROM "User" u WHERE "UserProfile"."userId" = u.id;

-- ============================================
-- Step 8: FK 및 인덱스 추가
-- ============================================
ALTER TABLE "UserProfile"
  ADD CONSTRAINT "UserProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

ALTER TABLE "InterviewSession"
  ADD CONSTRAINT "InterviewSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id");

ALTER TABLE "AIUsageLog"
  ADD CONSTRAINT "AIUsageLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id");

CREATE INDEX "InterviewSession_userId_startedAt_idx"
  ON "InterviewSession"("userId", "startedAt");
CREATE INDEX "AIUsageLog_userId_idx" ON "AIUsageLog"("userId");

-- ============================================
-- Step 9: LoginAttempt에 userId 추가 (optional)
-- ============================================
ALTER TABLE "LoginAttempt" ADD COLUMN "userId" TEXT;
```

#### 롤백 SQL

```sql
-- 긴급 롤백 (Step 9 → Step 0 역순)
ALTER TABLE "LoginAttempt" DROP COLUMN IF EXISTS "userId";
DROP INDEX IF EXISTS "AIUsageLog_userId_idx";
DROP INDEX IF EXISTS "InterviewSession_userId_startedAt_idx";
ALTER TABLE "AIUsageLog" DROP CONSTRAINT IF EXISTS "AIUsageLog_userId_fkey";
ALTER TABLE "InterviewSession" DROP CONSTRAINT IF EXISTS "InterviewSession_userId_fkey";
ALTER TABLE "UserProfile" DROP CONSTRAINT IF EXISTS "UserProfile_userId_fkey";
-- email, name 복원은 백업에서 복구
ALTER TABLE "UserProfile" DROP COLUMN IF EXISTS "userId";
ALTER TABLE "InterviewSession" DROP COLUMN IF EXISTS "userId";
ALTER TABLE "AIUsageLog" DROP COLUMN IF EXISTS "userId";
DROP TABLE IF EXISTS "User";
-- pgcrypto extension은 유지 (다른 용도로 사용 가능)
```

### 4.4 UserProfile.email 참조 제거 작업

**CRITICAL**: 마이그레이션 Step 7 전에 필수 작업

```bash
# UserProfile.email, UserProfile.name 참조 검색
grep -r "profile\.email" src/
grep -r "profile\.name" src/

# 예상 수정 파일:
# - src/app/api/profile/route.ts
# - src/app/profile/page.tsx
# - 기타 프로필 표시 컴포넌트
```

**수정 전략:**
- `profile.email` → `user.email`
- `profile.name` → `user.name`
- Prisma 쿼리에 `include: { user: { select: { email: true, name: true } } }` 추가

### 4.5 초기 사용자 비밀번호 설정 스크립트

**파일 (CREATE):** `prisma/seed-migration.ts`

```typescript
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error('No user found');

  // 환경변수에서 초기 비밀번호 읽기
  const password = process.env.INITIAL_USER_PASSWORD;
  if (!password) throw new Error('INITIAL_USER_PASSWORD not set');

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hash, emailVerified: true }
  });

  console.log(`User ${user.email} password set successfully`);
}

main().finally(() => prisma.$disconnect());
```

### 4.6 Week 4 테스트 항목

```
[ ] pgcrypto extension 활성화 확인
[ ] Prisma migrate 성공 (스테이징에서 3회 반복)
[ ] User 테이블 생성 확인
[ ] 기존 UserProfile → User 데이터 정상 이관
[ ] UserProfile.userId 1:1 관계 정상 동작
[ ] InterviewSession.userId FK 정상
[ ] UserProfile.email/name 제거 후 코드 정상 동작
[ ] 기존 API 동작 유지 (하위 호환성)
[ ] 롤백 SQL 테스트 통과
[ ] prisma generate 후 타입 오류 없음
```

---

## Week 5: 인증 API 구현 {#week-5}

### 5.1 비밀번호 해싱 유틸리티

**파일 (CREATE):** `src/lib/auth/password.ts`

```typescript
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

### 5.2 인증 API 엔드포인트

#### POST /api/auth/signup

**파일 (CREATE):** `src/app/api/auth/signup/route.ts`

```typescript
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { hashPassword } from '@/lib/auth/password';
import { signJWTV2 } from '@/lib/auth/jwt';
import { sendVerificationEmail } from '@/lib/email';
import { prisma } from '@/lib/db/prisma';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(50).optional(),
});

export async function POST(req: Request) {
  const body = signupSchema.parse(await req.json());

  // 1. 이메일 중복 체크
  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) return Response.json({ error: '이미 등록된 이메일입니다.' }, { status: 409 });

  // 2. 비밀번호 해싱
  const passwordHash = await hashPassword(body.password);

  // 3. User + UserProfile 동시 생성 (트랜잭션)
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email: body.email,
        passwordHash,
        name: body.name,
        emailVerifyToken: nanoid(),
        emailVerifyTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24시간
        profile: {
          create: {
            totalYearsExp: 0,
            currentRole: '',
          }
        }
      }
    });
    return newUser;
  });

  // 4. 인증 이메일 발송 (Week 8에서 본격 구현)
  await sendVerificationEmail(user.email, user.emailVerifyToken!);

  // 5. JWT V2 토큰 발급
  const token = await signJWTV2({
    userId: user.id,
    email: user.email,
    tier: user.subscriptionTier,
  });

  return Response.json({ user: { id: user.id, email: user.email } }, {
    status: 201,
    headers: { 'Set-Cookie': `token=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800` }
  });
}
```

#### POST /api/auth/login

**파일 (CREATE):** `src/app/api/auth/login/route.ts`

```typescript
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(req: Request) {
  const body = loginSchema.parse(await req.json());

  // 1. Rate limiting (IP 기반, 기존 LoginAttempt 활용)
  const ip = getClientIp(req);
  await checkLoginRateLimit(ip);

  // 2. 사용자 조회
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user || !user.passwordHash) {
    await recordLoginAttempt(ip, false);
    return Response.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }

  // 3. 비밀번호 검증
  const valid = await verifyPassword(body.password, user.passwordHash);
  if (!valid) {
    await recordLoginAttempt(ip, false);
    return Response.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }

  // 4. 로그인 기록
  await recordLoginAttempt(ip, true, user.id);
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  // 5. JWT V2 발급
  const token = await signJWTV2({
    userId: user.id,
    email: user.email,
    tier: user.subscriptionTier,
  });

  return Response.json({ user: { id: user.id, email: user.email, tier: user.subscriptionTier } }, {
    headers: { 'Set-Cookie': `token=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800` }
  });
}
```

#### 기타 인증 엔드포인트

**파일 (CREATE):**
- `src/app/api/auth/logout/route.ts`
- `src/app/api/auth/verify-email/route.ts`
- `src/app/api/auth/forgot-password/route.ts`
- `src/app/api/auth/reset-password/route.ts`
- `src/app/api/auth/me/route.ts`
- `src/app/api/auth/refresh/route.ts`

```
POST /api/auth/logout
  - 쿠키 삭제 (maxAge=0)

POST /api/auth/verify-email
  - token 파라미터로 emailVerifyToken 매칭
  - emailVerifyTokenExpiry 만료 확인
  - emailVerified = true 업데이트

POST /api/auth/forgot-password
  - 이메일로 비밀번호 재설정 토큰 발송
  - passwordResetToken + passwordResetExpiry (1시간) 설정

POST /api/auth/reset-password
  - token + newPassword로 비밀번호 변경
  - passwordResetExpiry 만료 확인
  - 기존 세션 무효화 (JWT 블랙리스트 또는 토큰 재발급)

GET /api/auth/me
  - JWT에서 userId 추출
  - User + Profile 정보 반환

POST /api/auth/refresh
  - 현재 토큰의 userId로 새 토큰 발급
  - 구독 상태 최신 반영
```

### 5.3 Week 5 테스트 항목

```
[ ] 회원가입 → 이메일 + 비밀번호 → User 생성 + UserProfile 자동 생성
[ ] 회원가입 → 중복 이메일 → 409 에러
[ ] 로그인 → 올바른 자격증명 → JWT V2 토큰 발급
[ ] 로그인 → 잘못된 비밀번호 → 401 에러
[ ] 로그인 → 존재하지 않는 이메일 → 401 에러 (동일 메시지로 이메일 유출 방지)
[ ] Rate Limiting → 5회 실패 후 잠금 → 429 에러
[ ] 이메일 인증 → 유효 토큰 → emailVerified = true
[ ] 이메일 인증 → 만료 토큰 → 400 에러
[ ] 비밀번호 재설정 → 전체 플로우 동작
[ ] /api/auth/me → 인증된 사용자 정보 반환
```

---

## Week 6: JWT V2 + 미들웨어 재작성 {#week-6}

### 6.1 JWT V2 구현

**파일 (CREATE):** `src/lib/auth/jwt.ts`

```typescript
import { SignJWT, jwtVerify } from 'jose';
import { SubscriptionTier } from '@prisma/client';

// JWT 페이로드 타입 정의
interface JWTPayloadV1 {
  authenticated: boolean;
  // V1에는 userId가 없음 - CRITICAL 이슈
}

interface JWTPayloadV2 {
  version: 2;
  userId: string;
  email: string;
  tier: SubscriptionTier;
}

type JWTPayload = JWTPayloadV1 | JWTPayloadV2;

// 버전 판별
export function getJWTVersion(payload: Record<string, unknown>): 1 | 2 {
  if (payload.version === 2 && typeof payload.userId === 'string') return 2;
  return 1;
}

// V2 토큰 생성
export async function signJWTV2(data: Omit<JWTPayloadV2, 'version'>): Promise<string> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  return new SignJWT({ ...data, version: 2 })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

// 토큰 검증 (V1, V2 모두)
export async function verifyJWT(token: string): Promise<{
  version: 1 | 2;
  payload: JWTPayload;
}> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const { payload } = await jwtVerify(token, secret);
  const version = getJWTVersion(payload as Record<string, unknown>);
  return { version, payload: payload as unknown as JWTPayload };
}
```

### 6.2 JWT V1→V2 마이그레이션 전략 (CRITICAL 이슈 대응)

**문제:**
- 현재 JWT V1은 `{ authenticated: boolean }` 만 포함
- userId가 없어 사용자를 식별할 수 없음

**해결 전략:**
1. V1 토큰 감지 시 즉시 로그아웃 처리
2. `/login?reason=upgrade` 리다이렉트
3. 사용자에게 "보안 업그레이드로 재로그인이 필요합니다" 안내
4. 재로그인 시 V2 토큰 발급

**장점:**
- 단순하고 안전한 마이그레이션
- V1 토큰에 userId가 없어 자동 전환 불가능하므로 재인증 불가피
- 사용자 경험 저하 최소화 (1회만 발생)

### 6.3 미들웨어 재작성

**파일 (MODIFY):** `src/middleware.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, JWTPayloadV2 } from '@/lib/auth/jwt';

// 변경 사항:
// 1. JWT V1/V2 분기 처리
// 2. V1 토큰 → /login?reason=upgrade 리다이렉트 (CRITICAL 이슈 대응)
// 3. V2: userId, tier 추출 → request headers에 주입
// 4. 새로운 public paths 추가 (/signup, /pricing)

const PUBLIC_PATHS = [
  '/login', '/signup', '/pricing',
  '/api/auth',
  '/api/webhooks',  // Phase 2에서 Stripe webhook용
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static paths 체크 (기존 유지)
  if (pathname.startsWith('/_next') || pathname.startsWith('/static')) {
    return NextResponse.next();
  }

  // Admin route 체크 (기존 유지)
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    // Admin 인증 로직 (기존 코드 유지)
  }

  // Public paths 체크
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    // 인증된 사용자가 login/signup 방문 시 dashboard로 리다이렉트
    if (pathname === '/login' || pathname === '/signup') {
      const token = request.cookies.get('token')?.value;
      if (token) {
        try {
          const { version } = await verifyJWT(token);
          if (version === 2) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
          }
        } catch { /* 무시 */ }
      }
    }
    return NextResponse.next();
  }

  // 인증 필수 라우트
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { version, payload } = await verifyJWT(token);

    // V1 토큰 → 재로그인 유도 (CRITICAL 이슈 대응)
    if (version === 1) {
      const response = NextResponse.redirect(new URL('/login?reason=upgrade', request.url));
      response.cookies.set('token', '', { maxAge: 0, path: '/' });
      return response;
    }

    // V2 토큰 → 사용자 정보를 request headers에 주입
    const v2 = payload as JWTPayloadV2;
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', v2.userId);
    requestHeaders.set('x-user-email', v2.email);
    requestHeaders.set('x-user-tier', v2.tier);

    return NextResponse.next({
      request: { headers: requestHeaders }
    });
  } catch {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.set('token', '', { maxAge: 0, path: '/' });
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### 6.4 사용자 컨텍스트 (AsyncLocalStorage)

**파일 (CREATE):** `src/lib/auth/context.ts`

```typescript
import { AsyncLocalStorage } from 'async_hooks';
import { SubscriptionTier } from '@prisma/client';

interface UserContext {
  userId: string;
  email: string;
  tier: SubscriptionTier;
}

const userContextStorage = new AsyncLocalStorage<UserContext>();

export function getCurrentUser(): UserContext | undefined {
  return userContextStorage.getStore();
}

export function requireCurrentUser(): UserContext {
  const user = getCurrentUser();
  if (!user) throw new Error('Authentication required');
  return user;
}

export function runWithUser<T>(user: UserContext, fn: () => T): T {
  return userContextStorage.run(user, fn);
}
```

### 6.5 API Route 헬퍼

**파일 (CREATE):** `src/lib/auth/require-auth.ts`

```typescript
import { NextRequest } from 'next/server';
import { SubscriptionTier } from '@prisma/client';

export interface AuthenticatedRequest {
  userId: string;
  email: string;
  tier: SubscriptionTier;
}

export function getAuthFromHeaders(req: NextRequest): AuthenticatedRequest | null {
  const userId = req.headers.get('x-user-id');
  const email = req.headers.get('x-user-email');
  const tier = req.headers.get('x-user-tier') as SubscriptionTier;

  if (!userId || !email || !tier) return null;
  return { userId, email, tier };
}

export function requireAuth(req: NextRequest): AuthenticatedRequest {
  const auth = getAuthFromHeaders(req);
  if (!auth) throw new Error('Unauthorized');
  return auth;
}
```

### 6.6 Week 6 테스트 항목

```
[ ] V1 토큰으로 보호된 라우트 접근 → /login?reason=upgrade 리다이렉트
[ ] V1 토큰으로 로그인 시도 → 쿠키 삭제 + 재로그인 필요 안내
[ ] V2 토큰 정상 발급 및 검증
[ ] V2 토큰으로 보호된 라우트 접근 → x-user-id 헤더 주입 확인
[ ] 만료된 토큰 → /login 리다이렉트 + 쿠키 삭제
[ ] /signup, /pricing 페이지 인증 없이 접근 가능
[ ] 인증된 사용자 /login 방문 → /dashboard 리다이렉트
```

---

## Week 7: API Routes userId 통합 + Prisma 테넌트 미들웨어 {#week-7}

### 7.1 Prisma Client Extensions (Momus CRITICAL 이슈 대응)

**CRITICAL**: Prisma 6.x에서 `$use()` middleware는 deprecated
- `$use()` → `$extends()` Client Extensions로 변경
- 더 강력하고 타입 안전한 API

**파일 (CREATE):** `src/lib/db/tenant-extension.ts`

```typescript
import { Prisma } from '@prisma/client';

// 테넌트 격리가 필요한 모델
const TENANT_SCOPED_MODELS = new Set([
  'UserProfile',
  'InterviewSession',
  'AIUsageLog',
  'UserSkill',
  'WorkExperience',
  'TargetPosition',
]);

// userId를 직접 가진 모델 (직접 필터링)
const DIRECT_USER_MODELS = new Set([
  'UserProfile',
  'InterviewSession',
  'AIUsageLog',
]);

// Prisma Client Extension으로 테넌트 격리 구현
export function createTenantExtension(getCurrentUserId: () => string | undefined) {
  return Prisma.defineExtension((client) => {
    return client.$extends({
      name: 'TenantIsolation',
      query: {
        $allModels: {
          async $allOperations({ operation, model, args, query }) {
            // 테넌트 격리가 필요 없는 모델은 그대로 통과
            if (!model || !DIRECT_USER_MODELS.has(model)) {
              return query(args);
            }

            const userId = getCurrentUserId();

            // Admin 컨텍스트에서는 userId 없이 접근 가능
            // 일반 API에서는 에러
            if (!userId) {
              // Admin API는 별도 체크 로직 필요
              // 여기서는 에러 발생
              throw new Error(`Tenant isolation: userId not found for ${model}.${operation}`);
            }

            // 읽기 쿼리
            if (['findMany', 'findFirst', 'findUnique', 'count', 'aggregate'].includes(operation)) {
              args.where = { ...args.where, userId };
            }

            // 생성 쿼리
            if (operation === 'create') {
              args.data = { ...args.data, userId };
            }

            // 수정/삭제 쿼리
            if (['update', 'delete', 'updateMany', 'deleteMany'].includes(operation)) {
              args.where = { ...args.where, userId };
            }

            return query(args);
          }
        }
      }
    });
  });
}
```

### 7.2 Prisma 클라이언트 업데이트 (Momus CRITICAL 이슈 대응)

**파일 (MODIFY):** `src/lib/db/prisma.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import { createTenantExtension } from './tenant-extension';
import { getCurrentUser } from '../auth/context';

const prismaClientSingleton = () => {
  const client = new PrismaClient();

  // Client Extensions로 테넌트 격리 등록 (Prisma 6.x 호환)
  const extendedClient = client.$extends(
    createTenantExtension(() => getCurrentUser()?.userId)
  );

  return extendedClient;
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;
```

#### Prisma 확장 타입 안전성 가이드

**현재 구조 (검증됨 - `src/lib/db/prisma.ts` Line 1-34):**
```typescript
export const prisma = ...$extends(softDeleteExtension);  // 확장 적용
export const prismaBase = ...;  // 기본 PrismaClient (확장 미적용)
export type ExtendedPrismaClient = typeof prisma;
```

**Tenant 확장 추가 시:**
- `prisma` 타입이 변경됨 → 기존 `ExtendedPrismaClient` 타입은 자동 업데이트
- Admin 라우트: `prismaBase` 사용 (tenant 필터링 우회)
- AI 로깅: `prismaBase` 유지 (현재 `usage-logger.ts` Line 1과 동일)
- **기존 import는 모두 호환** (`import { prisma } from '@/lib/db/prisma'` 유지)

### 7.3 API Route 변경 목록

모든 보호된 API route에서 userId를 활용하도록 변경:

```
파일 (MODIFY)                                  변경 내용
─────────────────────────────────────────────────────────────────────
src/app/api/interview/route.ts              requireAuth() 추가, userId로 세션 필터
src/app/api/interview/stream/route.ts       requireAuth() 추가, 세션 소유권 확인
src/app/api/interview/evaluate/route.ts     requireAuth() 추가, 세션 소유권 확인
src/app/api/interview/[sessionId]/route.ts  requireAuth() 추가 (있는 경우)
src/app/api/profile/route.ts                userId 기반 프로필 조회/수정
src/app/api/admin/*                         Admin 전용 (userId 필터 우회)
```

#### 변경 예시: interview/route.ts

**파일 (MODIFY):** `src/app/api/interview/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { runWithUser } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';

// GET: 사용자의 세션 목록
export async function GET(req: NextRequest) {
  const { userId, email, tier } = requireAuth(req);

  return runWithUser({ userId, email, tier }, async () => {
    // Client Extension이 자동으로 userId 필터 적용
    const sessions = await prisma.interviewSession.findMany({
      where: { deletedAt: null },
      orderBy: { startedAt: 'desc' },
      include: { questions: { select: { id: true, status: true } } }
    });
    return Response.json(sessions);
  });
}

// POST: 새 세션 생성
export async function POST(req: NextRequest) {
  const { userId, email, tier } = requireAuth(req);
  const body = await req.json();

  return runWithUser({ userId, email, tier }, async () => {
    const session = await prisma.interviewSession.create({
      data: {
        // userId는 Client Extension이 자동 주입
        topics: body.topics,
        difficulty: body.difficulty,
        evaluationMode: body.evaluationMode,
        status: 'in_progress',
      }
    });
    return Response.json(session, { status: 201 });
  });
}
```

### 7.4 Week 7 테스트 항목

```
[ ] Prisma Client Extensions 정상 동작 확인
[ ] User A가 생성한 세션을 User B가 조회 불가
[ ] User A가 생성한 프로필을 User B가 수정 불가
[ ] Client Extension: findMany에 자동 userId 필터 적용 확인
[ ] Client Extension: create에 자동 userId 주입 확인
[ ] 세션 소유권 없는 stream 요청 → 403
[ ] Admin API는 테넌트 격리 우회 가능 (별도 체크)
[ ] 기존 면접 플로우 정상 동작 (회귀 테스트)
```

---

## Week 8: 이메일 발송 + E2E 테스트 + 보안 감사 {#week-8}

### 8.1 이메일 발송 (간이 구현)

> Week 8에서는 콘솔 로그 + 기본 이메일 서비스 연동
> Week 10에서 Resend로 본격 연동

**파일 (CREATE):** `src/lib/email/index.ts`

```typescript
interface EmailData {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(data: EmailData): Promise<void> {
  if (process.env.RESEND_API_KEY) {
    // Resend API 호출 (Week 10에서 구현)
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({ from: EMAIL_FROM, ...data });
  }

  // 개발/테스트 환경: 콘솔 출력
  console.log(`[EMAIL] To: ${data.to}, Subject: ${data.subject}`);
  console.log(`[EMAIL] Body: ${data.html.substring(0, 200)}...`);
}

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: '[InterviewBot] 이메일 인증',
    html: `<p>아래 링크를 클릭하여 이메일을 인증해주세요:</p><a href="${verifyUrl}">${verifyUrl}</a>`,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: '[InterviewBot] 비밀번호 재설정',
    html: `<p>아래 링크를 클릭하여 비밀번호를 재설정해주세요 (1시간 유효):</p><a href="${resetUrl}">${resetUrl}</a>`,
  });
}
```

### 8.2 인증 E2E 테스트

**파일 (CREATE):** `tests/e2e/auth-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('인증 플로우', () => {
  test('회원가입 → 로그인 → 대시보드', async ({ page }) => {
    await page.goto('/signup');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.fill('[name="name"]', '테스트 사용자');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('잘못된 비밀번호 → 로그인 실패', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'WrongPassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toBeVisible();
  });

  test('데이터 격리: User A의 세션을 User B가 볼 수 없음', async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // User A 로그인 + 세션 생성
    await loginAs(pageA, 'userA@test.com', 'password');
    const sessionId = await createSession(pageA);

    // User B 로그인 + A의 세션 접근 시도
    await loginAs(pageB, 'userB@test.com', 'password');
    await pageB.goto(`/interview/${sessionId}`);
    // 403 또는 404 확인
    await expect(pageB.locator('text=접근할 수 없습니다')).toBeVisible();
  });

  test('V1 토큰 → 재로그인 유도', async ({ page }) => {
    // V1 토큰 설정 (수동으로)
    await page.context().addCookies([{
      name: 'token',
      value: 'v1-token-here',
      domain: 'localhost',
      path: '/',
    }]);

    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login?reason=upgrade');
    await expect(page.locator('text=보안 업그레이드')).toBeVisible();
  });
});
```

### 8.3 보안 감사 체크리스트

```
[ ] 비밀번호 정책: 최소 8자, 최대 100자
[ ] bcrypt 12 rounds 확인
[ ] JWT 만료: 7일 (적절한지 검토)
[ ] 에러 메시지에 내부 정보 노출 없음
    - "이메일 또는 비밀번호가 올바르지 않습니다" (이메일 존재 여부 미노출)
[ ] Rate limiting: 로그인 5회 실패 → 15분 잠금
[ ] CSRF: SameSite=Lax 쿠키 설정
[ ] HttpOnly: JWT 쿠키 HttpOnly 확인
[ ] Secure: HTTPS 환경에서 Secure 플래그
[ ] SQL Injection: Prisma parameterized queries 사용 확인
[ ] XSS: React의 자동 이스케이핑 + dangerouslySetInnerHTML 미사용 확인
[ ] 비밀번호 재설정 토큰: 1시간 만료 + 1회 사용
[ ] 이메일 인증 토큰: 24시간 만료
[ ] 테넌트 격리: 모든 API에서 userId 필터 적용 확인
[ ] JWT V1→V2 마이그레이션 안전성 확인
```

---

## Week 9: Google OAuth + 회원가입/로그인 UI {#week-9}

### 9.1 Google OAuth 구현

#### 9.1.1 OAuth 플로우

```
사용자 → "Google로 로그인" 클릭
  → GET /api/auth/oauth/google (redirect to Google)
  → Google 인증 페이지
  → 인증 완료 → GET /api/auth/oauth/callback?code=...&state=...
  → Google에서 access_token 획득
  → Google userinfo API로 이메일/이름 조회
  → User 조회 또는 생성
  → JWT V2 발급 → /dashboard 리다이렉트
```

#### 9.1.2 API 구현

**파일 (CREATE):** `src/app/api/auth/oauth/google/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

export async function GET(req: NextRequest) {
  const state = nanoid();
  // state를 쿠키에 저장 (CSRF 방지)
  const redirectUrl = new URL(GOOGLE_AUTH_URL);
  redirectUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!);
  redirectUrl.searchParams.set('redirect_uri', `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/oauth/callback`);
  redirectUrl.searchParams.set('response_type', 'code');
  redirectUrl.searchParams.set('scope', 'openid email profile');
  redirectUrl.searchParams.set('state', `google:${state}`);

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set('oauth_state', state, {
    httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600
  });
  return response;
}
```

**파일 (CREATE):** `src/app/api/auth/oauth/callback/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { signJWTV2 } from '@/lib/auth/jwt';
import { prisma } from '@/lib/db/prisma';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // 1. CSRF 검증
  const [provider, stateValue] = (state || '').split(':');
  const savedState = req.cookies.get('oauth_state')?.value;
  if (!stateValue || stateValue !== savedState) {
    return NextResponse.redirect(new URL('/login?error=invalid_state', req.url));
  }

  // 2. Provider별 처리
  if (provider === 'google') {
    return handleGoogleCallback(code!, req);
  }

  return NextResponse.redirect(new URL('/login?error=unknown_provider', req.url));
}

async function handleGoogleCallback(code: string, req: NextRequest) {
  // 3. Access token 획득
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/oauth/callback`,
      grant_type: 'authorization_code',
    }),
  });
  const tokenData = await tokenRes.json();

  // 4. 사용자 정보 조회
  const userRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const googleUser = await userRes.json();

  // 5. User 조회 또는 생성
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { oauthProvider: 'google', oauthProviderId: googleUser.id },
        { email: googleUser.email },
      ]
    }
  });

  if (!user) {
    // 신규 사용자
    user = await prisma.user.create({
      data: {
        email: googleUser.email,
        name: googleUser.name,
        oauthProvider: 'google',
        oauthProviderId: googleUser.id,
        emailVerified: googleUser.verified_email ?? true,
        profile: { create: { totalYearsExp: 0, currentRole: '' } },
      }
    });
  } else if (!user.oauthProvider) {
    // 이메일로 가입한 기존 사용자 → OAuth 연결
    await prisma.user.update({
      where: { id: user.id },
      data: {
        oauthProvider: 'google',
        oauthProviderId: googleUser.id,
        emailVerified: true,
      }
    });
  }

  // 6. JWT 발급 + 리다이렉트
  const token = await signJWTV2({
    userId: user.id,
    email: user.email,
    tier: user.subscriptionTier,
  });

  const response = NextResponse.redirect(new URL('/dashboard', req.url));
  response.cookies.set('token', token, {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 604800
  });
  response.cookies.delete('oauth_state');
  return response;
}

```

### 9.2 회원가입/로그인 UI 페이지

#### 9.2.1 회원가입 페이지

**파일 (CREATE):** `src/app/(auth)/signup/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해주세요'),
  password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다').max(100),
  name: z.string().min(1, '이름을 입력해주세요').max(50),
});

export default function SignupPage() {
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 클라이언트 유효성 검사
      signupSchema.parse(formData);

      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '회원가입에 실패했습니다');
      }

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <h2 className="text-3xl font-bold text-center">Interview Bot</h2>
        <div className="space-y-3">
          <a
            href="/api/auth/oauth/google"
            className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Google로 가입
          </a>
        </div>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">또는 이메일로 가입</span>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">이름</label>
            <input
              name="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">이메일</label>
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">비밀번호</label>
            <input
              name="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          {error && <div className="error-message text-red-600 text-sm">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? '처리 중...' : '가입하기'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-600">
          이미 계정이 있으신가요? <a href="/login" className="text-blue-600 hover:underline">로그인</a>
        </p>
      </div>
    </div>
  );
}
```

#### 9.2.2 로그인 페이지

**파일 (CREATE):** `src/app/(auth)/login/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '로그인에 실패했습니다');
      }

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <h2 className="text-3xl font-bold text-center">Interview Bot</h2>

        {reason === 'upgrade' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-sm text-yellow-800">
              보안 업그레이드로 재로그인이 필요합니다.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <a
            href="/api/auth/oauth/google"
            className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Google로 로그인
          </a>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">또는 이메일로 로그인</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">이메일</label>
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">비밀번호</label>
            <input
              name="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          <div className="text-right">
            <a href="/auth/forgot-password" className="text-sm text-blue-600 hover:underline">
              비밀번호를 잊으셨나요?
            </a>
          </div>
          {error && <div className="error-message text-red-600 text-sm">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? '처리 중...' : '로그인'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600">
          계정이 없으신가요? <a href="/signup" className="text-blue-600 hover:underline">가입하기</a>
        </p>
      </div>
    </div>
  );
}
```

### 9.3 비밀번호 재설정 UI

**파일 (CREATE):** `src/app/(auth)/forgot-password/page.tsx`
**파일 (CREATE):** `src/app/(auth)/reset-password/page.tsx`

```
/auth/forgot-password  → 이메일 입력 → 재설정 링크 발송
/auth/reset-password   → 토큰 + 새 비밀번호 → 변경 완료
```

### 9.4 Week 9 테스트 항목

```
[ ] Google OAuth 로그인 성공 → JWT V2 발급 → /dashboard
[ ] Google OAuth CSRF 검증 (state 파라미터)
[ ] OAuth + 기존 이메일 계정 병합 동작
[ ] 회원가입 페이지 UI 렌더링
[ ] 로그인 페이지 UI 렌더링 + reason=upgrade 배너
[ ] 이메일 회원가입 → UserProfile 자동 생성
[ ] 비밀번호 재설정 UI 전체 플로우
```

---

## Week 10: Redis 도입 {#week-10}

### 10.1 Redis 도입

#### 10.1.1 Docker Compose 설정

**파일 (MODIFY):** `docker-compose.yml`

```yaml
services:
  postgres:
    # ... 기존 설정 유지

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly no --maxmemory 256mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

#### 10.1.2 Redis 클라이언트

**파일 (CREATE):** `src/lib/redis.ts`

```typescript
import Redis from 'ioredis';

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null;

  if (!redis) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: true,
    });

    redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
  }
  return redis;
}
```

#### 10.1.3 Resilient Cache (장애 대응)

**파일 (CREATE):** `src/lib/cache.ts`

```typescript
import { getRedis } from './redis';

class ResilientCache {
  private redis: Redis | null;
  private inMemoryFallback = new Map<string, { value: string; expiry: number }>();
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.redis = getRedis();
  }

  async get(key: string): Promise<string | null> {
    if (this.redis) {
      try {
        return await this.redis.get(key);
      } catch {
        this.handleRedisFailure();
      }
    }

    // 인메모리 폴백
    const entry = this.inMemoryFallback.get(key);
    if (entry && entry.expiry > Date.now()) return entry.value;
    this.inMemoryFallback.delete(key);
    return null;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.set(key, value, 'EX', ttlSeconds);
        return;
      } catch {
        this.handleRedisFailure();
      }
    }

    // 인메모리 폴백
    this.inMemoryFallback.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    if (this.redis) {
      try { await this.redis.del(key); } catch { this.handleRedisFailure(); }
    }
    this.inMemoryFallback.delete(key);
  }

  private handleRedisFailure() {
    console.error('Redis unavailable, using in-memory fallback');
    this.redis = null;
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        this.redis = getRedis();
        this.reconnectTimer = null;
      }, 30_000); // 30초 후 재연결 시도
    }
  }
}

export const cache = new ResilientCache();
```

#### 10.1.4 Resend 이메일 연동

**파일 (MODIFY):** `src/lib/email/index.ts`

```typescript
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@interviewbot.com';

interface EmailData {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(data: EmailData): Promise<void> {
  if (resend) {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: data.to,
      subject: data.subject,
      html: data.html,
    });
    return;
  }

  // 개발/테스트 환경: 콘솔 출력
  console.log(`[EMAIL] To: ${data.to}, Subject: ${data.subject}`);
  console.log(`[EMAIL] Body: ${data.html.substring(0, 200)}...`);
}

// sendVerificationEmail, sendPasswordResetEmail 동일
```

### 10.2 Week 10 테스트 항목

```
[ ] OAuth state 검증 (CSRF 방지)
[ ] Redis 연결 성공
[ ] Redis 장애 시 인메모리 폴백 동작
[ ] Resend 이메일 발송 성공 (프로덕션)
[ ] docker-compose up → Redis 컨테이너 정상 실행
```

---

## Week 11: Redis 기반 세션/캐시/Rate Limiting {#week-11}

### 11.1 Rate Limiting Redis 이관

**파일 (CREATE):** `src/lib/rate-limit.ts`

```typescript
import { cache } from './cache';
import { getRedis } from './redis';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const redis = getRedis();

  if (redis) {
    // Redis 기반 sliding window
    const now = Date.now();
    const windowKey = `rate:${key}`;

    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(windowKey, '-inf', now - windowMs);
    pipeline.zadd(windowKey, now, `${now}:${Math.random()}`);
    pipeline.zcard(windowKey);
    pipeline.pexpire(windowKey, windowMs);

    const results = await pipeline.exec();
    const count = (results?.[2]?.[1] as number) || 0;

    if (count > limit) {
      return { allowed: false, remaining: 0, retryAfter: Math.ceil(windowMs / 1000) };
    }
    return { allowed: true, remaining: limit - count };
  }

  // 인메모리 폴백 (기존 방식)
  return checkInMemoryRateLimit(key, limit, windowMs);
}

// 티어별 Rate Limit 설정
export const TIER_RATE_LIMITS = {
  FREE:       { requests: 20,  windowMs: 60_000 },  // 20 req/min
  PRO:        { requests: 120, windowMs: 60_000 },  // 120 req/min
};

// 인메모리 폴백 구현
function checkInMemoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  // 기존 LoginAttempt 방식 활용
  // ...
  return { allowed: true, remaining: limit };
}
```

### 11.2 세션 캐시

**파일 (CREATE):** `src/lib/cache/user-cache.ts`

```typescript
import { cache } from '../cache';
import { prisma } from '../db/prisma';
import { SubscriptionTier } from '@prisma/client';

interface CachedUser {
  id: string;
  email: string;
  subscriptionTier: SubscriptionTier;
  monthlySessionCount: number;
}

export async function getCachedUser(userId: string): Promise<CachedUser | null> {
  const cached = await cache.get(`user:${userId}`);
  if (cached) return JSON.parse(cached);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, subscriptionTier: true, monthlySessionCount: true }
  });

  if (user) {
    await cache.set(`user:${userId}`, JSON.stringify(user), 300); // 5분 캐시
  }
  return user;
}

// 구독 변경/세션 생성 시 캐시 무효화
export async function invalidateUserCache(userId: string) {
  await cache.del(`user:${userId}`);
}
```

### 11.3 미들웨어에 Rate Limiting 통합

**파일 (MODIFY):** `src/middleware.ts`

```typescript
import { checkRateLimit, TIER_RATE_LIMITS } from '@/lib/rate-limit';

// ... 기존 코드

// V2 토큰 검증 후:
const v2 = payload as JWTPayloadV2;
const tier = v2.tier;

// Rate Limiting 적용
const rateLimits = TIER_RATE_LIMITS[tier];
const rateLimitResult = await checkRateLimit(
  `api:${v2.userId}`,
  rateLimits.requests,
  rateLimits.windowMs
);

if (!rateLimitResult.allowed) {
  return NextResponse.json(
    { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(rateLimitResult.retryAfter),
        'X-RateLimit-Remaining': '0',
      }
    }
  );
}

// 사용자 정보 헤더 주입
const requestHeaders = new Headers(request.headers);
requestHeaders.set('x-user-id', v2.userId);
requestHeaders.set('x-user-email', v2.email);
requestHeaders.set('x-user-tier', v2.tier);
requestHeaders.set('x-rate-limit-remaining', String(rateLimitResult.remaining));

return NextResponse.next({
  request: { headers: requestHeaders }
});
```

### 11.4 Week 11 테스트 항목

```
[ ] Redis 기반 Rate Limiting 정상 동작
[ ] FREE 티어: 20 req/min 제한 확인
[ ] PRO 티어: 120 req/min 제한 확인
[ ] Rate Limit 초과 시 429 + Retry-After 헤더
[ ] 사용자 캐시 정상 동작 (5분 TTL)
[ ] 캐시 무효화 정상 동작
[ ] Redis 장애 시 인메모리 폴백 동작
```

---

## Week 12: GDPR 기본 + 계정 설정 + 통합 테스트 {#week-12}

### 12.1 GDPR 기본 구현

#### 12.1.1 쿠키 동의 배너

**파일 (CREATE):** `src/components/CookieConsent.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) setShow(true);
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('cookie_consent', 'all');
    setShow(false);
  };

  const handleEssentialOnly = () => {
    localStorage.setItem('cookie_consent', 'essential');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 z-50">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-sm">
          본 서비스는 필수 쿠키를 사용합니다. 분석 목적의 쿠키 사용에 동의하시겠습니까?
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleEssentialOnly}
            className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
          >
            필수만 허용
          </button>
          <button
            onClick={handleAcceptAll}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500"
          >
            모두 허용
          </button>
        </div>
      </div>
    </div>
  );
}
```

**파일 (MODIFY):** `src/app/layout.tsx`

```typescript
import { CookieConsent } from '@/components/CookieConsent';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
```

#### 12.1.2 계정 삭제 (Soft Delete + 30일 유예)

**파일 (CREATE):** `src/app/api/auth/delete-account/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { verifyPassword } from '@/lib/auth/password';
import { sendEmail } from '@/lib/email';
import { cache } from '@/lib/cache';
import { prisma } from '@/lib/db/prisma';

export async function DELETE(req: NextRequest) {
  const { userId } = requireAuth(req);

  // 1. 비밀번호 재확인 (보안)
  const { password } = await req.json();
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (user?.passwordHash) {
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return Response.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401 });
    }
  }

  // 2. Soft delete (30일 유예)
  await prisma.user.update({
    where: { id: userId },
    data: {
      isActive: false,
      deletedAt: new Date(),
    }
  });

  // 3. 활성 구독 취소 (Phase 2에서 구현)
  // await cancelSubscription(userId);

  // 4. 세션 무효화
  await cache.del(`user:${userId}`);

  // 5. 안내 이메일 발송
  await sendEmail({
    to: user!.email,
    subject: '[InterviewBot] 계정 삭제 요청',
    html: `
      <p>계정 삭제가 요청되었습니다.</p>
      <p>30일 이내에 로그인하시면 삭제가 취소됩니다.</p>
      <p>30일 후 모든 데이터가 영구 삭제됩니다.</p>
    `,
  });

  // 6. 쿠키 삭제
  return Response.json({ message: '계정이 삭제 예정입니다.' }, {
    headers: { 'Set-Cookie': 'token=; HttpOnly; Secure; Path=/; Max-Age=0' }
  });
}
```

#### 12.1.3 데이터 내보내기 (JSON)

**파일 (CREATE):** `src/app/api/auth/export-data/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  const { userId } = requireAuth(req);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: {
        include: {
          skills: true,
          experiences: true,
          targetPositions: true,
        }
      },
      sessions: {
        include: {
          questions: {
            include: { evaluation: true, followUps: true }
          }
        }
      },
    }
  });

  // 민감 정보 제거
  const exportData = {
    user: {
      email: user!.email,
      name: user!.name,
      createdAt: user!.createdAt,
      subscriptionTier: user!.subscriptionTier,
    },
    profile: user!.profile,
    interviewSessions: user!.sessions.map(s => ({
      ...s,
      questions: s.questions.map(q => ({
        content: q.content,
        userAnswer: q.userAnswer,
        evaluation: q.evaluation,
      }))
    })),
    exportedAt: new Date().toISOString(),
  };

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="interview-bot-data-${Date.now()}.json"`,
    }
  });
}
```

### 12.2 계정 설정 페이지

**파일 (CREATE):** `src/app/settings/page.tsx`

```typescript
'use client';

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">계정 설정</h1>

      {/* 프로필 정보 */}
      <section className="mb-8 p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">프로필 정보</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">이름</label>
            <div className="flex gap-2">
              <input type="text" className="flex-1 px-3 py-2 border rounded" />
              <button className="px-4 py-2 bg-blue-600 text-white rounded">저장</button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">이메일</label>
            <p className="text-gray-600">user@example.com (변경 불가)</p>
          </div>
        </div>
      </section>

      {/* 보안 */}
      <section className="mb-8 p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">보안</h2>
        <button className="px-4 py-2 bg-gray-200 rounded">비밀번호 변경</button>
        <div className="mt-4">
          <p className="text-sm text-gray-700 mb-2">OAuth 연결:</p>
          <div className="flex gap-2">
            <span className="text-green-600">Google ✓</span>
          </div>
        </div>
      </section>

      {/* 구독 (Phase 2에서 활성화) */}
      <section className="mb-8 p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">구독</h2>
        <p className="text-gray-600">현재 티어: Free</p>
        <button className="mt-2 px-4 py-2 bg-blue-600 text-white rounded" disabled>
          업그레이드 (Phase 2)
        </button>
      </section>

      {/* 데이터 관리 */}
      <section className="mb-8 p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">데이터 관리</h2>
        <div className="space-y-2">
          <a
            href="/api/auth/export-data"
            className="block w-full px-4 py-2 bg-gray-200 rounded text-center"
          >
            내 데이터 다운로드 (JSON)
          </a>
          <button className="w-full px-4 py-2 bg-red-600 text-white rounded">
            계정 삭제
          </button>
        </div>
      </section>

      {/* 개인정보보호 */}
      <section className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">개인정보보호</h2>
        <button className="px-4 py-2 bg-gray-200 rounded">쿠키 설정 관리</button>
      </section>
    </div>
  );
}
```

### 12.3 30일 유예 만료 처리 (Cron)

**파일 (CREATE):** `src/app/api/cron/cleanup-deleted/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(req: NextRequest) {
  // cron secret 검증
  const secret = req.headers.get('authorization');
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // 30일 지난 삭제 요청 사용자의 데이터 영구 삭제
  const usersToDelete = await prisma.user.findMany({
    where: {
      isActive: false,
      deletedAt: { lte: thirtyDaysAgo },
    }
  });

  for (const user of usersToDelete) {
    await prisma.$transaction([
      prisma.aIUsageLog.deleteMany({ where: { userId: user.id } }),
      prisma.interviewSession.deleteMany({ where: { userId: user.id } }),
      prisma.userProfile.delete({ where: { userId: user.id } }).catch(() => {}),
      prisma.user.delete({ where: { id: user.id } }),
    ]);
  }

  return Response.json({ deleted: usersToDelete.length });
}
```

### 12.4 Week 12 통합 테스트

```
[OAuth]
  [ ] Google OAuth 로그인 성공 → JWT V2 발급
  [ ] OAuth + 기존 이메일 계정 병합 동작
  [ ] OAuth state 검증 (CSRF 방지)

[Redis]
  [ ] Redis 세션/캐시: 캐시 SET 후 GET 시 동일 값 반환, TTL 만료 후 null 반환
  [ ] TEST-REDIS-001: Redis 컨테이너 중단 후 로그인 시도 → 5초 내 성공 (인메모리 폴백)
  [ ] 티어별 Rate Limiting 적용 (FREE: 20/min, PRO: 120/min)
  [ ] Rate Limit 초과 시 429 + Retry-After 헤더

[UI]
  [ ] 회원가입 페이지 (이메일 + OAuth)
  [ ] 로그인 페이지 (이메일 + OAuth + V1→V2 안내)
  [ ] 비밀번호 재설정 페이지
  [ ] 계정 설정 페이지

[GDPR]
  [ ] 쿠키 동의 배너 표시
  [ ] 계정 삭제 기능 (soft delete + 30일 유예)
  [ ] 데이터 내보내기 (JSON 다운로드)
  [ ] 삭제된 계정 30일 후 영구 삭제 (cron)

[End-to-End]
  [ ] 회원가입 → 로그인 → 면접 진행 전체 플로우 동작
  [ ] TEST-AUTH-001: User A 인증 후 GET /api/interview?sessionId={User B 세션ID} → 403 또는 404
  [ ] JWT V1 토큰 → 재로그인 유도
  [ ] E2E 테스트 최소 20개 중 19개 이상 통과
```

---

## 롤백 전략 {#롤백-전략}

```
Week별 롤백 계획:

Week 4 (스키마):
  - 롤백 SQL 실행 (섹션 4.3 참조)
  - Prisma 스키마 git revert
  - prisma generate 재실행

Week 5 (인증 API):
  - 인증 API routes 삭제
  - 기존 /api/auth 복원
  - 쿠키 기반 인증 복원

Week 6 (미들웨어):
  - middleware.ts git revert
  - V1 토큰 인증 복원

Week 7 (테넌트 미들웨어):
  - tenant-extension.ts 비활성화
  - prisma.ts에서 $extends 제거
  - API routes에서 requireAuth 제거

Week 8-12 (OAuth, Redis, GDPR):
  - OAuth routes 삭제
  - Redis 의존성 제거
  - UI 페이지 삭제
  - docker-compose.yml에서 Redis 제거

전체 롤백 시:
  1. git revert 최신 커밋들
  2. 롤백 SQL 실행
  3. prisma generate
  4. npm run build 확인
  5. E2E 테스트 실행
```

---

## 완료 기준 {#완료-기준}

### 핵심 기능

```
[ ] 이메일/비밀번호 가입 → 로그인 → 면접 진행 전체 플로우 동작
[ ] Google OAuth 로그인 → 면접 진행
[ ] JWT V2 토큰 정상 발급 (userId, email, tier 포함)
[ ] JWT V1 토큰 → /login?reason=upgrade 리다이렉트
[ ] TEST-AUTH-001: User A 인증 후 GET /api/interview?sessionId={User B 세션ID} → 403 또는 404
```

### 데이터 & 마이그레이션

```
[ ] 기존 데이터 마이그레이션 성공 (무손실)
[ ] UserProfile.email/name 제거, User.email/name이 source of truth
[ ] 회원가입 시 UserProfile 자동 생성 (1:1 관계)
[ ] pgcrypto extension 활성화 확인
```

### 보안

```
[ ] 비밀번호 해싱: bcrypt 12 rounds
[ ] 보안 감사 체크리스트 전항목 통과
[ ] 티어별 Rate Limiting: FREE 티어에서 21번째 요청 시 429 반환, PRO 티어에서 121번째 요청 시 429 반환
[ ] CSRF 방지: OAuth state 검증, SameSite 쿠키
```

### 인프라

```
[ ] TEST-REDIS-001: Redis 컨테이너 중단 후 로그인 시도 → 5초 내 성공 (인메모리 폴백)
[ ] Resend 이메일 발송: 회원가입 후 60초 내 인증 이메일 수신 확인
[ ] Docker Compose: PostgreSQL + Redis 동시 실행
```

### GDPR

```
[ ] 쿠키 동의 배너
[ ] 계정 삭제 (soft delete + 30일 유예)
[ ] 데이터 내보내기 (JSON)
[ ] 삭제된 계정 자동 정리 (cron)
```

### 테스트

```
[ ] E2E 테스트 최소 20개 중 19개 이상 통과
[ ] 회귀 테스트: 기존 면접 플로우에서 세션 생성 → 질문 응답 → 평가 완료까지 60초 내 정상 완료
```

---

## Phase 2 핸드오프 {#phase-2-핸드오프}

```
Phase 2로 전달할 인터페이스:

1. 완전한 인증 시스템 (이메일 + Google)
2. User 모델 (subscriptionTier 필드 준비됨)
3. JWT V2 인프라 (signJWTV2, verifyJWT 함수)
4. 미들웨어 (x-user-id, x-user-email, x-user-tier 헤더 주입)
5. Prisma Client Extensions (테넌트 격리)
6. Redis 인프라 (캐시, 세션, rate limiting)
7. 티어별 Rate Limiting (FREE, PRO)
8. 계정 설정 페이지 (구독 섹션 플레이스홀더)
9. GDPR 기본 (계정 삭제 시 구독 취소 연동 필요 → Phase 2)
10. 이메일 서비스 (Resend)

Phase 2 구현 예정:
  - Stripe SDK 설치 및 연동
  - Product/Price 생성 (3 tiers x 2 cycles)
  - Checkout Session + Customer Portal
  - Webhook 엔드포인트 + 멱등성 처리
  - 결제 추상화 레이어 (PaymentService + StripeAdapter)
  - 가격 페이지 (/pricing)
  - 구독 관리 UI (/billing)
  - 구독 변경 시 캐시 무효화 연동
```

---

## 파일 변경 매트릭스

### 신규 파일 (CREATE)

```
인증 API:
  src/lib/auth/password.ts
  src/lib/auth/jwt.ts
  src/lib/auth/context.ts
  src/lib/auth/require-auth.ts
  src/app/api/auth/signup/route.ts
  src/app/api/auth/login/route.ts
  src/app/api/auth/logout/route.ts
  src/app/api/auth/verify-email/route.ts
  src/app/api/auth/forgot-password/route.ts
  src/app/api/auth/reset-password/route.ts
  src/app/api/auth/me/route.ts
  src/app/api/auth/refresh/route.ts

OAuth:
  src/app/api/auth/oauth/google/route.ts
  src/app/api/auth/oauth/callback/route.ts

GDPR:
  src/app/api/auth/delete-account/route.ts
  src/app/api/auth/export-data/route.ts
  src/app/api/cron/cleanup-deleted/route.ts

UI 페이지:
  src/app/(auth)/signup/page.tsx
  src/app/(auth)/login/page.tsx
  src/app/(auth)/forgot-password/page.tsx
  src/app/(auth)/reset-password/page.tsx
  src/app/settings/page.tsx

Prisma:
  src/lib/db/tenant-extension.ts
  prisma/seed-migration.ts

Redis & Cache:
  src/lib/redis.ts
  src/lib/cache.ts
  src/lib/rate-limit.ts
  src/lib/cache/user-cache.ts

이메일:
  src/lib/email/index.ts

컴포넌트:
  src/components/CookieConsent.tsx

테스트:
  tests/e2e/auth-flow.spec.ts
```

### 수정 파일 (MODIFY)

```
스키마 & 마이그레이션:
  prisma/schema.prisma              - User 모델, enum, 기존 모델 FK

인증:
  src/middleware.ts                  - JWT V1/V2 분기, Rate Limiting, 헤더 주입

Prisma:
  src/lib/db/prisma.ts              - Client Extensions 등록 ($extends)

API Routes:
  src/app/api/interview/route.ts    - requireAuth, runWithUser
  src/app/api/interview/stream/route.ts
  src/app/api/interview/evaluate/route.ts
  src/app/api/profile/route.ts
  src/app/api/admin/*               - Admin 컨텍스트 처리

이메일:
  src/lib/email/index.ts            - Resend 연동

인프라:
  docker-compose.yml                - Redis 서비스 추가
  package.json                      - ioredis, resend 추가

레이아웃:
  src/app/layout.tsx                - CookieConsent 컴포넌트 추가
```

---

## 환경 변수

```env
# JWT
JWT_SECRET=                        # 기존

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
# Redis
REDIS_URL=redis://localhost:6379

# 이메일
RESEND_API_KEY=
EMAIL_FROM=noreply@interviewbot.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cron
CRON_SECRET=                       # 배치 작업 인증용

# 마이그레이션
INITIAL_USER_PASSWORD=             # 초기 사용자 비밀번호 설정용
```

---

## 의존성 추가

```json
{
  "dependencies": {
    "ioredis": "^5.3.2",
    "resend": "^3.0.0",
    "nanoid": "^5.0.4",
    "bcryptjs": "^2.4.3",
    "jose": "^5.2.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6"
  }
}
```

---

**최종 검토:**
- Momus CRITICAL 이슈 4개 모두 반영 완료
- Phase 1A + 1B 통합 완료
- 파일 참조 CREATE/MODIFY 구분 명확화
- JWT V1→V2 마이그레이션 전략 명확화
- pgcrypto extension 확인 단계 추가
- Prisma 6.x Client Extensions 사용
- 9주 일정으로 통합
