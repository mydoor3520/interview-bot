import { prismaBase } from '@/lib/db/prisma';

interface UsageLogParams {
  sessionId?: string;
  endpoint: 'stream' | 'evaluate' | 'evaluate_batch';
  model: string;
  promptTokens: number;
  completionTokens: number;
  estimated: boolean;
  durationMs?: number;
  success?: boolean;
  errorMessage?: string;
  userId?: string;
  tier?: string;
}

function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  // Haiku 4.5 pricing (default)
  const pricing: Record<string, { input: number; output: number }> = {
    'claude-haiku-4-5-20251001': { input: 1.0, output: 5.0 },
    'claude-sonnet-4-5-20250929': { input: 3.0, output: 15.0 },
  };
  const { input, output } = pricing[model] ?? { input: 1.0, output: 5.0 };
  return (promptTokens * input + completionTokens * output) / 1_000_000;
}

export async function logTokenUsage(params: UsageLogParams): Promise<void> {
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
      error: err,
    });
  }
}
