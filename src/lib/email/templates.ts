import { env } from '@/lib/env';

function getBaseUrl() {
  return env.NEXT_PUBLIC_APP_URL;
}

export const emailTemplates = {
  welcome: (name: string) => ({
    subject: '[InterviewBot] 가입을 환영합니다!',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #18181b;">환영합니다, ${name}님!</h1>
        <p style="color: #52525b; line-height: 1.6;">
          InterviewBot에 가입해 주셔서 감사합니다.
          AI 모의 면접으로 체계적인 면접 준비를 시작하세요.
        </p>
        <a href="${getBaseUrl()}/dashboard"
           style="display: inline-block; background: #18181b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          시작하기
        </a>
      </div>
    `,
  }),

  paymentSuccess: (tier: string, amount: string) => ({
    subject: '[InterviewBot] 결제가 완료되었습니다',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #18181b;">결제 완료</h2>
        <p style="color: #52525b;">${tier} 플랜 구독이 시작되었습니다.</p>
        <p style="color: #52525b;">결제 금액: <strong>${amount}</strong></p>
        <a href="${getBaseUrl()}/billing"
           style="display: inline-block; background: #18181b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          구독 관리
        </a>
      </div>
    `,
  }),

  paymentFailed: () => ({
    subject: '[InterviewBot] 결제 실패 안내',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">결제 실패</h2>
        <p style="color: #52525b;">
          결제가 실패했습니다. 3일 이내에 결제 수단을 업데이트해주세요.
          기간 내 결제가 완료되지 않으면 무료 플랜으로 전환됩니다.
        </p>
        <a href="${getBaseUrl()}/billing"
           style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          결제 수단 업데이트
        </a>
      </div>
    `,
  }),

  renewalReminder: (nextDate: string, amount: string) => ({
    subject: '[InterviewBot] 구독 갱신 예정 안내',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #18181b;">구독 갱신 예정</h2>
        <p style="color: #52525b;">
          ${nextDate}에 <strong>${amount}</strong>가 결제될 예정입니다.
        </p>
        <p style="color: #71717a; font-size: 14px;">
          구독을 취소하시려면 갱신일 전에 설정에서 변경해주세요.
        </p>
      </div>
    `,
  }),

  usageWarning80: (used: number, limit: number) => ({
    subject: '[InterviewBot] 월간 세션 사용량 80% 도달',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">사용량 알림</h2>
        <p style="color: #52525b;">
          이번 달 세션을 <strong>${used}/${limit}개</strong> 사용하셨습니다.
        </p>
        <a href="${getBaseUrl()}/pricing"
           style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          더 많이 연습하기
        </a>
      </div>
    `,
  }),

  usageLimitReached: (limit: number) => ({
    subject: '[InterviewBot] 월간 세션 한도 도달',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">세션 한도 도달</h2>
        <p style="color: #52525b;">
          이번 달 ${limit}개 세션을 모두 사용하셨습니다.
          무료 베타 기간 중 월 15회까지 면접을 진행할 수 있습니다. 다음 달에 초기화됩니다.
        </p>
        <a href="${getBaseUrl()}/pricing"
           style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          더 알아보기
        </a>
      </div>
    `,
  }),

  weeklyReminder: (stats: { sessions: number; avgScore: number }) => ({
    subject: '[InterviewBot] 이번 주 면접 연습 리마인더',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #18181b;">주간 리포트</h2>
        ${stats.sessions > 0
          ? `<p style="color: #52525b;">지난주 <strong>${stats.sessions}개</strong> 세션을 완료했으며, 평균 <strong>${stats.avgScore.toFixed(1)}점</strong>을 받으셨습니다.</p>`
          : `<p style="color: #52525b;">지난주에는 면접 연습을 하지 않으셨네요. 꾸준한 연습이 실력 향상의 핵심입니다!</p>`
        }
        <a href="${getBaseUrl()}/interview"
           style="display: inline-block; background: #18181b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          면접 시작하기
        </a>
      </div>
    `,
  }),

  conversionPreview: (name: string, sessionsCompleted: number, avgScore: number) => ({
    subject: '[InterviewBot] PRO 플랜이 곧 출시됩니다',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #18181b;">안녕하세요, ${name}님!</h1>
        <p style="color: #52525b; line-height: 1.6;">
          InterviewBot을 이용해 주셔서 감사합니다.
          지금까지 <strong>${sessionsCompleted}회</strong>의 면접 연습을 완료하셨고,
          평균 <strong>${avgScore.toFixed(1)}점</strong>을 기록하셨습니다.
        </p>
        <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="color: #18181b; margin-top: 0;">곧 PRO 플랜이 출시됩니다</h3>
          <p style="color: #52525b; line-height: 1.6;">
            베타 기간 동안 사용해주신 감사의 마음을 담아,
            <strong>얼리 어답터 특별 할인</strong>을 준비하고 있습니다.
            출시 소식을 놓치지 마세요!
          </p>
        </div>
        <a href="${getBaseUrl()}/pricing"
           style="display: inline-block; background: #18181b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          자세히 알아보기
        </a>
        <p style="color: #a1a1aa; font-size: 12px; margin-top: 24px;">
          이 이메일은 InterviewBot 베타 사용자에게 발송됩니다.
        </p>
      </div>
    `,
  }),

  conversionEarlybird: (name: string) => ({
    subject: '[InterviewBot] 얼리버드 30% 할인 - 1주일 남았습니다',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #18181b;">${name}님, 특별 혜택을 놓치지 마세요!</h1>
        <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 12px; padding: 24px; margin: 16px 0; text-align: center;">
          <p style="color: #92400e; font-size: 24px; font-weight: bold; margin: 0;">얼리버드 30% 할인</p>
          <p style="color: #a16207; margin: 8px 0 0;">베타 사용자 한정 · 1주일 후 종료</p>
        </div>
        <p style="color: #52525b; line-height: 1.6;">
          베타 기간 동안 쌓으신 모든 면접 기록과 분석 데이터가
          PRO 전환 시 그대로 유지됩니다.
        </p>
        <ul style="color: #52525b; line-height: 1.8;">
          <li>월 30회 면접 세션</li>
          <li>세션당 15개 질문</li>
          <li>무제한 히스토리 보관</li>
          <li>우선 지원</li>
        </ul>
        <a href="${getBaseUrl()}/pricing"
           style="display: inline-block; background: #d97706; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; margin-top: 16px; font-weight: bold;">
          얼리버드 할인 받기
        </a>
        <p style="color: #a1a1aa; font-size: 12px; margin-top: 24px;">
          이 이메일은 InterviewBot 베타 사용자에게 발송됩니다.
        </p>
      </div>
    `,
  }),

  conversionLaunch: (name: string, sessionsCompleted: number) => ({
    subject: '[InterviewBot] PRO 플랜 출시! 지금 전환하면 데이터 완전 보존',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #18181b;">PRO 플랜이 출시되었습니다!</h1>
        <p style="color: #52525b; line-height: 1.6;">
          ${name}님, 베타 기간 동안 ${sessionsCompleted}회의 면접 연습을 하셨습니다.
        </p>
        <div style="background: #18181b; border-radius: 12px; padding: 24px; margin: 16px 0; color: white;">
          <h3 style="margin-top: 0; color: white;">베타 사용자 특별 혜택</h3>
          <ul style="line-height: 1.8; color: #d4d4d8;">
            <li>베타 기간 모든 데이터 영구 보존</li>
            <li>첫 달 30% 할인</li>
            <li>우선 고객 지원</li>
          </ul>
          <p style="color: #fbbf24; font-weight: bold; margin-bottom: 0;">
            * 할인은 출시 후 2주간만 유효합니다
          </p>
        </div>
        <a href="${getBaseUrl()}/pricing"
           style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; margin-top: 16px; font-weight: bold;">
          지금 PRO로 전환하기
        </a>
        <p style="color: #a1a1aa; font-size: 12px; margin-top: 24px;">
          무료 플랜은 계속 이용 가능합니다. 이 이메일은 InterviewBot 베타 사용자에게 발송됩니다.
        </p>
      </div>
    `,
  }),
};
