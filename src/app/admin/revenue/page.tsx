'use client';

import { useEffect, useState } from 'react';

interface RevenueData {
  mrr: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  paymentsThisMonth: number;
  newSubscriptions: number;
  canceledSubscriptions: number;
  totalActiveSubscriptions: number;
  churnRate: number;
  conversionRate: number;
  usersByTier: Record<string, number>;
  totalUsers: number;
}

function StatCard({ title, value, subtitle, trend }: {
  title: string;
  value: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="text-sm text-zinc-400">{title}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-zinc-100">{value}</span>
        {trend && (
          <span className={`text-xs font-medium ${
            trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-zinc-500'
          }`}>
            {trend === 'up' ? '\u2191' : trend === 'down' ? '\u2193' : '\u2014'}
          </span>
        )}
      </div>
      {subtitle && <div className="mt-1 text-xs text-zinc-500">{subtitle}</div>}
    </div>
  );
}

export default function AdminRevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/revenue')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-100" />
      </div>
    );
  }

  if (!data) return <p className="text-red-400">데이터를 불러올 수 없습니다.</p>;

  const formatKRW = (amount: number) =>
    new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);

  const revenueChange = data.revenueLastMonth > 0
    ? ((data.revenueThisMonth - data.revenueLastMonth) / data.revenueLastMonth * 100)
    : 0;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-zinc-100">매출 대시보드</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="MRR (월간 반복 매출)"
          value={formatKRW(data.mrr)}
        />
        <StatCard
          title="이번 달 매출"
          value={formatKRW(data.revenueThisMonth)}
          subtitle={`전월 대비 ${revenueChange >= 0 ? '+' : ''}${revenueChange.toFixed(1)}%`}
          trend={revenueChange > 0 ? 'up' : revenueChange < 0 ? 'down' : 'neutral'}
        />
        <StatCard
          title="전환율"
          value={`${data.conversionRate}%`}
          subtitle={`PRO ${data.usersByTier.PRO || 0}명 / 전체 ${data.totalUsers}명`}
        />
        <StatCard
          title="해지율"
          value={`${data.churnRate}%`}
          subtitle={`이번 달 ${data.canceledSubscriptions}건 해지`}
          trend={data.churnRate > 5 ? 'down' : 'neutral'}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">구독 현황</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-zinc-400">활성 구독</span>
              <span className="text-zinc-100 font-medium">{data.totalActiveSubscriptions}건</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">이번 달 신규</span>
              <span className="text-green-400 font-medium">+{data.newSubscriptions}건</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">이번 달 해지</span>
              <span className="text-red-400 font-medium">-{data.canceledSubscriptions}건</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">이번 달 결제 건수</span>
              <span className="text-zinc-100 font-medium">{data.paymentsThisMonth}건</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">사용자 분포</h2>
          <div className="space-y-3">
            {Object.entries(data.usersByTier).map(([tier, count]) => (
              <div key={tier} className="flex items-center gap-3">
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                  tier === 'PRO' ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-700 text-zinc-400'
                }`}>
                  {tier}
                </span>
                <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${tier === 'PRO' ? 'bg-blue-500' : 'bg-zinc-600'}`}
                    style={{ width: `${data.totalUsers > 0 ? (count / data.totalUsers) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm text-zinc-300 w-16 text-right">{count}명</span>
              </div>
            ))}
            <div className="pt-2 border-t border-zinc-800 flex justify-between">
              <span className="text-zinc-400">전체</span>
              <span className="text-zinc-100 font-medium">{data.totalUsers}명</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
