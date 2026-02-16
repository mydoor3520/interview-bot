import { AIClient, AIChatResult, AIStreamOptions, AIMessage, AIContentBlock } from './types';
import { countTokens, countMessagesTokens } from './token-counter';
import { logTokenUsage } from './usage-logger';
import { env } from '@/lib/env';
import { getProviders, AIProvider } from './providers';
import { healthMonitor } from './health-monitor';

/**
 * Helper: Detect if messages contain Vision content (image_url blocks)
 * Proxy doesn't support multimodal blocks, so skip fallback for Vision requests
 */
function containsVisionContent(messages: AIMessage[]): boolean {
  return messages.some(m =>
    Array.isArray(m.content) &&
    (m.content as AIContentBlock[]).some(b => b.type === 'image_url')
  );
}

/**
 * Helper: Select provider based on health status
 */
function selectProvider(primary: AIProvider, fallback: AIProvider | null): AIProvider {
  if (healthMonitor.shouldTryProvider(primary.name)) return primary;
  if (fallback && healthMonitor.shouldTryProvider(fallback.name)) return fallback;
  return primary; // Default to primary even if down (might recover)
}

/**
 * Helper: Get the other provider (for fallback attempt)
 */
function getOtherProvider(current: AIProvider, primary: AIProvider, fallback: AIProvider | null): AIProvider | null {
  if (!fallback) return null;
  return current.name === primary.name ? fallback : primary;
}

export function createAIClient(context?: {
  sessionId?: string;
  endpoint: 'stream' | 'evaluate' | 'evaluate_batch' | 'job_parse' | 'generate_questions' | 'resume_parse';
}): AIClient {
  const { primary, fallback } = getProviders();

  const fallbackClient: AIClient = {
    async *streamChat(options: AIStreamOptions): AsyncIterable<string> {
      // Determine which provider to use based on health
      const provider = selectProvider(primary, fallback);
      const startTime = Date.now();

      try {
        for await (const chunk of provider.client.streamChat(options)) {
          yield chunk;
        }
        healthMonitor.recordSuccess(provider.name, Date.now() - startTime);
      } catch (err) {
        healthMonitor.recordFailure(provider.name, err instanceof Error ? err.message : 'Unknown');

        // Try fallback only if this was the primary and fallback exists and is available
        // Skip fallback for Vision requests (proxy doesn't support multimodal blocks)
        const other = getOtherProvider(provider, primary, fallback);
        if (other && healthMonitor.shouldTryProvider(other.name) && !containsVisionContent(options.messages)) {
          console.warn(JSON.stringify({
            event: 'ai_fallback',
            from: provider.name,
            to: other.name,
            reason: err instanceof Error ? err.message : 'Unknown',
            timestamp: new Date().toISOString()
          }));

          const fbStartTime = Date.now();
          try {
            for await (const chunk of other.client.streamChat(options)) {
              yield chunk;
            }
            healthMonitor.recordSuccess(other.name, Date.now() - fbStartTime);
            return; // Success via fallback
          } catch (fbErr) {
            healthMonitor.recordFailure(other.name, fbErr instanceof Error ? fbErr.message : 'Unknown');
            throw fbErr; // Both failed
          }
        }
        throw err; // No fallback available
      }
    },

    async chat(options: AIStreamOptions): Promise<AIChatResult> {
      const provider = selectProvider(primary, fallback);
      const startTime = Date.now();

      try {
        const result = await provider.client.chat(options);
        healthMonitor.recordSuccess(provider.name, Date.now() - startTime);
        return result;
      } catch (err) {
        healthMonitor.recordFailure(provider.name, err instanceof Error ? err.message : 'Unknown');

        // Skip fallback for Vision requests (proxy doesn't support multimodal blocks)
        const other = getOtherProvider(provider, primary, fallback);
        if (other && healthMonitor.shouldTryProvider(other.name) && !containsVisionContent(options.messages)) {
          console.warn(JSON.stringify({
            event: 'ai_fallback',
            from: provider.name,
            to: other.name,
            reason: err instanceof Error ? err.message : 'Unknown',
            timestamp: new Date().toISOString()
          }));

          const fbStartTime = Date.now();
          try {
            const result = await other.client.chat(options);
            healthMonitor.recordSuccess(other.name, Date.now() - fbStartTime);
            return result;
          } catch (fbErr) {
            healthMonitor.recordFailure(other.name, fbErr instanceof Error ? fbErr.message : 'Unknown');
            throw fbErr;
          }
        }
        throw err;
      }
    },
  };

  // Wrap with logging if context is provided
  if (context && process.env.DISABLE_TOKEN_LOGGING !== 'true') {
    return wrapWithLogging(fallbackClient, context);
  }
  return fallbackClient;
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
  context: { sessionId?: string; endpoint: 'stream' | 'evaluate' | 'evaluate_batch' | 'job_parse' | 'generate_questions' | 'resume_parse' }
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
          model: options.model || env.AI_MODEL,
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
          model: options.model || env.AI_MODEL,
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
          model: options.model || env.AI_MODEL,
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
