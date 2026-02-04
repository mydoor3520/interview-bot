'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import {
  TECH_CATEGORIES,
  PROFICIENCY_LABELS,
  DEFAULT_PROFICIENCY,
  CATEGORY_LABELS,
} from '@/lib/constants/tech-stacks';

interface Skill {
  id: string;
  name: string;
  category: string;
  proficiency: number;
  yearsUsed: number | null;
}

interface SkillSelectorProps {
  skills: Skill[];
  onRefetch: () => Promise<void>;
}

const CATEGORY_COLORS: Record<string, string> = {
  language: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  framework: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  database: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  infra: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  tool: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300',
  other: 'bg-zinc-100 dark:bg-zinc-900/30 text-zinc-700 dark:text-zinc-300',
};

export function SkillSelector({ skills, onRefetch }: SkillSelectorProps) {
  const [activeTab, setActiveTab] = useState<string>('language');
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [addingSkill, setAddingSkill] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create a set of existing skill names (case-insensitive) for duplicate detection
  const existingSkillNames = useMemo(() => {
    return new Set(skills.map(skill => skill.name.toLowerCase()));
  }, [skills]);

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 3000);
  };

  const updateSkill = async (id: string, updates: { proficiency?: number; yearsUsed?: number }) => {
    try {
      setSavingId(id);
      const response = await fetch('/api/profile/skills', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });

      if (!response.ok) {
        throw new Error('Failed to update skill');
      }

      await onRefetch();
    } catch (err) {
      showError('기술 업데이트에 실패했습니다.');
    } finally {
      setSavingId(null);
    }
  };

  const deleteSkill = async (id: string) => {
    try {
      const response = await fetch(`/api/profile/skills?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete skill');
      }

      await onRefetch();
    } catch (err) {
      showError('기술 삭제에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  const addPresetSkill = async (name: string, category: string) => {
    if (existingSkillNames.has(name.toLowerCase())) {
      return;
    }

    try {
      setAddingSkill(name);
      const response = await fetch('/api/profile/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category,
          proficiency: DEFAULT_PROFICIENCY,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add skill');
      }

      await onRefetch();
    } catch (err) {
      showError('기술 추가에 실패했습니다.');
    } finally {
      setAddingSkill(null);
    }
  };

  const addCustomSkill = async () => {
    const trimmedName = customSkillInput.trim();

    if (!trimmedName) {
      return;
    }

    if (existingSkillNames.has(trimmedName.toLowerCase())) {
      showError('이미 추가된 기술입니다.');
      return;
    }

    try {
      setAddingSkill(trimmedName);
      const response = await fetch('/api/profile/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          category: activeTab,
          proficiency: DEFAULT_PROFICIENCY,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add skill');
      }

      setCustomSkillInput('');
      await onRefetch();
    } catch (err) {
      showError('기술 추가에 실패했습니다.');
    } finally {
      setAddingSkill(null);
    }
  };

  const handleCustomSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      addCustomSkill();
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Skills List */}
      <div>
        {skills.length > 0 ? (
          <div className="space-y-2">
            {skills.map((skill) => {
              const isEditing = savingId === skill.id;
              const isDeleting = deletingId === skill.id;

              return (
                <div
                  key={skill.id}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-3',
                    (isEditing || isDeleting) && 'opacity-60'
                  )}
                >
                  {/* Skill Name and Category */}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                      {skill.name}
                    </div>
                    <span
                      className={cn(
                        'inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium',
                        CATEGORY_COLORS[skill.category] || CATEGORY_COLORS.other
                      )}
                    >
                      {CATEGORY_LABELS[skill.category] || skill.category}
                    </span>
                  </div>

                  {/* Proficiency Select */}
                  <select
                    value={skill.proficiency}
                    onChange={(e) => updateSkill(skill.id, { proficiency: Number(e.target.value) })}
                    disabled={isEditing || isDeleting}
                    className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
                  >
                    {Object.entries(PROFICIENCY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>

                  {/* Years Used Input */}
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={skill.yearsUsed ?? ''}
                    onChange={(e) => updateSkill(skill.id, { yearsUsed: Number(e.target.value) || 0 })}
                    placeholder="연차"
                    disabled={isEditing || isDeleting}
                    className="w-20 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 disabled:opacity-50"
                  />

                  {/* Delete Button */}
                  {deletingId === skill.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">삭제?</span>
                      <button
                        onClick={() => deleteSkill(skill.id)}
                        className="px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        확인
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingId(skill.id)}
                      disabled={isEditing}
                      className="w-6 h-6 flex items-center justify-center rounded text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            등록된 기술이 없습니다. 아래에서 기술을 추가해주세요.
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 my-4" />

      {/* Category Tabs */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          기술 추가
        </h3>
        <div className="overflow-x-auto">
          <div className="flex gap-2 flex-nowrap">
            {TECH_CATEGORIES.map((category) => (
              <button
                key={category.key}
                onClick={() => setActiveTab(category.key)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
                  activeTab === category.key
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                )}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preset Tag Grid */}
      <div className="flex flex-wrap gap-2 mt-3">
        {TECH_CATEGORIES.find(cat => cat.key === activeTab)?.items.map((item) => {
          const isAdded = existingSkillNames.has(item.toLowerCase());
          const isAdding = addingSkill === item;

          return (
            <button
              key={item}
              onClick={() => !isAdded && addPresetSkill(item, activeTab)}
              disabled={isAdded || isAdding}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm transition-colors',
                isAdded
                  ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer border border-zinc-300 dark:border-zinc-600',
                isAdding && 'opacity-50'
              )}
            >
              {isAdded && <span className="mr-1">✓</span>}
              {item}
            </button>
          );
        })}
      </div>

      {/* Custom Skill Input */}
      <div className="mt-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={customSkillInput}
            onChange={(e) => setCustomSkillInput(e.target.value)}
            onKeyDown={handleCustomSkillKeyDown}
            placeholder="직접 입력..."
            disabled={addingSkill !== null}
            className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 disabled:opacity-50"
          />
          <button
            onClick={addCustomSkill}
            disabled={!customSkillInput.trim() || addingSkill !== null}
            className="rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            추가
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
