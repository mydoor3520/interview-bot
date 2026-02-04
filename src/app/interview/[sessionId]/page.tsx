'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useInterviewStream } from '@/hooks/useInterviewStream';
import { ChatMessage } from '@/components/interview/ChatMessage';
import { ChatInput } from '@/components/interview/ChatInput';
import { SessionSummary } from '@/components/interview/SessionSummary';
import { cn } from '@/lib/utils/cn';

interface SessionData {
  id: string;
  status: string;
  topics: string[];
  difficulty: string;
  evaluationMode: string;
  questionCount: number;
  totalScore?: number;
  summary?: string;
  topicScores?: Record<string, number>;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
}

export default function InterviewPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, isStreaming, error, sendMessage, startInterview, stopStreaming } = useInterviewStream({
    sessionId,
    onError: (err) => {
      console.error('Interview stream error:', err);
    },
  });

  useEffect(() => {
    const loadSession = async () => {
      try {
        const res = await fetch(`/api/interview?id=${sessionId}`);
        if (!res.ok) throw new Error('세션 로드 실패');
        const data = await res.json();
        setSessionData(data);

        if (data.status === 'completed') {
          setShowSummary(true);
        }
      } catch (err) {
        console.error('Failed to load session:', err);
        alert('세션을 불러올 수 없습니다.');
        router.push('/interview');
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, [sessionId, router]);

  useEffect(() => {
    if (!isLoading && sessionData && sessionData.status === 'active' && messages.length === 0) {
      startInterview();
    }
  }, [isLoading, sessionData, messages.length, startInterview]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleEndInterview = async () => {
    if (!confirm('면접을 종료하시겠습니까?')) return;

    try {
      const res = await fetch('/api/interview', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sessionId,
          status: 'completed',
          endReason: 'user_ended',
        }),
      });

      if (!res.ok) throw new Error('면접 종료 실패');

      const updatedData = await res.json();
      setSessionData(updatedData);
      setShowSummary(true);
    } catch (err) {
      console.error('Failed to end interview:', err);
      alert('면접을 종료할 수 없습니다.');
    }
  };

  const handleSkipQuestion = async () => {
    await sendMessage('[질문 스킵] 다음 질문으로 넘어가주세요.');
  };

  const handleNextQuestion = async () => {
    await sendMessage('[다음 질문] 다음 질문을 해주세요.');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-zinc-100 mx-auto mb-4" />
          <p className="text-zinc-600 dark:text-zinc-400">세션을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-zinc-600 dark:text-zinc-400">세션을 찾을 수 없습니다.</p>
      </div>
    );
  }

  if (showSummary && sessionData.totalScore !== undefined) {
    return (
      <SessionSummary
        totalScore={sessionData.totalScore}
        summary={sessionData.summary || '면접이 완료되었습니다.'}
        topicScores={sessionData.topicScores || {}}
        strengths={sessionData.strengths || []}
        weaknesses={sessionData.weaknesses || []}
        recommendations={sessionData.recommendations || []}
        questionCount={sessionData.questionCount}
      />
    );
  }

  const difficultyLabel = {
    easy: '쉬움',
    medium: '보통',
    hard: '어려움',
  }[sessionData.difficulty] || sessionData.difficulty;

  const evaluationModeLabel = {
    immediate: '즉시 평가',
    end: '종료 후 평가',
  }[sessionData.evaluationMode] || sessionData.evaluationMode;

  return (
    <div className="flex flex-col h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Session Info Bar */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">주제:</span>
                <span className="ml-2 text-sm text-zinc-900 dark:text-zinc-100">
                  {sessionData.topics.join(', ')}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">난이도:</span>
                <span className="ml-2 text-sm text-zinc-900 dark:text-zinc-100">{difficultyLabel}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">평가 방식:</span>
                <span className="ml-2 text-sm text-zinc-900 dark:text-zinc-100">{evaluationModeLabel}</span>
              </div>
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              질문 {sessionData.questionCount}개
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6">
          {messages.map((message) => {
            if (message.role === 'system') return null;
            return (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
                isStreaming={message.isStreaming}
                evaluation={message.evaluation}
              />
            );
          })}
          {isStreaming && (
            <div className="flex justify-center py-4">
              <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-zinc-900 dark:border-zinc-100" />
                <span>AI가 응답하는 중...</span>
              </div>
            </div>
          )}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <ChatInput
            onSubmit={sendMessage}
            disabled={isStreaming}
            placeholder="답변을 입력하세요... (Ctrl+Enter로 제출)"
          />
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={handleSkipQuestion}
              disabled={isStreaming}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium',
                'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
                'hover:bg-zinc-200 dark:hover:bg-zinc-700',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-colors'
              )}
            >
              질문 스킵
            </button>
            <button
              onClick={handleNextQuestion}
              disabled={isStreaming}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium',
                'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
                'hover:bg-zinc-200 dark:hover:bg-zinc-700',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-colors'
              )}
            >
              다음 질문
            </button>
            <div className="flex-1" />
            <button
              onClick={handleEndInterview}
              disabled={isStreaming}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium',
                'bg-red-600 text-white dark:bg-red-500',
                'hover:bg-red-700 dark:hover:bg-red-600',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-colors'
              )}
            >
              면접 종료
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
