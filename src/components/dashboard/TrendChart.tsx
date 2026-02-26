'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface TrendChartProps {
  data: Array<{ date: string; avgScore: number; count: number }>;
}

export default function TrendChart({ data }: TrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="date"
          stroke="#71717a"
          tickFormatter={(date) => new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
        />
        <YAxis stroke="#71717a" domain={[0, 10]} />
        <Tooltip
          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
          labelStyle={{ color: '#a1a1aa' }}
          itemStyle={{ color: '#ffffff' }}
        />
        <Line type="monotone" dataKey="avgScore" stroke="#ffffff" strokeWidth={2} dot={{ fill: '#ffffff' }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
