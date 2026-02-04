# Interview Bot

AI 기반 모의 면접 웹 애플리케이션입니다. Claude AI를 활용하여 실시간 면접 연습, 답변 평가, 성과 분석을 제공합니다.

## 주요 기능

### 1. 프로필 시스템
- 4단계 온보딩 마법사 (기본 정보 → 스킬 → 경력 → 목표 포지션)
- 스킬 및 경력 관리
- 목표 직무 설정

### 2. AI 모의 면접
- 실시간 스트리밍 기반 면접 진행 (SSE)
- 주제 및 난이도 선택
- 실시간 답변 평가 및 피드백
- 세션별 면접 기록 저장

### 3. 대시보드
- 통계 요약 (총 세션, 평균 점수, 최근 활동)
- 점수 추이 차트 (Recharts)
- 주제별 분석
- 취약 주제 하이라이트

### 4. 면접 히스토리
- 세션 목록 (필터링 및 페이지네이션)
- 상세 세션 리뷰 (질문/답변/점수/피드백)

### 5. 주제 관리
- 카테고리별 사전 정의 주제
- 커스텀 주제 생성 및 관리

### 6. 복습 시스템
- 낮은 점수 질문 모아보기
- 타겟 연습을 위한 질문 브라우저

## 기술 스택

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Charts**: Recharts
- **Validation**: Zod v4

### Backend
- **Database**: PostgreSQL 16
- **ORM**: Prisma
- **Authentication**: JWT (httpOnly cookie, 7일 만료)
- **AI**: claude-max-api-proxy (OpenAI 호환 API)

### Deployment
- **Container**: Docker Compose
- **Services**: App + Database

## 빠른 시작

### 사전 요구사항
- Docker & Docker Compose
- Node.js 18+ (로컬 개발용)
- claude-max-api-proxy 실행 중 (localhost:3456)

### Docker Compose로 실행

```bash
# 1. 환경 변수 설정
cp .env.example .env
# .env 파일을 편집하여 필수 값 입력

# 2. 컨테이너 시작
docker-compose up -d

# 3. 데이터베이스 마이그레이션
docker-compose exec app npx prisma migrate deploy

# 4. 시드 데이터 생성 (선택)
docker-compose exec app npx prisma db seed

# 5. 애플리케이션 접속
# http://localhost:3000
```

### 로컬 개발

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정
cp .env.example .env
# .env 파일을 편집하여 필수 값 입력

# 3. 데이터베이스 실행 (Docker)
docker-compose up -d db

# 4. Prisma 마이그레이션
npx prisma migrate dev

# 5. 시드 데이터 생성 (선택)
npx prisma db seed

# 6. 개발 서버 시작
npm run dev

# 7. 애플리케이션 접속
# http://localhost:3000
```

## 환경 변수

| 변수명 | 설명 | 예시 값 | 필수 |
|--------|------|---------|------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 | `postgresql://user:password@localhost:5432/interviewbot` | O |
| `APP_PASSWORD` | 애플리케이션 로그인 비밀번호 | `your-secure-password` | O |
| `JWT_SECRET` | JWT 서명 비밀 키 | `your-jwt-secret-key-min-32-chars` | O |
| `JWT_EXPIRES_IN` | JWT 만료 시간 | `7d` | X (기본: 7d) |
| `AI_PROXY_URL` | AI 프록시 API URL | `http://localhost:3456/v1` | O |
| `AI_MODEL` | 사용할 AI 모델 | `claude-max` | X (기본: claude-max) |
| `NEXT_PUBLIC_APP_NAME` | 애플리케이션 이름 | `Interview Bot` | X |

## 프로젝트 구조

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # 인증 관련 라우트 그룹
│   │   └── login/               # 로그인 페이지
│   ├── (main)/                   # 메인 애플리케이션 라우트 그룹
│   │   ├── dashboard/           # 대시보드
│   │   ├── history/             # 면접 히스토리
│   │   │   └── [sessionId]/    # 세션 상세
│   │   ├── interview/           # 면접 시작
│   │   │   └── [sessionId]/    # 면접 진행
│   │   ├── positions/           # 목표 포지션 관리
│   │   ├── profile/             # 프로필 관리
│   │   │   └── onboarding/     # 온보딩 마법사
│   │   ├── review/              # 복습 시스템
│   │   └── topics/              # 주제 관리
│   ├── api/                      # API Routes
│   │   ├── auth/                # 인증 API
│   │   │   ├── login/          # 로그인
│   │   │   ├── logout/         # 로그아웃
│   │   │   └── verify/         # JWT 검증
│   │   ├── health/              # 헬스체크
│   │   ├── history/             # 히스토리 API
│   │   ├── interview/           # 면접 API
│   │   │   ├── stream/         # SSE 스트리밍
│   │   │   └── evaluate/       # 답변 평가
│   │   ├── positions/           # 포지션 API
│   │   ├── profile/             # 프로필 API
│   │   │   ├── skills/         # 스킬 관리
│   │   │   └── experiences/    # 경력 관리
│   │   ├── stats/               # 통계 API
│   │   └── topics/              # 주제 API
│   ├── layout.tsx               # 루트 레이아웃
│   └── page.tsx                 # 홈 페이지
├── lib/                          # 유틸리티 및 라이브러리
│   ├── auth.ts                  # JWT 인증 로직
│   ├── db.ts                    # Prisma 클라이언트
│   ├── ai.ts                    # AI 프록시 클라이언트
│   └── validations.ts           # Zod 스키마
├── components/                   # React 컴포넌트
│   ├── ui/                      # UI 기본 컴포넌트
│   ├── layout/                  # 레이아웃 컴포넌트
│   └── features/                # 기능별 컴포넌트
├── types/                        # TypeScript 타입 정의
└── styles/                       # 글로벌 스타일

prisma/
├── schema.prisma                 # Prisma 스키마
├── migrations/                   # 데이터베이스 마이그레이션
└── seed.ts                       # 시드 데이터
```

## 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                         │
│                   Next.js 16 + React + TypeScript                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ HTTP/SSE
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                        Next.js App Router                        │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Pages      │  │  API Routes  │  │  Middleware  │         │
│  │  (Server     │  │  (REST/SSE)  │  │  (Auth)      │         │
│  │   Components)│  │              │  │              │         │
│  └──────────────┘  └──────┬───────┘  └──────────────┘         │
│                            │                                     │
│  ┌─────────────────────────┼──────────────────────────┐        │
│  │                         │                           │        │
│  │  ┌──────────────────┐  │  ┌──────────────────┐    │        │
│  │  │   Auth (JWT)     │  │  │   Validation     │    │        │
│  │  │   - Login        │  │  │   (Zod v4)       │    │        │
│  │  │   - Verify       │  │  │                  │    │        │
│  │  └──────────────────┘  │  └──────────────────┘    │        │
│  │                         │                           │        │
│  └─────────────────────────┼──────────────────────────┘        │
└────────────────────────────┼─────────────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐
│   PostgreSQL     │  │   Prisma ORM │  │  AI Proxy        │
│   (Docker)       │  │              │  │  (localhost:3456)│
│                  │  │              │  │                  │
│  - Profile       │  │  - Migration │  │  - Claude AI     │
│  - Sessions      │  │  - Seed      │  │  - Streaming     │
│  - Questions     │  │  - Client    │  │  - Evaluation    │
│  - Topics        │  │              │  │                  │
└──────────────────┘  └──────────────┘  └──────────────────┘
```

## 라우트 목록 (27개)

### Pages (12)
- `/` - 홈
- `/login` - 로그인
- `/dashboard` - 대시보드
- `/interview` - 면접 시작
- `/interview/[sessionId]` - 면접 진행
- `/history` - 면접 히스토리 목록
- `/history/[sessionId]` - 세션 상세 리뷰
- `/positions` - 목표 포지션 관리
- `/profile` - 프로필 관리
- `/profile/onboarding` - 온보딩 마법사
- `/review` - 복습 시스템
- `/topics` - 주제 관리

### API Routes (15)
- `POST /api/auth/login` - 로그인
- `POST /api/auth/logout` - 로그아웃
- `GET /api/auth/verify` - JWT 검증
- `GET /api/health` - 헬스체크
- `GET /api/history` - 세션 목록 조회
- `POST /api/interview` - 새 면접 세션 시작
- `GET /api/interview/stream` - SSE 스트리밍 (질문 생성)
- `POST /api/interview/evaluate` - 답변 평가
- `GET /api/positions` - 포지션 목록 조회
- `POST /api/positions` - 포지션 생성
- `GET /api/profile` - 프로필 조회
- `PUT /api/profile` - 프로필 수정
- `POST /api/profile/skills` - 스킬 추가
- `POST /api/profile/experiences` - 경력 추가
- `GET /api/stats` - 통계 조회
- `GET /api/topics` - 주제 목록 조회
- `POST /api/topics` - 커스텀 주제 생성

## 데이터베이스 스키마

주요 모델:
- `Profile` - 사용자 프로필
- `Skill` - 스킬 정보
- `Experience` - 경력 정보
- `Position` - 목표 포지션
- `InterviewSession` - 면접 세션
- `Question` - 질문 및 답변
- `Topic` - 면접 주제

자세한 스키마는 `prisma/schema.prisma`를 참조하세요.

## 개발 명령어

```bash
# 개발 서버 시작
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 시작
npm start

# 타입 체크
npm run type-check

# Lint
npm run lint

# Prisma Studio (데이터베이스 GUI)
npx prisma studio

# Prisma 마이그레이션 생성
npx prisma migrate dev --name migration_name

# Prisma 클라이언트 재생성
npx prisma generate
```

## 인증 흐름

1. 사용자가 `/login`에서 비밀번호 입력
2. 서버가 `APP_PASSWORD`와 비교 후 JWT 발급
3. JWT를 httpOnly cookie에 저장 (7일 만료)
4. Middleware가 보호된 라우트에서 JWT 검증
5. 인증 실패 시 `/login`으로 리디렉트

## AI 프록시 설정

이 프로젝트는 `claude-max-api-proxy`를 사용합니다:

```bash
# 프록시 실행 (별도 터미널)
# localhost:3456에서 실행되어야 함
```

환경 변수 설정:
```env
AI_PROXY_URL=http://localhost:3456/v1
AI_MODEL=claude-max
```

## Docker Compose 서비스

### `db` - PostgreSQL
- Image: `postgres:16-alpine`
- Port: `5432`
- Volume: `postgres_data`

### `app` - Next.js
- Build: Dockerfile (multi-stage)
- Port: `3000`
- Depends on: `db`

## 라이선스

MIT

## 기여

이슈 및 PR을 환영합니다.
