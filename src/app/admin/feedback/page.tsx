'use client';

import { useEffect, useState } from 'react';

interface Feedback {
  id: string;
  category: string;
  content: string;
  rating: number | null;
  page: string | null;
  userAgent: string | null;
  status: string | null;
  adminNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
  user: { email: string; name: string | null };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Stats {
  total: number;
  avgRating: number | null;
  unresolvedCount: number;
}

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [stats, setStats] = useState<Stats>({ total: 0, avgRating: null, unresolvedCount: 0 });
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editNote, setEditNote] = useState('');

  const fetchFeedbacks = async (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: page.toString(), limit: '20' });
    if (categoryFilter) params.set('category', categoryFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (ratingFilter) params.set('rating', ratingFilter);

    try {
      const res = await fetch(`/api/admin/feedback?${params}`);
      const data = await res.json();
      setFeedbacks(data.feedbacks);
      setPagination(data.pagination);
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch feedbacks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFeedbacks(); }, [categoryFilter, statusFilter, ratingFilter]);

  const handleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleEdit = (feedback: Feedback) => {
    setEditingId(feedback.id);
    setEditStatus(feedback.status || 'open');
    setEditNote(feedback.adminNote || '');
  };

  const handleSave = async (feedbackId: string) => {
    try {
      const res = await fetch(`/api/admin/feedback/${feedbackId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: editStatus, adminNote: editNote }),
      });

      if (res.ok) {
        setEditingId(null);
        fetchFeedbacks(pagination.page);
      } else {
        const data = await res.json();
        alert(data.error || '업데이트 실패');
      }
    } catch (err) {
      console.error('Failed to update feedback:', err);
      alert('업데이트 중 오류가 발생했습니다.');
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      bug: 'bg-red-500/20 text-red-400',
      feature: 'bg-blue-500/20 text-blue-400',
      ux: 'bg-purple-500/20 text-purple-400',
      performance: 'bg-yellow-500/20 text-yellow-400',
      general: 'bg-zinc-700 text-zinc-400',
    };
    return colors[category] || 'bg-zinc-700 text-zinc-400';
  };

  const getStatusColor = (status: string | null) => {
    const colors: Record<string, string> = {
      open: 'bg-blue-500/20 text-blue-400',
      in_progress: 'bg-yellow-500/20 text-yellow-400',
      resolved: 'bg-green-500/20 text-green-400',
      dismissed: 'bg-zinc-700 text-zinc-400',
    };
    return colors[status || 'open'] || 'bg-zinc-700 text-zinc-400';
  };

  const getStatusLabel = (status: string | null) => {
    const labels: Record<string, string> = {
      open: '미해결',
      in_progress: '진행 중',
      resolved: '해결됨',
      dismissed: '기각됨',
    };
    return labels[status || 'open'] || '미해결';
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      bug: '버그',
      feature: '기능 요청',
      ux: 'UX 개선',
      performance: '성능',
      general: '일반',
    };
    return labels[category] || category;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-100">피드백 관리</h1>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 p-4">
          <div className="text-sm text-zinc-400 mb-1">전체 피드백</div>
          <div className="text-2xl font-bold text-zinc-100">{stats.total}</div>
        </div>
        <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 p-4">
          <div className="text-sm text-zinc-400 mb-1">평균 평점</div>
          <div className="text-2xl font-bold text-zinc-100">
            {stats.avgRating ? stats.avgRating.toFixed(1) : '-'}
          </div>
        </div>
        <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 p-4">
          <div className="text-sm text-zinc-400 mb-1">미해결</div>
          <div className="text-2xl font-bold text-yellow-400">{stats.unresolvedCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">전체 카테고리</option>
          <option value="bug">버그</option>
          <option value="feature">기능 요청</option>
          <option value="ux">UX 개선</option>
          <option value="performance">성능</option>
          <option value="general">일반</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">전체 상태</option>
          <option value="open">미해결</option>
          <option value="in_progress">진행 중</option>
          <option value="resolved">해결됨</option>
          <option value="dismissed">기각됨</option>
        </select>
        <select
          value={ratingFilter}
          onChange={e => setRatingFilter(e.target.value)}
          className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">전체 평점</option>
          <option value="1">1점</option>
          <option value="2">2점</option>
          <option value="3">3점</option>
          <option value="4">4점</option>
          <option value="5">5점</option>
        </select>
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
                  <th className="text-center px-4 py-3 text-sm font-medium text-zinc-400">카테고리</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-zinc-400">평점</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">내용</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-zinc-400">상태</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">작성일</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-zinc-400">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {feedbacks.map(feedback => (
                  <>
                    <tr key={feedback.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-zinc-300">
                        <div>{feedback.user.name || '-'}</div>
                        <div className="text-xs text-zinc-500">{feedback.user.email}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(feedback.category)}`}>
                          {getCategoryLabel(feedback.category)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {feedback.rating ? (
                          <span className="text-sm text-yellow-400">{'★'.repeat(feedback.rating)}</span>
                        ) : (
                          <span className="text-sm text-zinc-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-300 max-w-md">
                        <div className="truncate">{feedback.content}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(feedback.status)}`}>
                          {getStatusLabel(feedback.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-500">
                        {new Date(feedback.createdAt).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleExpand(feedback.id)}
                          className="text-sm text-blue-400 hover:text-blue-300"
                        >
                          {expandedId === feedback.id ? '접기' : '상세'}
                        </button>
                      </td>
                    </tr>
                    {expandedId === feedback.id && (
                      <tr className="bg-zinc-800/20">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="space-y-3">
                            <div>
                              <div className="text-xs text-zinc-400 mb-1">전체 내용</div>
                              <div className="text-sm text-zinc-300 whitespace-pre-wrap">{feedback.content}</div>
                            </div>
                            {feedback.page && (
                              <div>
                                <div className="text-xs text-zinc-400 mb-1">페이지</div>
                                <div className="text-sm text-zinc-500">{feedback.page}</div>
                              </div>
                            )}
                            {feedback.userAgent && (
                              <div>
                                <div className="text-xs text-zinc-400 mb-1">User Agent</div>
                                <div className="text-sm text-zinc-500 truncate">{feedback.userAgent}</div>
                              </div>
                            )}
                            {editingId === feedback.id ? (
                              <div className="space-y-3 border-t border-zinc-700 pt-3">
                                <div>
                                  <label className="text-xs text-zinc-400 mb-1 block">상태</label>
                                  <select
                                    value={editStatus}
                                    onChange={e => setEditStatus(e.target.value)}
                                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="open">미해결</option>
                                    <option value="in_progress">진행 중</option>
                                    <option value="resolved">해결됨</option>
                                    <option value="dismissed">기각됨</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs text-zinc-400 mb-1 block">관리자 메모</label>
                                  <textarea
                                    value={editNote}
                                    onChange={e => setEditNote(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="관리자 메모 입력..."
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleSave(feedback.id)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm transition-colors"
                                  >
                                    저장
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="px-4 py-2 bg-zinc-700 text-zinc-300 rounded hover:bg-zinc-600 text-sm transition-colors"
                                  >
                                    취소
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2 border-t border-zinc-700 pt-3">
                                {feedback.adminNote && (
                                  <div>
                                    <div className="text-xs text-zinc-400 mb-1">관리자 메모</div>
                                    <div className="text-sm text-zinc-300">{feedback.adminNote}</div>
                                  </div>
                                )}
                                {feedback.resolvedAt && (
                                  <div>
                                    <div className="text-xs text-zinc-400 mb-1">해결 일시</div>
                                    <div className="text-sm text-zinc-500">
                                      {new Date(feedback.resolvedAt).toLocaleString('ko-KR')}
                                    </div>
                                  </div>
                                )}
                                <button
                                  onClick={() => handleEdit(feedback)}
                                  className="px-4 py-2 bg-zinc-700 text-zinc-300 rounded hover:bg-zinc-600 text-sm transition-colors"
                                >
                                  수정
                                </button>
                              </div>
                            )}
                          </div>
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
                  onClick={() => fetchFeedbacks(p)}
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
            총 {pagination.total}개의 피드백
          </div>
        </>
      )}
    </div>
  );
}
