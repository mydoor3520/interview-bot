'use client';

import Link from 'next/link';

interface UpgradePromptProps {
  currentTier: string;
  sessionsUsed: number;
  sessionLimit: number;
}

export function UpgradePrompt({ currentTier, sessionsUsed, sessionLimit }: UpgradePromptProps) {
  if (currentTier !== 'FREE' || sessionsUsed < sessionLimit) return null;

  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950/50">
      <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
        월간 세션 한도에 도달했습니다
      </h3>
      <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
        이번 달 {sessionLimit}개의 무료 세션을 모두 사용했습니다. 무료 베타 기간 중이며, 다음 달 1일에 초기화됩니다.
      </p>
      <Link
        href="/pricing"
        className="mt-3 inline-block rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-yellow-500 dark:bg-yellow-500 dark:hover:bg-yellow-400"
      >
        더 알아보기
      </Link>
    </div>
  );
}
