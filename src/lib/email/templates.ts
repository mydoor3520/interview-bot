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
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard"
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
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/billing"
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
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/billing"
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
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing"
           style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          PRO로 업그레이드
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
          PRO 플랜으로 업그레이드하면 무제한으로 이용할 수 있습니다.
        </p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing"
           style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          지금 업그레이드
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
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/interview"
           style="display: inline-block; background: #18181b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          면접 시작하기
        </a>
      </div>
    `,
  }),
};
