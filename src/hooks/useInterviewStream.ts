'use client';
import { useState, useRef, useCallback } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
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

interface UseInterviewStreamOptions {
  sessionId: string;
  onQuestionReceived?: (question: any) => void;
  onEvaluationReceived?: (evaluation: any) => void;
  onError?: (error: string) => void;
}

export function useInterviewStream(options: UseInterviewStreamOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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

    try {
      const allMessages = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/interview/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: options.sessionId, messages: allMessages }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error('스트리밍 요청 실패');

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
            if (parsed.content) {
              fullContent += parsed.content;
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: fullContent } : m
              ));
            }
            if (parsed.error) {
              setError(parsed.error);
            }
          } catch {}
        }
      }

      // Mark streaming complete
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, isStreaming: false } : m
      ));
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'AI 응답 중 오류 발생');
        options.onError?.(err.message);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [messages, options]);

  const startInterview = useCallback(async () => {
    // Send initial message to start interview
    await sendMessage('면접을 시작합니다. 첫 번째 질문을 해주세요.');
  }, [sendMessage]);

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    messages,
    isStreaming,
    error,
    sendMessage,
    startInterview,
    stopStreaming,
    setMessages,
  };
}
