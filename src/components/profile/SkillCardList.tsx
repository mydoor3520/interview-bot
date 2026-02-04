'use client';

import { CATEGORY_LABELS } from '@/lib/constants/tech-stacks';
import { SkillCard } from './SkillCard';

interface Skill {
  id: string;
  name: string;
  category: string;
  proficiency: number;
  yearsUsed: number | null;
}

interface SkillCardListProps {
  groupedSkills: Record<string, Skill[]>;
  categoryOrder: string[];
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  savingId: string | null;
  deletingId: string | null;
  onUpdate: (id: string, updates: { proficiency?: number; yearsUsed?: number }) => void;
  onDeleteRequest: (id: string) => void;
  onDeleteConfirm: (id: string) => void;
  onDeleteCancel: () => void;
}

export function SkillCardList({
  groupedSkills,
  categoryOrder,
  expandedIds,
  onToggleExpand,
  savingId,
  deletingId,
  onUpdate,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
}: SkillCardListProps) {
  const categoriesWithSkills = categoryOrder.filter(
    cat => groupedSkills[cat]?.length > 0
  );

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        등록된 기술
      </h3>

      {categoriesWithSkills.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          등록된 기술이 없습니다.{' '}
          <span className="hidden lg:inline">왼쪽에서</span>
          <span className="lg:hidden">위에서</span>
          {' '}기술을 추가해주세요.
        </p>
      ) : (
        categoriesWithSkills.map(cat => (
          <div key={cat}>
            <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
              {CATEGORY_LABELS[cat] || cat}
              <span className="ml-1.5 text-zinc-400 dark:text-zinc-500">
                ({groupedSkills[cat].length})
              </span>
            </h4>
            <div className="space-y-2">
              {groupedSkills[cat].map(skill => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  isExpanded={expandedIds.has(skill.id)}
                  onToggleExpand={() => onToggleExpand(skill.id)}
                  isSaving={savingId === skill.id}
                  isDeleting={deletingId === skill.id}
                  onUpdate={onUpdate}
                  onDeleteRequest={onDeleteRequest}
                  onDeleteConfirm={onDeleteConfirm}
                  onDeleteCancel={onDeleteCancel}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
