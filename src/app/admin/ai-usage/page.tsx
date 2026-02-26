import { prismaBase as prisma } from '@/lib/db/prisma';
import { AdminDashboardClient } from './dashboard-client';

export const dynamic = 'force-dynamic';

export default async function AIUsagePage() {
  const now = new Date();
  const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [summary, endpointBreakdown, modelBreakdown, dailyRaw, recentLogs] = await Promise.all([
    prisma.aIUsageLog.aggregate({
      where: { createdAt: { gte: startDate } },
      _sum: { promptTokens: true, completionTokens: true, totalTokens: true },
      _count: true,
    }),
    prisma.aIUsageLog.groupBy({
      by: ['endpoint'],
      where: { createdAt: { gte: startDate } },
      _sum: { totalTokens: true },
      _count: true,
    }),
    prisma.aIUsageLog.groupBy({
      by: ['model'],
      where: { createdAt: { gte: startDate } },
      _sum: { totalTokens: true },
      _count: true,
    }),
    prisma.$queryRaw<Array<{
      date: string;
      totalPrompt: bigint;
      totalCompletion: bigint;
      count: bigint;
    }>>`
      SELECT DATE("createdAt") as date,
             SUM("promptTokens") as "totalPrompt",
             SUM("completionTokens") as "totalCompletion",
             COUNT(*) as count
      FROM "AIUsageLog"
      WHERE "createdAt" >= ${startDate}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `,
    prisma.aIUsageLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const daily = dailyRaw.map((d: { date: string; totalPrompt: bigint; totalCompletion: bigint; count: bigint }) => ({
    date: String(d.date),
    totalPrompt: Number(d.totalPrompt),
    totalCompletion: Number(d.totalCompletion),
    total: Number(d.totalPrompt) + Number(d.totalCompletion),
    count: Number(d.count),
  }));

  const summaryData = {
    totalTokens: summary._sum.totalTokens || 0,
    totalPromptTokens: summary._sum.promptTokens || 0,
    totalCompletionTokens: summary._sum.completionTokens || 0,
    totalRequests: summary._count,
  };

  const endpointData = endpointBreakdown.map(e => ({
    endpoint: e.endpoint,
    totalTokens: e._sum.totalTokens || 0,
    count: e._count,
  }));

  const modelData = modelBreakdown.map(m => ({
    model: m.model,
    totalTokens: m._sum.totalTokens || 0,
    count: m._count,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Token Usage Dashboard
      </h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Tokens (7d)</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {summaryData.totalTokens.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Prompt Tokens</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {summaryData.totalPromptTokens.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Completion Tokens</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {summaryData.totalCompletionTokens.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Requests</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {summaryData.totalRequests.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Chart */}
      <AdminDashboardClient
        daily={daily}
        endpointData={endpointData}
        modelData={modelData}
      />

      {/* Recent Logs */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Logs
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Time</th>
                <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Endpoint</th>
                <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Model</th>
                <th className="text-right px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Prompt</th>
                <th className="text-right px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Completion</th>
                <th className="text-right px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Total</th>
                <th className="text-center px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Est.</th>
                <th className="text-right px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Duration</th>
                <th className="text-center px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log) => (
                <tr key={log.id} className="border-b border-gray-100 dark:border-gray-700/50">
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                  </td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      {log.endpoint}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-300 text-xs">{log.model}</td>
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
                  <td className="px-4 py-2 text-right text-gray-500 dark:text-gray-400">
                    {log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : '-'}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {log.success ? (
                      <span className="inline-flex w-2 h-2 rounded-full bg-green-500" />
                    ) : (
                      <span className="inline-flex w-2 h-2 rounded-full bg-red-500" title={log.errorMessage || undefined} />
                    )}
                  </td>
                </tr>
              ))}
              {recentLogs.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No usage logs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
