import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { prisma } from '@/lib/db/prisma';
import { checkUserRateLimit } from '@/lib/auth/user-rate-limit';
import { createAIClient } from '@/lib/ai/client';
import { buildGenerateQuestionsPrompt } from '@/lib/ai/prompts';
import { logTokenUsage } from '@/lib/ai/usage-logger';
import { countMessagesTokens, countTokens } from '@/lib/ai/token-counter';
import { env } from '@/lib/env';

async function verifyPositionOwnership(positionId: string, userId: string) {
  const position = await prisma.targetPosition.findUnique({
    where: { id: positionId },
    include: { profile: { select: { userId: true } } },
  });

  if (!position || position.profile.userId !== userId) {
    return null;
  }

  return position;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;

  try {
    const position = await verifyPositionOwnership(id, auth.user.userId);
    if (!position) {
      return NextResponse.json(
        { error: '포지션을 찾을 수 없습니다.', code: 'POSITION_NOT_FOUND' },
        { status: 404 }
      );
    }

    const questions = await prisma.generatedQuestion.findMany({
      where: { targetPositionId: id },
      orderBy: { orderIndex: 'asc' },
    });

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;

  // Rate limit check: 10 requests per minute for question generation
  const rateLimit = checkUserRateLimit(auth.user.userId, 'position-questions', 10);
  if (rateLimit) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
    );
  }

  try {
    const position = await verifyPositionOwnership(id, auth.user.userId);
    if (!position) {
      return NextResponse.json(
        { error: '포지션을 찾을 수 없습니다.', code: 'POSITION_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Check if questions already exist
    const existingCount = await prisma.generatedQuestion.count({
      where: { targetPositionId: id },
    });

    if (existingCount > 0) {
      return NextResponse.json(
        { error: '이미 질문이 생성되어 있습니다.', code: 'QUESTIONS_ALREADY_EXIST' },
        { status: 409 }
      );
    }

    // Validate sufficient data
    const hasJobDescription = position.jobDescription && position.jobDescription.trim().length > 0;
    const hasRequirements = position.requirements && position.requirements.length > 0;
    const hasPreferredQualifications = position.preferredQualifications && position.preferredQualifications.length > 0;

    if (!hasJobDescription && !hasRequirements && !hasPreferredQualifications) {
      return NextResponse.json(
        {
          error: '질문을 생성하기 위한 정보가 부족합니다. 직무 설명, 자격 요건, 또는 우대 사항 중 하나 이상을 입력해주세요.',
          code: 'INSUFFICIENT_DATA',
        },
        { status: 422 }
      );
    }

    // Build AI prompt
    const messages = buildGenerateQuestionsPrompt({
      company: position.company,
      position: position.position,
      jobDescription: position.jobDescription || undefined,
      requirements: position.requirements,
      preferredQualifications: position.preferredQualifications,
      requiredExperience: position.requiredExperience || undefined,
    });

    // Call AI
    const startTime = Date.now();
    const aiClient = createAIClient({ endpoint: 'generate_questions' });
    const result = await aiClient.chat({
      model: env.AI_MODEL,
      messages,
      temperature: 0.7,
      maxTokens: 4096,
    });

    // Parse JSON response
    let jsonStr = result.content.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);
    const questionsData = parsed.questions;

    if (!Array.isArray(questionsData) || questionsData.length === 0) {
      return NextResponse.json(
        { error: 'AI 응답에서 질문을 추출할 수 없습니다.' },
        { status: 500 }
      );
    }

    // Save questions to database
    const questions = await prisma.generatedQuestion.createMany({
      data: questionsData.map((q: any, index: number) => ({
        targetPositionId: id,
        content: q.content,
        category: q.category,
        reasoning: q.reasoning || null,
        orderIndex: index,
      })),
    });

    // Fetch created questions for response
    const createdQuestions = await prisma.generatedQuestion.findMany({
      where: { targetPositionId: id },
      orderBy: { orderIndex: 'asc' },
    });

    // Log AI usage
    const promptTokens = result.usage?.promptTokens ?? countMessagesTokens(messages);
    const completionTokens = result.usage?.completionTokens ?? countTokens(result.content);

    await logTokenUsage({
      endpoint: 'generate_questions',
      model: env.AI_MODEL,
      promptTokens,
      completionTokens,
      estimated: !result.usage,
      durationMs: Date.now() - startTime,
      userId: auth.user.userId,
      tier: auth.user.tier,
    });

    return NextResponse.json({ questions: createdQuestions }, { status: 201 });
  } catch (error) {
    console.error('API error:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'AI 응답 파싱 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;

  try {
    const position = await verifyPositionOwnership(id, auth.user.userId);
    if (!position) {
      return NextResponse.json(
        { error: '포지션을 찾을 수 없습니다.', code: 'POSITION_NOT_FOUND' },
        { status: 404 }
      );
    }

    await prisma.generatedQuestion.deleteMany({
      where: { targetPositionId: id },
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
