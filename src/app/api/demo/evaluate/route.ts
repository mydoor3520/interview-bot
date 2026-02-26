import { NextRequest, NextResponse } from 'next/server';
import { createAIClient } from '@/lib/ai/client';
import { buildDemoEvaluationPrompt, sanitizeForPrompt } from '@/lib/ai/prompts';
import { classifyAnswerQuality } from '@/lib/ai/answer-quality';
import { checkDemoRateLimit } from '@/lib/demo/rate-limit';
import { checkAIRateLimit } from '@/lib/ai/rate-limit';
import { DEMO_QUESTIONS, generateInsufficientFeedback } from '@/lib/demo/demo-data';
import { env } from '@/lib/env';
import { z } from 'zod';

const requestSchema = z.object({
  jobFunction: z.enum(['developer', 'marketer', 'designer', 'pm', 'general']),
  questionIndex: z.number().int().min(0).max(2),
  isFollowUp: z.boolean(),
  question: z.string().min(1).max(1000),
  answer: z.string().min(1).max(5000),
});

export async function POST(request: NextRequest) {
  try {
    // 1. IP rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    const rateLimit = checkDemoRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: '데모 평가 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
      );
    }

    // 2. Global AI rate limit
    const aiLimit = checkAIRateLimit();
    if (!aiLimit.allowed) {
      return NextResponse.json(
        { error: 'AI 서비스가 바쁩니다. 잠시 후 다시 시도해주세요.' },
        { status: 429, headers: { 'Retry-After': String(aiLimit.retryAfter) } }
      );
    }

    // 3. Validate request body
    const body = await request.json();
    const result = requestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: '입력 데이터가 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    const { jobFunction, questionIndex, isFollowUp, question, answer } = result.data;

    // 4. Look up the demo question for expectedKeyPoints and fallback
    const demoQuestion = DEMO_QUESTIONS[jobFunction]?.[questionIndex];
    if (!demoQuestion) {
      return NextResponse.json(
        { error: '질문을 찾을 수 없습니다.' },
        { status: 400 }
      );
    }

    // 5. Classify answer quality
    const quality = classifyAnswerQuality(answer);

    // 6. Handle insufficient answers without AI call
    if (quality.level === 'insufficient') {
      const feedback = generateInsufficientFeedback(demoQuestion, isFollowUp);
      return NextResponse.json({
        feedback,
        qualityLevel: 'insufficient',
        aiPowered: false,
      });
    }

    // 7. Build prompt and call AI
    const expectedKeyPoints = isFollowUp
      ? demoQuestion.followUpExpectedKeyPoints
      : demoQuestion.expectedKeyPoints;

    const messages = buildDemoEvaluationPrompt(
      sanitizeForPrompt(question),
      sanitizeForPrompt(answer),
      jobFunction,
      quality.level,
      expectedKeyPoints,
      isFollowUp,
    );

    const aiClient = createAIClient({ endpoint: 'evaluate' });

    const { content } = await aiClient.chat({
      messages,
      model: env.AI_MODEL,
      temperature: 0.3,
      maxTokens: 1024,
    });

    // 8. Parse JSON response
    const jsonMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/)
      || content.match(/(\{[\s\S]*"score"[\s\S]*\})/);

    if (!jsonMatch) {
      // Fallback to static feedback on parse failure
      return NextResponse.json({
        feedback: demoQuestion.sampleFeedback,
        qualityLevel: quality.level,
        aiPowered: false,
      });
    }

    const parsed = JSON.parse(jsonMatch[1]);

    // 9. Validate and return
    const feedback = {
      score: Math.max(1, Math.min(10, Number(parsed.score) || 5)),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 3) : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 3) : [],
      tip: typeof parsed.tip === 'string' ? parsed.tip : '',
    };

    return NextResponse.json({
      feedback,
      qualityLevel: quality.level,
      aiPowered: true,
    });
  } catch (error) {
    console.error('Demo evaluation error:', error);
    return NextResponse.json(
      { error: '평가 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
