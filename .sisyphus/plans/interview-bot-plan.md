# Interview Bot - AI 모의 면접 웹 애플리케이션 구축 계획

## 1. 프로젝트 개요

사용자의 경력, 기술 스택, 지원 포지션 등 프로필 정보를 기반으로
AI가 맞춤형 면접을 진행하는 웹 애플리케이션.
매일 학습하며 면접 역량을 체계적으로 관리할 수 있는 개인 도구.

## 2. 확정된 요구사항

| 항목 | 결정 사항 |
|------|----------|
| **프로젝트 형태** | 웹 애플리케이션 |
| **프레임워크** | Next.js + TypeScript |
| **UI** | shadcn/ui + Tailwind CSS |
| **DB** | PostgreSQL (Prisma ORM) |
| **API** | claude-max-api-proxy (localhost:3456, OpenAI 호환) |
| **인증** | 단일 사용자, 앱 접근용 비밀번호 |
| **배포** | 로컬 전용 (Docker Compose) |
| **면접 주제** | 커스텀 구성 (프리셋 + 자유 입력) |
| **면접 방식** | 하이브리드 (실시간 대화 + 평가) |
| **질문 수** | 자유 종료 (사용자가 원할 때까지) |
| **평가 타이밍** | 사용자 선택 (즉시 평가 / 종료 후 일괄 평가) |
| **기록 관리** | 히스토리 + AI 평가/피드백 + 기본 통계 |
| **SR (간격 반복)** | Phase 2로 미룸. MVP에서는 "틀린 문제 다시 풀기"만 |

## 3. 시스템 아키텍처

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   Browser    │────▶│  Next.js App     │────▶│ claude-max-api-proxy│
│  (React UI)  │◀────│  (API Routes)    │◀────│   (localhost:3456)  │
└─────────────┘     └───────┬──────────┘     └─────────────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │  PostgreSQL  │
                    │  (Docker)    │
                    └──────────────┘
```

### Docker Compose 구성
- `app`: Next.js 애플리케이션 (포트 3000)
- `db`: PostgreSQL (포트 5432)
- **참고**: claude-max-api-proxy는 호스트에서 별도 실행 (Docker 외부)

### Docker 설정 상세

#### docker-compose.yml

```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    container_name: interview-bot-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: interview
      POSTGRES_PASSWORD: interview
      POSTGRES_DB: interview_bot
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U interview -d interview_bot"]
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: interview-bot-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://interview:interview@db:5432/interview_bot
      APP_PASSWORD: ${APP_PASSWORD:-changeme}
      JWT_SECRET: ${JWT_SECRET:-dev-jwt-secret-change-in-production}
      AI_PROXY_URL: http://host.docker.internal:3456
      AI_MODEL: ${AI_MODEL:-claude-3-5-haiku-latest}
      NODE_ENV: production
    depends_on:
      db:
        condition: service_healthy
    extra_hosts:
      # macOS/Windows Docker Desktop: host.docker.internal 자동 지원
      # Linux: 아래 설정으로 호스트 접근 가능
      - "host.docker.internal:host-gateway"
    entrypoint: ["/app/entrypoint.sh"]

volumes:
  postgres_data:
```

#### Dockerfile

```dockerfile
# ── Stage 1: Dependencies ──
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production && cp -R node_modules /prod_node_modules
RUN npm ci

# ── Stage 2: Build ──
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ── Stage 3: Production ──
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=deps /prod_node_modules ./node_modules
COPY entrypoint.sh ./entrypoint.sh

RUN chmod +x ./entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
```

#### entrypoint.sh

```bash
#!/bin/sh
set -e

echo "==> Waiting for database..."
until npx prisma migrate deploy 2>/dev/null; do
  echo "Database not ready, retrying in 2s..."
  sleep 2
done

echo "==> Seeding database (if needed)..."
npx prisma db seed || echo "Seed already applied or not configured"

echo "==> Starting application..."
exec node server.js
```

> **크로스 플랫폼 참고사항**
> - **macOS / Windows**: Docker Desktop이 `host.docker.internal`을 자동으로 제공
> - **Linux**: `docker-compose.yml`의 `extra_hosts` 설정에서 `host-gateway`를 통해 호스트 접근
> - Alpine 기반 이미지로 용량 최소화 (최종 이미지 약 200MB 이하 목표)

## 4. 데이터 모델 (Prisma Schema)

### 사용자 프로필 엔티티

```prisma
// ─── 사용자 기본 프로필 (하나만 존재) ───
model UserProfile {
  id                String      @id @default(cuid())

  // 기본 정보
  name              String              // 이름
  email             String?             // 이메일 (선택)
  totalYearsExp     Int                 // 총 경력 연차
  currentRole       String              // 현재 직무 (e.g., "백엔드 개발자")
  currentCompany    String?             // 현재 회사명

  // 자기소개 & 이력
  selfIntroduction  String?             // 자기소개서 텍스트
  resumeText        String?             // 이력서 텍스트 (자유 형식)
  strengths         String[]            // 본인이 생각하는 강점
  weaknesses        String[]            // 본인이 생각하는 약점

  // 관계
  skills            UserSkill[]         // 기술 스택 (숙련도 포함)
  experiences       WorkExperience[]    // 경력 사항
  targetPositions   TargetPosition[]    // 지원 회사/포지션

  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
}

// ─── 기술 스택 (숙련도 포함) ───
model UserSkill {
  id            String      @id @default(cuid())
  profileId     String
  profile       UserProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  name          String          // 기술명 (e.g., "Java", "Spring Boot", "Kubernetes")
  category      String          // 카테고리 (language / framework / database / infra / etc.)
  proficiency   Int             // 숙련도 1-5 (1: 입문, 3: 중급, 5: 전문가)
  yearsUsed     Int?            // 사용 연차
  createdAt     DateTime    @default(now())

  @@unique([profileId, name])
  @@index([profileId, category])    // 카테고리별 스킬 조회 최적화
}

// ─── 경력 사항 ───
model WorkExperience {
  id            String      @id @default(cuid())
  profileId     String
  profile       UserProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  company       String          // 회사명
  role          String          // 직무/직책
  startDate     DateTime        // 시작일
  endDate       DateTime?       // 종료일 (null = 재직중)
  description   String?         // 업무 설명
  techStack     String[]        // 사용 기술
  achievements  String[]        // 주요 성과
  orderIndex    Int             // 표시 순서
  createdAt     DateTime    @default(now())
}

// ─── 지원 회사/포지션 (여러 개 관리 가능) ───
model TargetPosition {
  id            String      @id @default(cuid())
  profileId     String
  profile       UserProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  company       String          // 지원 회사명
  position      String          // 포지션 (e.g., "시니어 백엔드 개발자")
  jobDescription String?        // JD (Job Description) 텍스트
  requirements  String[]        // 주요 요구사항
  notes         String?         // 메모
  isActive      Boolean     @default(true) // 활성 여부
  sessions      InterviewSession[] // 이 포지션으로 진행한 면접들
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}
```

### 면접 & 평가 엔티티

```prisma
model InterviewSession {
  id              String      @id @default(cuid())
  targetPositionId String?    // 지원 포지션 연결 (선택)
  targetPosition  TargetPosition? @relation(fields: [targetPositionId], references: [id])
  topics          String[]    // 선택한 주제들
  difficulty      String      // junior / mid / senior
  evaluationMode  String      // immediate / after_complete
  status          String      // in_progress / completed / abandoned
  questionCount   Int         @default(0)   // 총 질문 수 (캐싱 용도)
  endReason       String?     // user_ended / all_topics_covered / error / timeout
  totalScore      Float?      // 세션 평균 점수
  summary         String?     // AI 생성 세션 요약
  startedAt       DateTime    @default(now())
  completedAt     DateTime?
  deletedAt       DateTime?   // Soft Delete: null이면 활성, 값이 있으면 삭제됨
  questions       Question[]
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([startedAt])                      // 최근 세션 조회 최적화
  @@index([targetPositionId, startedAt])    // 포지션별 세션 목록 최적화
}

model Question {
  id            String      @id @default(cuid())
  sessionId     String
  session       InterviewSession @relation(fields: [sessionId], references: [id])
  orderIndex    Int         // 질문 순서
  content       String      // 질문 내용
  category      String      // 주제 카테고리
  difficulty    String      // 난이도
  status        String      @default("pending")  // pending / answered / skipped
  userAnswer    String?     // 사용자 답변
  evaluation    Evaluation?
  followUps     FollowUp[]  // 꼬리질문들
  answeredAt    DateTime?
  createdAt     DateTime    @default(now())

  @@index([sessionId, orderIndex])   // 세션 내 질문 순서 조회 최적화
  @@index([sessionId, status])       // 세션 내 상태별 질문 필터 최적화
}

model Evaluation {
  id            String      @id @default(cuid())
  questionId    String      @unique
  question      Question    @relation(fields: [questionId], references: [id])
  score         Int         // 1-10 점수
  feedback      String      // AI 피드백
  modelAnswer   String      // 모범 답안
  strengths     String[]    // 강점
  weaknesses    String[]    // 약점
  evaluatedAt   DateTime    @default(now())  // 평가 수행 시점
  createdAt     DateTime    @default(now())
}

model FollowUp {
  id            String      @id @default(cuid())
  questionId    String
  question      Question    @relation(fields: [questionId], references: [id])
  content       String      // 꼬리질문 내용
  userAnswer    String?     // 사용자 답변
  aiFeedback    String?     // AI 피드백
  orderIndex    Int
  createdAt     DateTime    @default(now())
}

model TopicConfig {
  id            String      @id @default(cuid())
  name          String      // 주제명 (e.g., "Java Concurrency")
  category      String      // 카테고리 (e.g., "Java")
  isPreset      Boolean     @default(false) // 프리셋 여부
  isActive      Boolean     @default(true)
  description   String?
  createdAt     DateTime    @default(now())
}

model AppConfig {
  id            String      @id @default(cuid())
  key           String      @unique
  value         String
  updatedAt     DateTime    @updatedAt
}

// ─── 로그인 시도 기록 (Rate Limiting 영속화) ───
model LoginAttempt {
  id        String   @id @default(cuid())
  ip        String       // 요청 IP 주소
  success   Boolean      // 성공 여부
  createdAt DateTime @default(now())

  @@index([ip, createdAt])  // IP별 최근 시도 조회 최적화
}
```

### 인덱스 설계 요약

| 모델 | 인덱스 | 용도 |
|------|--------|------|
| InterviewSession | `@@index([startedAt])` | 최근 세션 목록 정렬/조회 |
| InterviewSession | `@@index([targetPositionId, startedAt])` | 특정 포지션의 세션 이력 조회 |
| Question | `@@index([sessionId, orderIndex])` | 세션 내 질문 순서대로 로드 |
| Question | `@@index([sessionId, status])` | 세션 내 미답변/스킵된 질문 필터 |
| UserSkill | `@@index([profileId, category])` | 카테고리별 스킬 그룹핑 조회 |

## 5. 핵심 기능 상세

### 5.1 인증 (단순 비밀번호)
- 환경변수로 비밀번호 설정 (`APP_PASSWORD`)
- bcrypt 해싱 비교
- JWT 토큰 발급 (httpOnly cookie)
- **JWT 토큰 만료: 7일** (`expiresIn: '7d'`)
- **Rate Limiting: 로그인 API에 5회/분 제한** (IP 기반, DB 테이블 `LoginAttempt`으로 영속화 - 서버 재시작 시에도 유지)
- **로그아웃 시 httpOnly 쿠키 삭제** (`Set-Cookie: token=; Max-Age=0; HttpOnly; Path=/`)
- 미들웨어에서 인증 확인

### 5.2 사용자 프로필 시스템

프로필은 면접의 품질을 결정하는 핵심 요소. AI가 사용자의 경력/스킬에 맞는
깊이의 질문을 하고, 경험 기반 꼬리질문을 던질 수 있게 한다.

#### 프로필 구조

```
기본 프로필 (1개, 수정 가능)
├── 기본 정보: 이름, 총 경력, 현재 직무/회사
├── 기술 스택: 기술명 + 카테고리 + 숙련도(1-5) + 사용연차
├── 경력 사항: 회사별 직무, 기간, 기술스택, 성과
├── 자기소개/이력서: 자유 형식 텍스트
├── 강점/약점: 자가 평가
└── 지원 포지션 (N개, CRUD)
    ├── 회사명, 포지션명
    ├── JD (Job Description) 텍스트
    ├── 주요 요구사항
    └── 메모
```

#### 프로필이 면접에 미치는 영향

| 프로필 정보 | 면접 활용 |
|-------------|----------|
| 총 경력 연차 | 질문 난이도 자동 조정 (경력에 맞는 깊이) |
| 기술 스택 + 숙련도 | 주력 기술 중심 질문, 숙련도에 맞는 난이도 |
| 경력 사항 | "이전 프로젝트에서 ~한 경험이 있으시다면..." 꼬리질문 |
| 자기소개/이력서 | "자기소개에서 ~를 언급하셨는데..." 심층 질문 |
| 강점/약점 | 약점 영역 보강 질문, 강점 검증 질문 |
| 지원 포지션 JD | JD 요구사항 기반 맞춤 질문 |

#### 프로필 관리 UI 플로우

1. **최초 진입**: 프로필이 없으면 온보딩 위자드로 안내
   - Step 1: 기본 정보 (이름, 경력, 직무)
   - Step 2: 기술 스택 (태그 입력 + 숙련도 슬라이더)
   - Step 3: 경력 사항 (타임라인 형태)
   - Step 4: 자기소개/이력서 (선택)
2. **이후**: 프로필 페이지에서 언제든 수정 가능
3. **지원 포지션**: 별도 탭에서 추가/수정/삭제/활성화 토글

#### 온보딩 UX 플로우 상세

##### Step 1: 기본 정보

| 필드 | 필수/선택 | 유효성 검증 | UI 컴포넌트 |
|------|-----------|-------------|-------------|
| 이름 | **필수** | 2-50자, 공백만 불가 | `Input` (텍스트) |
| 이메일 | 선택 | 이메일 형식 (RFC 5322) | `Input` (이메일) |
| 총 경력 연차 | **필수** | 0-50 정수 | `NumberInput` + 스테퍼 |
| 현재 직무 | **필수** | 2-100자 | `Input` (텍스트) + 자동완성 제안 |
| 현재 회사명 | 선택 | 최대 100자 | `Input` (텍스트) |

- **네비게이션**: [다음] 버튼 (필수 필드 입력 완료 시 활성화)
- **진행 표시**: 상단 스텝 인디케이터 (1/4)

##### Step 2: 기술 스택

| 필드 | 필수/선택 | 유효성 검증 | UI 컴포넌트 |
|------|-----------|-------------|-------------|
| 기술명 | **필수** (최소 1개) | 1-50자, 중복 불가 | `Combobox` (자동완성 + 자유입력) |
| 카테고리 | **필수** | 정의된 카테고리 중 택 1 | `Select` 드롭다운 |
| 숙련도 | **필수** | 1-5 정수 | `Slider` + 레이블 (입문/초급/중급/숙련/전문가) |
| 사용 연차 | 선택 | 0-30 정수 | `NumberInput` |

- **네비게이션**: [이전] [다음] 버튼
- **스킵**: [나중에 입력] 링크 (최소 1개 입력 권장 안내)
- **UX**: 태그 형태로 추가된 스킬 표시, 클릭 시 편집/삭제

##### Step 3: 경력 사항

| 필드 | 필수/선택 | 유효성 검증 | UI 컴포넌트 |
|------|-----------|-------------|-------------|
| 회사명 | **필수** | 2-100자 | `Input` (텍스트) |
| 직무/직책 | **필수** | 2-100자 | `Input` (텍스트) |
| 시작일 | **필수** | 과거 날짜 | `DatePicker` (월/년) |
| 종료일 | 선택 | 시작일 이후 | `DatePicker` + "재직중" 체크박스 |
| 업무 설명 | 선택 | 최대 2000자 | `Textarea` |
| 사용 기술 | 선택 | - | `TagInput` (Step 2 스킬에서 자동 제안) |
| 주요 성과 | 선택 | 각 항목 최대 500자 | `Textarea` (줄바꿈으로 구분) |

- **네비게이션**: [이전] [다음] 버튼
- **스킵**: [건너뛰기] 버튼 (경력 사항은 전체 스킵 가능)
- **UX**: 타임라인 형태, "경력 추가" 버튼으로 복수 입력

##### Step 4: 자기소개/이력서

| 필드 | 필수/선택 | 유효성 검증 | UI 컴포넌트 |
|------|-----------|-------------|-------------|
| 자기소개서 | 선택 | 최대 5000자 | `Textarea` (마크다운 지원) |
| 이력서 텍스트 | 선택 | 최대 10000자 | `Textarea` (자유 형식) |
| 강점 | 선택 | 각 항목 최대 200자 | `TagInput` + 자유입력 |
| 약점 | 선택 | 각 항목 최대 200자 | `TagInput` + 자유입력 |

- **네비게이션**: [이전] [완료] 버튼
- **스킵**: [나중에 입력하기] 링크 (Step 4 전체 스킵 가능)
- **완료 시**: 대시보드로 이동 + "프로필 설정이 완료되었습니다" 토스트

##### 온보딩 공통 규칙
- 모든 Step에서 **브라우저 뒤로가기** 시 이전 Step으로 이동 (데이터 유지)
- 위자드 중간에 **이탈 시** 입력 데이터 로컬스토리지에 임시 저장
- **진행률 표시**: 상단 `StepIndicator` 컴포넌트 (현재 단계 하이라이트)
- **필수 필드 미입력**: 인라인 에러 메시지 (빨간색, 필드 하단)

#### 면접 시작 시 프로필 활용

```
세션 시작 → 프로필 정보 로드 → 지원 포지션 선택 (선택사항)
→ AI 시스템 프롬프트에 프로필 컨텍스트 주입
→ 면접관이 사용자의 배경을 알고 있는 상태에서 면접 시작
```

### 5.3 면접 세션 관리

#### 세션 시작 플로우
1. (선택) 지원 포지션 선택 → JD 기반 맞춤 질문
2. 주제 선택 (프리셋 목록 + 자유 입력)
3. 난이도 선택 (주니어/미들/시니어, 프로필 기반 추천 표시)
4. 평가 모드 선택 (즉시 평가 / 종료 후 평가)
5. "면접 시작" 클릭

#### 면접 진행 플로우
1. AI가 첫 질문 생성 (스트리밍)
2. 사용자 답변 입력 (마크다운 지원)
3. 평가 모드에 따라:
   - **즉시 평가**: AI가 평가/피드백/모범답안 스트리밍 표시
   - **종료 후 평가**: 다음 질문으로 진행
4. AI가 꼬리질문 또는 새 질문 제시
5. 사용자가 "면접 종료" 클릭하면 세션 종료
6. 종료 후 평가 모드인 경우: 전체 평가 일괄 생성

#### 세션 종료
- 전체 세션 요약 및 총점 생성
- 히스토리에 저장
- "틀린 문제 다시 풀기" 옵션 제공

### 5.4 AI API 연동

#### API 추상화 레이어
```typescript
// lib/ai/types.ts
interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIStreamOptions {
  model: string;
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
}

// lib/ai/client.ts
interface AIClient {
  streamChat(options: AIStreamOptions): AsyncIterable<string>;
  chat(options: AIStreamOptions): Promise<string>;
}
```

#### 프록시 클라이언트 구현
- `claude-max-api-proxy` (localhost:3456) 연동
- OpenAI 호환 `/v1/chat/completions` 호출
- SSE 스트리밍 파싱
- 에러 핸들링 (프록시 다운, 타임아웃, 컨텍스트 초과)
- Fallback: 프록시 상태 확인 후 사용자에게 안내

#### 프롬프트 엔지니어링
```
시스템 프롬프트 구성:
1. 면접관 페르소나 설정 (경험 많은 시니어 개발자)
2. 사용자 프로필 컨텍스트 주입:
   - 경력 {N}년차, 현재 {직무}, 주력 기술 {스택 목록}
   - 경력 요약: {회사별 주요 경험}
   - 자기소개: {자기소개서 텍스트}
   - 강점/약점: {자가 평가}
3. (선택) 지원 포지션 컨텍스트:
   - 지원 회사/포지션: {회사명} {포지션}
   - JD 요구사항: {JD 텍스트}
4. 면접 주제/난이도 주입
5. 평가 기준 명시 (10점 척도, 평가 항목)
6. 응답 포맷 지정 (JSON 구조화)
7. 꼬리질문 규칙 설정 (프로필 기반 경험 질문 포함)
```

> 프롬프트 상세 설계는 별도 문서 참조: `.sisyphus/plans/prompts-design.md`

### 5.5 스트리밍 응답 처리

#### 서버 (API Route)
```typescript
// app/api/interview/stream/route.ts
export async function POST(req: Request) {
  // 1. 요청 파싱 (세션 ID, 메시지)
  // 2. DB에서 대화 히스토리 로드
  // 3. 시스템 프롬프트 구성
  // 4. claude-max-api-proxy에 스트리밍 요청
  // 5. ReadableStream으로 클라이언트에 전달
  // 6. 스트리밍 완료 후 DB에 저장
}
```

#### 클라이언트
```typescript
// hooks/useInterviewStream.ts
- fetch + ReadableStream으로 스트리밍 수신
- 실시간 UI 업데이트 (타이핑 효과)
- 에러/중단 핸들링
- 자동 스크롤
```

> 스트리밍 & 에러 핸들링 상세 설계는 별도 문서 참조: `.sisyphus/plans/streaming-error-handling.md`

### 5.6 히스토리 & 통계

#### 히스토리 페이지
- 세션 목록 (날짜, 주제, 점수, 질문 수)
- 세션 상세 보기 (질문/답변/평가 전체 확인)
- 필터링 (주제, 난이도, 날짜 범위, 점수)

#### 대시보드 (기본 통계)
- 총 세션 수 / 총 질문 수
- 주제별 평균 점수 (테이블)
- 난이도별 평균 점수
- 최근 7일 / 30일 추세 (간단한 라인 차트)
- 가장 약한 주제 Top 5

#### "틀린 문제 다시 풀기" (Phase 1)
- 점수 6점 이하 질문 목록
- 선택하여 새 세션에서 재출제
- 이전 답변 참고 가능

### 5.7 주제 관리

#### 프리셋 주제 (초기 시드 데이터)

프로필의 기술 스택에 따라 관련 프리셋이 하이라이트됨.

```
Backend:
  - Java (OOP, 컬렉션, 동시성, JVM, 최신기능)
  - Spring (Core, Boot, MVC, Security, Data JPA, WebFlux)
  - Python (Django, FastAPI, Flask)
  - Node.js (Express, NestJS)
  - Go / Kotlin / Rust

Frontend:
  - JavaScript/TypeScript 기초
  - React / Next.js
  - Vue / Nuxt
  - HTML/CSS / 웹 접근성

Architecture:
  - 디자인 패턴
  - 시스템 설계 (System Design)
  - MSA (마이크로서비스)
  - 이벤트 기반 아키텍처
  - DDD (도메인 주도 설계)
  - 클린 아키텍처

Database:
  - RDBMS (SQL 최적화, 인덱싱, 트랜잭션)
  - NoSQL (Redis, MongoDB, Elasticsearch)
  - ORM (JPA/Hibernate, Prisma, SQLAlchemy)

Infrastructure:
  - Docker / Kubernetes
  - CI/CD
  - AWS / GCP / Azure
  - 모니터링 / 로깅

CS Fundamentals:
  - 운영체제
  - 네트워크
  - 자료구조 / 알고리즘

Behavioral:
  - 자기소개
  - 프로젝트 경험
  - 갈등 해결 / 협업
  - 리더십 / 멘토링
  - 커리어 비전
```

#### 커스텀 주제
- 사용자가 직접 주제 추가/수정/삭제
- 카테고리 지정 가능

## 6. 프로젝트 구조

```
/interview-bot
├── docker-compose.yml
├── Dockerfile
├── entrypoint.sh
├── .env.example
├── .env.local
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts                    # 프리셋 주제 시드
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx               # 로그인 또는 대시보드 리다이렉트
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── profile/
│   │   │   ├── page.tsx           # 프로필 관리 (기본정보/스킬/경력)
│   │   │   └── onboarding/
│   │   │       └── page.tsx       # 최초 프로필 설정 위자드
│   │   ├── positions/
│   │   │   └── page.tsx           # 지원 포지션 관리
│   │   ├── dashboard/
│   │   │   └── page.tsx           # 통계 대시보드
│   │   ├── interview/
│   │   │   ├── page.tsx           # 세션 설정 (주제/난이도/모드 선택)
│   │   │   └── [sessionId]/
│   │   │       └── page.tsx       # 면접 진행 화면
│   │   ├── history/
│   │   │   ├── page.tsx           # 세션 목록
│   │   │   └── [sessionId]/
│   │   │       └── page.tsx       # 세션 상세
│   │   ├── topics/
│   │   │   └── page.tsx           # 주제 관리
│   │   ├── review/
│   │   │   └── page.tsx           # 틀린 문제 복습
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/route.ts
│   │       │   ├── logout/route.ts    # 로그아웃 (쿠키 삭제)
│   │       │   └── verify/route.ts
│   │       ├── profile/
│   │       │   ├── route.ts       # 프로필 CRUD
│   │       │   ├── skills/route.ts # 스킬 관리
│   │       │   └── experiences/route.ts # 경력 관리
│   │       ├── positions/
│   │       │   └── route.ts       # 지원 포지션 CRUD
│   │       ├── interview/
│   │       │   ├── route.ts       # 세션 CRUD
│   │       │   ├── stream/route.ts # AI 스트리밍
│   │       │   └── evaluate/route.ts # 평가 생성
│   │       ├── history/
│   │       │   └── route.ts
│   │       ├── topics/
│   │       │   └── route.ts
│   │       ├── stats/
│   │       │   └── route.ts
│   │       └── health/
│   │           └── route.ts       # 헬스체크 (프록시 상태 포함)
│   ├── components/
│   │   ├── ui/                    # shadcn/ui 컴포넌트
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── MainLayout.tsx
│   │   ├── profile/
│   │   │   ├── ProfileForm.tsx    # 기본 정보 폼
│   │   │   ├── SkillManager.tsx   # 기술 스택 관리 (태그+숙련도)
│   │   │   ├── ExperienceForm.tsx # 경력 사항 폼
│   │   │   ├── ResumeEditor.tsx   # 자기소개/이력서 편집
│   │   │   ├── OnboardingWizard.tsx # 최초 설정 마법사
│   │   │   └── StepIndicator.tsx  # 온보딩 진행률 표시
│   │   ├── positions/
│   │   │   ├── PositionList.tsx   # 지원 포지션 목록
│   │   │   └── PositionForm.tsx   # 포지션 추가/수정 폼
│   │   ├── interview/
│   │   │   ├── SessionSetup.tsx   # 세션 설정 폼 (포지션 선택 포함)
│   │   │   ├── ChatMessage.tsx    # 메시지 버블
│   │   │   ├── ChatInput.tsx      # 답변 입력
│   │   │   ├── StreamingText.tsx  # 스트리밍 텍스트 표시
│   │   │   ├── EvaluationCard.tsx # 평가 결과 카드
│   │   │   └── SessionSummary.tsx # 세션 요약
│   │   ├── dashboard/
│   │   │   ├── StatsCard.tsx
│   │   │   ├── TopicChart.tsx
│   │   │   └── TrendChart.tsx
│   │   ├── history/
│   │   │   ├── SessionList.tsx
│   │   │   └── SessionDetail.tsx
│   │   └── topics/
│   │       ├── TopicList.tsx
│   │       └── TopicForm.tsx
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── client.ts          # AI API 클라이언트 (추상화)
│   │   │   ├── proxy-client.ts    # claude-max-api-proxy 구현체
│   │   │   ├── prompts.ts         # 프롬프트 템플릿
│   │   │   └── types.ts           # AI 관련 타입
│   │   ├── db/
│   │   │   └── prisma.ts          # Prisma 클라이언트 싱글톤
│   │   ├── auth/
│   │   │   ├── password.ts        # bcrypt 해싱
│   │   │   ├── jwt.ts             # JWT 생성/검증
│   │   │   ├── rate-limit.ts      # Rate Limiting 유틸
│   │   │   └── middleware.ts      # 인증 미들웨어
│   │   └── utils/
│   │       ├── cn.ts              # className 유틸
│   │       └── date.ts            # 날짜 포맷
│   ├── hooks/
│   │   ├── useInterviewStream.ts  # 스트리밍 면접 훅
│   │   ├── useAuth.ts             # 인증 훅
│   │   └── useStats.ts            # 통계 데이터 훅
│   ├── types/
│   │   ├── interview.ts
│   │   ├── evaluation.ts
│   │   └── topic.ts
│   └── middleware.ts              # Next.js 미들웨어 (인증 체크)
│   └── test/
│       ├── setup.ts                 # 테스트 전역 설정
│       ├── helpers/
│       │   └── db.ts                # 테스트 DB 헬퍼
│       └── mocks/
│           ├── handlers.ts          # MSW 핸들러 (AI API 모킹)
│           └── server.ts            # MSW 서버 설정
├── docs/
│   └── PROXY_SETUP.md              # claude-max-api-proxy 설치/실행 가이드
├── tests/
│   └── e2e/
│       ├── auth.spec.ts             # 인증 E2E 테스트
│       ├── onboarding.spec.ts       # 온보딩 E2E 테스트
│       ├── interview-flow.spec.ts   # 면접 플로우 E2E 테스트
│       └── history.spec.ts          # 히스토리 E2E 테스트
└── scripts/
    └── setup.sh                   # 초기 설정 스크립트
```

## 7. 구현 단계 (Phase 1: MVP)

### Step 0.5: claude-max-api-proxy 설치 및 검증

**목적**: AI 면접 기능의 핵심 의존성인 프록시 서버를 사전에 설치하고 동작 확인

- [ ] claude-max-api-proxy 설치 확인 (GitHub: https://github.com/nicekid1/claude-max-api-proxy)
- [ ] 프록시 실행: `npx claude-max-api-proxy` 또는 로컬 설치 후 실행
- [ ] 헬스체크 확인: `curl http://localhost:3456/v1/models` (모델 목록 응답 확인)
- [ ] 테스트 요청: 간단한 채팅 완성 요청으로 스트리밍 응답 확인
- [ ] 프록시 중지 상태에서 connection refused 에러 확인
- [ ] 프록시 설치/실행 가이드 문서 작성

**수용 기준**:
- [ ] `http://localhost:3456/v1/models`에 프록시가 응답함
- [ ] 간단한 채팅 요청 시 스트리밍 응답이 반환됨
- [ ] 프록시 중지 시 ECONNREFUSED 에러가 명확히 확인됨

**생성 파일**:
- `docs/PROXY_SETUP.md` (설치/실행 가이드)
- `scripts/check-proxy.sh` (프록시 상태 확인 스크립트)

### Step 1: 프로젝트 초기화
- [ ] Next.js + TypeScript 프로젝트 생성
- [ ] Tailwind CSS + shadcn/ui 설정
- [ ] Prisma 설정 + PostgreSQL 연결
- [ ] Docker Compose 작성 (app + db)
- [ ] 환경변수 설정 (.env.example)
- [ ] claude-max-api-proxy 실행 여부 확인 (Step 0.5 완료 검증)

**생성 파일:**
- `package.json`
- `tsconfig.json`
- `tailwind.config.ts`
- `next.config.ts`
- `.env.example`
- `.env.local`
- `docker-compose.yml`
- `Dockerfile`
- `entrypoint.sh`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `prisma/schema.prisma` (초기 골격)

### Step 2: 데이터 모델 & DB
- [ ] Prisma 스키마 작성 (위 모델 기반, 인덱스 포함)
- [ ] 마이그레이션 생성 및 적용
- [ ] 시드 데이터 작성 (프리셋 주제)
- [ ] Prisma 클라이언트 싱글톤 설정
- [ ] Soft Delete 미들웨어 작성 (findMany/findFirst 시 `deletedAt: null` 자동 필터)

**수정 파일:**
- `prisma/schema.prisma`

**생성 파일:**
- `prisma/seed.ts`
- `prisma/migrations/` (자동 생성)
- `src/lib/db/prisma.ts`
- `src/lib/db/soft-delete.ts`

### Step 2.5: 테스트 인프라 설정

- [ ] Vitest 설정 (단위 테스트 + 통합 테스트)
- [ ] React Testing Library 설정 (컴포넌트 테스트)
- [ ] Playwright 설정 (E2E 테스트)
- [ ] MSW (Mock Service Worker) 설정 (AI API 모킹)
- [ ] 테스트용 Prisma 클라이언트 설정 (인메모리 또는 테스트 DB)
- [ ] package.json에 테스트 스크립트 추가 (`test`, `test:unit`, `test:e2e`, `test:coverage`)
- [ ] 테스트 커버리지 목표 설정 (80% 이상)
- [ ] CI용 테스트 실행 설정 (GitHub Actions)

**생성 파일**:
- `vitest.config.ts`
- `playwright.config.ts`
- `src/test/setup.ts` (테스트 전역 설정)
- `src/test/mocks/handlers.ts` (MSW 핸들러)
- `src/test/mocks/server.ts` (MSW 서버)
- `src/test/helpers/db.ts` (테스트 DB 헬퍼)
- `.github/workflows/test.yml` (CI 테스트 워크플로우)

### Step 3: 인증 시스템
- [ ] 비밀번호 해싱/검증 유틸 (bcrypt)
- [ ] JWT 토큰 발급/검증 (만료: 7일)
- [ ] Rate Limiting 유틸 (로그인 API: 5회/분)
- [ ] 로그인 API Route
- [ ] 로그아웃 API Route (쿠키 삭제)
- [ ] Next.js 미들웨어 (보호 라우트)
- [ ] 로그인 페이지 UI
- [ ] **[TEST]** `src/lib/auth/tests/password.test.ts`: bcrypt 해싱/검증 테스트
- [ ] **[TEST]** `src/lib/auth/tests/jwt.test.ts`: JWT 생성/만료/검증 테스트
- [ ] **[TEST]** `src/lib/auth/tests/rate-limit.test.ts`: Rate Limiting 동작 테스트 (6번째 요청 시 429)
- [ ] **[TEST]** `src/app/api/auth/tests/login.test.ts`: 로그인 API 통합 테스트
- [ ] **[TEST]** `src/app/api/auth/tests/logout.test.ts`: 로그아웃 API 테스트 (쿠키 삭제 확인)

**생성 파일:**
- `src/lib/auth/password.ts`
- `src/lib/auth/jwt.ts`
- `src/lib/auth/rate-limit.ts`
- `src/lib/auth/middleware.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/logout/route.ts`
- `src/app/api/auth/verify/route.ts`
- `src/app/login/page.tsx`
- `src/middleware.ts`
- `src/hooks/useAuth.ts`
- `src/lib/auth/tests/password.test.ts`
- `src/lib/auth/tests/jwt.test.ts`
- `src/lib/auth/tests/rate-limit.test.ts`
- `src/app/api/auth/tests/login.test.ts`
- `src/app/api/auth/tests/logout.test.ts`

### Step 4: 사용자 프로필 시스템
- [ ] 프로필 API Routes (CRUD)
- [ ] 스킬 관리 API (추가/삭제/숙련도 수정)
- [ ] 경력 관리 API (CRUD)
- [ ] 지원 포지션 API (CRUD, 활성화 토글)
- [ ] 온보딩 위자드 UI (Step 1: 기본정보, Step 2: 기술스택, Step 3: 경력, Step 4: 자기소개)
- [ ] 프로필 관리 페이지 UI (각 섹션 편집)
- [ ] 지원 포지션 관리 페이지 UI
- [ ] 프로필 미설정 시 온보딩으로 리다이렉트 미들웨어
- [ ] **[TEST]** `src/app/api/profile/tests/route.test.ts`: 프로필 CRUD API 테스트
- [ ] **[TEST]** `src/app/api/profile/tests/skills.test.ts`: 스킬 관리 API 테스트
- [ ] **[TEST]** `src/app/api/profile/tests/experiences.test.ts`: 경력 관리 API 테스트
- [ ] **[TEST]** `src/app/api/positions/tests/route.test.ts`: 포지션 CRUD API 테스트
- [ ] **[TEST]** `src/components/profile/tests/OnboardingWizard.test.tsx`: 온보딩 위자드 컴포넌트 테스트

**생성 파일:**
- `src/app/api/profile/route.ts`
- `src/app/api/profile/skills/route.ts`
- `src/app/api/profile/experiences/route.ts`
- `src/app/api/positions/route.ts`
- `src/app/profile/page.tsx`
- `src/app/profile/onboarding/page.tsx`
- `src/app/positions/page.tsx`
- `src/components/profile/ProfileForm.tsx`
- `src/components/profile/SkillManager.tsx`
- `src/components/profile/ExperienceForm.tsx`
- `src/components/profile/ResumeEditor.tsx`
- `src/components/profile/OnboardingWizard.tsx`
- `src/components/profile/StepIndicator.tsx`
- `src/components/positions/PositionList.tsx`
- `src/components/positions/PositionForm.tsx`
- `src/app/api/profile/tests/route.test.ts`
- `src/app/api/profile/tests/skills.test.ts`
- `src/app/api/profile/tests/experiences.test.ts`
- `src/app/api/positions/tests/route.test.ts`
- `src/components/profile/tests/OnboardingWizard.test.tsx`

**수정 파일:**
- `src/middleware.ts` (온보딩 리다이렉트 로직 추가)

### Step 4.5: 프로필 시스템 검증
- [ ] 프로필 CRUD API 동작 확인 (생성/조회/수정/삭제)
- [ ] 스킬 추가/삭제/숙련도 변경 API 확인
- [ ] 경력 추가/수정/삭제/순서 변경 API 확인
- [ ] 지원 포지션 CRUD + 활성화 토글 확인
- [ ] 온보딩 위자드 4단계 플로우 정상 동작 확인
- [ ] 필수 필드 유효성 검증 동작 확인
- [ ] 프로필 미설정 시 온보딩 리다이렉트 확인
- [ ] 프로필 데이터 DB 저장/로드 정합성 확인

### Step 5: 프롬프트 엔지니어링
- [ ] 면접관 시스템 프롬프트 작성 (프로필 컨텍스트 포함)
- [ ] 프로필 → 프롬프트 변환 함수 (프로필 데이터를 자연어 컨텍스트로)
- [ ] 질문 생성 프롬프트 (경력/스킬 기반 난이도 조정)
- [ ] 평가 프롬프트 (점수, 피드백, 모범답안)
- [ ] 꼬리질문 프롬프트 (프로필 경험 기반 심화 질문)
- [ ] 세션 요약 프롬프트
- [ ] 지원 포지션 JD 기반 맞춤 질문 프롬프트
- [ ] **[TEST]** `src/lib/ai/tests/prompts.test.ts`: 시스템 프롬프트 조합 테스트
- [ ] **[TEST]** `src/lib/ai/tests/profile-to-context.test.ts`: 프로필 → 컨텍스트 변환 테스트 (토큰 예산 초과 시 축약 동작 포함)
- [ ] **[TEST]** `src/lib/ai/tests/response-parser.test.ts`: AI 응답 JSON 파싱 테스트 (정상/비정상/fallback)
- [ ] **[TEST]** `src/lib/ai/tests/token-counter.test.ts`: 토큰 추정 함수 테스트

**생성 파일:**
- `src/lib/ai/prompts.ts`
- `src/lib/ai/types.ts`
- `src/lib/ai/profile-to-context.ts`
- `src/lib/ai/tests/prompts.test.ts`
- `src/lib/ai/tests/profile-to-context.test.ts`
- `src/lib/ai/tests/response-parser.test.ts`
- `src/lib/ai/tests/token-counter.test.ts`

> **Note**: 프롬프트 설계가 먼저 완료되어야 이후 AI API 호출 구현에서
> 올바른 프롬프트 구조를 사용할 수 있으므로, API 연동(Step 6) 앞에 배치.

### Step 5.5: 프롬프트 프로토타입 테스트
- [ ] 면접관 시스템 프롬프트를 직접 API 프록시로 호출하여 응답 품질 검증
- [ ] 프로필 컨텍스트 주입 시 질문 난이도가 적절히 조정되는지 확인
- [ ] 평가 프롬프트의 JSON 출력 포맷 파싱 가능 여부 확인
- [ ] 꼬리질문 프롬프트가 경험 기반 심화 질문을 생성하는지 확인
- [ ] 프롬프트 토큰 사용량 측정 및 컨텍스트 윈도우 내 수용 확인

### Step 6: AI API 연동
- [ ] AI 클라이언트 인터페이스 정의
- [ ] claude-max-api-proxy 클라이언트 구현
- [ ] 스트리밍 응답 파싱 로직
- [ ] 에러 핸들링 (타임아웃, 프록시 다운)
- [ ] 헬스체크 API (프록시 상태 확인)
- [ ] **[TEST]** `src/lib/ai/tests/proxy-client.test.ts`: 프록시 클라이언트 테스트 (MSW로 모킹)
- [ ] **[TEST]** `src/lib/ai/tests/client.test.ts`: AI 클라이언트 인터페이스 테스트
- [ ] **[TEST]** `src/app/api/health/tests/route.test.ts`: 헬스체크 API 테스트 (프록시 up/down 시나리오)

**생성 파일:**
- `src/lib/ai/client.ts`
- `src/lib/ai/proxy-client.ts`
- `src/app/api/health/route.ts`
- `src/lib/ai/tests/proxy-client.test.ts`
- `src/lib/ai/tests/client.test.ts`
- `src/app/api/health/tests/route.test.ts`

### Step 7: 레이아웃 & 네비게이션
- [ ] MainLayout (사이드바 + 헤더)
- [ ] 사이드바 메뉴 (대시보드, 면접 시작, 히스토리, 주제 관리, 복습, 프로필, 지원 포지션)
- [ ] 반응형 레이아웃

**생성 파일:**
- `src/components/layout/MainLayout.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/Header.tsx`
- `src/lib/utils/cn.ts`

**수정 파일:**
- `src/app/layout.tsx`

### Step 8: 면접 세션 - 설정 화면
- [ ] 지원 포지션 선택 UI (선택사항, 활성 포지션 목록)
- [ ] 주제 선택 UI (체크박스 그리드 + 검색, 프로필 스킬 기반 추천)
- [ ] 난이도 선택 UI (프로필 경력 기반 추천 표시)
- [ ] 평가 모드 선택 UI
- [ ] 세션 시작 API + 화면 전환

**생성 파일:**
- `src/app/interview/page.tsx`
- `src/components/interview/SessionSetup.tsx`
- `src/app/api/interview/route.ts`

### Step 9: 면접 세션 - 진행 화면
- [ ] 채팅 UI (메시지 버블, 스크롤)
- [ ] AI 응답 스트리밍 표시 (타이핑 효과)
- [ ] 답변 입력 폼 (마크다운 지원, 코드 블록)
- [ ] 즉시 평가 모드: 평가 카드 표시
- [ ] "다음 질문" / "질문 스킵" / "면접 종료" 버튼
- [ ] 스트리밍 API Route 구현
- [ ] useInterviewStream 훅
- [ ] **[TEST]** `src/hooks/tests/useInterviewStream.test.ts`: 스트리밍 훅 테스트 (MSW)
- [ ] **[TEST]** `src/components/interview/tests/ChatMessage.test.tsx`: 메시지 컴포넌트 테스트
- [ ] **[TEST]** `src/components/interview/tests/StreamingText.test.tsx`: 스트리밍 텍스트 렌더링 테스트
- [ ] **[TEST]** `src/components/interview/tests/EvaluationCard.test.tsx`: 평가 카드 컴포넌트 테스트
- [ ] **[TEST]** `src/app/api/interview/tests/stream.test.ts`: 스트리밍 API Route 통합 테스트

**생성 파일:**
- `src/app/interview/[sessionId]/page.tsx`
- `src/components/interview/ChatMessage.tsx`
- `src/components/interview/ChatInput.tsx`
- `src/components/interview/StreamingText.tsx`
- `src/components/interview/EvaluationCard.tsx`
- `src/app/api/interview/stream/route.ts`
- `src/hooks/useInterviewStream.ts`
- `src/hooks/tests/useInterviewStream.test.ts`
- `src/components/interview/tests/ChatMessage.test.tsx`
- `src/components/interview/tests/StreamingText.test.tsx`
- `src/components/interview/tests/EvaluationCard.test.tsx`
- `src/app/api/interview/tests/stream.test.ts`

### Step 9.5: 스트리밍 검증
- [ ] AI 응답 스트리밍이 정상적으로 실시간 표시되는지 확인
- [ ] 스트리밍 중간 연결 끊김 시 에러 핸들링 확인
- [ ] 스트리밍 완료 후 데이터가 DB에 정확히 저장되는지 확인
- [ ] 동시 다수 스트리밍 요청 시 안정성 확인
- [ ] 프록시 다운 상태에서 적절한 에러 메시지 표시 확인

### Step 10: 면접 세션 - 종료 & 평가
- [ ] 세션 종료 처리 (endReason, questionCount 기록)
- [ ] 종료 후 평가 모드: 일괄 평가 생성
- [ ] 세션 요약 생성 (AI)
- [ ] 세션 결과 화면 (총점, 주제별 점수, 요약)
- [ ] **[TEST]** `src/app/api/interview/tests/evaluate.test.ts`: 평가 생성 API 테스트
- [ ] **[TEST]** `src/components/interview/tests/SessionSummary.test.tsx`: 세션 요약 컴포넌트 테스트

**생성 파일:**
- `src/components/interview/SessionSummary.tsx`
- `src/app/api/interview/evaluate/route.ts`

**수정 파일:**
- `src/app/api/interview/route.ts` (종료 처리 로직 추가)

### Step 10.5: 면접 E2E 플로우 검증
- [ ] 세션 설정 → 면접 시작 → 질문 수신 → 답변 제출 → 평가 수신 → 종료 전체 흐름 확인
- [ ] 즉시 평가 모드: 각 답변 후 평가가 즉시 표시되는지 확인
- [ ] 종료 후 평가 모드: 세션 종료 시 모든 질문에 대한 일괄 평가 생성 확인
- [ ] 질문 스킵 시 status가 `skipped`로 정확히 기록되는지 확인
- [ ] 세션 요약이 정확히 생성되고 저장되는지 확인
- [ ] endReason이 종료 원인에 따라 올바르게 기록되는지 확인

### Step 11: 히스토리
- [ ] 세션 목록 페이지 (필터, 정렬)
- [ ] 세션 상세 페이지 (질문/답변/평가 확인)
- [ ] 세션 삭제 (Soft Delete: deletedAt 설정)
- [ ] **[TEST]** `src/app/api/history/tests/route.test.ts`: 히스토리 API 테스트 (Soft Delete 포함)
- [ ] **[TEST]** `src/components/history/tests/SessionList.test.tsx`: 세션 목록 컴포넌트 테스트

**생성 파일:**
- `src/app/history/page.tsx`
- `src/app/history/[sessionId]/page.tsx`
- `src/components/history/SessionList.tsx`
- `src/components/history/SessionDetail.tsx`
- `src/app/api/history/route.ts`

### Step 12: 대시보드
- [ ] 기본 통계 카드 (총 세션, 평균 점수 등)
- [ ] 주제별 평균 점수 테이블
- [ ] 최근 추세 차트 (Recharts)
- [ ] 약점 주제 Top 5
- [ ] **[TEST]** `src/app/api/stats/tests/route.test.ts`: 통계 API 테스트
- [ ] **[TEST]** `src/components/dashboard/tests/StatsCard.test.tsx`: 통계 카드 컴포넌트 테스트

**생성 파일:**
- `src/app/dashboard/page.tsx`
- `src/components/dashboard/StatsCard.tsx`
- `src/components/dashboard/TopicChart.tsx`
- `src/components/dashboard/TrendChart.tsx`
- `src/app/api/stats/route.ts`
- `src/hooks/useStats.ts`

### Step 13: 주제 관리
- [ ] 프리셋 주제 목록
- [ ] 커스텀 주제 추가/수정/삭제
- [ ] 주제 활성/비활성 토글

**생성 파일:**
- `src/app/topics/page.tsx`
- `src/components/topics/TopicList.tsx`
- `src/components/topics/TopicForm.tsx`
- `src/app/api/topics/route.ts`

### Step 14: 틀린 문제 복습 (간단 버전)
- [ ] 점수 기준 이하 질문 목록
- [ ] 선택하여 새 세션으로 재출제
- [ ] 이전 답변/평가 참고

**생성 파일:**
- `src/app/review/page.tsx`

**수정 파일:**
- `src/app/api/interview/route.ts` (재출제 세션 생성 로직)

### Step 15: Docker & 배포
- [ ] Dockerfile 최종 검증
- [ ] docker-compose.yml 최종 검증
- [ ] entrypoint.sh 최종 검증
- [ ] 초기 설정 스크립트 (setup.sh)
- [ ] README 작성

**수정 파일:**
- `docker-compose.yml`
- `Dockerfile`
- `entrypoint.sh`

**생성 파일:**
- `scripts/setup.sh`
- `README.md`

### Step 16: 자동화 테스트 실행 & 최종 검증
- [ ] 전체 단위 테스트 실행 (`npm run test:unit`) - 모든 테스트 통과 확인
- [ ] 전체 통합 테스트 실행 - API Route 테스트 통과 확인
- [ ] E2E 테스트 실행 (`npm run test:e2e`) - 전체 플로우 테스트 통과 확인
- [ ] 테스트 커버리지 80% 이상 확인 (`npm run test:coverage`)
- [ ] Docker 환경에서 전체 동작 확인 (`docker-compose up` 후 E2E)
- [ ] claude-max-api-proxy 연동 실제 테스트 (모킹이 아닌 실제 프록시)
- [ ] Soft Delete 동작 확인 (deletedAt이 있는 세션이 목록에서 제외)
- [ ] Rate Limiting 동작 확인 (로그인 5회/분 초과 시 차단)
- [ ] JWT 만료 확인 (7일 후 재로그인 필요)
- [ ] GitHub Actions CI 파이프라인 테스트 통과 확인

**E2E 테스트 시나리오**:
- `tests/e2e/auth.spec.ts`: 로그인 → 대시보드 → 로그아웃 플로우
- `tests/e2e/onboarding.spec.ts`: 최초 진입 → 온보딩 4단계 → 프로필 완성
- `tests/e2e/interview-flow.spec.ts`: 세션 설정 → 면접 진행 → 평가 → 종료
- `tests/e2e/history.spec.ts`: 히스토리 조회 → 상세 → 삭제 (Soft Delete)

## 8. Phase 2 (향후 확장)

- [ ] 스페이스드 리피티션 (SM-2 알고리즘)
- [ ] 고급 분석 대시보드 (학습 곡선, 패턴 인식)
- [ ] 답변 시간 추적
- [ ] Export/Import (JSON/PDF)
- [ ] 마크다운 에디터 고도화
- [ ] 세션 복원 (브라우저 닫기 후 재개)
- [ ] 음성 면접 (STT/TTS)

## 9. 리스크 & 완화책

| 리스크 | 심각도 | 완화책 |
|--------|--------|--------|
| claude-max-api-proxy 다운 | 높음 | API 추상화 레이어, 헬스체크, 명확한 에러 메시지 |
| 스트리밍 에러/중단 | 높음 | 재시도 로직, 부분 응답 저장, 타임아웃 처리 |
| 컨텍스트 윈도우 초과 | 높음 | 토큰 추적, 이전 메시지 요약/제거, 세션 길이 안내 |
| AI 평가 일관성 | 중간 | 구조화된 프롬프트, JSON 모드, 평가 기준 명시 |
| DB 스키마 변경 | 중간 | Prisma 마이그레이션, 초기 설계 신중하게 |
| Docker 환경 이슈 | 중간 | 헬스체크, depends_on, 트러블슈팅 가이드 |

## 10. 기술 의존성

```json
{
  "dependencies": {
    "next": "^15.x",
    "react": "^19.x",
    "@prisma/client": "^6.x",
    "bcryptjs": "^3.x",
    "jsonwebtoken": "^9.x",
    "recharts": "^2.x",
    "react-markdown": "^9.x",
    "react-syntax-highlighter": "^15.x",
    "zod": "^3.x",
    "zustand": "^5.x"
  },
  "devDependencies": {
    "prisma": "^6.x",
    "typescript": "^5.x",
    "tailwindcss": "^4.x",
    "@types/bcryptjs": "^2.x",
    "@types/jsonwebtoken": "^9.x",
    "vitest": "^3.x",
    "@testing-library/react": "^16.x",
    "@testing-library/jest-dom": "^6.x",
    "@testing-library/user-event": "^14.x",
    "playwright": "^1.x",
    "@playwright/test": "^1.x",
    "msw": "^2.x",
    "@vitejs/plugin-react": "^4.x"
  }
}
```

## 11. 환경변수

```env
# Database
DATABASE_URL=postgresql://interview:interview@db:5432/interview_bot

# Auth
APP_PASSWORD=your-password-here
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRES_IN=7d

# AI Proxy
AI_PROXY_URL=http://host.docker.internal:3456
AI_MODEL=claude-3-5-haiku-latest

# App
NEXT_PUBLIC_APP_NAME=Interview Bot
NODE_ENV=production
```

## 12. 수용 기준

### 필수 (MVP)

#### 인프라 & 인증
- [ ] `docker-compose up` 실행 후 30초 이내에 `http://localhost:3000` 접속 가능하고, DB 마이그레이션 및 시드 데이터가 자동 적용됨
- [ ] 올바른 비밀번호 입력 시 로그인 성공하고 대시보드로 이동. 잘못된 비밀번호 입력 시 "비밀번호가 올바르지 않습니다" 에러 메시지 표시
- [ ] 로그인 API에 1분 내 6번째 요청 시 "너무 많은 요청입니다. 잠시 후 다시 시도해주세요" 메시지와 함께 429 응답 반환
- [ ] 로그인 후 7일간 재로그인 없이 접근 가능. 7일 경과 시 로그인 페이지로 리다이렉트
- [ ] 로그아웃 클릭 시 쿠키 삭제 후 로그인 페이지로 이동. 이후 보호 라우트 접근 불가

#### 프로필 시스템
- [ ] 최초 로그인 시 온보딩 위자드 4단계가 순차적으로 표시됨. Step 1에서 이름/경력/직무 미입력 시 "다음" 버튼 비활성화
- [ ] 기술 스택에 "Java"를 숙련도 4, "Python"을 숙련도 2로 추가 후 저장 시, 프로필 페이지에서 동일한 숙련도로 표시됨
- [ ] 경력 사항에 "A회사/백엔드 개발자/2020.03~2023.06" 입력 후 저장 시, 타임라인에 정확한 기간이 표시됨
- [ ] 지원 포지션에 "B회사/시니어 백엔드" + JD 텍스트 추가 후, 포지션 목록에서 활성/비활성 토글이 동작함

#### 맞춤 면접 질문 생성
- [ ] 프로필에 "5년차, Java 숙련도 4" 입력 시, 질문이 Java 기본 문법이 아닌 심화 수준 (동시성, JVM 내부, 성능 최적화 등)으로 생성됨
- [ ] 프로필에 "1년차, Python 숙련도 2" 입력 시, 질문이 기초 수준 (기본 문법, 자료형, 함수 정의 등)으로 생성됨
- [ ] 지원 포지션 선택 시 JD에 명시된 기술 요구사항 (예: "Kubernetes 경험 필수") 관련 질문이 포함됨
- [ ] 경력에 "MSA 전환 프로젝트 경험" 기재 시, "MSA 전환 시 겪었던 어려움은?" 류의 경험 기반 꼬리질문이 생성됨

#### 면접 진행
- [ ] 주제 "Java + Spring" / 난이도 "시니어" / 평가모드 "즉시 평가" 선택 후 "면접 시작" 클릭 시, 3초 이내에 첫 질문 스트리밍 시작
- [ ] AI 질문이 글자 단위로 실시간 표시되며 (타이핑 효과), 스트리밍 중 화면이 자동 스크롤됨
- [ ] 답변 입력 후 제출 시, 즉시 평가 모드에서는 점수(1-10)/피드백/모범답안이 평가 카드에 표시됨
- [ ] "질문 스킵" 클릭 시 해당 질문의 status가 `skipped`로 기록되고 다음 질문으로 진행됨
- [ ] "면접 종료" 클릭 시 세션 요약(총점, 주제별 점수, AI 요약)이 생성됨
- [ ] 종료 후 평가 모드에서 10개 질문 답변 후 종료 시, 10개 질문 모두에 대한 평가가 일괄 생성됨

#### 히스토리 & 통계
- [ ] 히스토리 페이지에서 세션 목록이 최신순으로 정렬되며, 주제/난이도/날짜 필터가 동작함
- [ ] 세션 상세 페이지에서 모든 질문/답변/평가/모범답안이 순서대로 표시됨
- [ ] 대시보드에 총 세션 수, 총 질문 수, 주제별 평균 점수가 정확히 표시됨
- [ ] 삭제한 세션이 히스토리 목록에서 제외되지만 DB에는 `deletedAt` 값과 함께 보존됨

#### 복습 & 주제
- [ ] 점수 6점 이하 질문이 "틀린 문제" 목록에 표시되고, 선택하여 새 세션으로 재출제 가능
- [ ] 커스텀 주제 "GraphQL 심화"를 추가하고, 면접 설정 시 해당 주제를 선택할 수 있음

#### 에러 처리
- [ ] claude-max-api-proxy가 중지된 상태에서 면접 시작 시, "AI 서비스에 연결할 수 없습니다. claude-max-api-proxy가 실행 중인지 확인해주세요" 메시지 표시
- [ ] 스트리밍 중 프록시 연결이 끊긴 경우, 이미 수신된 내용은 보존되고 "연결이 끊어졌습니다. 다시 시도하시겠습니까?" 메시지 표시

### 선택
- [ ] 차트 시각화 (Recharts)
- [ ] 세션 요약 AI 생성
- [ ] 답변 임시 저장 (Draft)

## 13. 성능 최적화 고려

### DB 인덱스 설계
- 섹션 4의 인덱스 요약 테이블 참조
- 모든 인덱스는 실제 쿼리 패턴에 기반하여 설계
- 불필요한 인덱스 남용 방지 (쓰기 성능 영향 고려)

### N+1 쿼리 방지
- Prisma의 `include` / `select` 를 적극 활용하여 관계 데이터를 한 번에 로드
- 예시: 세션 상세 조회 시

```typescript
// BAD: N+1 발생
const session = await prisma.interviewSession.findUnique({ where: { id } });
const questions = await prisma.question.findMany({ where: { sessionId: id } });
for (const q of questions) {
  q.evaluation = await prisma.evaluation.findUnique({ where: { questionId: q.id } });
}

// GOOD: 한 번의 쿼리로 관계 데이터 로드
const session = await prisma.interviewSession.findUnique({
  where: { id },
  include: {
    questions: {
      include: { evaluation: true, followUps: true },
      orderBy: { orderIndex: 'asc' }
    },
    targetPosition: true
  }
});
```

- 목록 조회 시 `select`로 필요한 필드만 가져오기

```typescript
// 세션 목록: 상세 데이터 불필요
const sessions = await prisma.interviewSession.findMany({
  where: { deletedAt: null },
  select: {
    id: true,
    topics: true,
    difficulty: true,
    status: true,
    totalScore: true,
    questionCount: true,
    startedAt: true,
    targetPosition: { select: { company: true, position: true } }
  },
  orderBy: { startedAt: 'desc' }
});
```

### Next.js 캐싱 전략
- **Static Generation**: 로그인 페이지는 정적 생성 가능
- **ISR (Incremental Static Regeneration)**: 대시보드 통계는 `revalidate: 60` (1분) 적용 검토
- **Server-Side**: 면접 진행, 실시간 데이터는 SSR 또는 클라이언트 측 fetching
- **Route Handler 캐싱**: `GET` 라우트에 `Cache-Control` 헤더 설정
  - 통계 API: `max-age=60` (1분)
  - 프로필 API: `max-age=0, must-revalidate`
  - 주제 목록 API: `max-age=300` (5분)
- **React Query / SWR 고려**: 클라이언트 측 캐싱 및 자동 재검증

### 이미지 & 폰트 최적화
- `next/font` 사용하여 폰트 자체 호스팅 (네트워크 요청 최소화)
- 아이콘은 `lucide-react` 트리셰이킹으로 번들 크기 최소화
- Docker 이미지 멀티스테이지 빌드로 최종 이미지 용량 최소화 (200MB 이하 목표)

## 14. 상세 계획 문서

| 문서 | 경로 | 설명 |
|------|------|------|
| 프롬프트 엔지니어링 | `.sisyphus/plans/prompts-design.md` | 시스템 프롬프트 전문, 프로필 컨텍스트 주입 규칙, 평가 기준, JSON 응답 포맷 상세 |
| 스트리밍 & 에러 핸들링 | `.sisyphus/plans/streaming-error-handling.md` | SSE 파싱 로직, 재시도 전략, 타임아웃 설정, 부분 응답 저장, 에러 코드별 사용자 메시지 |
