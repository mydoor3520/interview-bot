import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const feedbackSchema = z.object({
  category: z.enum(['bug', 'feature', 'ux', 'performance', 'general']),
  content: z.string().min(1).max(5000),
  rating: z.number().int().min(1).max(5).nullish(),
  page: z.string().max(500).nullish(),
});

export async function POST(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  const body = await request.json();
  const result = feedbackSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: '입력 데이터가 올바르지 않습니다.', details: result.error.issues },
      { status: 400 }
    );
  }

  const { category, content, rating, page } = result.data;

  await prisma.betaFeedback.create({
    data: {
      userId: auth.user.userId,
      category,
      content,
      rating: rating ?? undefined,
      page: page ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    },
  });

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  // Only return user's own feedback
  const feedback = await prisma.betaFeedback.findMany({
    where: { userId: auth.user.userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({ feedback });
}
