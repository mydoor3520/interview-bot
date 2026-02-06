# Phase 4: Analytics Dashboard & Email Notifications (Week 23-26)

> **Last Updated:** 2026-02-06
> **Reviewed by:** Momus (REVISE 5/10 - LinkedIn & PDF features removed)
> **상위 문서:** [monetization-strategy.md](./monetization-strategy.md)
> **목표:** 고급 분석 대시보드, 이메일 알림 시스템
> **기간:** 4주
> **선행 조건:** Phase 3 완료 (Feature Gate, 사용량 제어)
> - Phase 3의 `TIER_LIMITS` 상수 및 `checkBooleanFeature()` 유틸리티 필요
> - Phase 3의 `AIUsageLog` 확장 (userId, cost 필드) 필요
> - Phase 1의 User 모델 및 인증 시스템 필요
> - Phase 2의 Subscription 모델 필요 (사용량 추적 연계)
> **산출물:** 고급 분석 대시보드(Pro), 이메일 알림 시스템

> **선행 조건 검증 (Phase 3 산출물):**
> - `TIER_LIMITS` 상수 존재: `src/lib/feature-gate.ts`
> - `checkBooleanFeature()` 함수 존재: `src/lib/feature-gate.ts`
> - `AIUsageLog`에 userId/cost 필드 존재: `prisma/schema.prisma`
> - `requireAuth(req)` → `{ userId, tier }` 반환

---

## 변경 사항 (Momus 리뷰 반영)

**제거된 기능:**
- **LinkedIn 프로필 연동**: LinkedIn Partner Program 없이는 positions/skills 데이터 접근 불가
- **PDF 리포트**: @react-pdf/renderer는 클라이언트 전용 라이브러리로 Next.js 서버사이드 호환 불가

**유지된 기능:**
- 고급 분석 대시보드 (Pro)
- 이메일 알림 시스템
- 사용량 추적 및 통계

---

## 목차

1. [Week 23: 고급 분석 대시보드 (Pro)](#week-23)
2. [Week 24: 이메일 알림 시스템](#week-24)
3. [Week 25: 사용량 추적 및 통계 강화](#week-25)
4. [Week 26: 통합 테스트 + 최적화](#week-26)
5. [완료 기준](#완료-기준)

---

## Week 23: 고급 분석 대시보드 (Pro) {#week-23}

### 23.1 분석 API

**파일:** `src/app/api/analytics/route.ts`

```typescript
export async function GET(req: NextRequest) {
  const { userId, tier } = requireAuth(req);

  const check = checkBooleanFeature(tier as SubscriptionTier, 'advancedAnalytics');
  if (!check.allowed) {
    // Free 티어: 기본 통계만
    return Response.json(await getBasicStats(userId));
  }

  // Pro: 고급 분석
  return Response.json(await getAdvancedAnalytics(userId));
}

async function getBasicStats(userId: string) {
  const sessions = await prisma.interviewSession.findMany({
    where: { userId, status: 'completed' },
    include: { questions: { include: { evaluation: true } } },
    orderBy: { completedAt: 'desc' },
    take: 10,
  });

  return {
    totalSessions: sessions.length,
    averageScore: calculateAverage(sessions),
    recentSessions: sessions.slice(0, 5),
  };
}

async function getAdvancedAnalytics(userId: string) {
  const sessions = await prisma.interviewSession.findMany({
    where: { userId, status: 'completed' },
    include: { questions: { include: { evaluation: true } } },
    orderBy: { completedAt: 'desc' },
  });

  return {
    ...await getBasicStats(userId),

    // 토픽별 성과 트렌드
    topicPerformance: analyzeByTopic(sessions),

    // 시간에 따른 성과 변화
    progressOverTime: analyzeProgress(sessions),

    // 취약 분야 분석
    weakAreas: identifyWeakAreas(sessions),

    // 강점 분석
    strengths: identifyStrengths(sessions),

    // 면접 역량 레이더 차트 데이터
    radarChart: generateRadarData(sessions),

    // 추천 학습 영역
    recommendations: generateRecommendations(sessions),
  };
}
```

### 23.2 분석 헬퍼 함수

**파일:** `src/lib/analytics.ts`

```typescript
import { InterviewSession, Question, Evaluation } from '@prisma/client';

type SessionWithDetails = InterviewSession & {
  questions: (Question & { evaluation: Evaluation | null })[];
};

export function calculateAverage(sessions: SessionWithDetails[]): number {
  if (sessions.length === 0) return 0;

  const scores = sessions
    .flatMap(s => s.questions)
    .map(q => q.evaluation?.score || 0)
    .filter(score => score > 0);

  if (scores.length === 0) return 0;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

export function analyzeByTopic(sessions: SessionWithDetails[]) {
  const topicScores: Record<string, { total: number; count: number }> = {};

  sessions.forEach(session => {
    session.topics.forEach(topic => {
      if (!topicScores[topic]) {
        topicScores[topic] = { total: 0, count: 0 };
      }

      session.questions.forEach(q => {
        if (q.evaluation?.score) {
          topicScores[topic].total += q.evaluation.score;
          topicScores[topic].count += 1;
        }
      });
    });
  });

  return Object.entries(topicScores).map(([topic, { total, count }]) => ({
    topic,
    averageScore: count > 0 ? total / count : 0,
    questionCount: count,
  }));
}

export function analyzeProgress(sessions: SessionWithDetails[]) {
  const sortedSessions = sessions
    .filter(s => s.completedAt)
    .sort((a, b) => a.completedAt!.getTime() - b.completedAt!.getTime());

  return sortedSessions.map(session => {
    const avgScore = session.questions
      .map(q => q.evaluation?.score || 0)
      .filter(s => s > 0)
      .reduce((sum, s, _, arr) => sum + s / arr.length, 0);

    return {
      date: session.completedAt!.toISOString().split('T')[0],
      score: avgScore,
      sessionId: session.id,
    };
  });
}

export function identifyWeakAreas(sessions: SessionWithDetails[]) {
  const topicData = analyzeByTopic(sessions);

  return topicData
    .filter(t => t.questionCount >= 3) // 최소 3개 이상 답변한 토픽
    .sort((a, b) => a.averageScore - b.averageScore)
    .slice(0, 5)
    .map(t => ({
      topic: t.topic,
      score: t.averageScore,
      questions: t.questionCount,
    }));
}

export function identifyStrengths(sessions: SessionWithDetails[]) {
  const topicData = analyzeByTopic(sessions);

  return topicData
    .filter(t => t.questionCount >= 3)
    .sort((a, b) => b.averageScore - a.averageScore)
    .slice(0, 5)
    .map(t => ({
      topic: t.topic,
      score: t.averageScore,
      questions: t.questionCount,
    }));
}

export function generateRadarData(sessions: SessionWithDetails[]) {
  const topicData = analyzeByTopic(sessions);
  const mainTopics = ['algorithms', 'data-structures', 'system-design', 'database', 'network'];

  return mainTopics.map(topic => {
    const data = topicData.find(t => t.topic === topic);
    return {
      subject: topic,
      score: data?.averageScore || 0,
      fullMark: 10,
    };
  });
}

export function generateRecommendations(sessions: SessionWithDetails[]) {
  const weakAreas = identifyWeakAreas(sessions);

  return weakAreas.map(area => ({
    topic: area.topic,
    reason: `평균 점수 ${area.score.toFixed(1)}점으로 개선이 필요합니다.`,
    action: `${area.topic} 관련 질문을 더 연습하세요.`,
  }));
}
```

### 23.3 분석 대시보드 UI

**파일:** `src/app/analytics/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(data => {
        setAnalytics(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>분석 데이터를 불러오는 중...</div>;

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">면접 분석</h1>

      {/* 통계 카드 */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="총 세션" value={analytics.totalSessions} />
        <StatCard title="평균 점수" value={analytics.averageScore?.toFixed(1)} />
        <StatCard title="최고 점수" value={Math.max(...analytics.progressOverTime?.map((p: any) => p.score) || [0]).toFixed(1)} />
        <StatCard title="향상률" value="+15%" />
      </div>

      {/* 점수 추이 차트 */}
      {analytics.progressOverTime && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">점수 추이</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.progressOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="score" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 역량 레이더 차트 & 취약 분야 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 레이더 차트 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">역량 분석</h2>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={analytics.radarChart}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <PolarRadiusAxis domain={[0, 10]} />
              <Radar name="Score" dataKey="score" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* 취약 분야 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">취약 분야</h2>
          <ul className="space-y-2">
            {analytics.weakAreas?.map((area: any, i: number) => (
              <li key={i} className="flex justify-between">
                <span>{i + 1}. {area.topic}</span>
                <span className="text-gray-600">{area.score.toFixed(1)}점</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 p-3 bg-blue-50 rounded">
            <p className="text-sm text-blue-700">
              추천: {analytics.recommendations?.[0]?.topic} 집중 학습 권장
            </p>
          </div>
        </div>
      </div>

      {/* 토픽별 성과 */}
      {analytics.topicPerformance && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">토픽별 성과</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">토픽</th>
                <th className="text-right py-2">평균 점수</th>
                <th className="text-right py-2">질문 수</th>
              </tr>
            </thead>
            <tbody>
              {analytics.topicPerformance.map((topic: any) => (
                <tr key={topic.topic} className="border-b">
                  <td className="py-2">{topic.topic}</td>
                  <td className="text-right">{topic.averageScore.toFixed(1)}</td>
                  <td className="text-right">{topic.questionCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="text-gray-600 text-sm">{title}</div>
      <div className="text-3xl font-bold mt-2">{value}</div>
    </div>
  );
}
```

---

## Week 24: 이메일 알림 시스템 {#week-24}

### 24.1 Resend 연동 본격 구현

**파일:** `src/lib/email/index.ts` 업데이트

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM || 'InterviewBot <noreply@interviewbot.com>';

export async function sendEmail(data: EmailData): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[EMAIL MOCK] To: ${data.to}, Subject: ${data.subject}`);
    return;
  }

  await resend.emails.send({
    from: EMAIL_FROM,
    to: data.to,
    subject: data.subject,
    html: data.html,
  });
}
```

### 24.2 이메일 종류별 구현

**파일:** `src/lib/email/templates.ts`

```typescript
export const emailTemplates = {
  // 1. 가입 환영
  welcome: (name: string) => ({
    subject: '[InterviewBot] 가입을 환영합니다!',
    html: `<h1>환영합니다, ${name}님!</h1><p>AI 모의 면접으로 면접 준비를 시작하세요.</p>`,
  }),

  // 2. 결제 확인
  paymentSuccess: (tier: string, amount: string) => ({
    subject: '[InterviewBot] 결제가 완료되었습니다',
    html: `<p>${tier} 플랜 구독이 시작되었습니다. 결제 금액: ${amount}</p>`,
  }),

  // 3. 결제 실패
  paymentFailed: () => ({
    subject: '[InterviewBot] 결제 실패 안내',
    html: `<p>결제가 실패했습니다. 3일 이내에 결제 수단을 업데이트해주세요.</p>`,
  }),

  // 4. 구독 갱신 알림 (3일 전)
  renewalReminder: (nextDate: string, amount: string) => ({
    subject: '[InterviewBot] 구독 갱신 예정 안내',
    html: `<p>${nextDate}에 ${amount}가 결제될 예정입니다.</p>`,
  }),

  // 5. 사용량 경고 (80%)
  usageWarning80: (used: number, limit: number) => ({
    subject: '[InterviewBot] 월간 세션 사용량 80% 도달',
    html: `<p>이번 달 세션을 ${used}/${limit}개 사용하셨습니다.</p>`,
  }),

  // 6. 사용량 한도 도달 (100%)
  usageLimitReached: (limit: number) => ({
    subject: '[InterviewBot] 월간 세션 한도 도달',
    html: `<p>${limit}개 세션을 모두 사용하셨습니다. 업그레이드하여 더 많은 세션을 이용하세요.</p>`,
  }),

  // 7. 주간 학습 리마인더
  weeklyReminder: (stats: { sessions: number; avgScore: number }) => ({
    subject: '[InterviewBot] 이번 주 면접 연습 리마인더',
    html: `<p>지난주 ${stats.sessions}개 세션, 평균 ${stats.avgScore.toFixed(1)}점이었습니다.</p>`,
  }),
};
```

### 24.3 이메일 수신 설정

```prisma
// User 모델에 추가
model User {
  // ...기존 필드
  emailNotifications Boolean @default(true)
}
```

**마이그레이션 파일:** `prisma/migrations/YYYYMMDD_add_email_notifications/migration.sql`
```sql
ALTER TABLE "User" ADD COLUMN "emailNotifications" BOOLEAN NOT NULL DEFAULT true;
```

**파일:** `src/app/settings/page.tsx` 업데이트

```tsx
// 이메일 알림 설정 섹션 추가
<div className="bg-white p-6 rounded-lg shadow">
  <h2 className="text-xl font-semibold mb-4">이메일 알림</h2>
  <div className="space-y-2">
    <label className="flex items-center">
      <input type="checkbox" checked={notifications.payment} onChange={() => toggle('payment')} />
      <span className="ml-2">결제 관련 알림 (결제 확인, 실패, 갱신)</span>
    </label>
    <label className="flex items-center">
      <input type="checkbox" checked={notifications.usage} onChange={() => toggle('usage')} />
      <span className="ml-2">사용량 알림 (80% 도달, 한도 도달)</span>
    </label>
    <label className="flex items-center">
      <input type="checkbox" checked={notifications.weekly} onChange={() => toggle('weekly')} />
      <span className="ml-2">주간 학습 리마인더</span>
    </label>
    <label className="flex items-center">
      <input type="checkbox" checked={notifications.marketing} onChange={() => toggle('marketing')} />
      <span className="ml-2">마케팅 및 프로모션</span>
    </label>
  </div>
</div>
```

### 24.4 이메일 트리거 구현

**파일:** `src/lib/email/triggers.ts`

```typescript
import { sendEmail } from './index';
import { emailTemplates } from './templates';
import prisma from '@/lib/db/prisma';

export async function triggerWelcomeEmail(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.email) return;

  const template = emailTemplates.welcome(user.name || 'User');
  await sendEmail({
    to: user.email,
    subject: template.subject,
    html: template.html,
  });
}

export async function triggerUsageWarning(userId: string, used: number, limit: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.email) return;

  const notifications = user.emailNotifications as any;
  if (!notifications?.usage) return;

  const template = emailTemplates.usageWarning80(used, limit);
  await sendEmail({
    to: user.email,
    subject: template.subject,
    html: template.html,
  });
}

// 다른 트리거 함수들도 유사하게 구현...
```

---

## Week 25: 사용량 추적 및 통계 강화 {#week-25}

### 25.1 월간 사용량 추적 강화

**파일:** `src/app/api/usage/route.ts`

```typescript
export async function GET(req: NextRequest) {
  const { userId, tier } = requireAuth(req);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const sessionsThisMonth = await prisma.interviewSession.count({
    where: {
      userId,
      createdAt: { gte: startOfMonth, lte: endOfMonth },
    },
  });

  const limit = TIER_LIMITS[tier as SubscriptionTier].monthlySessions;
  const percentage = (sessionsThisMonth / limit) * 100;

  // 80% 도달 시 자동 이메일 발송
  if (percentage >= 80 && percentage < 90) {
    await triggerUsageWarning(userId, sessionsThisMonth, limit);
  }

  // 100% 도달 시 이메일 발송
  if (percentage >= 100) {
    await triggerUsageLimitReached(userId, limit);
  }

  return Response.json({
    used: sessionsThisMonth,
    limit,
    percentage: percentage.toFixed(1),
  });
}
```

### 25.2 주간 리마인더 크론 작업

**파일:** `src/app/api/cron/weekly-reminder/route.ts`

```typescript
// Vercel Cron: 매주 월요일 오전 9시
export async function GET(req: NextRequest) {
  // Vercel Cron Secret 검증
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: {
      emailNotifications: {
        path: ['weekly'],
        equals: true,
      },
    },
  });

  for (const user of users) {
    const stats = await getWeeklyStats(user.id);
    const template = emailTemplates.weeklyReminder(stats);
    await sendEmail({
      to: user.email!,
      subject: template.subject,
      html: template.html,
    });
  }

  return Response.json({ sent: users.length });
}

async function getWeeklyStats(userId: string) {
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);

  const sessions = await prisma.interviewSession.findMany({
    where: {
      userId,
      createdAt: { gte: lastWeek },
      status: 'completed',
    },
    include: {
      questions: { include: { evaluation: true } },
    },
  });

  const scores = sessions
    .flatMap(s => s.questions)
    .map(q => q.evaluation?.score || 0)
    .filter(s => s > 0);

  return {
    sessions: sessions.length,
    avgScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
  };
}
```

**파일:** `vercel.json` 업데이트

```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-reminder",
      "schedule": "0 9 * * 1"
    }
  ]
}
```

---

## Week 26: 통합 테스트 + 최적화 {#week-26}

### 26.1 E2E 테스트

```
[ ] 고급 분석 대시보드 데이터 정확도 확인
[ ] Free 사용자 고급 분석 요청 → 기본 통계만 반환
[ ] Pro 사용자 고급 분석 접근 성공
[ ] 이메일 발송 동작 확인 (Resend 테스트 모드)
[ ] 이메일 수신 설정 반영 확인
[ ] 사용량 80% 도달 시 자동 이메일 발송
[ ] 주간 리마인더 크론 작업 동작 확인
```

### 26.2 성능 최적화

> **Redis 의존성:** Phase 1에서 Upstash Redis 설정 완료를 전제합니다.
> 환경변수: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
> Redis 미설정 시에도 동작하나, 대시보드 응답 속도가 50-100ms → 200-500ms로 저하됩니다.

```
- 분석 쿼리 최적화 (인덱스 활용, N+1 쿼리 방지)
- 대시보드 데이터 캐싱 (Redis, 5분)
- 이메일 발송 비동기 처리 (큐 또는 배경 작업)
- 분석 계산 메모이제이션
```

### 26.3 데이터베이스 인덱스 추가

```prisma
model InterviewSession {
  // ...기존 필드

  @@index([userId, createdAt])
  @@index([userId, status, completedAt])
}

model Question {
  // ...기존 필드

  @@index([sessionId])
}

model Evaluation {
  // ...기존 필드

  @@index([questionId])
}
```

---

## 완료 기준 {#완료-기준}

```
[ ] 고급 분석 대시보드 (Pro) 정상 동작
[ ] 역량 레이더 차트가 5개 이상 카테고리를 표시하며, 각 축에 0-10 범위의 정확한 점수 표시
[ ] 토픽별 성과 분석이 실제 평가 점수와 정확히 일치 (오차 0.1 이하)
[ ] 이메일 알림 7종 발송 성공 (Resend 전송 성공 응답 확인)
[ ] 이메일 수신 설정 변경 후 해당 타입 이메일 발송/미발송 검증
[ ] 사용량 80% 도달 시 정확히 1회 이메일 발송 (중복 발송 없음)
[ ] 주간 리마인더 크론 작업이 매주 월요일 09:00에 실행되며 올바른 통계 포함
[ ] 성능 최적화 (쿼리 인덱싱, 캐싱): 대시보드 로딩 시간 200ms 이하 (Redis 사용 시)
```

---

## 파일 변경 매트릭스

```
신규:
  src/lib/analytics.ts
  src/lib/email/templates.ts
  src/lib/email/triggers.ts
  src/app/api/analytics/route.ts
  src/app/api/usage/route.ts
  src/app/api/cron/weekly-reminder/route.ts
  src/app/analytics/page.tsx

수정:
  src/lib/email/index.ts      - Resend 본격 연동
  src/app/settings/page.tsx   - 이메일 설정 추가
  package.json                - recharts, resend 추가
  prisma/schema.prisma        - User.emailNotifications 추가, 인덱스 추가
  vercel.json                 - 크론 작업 추가

환경 변수:
  RESEND_API_KEY=
  EMAIL_FROM=noreply@interviewbot.com
  CRON_SECRET=
```

---

## 의존성

```bash
npm install resend recharts
```

**recharts:** 차트 라이브러리 (LineChart, RadarChart)
**resend:** 이메일 발송 서비스
