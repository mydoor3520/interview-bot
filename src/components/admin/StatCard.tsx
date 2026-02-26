'use client';

import { cn } from '@/lib/utils/cn';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  formatValue?: (value: string | number) => string;
}

export function StatCard({ title, value, subtitle, trend, trendLabel, formatValue }: StatCardProps) {
  const displayValue = formatValue ? formatValue(value) : typeof value === 'number' ? value.toLocaleString() : value;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <p className="text-sm text-zinc-400 mb-1">{title}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-bold text-white">{displayValue}</p>
        {trend && trend !== 'neutral' && (
          <span className={cn(
            'text-sm font-medium flex items-center gap-0.5',
            trend === 'up' ? 'text-green-400' : 'text-red-400'
          )}>
            {trend === 'up' ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
              </svg>
            )}
            {trendLabel}
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
    </div>
  );
}
