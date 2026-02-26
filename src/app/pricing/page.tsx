'use client';

import { useState } from 'react';
import { useToast } from '@/components/Toast';

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function PricingPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const betaFeatures = [
    { title: '월 15회 AI 모의면접', desc: '매달 15번 실전처럼 연습' },
    { title: '세션당 10개 질문 + 꼬리질문', desc: '깊이 있는 면접 시뮬레이션' },
    { title: '모든 회사 스타일 면접', desc: '다양한 기업 문화에 맞춘 질문' },
    { title: '모든 기술 스택', desc: '원하는 기술에 특화된 질문' },
    { title: '즉시 피드백', desc: '답변 직후 AI가 바로 코칭' },
    { title: '지원 포지션 5개 관리', desc: '여러 기업에 동시 지원' },
    { title: '채용공고 자동 등록 월 5회', desc: 'URL 입력만으로 간편 등록' },
    { title: '90일 면접 기록 보관', desc: '지난 면접을 다시 확인' },
    { title: '성과 분석 대시보드', desc: '시간에 따른 실력 변화 추적' },
    { title: '적응형 난이도', desc: '실력에 맞춰 조절되는 질문' },
    { title: '교차 기술 질문', desc: '여러 기술을 융합한 질문' },
  ];

  const earlyAdopterBenefits = [
    { title: '베타 기간 데이터 완전 보존', desc: '모든 면접 기록과 분석 데이터 유지' },
    { title: 'PRO 출시 시 최대 30% 할인', desc: '얼리 어답터 전용 특별 할인' },
    { title: '신규 기능 우선 접근', desc: '새로운 기능을 가장 먼저 체험' },
  ];

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim()) {
      toast('이메일을 입력해주세요.', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast('올바른 이메일 형식이 아닙니다.', 'error');
      return;
    }

    setIsSubmitting(true);

    // Simulate submission (you can connect to feedback API later)
    setTimeout(() => {
      toast('출시 알림 신청이 완료되었습니다! 📧', 'success');
      setEmail('');
      setIsSubmitting(false);
    }, 500);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Beta Banner */}
        <div className="mb-12 rounded-2xl border-2 border-blue-500 bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-4 py-2 mb-4">
            <span className="text-2xl">🎉</span>
            <span className="text-sm font-bold uppercase tracking-wider text-blue-400">
              무료 베타 기간
            </span>
          </div>
          <h2 className="text-3xl font-bold sm:text-4xl">
            모든 기능, 완전 무료로 체험하세요
          </h2>
          <p className="mt-4 text-lg text-zinc-300">
            정식 출시 전까지 약 3개월간 모든 프리미엄 기능을 제한 없이 사용할 수 있습니다
          </p>
        </div>

        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            면접 준비, 이제 AI와 함께
          </h1>
          <p className="mt-4 text-lg text-zinc-400">
            베타 기간 동안 제공되는 모든 기능을 확인하세요
          </p>
        </div>

        {/* Single Beta Plan Card */}
        <div className="mt-16 mx-auto max-w-2xl">
          <div className="relative flex flex-col rounded-2xl border-2 border-blue-500 bg-gradient-to-b from-zinc-900 to-zinc-950 p-8 shadow-xl">
            {/* Beta Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-2 text-sm font-bold uppercase text-white">
                베타 무료 체험
              </span>
            </div>

            <div className="flex-1">
              <h2 className="text-3xl font-bold text-center">모든 기능 무료</h2>
              <p className="mt-4 text-center text-zinc-400">
                정식 출시 전까지 모든 프리미엄 기능을 무료로 사용하세요
              </p>
              <div className="mt-6 text-center">
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">
                    ₩0
                  </span>
                  <span className="text-zinc-400 text-xl">/월</span>
                </div>
                <div className="mt-2 text-sm text-zinc-500">
                  정식 출시 후 월 ₩19,900 예정
                </div>
              </div>
              <ul className="mt-10 space-y-4">
                {betaFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckIcon className="h-6 w-6 flex-shrink-0 text-blue-500" />
                    <div>
                      <span className="font-medium text-zinc-200">{feature.title}</span>
                      <p className="text-sm text-zinc-500 mt-0.5">{feature.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-8 rounded-lg bg-zinc-800 px-6 py-4 text-center">
              <p className="text-sm text-zinc-400">
                회원가입만 하면 바로 시작할 수 있습니다
              </p>
            </div>
          </div>
        </div>

        {/* Early Adopter Benefits */}
        <div className="mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">얼리 어답터 혜택</h2>
            <p className="mt-4 text-lg text-zinc-400">
              베타 기간 사용자에게만 제공되는 특별한 혜택
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {earlyAdopterBenefits.map((benefit, index) => (
              <div
                key={index}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-blue-500/50 hover:bg-zinc-900"
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                  <span className="text-2xl">
                    {index === 0 ? '💾' : index === 1 ? '🎁' : '⚡'}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-zinc-200">{benefit.title}</h3>
                <p className="mt-2 text-sm text-zinc-500">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Launch Notification Form */}
        <div className="mt-20">
          <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold">출시 알림 받기</h2>
              <p className="mt-3 text-zinc-400">
                PRO 플랜 정식 출시 시 얼리 어답터 할인 안내를 가장 먼저 받아보세요
              </p>
            </div>
            <form onSubmit={handleEmailSubmit} className="mt-6 flex gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일 주소를 입력하세요"
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                disabled={isSubmitting}
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? '전송 중...' : '알림 신청'}
              </button>
            </form>
            <p className="mt-4 text-center text-xs text-zinc-500">
              스팸 메일은 발송하지 않으며, 언제든 구독을 취소할 수 있습니다
            </p>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-16 text-center">
          <p className="text-sm text-zinc-500">
            베타 기간 중 모든 기능은 무료로 제공되며, 정식 출시 시 자동으로 과금되지 않습니다.
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            궁금한 점이 있으신가요?{' '}
            <a href="mailto:support@interviewbot.com" className="text-blue-400 hover:text-blue-300">
              고객 지원팀에 문의하세요
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
