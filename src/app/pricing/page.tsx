'use client';

import { useState } from 'react';

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedFeatures, setExpandedFeatures] = useState(false);

  const monthlyPrice = 24_900;
  const yearlyPrice = 249_000;
  const yearlyMonthly = Math.round(yearlyPrice / 12);
  const discount = Math.round((1 - yearlyPrice / (monthlyPrice * 12)) * 100);

  async function handleSubscribe() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/payment/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingCycle }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('결제 페이지를 생성하는 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  }

  const freeFeatures = [
    '월 3회 면접 세션',
    '세션당 10개 질문',
    '사후 평가 제공',
    '기본 면접 유형',
    '평가 리포트 저장',
  ];

  const proFeatures = [
    '무제한 면접 세션',
    '세션당 30개 질문',
    '실시간 피드백',
    '모든 면접 유형',
    '상세 평가 리포트',
    '이력서 기반 맞춤 질문',
    '우선 고객 지원',
  ];

  const comparisonFeatures = [
    { name: '면접 세션', free: '월 3회', pro: '무제한' },
    { name: '세션당 질문 수', free: '10개', pro: '30개' },
    { name: '피드백 방식', free: '사후 평가', pro: '실시간 피드백' },
    { name: '면접 유형', free: '기본', pro: '전체' },
    { name: '평가 리포트', free: '기본', pro: '상세' },
    { name: '이력서 기반 질문', free: '-', pro: '✓' },
    { name: '우선 고객 지원', free: '-', pro: '✓' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            면접 준비, 이제 AI와 함께
          </h1>
          <p className="mt-4 text-lg text-zinc-400">
            당신에게 맞는 플랜을 선택하고 완벽한 면접을 준비하세요
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="mt-12 flex items-center justify-center gap-4">
          <span
            className={`text-sm font-medium ${
              billingCycle === 'MONTHLY' ? 'text-white' : 'text-zinc-500'
            }`}
          >
            월간 결제
          </span>
          <button
            onClick={() =>
              setBillingCycle(billingCycle === 'MONTHLY' ? 'YEARLY' : 'MONTHLY')
            }
            className="relative inline-flex h-6 w-11 items-center rounded-full bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
            role="switch"
            aria-checked={billingCycle === 'YEARLY'}
          >
            <span
              className={`${
                billingCycle === 'YEARLY' ? 'translate-x-6' : 'translate-x-1'
              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />
          </button>
          <span
            className={`text-sm font-medium ${
              billingCycle === 'YEARLY' ? 'text-white' : 'text-zinc-500'
            }`}
          >
            연간 결제
          </span>
          {billingCycle === 'YEARLY' && (
            <span className="ml-2 rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400">
              {discount}% 할인
            </span>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:gap-12">
          {/* FREE Plan */}
          <div className="relative flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl">
            <div className="flex-1">
              <h2 className="text-2xl font-bold">FREE</h2>
              <p className="mt-4 text-zinc-400">면접 연습을 시작하는 분들을 위한 기본 플랜</p>
              <div className="mt-6">
                <span className="text-5xl font-bold">₩0</span>
                <span className="text-zinc-400">/월</span>
              </div>
              <ul className="mt-8 space-y-4">
                {freeFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckIcon className="h-6 w-6 flex-shrink-0 text-zinc-500" />
                    <span className="text-zinc-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              disabled
              className="mt-8 w-full rounded-lg bg-zinc-800 px-6 py-3 text-sm font-semibold text-zinc-500 cursor-not-allowed"
            >
              현재 플랜
            </button>
          </div>

          {/* PRO Plan */}
          <div className="relative flex flex-col rounded-2xl border-2 border-blue-500 bg-gradient-to-b from-zinc-900 to-zinc-950 p-8 shadow-xl">
            {/* Popular Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="rounded-full bg-blue-500 px-4 py-1 text-xs font-bold uppercase text-white">
                인기
              </span>
            </div>

            <div className="flex-1">
              <h2 className="text-2xl font-bold">PRO</h2>
              <p className="mt-4 text-zinc-400">
                진지하게 면접을 준비하는 분들을 위한 프리미엄 플랜
              </p>
              <div className="mt-6">
                {billingCycle === 'MONTHLY' ? (
                  <>
                    <span className="text-5xl font-bold">
                      ₩{monthlyPrice.toLocaleString()}
                    </span>
                    <span className="text-zinc-400">/월</span>
                  </>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold">
                        ₩{yearlyMonthly.toLocaleString()}
                      </span>
                      <span className="text-zinc-400">/월</span>
                    </div>
                    <div className="mt-2 text-sm text-zinc-500">
                      연간 ₩{yearlyPrice.toLocaleString()} 일시불
                    </div>
                  </>
                )}
              </div>
              <ul className="mt-8 space-y-4">
                {proFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckIcon className="h-6 w-6 flex-shrink-0 text-blue-500" />
                    <span className="text-zinc-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={handleSubscribe}
              disabled={isLoading}
              className="mt-8 w-full rounded-lg bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? '처리 중...' : '시작하기'}
            </button>
          </div>
        </div>

        {/* Feature Comparison */}
        <div className="mt-16">
          <button
            onClick={() => setExpandedFeatures(!expandedFeatures)}
            className="mx-auto flex items-center gap-2 text-lg font-semibold text-zinc-300 hover:text-white transition-colors"
          >
            <span>상세 기능 비교</span>
            <svg
              className={`h-5 w-5 transform transition-transform ${
                expandedFeatures ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {expandedFeatures && (
            <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
              <table className="w-full">
                <thead className="bg-zinc-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">기능</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">FREE</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">PRO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {comparisonFeatures.map((feature, index) => (
                    <tr key={index} className="transition-colors hover:bg-zinc-800/50">
                      <td className="px-6 py-4 text-sm text-zinc-300">
                        {feature.name}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-zinc-400">
                        {feature.free}
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-blue-400">
                        {feature.pro}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-16 text-center">
          <p className="text-sm text-zinc-500">
            모든 플랜은 언제든지 업그레이드 또는 취소할 수 있습니다.
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            궁금한 점이 있으신가요?{' '}
            <a href="mailto:support@interview-bot.com" className="text-blue-400 hover:text-blue-300">
              고객 지원팀에 문의하세요
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
