'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useInterviewStream } from '@/hooks/useInterviewStream';
import { ChatMessage } from '@/components/interview/ChatMessage';
import { ChatInput } from '@/components/interview/ChatInput';
import { SessionSummary } from '@/components/interview/SessionSummary';
import { EvaluationCard } from '@/components/interview/EvaluationCard';
import { Modal } from '@/components/Modal';
import { cn } from '@/lib/utils/cn';
import { useToast } from '@/components/Toast';
import { PostSessionSurvey } from '@/components/interview/PostSessionSurvey';

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
  messages?: Array<{ role: string; content: string; isFollowUp?: boolean; questionId?: string }>;
  _count?: { questions: number };
  companyStyle?: string | null;
  techKnowledgeEnabled?: boolean;
}

export default function InterviewPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;
  const { toast } = useToast();

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [sessionRestored, setSessionRestored] = useState(false);

  const [selectedEvalMsgId, setSelectedEvalMsgId] = useState<string | null>(null);

  const {
    messages, isStreaming, error, questionProgress,
    evaluationMap, evaluatingIds, evaluationErrors,
    sendMessage, startInterview, setMessages, retryEvaluation,
    getSessionDurationSec,
  } = useInterviewStream({
    sessionId,
    onError: (err: string) => {
      console.error('Interview stream error:', err);
    },
    onSessionEnded: async (reason: string) => {
      toast(reason || '면접이 종료되었습니다.', 'info');

      // Trigger batch evaluation for unevaluated questions
      try {
        const evalRes = await fetch('/api/interview/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        if (evalRes.status === 401) {
          toast('세션이 만료되었습니다. 다시 로그인해주세요.', 'error');
          window.location.href = '/login?reason=expired';
          return;
        }
      } catch (err) {
        console.warn('Batch evaluation failed:', err);
      }

      // Save session duration
      try {
        const durRes = await fetch('/api/interview', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: sessionId, sessionDurationSec: getSessionDurationSec() }),
        });
        if (durRes.status === 401) {
          toast('세션이 만료되었습니다. 다시 로그인해주세요.', 'error');
          window.location.href = '/login?reason=expired';
          return;
        }
      } catch {
        // Non-critical, ignore
      }

      // Reload session data to get final state (now includes totalScore)
      try {
        const res = await fetch(`/api/interview?id=${sessionId}`);
        if (res.status === 401) {
          toast('세션이 만료되었습니다. 다시 로그인해주세요.', 'error');
          window.location.href = '/login?reason=expired';
          return;
        }
        const data = await res.json();
        setSessionData(data);
      } catch {
        // Still show summary even if reload fails
      }
      setShowSurvey(true);
    },
  });

  useEffect(() => {
    const loadSession = async () => {
      try {
        const res = await fetch(`/api/interview?id=${sessionId}`);
        if (!res.ok) {
          const errBody = await res.json().catch(() => null);
          throw new Error(errBody?.error || `세션 로드 실패 (${res.status})`);
        }
        const data = await res.json();
        setSessionData(data);

        if (data.status === 'completed' || data.status === 'abandoned') {
          setShowSummary(true);
          return;
        }

        // Restore conversation from saved messages
        if (data.messages && data.messages.length > 0) {
          const restored = data.messages.map((m: { role: 'user' | 'assistant'; content: string; questionId?: string; isFollowUp?: boolean }) => ({
            id: crypto.randomUUID(),
            role: m.role,
            content: m.content,
            isStreaming: false,
            isFollowUp: m.isFollowUp,
            questionId: m.questionId,
          }));
          setMessages(restored);
          setSessionRestored(true);
        }
      } catch (err) {
        console.error('Failed to load session:', err);
        toast('세션을 불러올 수 없습니다.', 'error');
        router.push('/interview');
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, [sessionId, router, toast, setMessages]);

  useEffect(() => {
    // Only start a new interview if no messages were restored from DB
    if (!isLoading && sessionData && sessionData.status === 'in_progress' && messages.length === 0 && !sessionRestored) {
      startInterview();
    }
  }, [isLoading, sessionData, messages.length, startInterview, sessionRestored]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

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
          sessionDurationSec: getSessionDurationSec(),
        }),
      });

      if (res.status === 401) {
        toast('세션이 만료되었습니다. 다시 로그인해주세요.', 'error');
        window.location.href = '/login?reason=expired';
        return;
      }
      if (!res.ok) throw new Error('면접 종료 실패');

      // Trigger batch evaluation for unevaluated questions
      try {
        const evalRes2 = await fetch('/api/interview/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        if (evalRes2.status === 401) {
          toast('세션이 만료되었습니다. 다시 로그인해주세요.', 'error');
          window.location.href = '/login?reason=expired';
          return;
        }
      } catch (err) {
        console.warn('Batch evaluation failed:', err);
      }

      // Reload session data to get totalScore from batch evaluation
      const reloadRes = await fetch(`/api/interview?id=${sessionId}`);
      if (reloadRes.status === 401) {
        toast('세션이 만료되었습니다. 다시 로그인해주세요.', 'error');
        window.location.href = '/login?reason=expired';
        return;
      }
      if (reloadRes.ok) {
        const data = await reloadRes.json();
        setSessionData(data);
      }
      setShowSurvey(true);
    } catch (err) {
      console.error('Failed to end interview:', err);
      toast('면접을 종료할 수 없습니다.', 'error');
    }
  };

  const handleSkipQuestion = async () => {
    await sendMessage('[건너뛰기]');
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

  if (showSurvey && sessionData) {
    const questionsList = (sessionData.messages || [])
      .filter((m: { role: string; content: string; questionId?: string }) => m.role === 'assistant' && m.content && m.questionId)
      .map((m: { role: string; content: string; questionId?: string }) => ({ id: m.questionId!, content: m.content }));

    return (
      <PostSessionSurvey
        sessionId={sessionId}
        questions={questionsList}
        onComplete={() => { setShowSurvey(false); setShowSummary(true); }}
      />
    );
  }

  if (showSummary) {
    return (
      <SessionSummary
        totalScore={sessionData.totalScore ?? null}
        summary={sessionData.summary || '면접이 완료되었습니다.'}
        topicScores={sessionData.topicScores || {}}
        strengths={sessionData.strengths || []}
        weaknesses={sessionData.weaknesses || []}
        recommendations={sessionData.recommendations || []}
        questionCount={sessionData.questionCount}
        companyStyle={sessionData.companyStyle}
        techKnowledgeEnabled={sessionData.techKnowledgeEnabled}
        topics={sessionData.topics}
        sessionId={sessionId}
      />
    );
  }

  const difficultyLabel = {
    easy: '쉬움',
    medium: '보통',
    hard: '어려움',
  }[sessionData.difficulty] || sessionData.difficulty;

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
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              {questionProgress
                ? `본질문 ${questionProgress.current} / ${questionProgress.total}`
                : `질문 ${messages.filter(m => m.role === 'assistant').length}개`
              }
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6">
          {messages.map((message) => {
            if (message.role === 'system') return null;
            const isUser = message.role === 'user';
            let evalState: 'loading' | 'ready' | 'error' | 'none' | undefined;
            if (isUser) {
              if (evaluatingIds.has(message.id)) evalState = 'loading';
              else if (evaluationMap[message.id]) evalState = 'ready';
              else if (evaluationErrors[message.id]) evalState = 'error';
              else evalState = 'none';
            }
            return (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
                isStreaming={message.isStreaming}
                isFollowUp={message.isFollowUp}
                evaluationState={evalState}
                onFeedbackClick={isUser ? () => setSelectedEvalMsgId(message.id) : undefined}
                onRetryEvaluation={isUser ? () => retryEvaluation(message.id) : undefined}
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
            <div className="bg-red-950/30 border border-red-800 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <span className="text-red-400 text-lg leading-none mt-0.5">!</span>
                <div>
                  <p className="text-sm font-medium text-red-400 mb-1">오류 발생</p>
                  <p className="text-sm text-red-300/80">{error}</p>
                </div>
              </div>
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
              건너뛰기
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

      {/* Feedback Modal */}
      <Modal
        isOpen={!!selectedEvalMsgId && !!evaluationMap[selectedEvalMsgId!]}
        onClose={() => setSelectedEvalMsgId(null)}
        title="답변 피드백"
      >
        {selectedEvalMsgId && evaluationMap[selectedEvalMsgId] && (
          <EvaluationCard
            score={evaluationMap[selectedEvalMsgId].score}
            feedback={evaluationMap[selectedEvalMsgId].feedback}
            modelAnswer={evaluationMap[selectedEvalMsgId].modelAnswer}
            strengths={evaluationMap[selectedEvalMsgId].strengths}
            weaknesses={evaluationMap[selectedEvalMsgId].weaknesses}
          />
        )}
      </Modal>
    </div>
  );
}
