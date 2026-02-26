'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';

interface Experience {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string | null;
  description: string | null;
  techStack: string[];
  achievements: string[];
  orderIndex: number;
}

interface ExperienceEditorProps {
  experiences: Experience[];
  onRefetch: () => Promise<void>;
}

interface FormState {
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
  techStack: string;
  achievements: string;
}

const emptyForm: FormState = {
  company: '',
  role: '',
  startDate: '',
  endDate: '',
  description: '',
  techStack: '',
  achievements: '',
};

function formatMonth(isoDate: string): string {
  // Convert ISO date string to YYYY-MM for month input
  return isoDate.slice(0, 7);
}

function formatPeriod(startDate: string, endDate: string | null): string {
  const start = new Date(startDate);
  const startStr = `${start.getFullYear()}년 ${start.getMonth() + 1}월`;
  if (!endDate) return `${startStr} ~ 재직중`;
  const end = new Date(endDate);
  return `${startStr} ~ ${end.getFullYear()}년 ${end.getMonth() + 1}월`;
}

export function ExperienceEditor({ experiences, onRefetch }: ExperienceEditorProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addForm, setAddForm] = useState<FormState>(emptyForm);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 3000);
  };

  const handleAddSubmit = async () => {
    if (!addForm.company.trim() || !addForm.role.trim() || !addForm.startDate) {
      showError('회사명, 직무, 입사일은 필수 입력 항목입니다.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        company: addForm.company.trim(),
        role: addForm.role.trim(),
        startDate: addForm.startDate + '-01',
        endDate: addForm.endDate ? addForm.endDate + '-01' : null,
        description: addForm.description.trim() || null,
        techStack: addForm.techStack
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        achievements: addForm.achievements
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };

      const response = await fetch('/api/profile/experiences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('경력 추가에 실패했습니다.');
      }

      await onRefetch();
      setAddForm(emptyForm);
      setShowAddForm(false);
    } catch (err) {
      showError(err instanceof Error ? err.message : '경력 추가에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = (exp: Experience) => {
    setEditingId(exp.id);
    setEditForm({
      company: exp.company,
      role: exp.role,
      startDate: formatMonth(exp.startDate),
      endDate: exp.endDate ? formatMonth(exp.endDate) : '',
      description: exp.description || '',
      techStack: exp.techStack.join(', '),
      achievements: exp.achievements.join(', '),
    });
  };

  const handleEditSubmit = async () => {
    if (!editingId || !editForm.company.trim() || !editForm.role.trim() || !editForm.startDate) {
      showError('회사명, 직무, 입사일은 필수 입력 항목입니다.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        id: editingId,
        company: editForm.company.trim(),
        role: editForm.role.trim(),
        startDate: editForm.startDate + '-01',
        endDate: editForm.endDate ? editForm.endDate + '-01' : null,
        description: editForm.description.trim() || null,
        techStack: editForm.techStack
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        achievements: editForm.achievements
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };

      const response = await fetch('/api/profile/experiences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('경력 수정에 실패했습니다.');
      }

      await onRefetch();
      setEditingId(null);
      setEditForm(emptyForm);
    } catch (err) {
      showError(err instanceof Error ? err.message : '경력 수정에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/profile/experiences?id=${deletingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('경력 삭제에 실패했습니다.');
      }

      await onRefetch();
      setDeletingId(null);
    } catch (err) {
      showError(err instanceof Error ? err.message : '경력 삭제에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    const newExperiences = [...experiences];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newExperiences.length) return;

    // Swap items
    [newExperiences[index], newExperiences[swapIndex]] = [newExperiences[swapIndex], newExperiences[index]];

    // Re-normalize orderIndex by array position
    const reorder = newExperiences.map((exp, i) => ({ id: exp.id, orderIndex: i }));

    setIsSaving(true);
    try {
      const response = await fetch('/api/profile/experiences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reorder }),
      });
      if (!response.ok) {
        throw new Error('순서 변경에 실패했습니다.');
      }
      await onRefetch();
    } catch (err) {
      showError(err instanceof Error ? err.message : '순서 변경에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderFormFields = (
    form: FormState,
    setForm: React.Dispatch<React.SetStateAction<FormState>>,
    onSubmit: () => void,
    onCancel: () => void
  ) => (
    <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 space-y-3">
      {/* Company + Role */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            회사명 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="회사명"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm dark:text-zinc-100 placeholder-zinc-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            직무/직책 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="직무/직책"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm dark:text-zinc-100 placeholder-zinc-400"
          />
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            입사일 <span className="text-red-500">*</span>
          </label>
          <input
            type="month"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm dark:text-zinc-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            퇴사일
          </label>
          <input
            type="month"
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm dark:text-zinc-100"
          />
          <p className="text-xs text-zinc-400 mt-1">비워두면 재직중</p>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
          업무 설명
        </label>
        <textarea
          placeholder="업무 설명"
          rows={2}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm dark:text-zinc-100 placeholder-zinc-400"
        />
      </div>

      {/* Tech Stack */}
      <div>
        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
          기술 스택
        </label>
        <input
          type="text"
          placeholder="기술 스택 (콤마로 구분, 예: React, Node.js)"
          value={form.techStack}
          onChange={(e) => setForm({ ...form, techStack: e.target.value })}
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm dark:text-zinc-100 placeholder-zinc-400"
        />
      </div>

      {/* Achievements */}
      <div>
        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
          주요 성과
        </label>
        <input
          type="text"
          placeholder="주요 성과 (콤마로 구분)"
          value={form.achievements}
          onChange={(e) => setForm({ ...form, achievements: e.target.value })}
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm dark:text-zinc-100 placeholder-zinc-400"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onSubmit}
          disabled={isSaving}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium',
            'bg-blue-600 text-white hover:bg-blue-700',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isSaving ? '저장 중...' : '저장'}
        </button>
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="px-4 py-2 rounded-lg text-sm font-medium border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          취소
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Add Button */}
      <button
        onClick={() => setShowAddForm(!showAddForm)}
        className="w-full rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm text-zinc-500 hover:border-zinc-400 hover:text-zinc-600 dark:hover:border-zinc-600 dark:hover:text-zinc-400"
      >
        + 경력 추가
      </button>

      {/* Add Form */}
      {showAddForm &&
        renderFormFields(
          addForm,
          setAddForm,
          handleAddSubmit,
          () => {
            setShowAddForm(false);
            setAddForm(emptyForm);
          }
        )}

      {/* Experience List */}
      {experiences.length === 0 && !showAddForm && (
        <div className="text-center py-8 text-sm text-zinc-500">등록된 경력이 없습니다.</div>
      )}

      {experiences.map((exp) => (
        <div
          key={exp.id}
          className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-3"
        >
          {editingId === exp.id ? (
            // Edit Mode
            renderFormFields(
              editForm,
              setEditForm,
              handleEditSubmit,
              () => {
                setEditingId(null);
                setEditForm(emptyForm);
              }
            )
          ) : (
            // Display Mode
            <>
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {exp.company} - {exp.role}
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    {formatPeriod(exp.startDate, exp.endDate)}
                  </p>
                </div>

                {/* Action Buttons */}
                {deletingId === exp.id ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-zinc-500">정말 삭제하시겠습니까?</span>
                    <button
                      onClick={handleDeleteConfirm}
                      disabled={isSaving}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      삭제
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      disabled={isSaving}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      onClick={() => handleReorder(experiences.indexOf(exp), 'up')}
                      disabled={isSaving || experiences.length <= 1 || experiences.indexOf(exp) === 0}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="위로 이동"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleReorder(experiences.indexOf(exp), 'down')}
                      disabled={isSaving || experiences.length <= 1 || experiences.indexOf(exp) === experiences.length - 1}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="아래로 이동"
                    >
                      ↓
                    </button>
                    <span className="text-zinc-300 dark:text-zinc-600">|</span>
                    <button
                      onClick={() => handleEditClick(exp)}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                      편집
                    </button>
                    <button
                      onClick={() => handleDeleteClick(exp.id)}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                      삭제
                    </button>
                  </div>
                )}
              </div>

              {/* Description */}
              {exp.description && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{exp.description}</p>
              )}

              {/* Tech Stack */}
              {exp.techStack.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {exp.techStack.map((tech, idx) => (
                    <span
                      key={idx}
                      className="rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs text-zinc-700 dark:text-zinc-300"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}

              {/* Achievements */}
              {exp.achievements.length > 0 && (
                <ul className="space-y-1">
                  {exp.achievements.map((achievement, idx) => (
                    <li key={idx} className="text-sm text-zinc-600 dark:text-zinc-400 flex">
                      <span className="mr-2">•</span>
                      <span>{achievement}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
