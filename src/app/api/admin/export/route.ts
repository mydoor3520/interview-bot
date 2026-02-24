import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { prisma, prismaBase } from '@/lib/db/prisma';
import { logAuditEvent } from '@/lib/audit-log';

const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

function escapeCSVField(field: string): string {
  // Neutralize formula injection for spreadsheet safety
  if (FORMULA_PREFIXES.some(p => field.startsWith(p))) {
    field = "'" + field;
  }
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return '"' + field.replace(/"/g, '""') + '"';
  }
  return field;
}

function formatDate(d: Date | null): string {
  if (!d) return '';
  return new Date(d).toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.authenticated) return auth.response;

  try {
    const { searchParams } = request.nextUrl;
    const type = searchParams.get('type');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const countOnly = searchParams.get('countOnly') === 'true';

    if (!type || !['users', 'sessions', 'revenue', 'ai-usage'].includes(type)) {
      return NextResponse.json({ error: '유효하지 않은 내보내기 유형입니다.' }, { status: 400 });
    }

    if (!dateFrom || !dateTo) {
      return NextResponse.json({ error: '날짜 범위를 지정해주세요.' }, { status: 400 });
    }

    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);

    // Max 90 days
    const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 90) {
      return NextResponse.json({ error: '최대 90일까지 내보내기 가능합니다.' }, { status: 400 });
    }

    // Count only mode (for preview)
    if (countOnly) {
      let count = 0;
      switch (type) {
        case 'users':
          count = await prisma.user.count({ where: { createdAt: { gte: from, lte: to } } });
          break;
        case 'sessions':
          count = await prisma.interviewSession.count({ where: { createdAt: { gte: from, lte: to } } });
          break;
        case 'revenue':
          count = await prismaBase.payment.count({ where: { createdAt: { gte: from, lte: to } } });
          break;
        case 'ai-usage':
          count = await prismaBase.aIUsageLog.count({ where: { createdAt: { gte: from, lte: to } } });
          break;
      }
      return NextResponse.json({ count });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // UTF-8 BOM for Korean Excel compatibility
        controller.enqueue(encoder.encode('\uFEFF'));

        switch (type) {
          case 'users': {
            controller.enqueue(encoder.encode('이메일,이름,구독티어,활성상태,가입일,마지막로그인,세션수\n'));
            let cursor: string | undefined;
            while (true) {
              const batch = await prisma.user.findMany({
                where: { createdAt: { gte: from, lte: to } },
                include: { _count: { select: { sessions: true } } },
                take: 100,
                skip: cursor ? 1 : 0,
                cursor: cursor ? { id: cursor } : undefined,
                orderBy: { id: 'asc' },
              });
              if (batch.length === 0) break;
              for (const u of batch) {
                const row = [
                  escapeCSVField(u.email),
                  escapeCSVField(u.name || ''),
                  u.subscriptionTier,
                  u.isActive ? '활성' : '비활성',
                  formatDate(u.createdAt),
                  formatDate(u.lastLoginAt),
                  String(u._count.sessions),
                ].join(',') + '\n';
                controller.enqueue(encoder.encode(row));
              }
              cursor = batch[batch.length - 1].id;
            }
            break;
          }
          case 'sessions': {
            controller.enqueue(encoder.encode('ID,사용자이메일,주제,난이도,상태,점수,질문수,시작일,완료일\n'));
            let cursor: string | undefined;
            while (true) {
              const batch = await prisma.interviewSession.findMany({
                where: { createdAt: { gte: from, lte: to } },
                include: { user: { select: { email: true } } },
                take: 100,
                skip: cursor ? 1 : 0,
                cursor: cursor ? { id: cursor } : undefined,
                orderBy: { id: 'asc' },
              });
              if (batch.length === 0) break;
              for (const s of batch) {
                const row = [
                  s.id,
                  escapeCSVField(s.user?.email || ''),
                  escapeCSVField(s.topics.join('; ')),
                  s.difficulty,
                  s.status,
                  s.totalScore !== null ? String(s.totalScore) : '',
                  String(s.questionCount),
                  formatDate(s.startedAt),
                  formatDate(s.completedAt),
                ].join(',') + '\n';
                controller.enqueue(encoder.encode(row));
              }
              cursor = batch[batch.length - 1].id;
            }
            break;
          }
          case 'revenue': {
            controller.enqueue(encoder.encode('결제ID,금액,통화,상태,결제일\n'));
            let cursor: string | undefined;
            while (true) {
              const batch = await prismaBase.payment.findMany({
                where: { createdAt: { gte: from, lte: to } },
                take: 100,
                skip: cursor ? 1 : 0,
                cursor: cursor ? { id: cursor } : undefined,
                orderBy: { id: 'asc' },
              });
              if (batch.length === 0) break;
              for (const p of batch) {
                const row = [
                  p.id,
                  String(p.amount),
                  p.currency,
                  p.status,
                  formatDate(p.createdAt),
                ].join(',') + '\n';
                controller.enqueue(encoder.encode(row));
              }
              cursor = batch[batch.length - 1].id;
            }
            break;
          }
          case 'ai-usage': {
            controller.enqueue(encoder.encode('ID,엔드포인트,모델,입력토큰,출력토큰,비용,성공여부,생성일\n'));
            let cursor: string | undefined;
            while (true) {
              const batch = await prismaBase.aIUsageLog.findMany({
                where: { createdAt: { gte: from, lte: to } },
                take: 100,
                skip: cursor ? 1 : 0,
                cursor: cursor ? { id: cursor } : undefined,
                orderBy: { id: 'asc' },
              });
              if (batch.length === 0) break;
              for (const a of batch) {
                const row = [
                  a.id,
                  a.endpoint,
                  a.model,
                  String(a.promptTokens),
                  String(a.completionTokens),
                  a.cost !== null ? String(a.cost) : '',
                  a.success ? '성공' : '실패',
                  formatDate(a.createdAt),
                ].join(',') + '\n';
                controller.enqueue(encoder.encode(row));
              }
              cursor = batch[batch.length - 1].id;
            }
            break;
          }
        }
        controller.close();
      },
    });

    await logAuditEvent({
      userId: auth.user.userId,
      action: 'admin.export.generated',
      resource: 'export',
      details: { type, dateFrom, dateTo },
    });

    const filename = `${type}_${dateFrom}_${dateTo}.csv`;
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: '데이터 내보내기 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
