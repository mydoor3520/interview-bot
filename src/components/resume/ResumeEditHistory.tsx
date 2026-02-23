'use client';

import { useState, useEffect } from 'react';
import { ResumeEditModal } from './ResumeEditModal';

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

interface ResumeEditHistoryProps {
  targetPositionId?: string;
}

export function ResumeEditHistory({ targetPositionId }: ResumeEditHistoryProps) {
  const [edits, setEdits] = useState<ResumeEditSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEditId, setSelectedEditId] = useState<string | null>(null);
  const [selectedEditData, setSelectedEditData] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/resume-edit/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEdits(prev => prev.filter(e => e.id !== id));
        setConfirmDeleteId(null);
      }
    } catch (err) {
      console.error('Failed to delete resume edit:', err);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleViewEdit(id: string) {
    setLoadingDetail(true);
    setSelectedEditId(id);
    try {
      const res = await fetch(`/api/resume-edit/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedEditData(data.edit);
      }
    } catch (err) {
      console.error('Failed to fetch edit detail:', err);
    } finally {
      setLoadingDetail(false);
    }
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
        {edits.map(edit => (
          <div key={edit.id} className="relative">
            {confirmDeleteId === edit.id ? (
              <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-red-950/30 border border-red-900/50">
                <span className="text-sm text-red-300">삭제하시겠습니까?</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDelete(edit.id)}
                    disabled={deletingId === edit.id}
                    className="px-3 py-1 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deletingId === edit.id ? '삭제 중...' : '삭제'}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-3 py-1 rounded text-xs font-medium bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleViewEdit(edit.id)}
                  className="flex-1 flex items-center justify-between px-4 py-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      edit.mode === 'targeted'
                        ? 'bg-emerald-900/50 text-emerald-400'
                        : 'bg-zinc-700 text-zinc-400'
                    }`}>
                      {edit.mode === 'targeted' && edit.targetPosition
                        ? edit.targetPosition.company
                        : '일반'}
                    </span>
                    <span className="text-sm text-zinc-300">v{edit.version}</span>
                    <span className="text-xs text-zinc-500">{formatDate(edit.createdAt)}</span>
                  </div>
                  <span className={`text-sm font-bold ${getScoreColor(edit.overallScore)}`}>
                    {edit.overallScore ? `${edit.overallScore}/10` : '-'}
                  </span>
                </button>
                <button
                  onClick={() => setConfirmDeleteId(edit.id)}
                  className="shrink-0 p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                  title="삭제"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedEditData && (
        <ResumeEditModal
          isOpen={!!selectedEditData}
          onClose={() => {
            setSelectedEditId(null);
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
