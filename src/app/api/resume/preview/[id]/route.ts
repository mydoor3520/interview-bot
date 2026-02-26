import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { renderToHtml } from '@/lib/resume/templates';
import type { ResumeData, TemplateType } from '@/lib/resume/types';

/**
 * Preview endpoint — no auth required.
 * Document IDs are CUIDs (unguessable), and content is protected by strict CSP.
 * This is necessary because the preview is rendered inside a sandboxed iframe
 * which cannot forward auth cookies/headers.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const doc = await (prisma.resumeDocument as any).findUnique({
      where: { id },
    });

    if (!doc) {
      return NextResponse.json({ error: '이력서를 찾을 수 없습니다.' }, { status: 404 });
    }

    const resumeData = doc.content as unknown as ResumeData;
    const template = doc.template as TemplateType;
    const html = renderToHtml(resumeData, template);

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; font-src 'self'",
        'X-Frame-Options': 'SAMEORIGIN',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('[resume/preview] error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
