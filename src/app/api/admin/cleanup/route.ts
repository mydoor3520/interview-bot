import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { prismaBase as prisma } from '@/lib/db/prisma';

/**
 * CSRF 보호: Origin 헤더를 검증하여 외부 사이트에서의 요청을 차단합니다.
 */
function verifyCsrf(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  // Origin 헤더가 없는 경우 (서버 간 호출 등) - 차단
  if (!origin) return false;

  try {
    const originUrl = new URL(origin);
    // Origin의 호스트가 요청 호스트와 일치해야 함
    return originUrl.host === host;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  // CSRF 보호
  if (!verifyCsrf(request)) {
    return NextResponse.json(
      { error: '잘못된 요청 출처입니다.' },
      { status: 403 }
    );
  }

  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  const retentionDays = 90;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  try {
    const result = await prisma.aIUsageLog.deleteMany({
      where: { createdAt: { lt: cutoffDate } },
    });

    return NextResponse.json({
      deleted: result.count,
      cutoffDate: cutoffDate.toISOString(),
      retentionDays,
    });
  } catch (error) {
    console.error('[Admin] Cleanup error:', error);
    return NextResponse.json(
      { error: '데이터 정리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
