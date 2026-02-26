'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ResumeTemplateCard } from './ResumeTemplateCard';
import { ResumePreview } from './ResumePreview';
import type { TemplateType, SourceType, OutputFormat } from '@/lib/resume/types';

interface ResumeEditOption {
  id: string;
  mode: 'general' | 'targeted';
  overallScore: number | null;
  createdAt: string;
  targetPosition: { company: string; position: string } | null;
}

interface TargetPositionOption {
  id: string;
  company: string;
  position: string;
  isActive: boolean;
}

interface GenerateResult {
  documentId: string;
  pdf?: { url: string };
  docx?: { url: string };
}

interface ResumeGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-select a target position */
  targetPositionId?: string;
  /** Pre-select a coaching source */
  resumeEditId?: string;
}

type Step = 'source' | 'position' | 'template' | 'preview';

export function ResumeGenerateModal({
  isOpen,
  onClose,
  targetPositionId: initialPositionId,
  resumeEditId: initialEditId,
}: ResumeGenerateModalProps) {
  // Step
  const [step, setStep] = useState<Step>('source');

  // Selections
  const [sourceType, setSourceType] = useState<SourceType>('profile');
  const [selectedEditId, setSelectedEditId] = useState<string | null>(initialEditId ?? null);
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(initialPositionId ?? null);
  const [template, setTemplate] = useState<TemplateType>('clean-modern');
  const [format, setFormat] = useState<OutputFormat>('both');

  // Data
  const [resumeEdits, setResumeEdits] = useState<ResumeEditOption[]>([]);
  const [positions, setPositions] = useState<TargetPositionOption[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Generation
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Download
  const [downloadingFormat, setDownloadingFormat] = useState<'pdf' | 'docx' | null>(null);

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      loadOptions();
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setStep('source');
      setSourceType('profile');
      setSelectedEditId(initialEditId ?? null);
      setSelectedPositionId(initialPositionId ?? null);
      setTemplate('clean-modern');
      setFormat('both');
      setResult(null);
      setError(null);
    }
  }, [isOpen, initialEditId, initialPositionId]);

  async function loadOptions() {
    setLoadingData(true);
    try {
      const [editsRes, posRes] = await Promise.all([
        fetch('/api/resume-edit'),
        fetch('/api/positions'),
      ]);
      if (editsRes.ok) {
        const data = await editsRes.json();
        setResumeEdits(data.edits ?? []);
      }
      if (posRes.ok) {
        const data = await posRes.json();
        setPositions((data.positions ?? []).filter((p: TargetPositionOption) => p.isActive));
      }
    } catch {
      // Non-blocking — user can still proceed
    } finally {
      setLoadingData(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/resume/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType,
          resumeEditId: sourceType === 'coaching' ? selectedEditId : undefined,
          targetPositionId: selectedPositionId || undefined,
          template,
          format,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setResult(data);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : '이력서 생성에 실패했습니다.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload(fmt: 'pdf' | 'docx') {
    if (!result) return;
    setDownloadingFormat(fmt);
    try {
      const res = await fetch(`/api/resume/download/${result.documentId}?format=${fmt}`);
      if (!res.ok) {
        if (res.status === 503) {
          setError('서버가 바쁩니다. 잠시 후 다시 시도해주세요.');
        } else {
          setError('다운로드에 실패했습니다.');
        }
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume.${fmt}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('다운로드 중 오류가 발생했습니다.');
    } finally {
      setDownloadingFormat(null);
    }
  }

  function formatDate(str: string): string {
    const d = new Date(str);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  }

  function canProceed(): boolean {
    if (step === 'source') {
      if (sourceType === 'coaching' && !selectedEditId) return false;
      return true;
    }
    return true;
  }

  if (!isOpen) return null;

  const STEPS: Step[] = ['source', 'position', 'template', 'preview'];
  const stepIndex = STEPS.indexOf(step);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-zinc-900 shadow-2xl border border-zinc-700"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-zinc-700 bg-zinc-900/95 backdrop-blur-sm">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">이력서 생성</h2>
            {step !== 'preview' && (
              <p className="text-xs text-zinc-500 mt-0.5">
                {step === 'source' && '1/3 · 소스 선택'}
                {step === 'position' && '2/3 · 포지션 선택'}
                {step === 'template' && '3/3 · 템플릿 선택'}
              </p>
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
        <div className="px-6 py-5 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-900/20 border border-red-800/50 p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Step 1: Source */}
          {step === 'source' && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-400">이력서 생성에 사용할 데이터를 선택하세요.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setSourceType('profile'); setSelectedEditId(null); }}
                  className={[
                    'text-left rounded-xl border-2 p-4 transition-all',
                    sourceType === 'profile'
                      ? 'border-emerald-500 bg-emerald-900/10'
                      : 'border-zinc-700/50 bg-zinc-800/50 hover:border-zinc-500',
                  ].join(' ')}
                >
                  <p className="text-sm font-semibold text-zinc-100 mb-1">프로필 원본</p>
                  <p className="text-xs text-zinc-400">입력하신 프로필 데이터를 그대로 사용합니다.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSourceType('coaching')}
                  className={[
                    'text-left rounded-xl border-2 p-4 transition-all',
                    sourceType === 'coaching'
                      ? 'border-emerald-500 bg-emerald-900/10'
                      : 'border-zinc-700/50 bg-zinc-800/50 hover:border-zinc-500',
                  ].join(' ')}
                >
                  <p className="text-sm font-semibold text-zinc-100 mb-1">AI 코칭 개선본</p>
                  <p className="text-xs text-zinc-400">AI 첨삭 결과로 개선된 내용을 사용합니다.</p>
                </button>
              </div>

              {sourceType === 'coaching' && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-400">첨삭 이력 선택</p>
                  {loadingData ? (
                    <div className="flex items-center gap-2 py-3">
                      <div className="w-4 h-4 border-2 border-zinc-600 border-t-emerald-500 rounded-full animate-spin" />
                      <span className="text-xs text-zinc-500">로딩 중...</span>
                    </div>
                  ) : resumeEdits.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-2">첨삭 이력이 없습니다. 먼저 AI 코칭을 받아주세요.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {resumeEdits.map(edit => (
                        <button
                          key={edit.id}
                          type="button"
                          onClick={() => setSelectedEditId(edit.id)}
                          className={[
                            'w-full text-left flex items-center justify-between px-3 py-2 rounded-lg border transition-colors text-sm',
                            selectedEditId === edit.id
                              ? 'border-emerald-500/50 bg-emerald-900/10 text-zinc-100'
                              : 'border-zinc-700/50 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300',
                          ].join(' ')}
                        >
                          <span className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              edit.mode === 'targeted'
                                ? 'bg-emerald-900/50 text-emerald-400'
                                : 'bg-zinc-700 text-zinc-400'
                            }`}>
                              {edit.targetPosition?.company ?? '일반'}
                            </span>
                            <span className="text-xs text-zinc-500">{formatDate(edit.createdAt)}</span>
                          </span>
                          {edit.overallScore !== null && (
                            <span className="text-xs text-zinc-400">{edit.overallScore}/10</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Position */}
          {step === 'position' && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-400">
                포지션을 선택하면 JD 키워드에 맞춰 이력서가 최적화됩니다. 선택하지 않아도 됩니다.
              </p>
              {loadingData ? (
                <div className="flex items-center gap-2 py-3">
                  <div className="w-4 h-4 border-2 border-zinc-600 border-t-emerald-500 rounded-full animate-spin" />
                  <span className="text-xs text-zinc-500">로딩 중...</span>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedPositionId(null)}
                    className={[
                      'w-full text-left px-3 py-2 rounded-lg border transition-colors text-sm',
                      selectedPositionId === null
                        ? 'border-emerald-500/50 bg-emerald-900/10 text-zinc-100'
                        : 'border-zinc-700/50 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300',
                    ].join(' ')}
                  >
                    선택 안함 (일반 이력서)
                  </button>
                  {positions.map(pos => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => setSelectedPositionId(pos.id)}
                      className={[
                        'w-full text-left px-3 py-2 rounded-lg border transition-colors',
                        selectedPositionId === pos.id
                          ? 'border-emerald-500/50 bg-emerald-900/10'
                          : 'border-zinc-700/50 bg-zinc-800/50 hover:bg-zinc-800',
                      ].join(' ')}
                    >
                      <p className="text-sm font-medium text-zinc-100">{pos.company}</p>
                      <p className="text-xs text-zinc-400">{pos.position}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Template */}
          {step === 'template' && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-400">이력서 스타일을 선택하세요.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(['clean-modern', 'professional', 'executive'] as TemplateType[]).map(t => (
                  <ResumeTemplateCard
                    key={t}
                    template={t}
                    selected={template === t}
                    onSelect={setTemplate}
                  />
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-zinc-400">출력 형식</p>
                <div className="flex gap-2">
                  {(['pdf', 'docx', 'both'] as OutputFormat[]).map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFormat(f)}
                      className={[
                        'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                        format === f
                          ? 'border-emerald-500 bg-emerald-900/20 text-emerald-400'
                          : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700',
                      ].join(' ')}
                    >
                      {f === 'both' ? 'PDF + DOCX' : f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              {generating ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                  <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-zinc-400">이력서를 생성하고 있습니다...</p>
                  <p className="text-xs text-zinc-500">PDF 생성에 약 5~10초 소요됩니다</p>
                </div>
              ) : result ? (
                <>
                  <ResumePreview documentId={result.documentId} className="w-full" />
                  <div className="flex gap-2 justify-center flex-wrap">
                    {(format === 'pdf' || format === 'both') && (
                      <button
                        onClick={() => handleDownload('pdf')}
                        disabled={downloadingFormat === 'pdf'}
                        className="px-5 py-2.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        {downloadingFormat === 'pdf' ? '다운로드 중...' : 'PDF 다운로드'}
                      </button>
                    )}
                    {(format === 'docx' || format === 'both') && (
                      <button
                        onClick={() => handleDownload('docx')}
                        disabled={downloadingFormat === 'docx'}
                        className="px-5 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {downloadingFormat === 'docx' ? '다운로드 중...' : 'DOCX 다운로드'}
                      </button>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between px-6 py-4 border-t border-zinc-700 bg-zinc-900/95 backdrop-blur-sm">
          <div className="flex gap-2">
            {step !== 'source' && step !== 'preview' && (
              <button
                onClick={() => {
                  const prev = STEPS[stepIndex - 1];
                  if (prev) setStep(prev);
                }}
                className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors"
              >
                이전
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors"
            >
              닫기
            </button>
          </div>

          <div>
            {step === 'template' ? (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {generating ? '생성 중...' : '이력서 생성'}
              </button>
            ) : step !== 'preview' ? (
              <button
                onClick={() => {
                  const next = STEPS[stepIndex + 1];
                  if (next) setStep(next);
                }}
                disabled={!canProceed()}
                className="px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                다음
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
