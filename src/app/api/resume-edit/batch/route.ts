import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const batchDeleteSchema = z.object({
  ids: z.array(z.string()).min(1).max(50),
});

export async function DELETE(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  try {
    const body = await request.json();
    const parsed = batchDeleteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: '유효하지 않은 요청입니다.' }, { status: 400 });
    }

    const { ids } = parsed.data;

    const profile = await prisma.userProfile.findFirst({
      where: { userId: auth.user.userId },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: '프로필을 찾을 수 없습니다.' }, { status: 404 });
    }

    const ownedEdits = await prisma.resumeEdit.findMany({
      where: { id: { in: ids }, profileId: profile.id },
      select: { id: true },
    });

    if (ownedEdits.length !== ids.length) {
      return NextResponse.json({ error: '일부 항목이 유효하지 않습니다.' }, { status: 400 });
    }

    const validIds = ownedEdits.map((e) => e.id);

    const result = await prisma.resumeEdit.deleteMany({
      where: { id: { in: validIds } },
    });

    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
