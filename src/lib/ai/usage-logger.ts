import { prismaBase } from '@/lib/db/prisma';

interface UsageLogParams {
  sessionId?: string;
  endpoint: 'stream' | 'evaluate' | 'evaluate_batch' | 'job_parse' | 'generate_questions' | 'resume_parse' | 'resume_edit';
  model: string;
  promptTokens: number;
  completionTokens: number;
  estimated: boolean;
  durationMs?: number;
  success?: boolean;
  errorMessage?: string;
  userId?: string;
  tier?: string;
  sourceDomain?: string;
}

/**
 * Per-million-token pricing (USD) by model.
 * Update when adding new models or when Anthropic changes pricing.
 * https://docs.anthropic.com/en/docs/about-claude/models#model-comparison-table
 */
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5-20251001': { input: 1.0, output: 5.0 },
  'claude-sonnet-4-5-20250929': { input: 3.0, output: 15.0 },
};

const DEFAULT_PRICING = { input: 1.0, output: 5.0 };

function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  const { input, output } = MODEL_PRICING[model] ?? DEFAULT_PRICING;
  return (promptTokens * input + completionTokens * output) / 1_000_000;
}

export async function logTokenUsage(params: UsageLogParams): Promise<void> {
  if (params.sourceDomain) {
    console.log('[TokenUsage] sourceDomain:', params.sourceDomain, 'endpoint:', params.endpoint);
  }

  try {
    await prismaBase.aIUsageLog.create({
      data: {
        sessionId: params.sessionId,
        endpoint: params.endpoint,
        model: params.model,
        promptTokens: params.promptTokens,
        completionTokens: params.completionTokens,
        totalTokens: params.promptTokens + params.completionTokens,
        estimated: params.estimated,
        durationMs: params.durationMs,
        success: params.success ?? true,
        errorMessage: params.errorMessage,
        userId: params.userId,
        cost: calculateCost(params.model, params.promptTokens, params.completionTokens),
        tier: params.tier,
      },
    });
  } catch (err) {
    // 로깅 실패가 AI 응답에 영향을 주지 않음
    console.error('[TokenUsage] Failed to log:', {
      sessionId: params.sessionId,
      endpoint: params.endpoint,
      ...(params.sourceDomain && { sourceDomain: params.sourceDomain }),
      error: err,
    });
  }
}
