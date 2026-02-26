import { AIClient, AIChatResult, AIStreamOptions, AIMessage, AIContentBlock } from './types';
import { AnthropicClient } from './anthropic-adapter';
import { ProviderType } from './health-monitor';
import { env } from '@/lib/env';

/**
 * Provider abstraction interface
 */
export interface AIProvider {
  name: ProviderType;
  client: AIClient;
  isAvailable: boolean;
}

/**
 * Convert OpenAI image_url content blocks to Anthropic native format
 * Handles data URL based image_url that proxy doesn't convert properly
 */
function convertMessagesForAnthropic(messages: AIMessage[]): unknown[] {
  return messages.map(msg => {
    if (typeof msg.content === 'string') {
      return msg;
    }
    // content is array (vision message)
    const convertedContent = (msg.content as AIContentBlock[]).map(block => {
      if (block.type === 'text') {
        return block;
      }
      if (block.type === 'image_url') {
        const dataUrl = block.image_url.url;
        // Parse data:image/jpeg;base64,... format data URL
        const match = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
        if (match) {
          return {
            type: 'image',
            source: {
              type: 'base64',
              media_type: match[1],
              data: match[2],
            },
          };
        }
        // Not a data URL (regular URL) — keep OpenAI format
        return block;
      }
      if (block.type === 'document') {
        // Pass document blocks through as-is (Anthropic native format)
        return block;
      }
      return block;
    });
    return { ...msg, content: convertedContent };
  });
}

/**
 * Create proxy-based AIClient (OpenAI-compatible format)
 */
function createProxyClient(proxyUrl: string, model: string): AIClient {
  return {
    async *streamChat(options: AIStreamOptions): AsyncIterable<string> {
      const convertedMessages = convertMessagesForAnthropic(options.messages);
      const response = await fetch(`${proxyUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: options.model || model,
          messages: convertedMessages,
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
      const convertedMessages = convertMessagesForAnthropic(options.messages);
      const response = await fetch(`${proxyUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: options.model || model,
          messages: convertedMessages,
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
}

/**
 * Create Proxy provider
 */
function createProxyProvider(): AIProvider {
  const proxyUrl = env.AI_PROXY_URL;
  const model = env.AI_MODEL;

  return {
    name: 'proxy',
    client: createProxyClient(proxyUrl, model),
    isAvailable: true, // Always available (has default URL)
  };
}

/**
 * Create Anthropic API provider
 */
function createAnthropicProvider(): AIProvider {
  const apiKey = env.ANTHROPIC_API_KEY;
  const model = env.AI_MODEL;

  if (!apiKey) {
    return {
      name: 'api',
      client: createProxyClient(env.AI_PROXY_URL, model), // Dummy client, never used
      isAvailable: false,
    };
  }

  return {
    name: 'api',
    client: new AnthropicClient(apiKey, model),
    isAvailable: true,
  };
}

/**
 * Get primary and fallback providers based on environment configuration
 */
export function getProviders(): { primary: AIProvider; fallback: AIProvider | null } {
  const primaryType = env.AI_PRIMARY_PROVIDER;

  // Build both providers
  const proxyProvider = createProxyProvider();
  const anthropicProvider = createAnthropicProvider();

  // Determine primary/fallback based on env
  if (primaryType === 'api') {
    if (!anthropicProvider.isAvailable) {
      console.warn('[AI] AI_PRIMARY_PROVIDER=api but ANTHROPIC_API_KEY not set, falling back to proxy');
      return { primary: proxyProvider, fallback: null };
    }
    if (!env.ANTHROPIC_API_KEY?.startsWith('sk-ant-')) {
      console.warn('[AI] ANTHROPIC_API_KEY format looks invalid (expected sk-ant-...)');
    }
    console.log('[AI] Using Anthropic API as primary provider, proxy as fallback');
    return { primary: anthropicProvider, fallback: proxyProvider };
  }

  // Default: proxy primary
  return {
    primary: proxyProvider,
    fallback: anthropicProvider.isAvailable ? anthropicProvider : null,
  };
}
