import { chromium, type Browser, type Frame } from 'playwright';
import { isUrlSafe } from '@/lib/security/url-validator';

// ── Types ──
export interface PageScreenshot {
  dataUrl: string;   // data:image/png;base64,...
  source: string;    // 'iframe:0', 'main-page', etc.
}

export interface FetchPageResult {
  html: string;
  screenshots: PageScreenshot[];
}

// ── Browser Singleton ──
let browserInstance: Browser | null = null;
let launching: Promise<Browser> | null = null;

// ── Concurrency Limiting ──
const MAX_CONCURRENT = 3;
let activeSessions = 0;
const waitQueue: Array<{ resolve: () => void; reject: (err: Error) => void }> = [];
const QUEUE_TIMEOUT = 60_000;

// iframe 필터 패턴 (광고, 트래킹, 동영상)
const IFRAME_BLOCK_PATTERNS = [
  'googletagmanager', 'criteo', 'doubleclick', 'facebook.com',
  'youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com',
];

async function getBrowser(): Promise<Browser> {
  if (browserInstance?.isConnected()) return browserInstance;

  if (launching) return launching;

  launching = (async () => {
    try {
      if (browserInstance) {
        await browserInstance.close().catch(() => {});
        browserInstance = null;
      }
      browserInstance = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });
      browserInstance.on('disconnected', () => {
        browserInstance = null;
        launching = null;
      });
      return browserInstance;
    } finally {
      launching = null;
    }
  })();

  return launching;
}

async function acquireSlot(): Promise<void> {
  if (activeSessions < MAX_CONCURRENT) {
    activeSessions++;
    return;
  }
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      const idx = waitQueue.findIndex(w => w.resolve === resolve);
      if (idx !== -1) waitQueue.splice(idx, 1);
      reject(new Error('BROWSER_QUEUE_TIMEOUT'));
    }, QUEUE_TIMEOUT);

    waitQueue.push({
      resolve: () => { clearTimeout(timer); activeSessions++; resolve(); },
      reject: (err) => { clearTimeout(timer); reject(err); },
    });
  });
}

function releaseSlot(): void {
  activeSessions--;
  if (waitQueue.length > 0 && activeSessions < MAX_CONCURRENT) {
    const next = waitQueue.shift();
    next?.resolve();
  }
}

function isContentFrame(f: Frame, pageUrl: string): boolean {
  const frameUrl = f.url();
  if (!frameUrl || frameUrl.startsWith('about:') || frameUrl.includes('javascript:')) return false;
  if (frameUrl === pageUrl) return false;
  if (IFRAME_BLOCK_PATTERNS.some(p => frameUrl.includes(p))) return false;
  // 사라민 relay: rec_seq=0만 포함 (메인 공고 상세)
  if (frameUrl.includes('view-detail') && frameUrl.includes('rec_seq=')) {
    const seqMatch = frameUrl.match(/rec_seq=(\d+)/);
    if (seqMatch && parseInt(seqMatch[1], 10) > 0) return false;
  }
  return true;
}

/**
 * iframe 콘텐츠가 이미지 위주인지 판단한다.
 * HTML 내 <img> 태그가 있고, script/style 제거 후 순수 텍스트가 200자 미만이면 이미지 위주.
 */
function isImageHeavyIframe(frameHtml: string): boolean {
  const hasImages = /<img\s/i.test(frameHtml);
  if (!hasImages) return false;
  // script, style 태그 및 내용 제거
  const cleaned = frameHtml
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length < 200;
}

const SCREENSHOT_TIMEOUT = 10_000;

async function fetchPage(url: string, timeout: number): Promise<FetchPageResult> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'ko-KR',
    viewport: { width: 1280, height: 800 },
    extraHTTPHeaders: {
      'Sec-CH-UA': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      'Sec-CH-UA-Mobile': '?0',
      'Sec-CH-UA-Platform': '"macOS"',
      'Sec-CH-UA-Platform-Version': '"15.2.0"',
    },
  });
  const page = await context.newPage();
  const screenshots: PageScreenshot[] = [];

  try {
    // SSRF interceptor
    await page.route('**', async (route) => {
      const reqUrl = route.request().url();
      if (isUrlSafe(reqUrl)) {
        await route.continue();
      } else {
        console.warn('[Playwright] SSRF blocked subrequest:', reqUrl);
        await route.abort('failed');
      }
    });

    // Navigate
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });

    // Wait for rendering
    await Promise.race([
      page.waitForLoadState('networkidle').catch(() => {}),
      new Promise(resolve => setTimeout(resolve, 5_000)),
    ]);
    await page.waitForTimeout(1_000);

    // 사이트별 동적 콘텐츠 대기 (SPA 상세 패널 등)
    const hostname = new URL(url).hostname;
    if (hostname.includes('rocketpunch.com') && url.includes('selectedJobId')) {
      // 로켓펀치: Panda CSS SPA, 목록/상세 분할 레이아웃 — 우측 상세 패널 로드 대기
      // 주의: #job-content는 좌측 목록 패널이므로 사용하지 않음
      console.log('[Playwright] RocketPunch split-panel detected, waiting for detail panel...');
      await page.waitForSelector('[class*="textStyle_Title"], [class*="textStyle_Textual"], [class*="white-space_pre-line"]', { timeout: 10_000 }).catch(() => {
        console.warn('[Playwright] RocketPunch detail panel Panda CSS selectors not found within timeout');
      });
      await page.waitForTimeout(500);
    }

    // Extract HTML + iframe contents
    let html = await page.content();

    const contentFrames = page.frames().filter(f => isContentFrame(f, page.url()));

    if (contentFrames.length > 0) {
      const iframeContents: string[] = [];

      for (const frame of contentFrames) {
        try {
          const frameHtml = await frame.content();
          if (frameHtml.length <= 200) continue;

          iframeContents.push(frameHtml);

          // 이미지 위주 iframe이면 fullPage 스크린샷 캡처
          if (isImageHeavyIframe(frameHtml) && screenshots.length === 0) {
            console.log('[Playwright] Image-heavy iframe detected, capturing page screenshot:', frame.url().slice(0, 100));
            try {
              const buf = await Promise.race([
                page.screenshot({ fullPage: true, type: 'png' }),
                new Promise<never>((_, reject) =>
                  setTimeout(() => reject(new Error('SCREENSHOT_TIMEOUT')), SCREENSHOT_TIMEOUT)
                ),
              ]);
              const base64 = buf.toString('base64');
              screenshots.push({
                dataUrl: `data:image/png;base64,${base64}`,
                source: 'fullpage',
              });
              console.log('[Playwright] Page screenshot captured, size:', Math.round(buf.length / 1024), 'KB');
            } catch (ssErr) {
              console.warn('[Playwright] Screenshot capture failed:', (ssErr as Error).message);
            }
          }
        } catch (err) {
          console.warn('[Playwright] Frame error:', (err as Error).message);
        }
      }

      if (iframeContents.length > 0) {
        const iframeSection = iframeContents
          .map((content, i) => `<!-- IFRAME_CONTENT_${i} -->\n<div data-iframe-content="${i}">${content}</div>`)
          .join('\n');
        html = html.replace('</body>', `${iframeSection}\n</body>`);
      }
    }

    return { html, screenshots };
  } finally {
    await context.close();
  }
}

export async function fetchWithBrowser(url: string, options?: {
  timeout?: number;
}): Promise<FetchPageResult> {
  const timeout = options?.timeout ?? 30_000;
  await acquireSlot();

  try {
    return await fetchPage(url, timeout);
  } catch (err) {
    // Browser crash: retry once
    if ((err as Error).message?.includes('Target closed') ||
        (err as Error).message?.includes('Browser closed')) {
      console.warn('[Playwright] Browser crashed, retrying once...');
      browserInstance = null;
      return await fetchPage(url, timeout);
    }
    throw err;
  } finally {
    releaseSlot();
  }
}

/**
 * HTML 문자열을 A4 PDF로 변환한다.
 * 기존 싱글톤 브라우저 + 동시성 큐를 재사용한다.
 */
export async function generatePdfFromHtml(html: string): Promise<Buffer> {
  await acquireSlot();

  try {
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      await page.setContent(html, { waitUntil: 'domcontentloaded' });

      const pdf = await page.pdf({
        format: 'A4',
        margin: { top: '20mm', right: '0', bottom: '15mm', left: '0' },
        printBackground: true,
      });

      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  } catch (err) {
    // Browser crash: retry once
    if ((err as Error).message?.includes('Target closed') ||
        (err as Error).message?.includes('Browser closed')) {
      console.warn('[Playwright] Browser crashed during PDF generation, retrying once...');
      browserInstance = null;

      const browser = await getBrowser();
      const page = await browser.newPage();
      try {
        await page.setContent(html, { waitUntil: 'domcontentloaded' });
        const pdf = await page.pdf({
          format: 'A4',
          margin: { top: '20mm', right: '0', bottom: '15mm', left: '0' },
          printBackground: true,
        });
        return Buffer.from(pdf);
      } finally {
        await page.close();
      }
    }
    throw err;
  } finally {
    releaseSlot();
  }
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance?.isConnected()) {
    await browserInstance.close();
    browserInstance = null;
  }
}
