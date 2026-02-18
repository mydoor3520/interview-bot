'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { isRetryableError } from '@/lib/ai/error-codes';

interface Evaluation {
  score: number;
  feedback: string;
  modelAnswer: string;
  strengths: string[];
  weaknesses: string[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
  isFollowUp?: boolean;
  evaluation?: Evaluation;
  questionId?: string;
}

interface UseInterviewStreamOptions {
  sessionId: string;
  onQuestionReceived?: (question: Record<string, unknown>) => void;
  onEvaluationReceived?: (evaluation: Record<string, unknown>) => void;
  onError?: (error: string) => void;
  onSessionEnded?: (reason: string) => void;
}

export function useInterviewStream(options: UseInterviewStreamOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionProgress, setQuestionProgress] = useState<{ current: number; total: number } | null>(null);
  const [evaluationMap, setEvaluationMap] = useState<Record<string, Evaluation>>({});
  const [evaluatingIds, setEvaluatingIds] = useState<Set<string>>(new Set());
  const [evaluationErrors, setEvaluationErrors] = useState<Record<string, string>>({});
  // Maps user message id -> questionId for retry
  const questionIdMapRef = useRef<Record<string, string>>({});
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 2;
  const sessionStartTimeRef = useRef<number>(Date.now());

  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const fetchEvaluation = useCallback(async (questionId: string, userMessageId: string) => {
    setEvaluatingIds(prev => new Set(prev).add(userMessageId));
    setEvaluationErrors(prev => {
      const next = { ...prev };
      delete next[userMessageId];
      return next;
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const res = await fetch('/api/interview/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId }),
        signal: controller.signal,
      });

      if (!res.ok) {
        if (res.status === 401) {
          setError('세션이 만료되었습니다. 다시 로그인해주세요.');
          optionsRef.current.onError?.('세션이 만료되었습니다. 다시 로그인해주세요.');
          window.location.href = '/login?reason=expired';
          return;
        }
        throw new Error('평가 요청 실패');
      }

      const data = await res.json();
      if (data.evaluation) {
        setEvaluationMap(prev => ({ ...prev, [userMessageId]: data.evaluation }));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error && err.name === 'AbortError'
        ? '평가 시간이 초과되었습니다'
        : '평가를 불러올 수 없습니다';
      setEvaluationErrors(prev => ({ ...prev, [userMessageId]: msg }));
    } finally {
      clearTimeout(timeout);
      setEvaluatingIds(prev => {
        const next = new Set(prev);
        next.delete(userMessageId);
        return next;
      });
    }
  }, []);

  const retryEvaluation = useCallback((userMessageId: string) => {
    const questionId = questionIdMapRef.current[userMessageId];
    if (questionId) {
      fetchEvaluation(questionId, userMessageId);
    }
  }, [fetchEvaluation]);

  const getSessionDurationSec = useCallback(() => {
    return Math.round((Date.now() - sessionStartTimeRef.current) / 1000);
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    // Add user message
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content };
    setMessages(prev => [...prev, userMsg]);

    // Add empty assistant message for streaming
    const assistantId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', isStreaming: true }]);

    setIsStreaming(true);
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let capturedAnsweredQuestionId: string | null = null;

    try {
      const allMessages = [...messagesRef.current, userMsg].map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/interview/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: optionsRef.current.sessionId, messages: allMessages }),
        signal: controller.signal,
      });

      if (!res.ok) {
        if (res.status === 401) {
          setMessages(prev => prev.filter(m => m.id !== assistantId));
          setError('세션이 만료되었습니다. 다시 로그인해주세요.');
          optionsRef.current.onError?.('세션이 만료되었습니다. 다시 로그인해주세요.');
          window.location.href = '/login?reason=expired';
          return;
        }
        const errBody = await res.json().catch(() => null);
        if (errBody?.sessionEnded) {
          // Remove the empty assistant placeholder
          setMessages(prev => prev.filter(m => m.id !== assistantId));
          optionsRef.current.onSessionEnded?.(errBody.error);
          return;
        }
        throw new Error(errBody?.error || `스트리밍 요청 실패 (${res.status})`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('응답 스트림 없음');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            // Capture answeredQuestionId metadata
            if (parsed.answeredQuestionId) {
              capturedAnsweredQuestionId = parsed.answeredQuestionId;
            }
            if (parsed.progress) {
              setQuestionProgress(parsed.progress);
            }
            if (parsed.content) {
              fullContent += parsed.content;
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: fullContent } : m
              ));
            }
            if (parsed.isFollowUp !== undefined) {
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, isFollowUp: parsed.isFollowUp } : m
              ));
            }
            if (parsed.error) {
              const retryable = parsed.code ? isRetryableError(parsed.code) : false;
              if (retryable && retryCountRef.current < MAX_RETRIES) {
                retryCountRef.current += 1;
                const backoffMs = Math.pow(2, retryCountRef.current - 1) * 1000;
                console.log(`[Stream] Retrying in ${backoffMs}ms (attempt ${retryCountRef.current}/${MAX_RETRIES})`);
                // Remove the failed assistant message before retry
                setMessages(prev => prev.filter(m => m.id !== assistantId));
                setIsStreaming(false);
                abortControllerRef.current = null;
                setTimeout(() => {
                  sendMessage(content);
                }, backoffMs);
                return;
              }
              setError(parsed.error);
            }
          } catch {}
        }
      }

      // Mark streaming complete - reset retry count on success
      retryCountRef.current = 0;
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, isStreaming: false } : m
      ));

      // Trigger background evaluation if we got a questionId
      if (capturedAnsweredQuestionId) {
        questionIdMapRef.current[userMsg.id] = capturedAnsweredQuestionId;
        fetchEvaluation(capturedAnsweredQuestionId, userMsg.id);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message || 'AI 응답 중 오류 발생');
        optionsRef.current.onError?.(err.message);
      } else if (!(err instanceof Error)) {
        setError('AI 응답 중 오류 발생');
        optionsRef.current.onError?.('AI 응답 중 오류 발생');
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [fetchEvaluation]);

  const startInterview = useCallback(async () => {
    // Reset session start time
    sessionStartTimeRef.current = Date.now();
    // AI starts first — no visible user message
    const assistantId = crypto.randomUUID();
    setMessages([{ id: assistantId, role: 'assistant', content: '', isStreaming: true }]);
    setIsStreaming(true);
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch('/api/interview/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: optionsRef.current.sessionId,
          messages: [{ role: 'user', content: '면접을 시작해주세요. 인사와 함께 첫 번째 질문을 해주세요.' }],
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        if (res.status === 401) {
          setMessages([]);
          setError('세션이 만료되었습니다. 다시 로그인해주세요.');
          optionsRef.current.onError?.('세션이 만료되었습니다. 다시 로그인해주세요.');
          window.location.href = '/login?reason=expired';
          return;
        }
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.error || `스트리밍 요청 실패 (${res.status})`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('응답 스트림 없음');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            if (parsed.progress) {
              setQuestionProgress(parsed.progress);
            }
            if (parsed.content) {
              fullContent += parsed.content;
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: fullContent } : m
              ));
            }
            if (parsed.isFollowUp !== undefined) {
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, isFollowUp: parsed.isFollowUp } : m
              ));
            }
            if (parsed.error) {
              const retryable = parsed.code ? isRetryableError(parsed.code) : false;
              if (retryable && retryCountRef.current < MAX_RETRIES) {
                retryCountRef.current += 1;
                const backoffMs = Math.pow(2, retryCountRef.current - 1) * 1000;
                console.log(`[Stream] Retrying startInterview in ${backoffMs}ms (attempt ${retryCountRef.current}/${MAX_RETRIES})`);
                setIsStreaming(false);
                abortControllerRef.current = null;
                setTimeout(() => {
                  startInterview();
                }, backoffMs);
                return;
              }
              setError(parsed.error);
            }
          } catch {}
        }
      }

      // Reset retry count on success
      retryCountRef.current = 0;
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, isStreaming: false } : m
      ));
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message || 'AI 응답 중 오류 발생');
        optionsRef.current.onError?.(err.message);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, []);

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const restoreMessages = useCallback((msgs: Message[]) => {
    setMessages(msgs);
    // Rebuild questionIdMapRef from restored messages
    // Map user message id -> questionId from the preceding assistant message
    const newMap: Record<string, string> = {};
    for (let i = 0; i < msgs.length; i++) {
      if (msgs[i].role === 'user' && i > 0 && msgs[i - 1].role === 'assistant' && msgs[i - 1].questionId) {
        newMap[msgs[i].id] = msgs[i - 1].questionId!;
      }
    }
    questionIdMapRef.current = newMap;
  }, []);

  return {
    messages,
    isStreaming,
    error,
    questionProgress,
    evaluationMap,
    evaluatingIds,
    evaluationErrors,
    sendMessage,
    startInterview,
    stopStreaming,
    setMessages: restoreMessages,
    retryEvaluation,
    getSessionDurationSec,
  };
}
