import { AIClient, AIChatResult, AIStreamOptions } from './types';
import { countTokens, countMessagesTokens } from './token-counter';
import { logTokenUsage } from './usage-logger';

export function createAIClient(context?: {
  sessionId?: string;
  endpoint: 'stream' | 'evaluate' | 'evaluate_batch';
}): AIClient {
  const proxyUrl = process.env.AI_PROXY_URL || 'http://localhost:3456';
  const model = process.env.AI_MODEL || 'claude-sonnet-4';

  const baseClient: AIClient = {
    async *streamChat(options: AIStreamOptions): AsyncIterable<string> {
      const response = await fetch(`${proxyUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: options.model || model,
          messages: options.messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 4096,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 401 || response.status === 403) {
          throw new Error(`AI API 인증 실패 (${response.status}): API 키를 확인하세요. ${errorText}`);
        } else if (response.status === 429) {
          throw new Error(`AI API 요청 한도 초과 (429): 잠시 후 다시 시도하세요. ${errorText}`);
        } else if (response.status >= 500) {
          throw new Error(`AI 서버 오류 (${response.status}): ${errorText}`);
        }
        throw new Error(`AI API 오류 (${response.status}): ${errorText}`);
      }

      if (!response.body) {
        throw new Error('AI 서버에서 응답 본문이 비어있습니다.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
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
            if (data === '[DONE]') return;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) yield content;
            } catch {
              // Skip malformed JSON
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    },

    async chat(options: AIStreamOptions): Promise<AIChatResult> {
      const response = await fetch(`${proxyUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: options.model || model,
          messages: options.messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 4096,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 401 || response.status === 403) {
          throw new Error(`AI API 인증 실패 (${response.status}): API 키를 확인하세요. ${errorText}`);
        } else if (response.status === 429) {
          throw new Error(`AI API 요청 한도 초과 (429): 잠시 후 다시 시도하세요. ${errorText}`);
        } else if (response.status >= 500) {
          throw new Error(`AI 서버 오류 (${response.status}): ${errorText}`);
        }
        throw new Error(`AI API 오류 (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return {
        content: data.choices?.[0]?.message?.content || '',
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
        } : undefined,
      };
    },
  };

  // Wrap with logging if context is provided
  if (context && process.env.DISABLE_TOKEN_LOGGING !== 'true') {
    return wrapWithLogging(baseClient, context);
  }
  return baseClient;
}

/**
 * 로깅 실패를 무시하면서도 Promise가 GC되기 전에 완료될 수 있도록
 * 최근 로깅 Promise를 추적합니다.
 * 서버리스 환경에서 프로세스 종료 전 로그 유실을 최소화합니다.
 */
const pendingLogs: Set<Promise<void>> = new Set();

function trackLogPromise(promise: Promise<void>): void {
  pendingLogs.add(promise);
  promise.finally(() => pendingLogs.delete(promise));
}

function wrapWithLogging(
  client: AIClient,
  context: { sessionId?: string; endpoint: 'stream' | 'evaluate' | 'evaluate_batch' }
): AIClient {
  return {
    async *streamChat(options: AIStreamOptions): AsyncIterable<string> {
      const startTime = Date.now();
      const inputTokens = countMessagesTokens(options.messages);
      let outputText = '';
      let aborted = false;
      let errorMsg: string | undefined;

      try {
        for await (const chunk of client.streamChat(options)) {
          outputText += chunk;
          yield chunk;
        }
      } catch (err) {
        // 스트리밍 에러 vs 클라이언트 중단 구분
        if (err instanceof Error && err.name === 'AbortError') {
          aborted = true;
        } else {
          errorMsg = err instanceof Error ? err.message : 'Unknown';
        }
        throw err;
      } finally {
        const logPromise = logTokenUsage({
          ...context,
          model: options.model || process.env.AI_MODEL || 'unknown',
          promptTokens: inputTokens,
          completionTokens: countTokens(outputText),
          estimated: true,
          durationMs: Date.now() - startTime,
          success: !errorMsg,
          errorMessage: aborted ? `Stream aborted (${outputText.length} chars sent)` : errorMsg,
        });
        trackLogPromise(logPromise);
      }
    },

    async chat(options: AIStreamOptions): Promise<AIChatResult> {
      const startTime = Date.now();

      try {
        const result = await client.chat(options);
        const estimated = !result.usage;

        const logPromise = logTokenUsage({
          ...context,
          model: options.model || process.env.AI_MODEL || 'unknown',
          promptTokens: result.usage?.promptTokens ?? countMessagesTokens(options.messages),
          completionTokens: result.usage?.completionTokens ?? countTokens(result.content),
          estimated,
          durationMs: Date.now() - startTime,
        });
        trackLogPromise(logPromise);

        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown';

        const logPromise = logTokenUsage({
          ...context,
          model: options.model || process.env.AI_MODEL || 'unknown',
          promptTokens: countMessagesTokens(options.messages),
          completionTokens: 0,
          estimated: true,
          durationMs: Date.now() - startTime,
          success: false,
          errorMessage: errorMsg,
        });
        trackLogPromise(logPromise);

        throw err;
      }
    },
  };
}

/** 대기 중인 모든 로깅 Promise를 기다립니다 (graceful shutdown 용) */
export async function flushPendingLogs(): Promise<void> {
  await Promise.allSettled(Array.from(pendingLogs));
}
