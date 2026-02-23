'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface CareerItemFeedback {
  careerIndex: number;
  company: string;
  originalDescription: string;
  improvedDescription: string;
  originalAchievements: string[];
  improvedAchievements: string[];
  reasoning: string;
}

interface SectionFeedback {
  section: 'selfIntro' | 'career' | 'strengths' | 'weaknesses' | 'resume' | 'skills';
  sectionLabel: string;
  originalText: string;
  improvedText: string;
  improvedList?: string[];
  reasoning: string;
  keywords: string[];
  score: number;
  improvements: string[];
  careerItems?: CareerItemFeedback[];
}

interface KeywordMatch {
  matched: string[];
  missing: string[];
  coverage: number;
  suggestions: string[];
}

interface ResumeEditData {
  id: string;
  sections: SectionFeedback[];
  overallScore: number;
  overallFeedback: string;
  keywordMatch?: KeywordMatch;
  version: number;
  mode: 'general' | 'targeted';
  targetPosition?: { company: string; position: string } | null;
  createdAt?: string;
}

interface ResumeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPositionId?: string;
  existingEdit?: ResumeEditData;
}

export function ResumeEditModal({ isOpen, onClose, targetPositionId, existingEdit }: ResumeEditModalProps) {
  const [data, setData] = useState<ResumeEditData | null>(existingEdit || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const isCreateMode = !existingEdit;

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

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

  // Auto-generate on open in create mode
  useEffect(() => {
    if (isOpen && isCreateMode && !data && !loading) {
      generateEdit();
    }
  }, [isOpen, isCreateMode]);

  async function generateEdit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/resume-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPositionId: targetPositionId || undefined,
          mode: targetPositionId ? 'targeted' : 'general',
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '서버 오류가 발생했습니다.' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const result = await res.json();
      setData(result);
      // Expand all sections by default
      setExpandedSections(new Set(result.sections?.map((s: SectionFeedback) => s.section) || []));
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  function handleRegenerate() {
    setData(null);
    generateEdit();
  }

  function toggleSection(section: string) {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

  function getScoreColor(score: number): string {
    if (score >= 8) return 'text-green-400';
    if (score >= 6) return 'text-yellow-400';
    if (score >= 4) return 'text-orange-400';
    return 'text-red-400';
  }

  function getScoreBarColor(score: number): string {
    if (score >= 8) return 'bg-green-500';
    if (score >= 6) return 'bg-yellow-500';
    if (score >= 4) return 'bg-orange-500';
    return 'bg-red-500';
  }

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-zinc-900 shadow-2xl border border-zinc-700"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-zinc-700 bg-zinc-900/95 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-zinc-100">AI 이력서 코칭</h2>
            {data && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                data.mode === 'targeted'
                  ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700/50'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-600/50'
              }`}>
                {data.mode === 'targeted' && data.targetPosition
                  ? data.targetPosition.company
                  : '일반 품질 개선'}
              </span>
            )}
            {data && (
              <span className="text-xs text-zinc-500">v{data.version}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-6">
          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-zinc-400">AI가 이력서를 분석하고 있습니다...</p>
              <p className="text-xs text-zinc-500">약 30초~1분 정도 소요됩니다</p>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="rounded-lg bg-red-900/20 border border-red-800/50 p-4">
              <p className="text-red-400 text-sm">{error}</p>
              {isCreateMode && (
                <button
                  onClick={handleRegenerate}
                  className="mt-3 px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 transition-colors"
                >
                  다시 시도
                </button>
              )}
            </div>
          )}

          {/* Main content */}
          {data && !loading && (
            <>
              {/* Overall score */}
              <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/50 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-zinc-300">종합 점수</h3>
                  <span className={`text-2xl font-bold ${getScoreColor(data.overallScore)}`}>
                    {data.overallScore}/10
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-700 mb-3">
                  <div
                    className={`h-2 rounded-full transition-all ${getScoreBarColor(data.overallScore)}`}
                    style={{ width: `${data.overallScore * 10}%` }}
                  />
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed">{data.overallFeedback}</p>
              </div>

              {/* Keyword match panel (targeted mode only) */}
              {data.keywordMatch && (
                <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/50 p-5">
                  <h3 className="text-sm font-medium text-zinc-300 mb-3">JD 키워드 매칭</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-zinc-500">커버리지</span>
                    <div className="flex-1 h-2 rounded-full bg-zinc-700">
                      <div
                        className="h-2 rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${data.keywordMatch.coverage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-emerald-400">{data.keywordMatch.coverage}%</span>
                  </div>
                  <div className="space-y-2">
                    {data.keywordMatch.matched.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {data.keywordMatch.matched.map((k, i) => (
                          <span key={i} className="px-2 py-0.5 rounded text-xs bg-green-900/30 text-green-400 border border-green-800/30">
                            {k}
                          </span>
                        ))}
                      </div>
                    )}
                    {data.keywordMatch.missing.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {data.keywordMatch.missing.map((k, i) => (
                          <span key={i} className="px-2 py-0.5 rounded text-xs bg-red-900/30 text-red-400 border border-red-800/30">
                            {k}
                          </span>
                        ))}
                      </div>
                    )}
                    {data.keywordMatch.suggestions.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-zinc-500 mb-1">추천 키워드:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {data.keywordMatch.suggestions.map((s, i) => (
                            <span key={i} className="px-2 py-0.5 rounded text-xs bg-blue-900/30 text-blue-400 border border-blue-800/30">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Section accordions */}
              <div className="space-y-3">
                {data.sections.map(section => (
                  <div key={section.section} className="rounded-lg border border-zinc-700/50 overflow-hidden">
                    {/* Section header */}
                    <button
                      onClick={() => toggleSection(section.section)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-zinc-200">{section.sectionLabel}</span>
                        <span className={`text-sm font-bold ${getScoreColor(section.score)}`}>
                          {section.score}/10
                        </span>
                      </div>
                      <svg
                        className={`w-4 h-4 text-zinc-400 transition-transform ${expandedSections.has(section.section) ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Section content */}
                    {expandedSections.has(section.section) && (
                      <div className="px-4 py-4 space-y-4">
                        {/* Reasoning */}
                        <div className="text-sm text-zinc-400 leading-relaxed">
                          {section.reasoning}
                        </div>

                        {/* Improvements list */}
                        {section.improvements.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-zinc-500 mb-1.5">개선사항</p>
                            <ul className="space-y-1">
                              {section.improvements.map((imp, i) => (
                                <li key={i} className="text-xs text-zinc-400 flex gap-1.5">
                                  <span className="text-emerald-500 mt-0.5">-</span>
                                  {imp}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Keywords */}
                        {section.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {section.keywords.map((k, i) => (
                              <span key={i} className="px-2 py-0.5 rounded text-xs bg-emerald-900/20 text-emerald-400">
                                {k}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Before/After for text sections */}
                        {section.section !== 'career' && section.section !== 'strengths' && section.section !== 'weaknesses' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {section.originalText && (
                              <div className="rounded-lg bg-red-950/20 border border-red-900/30 p-3">
                                <p className="text-xs font-medium text-red-400 mb-2">Before</p>
                                <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{section.originalText}</p>
                              </div>
                            )}
                            {section.improvedText && (
                              <div className="rounded-lg bg-green-950/20 border border-green-900/30 p-3">
                                <p className="text-xs font-medium text-green-400 mb-2">After</p>
                                <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{section.improvedText}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Before/After for list sections (strengths/weaknesses) */}
                        {(section.section === 'strengths' || section.section === 'weaknesses') && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {section.originalText && (
                              <div className="rounded-lg bg-red-950/20 border border-red-900/30 p-3">
                                <p className="text-xs font-medium text-red-400 mb-2">Before</p>
                                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{section.originalText}</p>
                              </div>
                            )}
                            {section.improvedList && section.improvedList.length > 0 && (
                              <div className="rounded-lg bg-green-950/20 border border-green-900/30 p-3">
                                <p className="text-xs font-medium text-green-400 mb-2">After</p>
                                <ul className="space-y-1">
                                  {section.improvedList.map((item, i) => (
                                    <li key={i} className="text-sm text-zinc-300">- {item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Career items */}
                        {section.section === 'career' && section.careerItems && (
                          <div className="space-y-4">
                            {section.careerItems.map((item, idx) => (
                              <div key={idx} className="rounded-lg border border-zinc-700/30 p-3 space-y-3">
                                <p className="text-sm font-medium text-zinc-200">
                                  [{item.careerIndex}] {item.company}
                                </p>
                                <p className="text-xs text-zinc-500">{item.reasoning}</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="rounded-lg bg-red-950/20 border border-red-900/30 p-3">
                                    <p className="text-xs font-medium text-red-400 mb-2">Before</p>
                                    {item.originalDescription && (
                                      <p className="text-sm text-zinc-300 mb-2">{item.originalDescription}</p>
                                    )}
                                    {item.originalAchievements.length > 0 && (
                                      <ul className="space-y-1">
                                        {item.originalAchievements.map((a, i) => (
                                          <li key={i} className="text-xs text-zinc-400">- {a}</li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                  <div className="rounded-lg bg-green-950/20 border border-green-900/30 p-3">
                                    <p className="text-xs font-medium text-green-400 mb-2">After</p>
                                    {item.improvedDescription && (
                                      <p className="text-sm text-zinc-300 mb-2">{item.improvedDescription}</p>
                                    )}
                                    {item.improvedAchievements.length > 0 && (
                                      <ul className="space-y-1">
                                        {item.improvedAchievements.map((a, i) => (
                                          <li key={i} className="text-xs text-zinc-400">- {a}</li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        {data && !loading && (
          <div className="sticky bottom-0 flex items-center justify-between px-6 py-4 border-t border-zinc-700 bg-zinc-900/95 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              {isCreateMode && (
                <button
                  onClick={handleRegenerate}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors disabled:opacity-50"
                >
                  다시 생성
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
