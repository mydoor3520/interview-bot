'use client';

import { useState, useEffect, useMemo } from 'react';
import { ResumeEditModal } from './ResumeEditModal';
import { useSelection } from '@/hooks/useSelection';

interface ResumeEditSummary {
  id: string;
  mode: 'general' | 'targeted';
  overallScore: number | null;
  overallFeedback: string | null;
  version: number;
  createdAt: string;
  targetPositionId: string | null;
  targetPosition: { company: string; position: string } | null;
}

interface EditGroup {
  key: string;
  label: string;
  items: ResumeEditSummary[];
  latestVersion: number;
  latestScore: number | null;
}

interface ResumeEditHistoryProps {
  targetPositionId?: string;
}

export function ResumeEditHistory({ targetPositionId }: ResumeEditHistoryProps) {
  const [edits, setEdits] = useState<ResumeEditSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEditData, setSelectedEditData] = useState<any>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const selection = useSelection();

  useEffect(() => {
    fetchEdits();
  }, [targetPositionId]);

  async function fetchEdits() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (targetPositionId) params.set('targetPositionId', targetPositionId);
      const res = await fetch(`/api/resume-edit?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEdits(data.edits || []);
      }
    } catch (err) {
      console.error('Failed to fetch resume edits:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleViewEdit(id: string) {
    try {
      const res = await fetch(`/api/resume-edit/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedEditData(data.edit);
      }
    } catch (err) {
      console.error('Failed to fetch edit detail:', err);
    }
  }

  async function handleBatchDelete() {
    const ids = Array.from(selection.selectedIds);
    setBatchDeleting(true);
    try {
      const res = await fetch('/api/resume-edit/batch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        setEdits(prev => prev.filter(e => !selection.selectedIds.has(e.id)));
        selection.clear();
        setShowDeleteConfirm(false);
      } else {
        fetchEdits();
      }
    } catch {
      fetchEdits();
    } finally {
      setBatchDeleting(false);
    }
  }

  const groups = useMemo<EditGroup[]>(() => {
    const map = new Map<string, ResumeEditSummary[]>();
    for (const edit of edits) {
      const key = edit.targetPositionId || 'general';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(edit);
    }

    const result: EditGroup[] = [];
    for (const [key, items] of map.entries()) {
      const sorted = [...items].sort((a, b) => b.version - a.version);
      const latest = sorted[0];
      let label: string;
      if (key === 'general') {
        label = '일반';
      } else {
        const tp = latest.targetPosition;
        label = tp ? `${tp.company} - ${tp.position}` : key;
      }
      result.push({
        key,
        label,
        items: sorted,
        latestVersion: latest.version,
        latestScore: latest.overallScore,
      });
    }

    // Sort groups by most recently active (latest createdAt in group)
    result.sort((a, b) => {
      const aLatest = Math.max(...a.items.map(i => new Date(i.createdAt).getTime()));
      const bLatest = Math.max(...b.items.map(i => new Date(i.createdAt).getTime()));
      return bLatest - aLatest;
    });

    return result;
  }, [edits]);

  // Expand first group by default
  useEffect(() => {
    if (groups.length > 0 && expandedGroups.size === 0) {
      setExpandedGroups(new Set([groups[0].key]));
    }
  }, [groups]);

  function toggleGroup(key: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function getScoreColor(score: number | null): string {
    if (!score) return 'text-zinc-500';
    if (score >= 8) return 'text-green-400';
    if (score >= 6) return 'text-yellow-400';
    if (score >= 4) return 'text-orange-400';
    return 'text-red-400';
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

  if (edits.length === 0) {
    return (
      <p className="text-sm text-zinc-500 py-2">아직 첨삭 이력이 없습니다.</p>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {groups.map(group => {
          const expanded = expandedGroups.has(group.key);
          const groupItemIds = group.items.map(i => i.id);

          return (
            <div key={group.key}>
              {/* Group header */}
              <div
                role="button"
                aria-expanded={expanded}
                onClick={() => toggleGroup(group.key)}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800/30 cursor-pointer hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {/* Chevron */}
                  <svg
                    className={`w-4 h-4 text-zinc-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>

                  {/* Position badge */}
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    group.key !== 'general'
                      ? 'bg-emerald-900/50 text-emerald-400'
                      : 'bg-zinc-700 text-zinc-400'
                  }`}>
                    {group.label}
                  </span>

                  <span className="text-xs text-zinc-500">({group.items.length}건)</span>
                  <span className="text-xs text-zinc-600">
                    최신: v{group.latestVersion} ({group.latestScore ?? '-'}/10)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Group select checkbox */}
                  <input
                    type="checkbox"
                    checked={selection.isGroupAllSelected(groupItemIds)}
                    onChange={(e) => {
                      e.stopPropagation();
                      selection.toggleGroup(groupItemIds);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 accent-emerald-500"
                  />
                </div>
              </div>

              {/* Group items */}
              {expanded && (
                <div className="mt-1 space-y-1">
                  {group.items.map(edit => (
                    <div key={edit.id} className="flex items-center gap-2 ml-4">
                      {/* Item checkbox */}
                      <input
                        type="checkbox"
                        checked={selection.isSelected(edit.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          selection.toggle(edit.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 accent-emerald-500 shrink-0"
                      />

                      {/* Row button */}
                      <button
                        onClick={() => handleViewEdit(edit.id)}
                        className="flex-1 flex items-center justify-between px-4 py-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600/50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-zinc-300">v{edit.version}</span>
                          <span className="text-xs text-zinc-500">{formatDate(edit.createdAt)}</span>
                        </div>
                        <span className={`text-sm font-bold ${getScoreColor(edit.overallScore)}`}>
                          {edit.overallScore ? `${edit.overallScore}/10` : '-'}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Action Bar */}
      {selection.count > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center">
          <div className="flex items-center gap-4 px-6 py-3 rounded-t-xl bg-zinc-800 border border-zinc-700 border-b-0 shadow-2xl">
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={selection.isAllSelected(edits.map(e => e.id))}
                onChange={() => selection.toggleAll(edits.map(e => e.id))}
                className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 accent-emerald-500"
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
              className="px-4 py-1.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
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
              {selection.count}개의 항목을 삭제하시겠습니까?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg text-sm bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
              >
                취소
              </button>
              <button
                onClick={handleBatchDelete}
                disabled={batchDeleting}
                className="px-4 py-2 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {batchDeleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedEditData && (
        <ResumeEditModal
          isOpen={!!selectedEditData}
          onClose={() => {
            setSelectedEditData(null);
          }}
          existingEdit={{
            id: selectedEditData.id,
            sections: selectedEditData.sections,
            overallScore: selectedEditData.overallScore,
            overallFeedback: selectedEditData.overallFeedback,
            keywordMatch: selectedEditData.keywordMatch,
            version: selectedEditData.version,
            mode: selectedEditData.mode,
            targetPosition: selectedEditData.targetPosition,
            createdAt: selectedEditData.createdAt,
          }}
        />
      )}
    </>
  );
}
