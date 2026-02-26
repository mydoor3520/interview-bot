'use client';

import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { cn } from '@/lib/utils/cn';

interface ParsedExperience {
  company: string;
  role: string;
  startDate: string;
  endDate: string | null;
  description: string;
  techStack: string[];
  achievements: string[];
}

interface ParsedSkill {
  name: string;
  category: string;
  proficiency: number;
  yearsUsed: number | null;
}

interface ParsedResume {
  selfIntroduction: string;
  experiences: ParsedExperience[];
  skills: ParsedSkill[];
}

interface ResumeParseModalProps {
  isOpen: boolean;
  onClose: () => void;
  parsed: ParsedResume;
  onSave: (data: {
    mode: 'merge' | 'replace';
    selfIntroduction?: string;
    experiences?: ParsedExperience[];
    skills?: ParsedSkill[];
  }) => Promise<void>;
}

const CATEGORY_LABELS: Record<string, string> = {
  frontend: '프론트엔드',
  backend: '백엔드',
  devops: 'DevOps',
  language: '언어',
  database: 'DB',
  tool: '도구',
  soft: '소프트스킬',
  other: '기타',
};

export function ResumeParseModal({ isOpen, onClose, parsed, onSave }: ResumeParseModalProps) {
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [selfIntro, setSelfIntro] = useState(parsed.selfIntroduction);
  const [selectedExps, setSelectedExps] = useState<boolean[]>(
    parsed.experiences.map(() => true)
  );
  const [selectedSkills, setSelectedSkills] = useState<boolean[]>(
    parsed.skills.map(() => true)
  );
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Collapsible section toggle
  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Experience toggle
  const toggleExp = (index: number) => {
    setSelectedExps((prev) => prev.map((v, i) => (i === index ? !v : v)));
  };

  // Skill toggle
  const toggleSkill = (index: number) => {
    setSelectedSkills((prev) => prev.map((v, i) => (i === index ? !v : v)));
  };

  // Summary counts
  const selectedExpCount = selectedExps.filter(Boolean).length;
  const selectedSkillCount = selectedSkills.filter(Boolean).length;
  const hasSelfIntro = selfIntro.trim().length > 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      const filteredExps = parsed.experiences.filter((_, i) => selectedExps[i]);
      const filteredSkills = parsed.skills.filter((_, i) => selectedSkills[i]);

      await onSave({
        mode,
        selfIntroduction: hasSelfIntro ? selfIntro.trim() : undefined,
        experiences: filteredExps.length > 0 ? filteredExps : undefined,
        skills: filteredSkills.length > 0 ? filteredSkills : undefined,
      });
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="이력서 분석 결과">
      <div className="space-y-4">
        {/* Summary */}
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-3">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            경력 <strong>{parsed.experiences.length}건</strong>, 기술{' '}
            <strong>{parsed.skills.length}개</strong>
            {hasSelfIntro && ', 자기소개 발견'}
          </p>
        </div>

        {/* Self Introduction */}
        {hasSelfIntro && (
          <div>
            <button
              onClick={() => toggleSection('intro')}
              className="flex items-center gap-2 w-full text-left text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              <span className="text-xs">{expandedSection === 'intro' ? '▼' : '▶'}</span>
              자기소개
            </button>
            {expandedSection === 'intro' && (
              <textarea
                value={selfIntro}
                onChange={(e) => setSelfIntro(e.target.value)}
                rows={4}
                className="mt-2 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 resize-y"
              />
            )}
          </div>
        )}

        {/* Experiences */}
        {parsed.experiences.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('exp')}
              className="flex items-center gap-2 w-full text-left text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              <span className="text-xs">{expandedSection === 'exp' ? '▼' : '▶'}</span>
              경력사항 ({selectedExpCount}/{parsed.experiences.length}건 선택)
            </button>
            {expandedSection === 'exp' && (
              <div className="mt-2 space-y-2">
                {parsed.experiences.map((exp, i) => (
                  <label
                    key={i}
                    className={cn(
                      'flex items-start gap-3 rounded-lg border px-3 py-2 cursor-pointer transition-colors',
                      selectedExps[i]
                        ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20'
                        : 'border-zinc-200 dark:border-zinc-700 opacity-60'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedExps[i]}
                      onChange={() => toggleExp(i)}
                      className="mt-1 rounded border-zinc-300"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                        {exp.company} · {exp.role}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {exp.startDate} ~ {exp.endDate || '현재'}
                      </p>
                      {exp.techStack.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {exp.techStack.slice(0, 5).map((tech, j) => (
                            <span
                              key={j}
                              className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-600 dark:text-zinc-400"
                            >
                              {tech}
                            </span>
                          ))}
                          {exp.techStack.length > 5 && (
                            <span className="text-[10px] text-zinc-400">
                              +{exp.techStack.length - 5}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Skills */}
        {parsed.skills.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('skills')}
              className="flex items-center gap-2 w-full text-left text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              <span className="text-xs">{expandedSection === 'skills' ? '▼' : '▶'}</span>
              기술스택 ({selectedSkillCount}/{parsed.skills.length}개 선택)
            </button>
            {expandedSection === 'skills' && (
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {parsed.skills.map((skill, i) => (
                  <label
                    key={i}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 cursor-pointer transition-colors text-xs',
                      selectedSkills[i]
                        ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20'
                        : 'border-zinc-200 dark:border-zinc-700 opacity-60'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSkills[i]}
                      onChange={() => toggleSkill(i)}
                      className="rounded border-zinc-300"
                    />
                    <span className="flex-1 truncate text-zinc-800 dark:text-zinc-200">
                      {skill.name}
                    </span>
                    <span className="shrink-0 text-zinc-400">
                      {skill.proficiency}/5
                    </span>
                    <span className="shrink-0 text-[10px] text-zinc-400">
                      {CATEGORY_LABELS[skill.category] || skill.category}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mode selection */}
        <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
            기존 데이터 처리
          </p>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="merge"
                checked={mode === 'merge'}
                onChange={() => setMode('merge')}
                className="text-blue-600"
              />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">기존 유지 + 추가</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="replace"
                checked={mode === 'replace'}
                onChange={() => setMode('replace')}
                className="text-blue-600"
              />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">기존 교체</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (selectedExpCount === 0 && selectedSkillCount === 0 && !hasSelfIntro)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium',
              'bg-blue-600 text-white hover:bg-blue-700',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {saving ? '저장 중...' : '프로필에 반영'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
