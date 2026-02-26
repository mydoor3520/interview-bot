import { AIClient, AIChatResult, AIStreamOptions, AIMessage, AIContentBlock } from './types';

/**
 * Anthropic Messages API types
 */
interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[];
}

interface AnthropicContentBlock {
  type: 'text' | 'image' | 'document';
  text?: string;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

interface AnthropicStreamEvent {
  type: 'message_start' | 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_delta' | 'message_stop';
  message?: {
    usage?: { input_tokens: number };
  };
  delta?: {
    text?: string;
  };
  usage?: {
    output_tokens: number;
  };
}

interface AnthropicErrorResponse {
  type: 'error';
  error: {
    type: string;
    message: string;
  };
}

export interface StreamTokenUsage {
  inputTokens: number;
  outputTokens: number;
}

/**
 * Convert AIMessage[] to Anthropic format with separate system string
 */
function convertToAnthropicFormat(messages: AIMessage[]): { system: string; messages: AnthropicMessage[] } {
  const systemMessages: string[] = [];
  const anthropicMessages: AnthropicMessage[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      // Extract system messages
      const content = typeof msg.content === 'string' ? msg.content : msg.content.map(b => b.type === 'text' ? b.text : '').join('\n');
      systemMessages.push(content);
    } else {
      // Convert user/assistant messages
      if (typeof msg.content === 'string') {
        anthropicMessages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      } else {
        // Handle vision content blocks
        const convertedContent = (msg.content as AIContentBlock[]).map(block => {
          if (block.type === 'text') {
            return { type: 'text' as const, text: block.text };
          }
          if (block.type === 'image_url') {
            const dataUrl = block.image_url.url;
            // Parse data:image/jpeg;base64,... format
            const match = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
            if (match) {
              return {
                type: 'image' as const,
                source: {
                  type: 'base64' as const,
                  media_type: match[1],
                  data: match[2],
                },
              };
            }
            // Non-data URL — skip for Anthropic (they don't support URLs directly)
            console.warn('Anthropic adapter: skipping non-data-URL image');
            return { type: 'text' as const, text: '[Image not supported: URL format]' };
          }
          if (block.type === 'document') {
            // Pass PDF document blocks directly (Anthropic native format)
            return {
              type: 'document' as const,
              source: {
                type: 'base64' as const,
                media_type: block.source.media_type,
                data: block.source.data,
              },
            };
          }
          return { type: 'text' as const, text: '' };
        });
        anthropicMessages.push({
          role: msg.role as 'user' | 'assistant',
          content: convertedContent,
        });
      }
    }
  }

  return {
    system: systemMessages.join('\n\n'),
    messages: anthropicMessages,
  };
}

/**
 * Anthropic Messages API client implementing AIClient interface
 */
export class AnthropicClient implements AIClient {
  private lastStreamUsage: StreamTokenUsage | null = null;

  constructor(
    private apiKey: string,
    private defaultModel: string
  ) {}

  getLastStreamUsage(): StreamTokenUsage | null {
    return this.lastStreamUsage;
  }

  private containsDocumentContent(messages: AIMessage[]): boolean {
    return messages.some(m =>
      Array.isArray(m.content) &&
      (m.content as AIContentBlock[]).some(b => b.type === 'document')
    );
  }

  async *streamChat(options: AIStreamOptions): AsyncIterable<string> {
    const { system, messages } = convertToAnthropicFormat(options.messages);
    const hasPdf = this.containsDocumentContent(options.messages);

    this.lastStreamUsage = { inputTokens: 0, outputTokens: 0 };

    const headers: Record<string, string> = {
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    };
    if (hasPdf) headers['anthropic-beta'] = 'pdfs-2024-09-25';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: options.model || this.defaultModel,
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.7,
        system,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `AI API 오류 (${response.status})`;

      try {
        const errorJson = JSON.parse(errorText) as AnthropicErrorResponse;
        if (errorJson.type === 'error') {
          if (errorJson.error.type === 'rate_limit_error') {
            throw new Error(`AI API 요청 한도 초과 (429): 잠시 후 다시 시도하세요. ${errorJson.error.message}`);
          }
          errorMessage = errorJson.error.message;
        }
      } catch {
        // Not JSON, use raw text
        errorMessage = errorText;
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error(`AI API 인증 실패 (${response.status}): API 키를 확인하세요. ${errorMessage}`);
      } else if (response.status === 429) {
        throw new Error(`AI API 요청 한도 초과 (429): 잠시 후 다시 시도하세요. ${errorMessage}`);
      } else if (response.status >= 500) {
        throw new Error(`AI 서버 오류 (${response.status}): ${errorMessage}`);
      }
      throw new Error(`AI API 오류 (${response.status}): ${errorMessage}`);
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

          try {
            const event = JSON.parse(data) as AnthropicStreamEvent;

            switch (event.type) {
              case 'message_start':
                if (event.message?.usage?.input_tokens) {
                  this.lastStreamUsage.inputTokens = event.message.usage.input_tokens;
                }
                break;

              case 'content_block_start':
              case 'content_block_stop':
                // No-op
                break;

              case 'content_block_delta':
                if (event.delta?.text) {
                  yield event.delta.text;
                }
                break;

              case 'message_delta':
                if (event.usage?.output_tokens) {
                  this.lastStreamUsage.outputTokens = event.usage.output_tokens;
                }
                break;

              case 'message_stop':
                return;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async chat(options: AIStreamOptions): Promise<AIChatResult> {
    const { system, messages } = convertToAnthropicFormat(options.messages);
    const hasPdf = this.containsDocumentContent(options.messages);

    const headers: Record<string, string> = {
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    };
    if (hasPdf) headers['anthropic-beta'] = 'pdfs-2024-09-25';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: options.model || this.defaultModel,
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.7,
        system,
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `AI API 오류 (${response.status})`;

      try {
        const errorJson = JSON.parse(errorText) as AnthropicErrorResponse;
        if (errorJson.type === 'error') {
          if (errorJson.error.type === 'rate_limit_error') {
            throw new Error(`AI API 요청 한도 초과 (429): 잠시 후 다시 시도하세요. ${errorJson.error.message}`);
          }
          errorMessage = errorJson.error.message;
        }
      } catch {
        // Not JSON, use raw text
        errorMessage = errorText;
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error(`AI API 인증 실패 (${response.status}): API 키를 확인하세요. ${errorMessage}`);
      } else if (response.status === 429) {
        throw new Error(`AI API 요청 한도 초과 (429): 잠시 후 다시 시도하세요. ${errorMessage}`);
      } else if (response.status >= 500) {
        throw new Error(`AI 서버 오류 (${response.status}): ${errorMessage}`);
      }
      throw new Error(`AI API 오류 (${response.status}): ${errorMessage}`);
    }

    const data = await response.json();

    return {
      content: data.content?.[0]?.text || '',
      usage: data.usage ? {
        promptTokens: data.usage.input_tokens || 0,
        completionTokens: data.usage.output_tokens || 0,
        totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
      } : undefined,
    };
  }
}
