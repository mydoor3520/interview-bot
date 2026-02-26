'use client';

import { useEffect, useState } from 'react';

interface Session {
  id: string;
  userId: string;
  topics: string[];
  difficulty: string;
  status: string;
  questionCount: number;
  totalScore: number | null;
  startedAt: string;
  completedAt: string | null;
  user: { email: string; name: string | null };
  _count: { questions: number };
}

interface Question {
  id: string;
  orderIndex: number;
  content: string;
  category: string;
  difficulty: string;
  status: string;
  isFollowUp: boolean;
  userAnswer: string | null;
  answeredAt: string | null;
  evaluation: {
    score: number;
    feedback: string;
    modelAnswer: string;
    strengths: string[];
    weaknesses: string[];
  } | null;
  followUps: {
    content: string;
    userAnswer: string | null;
    aiFeedback: string | null;
    orderIndex: number;
  }[];
}

interface SessionDetail {
  id: string;
  userId: string;
  topics: string[];
  difficulty: string;
  status: string;
  questionCount: number;
  totalScore: number | null;
  summary: string | null;
  startedAt: string;
  completedAt: string | null;
  user: { email: string; name: string | null; subscriptionTier: string };
  questions: Question[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Stats {
  total: number;
  avgScore: number | null;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [stats, setStats] = useState<Stats>({ total: 0, avgScore: null });
  const [loading, setLoading] = useState(true);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchSessions = async (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: page.toString(), limit: '20' });
    if (statusFilter) params.set('status', statusFilter);
    if (difficultyFilter) params.set('difficulty', difficultyFilter);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    try {
      const res = await fetch(`/api/admin/sessions?${params}`);
      const data = await res.json();
      setSessions(data.sessions);
      setPagination(data.pagination);
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionDetail = async (sessionId: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}`);
      const data = await res.json();
      setSessionDetail(data.session);
    } catch (err) {
      console.error('Failed to fetch session detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [statusFilter, difficultyFilter, startDate, endDate]);

  const handleRowClick = (sessionId: string) => {
    if (expandedSessionId === sessionId) {
      setExpandedSessionId(null);
      setSessionDetail(null);
    } else {
      setExpandedSessionId(sessionId);
      fetchSessionDetail(sessionId);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      in_progress: 'bg-yellow-500/20 text-yellow-400',
      completed: 'bg-green-500/20 text-green-400',
      abandoned: 'bg-red-500/20 text-red-400',
    };
    const labels = {
      in_progress: '진행중',
      completed: '완료',
      abandoned: '중단',
    };
    return (
      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${styles[status as keyof typeof styles] || 'bg-zinc-700 text-zinc-400'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const getDifficultyBadge = (difficulty: string) => {
    const styles = {
      junior: 'bg-green-500/20 text-green-400',
      mid: 'bg-yellow-500/20 text-yellow-400',
      senior: 'bg-red-500/20 text-red-400',
    };
    const labels = {
      junior: '초급',
      mid: '중급',
      senior: '고급',
    };
    return (
      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${styles[difficulty as keyof typeof styles] || 'bg-zinc-700 text-zinc-400'}`}>
        {labels[difficulty as keyof typeof labels] || difficulty}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-100">면접 세션 관리</h1>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
          <div className="text-sm text-zinc-400">전체 세션</div>
          <div className="text-2xl font-bold text-zinc-100 mt-1">{stats.total}</div>
        </div>
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
          <div className="text-sm text-zinc-400">평균 점수</div>
          <div className="text-2xl font-bold text-zinc-100 mt-1">
            {stats.avgScore !== null ? `${stats.avgScore}/10` : '-'}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">전체 상태</option>
          <option value="in_progress">진행중</option>
          <option value="completed">완료</option>
          <option value="abandoned">중단</option>
        </select>

        <select
          value={difficultyFilter}
          onChange={e => setDifficultyFilter(e.target.value)}
          className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">전체 난이도</option>
          <option value="junior">초급</option>
          <option value="mid">중급</option>
          <option value="senior">고급</option>
        </select>

        <input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="시작일"
        />

        <input
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="종료일"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-100" />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full">
              <thead className="bg-zinc-800/50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">사용자</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">주제</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-zinc-400">난이도</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-zinc-400">상태</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-zinc-400">점수</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-zinc-400">질문 수</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">시작일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {sessions.map(session => (
                  <>
                    <tr
                      key={session.id}
                      onClick={() => handleRowClick(session.id)}
                      className="hover:bg-zinc-800/30 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 text-sm text-zinc-300">
                        <div>{session.user.name || session.user.email}</div>
                        <div className="text-xs text-zinc-500">{session.user.email}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-300">
                        <div className="flex flex-wrap gap-1">
                          {session.topics.slice(0, 2).map((topic, idx) => (
                            <span key={idx} className="text-xs bg-zinc-700 px-2 py-0.5 rounded">
                              {topic}
                            </span>
                          ))}
                          {session.topics.length > 2 && (
                            <span className="text-xs text-zinc-500">+{session.topics.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">{getDifficultyBadge(session.difficulty)}</td>
                      <td className="px-4 py-3 text-center">{getStatusBadge(session.status)}</td>
                      <td className="px-4 py-3 text-sm text-zinc-300 text-center">
                        {session.totalScore !== null ? `${session.totalScore.toFixed(1)}/10` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-300 text-center">{session._count.questions}</td>
                      <td className="px-4 py-3 text-sm text-zinc-500">
                        {new Date(session.startedAt).toLocaleString('ko-KR')}
                      </td>
                    </tr>
                    {expandedSessionId === session.id && (
                      <tr>
                        <td colSpan={7} className="bg-zinc-900/50 px-4 py-6">
                          {loadingDetail ? (
                            <div className="flex justify-center py-8">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-zinc-400" />
                            </div>
                          ) : sessionDetail ? (
                            <div className="space-y-6">
                              {/* Session Info */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <div className="text-sm text-zinc-400">사용자</div>
                                  <div className="text-zinc-100 mt-1">
                                    {sessionDetail.user.name || sessionDetail.user.email}
                                    <span className="ml-2 text-xs text-zinc-500">
                                      ({sessionDetail.user.subscriptionTier})
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <div className="text-sm text-zinc-400">전체 주제</div>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {sessionDetail.topics.map((topic, idx) => (
                                      <span key={idx} className="text-xs bg-zinc-700 px-2 py-0.5 rounded text-zinc-300">
                                        {topic}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-sm text-zinc-400">세션 기간</div>
                                  <div className="text-zinc-100 mt-1 text-sm">
                                    {new Date(sessionDetail.startedAt).toLocaleString('ko-KR')}
                                    {sessionDetail.completedAt && (
                                      <> ~ {new Date(sessionDetail.completedAt).toLocaleString('ko-KR')}</>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Summary */}
                              {sessionDetail.summary && (
                                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                                  <div className="text-sm text-zinc-400 mb-2">세션 요약</div>
                                  <div className="text-zinc-300 text-sm whitespace-pre-wrap">
                                    {sessionDetail.summary}
                                  </div>
                                </div>
                              )}

                              {/* Questions Timeline */}
                              <div>
                                <div className="text-sm text-zinc-400 mb-3">질문-답변 타임라인</div>
                                <div className="space-y-4">
                                  {sessionDetail.questions.map((q, idx) => (
                                    <div key={q.id} className="bg-zinc-800/30 border border-zinc-700 rounded-lg p-4">
                                      <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-sm font-medium">
                                          {idx + 1}
                                        </div>
                                        <div className="flex-1 space-y-3">
                                          {/* Question */}
                                          <div>
                                            <div className="flex items-center gap-2 mb-1">
                                              <span className="text-xs font-medium text-zinc-400">질문</span>
                                              {q.isFollowUp && (
                                                <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                                                  꼬리질문
                                                </span>
                                              )}
                                              <span className="text-xs text-zinc-500">{q.category}</span>
                                            </div>
                                            <div className="text-zinc-200">{q.content}</div>
                                          </div>

                                          {/* Answer */}
                                          {q.userAnswer && (
                                            <div>
                                              <div className="text-xs font-medium text-zinc-400 mb-1">답변</div>
                                              <div className="text-zinc-300 text-sm bg-zinc-900/50 rounded p-3">
                                                {q.userAnswer}
                                              </div>
                                              {q.answeredAt && (
                                                <div className="text-xs text-zinc-500 mt-1">
                                                  {new Date(q.answeredAt).toLocaleString('ko-KR')}
                                                </div>
                                              )}
                                            </div>
                                          )}

                                          {/* Evaluation */}
                                          {q.evaluation && (
                                            <div className="border-t border-zinc-700 pt-3 space-y-2">
                                              <div className="flex items-center gap-3">
                                                <span className="text-xs font-medium text-zinc-400">평가</span>
                                                <span className="text-lg font-bold text-blue-400">
                                                  {q.evaluation.score}/10
                                                </span>
                                              </div>
                                              <div className="text-sm text-zinc-300">{q.evaluation.feedback}</div>
                                              {q.evaluation.strengths.length > 0 && (
                                                <div>
                                                  <div className="text-xs text-green-400 font-medium mb-1">강점</div>
                                                  <ul className="list-disc list-inside text-sm text-zinc-300 space-y-0.5">
                                                    {q.evaluation.strengths.map((s, i) => (
                                                      <li key={i}>{s}</li>
                                                    ))}
                                                  </ul>
                                                </div>
                                              )}
                                              {q.evaluation.weaknesses.length > 0 && (
                                                <div>
                                                  <div className="text-xs text-red-400 font-medium mb-1">약점</div>
                                                  <ul className="list-disc list-inside text-sm text-zinc-300 space-y-0.5">
                                                    {q.evaluation.weaknesses.map((w, i) => (
                                                      <li key={i}>{w}</li>
                                                    ))}
                                                  </ul>
                                                </div>
                                              )}
                                              <div>
                                                <div className="text-xs text-zinc-400 font-medium mb-1">모범 답안</div>
                                                <div className="text-sm text-zinc-300 bg-zinc-900/50 rounded p-3">
                                                  {q.evaluation.modelAnswer}
                                                </div>
                                              </div>
                                            </div>
                                          )}

                                          {/* Follow-ups */}
                                          {q.followUps.length > 0 && (
                                            <div className="border-t border-zinc-700 pt-3">
                                              <div className="text-xs text-zinc-400 font-medium mb-2">꼬리질문</div>
                                              <div className="space-y-2">
                                                {q.followUps.map((f, fidx) => (
                                                  <div key={fidx} className="bg-zinc-900/50 rounded p-3 text-sm">
                                                    <div className="text-zinc-200 mb-2">{f.content}</div>
                                                    {f.userAnswer && (
                                                      <div className="text-zinc-400 text-xs">
                                                        <span className="text-zinc-500">답변:</span> {f.userAnswer}
                                                      </div>
                                                    )}
                                                    {f.aiFeedback && (
                                                      <div className="text-zinc-400 text-xs mt-1">
                                                        <span className="text-zinc-500">피드백:</span> {f.aiFeedback}
                                                      </div>
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center text-zinc-500 py-8">세션 정보를 불러올 수 없습니다.</div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              {Array.from({ length: Math.min(pagination.totalPages, 10) }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => fetchSessions(p)}
                  className={`px-3 py-1 rounded text-sm ${
                    p === pagination.page
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          <div className="text-sm text-zinc-500 text-center">
            총 {pagination.total}개의 세션
          </div>
        </>
      )}
    </div>
  );
}
