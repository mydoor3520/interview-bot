'use client';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils/cn';
import { EvaluationCard } from './EvaluationCard';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  evaluation?: {
    score: number;
    feedback: string;
    modelAnswer: string;
    strengths: string[];
    weaknesses: string[];
  };
}

export function ChatMessage({ role, content, isStreaming, evaluation }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={cn('flex w-full mb-4', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[80%]', isUser ? 'items-end' : 'items-start')}>
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
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  code: ({ children, className }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="bg-zinc-200 dark:bg-zinc-700 px-1 py-0.5 rounded text-xs">
                        {children}
                      </code>
                    ) : (
                      <code className={cn('block bg-zinc-200 dark:bg-zinc-700 p-2 rounded text-xs overflow-x-auto', className)}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {content}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-2 h-4 bg-zinc-900 dark:bg-zinc-100 animate-pulse ml-1" />
              )}
            </div>
          )}
        </div>

        {evaluation && (
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
