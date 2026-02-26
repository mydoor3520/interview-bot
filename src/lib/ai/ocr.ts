import path from 'path';
import { createWorker } from 'tesseract.js';

const OCR_TIMEOUT = 30_000;

// Next.js standalone 빌드에서 __dirname이 /ROOT로 매핑되어
// Tesseract worker 경로가 깨지므로 process.cwd() 기반으로 명시 지정
const WORKER_PATH = path.join(
  process.cwd(),
  'node_modules',
  'tesseract.js',
  'src',
  'worker-script',
  'node',
  'index.js',
);

/**
 * base64 data URL 스크린샷에서 한국어 텍스트를 OCR로 추출한다.
 * Tesseract.js worker를 매번 생성/종료하여 메모리 누수를 방지한다.
 */
export async function extractTextFromScreenshot(dataUrl: string): Promise<string> {
  const worker = await createWorker('kor+eng', 1, { workerPath: WORKER_PATH });

  try {
    const result = await Promise.race([
      worker.recognize(dataUrl),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('OCR_TIMEOUT')), OCR_TIMEOUT)
      ),
    ]);

    const text = result.data.text?.trim() || '';
    console.log('[OCR] Extracted', text.length, 'chars, confidence:', Math.round(result.data.confidence));
    return text;
  } finally {
    await worker.terminate().catch(() => {});
  }
}

/**
 * 여러 스크린샷에서 OCR 텍스트를 추출하여 합친다.
 */
export async function extractTextFromScreenshots(
  dataUrls: string[],
): Promise<{ text: string; count: number }> {
  if (dataUrls.length === 0) return { text: '', count: 0 };

  const texts: string[] = [];

  for (const dataUrl of dataUrls) {
    try {
      const text = await extractTextFromScreenshot(dataUrl);
      if (text.length > 20) {
        texts.push(text);
      }
    } catch (err) {
      console.warn('[OCR] Failed for screenshot:', (err as Error).message);
    }
  }

  return {
    text: texts.join('\n\n'),
    count: texts.length,
  };
}
