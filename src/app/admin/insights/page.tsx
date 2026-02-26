'use client';

import { useEffect, useState } from 'react';

interface InsightsData {
  popularTopics: Array<{ topic: string; count: number }>;
  topicScores: Array<{ topic: string; avgScore: number; count: number }>;
  weaknessPatterns: Array<{ topic: string; avgScore: number; count: number }>;
  engagement: {
    totalUsers: number;
    verifiedUsers: number;
    profileUsers: number;
    aiConsentUsers: number;
    completionRate: number;
    avgSessionDuration: number;
    avgUserRating: number;
    surveyResponseRate: number;
  };
  signupSources: Array<{ source: string; count: number }>;
  companyDemand: Array<{ company: string; count: number; positions: string[] }>;
}

export default function AdminInsightsPage() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/admin/insights');
        if (!res.ok) throw new Error('Failed to fetch insights');
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : '데이터를 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-100" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400">{error || '데이터를 불러올 수 없습니다.'}</p>
      </div>
    );
  }

  const profileRate = data.engagement.totalUsers > 0
    ? (data.engagement.profileUsers / data.engagement.totalUsers) * 100
    : 0;

  // Merge topic popularity with scores
  const topicsWithScores = data.popularTopics.map((pop) => {
    const scoreData = data.topicScores.find((s) => s.topic === pop.topic);
    return {
      topic: pop.topic,
      count: pop.count,
      avgScore: scoreData?.avgScore || 0,
    };
  });

  const maxCount = Math.max(...topicsWithScores.map((t) => t.count), 1);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-zinc-100">데이터 인사이트</h1>

      {/* Row 1: Engagement Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="총 사용자 / 인증 사용자"
          value={`${data.engagement.totalUsers} / ${data.engagement.verifiedUsers}`}
          subtext={`${Math.round((data.engagement.verifiedUsers / Math.max(data.engagement.totalUsers, 1)) * 100)}% 인증됨`}
        />
        <MetricCard
          label="프로필 작성률"
          value={`${Math.round(profileRate)}%`}
          subtext={`${data.engagement.profileUsers}명이 프로필 작성`}
        />
        <MetricCard
          label="세션 완료율"
          value={`${data.engagement.completionRate}%`}
          subtext="완료된 세션 비율"
        />
        <MetricCard
          label="평균 만족도"
          value={`${data.engagement.avgUserRating} / 5`}
          subtext={`응답률: ${data.engagement.surveyResponseRate}%`}
        />
      </div>

      {/* Row 2: Popular Topics with Scores */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">인기 주제 (평균 점수 포함)</h2>
        <div className="space-y-3">
          {topicsWithScores.slice(0, 15).map((item) => {
            const widthPercent = (item.count / maxCount) * 100;
            return (
              <div key={item.topic} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-300">{item.topic}</span>
                  <div className="flex gap-3 text-zinc-500">
                    <span>{item.count}회</span>
                    {item.avgScore > 0 && (
                      <span className={item.avgScore >= 7 ? 'text-green-400' : item.avgScore >= 5 ? 'text-yellow-400' : 'text-red-400'}>
                        평균 {item.avgScore}점
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-300"
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 3: Weakness Patterns */}
      {data.weaknessPatterns.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-2">약점 패턴 (낮은 점수 주제)</h2>
          <p className="text-sm text-zinc-500 mb-4">
            이 주제들의 질문 품질을 개선하면 사용자 만족도가 올라갈 수 있습니다
          </p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-zinc-800">
                <tr>
                  <th className="text-left py-2 px-3 text-sm font-medium text-zinc-400">주제</th>
                  <th className="text-center py-2 px-3 text-sm font-medium text-zinc-400">평균 점수</th>
                  <th className="text-center py-2 px-3 text-sm font-medium text-zinc-400">평가 수</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {data.weaknessPatterns.map((item) => (
                  <tr key={item.topic} className="hover:bg-zinc-800/30">
                    <td className="py-2 px-3 text-sm text-zinc-300">{item.topic}</td>
                    <td className="py-2 px-3 text-sm text-center">
                      <span className="inline-flex px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">
                        {item.avgScore}점
                      </span>
                    </td>
                    <td className="py-2 px-3 text-sm text-zinc-400 text-center">{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Row 4: Signup Sources */}
      {data.signupSources.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">가입 유입 경로</h2>
          <div className="space-y-2">
            {data.signupSources.map((item) => {
              const total = data.signupSources.reduce((sum, s) => sum + s.count, 0);
              const percent = total > 0 ? (item.count / total) * 100 : 0;
              return (
                <div key={item.source} className="flex justify-between items-center text-sm">
                  <span className="text-zinc-300">{item.source}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-zinc-800 rounded-full h-2">
                      <div
                        className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-zinc-500 w-16 text-right">
                      {item.count}명 ({Math.round(percent)}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Row 5: Company Demand */}
      {data.companyDemand.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">회사/포지션 수요</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-zinc-800">
                <tr>
                  <th className="text-left py-2 px-3 text-sm font-medium text-zinc-400">회사</th>
                  <th className="text-center py-2 px-3 text-sm font-medium text-zinc-400">등록 수</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-zinc-400">주요 포지션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {data.companyDemand.map((item) => (
                  <tr key={item.company} className="hover:bg-zinc-800/30">
                    <td className="py-2 px-3 text-sm text-zinc-300 font-medium">{item.company}</td>
                    <td className="py-2 px-3 text-sm text-zinc-400 text-center">{item.count}</td>
                    <td className="py-2 px-3 text-sm text-zinc-500">
                      {item.positions.slice(0, 3).join(', ')}
                      {item.positions.length > 3 && ` 외 ${item.positions.length - 3}개`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, subtext }: { label: string; value: string; subtext: string }) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
      <div className="text-sm text-zinc-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-zinc-100 mb-1">{value}</div>
      <div className="text-xs text-zinc-600">{subtext}</div>
    </div>
  );
}
