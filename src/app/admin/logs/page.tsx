import { prismaBase as prisma } from '@/lib/db/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string; endpoint?: string; model?: string }>;
}) {
  const params = await searchParams;
  const cursor = params.cursor;
  const endpoint = params.endpoint;
  const model = params.model;

  const where: Record<string, unknown> = {};
  if (endpoint) where.endpoint = endpoint;
  if (model) where.model = model;

  const logs = await prisma.aIUsageLog.findMany({
    take: 21,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: 'desc' },
    where,
  });

  const hasMore = logs.length > 20;
  const items = hasMore ? logs.slice(0, 20) : logs;
  const nextCursor = hasMore ? items[items.length - 1].id : undefined;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Usage Logs
        </h1>
        <div className="flex items-center gap-2">
          {endpoint && (
            <Link
              href="/admin/logs"
              className="text-sm px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full"
            >
              endpoint: {endpoint} x
            </Link>
          )}
          {model && (
            <Link
              href="/admin/logs"
              className="text-sm px-3 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded-full"
            >
              model: {model} x
            </Link>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Time</th>
              <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Session</th>
              <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Endpoint</th>
              <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Model</th>
              <th className="text-right px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Prompt</th>
              <th className="text-right px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Completion</th>
              <th className="text-right px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Total</th>
              <th className="text-center px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Est.</th>
              <th className="text-right px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Duration</th>
              <th className="text-center px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Error</th>
            </tr>
          </thead>
          <tbody>
            {items.map((log) => (
              <tr key={log.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <td className="px-4 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs">
                  {new Date(log.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                </td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400 text-xs font-mono">
                  {log.sessionId ? log.sessionId.slice(0, 8) + '...' : '-'}
                </td>
                <td className="px-4 py-2">
                  <Link
                    href={`/admin/logs?endpoint=${log.endpoint}`}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 hover:opacity-80"
                  >
                    {log.endpoint}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <Link
                    href={`/admin/logs?model=${log.model}`}
                    className="text-gray-700 dark:text-gray-300 text-xs hover:underline"
                  >
                    {log.model}
                  </Link>
                </td>
                <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{log.promptTokens.toLocaleString()}</td>
                <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{log.completionTokens.toLocaleString()}</td>
                <td className="px-4 py-2 text-right font-medium text-gray-900 dark:text-white">{log.totalTokens.toLocaleString()}</td>
                <td className="px-4 py-2 text-center">
                  {log.estimated ? (
                    <span className="text-yellow-600 dark:text-yellow-400 text-xs">~est</span>
                  ) : (
                    <span className="text-green-600 dark:text-green-400 text-xs">exact</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right text-gray-500 dark:text-gray-400 text-xs">
                  {log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : '-'}
                </td>
                <td className="px-4 py-2 text-center">
                  {log.success ? (
                    <span className="inline-flex w-2 h-2 rounded-full bg-green-500" />
                  ) : (
                    <span className="inline-flex w-2 h-2 rounded-full bg-red-500" />
                  )}
                </td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400 text-xs max-w-[200px] truncate">
                  {log.errorMessage || '-'}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  No usage logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {hasMore && nextCursor && (
        <div className="mt-4 flex justify-center">
          <Link
            href={`/admin/logs?cursor=${nextCursor}${endpoint ? `&endpoint=${endpoint}` : ''}${model ? `&model=${model}` : ''}`}
            className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Load More
          </Link>
        </div>
      )}
    </div>
  );
}
