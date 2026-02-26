'use client';

import { useEffect, useState, useCallback } from 'react';

interface PowerUser {
  id: string;
  email: string;
  name: string | null;
  signupDate: string;
  lastActive: string | null;
  signupSource: string | null;
  aiConsent: boolean;
  totalSessions: number;
  avgScore: number;
  totalQuestions: number;
  avgDuration: number;
  sessionsPerWeek: number;
}

interface PowerUserSummary {
  total: number;
  avgSessionsPerUser: number;
  avgScoreOverall: number;
  withAiConsent: number;
  withProfile: number;
}

interface PowerUsersResponse {
  powerUsers: PowerUser[];
  summary: PowerUserSummary;
}

export default function AdminPowerUsersPage() {
  const [data, setData] = useState<PowerUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [minSessions, setMinSessions] = useState(10);
  const [period, setPeriod] = useState(30);

  const fetchPowerUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        minSessions: minSessions.toString(),
        period: period.toString(),
      });
      const res = await fetch(`/api/admin/power-users?${params}`);
      const responseData = await res.json();
      if (res.ok) {
        setData(responseData);
      } else {
        console.error('Failed to fetch power users:', responseData.error);
      }
    } catch (err) {
      console.error('Error fetching power users:', err);
    } finally {
      setLoading(false);
    }
  }, [minSessions, period]);

  useEffect(() => {
    fetchPowerUsers();
  }, [fetchPowerUsers]);

  const handleExportCSV = () => {
    if (!data || data.powerUsers.length === 0) return;

    const headers = [
      '이메일',
      '이름',
      '가입일',
      '마지막 활동',
      '가입 경로',
      'AI 동의',
      '세션 수',
      '평균 점수',
      '총 질문 수',
      '평균 세션 시간(초)',
      '주간 세션 수',
    ];

    const rows = data.powerUsers.map((user) => [
      user.email,
      user.name || '',
      new Date(user.signupDate).toLocaleDateString('ko-KR'),
      user.lastActive ? new Date(user.lastActive).toLocaleDateString('ko-KR') : '',
      user.signupSource || '',
      user.aiConsent ? '동의' : '미동의',
      user.totalSessions.toString(),
      user.avgScore.toString(),
      user.totalQuestions.toString(),
      user.avgDuration.toString(),
      user.sessionsPerWeek.toString(),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `power-users-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getScoreColorClass = (score: number): string => {
    if (score >= 8) return 'text-green-400';
    if (score >= 6) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">파워 유저</h1>
        <button
          onClick={handleExportCSV}
          disabled={!data || data.powerUsers.length === 0}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          CSV 내보내기
        </button>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard label="파워 유저 수" value={data.summary.total.toString()} />
          <SummaryCard
            label="평균 세션 수"
            value={data.summary.avgSessionsPerUser.toFixed(1)}
          />
          <SummaryCard
            label="평균 점수"
            value={data.summary.avgScoreOverall.toFixed(2)}
          />
          <SummaryCard
            label="AI 동의율"
            value={
              data.summary.total > 0
                ? `${((data.summary.withAiConsent / data.summary.total) * 100).toFixed(1)}%`
                : '0%'
            }
          />
        </div>
      )}

      {/* Filter Controls */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              최소 세션 수
            </label>
            <input
              type="number"
              value={minSessions}
              onChange={(e) => setMinSessions(parseInt(e.target.value, 10) || 1)}
              min="1"
              max="1000"
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-zinc-400 mb-2">기간</label>
            <select
              value={period}
              onChange={(e) => setPeriod(parseInt(e.target.value, 10))}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7">7일</option>
              <option value="14">14일</option>
              <option value="30">30일</option>
              <option value="60">60일</option>
              <option value="90">90일</option>
            </select>
          </div>
          <button
            onClick={fetchPowerUsers}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            조회
          </button>
        </div>
      </div>

      {/* User Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-100" />
        </div>
      ) : data && data.powerUsers.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full">
            <thead className="bg-zinc-800/50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">
                  이메일
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">
                  이름
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">
                  가입일
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">
                  마지막 활동
                </th>
                <th className="text-center px-4 py-3 text-sm font-medium text-zinc-400">
                  세션 수
                </th>
                <th className="text-center px-4 py-3 text-sm font-medium text-zinc-400">
                  평균 점수
                </th>
                <th className="text-center px-4 py-3 text-sm font-medium text-zinc-400">
                  주간 세션
                </th>
                <th className="text-center px-4 py-3 text-sm font-medium text-zinc-400">
                  AI 동의
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {data.powerUsers.map((user) => (
                <tr key={user.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3 text-sm text-zinc-300">{user.email}</td>
                  <td className="px-4 py-3 text-sm text-zinc-300">{user.name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-zinc-500">
                    {new Date(user.signupDate).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-500">
                    {user.lastActive
                      ? new Date(user.lastActive).toLocaleDateString('ko-KR')
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-300 text-center font-medium">
                    {user.totalSessions}
                  </td>
                  <td
                    className={`px-4 py-3 text-sm text-center font-medium ${getScoreColorClass(
                      user.avgScore
                    )}`}
                  >
                    {user.avgScore.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-300 text-center">
                    {user.sessionsPerWeek.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {user.aiConsent ? (
                      <svg
                        className="w-5 h-5 mx-auto text-green-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5 mx-auto text-red-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-zinc-500">
          조건에 맞는 파워 유저가 없습니다.
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
      <div className="text-sm text-zinc-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-zinc-100">{value}</div>
    </div>
  );
}
