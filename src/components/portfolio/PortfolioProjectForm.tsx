'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface PortfolioProjectFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  existingProject?: {
    id: string;
    title: string;
    description: string;
    role: string;
    teamSize?: number | null;
    startDate: string;
    endDate?: string | null;
    techStack: string[];
    achievements: string[];
    troubleshooting?: string | null;
    githubUrl?: string | null;
    demoUrl?: string | null;
    category: string;
  };
}

const CATEGORIES = [
  { value: 'personal', label: '개인 프로젝트' },
  { value: 'work', label: '업무' },
  { value: 'opensource', label: '오픈소스' },
  { value: 'hackathon', label: '해커톤' },
];

export function PortfolioProjectForm({
  isOpen,
  onClose,
  onSaved,
  existingProject,
}: PortfolioProjectFormProps) {
  const isEdit = !!existingProject;

  const [form, setForm] = useState({
    title: '',
    description: '',
    role: '',
    teamSize: '',
    startDate: '',
    endDate: '',
    isOngoing: false,
    troubleshooting: '',
    githubUrl: '',
    demoUrl: '',
    category: 'personal',
  });
  const [techStack, setTechStack] = useState<string[]>([]);
  const [techInput, setTechInput] = useState('');
  const [achievements, setAchievements] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (existingProject) {
        setForm({
          title: existingProject.title,
          description: existingProject.description,
          role: existingProject.role,
          teamSize: existingProject.teamSize != null ? String(existingProject.teamSize) : '',
          startDate: existingProject.startDate,
          endDate: existingProject.endDate || '',
          isOngoing: !existingProject.endDate,
          troubleshooting: existingProject.troubleshooting || '',
          githubUrl: existingProject.githubUrl || '',
          demoUrl: existingProject.demoUrl || '',
          category: existingProject.category,
        });
        setTechStack(existingProject.techStack);
        setAchievements(existingProject.achievements.length > 0 ? existingProject.achievements : ['']);
      } else {
        setForm({
          title: '',
          description: '',
          role: '',
          teamSize: '',
          startDate: '',
          endDate: '',
          isOngoing: false,
          troubleshooting: '',
          githubUrl: '',
          demoUrl: '',
          category: 'personal',
        });
        setTechStack([]);
        setAchievements(['']);
      }
      setTechInput('');
      setError(null);
    }
  }, [isOpen, existingProject]);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  function addTechTag(raw: string) {
    const tags = raw
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && !techStack.includes(t));
    if (tags.length > 0) setTechStack((prev) => [...prev, ...tags]);
    setTechInput('');
  }

  function handleTechKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTechTag(techInput);
    } else if (e.key === 'Backspace' && techInput === '' && techStack.length > 0) {
      setTechStack((prev) => prev.slice(0, -1));
    }
  }

  function removeTech(tag: string) {
    setTechStack((prev) => prev.filter((t) => t !== tag));
  }

  function updateAchievement(index: number, value: string) {
    setAchievements((prev) => prev.map((a, i) => (i === index ? value : a)));
  }

  function addAchievement() {
    setAchievements((prev) => [...prev, '']);
  }

  function removeAchievement(index: number) {
    if (achievements.length === 1) {
      setAchievements(['']);
    } else {
      setAchievements((prev) => prev.filter((_, i) => i !== index));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !form.role.trim() || !form.startDate) {
      setError('프로젝트명, 설명, 역할, 시작일은 필수입니다.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        role: form.role.trim(),
        teamSize: form.teamSize ? parseInt(form.teamSize) : null,
        startDate: form.startDate,
        endDate: form.isOngoing ? null : form.endDate || null,
        techStack,
        achievements: achievements.filter((a) => a.trim().length > 0),
        troubleshooting: form.troubleshooting.trim() || null,
        githubUrl: form.githubUrl.trim() || null,
        demoUrl: form.demoUrl.trim() || null,
        category: form.category,
      };

      const url = isEdit
        ? `/api/portfolio/projects/${existingProject!.id}`
        : '/api/portfolio/projects';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: '서버 오류가 발생했습니다.' }));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  const inputClass =
    'w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors';
  const labelClass = 'block text-xs font-medium text-zinc-400 mb-1';

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-zinc-700 bg-zinc-900/95 backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-zinc-100">
            {isEdit ? '프로젝트 수정' : '프로젝트 추가'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-900/20 border border-red-800/50 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* 카테고리 */}
          <div>
            <label className={labelClass}>
              카테고리
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className={inputClass}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* 프로젝트명 */}
          <div>
            <label className={labelClass}>
              프로젝트명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="프로젝트명을 입력하세요"
              className={inputClass}
            />
          </div>

          {/* 설명 */}
          <div>
            <label className={labelClass}>
              설명 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="프로젝트에 대해 설명해주세요"
              rows={3}
              className={`${inputClass} resize-y`}
            />
          </div>

          {/* 역할 / 팀 규모 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                역할 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                placeholder="예: 풀스택 개발자"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>팀 규모</label>
              <input
                type="number"
                min="1"
                value={form.teamSize}
                onChange={(e) => setForm((f) => ({ ...f, teamSize: e.target.value }))}
                placeholder="명 (선택)"
                className={inputClass}
              />
            </div>
          </div>

          {/* 날짜 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                시작일 <span className="text-red-500">*</span>
              </label>
              <input
                type="month"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>종료일</label>
              <input
                type="month"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                disabled={form.isOngoing}
                className={`${inputClass} disabled:opacity-40 disabled:cursor-not-allowed`}
              />
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isOngoing}
                  onChange={(e) => setForm((f) => ({ ...f, isOngoing: e.target.checked, endDate: '' }))}
                  className="rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-xs text-zinc-400">진행 중</span>
              </label>
            </div>
          </div>

          {/* 기술 스택 */}
          <div>
            <label className={labelClass}>기술 스택</label>
            <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
              {techStack.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-200 text-xs"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTech(tag)}
                    className="text-zinc-400 hover:text-red-400 transition-colors leading-none"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={techInput}
              onChange={(e) => setTechInput(e.target.value)}
              onKeyDown={handleTechKeyDown}
              onBlur={() => techInput.trim() && addTechTag(techInput)}
              placeholder="기술 입력 후 Enter 또는 쉼표로 추가"
              className={inputClass}
            />
            <p className="text-xs text-zinc-500 mt-1">Enter 또는 쉼표(,)로 구분하여 추가</p>
          </div>

          {/* 성과 */}
          <div>
            <label className={labelClass}>성과</label>
            <div className="space-y-2">
              {achievements.map((ach, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={ach}
                    onChange={(e) => updateAchievement(i, e.target.value)}
                    placeholder={`성과 ${i + 1}`}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => removeAchievement(i)}
                    className="shrink-0 p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addAchievement}
                className="flex items-center gap-1.5 text-xs text-emerald-500 hover:text-emerald-400 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                성과 추가
              </button>
            </div>
          </div>

          {/* 트러블슈팅 */}
          <div>
            <label className={labelClass}>트러블슈팅 사례</label>
            <textarea
              value={form.troubleshooting}
              onChange={(e) => setForm((f) => ({ ...f, troubleshooting: e.target.value }))}
              placeholder="문제→분석→해결→결과 형식으로 작성해주세요"
              rows={3}
              className={`${inputClass} resize-y`}
            />
            <p className="text-xs text-zinc-500 mt-1">문제→분석→해결→결과 형식으로 작성해주세요</p>
          </div>

          {/* URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>GitHub URL</label>
              <input
                type="url"
                value={form.githubUrl}
                onChange={(e) => setForm((f) => ({ ...f, githubUrl: e.target.value }))}
                placeholder="https://github.com/..."
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>데모 URL</label>
              <input
                type="url"
                value={form.demoUrl}
                onChange={(e) => setForm((f) => ({ ...f, demoUrl: e.target.value }))}
                placeholder="https://..."
                className={inputClass}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {saving && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {saving ? '저장 중...' : isEdit ? '수정 완료' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
