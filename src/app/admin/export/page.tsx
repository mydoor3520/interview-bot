'use client';

import { useState } from 'react';

type ExportType = 'users' | 'sessions' | 'revenue' | 'ai-usage';

interface ExportOption {
  type: ExportType;
  label: string;
  description: string;
  icon: string;
}

const exportOptions: ExportOption[] = [
  {
    type: 'users',
    label: '사용자 데이터',
    description: '사용자 계정 정보, 구독 정보, 활동 내역',
    icon: '👥',
  },
  {
    type: 'sessions',
    label: '면접 세션',
    description: '면접 세션 내역, 점수, 난이도, 주제',
    icon: '💼',
  },
  {
    type: 'revenue',
    label: '매출/결제',
    description: '결제 내역, 금액, 상태',
    icon: '💰',
  },
  {
    type: 'ai-usage',
    label: 'AI 사용량',
    description: 'AI API 호출 내역, 토큰, 비용',
    icon: '🤖',
  },
];

export default function ExportPage() {
  const [selectedType, setSelectedType] = useState<ExportType | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [estimatedCount, setEstimatedCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate max date (today) and default from date (30 days ago)
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Set defaults on first render
  if (!dateFrom && !dateTo) {
    setDateFrom(thirtyDaysAgo);
    setDateTo(today);
  }

  const handleCheckCount = async () => {
    if (!selectedType || !dateFrom || !dateTo) {
      setError('내보내기 유형과 날짜 범위를 선택해주세요.');
      return;
    }

    // Validate date range (max 90 days)
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays < 0) {
      setError('종료일은 시작일 이후여야 합니다.');
      return;
    }

    if (diffDays > 90) {
      setError('최대 90일까지 선택 가능합니다.');
      return;
    }

    setLoading(true);
    setError(null);
    setEstimatedCount(null);

    try {
      const params = new URLSearchParams({
        type: selectedType,
        dateFrom,
        dateTo,
        countOnly: 'true',
      });
      const res = await fetch(`/api/admin/export?${params}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '예상 건수를 확인할 수 없습니다.');
        return;
      }

      setEstimatedCount(data.count);
    } catch (err) {
      console.error('Count check error:', err);
      setError('예상 건수 확인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!selectedType || !dateFrom || !dateTo) {
      setError('내보내기 유형과 날짜 범위를 선택해주세요.');
      return;
    }

    // Validate date range
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays < 0) {
      setError('종료일은 시작일 이후여야 합니다.');
      return;
    }

    if (diffDays > 90) {
      setError('최대 90일까지 선택 가능합니다.');
      return;
    }

    setError(null);

    // Trigger download
    const params = new URLSearchParams({
      type: selectedType,
      dateFrom,
      dateTo,
    });
    const url = `/api/admin/export?${params}`;

    // Create temporary anchor element
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedType}_${dateFrom}_${dateTo}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">데이터 내보내기</h1>
        <p className="text-sm text-zinc-400 mt-1">
          선택한 기간의 데이터를 CSV 형식으로 내보낼 수 있습니다.
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg text-sm font-medium bg-red-500/15 text-red-400 border border-red-500/30">
          {error}
        </div>
      )}

      {/* Export type selector - Card-based UI */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-3">
          내보내기 유형 선택
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {exportOptions.map((option) => (
            <button
              key={option.type}
              onClick={() => {
                setSelectedType(option.type);
                setEstimatedCount(null);
                setError(null);
              }}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                selectedType === option.type
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
              }`}
            >
              <div className="text-3xl mb-2">{option.icon}</div>
              <div className="text-base font-semibold text-zinc-100 mb-1">
                {option.label}
              </div>
              <div className="text-xs text-zinc-400">
                {option.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Date range picker */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-3">
          기간 선택 (최대 90일)
        </label>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs text-zinc-500 mb-1">시작일</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setEstimatedCount(null);
                setError(null);
              }}
              max={today}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-zinc-500 mb-1">종료일</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setEstimatedCount(null);
                setError(null);
              }}
              max={today}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleCheckCount}
          disabled={loading || !selectedType}
          className="px-6 py-3 bg-zinc-700 text-zinc-100 rounded-lg font-medium hover:bg-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '확인 중...' : '예상 건수 확인'}
        </button>
        <button
          onClick={handleExport}
          disabled={!selectedType || estimatedCount === null}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          CSV 내보내기
        </button>
      </div>

      {/* Estimated count display */}
      {estimatedCount !== null && (
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <div className="text-sm text-blue-400">
            예상 내보내기 건수: <span className="font-semibold text-blue-300">{estimatedCount.toLocaleString()}건</span>
          </div>
        </div>
      )}

      {/* Info box */}
      <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
        <h3 className="text-sm font-semibold text-zinc-300 mb-2">참고사항</h3>
        <ul className="space-y-1 text-xs text-zinc-400">
          <li>- CSV 파일은 UTF-8 인코딩으로 저장되며, Excel에서 한글이 정상적으로 표시됩니다.</li>
          <li>- 최대 90일 범위의 데이터를 내보낼 수 있습니다.</li>
          <li>- 대량의 데이터는 스트리밍 방식으로 처리되어 메모리 효율적입니다.</li>
          <li>- 모든 내보내기 작업은 감사 로그에 기록됩니다.</li>
        </ul>
      </div>
    </div>
  );
}
