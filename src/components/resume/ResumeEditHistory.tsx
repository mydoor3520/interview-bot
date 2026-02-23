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
          <button
            key={edit.id}
            onClick={() => handleViewEdit(edit.id)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600/50 transition-colors text-left"
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
