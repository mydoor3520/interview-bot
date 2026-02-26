'use client';

import { useEffect, useState } from 'react';
import { StatCard } from '@/components/admin/StatCard';

interface KPIValue {
  value: number;
  trend: 'up' | 'down' | 'neutral';
  previousValue: number;
}

interface DashboardData {
  operations: {
    activeUsersToday: KPIValue;
    interviewsToday: KPIValue;
    aiCostToday: KPIValue;
    errorRateToday: KPIValue;
  };
  business: {
    mrr: KPIValue;
    newSignupsThisWeek: KPIValue;
    conversionRate: KPIValue;
    churnRate: KPIValue;
    dauMauRatio: KPIValue;
  };
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch('/api/admin/dashboard');
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError('데이터를 불러올 수 없습니다.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">대시보드</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-zinc-800 rounded w-20 mb-2" />
              <div className="h-8 bg-zinc-800 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-red-400">{error || '알 수 없는 오류가 발생했습니다.'}</p>
      </div>
    );
  }

  // Format helpers
  const formatCurrency = (v: string | number) => `₩${Number(v).toLocaleString()}`;
  const formatPercent = (v: string | number) => `${v}%`;
  const trendLabel = (current: number, previous: number) => {
    if (previous === 0) return '';
    const diff = current - previous;
    return diff > 0 ? `+${diff}` : `${diff}`;
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">대시보드</h1>

      {/* Operations KPIs */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-300 mb-4">운영 지표</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="오늘 활성 사용자"
            value={data.operations.activeUsersToday.value}
            trend={data.operations.activeUsersToday.trend}
            trendLabel={trendLabel(data.operations.activeUsersToday.value, data.operations.activeUsersToday.previousValue)}
            subtitle="어제 대비"
          />
          <StatCard
            title="오늘 면접 세션"
            value={data.operations.interviewsToday.value}
            trend={data.operations.interviewsToday.trend}
            trendLabel={trendLabel(data.operations.interviewsToday.value, data.operations.interviewsToday.previousValue)}
            subtitle="어제 대비"
          />
          <StatCard
            title="오늘 AI 비용"
            value={data.operations.aiCostToday.value}
            formatValue={formatCurrency}
            trend={data.operations.aiCostToday.trend}
            subtitle="어제 대비"
          />
          <StatCard
            title="오늘 오류율"
            value={data.operations.errorRateToday.value}
            formatValue={formatPercent}
            trend={data.operations.errorRateToday.trend}
            subtitle="낮을수록 좋음"
          />
        </div>
      </div>

      {/* Business KPIs */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-300 mb-4">비즈니스 지표</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="MRR"
            value={data.business.mrr.value}
            formatValue={formatCurrency}
            trend={data.business.mrr.trend}
            subtitle="월간 반복 수익"
          />
          <StatCard
            title="이번 주 가입"
            value={data.business.newSignupsThisWeek.value}
            trend={data.business.newSignupsThisWeek.trend}
            trendLabel={trendLabel(data.business.newSignupsThisWeek.value, data.business.newSignupsThisWeek.previousValue)}
            subtitle="지난주 대비"
          />
          <StatCard
            title="전환율"
            value={data.business.conversionRate.value}
            formatValue={formatPercent}
            subtitle="FREE → PRO"
          />
          <StatCard
            title="이탈률"
            value={data.business.churnRate.value}
            formatValue={formatPercent}
            subtitle="구독 해지"
          />
          <StatCard
            title="DAU/MAU"
            value={data.business.dauMauRatio.value}
            formatValue={formatPercent}
            subtitle="사용자 활성도"
          />
        </div>
      </div>
    </div>
  );
}
