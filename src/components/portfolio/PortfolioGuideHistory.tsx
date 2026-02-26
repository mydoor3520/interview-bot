'use client';

import { useState, useEffect } from 'react';
import { PortfolioGuideModal } from './PortfolioGuideModal';
import type { PortfolioStrategy } from '@/lib/portfolio/types';

interface GuideItem {
  id: string;
  mode: string;
  overallScore: number | null;
  overallFeedback: string | null;
  version: number;
  createdAt: string;
  targetPositionId: string | null;
  targetPosition: { company: string; position: string } | null;
}

interface FullGuide extends GuideItem {
  strategy: PortfolioStrategy;
}

interface PortfolioGuideHistoryProps {
  targetPositionId?: string;
  onRequestGuide?: () => void;
}

function getScoreColor(score: number | null): string {
  if (score == null) return 'text-zinc-500';
  if (score >= 8) return 'text-green-400';
  if (score >= 6) return 'text-yellow-400';
  if (score >= 4) return 'text-orange-400';
  return 'text-red-400';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function PortfolioGuideHistory({
  targetPositionId,
  onRequestGuide,
}: PortfolioGuideHistoryProps) {
  const [guides, setGuides] = useState<GuideItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuide, setSelectedGuide] = useState<FullGuide | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchGuides();
  }, [targetPositionId]);

  async function fetchGuides() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (targetPositionId) params.set('targetPositionId', targetPositionId);
      const res = await fetch(`/api/portfolio/guide?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setGuides(data.guides || []);
      }
    } catch (err) {
      console.error('Failed to fetch portfolio guides:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleViewGuide(id: string) {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/portfolio/guide/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedGuide(data.guide);
      }
    } catch (err) {
      console.error('Failed to fetch guide detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/portfolio/guide/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setGuides((prev) => prev.filter((g) => g.id !== id));
        setConfirmDeleteId(null);
      }
    } catch (err) {
      console.error('Failed to delete portfolio guide:', err);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="w-5 h-5 border-2 border-zinc-600 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (guides.length === 0 && !onRequestGuide) {
    return (
      <p className="text-sm text-zinc-500 py-2">아직 포트폴리오 가이드 이력이 없습니다.</p>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {/* Request guide button */}
        {onRequestGuide && (
          <div className="flex justify-end mb-3">
            <button
              onClick={onRequestGuide}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              가이드 받기
            </button>
          </div>
        )}

        {guides.length === 0 && (
          <p className="text-sm text-zinc-500 py-2">아직 포트폴리오 가이드 이력이 없습니다.</p>
        )}

        {guides.map((guide) => (
          <div key={guide.id} className="relative">
            {confirmDeleteId === guide.id ? (
              <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-red-950/30 border border-red-900/50">
                <span className="text-sm text-red-300">삭제하시겠습니까?</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDelete(guide.id)}
                    disabled={deletingId === guide.id}
                    className="px-3 py-1 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deletingId === guide.id ? '삭제 중...' : '삭제'}
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
                  onClick={() => handleViewGuide(guide.id)}
                  disabled={loadingDetail}
                  className="flex-1 flex items-center justify-between px-4 py-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600/50 transition-colors text-left disabled:opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        guide.mode === 'targeted'
                          ? 'bg-emerald-900/50 text-emerald-400'
                          : 'bg-zinc-700 text-zinc-400'
                      }`}
                    >
                      {guide.mode === 'targeted' && guide.targetPosition
                        ? guide.targetPosition.company
                        : '일반'}
                    </span>
                    <span className="text-sm text-zinc-300">v{guide.version}</span>
                    <span className="text-xs text-zinc-500">{formatDate(guide.createdAt)}</span>
                  </div>
                  <span className={`text-sm font-bold ${getScoreColor(guide.overallScore)}`}>
                    {guide.overallScore != null ? `${guide.overallScore}/10` : '-'}
                  </span>
                </button>
                <button
                  onClick={() => setConfirmDeleteId(guide.id)}
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

      {selectedGuide && (
        <PortfolioGuideModal
          isOpen={!!selectedGuide}
          onClose={() => setSelectedGuide(null)}
          guide={selectedGuide}
        />
      )}
    </>
  );
}
