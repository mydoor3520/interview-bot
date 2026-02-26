/**
 * 프로필 사진 URL을 base64 data URI로 변환하는 유틸리티.
 * Playwright SSRF 인터셉터가 외부 URL을 차단하므로,
 * PDF/HTML 렌더링 전에 서버 사이드에서 base64로 변환해야 한다.
 */

import path from 'path';
import { promises as fs } from 'fs';

const PHOTO_FETCH_TIMEOUT = 5_000;
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
const SAFE_UPLOADS_DIR = path.resolve(process.cwd(), 'public', 'uploads');

/**
 * SSRF 방지: 내부 네트워크/클라우드 메타데이터 URL 차단
 */
function isSsrfSafeUrl(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
  const hostname = parsed.hostname.toLowerCase();
  // Block localhost variants
  if (hostname === 'localhost' || hostname === '0.0.0.0' || hostname === '127.0.0.1' || hostname === '::1') return false;
  // Block private IP ranges
  if (/^10\./.test(hostname)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return false;
  if (/^192\.168\./.test(hostname)) return false;
  // Block link-local / cloud metadata
  if (/^169\.254\./.test(hostname)) return false;
  // Block internal DNS suffixes
  if (hostname.endsWith('.internal') || hostname.endsWith('.local')) return false;
  return true;
}

/**
 * 외부 사진 URL을 base64 data URI로 변환한다.
 * 실패 시 undefined를 반환 (사진 없이 이력서 생성 진행).
 */
export async function photoUrlToBase64(url: string): Promise<string | undefined> {
  if (url.startsWith('/uploads/')) {
    try {
      const filePath = path.resolve(process.cwd(), 'public', url);
      // Path traversal 방지: uploads 디렉토리 내부인지 확인
      if (!filePath.startsWith(SAFE_UPLOADS_DIR + path.sep)) {
        console.warn(`[photo-utils] Path traversal blocked: ${url}`);
        return undefined;
      }
      const buffer = await fs.readFile(filePath);
      const ext = path.extname(url).slice(1);
      const mimeType = ext === 'webp' ? 'image/webp' : ext === 'png' ? 'image/png' : 'image/jpeg';
      return `data:${mimeType};base64,${buffer.toString('base64')}`;
    } catch {
      return undefined;
    }
  }

  // SSRF 방지: 내부 네트워크 URL 차단
  if (!isSsrfSafeUrl(url)) {
    console.warn(`[photo-utils] SSRF blocked: ${url}`);
    return undefined;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PHOTO_FETCH_TIMEOUT);

    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'error', // 리다이렉트를 통한 SSRF 우회 방지
      headers: { 'Accept': 'image/*' },
    });
    clearTimeout(timer);

    if (!response.ok) {
      console.warn(`[photo-utils] Failed to fetch photo: ${response.status}`);
      return undefined;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      console.warn(`[photo-utils] Invalid content-type: ${contentType}`);
      return undefined;
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_PHOTO_SIZE) {
      console.warn(`[photo-utils] Photo too large: ${Math.round(buffer.byteLength / 1024)}KB`);
      return undefined;
    }

    const base64 = Buffer.from(buffer).toString('base64');
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.warn('[photo-utils] Photo fetch error:', (error as Error).message);
    return undefined;
  }
}

/**
 * 사진 URL을 fetch하여 Buffer + dimensions 메타데이터를 반환한다.
 * DOCX ImageRun에 필요한 Buffer와 고정 크기를 제공한다.
 */
export async function fetchPhotoBuffer(url: string): Promise<{ buffer: Buffer; width: number; height: number } | undefined> {
  // SSRF 방지: 내부 네트워크 URL 차단
  if (!url.startsWith('/uploads/') && !isSsrfSafeUrl(url)) {
    console.warn(`[photo-utils] SSRF blocked in fetchPhotoBuffer: ${url}`);
    return undefined;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PHOTO_FETCH_TIMEOUT);

    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'error',
      headers: { 'Accept': 'image/*' },
    });
    clearTimeout(timer);

    if (!response.ok) return undefined;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return undefined;

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_PHOTO_SIZE) return undefined;

    return {
      buffer: Buffer.from(arrayBuffer),
      width: 90,   // 이력서 사진 표준 사이즈 (px)
      height: 110,
    };
  } catch (error) {
    console.warn('[photo-utils] Photo buffer fetch error:', (error as Error).message);
    return undefined;
  }
}
