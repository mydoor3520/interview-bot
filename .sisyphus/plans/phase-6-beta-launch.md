# Phase 6: 베타 테스트 & 런칭 (Week 32-35)

> **Last Updated:** 2026-02-06
> **Reviewed by:** Momus (REVISE 6/10)
> **Status:** Updated based on review feedback
>
> **상위 문서:** [monetization-strategy.md](./monetization-strategy.md)
> **목표:** 검증된 상태로 서비스 런칭
> **기간:** 4주
> **선행 조건:** Phase 5 완료 (법적 준수, 프로덕션 인프라, 보안 감사)
> - Phase 5의 법적 페이지 (개인정보처리방침, 이용약관, 환불 정책) 게시 완료
> - Phase 5의 Sentry 모니터링 및 헬스체크 API 설정 완료
> - Phase 5의 보안 감사 통과 (OWASP 체크리스트, 보안 헤더)
> - Phase 5의 어드민 대시보드 (사용자 관리, 매출, AI 비용 모니터링) 완료
> - 통신판매업 신고 최종 승인 완료 (Phase 0에서 접수, Phase 5까지 완료 목표)
> **산출물:** 런칭 완료된 SaaS 서비스

---

## 목차

1. [Week 32: 클로즈드 베타 준비 + 실행](#week-32)
2. [Week 33: 부하 테스트 + 보안 검수 + 피드백 반영](#week-33)
3. [Week 34: 런칭 준비 (랜딩 페이지, SEO, 마케팅)](#week-34)
4. [Week 35: 런칭 + 포스트 런칭 모니터링](#week-35)
5. [런칭 체크리스트](#런칭-체크리스트)
6. [포스트 런칭 (Phase 7 이후)](#포스트-런칭)

---

## Week 32: 클로즈드 베타 {#week-32}

### 32.1 베타 참가자 모집

```
**베타 참가자:** 목표 30명 (최소 20명, 최대 50명)
- 최소 20명: 통계적으로 유의미한 피드백 수집 가능
- 목표 30명: 다양한 사용 패턴 관찰 가능
- 최대 50명: 현재 인프라 제한 (Vercel Hobby Plan 기준)

모집 채널 (구체화):
  1. 지인 네트워크 (5-10명)
     - 개발자 동료, 스터디 멤버
     - 직접 초대를 통한 높은 참여율 확보

  2. 개발자 커뮤니티 (10-15명)
     - velog: 개발 블로그 포스트 + 댓글 모집
     - OKKY: "AI 면접 봇 베타 테스터 모집" 게시글
     - 인프런/프로그래머스 커뮤니티 공지

  3. LinkedIn (5-10명)
     - 개인 네트워크에 포스트
     - 취업 준비 관련 그룹 타겟팅
     - #취업준비 #개발자면접 해시태그 활용

  4. 대학/부트캠프 (5-10명)
     - 개발자 양성 과정 수강생
     - 취업 준비 커뮤니티 (에브리타임 등)
     - CS/소프트웨어학과 게시판

선별 기준:
  - 취업 준비 중인 개발자 (주 타겟)
  - 다양한 경력 수준 (주니어/미드/시니어)
  - 다양한 기술 스택 (프론트엔드/백엔드/풀스택)
  - 피드백 제공 의지가 있는 사용자
```

### 32.2 베타 환경 설정

#### 베타 환경 정의

**Staging 환경 (프로덕션 동일 구성):**
- Vercel Preview Deployment (별도 URL: `beta.interview-bot.com`)
- 별도 PostgreSQL 데이터베이스 (스테이징용)
- **Stripe Live Mode** (실제 결제, 테스트 카드 사용 가능)
- Upstash Redis (별도 인스턴스)
- Sentry (프로덕션과 동일 모니터링)

> 프로덕션과 동일한 인프라 구성이지만 별도 데이터베이스를 사용하여 격리됩니다.

```
베타 사용자 혜택:
  - Pro 무료 체험 (1개월)
  - 실제 결제 테스트 (₩100 테스트 결제 후 환불)

베타 전용 기능:
  - 피드백 버튼 (모든 페이지)
  - 간단한 피드백 폼 (5점 만족도 + 자유 의견)
  - 버그 리포트 기능 (스크린샷 첨부)
```

### 32.3 베타 피드백 수집

**Prisma 스키마 업데이트 필요:**

```prisma
// prisma/schema.prisma
model BetaFeedback {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  category  String   // "bug", "feature", "ux", "performance", "security"
  content   String   @db.Text
  rating    Int?     // 1-5, nullable
  page      String?  // 피드백이 발생한 페이지 URL
  userAgent String?
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([category])
  @@index([createdAt])
}

// User 모델에 relation 추가
model User {
  // ... 기존 필드
  betaFeedback BetaFeedback[]
}
```

```typescript
// src/app/api/feedback/route.ts
export async function POST(req: NextRequest) {
  const { userId } = requireAuth(req);
  const { category, content, rating, page } = await req.json();

  // 카테고리 검증
  const validCategories = ['bug', 'feature', 'ux', 'performance', 'security'];
  if (!validCategories.includes(category)) {
    return Response.json({ error: 'Invalid category' }, { status: 400 });
  }

  await prisma.betaFeedback.create({
    data: {
      userId,
      category,
      content,
      rating: rating ? Math.min(Math.max(rating, 1), 5) : null, // 1-5 범위 보장
      page,
      userAgent: req.headers.get('user-agent'),
    }
  });

  return Response.json({ success: true });
}
```

**마이그레이션:**
```bash
npx prisma migrate dev --name add_beta_feedback
```
**파일:** `prisma/migrations/YYYYMMDD_add_beta_feedback/migration.sql`

**롤백:**
```sql
DROP TABLE IF EXISTS "BetaFeedback";
```

### 32.4 베타 기간 테스트 시나리오

```
필수 테스트 항목:

[인증]
  [ ] 이메일 가입 → 로그인 → 프로필 설정
  [ ] Google OAuth 로그인
  [ ] 비밀번호 재설정

[면접 핵심 플로우]
  [ ] 면접 시작 → 5개 이상 질문 → 답변 → 종료
  [ ] 히스토리에서 질문/답변 확인
  [ ] 평가 결과 확인
  [ ] 다양한 주제/난이도 조합 테스트

[결제]
  [ ] 가격 페이지 표시 정확성 (Free/Pro)
  [ ] Pro 구독 (₩100 테스트 → 즉시 환불)
  [ ] 구독 취소 → FREE 전환
  [ ] 환불 요청 처리

[Feature Gate]
  [ ] Free 사용자: 4번째 세션 차단 확인
  [ ] Pro 사용자: 전 기능 사용 가능

[고급 기능]
  [ ] 분석 대시보드
  [ ] 이메일 알림 수신
```

---

## Week 33: 부하 테스트 + 보안 검수 {#week-33}

### 33.1 부하 테스트

```
도구: k6
```

#### 부하 테스트 목표

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| 동시 사용자 | 20명 | k6 VU (Virtual Users) |
| 지속 시간 | 2분 유지 | k6 duration |
| p95 응답시간 | < 2초 | k6 http_req_duration |
| 에러율 | < 1% | k6 http_req_failed |

**k6 시나리오:**
```javascript
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // ramp up
    { duration: '2m', target: 20 },   // sustain 20 VU
    { duration: '30s', target: 0 },   // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
  },
};
```

```
확장 계획 (사용자 증가 시):
  - Phase 1 (0-50 DAU): 단일 서버 (현재 목표)
  - Phase 2 (50-200 DAU): 수평 확장 (서버 2대 + 로드밸런서)
  - Phase 3 (200+ DAU): 오토스케일링 + CDN
```

```javascript
// k6 시나리오 예시
// load-test/scenarios/interview-flow.js

import http from 'k6/http';
import { check, sleep } from 'k6';

export default function () {
  // 1. 로그인
  const loginRes = http.post('/api/auth/login', JSON.stringify({
    email: `user${__VU}@test.com`,
    password: 'testpassword',
  }));
  check(loginRes, { 'login success': (r) => r.status === 200 });

  // 2. 세션 생성
  const sessionRes = http.post('/api/interview', JSON.stringify({
    topics: ['JavaScript'],
    difficulty: 'mid',
    evaluationMode: 'after_complete',
  }));

  // 3. 면접 스트리밍
  // ... (SSE 테스트)

  sleep(1);
}
```

### 33.2 보안 검수

#### 보안 침투 테스트

**도구:** OWASP ZAP (자동 스캔) + 수동 테스트
**범위:** OWASP Top 10 체크리스트
**수행자:** 내부 (개발자 본인)
**결과물:** 취약점 보고서 (severity별 분류: Critical/High/Medium/Low)

**자동 스캔:**
```bash
# OWASP ZAP Docker로 자동 스캔
docker run -t owasp/zap2docker-stable zap-baseline.py -t https://beta.interview-bot.com
```

**수동 테스트 체크리스트:**
- [ ] SQL Injection: 모든 입력 필드에 `' OR 1=1 --` 시도
- [ ] XSS: `<script>alert(1)</script>` 입력 시도
- [ ] CSRF: 토큰 없이 POST 요청 시도
- [ ] 인증 우회: 만료된 JWT로 API 접근 시도
- [ ] 권한 상승: FREE 사용자로 PRO 기능 접근 시도
- [ ] Rate Limiting: 1분 내 100+ 요청 시도

```
추가 항목:

1. 인증 우회 시도
   - 만료된 JWT로 API 접근
   - 조작된 JWT로 API 접근
   - Admin API 무단 접근 시도

2. 테넌트 격리 검증
   - User A의 토큰으로 User B 데이터 접근 시도
   - URL 조작으로 다른 사용자 세션 접근
   - API 파라미터 조작으로 타인 데이터 수정 시도

3. 결제 보안
   - Webhook 서명 없이 호출
   - 가격 조작 시도
   - 이중 결제 시도
```

### 33.3 베타 피드백 반영

```
피드백 우선순위:
  P0 (즉시 수정): 서비스 사용 불가능한 버그
  P1 (런칭 전): UX 개선, 성능 이슈
  P2 (런칭 후): 편의 기능 개선, 마이너 UI 이슈
```

---

## Week 34: 런칭 준비 {#week-34}

### 34.1 랜딩 페이지

**파일:** `src/app/page.tsx` (메인 페이지 교체)

#### 랜딩 페이지 구현 방안

**접근:** Tailwind CSS + 기존 컴포넌트 활용 (외부 디자이너 불필요)
**참고:** Tailwind UI / Shadcn 템플릿 기반
**기간:** Week 33 (3일)
**페이지:** `/` (메인 랜딩) + `/pricing` (가격 비교)

```
랜딩 페이지 구성:
┌──────────────────────────────────────────────────────────────┐
│  [Hero Section]                                              │
│  "AI와 함께하는 면접 준비, Interview Bot"                      │
│  "실전 같은 모의 면접으로 자신감을 키우세요"                     │
│  [무료로 시작하기] [요금제 보기]                                │
│                                                              │
│  [Feature Highlights]                                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ AI 면접관│ │ 맞춤 피드│ │ 다양한  │ │ 성과    │           │
│  │         │ │ 백       │ │ 주제    │ │ 분석    │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                              │
│  [How It Works] (3단계)                                      │
│  1. 프로필 설정 → 2. AI 면접 시작 → 3. 피드백 확인            │
│                                                              │
│  [Pricing Section] (가격 요약)                               │
│                                                              │
│  [Testimonials] (베타 사용자 후기)                             │
│                                                              │
│  [FAQ]                                                       │
│                                                              │
│  [CTA] "지금 무료로 시작하세요"                               │
│                                                              │
│  [Footer]                                                    │
│  서비스 소개 | 요금제 | 개인정보처리방침 | 이용약관            │
│  사업자 정보 | 문의하기                                       │
└──────────────────────────────────────────────────────────────┘
```

### 34.2 SEO 최적화

```typescript
// src/app/layout.tsx - 메타데이터

export const metadata = {
  title: 'Interview Bot - AI 모의 면접 플랫폼',
  description: 'AI 면접관과 함께 실전 같은 모의 면접을 연습하세요. 맞춤형 피드백, 다양한 기술 주제, 성과 분석.',
  keywords: ['AI 면접', '모의 면접', '면접 준비', '개발자 면접', '기술 면접'],
  openGraph: {
    title: 'Interview Bot - AI 모의 면접',
    description: '실전 같은 AI 면접으로 자신감을 키우세요',
    type: 'website',
    locale: 'ko_KR',
  },
};

// robots.txt
// sitemap.xml 자동 생성
```

### 34.3 런칭 마케팅

```
채널별 전략:

1. ProductHunt 런칭
   - 제품 소개 글 준비
   - 스크린샷 + 데모 GIF
   - 초기 사용자 후기

2. 개발자 커뮤니티
   - velog 블로그 포스트 (개발 과정 공유)
   - OKKY/프로그래머스 커뮤니티 공유
   - Reddit r/programming, r/webdev

3. LinkedIn
   - 서비스 출시 포스트
   - 개발 스토리 시리즈

4. 기술 블로그
   - "AI 면접 서비스 만들기" 기술 블로그
   - Next.js + Stripe + AI 통합 사례

5. 초기 할인 프로모션
   - "런칭 기념 50% 할인" (첫 달)
   - 베타 참가자 영구 20% 할인
```

### 34.4 고객 지원 체계

```
이메일 기반:
  - support@interviewbot.com
  - 응답 목표: 24시간 이내 (평일)
  - FAQ 페이지로 셀프 서비스 유도

향후:
  - 인앱 채팅 (사용자 수 증가 시)
  - 커뮤니티 포럼
```

---

## Week 35: 런칭 + 포스트 런칭 모니터링 {#week-35}

### 35.1 런칭 D-Day 체크리스트 (최적화된 순서)

```
런칭 전 (D-1):
  [ ] 프로덕션 환경 변수 설정 (가장 중요)
  [ ] 백업 확인
  [ ] 롤백 절차 확인
  [ ] 도메인 DNS 설정 확인
  [ ] SSL 인증서 확인
  [ ] 모니터링 알림 설정
  [ ] Stripe 라이브 모드 전환 (마지막 단계)

런칭 당일 (D-Day):
  [ ] 프로덕션 배포
  [ ] 마이그레이션 실행 (배포 직후)
  [ ] 헬스체크 확인
  [ ] 테스트 계정으로 전체 플로우 검증
  [ ] 테스트 결제 (₩100 → 환불)
  [ ] 모니터링 대시보드 확인 (에러 없는지)
  [ ] ProductHunt 등록
  [ ] 소셜 미디어 포스트 (LinkedIn, Twitter 등)

런칭 후 (D+1~7):
  [ ] 일일 모니터링 (에러, 비용, 사용자)
  [ ] 사용자 피드백 수집 및 분류
  [ ] P0 긴급 버그 패치 (필요 시)
  [ ] 첫 주 리포트 작성 (사용자 수, 전환율, 주요 이슈)
```

### 35.2 포스트 런칭 모니터링 대시보드

```
일일 확인 항목:
  - 신규 가입자 수
  - 활성 사용자 수 (DAU)
  - AI 비용 (일일 총액 + 사용자당 평균)
  - AI 비용/매출 비율 (목표: < 40%)
  - 에러율 (목표: < 1%)
  - 웹훅 실패율 (목표: < 0.1%)
  - Redis 가용성

주간 확인 항목:
  - MRR (Monthly Recurring Revenue)
  - Free → Paid 전환율 (목표: > 10%)
  - 해지율 (목표: < 5%/월)
  - 사용자 피드백 요약
  - 성능 추이 (응답 시간 p95)
```

### 35.3 킬스위치 (비상 조치)

```typescript
// 비용 폭주 시 비상 조치:

// 1. 무료 가입 중단
// AppConfig에 "signup_enabled" = "false" 설정
// middleware에서 /signup 차단

// 2. Free 티어 세션 수 축소
// AppConfig에 "free_session_override" = "3" 설정
// TIER_LIMITS에 환경변수 오버라이드 적용

// 3. AI 모델 다운그레이드
// 전 사용자 Haiku로 강제 전환 (비용 66% 절감)

// 4. 서비스 점검 모드
// middleware에서 /maintenance 페이지로 리다이렉트
```

---

## 런칭 체크리스트 {#런칭-체크리스트}

```
[인프라 - 가장 먼저]
  [ ] 프로덕션 서버 안정
  [ ] SSL/HTTPS 적용
  [ ] 자동 백업 설정
  [ ] 모니터링 + 알림 설정
  [ ] CI/CD 파이프라인

[보안 - 두 번째]
  [ ] OWASP 체크리스트 통과
  [ ] 펜테스팅 완료
  [ ] 보안 헤더 적용
  [ ] 환경 변수 보안 확인

[법적 요건 - 세 번째]
  [ ] 통신판매업 신고 완료
  [ ] 개인정보처리방침 게시
  [ ] 이용약관 게시
  [ ] 사업자 정보 표시
  [ ] 환불 정책 게시

[기능 완성도 - 네 번째]
  [ ] 가입/로그인 (이메일 + OAuth)
  [ ] 면접 플로우 (질문/답변/평가)
  [ ] 결제 (Stripe, Free/Pro 2개 티어)
  [ ] Feature Gate (세션/질문/모델 제한)
  [ ] 분석 대시보드
  [ ] BetaFeedback 모델 마이그레이션 완료

[마케팅 - 마지막]
  [ ] 랜딩 페이지
  [ ] SEO 메타데이터
  [ ] ProductHunt 등록 준비
  [ ] 소셜 미디어 콘텐츠 (LinkedIn, Twitter, velog)
```

---

## 포스트 런칭 (Phase 7 이후) {#포스트-런칭}

### Phase 7: PortOne 통합 (런칭 후 안정화 이후)

```
[ ] PortOne V2 SDK 연동
[ ] KG이니시스 가맹점 설정
[ ] 정기결제(빌링키) 연동
[ ] PortOneAdapter 구현
[ ] 한국/글로벌 사용자 자동 분기
[ ] 통합 테스트
```

### 향후 로드맵

```
- 모바일 앱 (React Native / Expo)
- 다국어 지원 (영어, 일본어)
- AI 면접관 캐릭터 커스터마이징
- 영상 면접 모드 (WebRTC)
- 기업용 대량 라이선스
- API 제공 (B2B)
- 커뮤니티 기능 (경험 공유)
```

---

## 10개월 후 비즈니스 목표 요약

```
사용자:
  총 가입자: 1,000+
  MAU: 500+
  유료 사용자: 100+ (전환율 10%+)

매출:
  MRR: ₩1,500,000+ (~$1,100)
  AI 비용 대비 매출: > 2.5x

서비스 품질:
  업타임: > 99.5%
  에러율: < 1%
  평균 응답 시간: < 2초
  NPS: > 30
```
