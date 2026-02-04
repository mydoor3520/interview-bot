'use client';
import { useState } from 'react';
import { cn } from '@/lib/utils/cn';

interface EvaluationCardProps {
  score: number;
  feedback: string;
  modelAnswer: string;
  strengths: string[];
  weaknesses: string[];
}

export function EvaluationCard({ score, feedback, modelAnswer, strengths, weaknesses }: EvaluationCardProps) {
  const [showModelAnswer, setShowModelAnswer] = useState(false);

  const getScoreColor = (score: number) => {
    if (score <= 3) return 'text-red-600 dark:text-red-400';
    if (score <= 6) return 'text-amber-600 dark:text-amber-400';
    if (score <= 8) return 'text-blue-600 dark:text-blue-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score <= 3) return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800';
    if (score <= 6) return 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
    if (score <= 8) return 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800';
    return 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800';
  };

  return (
    <div className={cn(
      'mt-3 p-4 rounded-lg border-2',
      getScoreBgColor(score)
    )}>
      <div className="flex items-center gap-3 mb-3">
        <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">평가 점수</div>
        <div className={cn('text-3xl font-bold', getScoreColor(score))}>
          {score}/10
        </div>
      </div>

      <div className="mb-4">
        <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">피드백</div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">{feedback}</p>
      </div>

      {strengths.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">강점</div>
          <div className="flex flex-wrap gap-2">
            {strengths.map((strength, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
              >
                {strength}
              </span>
            ))}
          </div>
        </div>
      )}

      {weaknesses.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">개선점</div>
          <div className="flex flex-wrap gap-2">
            {weaknesses.map((weakness, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
              >
                {weakness}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <button
          onClick={() => setShowModelAnswer(!showModelAnswer)}
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1"
        >
          <span>{showModelAnswer ? '모범 답안 숨기기' : '모범 답안 보기'}</span>
          <svg
            className={cn('w-4 h-4 transition-transform', showModelAnswer && 'rotate-180')}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showModelAnswer && (
          <div className="mt-2 p-3 bg-white dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">{modelAnswer}</p>
          </div>
        )}
      </div>
    </div>
  );
}
