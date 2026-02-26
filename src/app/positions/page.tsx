'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { JobParsingModal } from '@/components/JobParsingModal';
import { ResumeEditModal } from '@/components/resume/ResumeEditModal';
import { ResumeGenerateModal } from '@/components/resume/ResumeGenerateModal';
import { PortfolioGuideHistory } from '@/components/portfolio/PortfolioGuideHistory';

interface GeneratedQuestion {
  id: string;
  content: string;
  category: string;
  reasoning: string | null;
  orderIndex: number;
}

interface Position {
  id: string;
  company: string;
  position: string;
  jobDescription: string | null;
  requirements: string[];
  preferredQualifications: string[];
  requiredExperience: string | null;
  notes: string | null;
  isActive: boolean;
  techStack: string[];
  salaryRange: string | null;
  location: string | null;
  employmentType: string | null;
  deadline: string | null;
  benefits: string[];
  companySize: string | null;
  sourceUrl: string | null;
  sourceSite: string | null;
  lastFetched: string | null;
  createdAt: string;
  _count: {
    sessions: number;
    generatedQuestions: number;
  };
}

const QUESTION_CATEGORIES: Record<string, { label: string; color: string }> = {
  '기술심화': { label: '기술심화', color: 'bg-blue-900/30 text-blue-400 border-blue-800' },
  '프로젝트경험': { label: '프로젝트경험', color: 'bg-purple-900/30 text-purple-400 border-purple-800' },
  '시스템설계': { label: '시스템설계', color: 'bg-cyan-900/30 text-cyan-400 border-cyan-800' },
  '인성문화핏': { label: '인성/문화핏', color: 'bg-amber-900/30 text-amber-400 border-amber-800' },
  '직무적합성': { label: '직무적합성', color: 'bg-green-900/30 text-green-400 border-green-800' },
};

export default function PositionsPage() {
  const router = useRouter();
  const { data: featureData } = useFeatureGate();
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // View preferences
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('positions-view-mode') as 'grid' | 'list') || 'grid';
    }
    return 'grid';
  });

  // Filter & Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'created' | 'company' | 'deadline'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkConfirm, setShowBulkConfirm] = useState<'deactivate' | 'delete' | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    company: '',
    position: '',
    jobDescription: '',
    requirements: [] as string[],
    preferredQualifications: [] as string[],
    requiredExperience: '',
    notes: '',
  });
  const [requirementInput, setRequirementInput] = useState('');
  const [qualificationInput, setQualificationInput] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Questions state
  const [expandedPositionId, setExpandedPositionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState<string | null>(null);
  const [generatingQuestions, setGeneratingQuestions] = useState<string | null>(null);

  // AI Parsing modal
  const [showParsingModal, setShowParsingModal] = useState(false);
  const [resumeEditPositionId, setResumeEditPositionId] = useState<string | null>(null);
  const [resumeGeneratePositionId, setResumeGeneratePositionId] = useState<string | null>(null);
  const [portfolioGuidePositionId, setPortfolioGuidePositionId] = useState<string | null>(null);

  const tier = featureData?.tier || 'FREE';
  const maxPositions = featureData?.limits?.maxTargetPositions ?? 1;
  const canAIParse = featureData?.limits?.aiJobParsing ?? false;
  const monthlyJobParses = featureData?.limits?.monthlyJobParses ?? null;

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  const fetchPositions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      params.set('sort', sortBy);
      params.set('order', sortOrder);

      const res = await fetch(`/api/positions?${params.toString()}`);
      const data = await res.json();
      setPositions(data.positions || []);
    } catch {
      showError('포지션 목록을 불러올 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('positions-view-mode', viewMode);
    }
  }, [viewMode]);

  const resetForm = () => {
    setFormData({
      company: '',
      position: '',
      jobDescription: '',
      requirements: [],
      preferredQualifications: [],
      requiredExperience: '',
      notes: '',
    });
    setRequirementInput('');
    setQualificationInput('');
  };

  const handleCreateNew = () => {
    if (positions.length >= maxPositions) {
      showError(
        `무료 베타 기간 중 포지션은 ${maxPositions}개까지 등록할 수 있습니다.`
      );
      return;
    }
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
      preferredQualifications: pos.preferredQualifications || [],
      requiredExperience: pos.requiredExperience || '',
      notes: pos.notes || '',
    });
    setRequirementInput('');
    setQualificationInput('');
    setEditingId(pos.id);
    setIsCreating(false);
  };

  const handleCancelForm = () => {
    setIsCreating(false);
    setEditingId(null);
    resetForm();
  };

  const addTag = (field: 'requirements' | 'preferredQualifications', value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (formData[field].includes(trimmed)) {
      showError('이미 추가된 항목입니다.');
      return;
    }
    if (formData[field].length >= 20) {
      showError('최대 20개까지 추가할 수 있습니다.');
      return;
    }
    setFormData({ ...formData, [field]: [...formData[field], trimmed] });
    if (field === 'requirements') setRequirementInput('');
    else setQualificationInput('');
  };

  const removeTag = (field: 'requirements' | 'preferredQualifications', index: number) => {
    setFormData({
      ...formData,
      [field]: formData[field].filter((_, i) => i !== index),
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
          preferredQualifications: formData.preferredQualifications.length > 0 ? formData.preferredQualifications : undefined,
          requiredExperience: formData.requiredExperience.trim() || undefined,
          notes: formData.notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.code === 'POSITION_LIMIT_REACHED' && data.upgradeUrl) {
          showError(data.error);
          return;
        }
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
          preferredQualifications: formData.preferredQualifications.length > 0 ? formData.preferredQualifications : undefined,
          requiredExperience: formData.requiredExperience.trim() || undefined,
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
      if (expandedPositionId === id) {
        setExpandedPositionId(null);
        setQuestions([]);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkAction = async (action: 'deactivate' | 'delete') => {
    if (selectedIds.size === 0) return;

    const ids = Array.from(selectedIds);
    setSavingId('bulk');

    try {
      if (action === 'deactivate') {
        await Promise.all(
          ids.map(id =>
            fetch('/api/positions', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id }),
            })
          )
        );
      } else if (action === 'delete') {
        await Promise.all(
          ids.map(id =>
            fetch(`/api/positions?id=${id}`, {
              method: 'DELETE',
            })
          )
        );
      }

      await fetchPositions();
      setSelectedIds(new Set());
      setShowBulkConfirm(null);
    } catch (err) {
      showError(err instanceof Error ? err.message : '작업에 실패했습니다.');
    } finally {
      setSavingId(null);
    }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === positions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(positions.map(p => p.id)));
    }
  };

  // Questions
  const loadQuestions = async (positionId: string) => {
    if (expandedPositionId === positionId) {
      setExpandedPositionId(null);
      setQuestions([]);
      return;
    }

    setLoadingQuestions(positionId);
    try {
      const res = await fetch(`/api/positions/${positionId}/questions`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
        setExpandedPositionId(positionId);
      }
    } catch {
      showError('질문 목록을 불러올 수 없습니다.');
    } finally {
      setLoadingQuestions(null);
    }
  };

  const generateQuestions = async (positionId: string) => {
    setGeneratingQuestions(positionId);
    try {
      const res = await fetch(`/api/positions/${positionId}/questions`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.code === 'QUESTIONS_ALREADY_EXIST') {
          await fetch(`/api/positions/${positionId}/questions`, { method: 'DELETE' });
          const retryRes = await fetch(`/api/positions/${positionId}/questions`, { method: 'POST' });
          if (retryRes.ok) {
            const retryData = await retryRes.json();
            setQuestions(retryData.questions || []);
            setExpandedPositionId(positionId);
            await fetchPositions();
            return;
          }
          const retryError = await retryRes.json();
          throw new Error(retryError.error || '질문 생성에 실패했습니다.');
        }
        throw new Error(data.error || '질문 생성에 실패했습니다.');
      }

      const data = await res.json();
      setQuestions(data.questions || []);
      setExpandedPositionId(positionId);
      await fetchPositions();
    } catch (err) {
      showError(err instanceof Error ? err.message : '질문 생성에 실패했습니다.');
    } finally {
      setGeneratingQuestions(null);
    }
  };

  const handleStartInterview = (positionId: string) => {
    router.push(`/interview?positionId=${positionId}`);
  };

  const handleParsingSave = async (data: {
    company: string;
    position: string;
    jobDescription: string;
    requirements: string[];
    preferredQualifications: string[];
    requiredExperience: string;
  }) => {
    setSavingId('parse');
    try {
      const res = await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: data.company,
          position: data.position,
          jobDescription: data.jobDescription || undefined,
          requirements: data.requirements.length > 0 ? data.requirements : undefined,
          preferredQualifications: data.preferredQualifications.length > 0 ? data.preferredQualifications : undefined,
          requiredExperience: data.requiredExperience || undefined,
        }),
      });

      if (!res.ok) {
        const respData = await res.json();
        throw new Error(respData.error || '저장에 실패했습니다.');
      }

      await fetchPositions();
      setShowParsingModal(false);
    } catch (err) {
      showError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setSavingId(null);
    }
  };

  const getDeadlineColor = (deadline: string | null) => {
    if (!deadline) return 'text-zinc-500';
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const diffDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'text-zinc-600';
    if (diffDays < 7) return 'text-red-400';
    if (diffDays < 14) return 'text-amber-400';
    return 'text-green-400';
  };

  const groupedQuestions = questions.reduce<Record<string, GeneratedQuestion[]>>((acc, q) => {
    const cat = q.category || '기타';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(q);
    return acc;
  }, {});

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">지원 포지션 관리</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {positions.length}/{maxPositions}개 등록됨
              {tier === 'FREE' && positions.length >= maxPositions && (
                <span className="ml-2 text-amber-400">
                  (
                  <a href="/pricing" className="underline hover:text-amber-300">
                    PRO 업그레이드
                  </a>
                  로 최대 10개)
                </span>
              )}
            </p>
          </div>
          {!isCreating && !editingId && (
            <div className="flex gap-2">
              {canAIParse && (
                <button
                  onClick={() => setShowParsingModal(true)}
                  disabled={positions.length >= maxPositions}
                  className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  URL로 추가
                  {monthlyJobParses !== null && (
                    <span className="ml-1.5 text-xs opacity-75">(월 {monthlyJobParses}회)</span>
                  )}
                </button>
              )}
              <button
                onClick={handleCreateNew}
                disabled={positions.length >= maxPositions}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                + 수동 추가
              </button>
            </div>
          )}
        </div>

        {tier === 'FREE' && (
          <div className="rounded-lg bg-blue-900/20 border border-blue-800/50 px-4 py-3 flex items-center justify-between">
            <div className="text-sm text-blue-200">
              <span className="font-medium">무료 플랜</span>: 포지션 {maxPositions}개 등록, 채용공고 자동 등록 월 {monthlyJobParses}회
            </div>
            <a href="/pricing" className="text-xs font-medium text-blue-400 hover:text-blue-300 whitespace-nowrap ml-4">
              더 알아보기 →
            </a>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-900/20 border border-red-800 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

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
                    className="inline-flex items-center gap-1 rounded-full bg-blue-900/30 border border-blue-800 px-3 py-1 text-xs text-blue-300"
                  >
                    {req}
                    <button
                      onClick={() => removeTag('requirements', i)}
                      className="text-blue-500 hover:text-red-400 transition-colors"
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag('requirements', requirementInput);
                    }
                  }}
                  placeholder="자격 요건 입력 후 Enter..."
                  className={cn(inputClass, 'flex-1')}
                />
                <button
                  onClick={() => addTag('requirements', requirementInput)}
                  disabled={!requirementInput.trim() || formData.requirements.length >= 20}
                  className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  추가
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                우대 사항 ({formData.preferredQualifications.length}/20)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.preferredQualifications.map((qual, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-green-900/30 border border-green-800 px-3 py-1 text-xs text-green-300"
                  >
                    {qual}
                    <button
                      onClick={() => removeTag('preferredQualifications', i)}
                      className="text-green-500 hover:text-red-400 transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={qualificationInput}
                  onChange={(e) => setQualificationInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag('preferredQualifications', qualificationInput);
                    }
                  }}
                  placeholder="우대 사항 입력 후 Enter..."
                  className={cn(inputClass, 'flex-1')}
                />
                <button
                  onClick={() => addTag('preferredQualifications', qualificationInput)}
                  disabled={!qualificationInput.trim() || formData.preferredQualifications.length >= 20}
                  className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  추가
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">필요 경력</label>
              <input
                type="text"
                value={formData.requiredExperience}
                onChange={(e) => setFormData({ ...formData, requiredExperience: e.target.value })}
                placeholder="예: 3년 이상, 5~7년"
                className={inputClass}
              />
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

        {!isCreating && !editingId && positions.length > 0 && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="회사명 또는 포지션 검색..."
                  className={inputClass}
                />
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                  className={inputClass}
                >
                  <option value="all">전체 상태</option>
                  <option value="active">활성</option>
                  <option value="inactive">비활성</option>
                </select>
              </div>

              <div>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [sort, order] = e.target.value.split('-');
                    setSortBy(sort as 'created' | 'company' | 'deadline');
                    setSortOrder(order as 'asc' | 'desc');
                  }}
                  className={inputClass}
                >
                  <option value="created-desc">최신순</option>
                  <option value="created-asc">오래된순</option>
                  <option value="company-asc">회사명 A-Z</option>
                  <option value="company-desc">회사명 Z-A</option>
                  <option value="deadline-asc">마감일 가까운순</option>
                  <option value="deadline-desc">마감일 먼순</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    viewMode === 'grid'
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  )}
                >
                  <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  그리드
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  )}
                >
                  <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  목록
                </button>
              </div>

              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">{selectedIds.size}개 선택됨</span>
                  <button
                    onClick={() => setShowBulkConfirm('deactivate')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-900/30 text-amber-400 hover:bg-amber-900/40 transition-colors"
                  >
                    비활성화
                  </button>
                  <button
                    onClick={() => setShowBulkConfirm('delete')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-900/30 text-red-400 hover:bg-red-900/40 transition-colors"
                  >
                    삭제
                  </button>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
                  >
                    선택 취소
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {showBulkConfirm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-md w-full space-y-4">
              <h3 className="text-lg font-semibold text-zinc-100">
                {showBulkConfirm === 'deactivate' ? '비활성화 확인' : '삭제 확인'}
              </h3>
              <p className="text-sm text-zinc-400">
                선택한 {selectedIds.size}개의 포지션을{' '}
                {showBulkConfirm === 'deactivate' ? '비활성화' : '삭제'}하시겠습니까?
                {showBulkConfirm === 'delete' && (
                  <span className="block mt-2 text-red-400">이 작업은 되돌릴 수 없습니다.</span>
                )}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkAction(showBulkConfirm)}
                  disabled={savingId === 'bulk'}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {savingId === 'bulk' ? '처리 중...' : '확인'}
                </button>
                <button
                  onClick={() => setShowBulkConfirm(null)}
                  disabled={savingId === 'bulk'}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {positions.length === 0 && !isCreating && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-12 text-center">
            <p className="text-zinc-400 mb-4">지원 포지션이 없습니다</p>
            <div className="flex justify-center gap-3">
              {canAIParse && (
                <button
                  onClick={() => setShowParsingModal(true)}
                  className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
                >
                  채용공고 URL로 추가하기
                </button>
              )}
              <button
                onClick={handleCreateNew}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                직접 입력하여 추가하기
              </button>
            </div>
          </div>
        )}

        {positions.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {positions.map((pos) => {
              const techStack = (pos as any).techStack || [];
              return (
                <div key={pos.id} className="space-y-0">
                  <div
                    className={cn(
                      'rounded-lg border bg-zinc-900 p-5 space-y-3 transition-all',
                      editingId === pos.id
                        ? 'border-blue-600 ring-2 ring-blue-600/20'
                        : 'border-zinc-800 hover:border-zinc-700',
                      expandedPositionId === pos.id && 'rounded-b-none'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(pos.id)}
                        onChange={() => toggleSelection(pos.id)}
                        className="mt-1 w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-zinc-100 truncate">
                          {pos.company}
                        </h3>
                        <p className="text-sm text-zinc-400 truncate">{pos.position}</p>
                      </div>
                      <span
                        className={cn(
                          'flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                          pos.isActive
                            ? 'bg-green-900/30 text-green-400 border border-green-800'
                            : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                        )}
                      >
                        {pos.isActive ? '활성' : '비활성'}
                      </span>
                    </div>

                    {((pos as any).location || (pos as any).employmentType || (pos as any).salaryRange) && (
                      <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
                        {(pos as any).location && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {(pos as any).location}
                          </span>
                        )}
                        {(pos as any).employmentType && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {(pos as any).employmentType}
                          </span>
                        )}
                        {(pos as any).salaryRange && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {(pos as any).salaryRange}
                          </span>
                        )}
                      </div>
                    )}

                    {(pos as any).deadline && (
                      <p className={cn('text-xs font-medium', getDeadlineColor((pos as any).deadline))}>
                        마감: {(pos as any).deadline}
                      </p>
                    )}

                    {techStack.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {techStack.slice(0, 5).map((tech: string, i: number) => (
                          <span key={i} className="rounded-full bg-purple-900/30 border border-purple-800 px-2 py-0.5 text-xs text-purple-400">
                            {tech}
                          </span>
                        ))}
                        {techStack.length > 5 && (
                          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
                            +{techStack.length - 5}
                          </span>
                        )}
                      </div>
                    )}

                    {pos.requiredExperience && (
                      <p className="text-xs text-zinc-400">
                        <span className="text-zinc-500">경력:</span> {pos.requiredExperience}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        면접 {pos._count.sessions}회
                      </span>
                      {pos._count.generatedQuestions > 0 && (
                        <span className="rounded-full bg-blue-900/30 border border-blue-800 px-2 py-0.5 text-blue-400">
                          예상 질문 {pos._count.generatedQuestions}개
                        </span>
                      )}
                    </div>

                    {pos.requirements.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {pos.requirements.slice(0, 4).map((req, i) => (
                          <span key={i} className="rounded-full bg-blue-900/20 border border-blue-900 px-2 py-0.5 text-xs text-blue-400">
                            {req}
                          </span>
                        ))}
                        {pos.requirements.length > 4 && (
                          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
                            +{pos.requirements.length - 4}
                          </span>
                        )}
                      </div>
                    )}

                    {pos.jobDescription && (
                      <p className="text-xs text-zinc-400 line-clamp-2">{pos.jobDescription}</p>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800">
                      <button
                        onClick={() => handleStartInterview(pos.id)}
                        disabled={!pos.isActive}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        면접 시작
                      </button>
                      <button
                        onClick={() => setResumeEditPositionId(pos.id)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
                      >
                        이력서 코칭
                      </button>
                      <button
                        onClick={() => setResumeGeneratePositionId(pos.id)}
                        className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 transition-colors"
                      >
                        맞춤 이력서
                      </button>
                      <button
                        onClick={() => setPortfolioGuidePositionId(portfolioGuidePositionId === pos.id ? null : pos.id)}
                        className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 transition-colors"
                      >
                        포트폴리오
                      </button>
                      <button
                        onClick={() => pos._count.generatedQuestions > 0 ? loadQuestions(pos.id) : generateQuestions(pos.id)}
                        disabled={generatingQuestions === pos.id || loadingQuestions === pos.id}
                        className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                      >
                        {generatingQuestions === pos.id
                          ? '생성 중...'
                          : loadingQuestions === pos.id
                          ? '로딩...'
                          : pos._count.generatedQuestions > 0
                          ? expandedPositionId === pos.id ? '질문 접기' : '질문 보기'
                          : '예상 질문 생성'}
                      </button>
                      <button
                        onClick={() => handleEdit(pos)}
                        disabled={savingId !== null || deletingId !== null}
                        className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleToggleActive(pos.id)}
                        disabled={savingId !== null || deletingId !== null}
                        className={cn(
                          'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                          pos.isActive
                            ? 'bg-amber-900/30 text-amber-400 hover:bg-amber-900/40'
                            : 'bg-green-900/30 text-green-400 hover:bg-green-900/40'
                        )}
                      >
                        {savingId === pos.id ? '...' : pos.isActive ? '비활성화' : '활성화'}
                      </button>
                      {deleteConfirmId === pos.id ? (
                        <>
                          <button
                            onClick={() => handleDelete(pos.id)}
                            disabled={deletingId !== null}
                            className="rounded-lg bg-red-900/30 text-red-400 px-3 py-1.5 text-xs font-medium hover:bg-red-900/40 disabled:opacity-50 transition-colors"
                          >
                            {deletingId === pos.id ? '삭제 중...' : '확인'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            disabled={deletingId !== null}
                            className="rounded-lg bg-zinc-800 text-zinc-400 px-3 py-1.5 text-xs font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                          >
                            취소
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(pos.id)}
                          disabled={savingId !== null || deletingId !== null}
                          className="rounded-lg bg-red-900/20 text-red-400 px-3 py-1.5 text-xs font-medium hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>

                  {portfolioGuidePositionId === pos.id && (
                    <div className="rounded-b-lg border border-t-0 border-zinc-800 bg-zinc-950 p-5">
                      <h4 className="text-sm font-semibold text-zinc-200 mb-3">포트폴리오 가이드</h4>
                      <PortfolioGuideHistory targetPositionId={pos.id} />
                    </div>
                  )}

                  {expandedPositionId === pos.id && questions.length > 0 && (
                    <div className="rounded-b-lg border border-t-0 border-zinc-800 bg-zinc-950 p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-zinc-200">
                          예상 면접 질문 ({questions.length}개)
                        </h4>
                        <button
                          onClick={() => generateQuestions(pos.id)}
                          disabled={generatingQuestions === pos.id}
                          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          {generatingQuestions === pos.id ? '재생성 중...' : '다시 생성'}
                        </button>
                      </div>

                      {Object.entries(groupedQuestions).map(([category, catQuestions]) => {
                        const catInfo = QUESTION_CATEGORIES[category] || { label: category, color: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
                        return (
                          <div key={category} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', catInfo.color)}>
                                {catInfo.label}
                              </span>
                              <span className="text-xs text-zinc-600">{catQuestions.length}개</span>
                            </div>
                            <div className="space-y-2 pl-2">
                              {catQuestions.map((q, idx) => (
                                <div key={q.id} className="space-y-0.5">
                                  <p className="text-sm text-zinc-300">
                                    <span className="text-zinc-600 mr-1.5">{idx + 1}.</span>
                                    {q.content}
                                  </p>
                                  {q.reasoning && (
                                    <p className="text-xs text-zinc-600 pl-4">
                                      → {q.reasoning}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {positions.length > 0 && viewMode === 'list' && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-950 border-b border-zinc-800">
                  <tr className="text-xs font-medium text-zinc-400">
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === positions.length && positions.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                      />
                    </th>
                    <th className="px-4 py-3 text-left">회사</th>
                    <th className="px-4 py-3 text-left">포지션</th>
                    <th className="px-4 py-3 text-left">기술 스택</th>
                    <th className="px-4 py-3 text-left">위치</th>
                    <th className="px-4 py-3 text-left">마감일</th>
                    <th className="px-4 py-3 text-left">상태</th>
                    <th className="px-4 py-3 text-left">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {positions.map((pos) => {
                    const techStack = (pos as any).techStack || [];
                    return (
                      <tr key={pos.id} className="text-sm text-zinc-300 hover:bg-zinc-800/50 transition-colors">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(pos.id)}
                            onChange={() => toggleSelection(pos.id)}
                            className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium">{pos.company}</td>
                        <td className="px-4 py-3">{pos.position}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {techStack.slice(0, 3).map((tech: string, i: number) => (
                              <span key={i} className="rounded-full bg-purple-900/30 border border-purple-800 px-2 py-0.5 text-xs text-purple-400">
                                {tech}
                              </span>
                            ))}
                            {techStack.length > 3 && (
                              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
                                +{techStack.length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs">{(pos as any).location || '-'}</td>
                        <td className={cn('px-4 py-3 text-xs', getDeadlineColor((pos as any).deadline))}>
                          {(pos as any).deadline || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-medium',
                              pos.isActive
                                ? 'bg-green-900/30 text-green-400 border border-green-800'
                                : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                            )}
                          >
                            {pos.isActive ? '활성' : '비활성'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleStartInterview(pos.id)}
                              disabled={!pos.isActive}
                              className="rounded px-2 py-1 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                              title="면접 시작"
                            >
                              면접
                            </button>
                            <button
                              onClick={() => setResumeEditPositionId(pos.id)}
                              className="rounded px-2 py-1 text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                            >
                              코칭
                            </button>
                            <button
                              onClick={() => setResumeGeneratePositionId(pos.id)}
                              className="rounded px-2 py-1 text-xs font-medium bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                            >
                              이력서
                            </button>
                            <button
                              onClick={() => handleEdit(pos)}
                              className="rounded px-2 py-1 text-xs font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
                              title="수정"
                            >
                              수정
                            </button>
                            {deleteConfirmId === pos.id ? (
                              <>
                                <button
                                  onClick={() => handleDelete(pos.id)}
                                  disabled={deletingId !== null}
                                  className="rounded px-2 py-1 text-xs font-medium bg-red-900/30 text-red-400 hover:bg-red-900/40 disabled:opacity-50 transition-colors"
                                >
                                  확인
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="rounded px-2 py-1 text-xs font-medium bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
                                >
                                  취소
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirmId(pos.id)}
                                className="rounded px-2 py-1 text-xs font-medium bg-red-900/20 text-red-400 hover:bg-red-900/30 transition-colors"
                                title="삭제"
                              >
                                삭제
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {resumeEditPositionId && (
        <ResumeEditModal
          isOpen={!!resumeEditPositionId}
          onClose={() => setResumeEditPositionId(null)}
          targetPositionId={resumeEditPositionId}
        />
      )}

      {resumeGeneratePositionId && (
        <ResumeGenerateModal
          isOpen={!!resumeGeneratePositionId}
          onClose={() => setResumeGeneratePositionId(null)}
          targetPositionId={resumeGeneratePositionId}
        />
      )}

      <JobParsingModal
        isOpen={showParsingModal}
        onClose={() => setShowParsingModal(false)}
        onSave={handleParsingSave}
      />
    </div>
  );
}
