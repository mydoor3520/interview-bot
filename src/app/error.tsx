'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-red-400 mb-4">오류가 발생했습니다</h2>
        <div className="bg-zinc-950 border border-zinc-800 rounded p-4 mb-4 overflow-auto max-h-60">
          <p className="text-sm text-zinc-300 font-mono whitespace-pre-wrap">
            {error.message}
          </p>
          {error.digest && (
            <p className="text-xs text-zinc-500 mt-2">Digest: {error.digest}</p>
          )}
        </div>
        <button
          onClick={reset}
          className="px-4 py-2 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 transition-colors text-sm"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
