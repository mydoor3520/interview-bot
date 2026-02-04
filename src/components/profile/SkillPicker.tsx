'use client';

import { cn } from '@/lib/utils/cn';
import { TECH_CATEGORIES } from '@/lib/constants/tech-stacks';

interface SkillPickerProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  existingSkillNames: Set<string>;
  addingSkill: string | null;
  customSkillInput: string;
  onCustomInputChange: (value: string) => void;
  onAddPreset: (name: string, category: string) => void;
  onAddCustom: () => void;
}

export function SkillPicker({
  activeTab,
  onTabChange,
  existingSkillNames,
  addingSkill,
  customSkillInput,
  onCustomInputChange,
  onAddPreset,
  onAddCustom,
}: SkillPickerProps) {
  return (
    <div className="space-y-4">
      {/* Section heading */}
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        기술 추가
      </h3>

      {/* Horizontal category tabs */}
      <div className="overflow-x-auto">
        <div className="flex gap-2 flex-nowrap">
          {TECH_CATEGORIES.map((category) => (
            <button
              key={category.key}
              onClick={() => onTabChange(category.key)}
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

      {/* Preset tag grid */}
      <div className="flex flex-wrap gap-2">
        {TECH_CATEGORIES.find(cat => cat.key === activeTab)?.items.map((item) => {
          const isAdded = existingSkillNames.has(item.toLowerCase());
          const isAdding = addingSkill === item;
          return (
            <button
              key={item}
              onClick={() => !isAdded && onAddPreset(item, activeTab)}
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

      {/* Custom skill input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={customSkillInput}
          onChange={(e) => onCustomInputChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAddCustom()}
          placeholder="직접 입력..."
          disabled={addingSkill !== null}
          className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 disabled:opacity-50"
        />
        <button
          onClick={onAddCustom}
          disabled={!customSkillInput.trim() || addingSkill !== null}
          className="rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          추가
        </button>
      </div>
    </div>
  );
}
