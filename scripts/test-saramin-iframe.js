const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'ko-KR',
    extraHTTPHeaders: {
      'Sec-CH-UA': '"Google Chrome";v="131", "Chromium";v="131"',
      'Sec-CH-UA-Mobile': '?0',
      'Sec-CH-UA-Platform': '"macOS"',
      'Accept-Language': 'ko-KR,ko;q=0.9',
    },
  });
  const page = await context.newPage();

  const response = await page.goto('https://www.saramin.co.kr/zf_user/jobs/relay/view?view_type=search&rec_idx=52806922', {
    waitUntil: 'domcontentloaded',
    timeout: 45000,
  });

  await Promise.race([
    page.waitForLoadState('networkidle').catch(() => {}),
    new Promise(resolve => setTimeout(resolve, 5000)),
  ]);
  await page.waitForTimeout(2000);

  // Get first content iframe (rec_seq=0 = main job detail)
  const frames = page.frames();
  for (const f of frames) {
    const u = f.url();
    if (u.includes('view-detail') && u.includes('rec_seq=0')) {
      console.log('=== MAIN JD IFRAME ===');
      console.log('URL:', u);
      try {
        const content = await f.content();
        console.log('Content length:', content.length);
        const text = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        console.log('Text length:', text.length);
        console.log('Text (first 3000 chars):');
        console.log(text.slice(0, 3000));
      } catch (e) {
        console.log('Error:', e.message);
      }
    }
  }

  await browser.close();
})();
