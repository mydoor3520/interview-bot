'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { cn } from '@/lib/utils/cn';

interface Stats {
  totalSessions: number;
  totalQuestions: number;
  averageScore: number;
  topicScores: Array<{ topic: string; avgScore: number; count: number }>;
  difficultyScores: Array<{ difficulty: string; avgScore: number; count: number }>;
  recentTrend: Array<{ date: string; avgScore: number; count: number }>;
  weakTopics: Array<{ topic: string; avgScore: number }>;
  recentSessions: Array<{
    id: string;
    startedAt: string;
    difficulty: string;
    totalScore: number | null;
    _count: { questions: number };
  }>;
}

const DIFFICULTIES = {
  junior: '주니어',
  mid: '미드',
  senior: '시니어',
};

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-400">로딩 중...</div>
      </div>
    );
  }

  if (!stats || stats.totalSessions === 0) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">대시보드</h1>
          <div className="text-center py-12">
            <p className="text-zinc-400 text-lg mb-6">아직 면접 기록이 없습니다.</p>
            <button
              onClick={() => router.push('/interview')}
              className="px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors"
            >
              면접을 시작해보세요!
            </button>
          </div>
        </div>
      </div>
    );
  }

  const recentSevenDays = stats.recentTrend.slice(-7);
  const recentAvgScore = recentSevenDays.length > 0
    ? recentSevenDays.reduce((sum, item) => sum + item.avgScore, 0) / recentSevenDays.length
    : 0;

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">대시보드</h1>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h3 className="text-sm font-medium text-zinc-400 mb-2">총 세션</h3>
            <p className="text-3xl font-bold text-white">{stats.totalSessions}</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h3 className="text-sm font-medium text-zinc-400 mb-2">총 질문</h3>
            <p className="text-3xl font-bold text-white">{stats.totalQuestions}</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h3 className="text-sm font-medium text-zinc-400 mb-2">평균 점수</h3>
            <p className={cn('text-3xl font-bold',
              stats.averageScore >= 8 ? 'text-green-400' :
              stats.averageScore >= 6 ? 'text-yellow-400' :
              'text-red-400'
            )}>
              {stats.averageScore.toFixed(1)}
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h3 className="text-sm font-medium text-zinc-400 mb-2">최근 7일 세션</h3>
            <p className="text-3xl font-bold text-white">{recentSevenDays.length}</p>
            {recentSevenDays.length > 0 && (
              <p className="text-sm text-zinc-500 mt-1">
                평균 {recentAvgScore.toFixed(1)}점
              </p>
            )}
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Trend Chart */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">점수 추이 (최근 30일)</h2>
            {stats.recentTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={stats.recentTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="date"
                    stroke="#71717a"
                    tickFormatter={(date) => new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis stroke="#71717a" domain={[0, 10]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                    labelStyle={{ color: '#a1a1aa' }}
                    itemStyle={{ color: '#ffffff' }}
                  />
                  <Line type="monotone" dataKey="avgScore" stroke="#ffffff" strokeWidth={2} dot={{ fill: '#ffffff' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-zinc-400 text-center py-12">데이터가 없습니다.</p>
            )}
          </div>

          {/* Topic Scores */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">주제별 평균 점수</h2>
            {stats.topicScores.length > 0 ? (
              <div className="space-y-3 max-h-[250px] overflow-y-auto">
                {stats.topicScores.map((item) => (
                  <div key={item.topic} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-white text-sm">{item.topic}</p>
                      <p className="text-zinc-500 text-xs">{item.count}개 질문</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full',
                            item.avgScore >= 8 ? 'bg-green-400' :
                            item.avgScore >= 6 ? 'bg-yellow-400' :
                            'bg-red-400'
                          )}
                          style={{ width: `${(item.avgScore / 10) * 100}%` }}
                        />
                      </div>
                      <span className={cn('text-sm font-medium w-8 text-right',
                        item.avgScore >= 8 ? 'text-green-400' :
                        item.avgScore >= 6 ? 'text-yellow-400' :
                        'text-red-400'
                      )}>
                        {item.avgScore.toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-zinc-400 text-center py-12">데이터가 없습니다.</p>
            )}
          </div>
        </div>

        {/* Weak Topics & Recent Sessions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weak Topics */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">약점 주제 Top 5</h2>
            {stats.weakTopics.length > 0 ? (
              <div className="space-y-3">
                {stats.weakTopics.map((item, index) => (
                  <div key={item.topic} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </span>
                      <span className="text-white text-sm">{item.topic}</span>
                    </div>
                    <span className="text-red-400 text-sm font-medium">{item.avgScore.toFixed(1)}점</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-zinc-400 text-center py-12">약점 주제가 없습니다.</p>
            )}
            <button
              onClick={() => router.push('/review')}
              className="w-full mt-4 px-4 py-2 bg-zinc-800 text-white rounded-lg text-sm hover:bg-zinc-700 transition-colors"
            >
              복습하기
            </button>
          </div>

          {/* Recent Sessions */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">최근 면접</h2>
            {stats.recentSessions.length > 0 ? (
              <div className="space-y-3">
                {stats.recentSessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => router.push(`/history/${session.id}`)}
                    className="p-3 bg-zinc-800 rounded-lg hover:bg-zinc-750 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-white text-sm">
                        {new Date(session.startedAt).toLocaleDateString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                      <span className="text-xs px-2 py-1 bg-zinc-700 rounded text-zinc-300">
                        {DIFFICULTIES[session.difficulty as keyof typeof DIFFICULTIES]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 text-xs">{session._count.questions}개 질문</span>
                      {session.totalScore !== null && (
                        <span className={cn('text-sm font-medium',
                          session.totalScore >= 8 ? 'text-green-400' :
                          session.totalScore >= 6 ? 'text-yellow-400' :
                          'text-red-400'
                        )}>
                          {session.totalScore.toFixed(1)}점
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-zinc-400 text-center py-12">최근 면접이 없습니다.</p>
            )}
            <button
              onClick={() => router.push('/history')}
              className="w-full mt-4 px-4 py-2 bg-zinc-800 text-white rounded-lg text-sm hover:bg-zinc-700 transition-colors"
            >
              전체 기록 보기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
