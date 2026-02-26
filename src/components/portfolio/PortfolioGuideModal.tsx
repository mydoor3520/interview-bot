'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { PortfolioStrategy } from '@/lib/portfolio/types';

interface PortfolioGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  guide: {
    id: string;
    strategy: PortfolioStrategy;
    overallScore: number | null;
    overallFeedback: string | null;
    version: number;
    mode: string;
    targetPosition?: { company: string; position: string } | null;
    createdAt: string;
  };
}

function getScoreColor(score: number | null): string {
  if (score == null) return 'text-zinc-500';
  if (score >= 8) return 'text-green-400';
  if (score >= 6) return 'text-yellow-400';
  if (score >= 4) return 'text-orange-400';
  return 'text-red-400';
}

function getScoreBarColor(score: number | null): string {
  if (score == null) return 'bg-zinc-600';
  if (score >= 8) return 'bg-green-500';
  if (score >= 6) return 'bg-yellow-500';
  if (score >= 4) return 'bg-orange-500';
  return 'bg-red-500';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function PortfolioGuideModal({ isOpen, onClose, guide }: PortfolioGuideModalProps) {
  const [openProjectIds, setOpenProjectIds] = useState<Set<string>>(new Set());

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
      // Open first project by default
      const firstId = guide.strategy.projectGuides?.[0]?.projectId;
      if (firstId) setOpenProjectIds(new Set([firstId]));
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape, guide]);

  function toggleProject(id: string) {
    setOpenProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!isOpen) return null;

  const { strategy } = guide;
  const isTargeted = guide.mode === 'targeted';

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-zinc-700 bg-zinc-900/95 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-zinc-100">포트폴리오 가이드</h2>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                isTargeted
                  ? 'bg-emerald-900/50 text-emerald-400 border-emerald-700/50'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-600/50'
              }`}
            >
              {isTargeted && guide.targetPosition ? guide.targetPosition.company : '일반'}
            </span>
            <span className="text-xs text-zinc-500">v{guide.version}</span>
            <span className="text-xs text-zinc-500">{formatDate(guide.createdAt)}</span>
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
        <div className="px-6 py-5 space-y-6">
          {/* Overall score */}
          {guide.overallScore != null && (
            <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/50 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-zinc-300">종합 점수</h3>
                <span className={`text-2xl font-bold ${getScoreColor(guide.overallScore)}`}>
                  {guide.overallScore}/10
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-700 mb-3">
                <div
                  className={`h-2 rounded-full transition-all ${getScoreBarColor(guide.overallScore)}`}
                  style={{ width: `${(guide.overallScore ?? 0) * 10}%` }}
                />
              </div>
              {strategy.keyMessage && (
                <p className="text-sm font-medium text-zinc-200 mb-1">{strategy.keyMessage}</p>
              )}
              {guide.overallFeedback && (
                <p className="text-sm text-zinc-400 leading-relaxed">{guide.overallFeedback}</p>
              )}
            </div>
          )}

          {/* Positioning */}
          {strategy.positioning && (
            <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/50 p-5">
              <h3 className="text-sm font-medium text-zinc-300 mb-2">포지셔닝 전략</h3>
              <p className="text-sm text-zinc-300 leading-relaxed">{strategy.positioning}</p>
            </div>
          )}

          {/* Keyword match (targeted only) */}
          {isTargeted && strategy.keywordMatch && (
            <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/50 p-5">
              <h3 className="text-sm font-medium text-zinc-300 mb-3">JD 키워드 매칭</h3>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-zinc-500">커버리지</span>
                <div className="flex-1 h-2 rounded-full bg-zinc-700">
                  <div
                    className="h-2 rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${strategy.keywordMatch.coverage}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-emerald-400">
                  {strategy.keywordMatch.coverage}%
                </span>
              </div>
              <div className="space-y-2">
                {strategy.keywordMatch.matched.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {strategy.keywordMatch.matched.map((k, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded text-xs bg-green-900/30 text-green-400 border border-green-800/30"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                )}
                {strategy.keywordMatch.missing.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {strategy.keywordMatch.missing.map((k, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded text-xs bg-red-900/30 text-red-400 border border-red-800/30"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Project guides */}
          {strategy.projectGuides && strategy.projectGuides.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-zinc-300 mb-3">프로젝트별 가이드</h3>
              <div className="space-y-3">
                {strategy.projectGuides.map((pg) => (
                  <div key={pg.projectId} className="rounded-lg border border-zinc-700/50 overflow-hidden">
                    {/* Collapsible header */}
                    <button
                      onClick={() => toggleProject(pg.projectId)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800/50 hover:bg-zinc-800 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-300 text-xs font-medium">
                          #{pg.recommendedOrder}
                        </span>
                        <span className="text-sm font-medium text-zinc-200">{pg.projectTitle}</span>
                        <span
                          className={`text-sm font-bold ${getScoreColor(pg.relevanceScore)}`}
                        >
                          관련도 {pg.relevanceScore}/10
                        </span>
                      </div>
                      <svg
                        className={`w-4 h-4 text-zinc-400 transition-transform shrink-0 ${
                          openProjectIds.has(pg.projectId) ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Content */}
                    {openProjectIds.has(pg.projectId) && (
                      <div className="px-4 py-4 space-y-4">
                        {/* Highlight points */}
                        {pg.highlightPoints.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-zinc-500 mb-1.5">강조 포인트</p>
                            <ul className="space-y-1">
                              {pg.highlightPoints.map((pt, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                                  <svg
                                    className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                  {pt}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Description improved */}
                        {pg.descriptionImproved && (
                          <div className="rounded-lg bg-zinc-700/30 border border-zinc-600/30 p-3">
                            <p className="text-xs font-medium text-zinc-400 mb-1">개선된 설명</p>
                            <p className="text-sm text-zinc-300 leading-relaxed">{pg.descriptionImproved}</p>
                          </div>
                        )}

                        {/* Achievements improved */}
                        {pg.achievementsImproved.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-zinc-500 mb-1.5">개선된 성과</p>
                            <ul className="space-y-1">
                              {pg.achievementsImproved.map((a, i) => (
                                <li key={i} className="text-sm text-zinc-300 flex gap-1.5">
                                  <span className="text-emerald-500 shrink-0">-</span>
                                  {a}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Tech stack highlight */}
                        {pg.techStackHighlight.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-zinc-500 mb-1.5">강조할 기술</p>
                            <div className="flex flex-wrap gap-1.5">
                              {pg.techStackHighlight.map((t, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-full bg-emerald-900/30 text-emerald-400 text-xs border border-emerald-800/30"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Troubleshooting guide */}
                        {pg.troubleshootingGuide && (
                          <div className="rounded-lg bg-blue-900/20 border border-blue-800/30 p-3">
                            <p className="text-xs font-medium text-blue-400 mb-1">트러블슈팅 제안</p>
                            <p className="text-sm text-zinc-300 leading-relaxed">
                              {pg.troubleshootingGuide.suggested}
                            </p>
                            {pg.troubleshootingGuide.reasoning && (
                              <p className="text-xs text-zinc-500 mt-1">{pg.troubleshootingGuide.reasoning}</p>
                            )}
                          </div>
                        )}

                        {/* Reasoning */}
                        {pg.reasoning && (
                          <p className="text-xs text-zinc-500 leading-relaxed">{pg.reasoning}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skill strategy */}
          {strategy.skillStrategy && (
            <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/50 p-5 space-y-3">
              <h3 className="text-sm font-medium text-zinc-300">기술 스택 전략</h3>

              {strategy.skillStrategy.leadWith.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 mb-1.5">먼저 강조</p>
                  <div className="flex flex-wrap gap-1.5">
                    {strategy.skillStrategy.leadWith.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 text-xs border border-emerald-800/30">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {strategy.skillStrategy.emphasize.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 mb-1.5">강조</p>
                  <div className="flex flex-wrap gap-1.5">
                    {strategy.skillStrategy.emphasize.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full bg-green-900/30 text-green-400 text-xs border border-green-800/30">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {strategy.skillStrategy.deemphasize.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 mb-1.5">비중 축소</p>
                  <div className="flex flex-wrap gap-1.5">
                    {strategy.skillStrategy.deemphasize.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-400 text-xs">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {strategy.skillStrategy.missing.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 mb-1.5">보완 필요</p>
                  <div className="flex flex-wrap gap-1.5">
                    {strategy.skillStrategy.missing.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full bg-red-900/30 text-red-400 text-xs border border-red-800/30">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {strategy.skillStrategy.reasoning && (
                <p className="text-xs text-zinc-500 leading-relaxed pt-1">
                  {strategy.skillStrategy.reasoning}
                </p>
              )}
            </div>
          )}

          {/* Intro optimization */}
          {strategy.introOptimization && (strategy.introOptimization.original || strategy.introOptimization.improved) && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-zinc-300">자기소개 최적화</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {strategy.introOptimization.original && (
                  <div className="rounded-lg bg-red-950/30 border border-red-900/30 p-4">
                    <p className="text-xs font-medium text-red-400 mb-2">Before</p>
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                      {strategy.introOptimization.original}
                    </p>
                  </div>
                )}
                {strategy.introOptimization.improved && (
                  <div className="rounded-lg bg-emerald-950/30 border border-emerald-900/30 p-4">
                    <p className="text-xs font-medium text-emerald-400 mb-2">After</p>
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                      {strategy.introOptimization.improved}
                    </p>
                  </div>
                )}
              </div>
              {strategy.introOptimization.reasoning && (
                <p className="text-xs text-zinc-500 leading-relaxed">
                  {strategy.introOptimization.reasoning}
                </p>
              )}
            </div>
          )}

          {/* Additional suggestions */}
          {strategy.additionalSuggestions && strategy.additionalSuggestions.length > 0 && (
            <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/50 p-5">
              <h3 className="text-sm font-medium text-zinc-300 mb-3">추가 제안</h3>
              <ul className="space-y-2">
                {strategy.additionalSuggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                    <span className="text-emerald-500 shrink-0 mt-0.5">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex justify-end px-6 py-4 border-t border-zinc-700 bg-zinc-900/95 backdrop-blur-sm">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
