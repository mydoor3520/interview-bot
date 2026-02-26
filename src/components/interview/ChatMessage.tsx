'use client';
import { cn } from '@/lib/utils/cn';
import { stripMarkdown } from '@/lib/utils/strip-markdown';
import { EvaluationCard } from './EvaluationCard';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  isFollowUp?: boolean;
  evaluation?: {
    score: number;
    feedback: string;
    modelAnswer: string;
    strengths: string[];
    weaknesses: string[];
  };
  evaluationState?: 'loading' | 'ready' | 'error' | 'none';
  onFeedbackClick?: () => void;
  onRetryEvaluation?: () => void;
}

export function ChatMessage({
  role,
  content,
  isStreaming,
  isFollowUp,
  evaluation,
  evaluationState,
  onFeedbackClick,
  onRetryEvaluation,
}: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={cn('flex w-full mb-4', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[80%]', isUser ? 'items-end' : 'items-start')}>
        {isFollowUp && !isUser && (
          <span className="inline-block mb-1 px-2 py-0.5 text-xs font-medium rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
            꼬리질문
          </span>
        )}
        <div
          className={cn(
            'rounded-lg px-4 py-3',
            isUser
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
              : 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
          )}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{content}</p>
          ) : (
            <div className="text-sm">
              <p className="whitespace-pre-wrap">{stripMarkdown(content)}</p>
              {isStreaming && (
                <span className="inline-block w-2 h-4 bg-zinc-900 dark:bg-zinc-100 animate-pulse ml-1" />
              )}
            </div>
          )}
        </div>

        {/* 피드백 버튼 - 면접 중 user 메시지에만 표시 (evaluationState prop이 있을 때) */}
        {isUser && evaluationState && evaluationState !== 'none' && (
          <div className="mt-1.5 flex justify-end">
            {evaluationState === 'loading' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-400 dark:text-zinc-500">
                <span className="inline-block w-3 h-3 border-2 border-zinc-300 dark:border-zinc-600 border-t-transparent rounded-full animate-spin" />
                평가 중...
              </span>
            )}
            {evaluationState === 'ready' && (
              <button
                onClick={onFeedbackClick}
                className="px-2.5 py-1 text-xs font-medium rounded-md bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
              >
                피드백 보기
              </button>
            )}
            {evaluationState === 'error' && (
              <button
                onClick={onRetryEvaluation}
                className="px-2.5 py-1 text-xs font-medium rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
              >
                피드백 실패 - 재시도
              </button>
            )}
          </div>
        )}

        {/* 인라인 EvaluationCard - evaluationState가 없을 때만 표시 (히스토리 페이지 등) */}
        {evaluation && !evaluationState && (
          <EvaluationCard
            score={evaluation.score}
            feedback={evaluation.feedback}
            modelAnswer={evaluation.modelAnswer}
            strengths={evaluation.strengths}
            weaknesses={evaluation.weaknesses}
          />
        )}
      </div>
    </div>
  );
}
