'use client';

import { useEffect, useState } from 'react';

interface ServiceHealth {
  status: 'ok' | 'down' | 'degraded' | 'not_configured';
  latencyMs?: number;
  error?: string;
}

interface HealthCheckData {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  version: string;
  services: {
    database?: ServiceHealth;
    redis?: ServiceHealth;
    aiProxy?: ServiceHealth;
    stripe?: ServiceHealth;
  };
  environment?: {
    nodeEnv: string;
    aiModel: string;
    emailService: string;
    adminIpWhitelist: boolean;
  };
}

export default function SettingsPage() {
  const [health, setHealth] = useState<HealthCheckData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error('헬스 체크 실패');
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: ServiceHealth['status']) => {
    switch (status) {
      case 'ok':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'down':
        return 'bg-red-500';
      case 'not_configured':
        return 'bg-zinc-500';
      default:
        return 'bg-zinc-500';
    }
  };

  const getStatusText = (status: ServiceHealth['status']) => {
    switch (status) {
      case 'ok':
        return '정상';
      case 'degraded':
        return '저하됨';
      case 'down':
        return '연결 실패';
      case 'not_configured':
        return '미설정';
      default:
        return '알 수 없음';
    }
  };

  const renderServiceCard = (
    name: string,
    service: ServiceHealth | undefined,
    icon: string
  ) => {
    if (!service) return null;

    return (
      <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{icon}</div>
            <h3 className="text-lg font-semibold text-white">{name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${getStatusColor(service.status)}`}
            />
            <span className="text-sm text-zinc-400">
              {getStatusText(service.status)}
            </span>
          </div>
        </div>

        {service.latencyMs !== undefined && (
          <div className="text-sm text-zinc-400">
            응답 시간: <span className="text-white">{service.latencyMs}ms</span>
          </div>
        )}

        {service.error && (
          <div className="mt-2 text-sm text-red-400 bg-red-900/20 rounded px-3 py-2">
            {service.error}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">시스템 설정</h1>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="px-4 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 text-white rounded-lg transition-colors"
        >
          {loading ? '새로고침 중...' : '새로고침'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* System Health */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">시스템 상태</h2>

        {health && (
          <div className="mb-4 p-4 bg-zinc-800 rounded-lg border border-zinc-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full ${getStatusColor(health.status)}`}
                />
                <span className="text-lg font-medium text-white">
                  전체 상태: {getStatusText(health.status)}
                </span>
              </div>
              <div className="text-sm text-zinc-400">
                버전: {health.version} | 마지막 업데이트:{' '}
                {new Date(health.timestamp).toLocaleString('ko-KR')}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {health?.services.database &&
            renderServiceCard('데이터베이스', health.services.database, '🗄️')}
          {health?.services.redis &&
            renderServiceCard('Redis 캐시', health.services.redis, '⚡')}
          {health?.services.aiProxy &&
            renderServiceCard('AI 프록시', health.services.aiProxy, '🤖')}
          {health?.services.stripe &&
            renderServiceCard('Stripe 결제', health.services.stripe, '💳')}
        </div>
      </div>

      {/* Environment Info */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">환경 정보</h2>
        <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-zinc-400 mb-1">실행 환경</div>
              <div className="text-white font-medium">
                {health?.environment?.nodeEnv || '로딩 중...'}
              </div>
            </div>

            <div>
              <div className="text-sm text-zinc-400 mb-1">AI 모델</div>
              <div className="text-white font-medium">
                {health?.environment?.aiModel || '로딩 중...'}
              </div>
            </div>

            <div>
              <div className="text-sm text-zinc-400 mb-1">데이터베이스</div>
              <div className="text-white font-medium">
                {health?.services.database?.status === 'ok'
                  ? '연결됨'
                  : '연결 안 됨'}
              </div>
            </div>

            <div>
              <div className="text-sm text-zinc-400 mb-1">Redis 캐시</div>
              <div className="text-white font-medium">
                {health?.services.redis?.status === 'ok'
                  ? '설정됨'
                  : health?.services.redis?.status === 'not_configured'
                    ? '미설정 (메모리 캐시 사용)'
                    : '연결 안 됨'}
              </div>
            </div>

            <div>
              <div className="text-sm text-zinc-400 mb-1">이메일 서비스</div>
              <div className="text-white font-medium">
                {health?.environment?.emailService === 'resend'
                  ? 'Resend 설정됨'
                  : '콘솔 폴백'}
              </div>
            </div>

            <div>
              <div className="text-sm text-zinc-400 mb-1">관리자 IP 화이트리스트</div>
              <div className="text-white font-medium">
                {health?.environment?.adminIpWhitelist ? '활성화' : '비활성화'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
