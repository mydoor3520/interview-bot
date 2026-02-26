'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface AnalyticsData {
  tier: 'FREE' | 'PRO';
  totalSessions: number;
  averageScore: number;
  recentSessions: {
    id: string;
    topics: string[];
    completedAt: string;
    questionCount: number;
    averageScore: number;
  }[];
  // Pro-only fields
  topicPerformance?: { topic: string; averageScore: number; questionCount: number }[];
  progressOverTime?: { date: string; score: number; sessionId: string }[];
  weakAreas?: { topic: string; score: number; questions: number }[];
  strengths?: { topic: string; score: number; questions: number }[];
  radarChart?: { subject: string; score: number; fullMark: number }[];
  recommendations?: { topic: string; reason: string; action: string }[];
}

function StatCard({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="text-sm text-zinc-400">{title}</div>
      <div className="mt-2 text-3xl font-bold text-zinc-100">{value}</div>
      {subtitle && <div className="mt-1 text-xs text-zinc-500">{subtitle}</div>}
    </div>
  );
}

function BarChart({ data, maxValue = 10 }: { data: { label: string; value: number }[]; maxValue?: number }) {
  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-32 text-sm text-zinc-400 truncate" title={item.label}>{item.label}</div>
          <div className="flex-1 h-6 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((item.value / maxValue) * 100, 100)}%` }}
            />
          </div>
          <div className="w-12 text-right text-sm font-medium text-zinc-300">
            {item.value.toFixed(1)}
          </div>
        </div>
      ))}
    </div>
  );
}

function ScoreTimeline({ data }: { data: { date: string; score: number }[] }) {
  if (data.length === 0) return <p className="text-zinc-500 text-sm">데이터가 없습니다.</p>;

  const maxScore = 10;
  const chartHeight = 200;

  return (
    <div className="relative" style={{ height: chartHeight + 40 }}>
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-zinc-500 pr-2">
        <span>10</span>
        <span>5</span>
        <span>0</span>
      </div>
      {/* Chart area */}
      <div className="ml-8 flex items-end gap-1 h-[200px]">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full max-w-[40px] bg-blue-500 rounded-t transition-all duration-500 hover:bg-blue-400"
              style={{ height: `${(d.score / maxScore) * chartHeight}px` }}
              title={`${d.date}: ${d.score}점`}
            />
          </div>
        ))}
      </div>
      {/* X-axis labels */}
      <div className="ml-8 flex gap-1 mt-2">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            <span className="text-[10px] text-zinc-500">
              {data.length <= 10 ? d.date.slice(5) : (i % Math.ceil(data.length / 5) === 0 ? d.date.slice(5) : '')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/analytics')
      .then(res => {
        if (!res.ok) throw new Error('분석 데이터를 불러오는데 실패했습니다.');
        return res.json();
      })
      .then(d => setData(d))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-100" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || '데이터를 불러올 수 없습니다.'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const isPro = data.tier === 'PRO';
  const bestScore = data.progressOverTime && data.progressOverTime.length > 0
    ? Math.max(...data.progressOverTime.map(p => p.score))
    : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">면접 분석</h1>
          <p className="mt-2 text-zinc-400">
            통계 대시보드
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
          <StatCard title="총 세션" value={data.totalSessions} />
          <StatCard title="평균 점수" value={data.averageScore > 0 ? data.averageScore.toFixed(1) : '-'} subtitle="/ 10" />
          {isPro && (
            <>
              <StatCard title="최고 점수" value={bestScore > 0 ? bestScore.toFixed(1) : '-'} subtitle="/ 10" />
              <StatCard
                title="취약 분야"
                value={data.weakAreas?.[0]?.topic || '-'}
                subtitle={data.weakAreas?.[0] ? `${data.weakAreas[0].score.toFixed(1)}점` : undefined}
              />
            </>
          )}
          {!isPro && (
            <>
              <StatCard title="최근 세션" value={data.recentSessions.length} subtitle="개" />
              <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-6 flex flex-col justify-center items-center">
                <div className="text-sm text-blue-400 mb-2">상세 분석</div>
                <Link href="/pricing" className="text-xs text-blue-300 hover:text-blue-200 underline">
                  PRO 업그레이드
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Pro: Score Timeline */}
        {isPro && data.progressOverTime && data.progressOverTime.length > 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 mb-8">
            <h2 className="text-xl font-semibold mb-6">점수 추이</h2>
            <ScoreTimeline data={data.progressOverTime} />
          </div>
        )}

        {/* Pro: Topic Performance + Weak Areas */}
        {isPro && (
          <div className="grid gap-8 md:grid-cols-2 mb-8">
            {data.topicPerformance && data.topicPerformance.length > 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-xl font-semibold mb-6">토픽별 성과</h2>
                <BarChart
                  data={data.topicPerformance.map(t => ({ label: t.topic, value: t.averageScore }))}
                />
              </div>
            )}

            {data.strengths && data.strengths.length > 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-xl font-semibold mb-6">강점 분야</h2>
                <div className="space-y-3">
                  {data.strengths.map((s, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-zinc-300">{i + 1}. {s.topic}</span>
                      <span className="text-green-400 font-medium">{s.score.toFixed(1)}점</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pro: Recommendations */}
        {isPro && data.recommendations && data.recommendations.length > 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 mb-8">
            <h2 className="text-xl font-semibold mb-6">추천 학습 영역</h2>
            <div className="space-y-4">
              {data.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-lg bg-zinc-800/50">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <span className="text-blue-400 text-sm font-bold">{i + 1}</span>
                  </div>
                  <div>
                    <div className="font-medium text-zinc-200">{rec.topic}</div>
                    <div className="text-sm text-zinc-400 mt-1">{rec.reason}</div>
                    <div className="text-sm text-blue-400 mt-1">{rec.action}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Sessions */}
        {data.recentSessions.length > 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-xl font-semibold mb-6">최근 세션</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-3 text-sm font-medium text-zinc-400">날짜</th>
                    <th className="text-left py-3 text-sm font-medium text-zinc-400">주제</th>
                    <th className="text-right py-3 text-sm font-medium text-zinc-400">질문 수</th>
                    <th className="text-right py-3 text-sm font-medium text-zinc-400">평균 점수</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentSessions.map(s => (
                    <tr key={s.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3 text-sm text-zinc-300">
                        {s.completedAt ? new Date(s.completedAt).toLocaleDateString('ko-KR') : '-'}
                      </td>
                      <td className="py-3 text-sm text-zinc-300">
                        {s.topics.slice(0, 3).join(', ')}
                        {s.topics.length > 3 && ` +${s.topics.length - 3}`}
                      </td>
                      <td className="py-3 text-sm text-zinc-300 text-right">{s.questionCount}</td>
                      <td className="py-3 text-sm text-right font-medium text-zinc-100">
                        {s.averageScore > 0 ? s.averageScore.toFixed(1) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
