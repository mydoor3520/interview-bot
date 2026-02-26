'use client';

import { useEffect, useState } from 'react';

type TabType = 'ai' | 'audit';

interface AILog {
  id: string;
  createdAt: string;
  sessionId: string | null;
  endpoint: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimated: boolean;
  durationMs: number | null;
  success: boolean;
  errorMessage: string | null;
}

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
}

interface AILogResponse {
  items: AILog[];
  nextCursor?: string;
  hasMore: boolean;
}

interface AuditLogResponse {
  logs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function AdminLogsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('ai');
  const [aiLogs, setAiLogs] = useState<AILog[]>([]);
  const [aiCursor, setAiCursor] = useState<string | undefined>(undefined);
  const [aiHasMore, setAiHasMore] = useState(false);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiEndpointFilter, setAiEndpointFilter] = useState('');
  const [aiModelFilter, setAiModelFilter] = useState('');

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditResourceFilter, setAuditResourceFilter] = useState('');
  const [auditDateFrom, setAuditDateFrom] = useState('');
  const [auditDateTo, setAuditDateTo] = useState('');
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});

  // Fetch AI Usage Logs
  const fetchAILogs = async (cursor?: string, append = false) => {
    try {
      setAiLoading(true);
      setAiError(null);

      const params = new URLSearchParams();
      if (cursor) params.set('cursor', cursor);
      if (aiEndpointFilter) params.set('endpoint', aiEndpointFilter);
      if (aiModelFilter) params.set('model', aiModelFilter);
      params.set('limit', '20');

      const res = await fetch(`/api/admin/logs?${params.toString()}`);
      if (!res.ok) throw new Error('AI 로그 불러오기 실패');

      const data: AILogResponse = await res.json();
      setAiLogs(append ? [...aiLogs, ...data.items] : data.items);
      setAiCursor(data.nextCursor);
      setAiHasMore(data.hasMore);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setAiLoading(false);
    }
  };

  // Fetch Audit Logs
  const fetchAuditLogs = async (page = 1) => {
    try {
      setAuditLoading(true);
      setAuditError(null);

      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '20');
      if (auditActionFilter) params.set('action', auditActionFilter);
      if (auditResourceFilter) params.set('resource', auditResourceFilter);
      if (auditDateFrom) params.set('dateFrom', auditDateFrom);
      if (auditDateTo) params.set('dateTo', auditDateTo);

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      if (!res.ok) throw new Error('감사 로그 불러오기 실패');

      const data: AuditLogResponse = await res.json();
      setAuditLogs(data.logs);
      setAuditPage(data.pagination.page);
      setAuditTotalPages(data.pagination.totalPages);
      setAuditTotal(data.pagination.total);
    } catch (err) {
      setAuditError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'ai') {
      fetchAILogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, aiEndpointFilter, aiModelFilter]);

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, auditActionFilter, auditResourceFilter, auditDateFrom, auditDateTo]);

  const toggleDetails = (id: string) => {
    setExpandedDetails((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">로그</h1>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-zinc-700">
        <button
          onClick={() => setActiveTab('ai')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'ai'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          AI 사용 로그
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'audit'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          감사 로그
        </button>
      </div>

      {/* AI Usage Logs Tab */}
      {activeTab === 'ai' && (
        <div>
          {/* AI Filters */}
          <div className="mb-4 flex gap-4">
            <input
              type="text"
              placeholder="엔드포인트 필터..."
              value={aiEndpointFilter}
              onChange={(e) => setAiEndpointFilter(e.target.value)}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
            <input
              type="text"
              placeholder="모델 필터..."
              value={aiModelFilter}
              onChange={(e) => setAiModelFilter(e.target.value)}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
            {(aiEndpointFilter || aiModelFilter) && (
              <button
                onClick={() => {
                  setAiEndpointFilter('');
                  setAiModelFilter('');
                }}
                className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-sm"
              >
                필터 초기화
              </button>
            )}
          </div>

          {aiError && (
            <div className="mb-4 p-4 bg-red-900/20 border border-red-500 rounded text-red-400">
              {aiError}
            </div>
          )}

          <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">
                    시간
                  </th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">
                    세션
                  </th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">
                    엔드포인트
                  </th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">
                    모델
                  </th>
                  <th className="text-right px-4 py-3 text-zinc-400 font-medium">
                    프롬프트
                  </th>
                  <th className="text-right px-4 py-3 text-zinc-400 font-medium">
                    완성
                  </th>
                  <th className="text-right px-4 py-3 text-zinc-400 font-medium">
                    총합
                  </th>
                  <th className="text-center px-4 py-3 text-zinc-400 font-medium">
                    추정
                  </th>
                  <th className="text-right px-4 py-3 text-zinc-400 font-medium">
                    지속 시간
                  </th>
                  <th className="text-center px-4 py-3 text-zinc-400 font-medium">
                    상태
                  </th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">
                    오류
                  </th>
                </tr>
              </thead>
              <tbody>
                {aiLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-zinc-700/50 hover:bg-zinc-700/30"
                  >
                    <td className="px-4 py-2 text-zinc-300 whitespace-nowrap text-xs">
                      {new Date(log.createdAt).toLocaleString('ko-KR', {
                        timeZone: 'Asia/Seoul',
                      })}
                    </td>
                    <td className="px-4 py-2 text-zinc-400 text-xs font-mono">
                      {log.sessionId ? log.sessionId.slice(0, 8) + '...' : '-'}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => setAiEndpointFilter(log.endpoint)}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-900/30 text-blue-300 hover:bg-blue-900/50"
                      >
                        {log.endpoint}
                      </button>
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => setAiModelFilter(log.model)}
                        className="text-zinc-300 text-xs hover:underline"
                      >
                        {log.model}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-300">
                      {log.promptTokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-300">
                      {log.completionTokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-white">
                      {log.totalTokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {log.estimated ? (
                        <span className="text-yellow-400 text-xs">~추정</span>
                      ) : (
                        <span className="text-green-400 text-xs">정확</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-400 text-xs">
                      {log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : '-'}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {log.success ? (
                        <span className="inline-flex w-2 h-2 rounded-full bg-green-500" />
                      ) : (
                        <span className="inline-flex w-2 h-2 rounded-full bg-red-500" />
                      )}
                    </td>
                    <td className="px-4 py-2 text-zinc-400 text-xs max-w-[200px] truncate">
                      {log.errorMessage || '-'}
                    </td>
                  </tr>
                ))}
                {aiLogs.length === 0 && !aiLoading && (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-8 text-center text-zinc-400"
                    >
                      AI 사용 로그가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* AI Logs Pagination */}
          {aiHasMore && aiCursor && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => fetchAILogs(aiCursor, true)}
                disabled={aiLoading}
                className="px-4 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 border border-zinc-600 rounded-lg text-white"
              >
                {aiLoading ? '로딩 중...' : '더 보기'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'audit' && (
        <div>
          {/* Audit Filters */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="액션 검색..."
              value={auditActionFilter}
              onChange={(e) => setAuditActionFilter(e.target.value)}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
            <select
              value={auditResourceFilter}
              onChange={(e) => setAuditResourceFilter(e.target.value)}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">모든 리소스</option>
              <option value="user">사용자</option>
              <option value="subscription">구독</option>
              <option value="payment">결제</option>
              <option value="session">세션</option>
            </select>
            <input
              type="date"
              placeholder="시작 날짜"
              value={auditDateFrom}
              onChange={(e) => setAuditDateFrom(e.target.value)}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-blue-500"
            />
            <input
              type="date"
              placeholder="종료 날짜"
              value={auditDateTo}
              onChange={(e) => setAuditDateTo(e.target.value)}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {(auditActionFilter ||
            auditResourceFilter ||
            auditDateFrom ||
            auditDateTo) && (
            <div className="mb-4">
              <button
                onClick={() => {
                  setAuditActionFilter('');
                  setAuditResourceFilter('');
                  setAuditDateFrom('');
                  setAuditDateTo('');
                }}
                className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-sm"
              >
                필터 초기화
              </button>
            </div>
          )}

          {auditError && (
            <div className="mb-4 p-4 bg-red-900/20 border border-red-500 rounded text-red-400">
              {auditError}
            </div>
          )}

          <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">
                    시간
                  </th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">
                    액션
                  </th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">
                    리소스
                  </th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">
                    리소스 ID
                  </th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">
                    상세
                  </th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">
                    IP
                  </th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-zinc-700/50 hover:bg-zinc-700/30"
                  >
                    <td className="px-4 py-2 text-zinc-300 whitespace-nowrap text-xs">
                      {new Date(log.createdAt).toLocaleString('ko-KR', {
                        timeZone: 'Asia/Seoul',
                      })}
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-900/30 text-purple-300">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-zinc-300 text-xs">
                      {log.resource}
                    </td>
                    <td className="px-4 py-2 text-zinc-400 text-xs font-mono">
                      {log.resourceId ? log.resourceId.slice(0, 12) + '...' : '-'}
                    </td>
                    <td className="px-4 py-2">
                      {log.details ? (
                        <button
                          onClick={() => toggleDetails(log.id)}
                          className="text-xs text-blue-400 hover:underline"
                        >
                          {expandedDetails[log.id] ? '숨기기' : '보기'}
                        </button>
                      ) : (
                        <span className="text-zinc-500 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-zinc-400 text-xs">
                      {log.ip || '-'}
                    </td>
                  </tr>
                ))}
                {expandedDetails &&
                  auditLogs.map(
                    (log) =>
                      expandedDetails[log.id] &&
                      log.details && (
                        <tr key={`${log.id}-details`} className="bg-zinc-900/50">
                          <td
                            colSpan={6}
                            className="px-4 py-2 text-xs text-zinc-400 font-mono"
                          >
                            <pre className="whitespace-pre-wrap overflow-x-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )
                  )}
                {auditLogs.length === 0 && !auditLoading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                      감사 로그가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Audit Logs Pagination */}
          {auditTotalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-zinc-400">
                총 {auditTotal}개 중 {(auditPage - 1) * 20 + 1}-
                {Math.min(auditPage * 20, auditTotal)}개
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchAuditLogs(auditPage - 1)}
                  disabled={auditPage <= 1 || auditLoading}
                  className="px-3 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-600 border border-zinc-600 rounded text-white"
                >
                  이전
                </button>
                <span className="px-3 py-2 text-sm text-white">
                  {auditPage} / {auditTotalPages}
                </span>
                <button
                  onClick={() => fetchAuditLogs(auditPage + 1)}
                  disabled={auditPage >= auditTotalPages || auditLoading}
                  className="px-3 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-600 border border-zinc-600 rounded text-white"
                >
                  다음
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
