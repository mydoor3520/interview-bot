import { generatePdfFromHtml } from '@/lib/browser/playwright-client';

/**
 * HTML 문자열을 A4 PDF Buffer로 변환한다.
 * playwright-client.ts의 싱글톤 브라우저 + 동시성 큐를 사용한다.
 */
export async function generatePdf(html: string): Promise<Buffer> {
  return generatePdfFromHtml(html);
}
