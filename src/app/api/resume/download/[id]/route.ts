import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { prisma } from '@/lib/db/prisma';
import { generatePdf } from '@/lib/resume/generators/pdf-generator';
import { generateDocx } from '@/lib/resume/generators/docx-generator';
import { renderToHtml } from '@/lib/resume/templates';
import type { ResumeData, TemplateType } from '@/lib/resume/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'pdf';

    if (format !== 'pdf' && format !== 'docx') {
      return NextResponse.json({ error: 'format은 pdf 또는 docx여야 합니다.' }, { status: 400 });
    }

    // Fetch document
    const doc = await prisma.resumeDocument.findUnique({
      where: { id },
      include: { profile: { select: { userId: true, name: true } } },
    });

    if (!doc) {
      return NextResponse.json({ error: '이력서를 찾을 수 없습니다.' }, { status: 404 });
    }

    // Owner check
    if (doc.profile.userId !== auth.user.userId) {
      return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 });
    }

    const resumeData = doc.content as unknown as ResumeData;
    const template = doc.template as TemplateType;
    const filename = `이력서_${doc.profile.name}_${new Date(doc.createdAt).toISOString().split('T')[0]}`;

    if (format === 'pdf') {
      let pdfBuffer: Buffer;
      try {
        const html = renderToHtml(resumeData, template);
        pdfBuffer = await generatePdf(html);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('queue') || msg.includes('busy') || msg.includes('capacity')) {
          return NextResponse.json(
            { error: 'PDF 생성 서버가 바쁩니다. 잠시 후 다시 시도해주세요.' },
            {
              status: 503,
              headers: { 'Retry-After': '10' },
            }
          );
        }
        throw err;
      }

      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.pdf"`,
          'Content-Length': String(pdfBuffer.length),
        },
      });
    } else {
      const docxBuffer = await generateDocx(resumeData, template);
      return new NextResponse(new Uint8Array(docxBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.docx"`,
          'Content-Length': String(docxBuffer.length),
        },
      });
    }
  } catch (error) {
    console.error('[resume/download] error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
