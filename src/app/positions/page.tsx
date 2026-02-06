'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';

interface Position {
  id: string;
  company: string;
  position: string;
  jobDescription: string | null;
  requirements: string[];
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  _count: {
    sessions: number;
  };
}

export default function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    company: '',
    position: '',
    jobDescription: '',
    requirements: [] as string[],
    notes: '',
  });
  const [requirementInput, setRequirementInput] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 3000);
  };

  const fetchPositions = async () => {
    try {
      const res = await fetch('/api/positions');
      const data = await res.json();
      setPositions(data.positions || []);
    } catch {
      showError('포지션 목록을 불러올 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
  }, []);

  const resetForm = () => {
    setFormData({
      company: '',
      position: '',
      jobDescription: '',
      requirements: [],
      notes: '',
    });
    setRequirementInput('');
  };

  const handleCreateNew = () => {
    resetForm();
    setIsCreating(true);
    setEditingId(null);
  };

  const handleEdit = (pos: Position) => {
    setFormData({
      company: pos.company,
      position: pos.position,
      jobDescription: pos.jobDescription || '',
      requirements: pos.requirements || [],
      notes: pos.notes || '',
    });
    setRequirementInput('');
    setEditingId(pos.id);
    setIsCreating(false);
  };

  const handleCancelForm = () => {
    setIsCreating(false);
    setEditingId(null);
    resetForm();
  };

  const addRequirement = () => {
    const trimmed = requirementInput.trim();
    if (!trimmed) return;
    if (formData.requirements.includes(trimmed)) {
      showError('이미 추가된 요구사항입니다.');
      return;
    }
    setFormData({ ...formData, requirements: [...formData.requirements, trimmed] });
    setRequirementInput('');
  };

  const removeRequirement = (index: number) => {
    setFormData({
      ...formData,
      requirements: formData.requirements.filter((_, i) => i !== index),
    });
  };

  const handleCreate = async () => {
    if (!formData.company.trim() || !formData.position.trim()) {
      showError('회사명과 포지션은 필수 입력 항목입니다.');
      return;
    }

    setSavingId('create');
    try {
      const res = await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: formData.company.trim(),
          position: formData.position.trim(),
          jobDescription: formData.jobDescription.trim() || undefined,
          requirements: formData.requirements.length > 0 ? formData.requirements : undefined,
          notes: formData.notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '생성에 실패했습니다.');
      }

      await fetchPositions();
      setIsCreating(false);
      resetForm();
    } catch (err) {
      showError(err instanceof Error ? err.message : '생성에 실패했습니다.');
    } finally {
      setSavingId(null);
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    if (!formData.company.trim() || !formData.position.trim()) {
      showError('회사명과 포지션은 필수 입력 항목입니다.');
      return;
    }

    setSavingId(editingId);
    try {
      const res = await fetch('/api/positions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          company: formData.company.trim(),
          position: formData.position.trim(),
          jobDescription: formData.jobDescription.trim() || undefined,
          requirements: formData.requirements.length > 0 ? formData.requirements : undefined,
          notes: formData.notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '수정에 실패했습니다.');
      }

      await fetchPositions();
      setEditingId(null);
      resetForm();
    } catch (err) {
      showError(err instanceof Error ? err.message : '수정에 실패했습니다.');
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleActive = async (id: string) => {
    setSavingId(id);
    try {
      const res = await fetch('/api/positions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '상태 변경에 실패했습니다.');
      }

      await fetchPositions();
    } catch (err) {
      showError(err instanceof Error ? err.message : '상태 변경에 실패했습니다.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/positions?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '삭제에 실패했습니다.');
      }

      await fetchPositions();
      setDeleteConfirmId(null);
    } catch (err) {
      showError(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500';

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-100" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-8 px-4">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-100">지원 포지션 관리</h1>
          {!isCreating && !editingId && (
            <button
              onClick={handleCreateNew}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              + 새 포지션 추가
            </button>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-lg bg-red-900/20 border border-red-800 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Create/Edit Form */}
        {(isCreating || editingId) && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-zinc-100">
              {isCreating ? '새 포지션 추가' : '포지션 수정'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  회사명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="예: 카카오"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  포지션 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="예: 프론트엔드 개발자"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">직무 설명</label>
              <textarea
                value={formData.jobDescription}
                onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
                placeholder="직무 설명을 입력하세요..."
                rows={3}
                className={cn(inputClass, 'resize-y')}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                자격 요건 ({formData.requirements.length}/20)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.requirements.map((req, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-zinc-800 border border-zinc-700 px-3 py-1 text-xs text-zinc-300"
                  >
                    {req}
                    <button
                      onClick={() => removeRequirement(i)}
                      className="text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={requirementInput}
                  onChange={(e) => setRequirementInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addRequirement()}
                  placeholder="요구사항 입력 후 추가 버튼..."
                  className={cn(inputClass, 'flex-1')}
                />
                <button
                  onClick={addRequirement}
                  disabled={!requirementInput.trim() || formData.requirements.length >= 20}
                  className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  추가
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">메모</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="추가 메모나 참고사항..."
                rows={2}
                className={cn(inputClass, 'resize-y')}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={isCreating ? handleCreate : handleUpdate}
                disabled={savingId !== null}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {savingId ? '저장 중...' : isCreating ? '생성' : '수정'}
              </button>
              <button
                onClick={handleCancelForm}
                disabled={savingId !== null}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {positions.length === 0 && !isCreating && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-12 text-center">
            <p className="text-zinc-400 mb-4">지원 포지션이 없습니다</p>
            <button
              onClick={handleCreateNew}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              첫 번째 포지션 추가하기
            </button>
          </div>
        )}

        {/* Positions Grid */}
        {positions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {positions.map((pos) => (
              <div
                key={pos.id}
                className={cn(
                  'rounded-lg border bg-zinc-900 p-5 space-y-3 transition-all',
                  editingId === pos.id
                    ? 'border-blue-600 ring-2 ring-blue-600/20'
                    : 'border-zinc-800 hover:border-zinc-700'
                )}
              >
                {/* Header: Company & Active Badge */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-zinc-100 truncate">
                      {pos.company}
                    </h3>
                    <p className="text-sm text-zinc-400 truncate">{pos.position}</p>
                  </div>
                  <span
                    className={cn(
                      'flex-shrink-0 ml-2 rounded-full px-2 py-0.5 text-xs font-medium',
                      pos.isActive
                        ? 'bg-green-900/30 text-green-400 border border-green-800'
                        : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                    )}
                  >
                    {pos.isActive ? '활성' : '비활성'}
                  </span>
                </div>

                {/* Session Count */}
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                  <span>면접 세션: {pos._count.sessions}개</span>
                </div>

                {/* Job Description */}
                {pos.jobDescription && (
                  <p className="text-xs text-zinc-400 line-clamp-2">{pos.jobDescription}</p>
                )}

                {/* Requirements */}
                {pos.requirements.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {pos.requirements.slice(0, 3).map((req, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400"
                      >
                        {req}
                      </span>
                    ))}
                    {pos.requirements.length > 3 && (
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
                        +{pos.requirements.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Notes */}
                {pos.notes && (
                  <p className="text-xs text-zinc-500 italic line-clamp-2">{pos.notes}</p>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-zinc-800">
                  <button
                    onClick={() => handleEdit(pos)}
                    disabled={savingId !== null || deletingId !== null}
                    className="flex-1 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleToggleActive(pos.id)}
                    disabled={savingId !== null || deletingId !== null}
                    className={cn(
                      'flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                      pos.isActive
                        ? 'bg-amber-900/30 text-amber-400 hover:bg-amber-900/40'
                        : 'bg-green-900/30 text-green-400 hover:bg-green-900/40'
                    )}
                  >
                    {savingId === pos.id ? '처리 중...' : pos.isActive ? '비활성화' : '활성화'}
                  </button>
                  {deleteConfirmId === pos.id ? (
                    <>
                      <button
                        onClick={() => handleDelete(pos.id)}
                        disabled={deletingId !== null}
                        className="flex-1 rounded-lg bg-red-900/30 text-red-400 px-3 py-1.5 text-xs font-medium hover:bg-red-900/40 disabled:opacity-50 transition-colors"
                      >
                        {deletingId === pos.id ? '삭제 중...' : '확인'}
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        disabled={deletingId !== null}
                        className="flex-1 rounded-lg bg-zinc-800 text-zinc-400 px-3 py-1.5 text-xs font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                      >
                        취소
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(pos.id)}
                      disabled={savingId !== null || deletingId !== null}
                      className="flex-1 rounded-lg bg-red-900/20 text-red-400 px-3 py-1.5 text-xs font-medium hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      삭제
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
