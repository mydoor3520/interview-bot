'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSelection } from '@/hooks/useSelection';

interface ResumeDocumentSummary {
  id: string;
  template: string;
  sourceType: 'profile' | 'coaching';
  language: string;
  status: string;
  createdAt: string;
  targetPositionId: string | null;
  targetPosition: { company: string; position: string } | null;
}

interface DocGroup {
  key: string;
  label: string;
  items: ResumeDocumentSummary[];
  latestSummary: string;
}

const TEMPLATE_LABELS: Record<string, string> = {
  'clean-modern': '클린 모던',
  'professional': '프로페셔널',
  'executive': '이그제큐티브',
};

export function ResumeHistory() {
  const [documents, setDocuments] = useState<ResumeDocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const selection = useSelection();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const groups = useMemo<DocGroup[]>(() => {
    const groupMap = new Map<string, ResumeDocumentSummary[]>();

    for (const doc of documents) {
      const key = doc.targetPositionId || 'general';
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(doc);
    }

    const result: DocGroup[] = [];

    for (const [key, items] of groupMap.entries()) {
      const sorted = [...items].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const first = sorted[0];
      const label =
        key === 'general'
          ? '일반'
          : first.targetPosition
          ? `${first.targetPosition.company} - ${first.targetPosition.position}`
          : key;

      const latestSummary =
        (TEMPLATE_LABELS[first.template] ?? first.template) +
        (first.sourceType === 'coaching' ? ' AI 개선본' : ' 원본');

      result.push({ key, label, items: sorted, latestSummary });
    }

    result.sort(
      (a, b) =>
        new Date(b.items[0].createdAt).getTime() -
        new Date(a.items[0].createdAt).getTime()
    );

    return result;
  }, [documents]);

  useEffect(() => {
    if (groups.length > 0 && expandedGroups.size === 0) {
      setExpandedGroups(new Set([groups[0].key]));
    }
  }, [groups]);

  async function fetchDocuments() {
    setLoading(true);
    try {
      const res = await fetch('/api/resume');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Failed to fetch resume documents:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(id: string, format: 'pdf' | 'docx') {
    setDownloadingId(`${id}-${format}`);
    try {
      const res = await fetch(`/api/resume/download/${id}?format=${format}`);
      if (!res.ok) {
        if (res.status === 503) {
          alert('서버가 바쁩니다. 잠시 후 다시 시도해주세요.');
        } else {
          alert('다운로드에 실패했습니다.');
        }
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume-${id}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('다운로드 중 오류가 발생했습니다.');
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleBatchDelete() {
    const ids = Array.from(selection.selectedIds);
    setBatchDeleting(true);
    try {
      const res = await fetch('/api/resume/batch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        setDocuments(prev => prev.filter(d => !selection.selectedIds.has(d.id)));
        selection.clear();
        setShowDeleteConfirm(false);
      } else {
        fetchDocuments();
      }
    } catch {
      fetchDocuments();
    } finally {
      setBatchDeleting(false);
    }
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="w-5 h-5 border-2 border-zinc-600 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <p className="text-sm text-zinc-500 py-2">아직 생성된 이력서가 없습니다.</p>
    );
  }

  return (
    <div className="space-y-2">
      {groups.map(group => {
        const expanded = expandedGroups.has(group.key);
        const groupIds = group.items.map(i => i.id);
        return (
          <div key={group.key} className="space-y-1">
            {/* Group header */}
            <div
              onClick={() =>
                setExpandedGroups(prev => {
                  const next = new Set(prev);
                  if (next.has(group.key)) next.delete(group.key);
                  else next.add(group.key);
                  return next;
                })
              }
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800/30 cursor-pointer hover:bg-zinc-800/50 transition-colors"
              aria-expanded={expanded}
            >
              <div className="flex items-center gap-2">
                <svg
                  className={`w-4 h-4 text-zinc-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    group.key !== 'general'
                      ? 'bg-emerald-900/50 text-emerald-400'
                      : 'bg-zinc-700 text-zinc-400'
                  }`}
                >
                  {group.label}
                </span>
                <span className="text-xs text-zinc-500">({group.items.length}건)</span>
                <span className="text-xs text-zinc-600">{group.latestSummary}</span>
              </div>
              <input
                type="checkbox"
                checked={selection.isGroupAllSelected(groupIds)}
                onChange={e => {
                  e.stopPropagation();
                  selection.toggleGroup(groupIds);
                }}
                className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 accent-emerald-500"
                onClick={e => e.stopPropagation()}
              />
            </div>

            {/* Items */}
            {expanded &&
              group.items.map(doc => (
                <div key={doc.id} className="flex items-center gap-2 ml-6">
                  <input
                    type="checkbox"
                    checked={selection.isSelected(doc.id)}
                    onChange={() => selection.toggle(doc.id)}
                    className="w-4 h-4 shrink-0 rounded border-zinc-600 bg-zinc-700 accent-emerald-500"
                  />
                  <div className="flex-1 flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                    {/* Left: metadata */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-zinc-700 text-zinc-300 shrink-0">
                        {TEMPLATE_LABELS[doc.template] ?? doc.template}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${
                          doc.sourceType === 'coaching'
                            ? 'bg-emerald-900/50 text-emerald-400'
                            : 'bg-zinc-700 text-zinc-400'
                        }`}
                      >
                        {doc.sourceType === 'coaching' ? 'AI 개선본' : '원본'}
                      </span>
                      <span className="text-xs text-zinc-600 shrink-0">
                        {formatDate(doc.createdAt)}
                      </span>
                    </div>
                    {/* Right: download buttons only (no individual delete) */}
                    <div className="flex items-center gap-1.5 shrink-0 ml-3">
                      <button
                        onClick={() => handleDownload(doc.id, 'pdf')}
                        disabled={downloadingId === `${doc.id}-pdf`}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors disabled:opacity-50"
                      >
                        {downloadingId === `${doc.id}-pdf` ? '...' : 'PDF'}
                      </button>
                      <button
                        onClick={() => handleDownload(doc.id, 'docx')}
                        disabled={downloadingId === `${doc.id}-docx`}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors disabled:opacity-50"
                      >
                        {downloadingId === `${doc.id}-docx` ? '...' : 'DOCX'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        );
      })}

      {/* Floating Action Bar */}
      {selection.count > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center">
          <div className="flex items-center gap-4 px-6 py-3 rounded-t-xl bg-zinc-800 border border-zinc-700 border-b-0 shadow-2xl">
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={selection.isAllSelected(documents.map(d => d.id))}
                onChange={() => selection.toggleAll(documents.map(d => d.id))}
                className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 accent-emerald-500"
              />
              전체 선택
            </label>
            <span className="text-sm text-zinc-400">{selection.count}개 선택됨</span>
            {selection.count > 50 && (
              <span className="text-xs text-amber-400">최대 50개까지 삭제 가능</span>
            )}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={batchDeleting || selection.count > 50}
              className="px-4 py-1.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              선택 삭제
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-sm mx-4">
            <p className="text-sm text-zinc-300 mb-4">
              {selection.count}개의 이력서를 삭제하시겠습니까?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg text-sm bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleBatchDelete}
                disabled={batchDeleting}
                className="px-4 py-2 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {batchDeleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
