'use client';

import { useState, useEffect } from 'react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  displayType: 'BANNER' | 'POPUP';
}

interface AnnouncementBannerProps {
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

export function AnnouncementBanner({ announcements }: AnnouncementBannerProps) {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    setDismissedIds(getDismissedIds());

    const handler = (e: StorageEvent) => {
      if (e.key === DISMISSED_KEY) setDismissedIds(getDismissedIds());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const banners = announcements.filter(
    (a) => a.displayType === 'BANNER' && !dismissedIds.includes(a.id)
  );

  if (banners.length === 0) return null;

  const dismiss = (id: string) => {
    const updated = [...dismissedIds, id];
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(updated));
    setDismissedIds(updated);
  };

  return (
    <div className="space-y-0">
      {banners.map((a) => (
        <div
          key={a.id}
          className="bg-blue-600/90 text-white px-4 py-2 flex items-center justify-between text-sm"
        >
          <div className="flex-1 min-w-0">
            <span className="font-medium mr-2">{a.title}</span>
            <span className="opacity-90">{a.content}</span>
          </div>
          <button
            onClick={() => dismiss(a.id)}
            className="ml-4 flex-shrink-0 p-1 hover:bg-blue-700 rounded transition-colors"
            aria-label="닫기"
          >
            <svg
              className="w-4 h-4"
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
        </div>
      ))}
    </div>
  );
}
