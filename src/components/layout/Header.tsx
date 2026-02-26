'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils/cn';

type HealthStatus = 'ok' | 'degraded' | 'disconnected' | 'loading';

const pageNames: Record<string, string> = {
  '/dashboard': '대시보드',
  '/interview': '면접 시작',
  '/history': '히스토리',
  '/topics': '주제 관리',
  '/review': '복습',
  '/profile': '프로필',
  '/profile/onboarding': '프로필 설정',
  '/positions': '지원 포지션',
  '/analytics': '분석',
  '/billing': '결제 관리',
  '/pricing': '요금제',
};

interface HeaderProps {
  onMenuClick: () => void;
  userName?: string | null;
  userEmail?: string;
  userTier?: string;
  isAdmin?: boolean;
}

export function Header({ onMenuClick, userName, userEmail, userTier, isAdmin }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('loading');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        if (response.ok) {
          setHealthStatus(data.status === 'ok' ? 'ok' : 'degraded');
        } else {
          setHealthStatus('disconnected');
        }
      } catch {
        setHealthStatus('disconnected');
      }
    };

    checkHealth();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkHealth();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
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
    return pageNames[pathname] || '면접 봇';
  };

  const healthStatusColors = {
    ok: 'bg-green-500',
    degraded: 'bg-yellow-500',
    disconnected: 'bg-red-500',
    loading: 'bg-zinc-500',
  };

  const healthStatusLabels = {
    ok: '정상',
    degraded: '주의',
    disconnected: '연결 끊김',
    loading: '확인 중',
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
          {/* Health indicator */}
          <div className="flex items-center gap-2">
            <div
              className={cn('w-2 h-2 rounded-full', healthStatusColors[healthStatus])}
              title={healthStatusLabels[healthStatus]}
            />
            <span className="hidden sm:inline text-sm text-zinc-400">
              {healthStatusLabels[healthStatus]}
            </span>
          </div>

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
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-2 text-sm text-amber-400 hover:bg-zinc-700 hover:text-amber-300 transition-colors"
                    >
                      관리자 패널
                    </Link>
                  )}
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
