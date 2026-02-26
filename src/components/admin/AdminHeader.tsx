'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils/cn';

const pageNames: Record<string, string> = {
  '/admin': '대시보드',
  '/admin/users': '사용자 관리',
  '/admin/revenue': '매출/결제',
  '/admin/sessions': '면접 세션',
  '/admin/feedback': '피드백 관리',
  '/admin/announcements': '알림/공지',
  '/admin/ai-usage': 'AI 비용 추적',
  '/admin/email': '이메일 발송',
  '/admin/export': '데이터 내보내기',
  '/admin/logs': '감사 로그',
  '/admin/settings': '시스템 설정',
};

interface AdminHeaderProps {
  onMenuClick: () => void;
  userName?: string | null;
  userEmail?: string;
  userTier?: string;
}

export function AdminHeader({ onMenuClick, userName, userEmail, userTier }: AdminHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);

  const getPageTitle = () => {
    return pageNames[pathname] || '관리자';
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) router.push('/login');
    } catch {}
  };

  const userInitial = userName ? userName[0].toUpperCase() : userEmail ? userEmail[0].toUpperCase() : '?';

  return (
    <header className="sticky top-0 z-30 h-16 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Left section */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-white">{getPageTitle()}</h2>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-4">
          {/* Admin badge */}
          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
            ADMIN
          </span>

          {/* Tier badge */}
          {userTier && (
            <span className={cn(
              'px-2 py-0.5 text-xs font-semibold rounded-full',
              userTier === 'PRO'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-zinc-700/50 text-zinc-400'
            )}>
              {userTier}
            </span>
          )}

          {/* User avatar + dropdown */}
          {userEmail && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-8 h-8 rounded-full bg-zinc-700 text-white text-sm font-medium flex items-center justify-center hover:bg-zinc-600 transition-colors"
              >
                {userInitial}
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 z-50">
                  <div className="px-4 py-2 border-b border-zinc-700">
                    <p className="text-sm text-white font-medium truncate">{userName || userEmail}</p>
                    {userName && (
                      <p className="text-xs text-zinc-400 truncate">{userEmail}</p>
                    )}
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                  >
                    프로필
                  </Link>
                  <Link
                    href="/billing"
                    onClick={() => setDropdownOpen(false)}
                    className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                  >
                    결제 관리
                  </Link>
                  <Link
                    href="/dashboard"
                    onClick={() => setDropdownOpen(false)}
                    className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                  >
                    메인으로 돌아가기
                  </Link>
                  <div className="border-t border-zinc-700 my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
