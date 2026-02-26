'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils/cn';

interface TopicBreakdown {
  topic: string;
  userAvg: number;
  cohortAvg: number;
  percentile: number;
}

interface BenchmarkData {
  topic: string | null;
  userScore: number;
  cohortAvg: number;
  cohortSize: number;
  experienceBracket: string;
  percentile: number;
  insufficient_data: boolean;
  topicBreakdown?: TopicBreakdown[];
  message?: string;
}

function getMotivationalMessage(percentile: number): string {
  if (percentile >= 80) return '뛰어난 실력입니다! 계속 유지하세요.';
  if (percentile >= 60) return '평균 이상입니다. 조금만 더 연습하면 상위권입니다!';
  if (percentile >= 40) return '괜찮은 수준입니다. 약점 주제를 집중 연습해보세요.';
  return '아직 성장 여지가 많습니다. 꾸준히 연습하면 빠르게 오를 수 있어요!';
}

export default function Benchmark() {
  const [data, setData] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBenchmark = async () => {
      try {
        const res = await fetch('/api/benchmark');
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (error) {
        console.error('Failed to fetch benchmark:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBenchmark();
  }, []);

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-zinc-800 rounded w-1/3 mb-4" />
          <div className="h-4 bg-zinc-800 rounded w-1/2 mb-6" />
          <div className="h-32 bg-zinc-800 rounded" />
        </div>
      </div>
    );
  }

  if (!data || data.insufficient_data) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-2">면접 벤치마크</h2>
        <p className="text-sm text-zinc-400 mb-6">같은 경력대 개발자와 비교</p>
        
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-20 h-20 mb-4 text-zinc-700">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <p className="text-zinc-300 text-center max-w-md">
            {data?.message || '아직 비교 데이터가 부족합니다. 더 많은 사용자가 참여하면 벤치마크가 활성화됩니다.'}
          </p>
          {data?.experienceBracket && (
            <p className="text-zinc-500 text-sm mt-2">
              경력대: {data.experienceBracket}
            </p>
          )}
        </div>
      </div>
    );
  }

  const motivationalMessage = getMotivationalMessage(data.percentile);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">면접 벤치마크</h2>
          <p className="text-sm text-zinc-400">같은 경력대 개발자와 비교</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500">경력대: {data.experienceBracket}</p>
          <p className="text-xs text-zinc-500">비교 대상: {data.cohortSize}명</p>
        </div>
      </div>

      {/* Main Percentile */}
      <div className="mb-6 p-6 bg-gradient-to-br from-blue-950/30 to-purple-950/30 border border-blue-900/30 rounded-lg">
        <p className="text-sm text-zinc-400 mb-2">전체 순위</p>
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold text-blue-400">
            상위 {100 - data.percentile}%
          </span>
        </div>
        <p className="text-sm text-zinc-300 mt-3">{motivationalMessage}</p>
      </div>

      {/* Topic Breakdown */}
      {data.topicBreakdown && data.topicBreakdown.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white mb-4">주제별 비교</h3>
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {data.topicBreakdown.map((topic) => (
              <div key={topic.topic} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white font-medium">{topic.topic}</span>
                  <span
                    className={cn(
                      'text-xs font-semibold px-2 py-1 rounded',
                      topic.percentile >= 80
                        ? 'bg-green-500/20 text-green-400'
                        : topic.percentile >= 60
                        ? 'bg-blue-500/20 text-blue-400'
                        : topic.percentile >= 40
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                    )}
                  >
                    상위 {100 - topic.percentile}%
                  </span>
                </div>

                {/* Comparison Bars */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 w-16">내 점수</span>
                    <div className="flex-1 h-6 bg-zinc-800 rounded-md overflow-hidden relative">
                      <div
                        className={cn(
                          'h-full transition-all',
                          topic.userAvg >= 8
                            ? 'bg-green-500'
                            : topic.userAvg >= 6
                            ? 'bg-blue-500'
                            : topic.userAvg >= 4
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        )}
                        style={{ width: `${(topic.userAvg / 10) * 100}%` }}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-white">
                        {topic.userAvg.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 w-16">평균</span>
                    <div className="flex-1 h-6 bg-zinc-800 rounded-md overflow-hidden relative">
                      <div
                        className="h-full bg-zinc-600 transition-all"
                        style={{ width: `${(topic.cohortAvg / 10) * 100}%` }}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-300">
                        {topic.cohortAvg.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
