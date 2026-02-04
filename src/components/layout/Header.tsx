'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
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
};

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('loading');

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
      } catch (error) {
        console.error('Health check failed:', error);
        setHealthStatus('disconnected');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

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

  return (
    <header className="sticky top-0 z-30 h-16 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Left section */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Page title */}
          <h2 className="text-lg font-semibold text-white">
            {getPageTitle()}
          </h2>
        </div>

        {/* Right section - Health indicator */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              healthStatusColors[healthStatus]
            )}
            title={healthStatusLabels[healthStatus]}
          />
          <span className="hidden sm:inline text-sm text-zinc-400">
            {healthStatusLabels[healthStatus]}
          </span>
        </div>
      </div>
    </header>
  );
}
