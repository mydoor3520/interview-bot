'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

interface Session {
  id: string;
  topics: string[];
  difficulty: string;
  status: string;
  totalScore: number | null;
  startedAt: string;
  completedAt: string | null;
  _count: { questions: number };
  targetPosition?: { company: string; position: string } | null;
}

interface HistoryResponse {
  sessions: Session[];
  total: number;
  page: number;
  totalPages: number;
}

const DIFFICULTIES = {
  junior: '주니어',
  mid: '미드',
  senior: '시니어',
};

const STATUS_MAP = {
  completed: '완료',
  in_progress: '진행중',
  abandoned: '중단됨',
};

export default function HistoryPage() {
  const router = useRouter();
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Filters
  const [page, setPage] = useState(1);
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', '20');
    if (topic) params.set('topic', topic);
    if (difficulty) params.set('difficulty', difficulty);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (minScore) params.set('minScore', minScore);
    if (maxScore) params.set('maxScore', maxScore);

    try {
      const res = await fetch(`/api/history?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  }, [page, topic, difficulty, dateFrom, dateTo, minScore, maxScore]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleDelete = async (id: string) => {
    if (!confirm('이 세션을 삭제하시겠습니까?')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/history?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchSessions();
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    } finally {
      setDeleting(null);
    }
  };

  const resetFilters = () => {
    setTopic('');
    setDifficulty('');
    setDateFrom('');
    setDateTo('');
    setMinScore('');
    setMaxScore('');
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">면접 기록</h1>
          <button
            onClick={() => router.push('/interview')}
            className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors"
          >
            새 면접 시작
          </button>
        </div>

        {/* Filters */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">주제</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="주제 검색"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">난이도</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white"
              >
                <option value="">전체</option>
                <option value="junior">주니어</option>
                <option value="mid">미드</option>
                <option value="senior">시니어</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">점수 범위</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={minScore}
                  onChange={(e) => setMinScore(e.target.value)}
                  placeholder="최소"
                  min="0"
                  max="10"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white"
                />
                <input
                  type="number"
                  value={maxScore}
                  onChange={(e) => setMaxScore(e.target.value)}
                  placeholder="최대"
                  min="0"
                  max="10"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">시작일</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">종료일</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white"
              />
            </div>
          </div>

          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-zinc-800 text-white rounded-lg text-sm hover:bg-zinc-700 transition-colors"
          >
            필터 초기화
          </button>
        </div>

        {/* Sessions List */}
        {loading ? (
          <div className="text-center text-zinc-400 py-12">로딩 중...</div>
        ) : !data || data.sessions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-400 mb-4">면접 기록이 없습니다.</p>
            <button
              onClick={() => router.push('/interview')}
              className="px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors"
            >
              첫 면접 시작하기
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 mb-6">
              {data.sessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {new Date(session.startedAt).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </h3>
                        <span
                          className={cn(
                            'px-2 py-1 rounded text-xs font-medium',
                            session.status === 'completed' && 'bg-green-500/10 text-green-400',
                            session.status === 'in_progress' && 'bg-yellow-500/10 text-yellow-400',
                            session.status === 'abandoned' && 'bg-red-500/10 text-red-400'
                          )}
                        >
                          {STATUS_MAP[session.status as keyof typeof STATUS_MAP]}
                        </span>
                        <span className="px-2 py-1 bg-zinc-800 rounded text-xs font-medium text-zinc-300">
                          {DIFFICULTIES[session.difficulty as keyof typeof DIFFICULTIES]}
                        </span>
                      </div>

                      {session.targetPosition && (
                        <p className="text-sm text-zinc-400 mb-2">
                          {session.targetPosition.company} - {session.targetPosition.position}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 mb-3">
                        {session.topics.map((t, i) => (
                          <span key={i} className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-300">
                            {t}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-zinc-400">
                        <span>질문 {session._count.questions}개</span>
                        {session.totalScore !== null && (
                          <span className="font-medium text-white">
                            평균 점수: {session.totalScore.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/history/${session.id}`)}
                        className="px-4 py-2 bg-zinc-800 text-white rounded-lg text-sm hover:bg-zinc-700 transition-colors"
                      >
                        상세보기
                      </button>
                      <button
                        onClick={() => handleDelete(session.id)}
                        disabled={deleting === session.id}
                        className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg text-sm hover:bg-red-500/20 transition-colors disabled:opacity-50"
                      >
                        {deleting === session.id ? '삭제 중...' : '삭제'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-zinc-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
                >
                  이전
                </button>
                <span className="text-zinc-400">
                  {page} / {data.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                  className="px-4 py-2 bg-zinc-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
