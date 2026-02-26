'use client';

import { TEMPLATE_META } from '@/lib/resume/constants';
import type { TemplateType } from '@/lib/resume/types';

interface ResumeTemplateCardProps {
  template: TemplateType;
  selected: boolean;
  onSelect: (template: TemplateType) => void;
}

export function ResumeTemplateCard({ template, selected, onSelect }: ResumeTemplateCardProps) {
  const meta = TEMPLATE_META[template];

  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className={[
        'w-full text-left rounded-xl border-2 p-4 transition-all',
        selected
          ? 'border-emerald-500 bg-emerald-900/10'
          : 'border-zinc-700/50 bg-zinc-800/50 hover:border-zinc-500 hover:bg-zinc-800',
      ].join(' ')}
    >
      {/* Mini preview thumbnail */}
      <div className="mb-3 rounded-lg bg-white h-20 flex flex-col justify-between p-2 overflow-hidden">
        {template === 'clean-modern' && (
          <>
            <div className="h-2.5 w-24 rounded bg-zinc-800" />
            <div className="space-y-1">
              <div className="h-1.5 w-full rounded bg-zinc-200" />
              <div className="h-1.5 w-4/5 rounded bg-zinc-200" />
              <div className="h-1.5 w-3/5 rounded bg-zinc-200" />
            </div>
          </>
        )}
        {template === 'professional' && (
          <>
            <div className="bg-zinc-800 rounded h-6 flex items-center px-2">
              <div className="h-2 w-16 rounded bg-white/80" />
            </div>
            <div className="space-y-1">
              <div className="h-1 w-full rounded bg-zinc-800 opacity-60" />
              <div className="h-1.5 w-full rounded bg-zinc-200" />
              <div className="h-1.5 w-5/6 rounded bg-zinc-200" />
            </div>
          </>
        )}
        {template === 'executive' && (
          <>
            <div className="border-b-2 border-zinc-800 pb-1">
              <div className="h-3 w-20 rounded bg-zinc-800" />
            </div>
            <div className="rounded bg-zinc-100 p-1 border-l-2 border-zinc-800">
              <div className="h-1.5 w-full rounded bg-zinc-300" />
            </div>
            <div className="h-1.5 w-4/5 rounded bg-zinc-200" />
          </>
        )}
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-100 mb-0.5">{meta.name}</p>
          <p className="text-xs text-zinc-400 leading-snug">{meta.description}</p>
        </div>
        {selected && (
          <div className="shrink-0 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-zinc-500">{meta.bestFor}</p>
    </button>
  );
}
