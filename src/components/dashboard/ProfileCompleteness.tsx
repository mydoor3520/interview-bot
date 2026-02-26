'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface CompletenessItem {
  label: string;
  completed: boolean;
}

interface CompletenessData {
  percentage: number;
  items: CompletenessItem[];
}

export default function ProfileCompleteness() {
  const router = useRouter();
  const [data, setData] = useState<CompletenessData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompleteness = async () => {
      try {
        const res = await fetch('/api/profile/completeness');
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (error) {
        console.error('Failed to fetch profile completeness:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompleteness();
  }, []);

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-zinc-800 rounded w-1/3 mb-4"></div>
        <div className="h-24 bg-zinc-800 rounded"></div>
      </div>
    );
  }

  if (!data) return null;

  const isComplete = data.percentage === 100;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">프로필 완성도</h2>
        <span className="text-2xl font-bold text-blue-400">{data.percentage}%</span>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out"
            style={{ width: `${data.percentage}%` }}
          />
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-3 mb-6">
        {data.items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <div
              className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                item.completed
                  ? 'bg-green-500/20 border border-green-500'
                  : 'bg-zinc-800 border border-zinc-700'
              }`}
            >
              {item.completed && (
                <svg
                  className="w-3 h-3 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
            <span
              className={`text-sm ${
                item.completed ? 'text-zinc-300' : 'text-zinc-500'
              }`}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Message & CTA */}
      {isComplete ? (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <p className="text-green-400 text-sm font-medium text-center">
            프로필이 완성되었습니다!
          </p>
        </div>
      ) : (
        <div>
          <button
            onClick={() => router.push('/profile')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors mb-3"
          >
            프로필 완성하기
          </button>
          <p className="text-xs text-zinc-500 text-center">
            프로필을 완성하면 더 정확한 맞춤 면접을 받을 수 있어요
          </p>
        </div>
      )}
    </div>
  );
}
