'use client';

import { useState, useMemo } from 'react';
import { DEFAULT_PROFICIENCY } from '@/lib/constants/tech-stacks';
import { SkillPicker } from './SkillPicker';
import { SkillCardList } from './SkillCardList';

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

const CATEGORY_ORDER = ['language', 'framework', 'database', 'infra', 'tool', 'other'];

export function SkillSelector({ skills, onRefetch }: SkillSelectorProps) {
  const [activeTab, setActiveTab] = useState<string>('language');
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [addingSkill, setAddingSkill] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const existingSkillNames = useMemo(() => {
    return new Set(skills.map((skill) => skill.name.toLowerCase()));
  }, [skills]);

  const groupedSkills = useMemo(() => {
    const groups: Record<string, Skill[]> = {};
    for (const skill of skills) {
      const cat = skill.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(skill);
    }
    return groups;
  }, [skills]);

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 3000);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
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
    } catch {
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

      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await onRefetch();
    } catch {
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
    } catch {
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
    } catch {
      showError('기술 추가에 실패했습니다.');
    } finally {
      setAddingSkill(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Skill Picker */}
        <SkillPicker
          activeTab={activeTab}
          onTabChange={setActiveTab}
          existingSkillNames={existingSkillNames}
          addingSkill={addingSkill}
          customSkillInput={customSkillInput}
          onCustomInputChange={setCustomSkillInput}
          onAddPreset={addPresetSkill}
          onAddCustom={addCustomSkill}
        />

        {/* Right: Added Skills */}
        <SkillCardList
          groupedSkills={groupedSkills}
          categoryOrder={CATEGORY_ORDER}
          expandedIds={expandedIds}
          onToggleExpand={toggleExpand}
          savingId={savingId}
          deletingId={deletingId}
          onUpdate={updateSkill}
          onDeleteRequest={setDeletingId}
          onDeleteConfirm={deleteSkill}
          onDeleteCancel={() => setDeletingId(null)}
        />
      </div>

      {/* Error - full width below both columns */}
      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
