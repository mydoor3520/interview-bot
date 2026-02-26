'use client';

import { useEffect, useState, useCallback } from 'react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  target: 'ALL' | 'FREE' | 'PRO';
  displayType: 'BANNER' | 'POPUP';
  startsAt: string;
  endsAt: string | null;
  createdBy: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface FormData {
  title: string;
  content: string;
  target: 'ALL' | 'FREE' | 'PRO';
  displayType: 'BANNER' | 'POPUP';
  startsAt: string;
  endsAt: string;
}

const EMPTY_FORM: FormData = {
  title: '',
  content: '',
  target: 'ALL',
  displayType: 'BANNER',
  startsAt: '',
  endsAt: '',
};

function getStatus(a: Announcement): { label: string; className: string } {
  if (a.deletedAt) {
    return { label: '삭제됨', className: 'bg-red-500/20 text-red-400' };
  }
  const now = new Date();
  const startsAt = new Date(a.startsAt);
  const endsAt = a.endsAt ? new Date(a.endsAt) : null;

  if (startsAt > now) {
    return { label: '예약됨', className: 'bg-yellow-500/20 text-yellow-400' };
  }
  if (endsAt && endsAt < now) {
    return { label: '만료됨', className: 'bg-zinc-600/20 text-zinc-400' };
  }
  return { label: '활성', className: 'bg-green-500/20 text-green-400' };
}

function toLocalDatetime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchAnnouncements = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '20',
        });
        if (includeDeleted) params.set('includeDeleted', 'true');

        const res = await fetch(`/api/admin/announcements?${params}`);
        const data = await res.json();

        if (res.ok) {
          setAnnouncements(data.announcements);
          setPagination(data.pagination);
        } else {
          setError(data.error || '불러오기 실패');
        }
      } catch {
        setError('서버 연결 실패');
      } finally {
        setLoading(false);
      }
    },
    [includeDeleted]
  );

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const startEdit = (a: Announcement) => {
    setForm({
      title: a.title,
      content: a.content,
      target: a.target,
      displayType: a.displayType,
      startsAt: toLocalDatetime(a.startsAt),
      endsAt: a.endsAt ? toLocalDatetime(a.endsAt) : '',
    });
    setEditingId(a.id);
    setShowForm(true);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      setError('제목과 내용을 입력하세요.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        target: form.target,
        displayType: form.displayType,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      };

      const url = editingId
        ? `/api/admin/announcements/${editingId}`
        : '/api/admin/announcements';
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        resetForm();
        fetchAnnouncements(pagination.page);
      } else {
        setError(data.error || '저장 실패');
      }
    } catch {
      setError('서버 연결 실패');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 공지사항을 삭제(보관)하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchAnnouncements(pagination.page);
      } else {
        const data = await res.json();
        setError(data.error || '삭제 실패');
      }
    } catch {
      setError('서버 연결 실패');
    }
  };

  const targetLabel = (t: string) => {
    switch (t) {
      case 'ALL':
        return '전체';
      case 'FREE':
        return 'FREE';
      case 'PRO':
        return 'PRO';
      default:
        return t;
    }
  };

  const typeLabel = (t: string) => {
    switch (t) {
      case 'BANNER':
        return '배너';
      case 'POPUP':
        return '팝업';
      default:
        return t;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">공지사항 관리</h1>
        <button
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setShowForm(true);
              setEditingId(null);
              setForm(EMPTY_FORM);
            }
          }}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showForm ? '취소' : '새 공지사항'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Create / Edit Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4"
        >
          <h2 className="text-lg font-semibold text-zinc-100">
            {editingId ? '공지사항 수정' : '새 공지사항 작성'}
          </h2>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">
              제목 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              maxLength={200}
              placeholder="공지사항 제목"
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">
              내용 <span className="text-red-400">*</span>
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              maxLength={2000}
              rows={4}
              placeholder="공지사항 내용을 입력하세요"
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
            <div className="text-xs text-zinc-500 mt-1 text-right">
              {form.content.length}/2000
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                대상
              </label>
              <select
                value={form.target}
                onChange={(e) =>
                  setForm({
                    ...form,
                    target: e.target.value as 'ALL' | 'FREE' | 'PRO',
                  })
                }
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">전체 사용자</option>
                <option value="FREE">FREE 사용자</option>
                <option value="PRO">PRO 사용자</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                표시 유형
              </label>
              <select
                value={form.displayType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    displayType: e.target.value as 'BANNER' | 'POPUP',
                  })
                }
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="BANNER">배너 (상단 바)</option>
                <option value="POPUP">팝업 (모달)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                시작일시
              </label>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="text-xs text-zinc-500 mt-1">
                비워두면 즉시 시작
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                종료일시
              </label>
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="text-xs text-zinc-500 mt-1">
                비워두면 무기한
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-sm text-zinc-400 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {submitting
                ? '저장 중...'
                : editingId
                  ? '수정'
                  : '생성'}
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) => setIncludeDeleted(e.target.checked)}
            className="rounded border-zinc-600 bg-zinc-800 text-blue-600 focus:ring-blue-500"
          />
          삭제된 공지 포함
        </label>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-100" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          공지사항이 없습니다.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full">
              <thead className="bg-zinc-800/50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">
                    제목
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-zinc-400">
                    대상
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-zinc-400">
                    유형
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">
                    기간
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-zinc-400">
                    상태
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-zinc-400">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {announcements.map((a) => {
                  const status = getStatus(a);
                  return (
                    <tr
                      key={a.id}
                      className={`hover:bg-zinc-800/30 transition-colors ${a.deletedAt ? 'opacity-50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm text-zinc-200 font-medium truncate max-w-xs">
                          {a.title}
                        </div>
                        <div className="text-xs text-zinc-500 truncate max-w-xs mt-0.5">
                          {a.content}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            a.target === 'PRO'
                              ? 'bg-blue-500/20 text-blue-400'
                              : a.target === 'FREE'
                                ? 'bg-zinc-600/20 text-zinc-300'
                                : 'bg-purple-500/20 text-purple-400'
                          }`}
                        >
                          {targetLabel(a.target)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            a.displayType === 'POPUP'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-cyan-500/20 text-cyan-400'
                          }`}
                        >
                          {typeLabel(a.displayType)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">
                        <div>
                          {new Date(a.startsAt).toLocaleDateString('ko-KR', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <div className="text-xs text-zinc-500">
                          ~{' '}
                          {a.endsAt
                            ? new Date(a.endsAt).toLocaleDateString('ko-KR', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '무기한'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {!a.deletedAt && (
                            <>
                              <button
                                onClick={() => startEdit(a)}
                                className="px-2 py-1 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-colors"
                              >
                                수정
                              </button>
                              <button
                                onClick={() => handleDelete(a.id)}
                                className="px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                              >
                                삭제
                              </button>
                            </>
                          )}
                          {a.deletedAt && (
                            <span className="text-xs text-zinc-600">
                              보관됨
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              {Array.from(
                { length: Math.min(pagination.totalPages, 10) },
                (_, i) => i + 1
              ).map((p) => (
                <button
                  key={p}
                  onClick={() => fetchAnnouncements(p)}
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
            총 {pagination.total}개의 공지사항
          </div>
        </>
      )}
    </div>
  );
}
