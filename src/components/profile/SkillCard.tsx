'use client';

import { cn } from '@/lib/utils/cn';
import { PROFICIENCY_LABELS } from '@/lib/constants/tech-stacks';

interface Skill {
  id: string;
  name: string;
  category: string;
  proficiency: number;
  yearsUsed: number | null;
}

interface SkillCardProps {
  skill: Skill;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isSaving: boolean;
  isDeleting: boolean;
  onUpdate: (id: string, updates: { proficiency?: number; yearsUsed?: number }) => void;
  onDeleteRequest: (id: string) => void;
  onDeleteConfirm: (id: string) => void;
  onDeleteCancel: () => void;
}

export function SkillCard({
  skill,
  isExpanded,
  onToggleExpand,
  isSaving,
  isDeleting,
  onUpdate,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
}: SkillCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 overflow-hidden transition-colors',
        (isSaving || isDeleting) && 'opacity-60'
      )}
    >
      {/* Collapsed header */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-750 transition-colors"
      >
        {/* Chevron arrow */}
        <svg
          className={cn(
            'w-4 h-4 text-zinc-400 transition-transform duration-200',
            isExpanded && 'rotate-90'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>

        {/* Skill name */}
        <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100 flex-1">
          {skill.name}
        </span>

        {/* Proficiency dots */}
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                level <= skill.proficiency
                  ? 'bg-blue-500 dark:bg-blue-400'
                  : 'bg-zinc-200 dark:bg-zinc-600'
              )}
            />
          ))}
        </div>

        {/* Years badge */}
        {skill.yearsUsed !== null && skill.yearsUsed > 0 && (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {skill.yearsUsed}y
          </span>
        )}
      </button>

      {/* Expanded content */}
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-in-out',
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3 pt-1 border-t border-zinc-100 dark:border-zinc-700 space-y-3">
            {/* Proficiency row */}
            <div className="flex items-center gap-3">
              <label className="w-16 shrink-0 text-sm text-zinc-600 dark:text-zinc-400">
                숙련도
              </label>
              <select
                value={skill.proficiency}
                onChange={(e) => {
                  onUpdate(skill.id, { proficiency: Number(e.target.value) });
                }}
                onClick={(e) => e.stopPropagation()}
                disabled={isSaving || isDeleting}
                className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
              >
                {Object.entries(PROFICIENCY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Years row */}
            <div className="flex items-center gap-3">
              <label className="w-16 shrink-0 text-sm text-zinc-600 dark:text-zinc-400">
                사용 연차
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={skill.yearsUsed ?? ''}
                onChange={(e) => {
                  onUpdate(skill.id, { yearsUsed: Number(e.target.value) || 0 });
                }}
                onClick={(e) => e.stopPropagation()}
                disabled={isSaving || isDeleting}
                className="w-24 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 disabled:opacity-50"
              />
            </div>

            {/* Delete row */}
            <div className="flex justify-end">
              {!isDeleting ? (
                <button
                  onClick={() => onDeleteRequest(skill.id)}
                  disabled={isSaving}
                  className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50"
                >
                  삭제
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">삭제?</span>
                  <button
                    onClick={() => onDeleteConfirm(skill.id)}
                    className="text-sm text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 font-medium"
                  >
                    확인
                  </button>
                  <button
                    onClick={onDeleteCancel}
                    className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                  >
                    취소
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
