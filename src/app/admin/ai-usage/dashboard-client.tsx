'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface DailyData {
  date: string;
  totalPrompt: number;
  totalCompletion: number;
  total: number;
  count: number;
}

interface EndpointData {
  endpoint: string;
  totalTokens: number;
  count: number;
}

interface ModelData {
  model: string;
  totalTokens: number;
  count: number;
}

export function AdminDashboardClient({
  daily,
  endpointData,
  modelData,
}: {
  daily: DailyData[];
  endpointData: EndpointData[];
  modelData: ModelData[];
}) {
  return (
    <div className="space-y-8">
      {/* Daily Token Usage Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Daily Token Usage
        </h2>
        {daily.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
              />
              <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="totalPrompt"
                name="Prompt Tokens"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="totalCompletion"
                name="Completion Tokens"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
            No data available for this period.
          </div>
        )}
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Endpoint Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            By Endpoint
          </h2>
          {endpointData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={endpointData}
                    dataKey="totalTokens"
                    nameKey="endpoint"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${name ?? ''} (${((percent ?? 0) * 100).toFixed(0)}%)`
                    }
                    labelLine={false}
                  >
                    {endpointData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {endpointData.map((e, i) => (
                  <div key={e.endpoint} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-gray-700 dark:text-gray-300">{e.endpoint}</span>
                    </div>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {e.totalTokens.toLocaleString()} tokens ({e.count} calls)
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-500 dark:text-gray-400">
              No data available.
            </div>
          )}
        </div>

        {/* Model Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            By Model
          </h2>
          {modelData.length > 0 ? (
            <div className="space-y-3">
              {modelData.map((m) => {
                const maxTokens = Math.max(...modelData.map(d => d.totalTokens));
                const percentage = maxTokens > 0 ? (m.totalTokens / maxTokens) * 100 : 0;
                return (
                  <div key={m.model}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 dark:text-gray-300">{m.model}</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {m.totalTokens.toLocaleString()} ({m.count} calls)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-500 dark:text-gray-400">
              No data available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
