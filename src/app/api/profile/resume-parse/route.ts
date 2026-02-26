import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { checkUserRateLimit } from '@/lib/auth/user-rate-limit';
import { parseResumePDF } from '@/lib/ai/resume-parser';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-

export async function POST(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  // Rate limit: 10 requests per hour
  const rateLimit = checkUserRateLimit(auth.user.userId, 'resume-parse', 10, 3600_000);
  if (rateLimit) {
    return NextResponse.json(
      { error: '이력서 분석 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.', retryAfter: rateLimit.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'PDF 파일을 선택해주세요.' }, { status: 400 });
    }

    // Content-Type check
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'PDF 파일만 업로드 가능합니다.' }, { status: 400 });
    }

    // File size check
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: '파일 크기는 10MB 이하만 가능합니다.' }, { status: 413 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: '빈 파일입니다.' }, { status: 400 });
    }

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Magic byte validation (%PDF-)
    const isValidPdf = PDF_MAGIC_BYTES.every((byte, i) => buffer[i] === byte);
    if (!isValidPdf) {
      return NextResponse.json({ error: '올바른 PDF 파일이 아닙니다.' }, { status: 400 });
    }

    // Parse resume with AI
    const parsed = await parseResumePDF(buffer);

    return NextResponse.json({
      success: true,
      parsed,
    });
  } catch (error) {
    console.error('[resume-parse] Error:', error);

    const message = error instanceof Error ? error.message : '알 수 없는 오류';

    if (message.includes('PDF') || message.includes('이미지')) {
      return NextResponse.json({ error: 'PDF 변환에 실패했습니다. 다른 PDF 파일을 시도해주세요.' }, { status: 500 });
    }

    return NextResponse.json(
      { error: '이력서 분석에 실패했습니다. 수동으로 입력해주세요.' },
      { status: 500 }
    );
  }
}
