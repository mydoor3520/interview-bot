'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export function PublicNavbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!cancelled && data?.authenticated && data?.user) {
          setIsLoggedIn(true);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-slate-900">
          InterviewBot
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/pricing"
            className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            요금제
          </Link>
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              대시보드
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                무료로 시작
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
