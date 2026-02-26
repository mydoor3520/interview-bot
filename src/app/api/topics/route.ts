import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { requireAdmin } from '@/lib/auth/require-admin';
import { z } from 'zod';
import { checkUserRateLimit } from '@/lib/auth/user-rate-limit';

const createTopicSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
});

const updateTopicSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  category: z.string().min(1).max(50).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  try {
    const topics = await prisma.topicConfig.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ topics });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.authenticated) return auth.response;

  // Rate limit check: 20 requests per minute for topics mutations
  const rateLimit = checkUserRateLimit(auth.user.userId, 'topics-mutation', 20);
  if (rateLimit) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
    );
  }

  try {
    const body = await request.json();
    const result = createTopicSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: '입력 데이터가 올바르지 않습니다.' }, { status: 400 });
    }

    const topic = await prisma.topicConfig.create({
      data: {
        ...result.data,
        isPreset: false,
      },
    });

    return NextResponse.json({ topic }, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.authenticated) return auth.response;

  // Rate limit check: 20 requests per minute for topics mutations
  const rateLimit = checkUserRateLimit(auth.user.userId, 'topics-mutation', 20);
  if (rateLimit) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
    );
  }

  try {
    const body = await request.json();
    const result = updateTopicSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: '입력 데이터가 올바르지 않습니다.' }, { status: 400 });
    }

    const { id, ...data } = result.data;

    const topic = await prisma.topicConfig.update({
      where: { id },
      data,
    });

    return NextResponse.json({ topic });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.authenticated) return auth.response;

  // Rate limit check: 20 requests per minute for topics mutations
  const rateLimit = checkUserRateLimit(auth.user.userId, 'topics-mutation', 20);
  if (rateLimit) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });
    }

    // Check if topic is preset
    const topic = await prisma.topicConfig.findUnique({ where: { id } });
    if (!topic) {
      return NextResponse.json({ error: '주제를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (topic.isPreset) {
      return NextResponse.json({ error: '프리셋 주제는 삭제할 수 없습니다.' }, { status: 403 });
    }

    await prisma.topicConfig.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
