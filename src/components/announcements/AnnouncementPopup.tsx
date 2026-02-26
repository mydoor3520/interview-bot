'use client';

import { useState, useEffect } from 'react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  displayType: 'BANNER' | 'POPUP';
}

interface AnnouncementPopupProps {
  announcements: Announcement[];
}

const DISMISSED_KEY = 'dismissed-announcements';

function getDismissedIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
  } catch {
    return [];
  }
}

export function AnnouncementPopup({ announcements }: AnnouncementPopupProps) {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    setDismissedIds(getDismissedIds());

    const handler = (e: StorageEvent) => {
      if (e.key === DISMISSED_KEY) setDismissedIds(getDismissedIds());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const popups = announcements.filter(
    (a) => a.displayType === 'POPUP' && !dismissedIds.includes(a.id)
  );

  if (popups.length === 0) return null;

  const current = popups[0];

  const dismiss = (id: string) => {
    const updated = [...dismissedIds, id];
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(updated));
    setDismissedIds(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/60"
        onClick={() => dismiss(current.id)}
      />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <button
          onClick={() => dismiss(current.id)}
          className="absolute top-3 right-3 p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
          aria-label="닫기"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <h3 className="text-lg font-semibold text-white mb-2 pr-6">
          {current.title}
        </h3>
        <p className="text-zinc-400 text-sm mb-6 whitespace-pre-wrap">
          {current.content}
        </p>
        <button
          onClick={() => dismiss(current.id)}
          className="w-full px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          확인
        </button>
      </div>
    </div>
  );
}
