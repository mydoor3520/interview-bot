'use client';

import { cn } from '@/lib/utils/cn';

interface ProfileSectionProps {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function ProfileSection({ title, children, action, className }: ProfileSectionProps) {
  return (
    <section className={cn(
      'bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6',
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
