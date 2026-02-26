const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'ko-KR',
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  console.log('Navigating to RocketPunch...');
  await page.goto('https://www.rocketpunch.com/jobs?selectedJobId=158168', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  await Promise.race([
    page.waitForLoadState('networkidle').catch(() => {}),
    new Promise(r => setTimeout(r, 10000)),
  ]);
  await page.waitForTimeout(5000);

  console.log('Page URL:', page.url());

  // Get full HTML length
  const html = await page.content();
  console.log('HTML length:', html.length);

  // Search for key text in HTML
  const hasQuant = html.includes('퀀트');
  const hasRaonGi = html.includes('라운지아이');
  const hasJobContent = html.includes('job-content');
  const hasJobDuty = html.includes('job-duty');
  console.log('Contains 퀀트:', hasQuant);
  console.log('Contains 라운지아이:', hasRaonGi);
  console.log('Contains job-content:', hasJobContent);
  console.log('Contains job-duty:', hasJobDuty);

  // Get body text
  const bodyText = await page.evaluate(() => document.body.textContent || '');
  console.log('Body text length:', bodyText.length);
  console.log('Body contains 퀀트:', bodyText.includes('퀀트'));

  // Dump first 500 chars of body text
  console.log('\nBody text first 500 chars:');
  console.log(bodyText.replace(/\s+/g, ' ').trim().slice(0, 500));

  // Check if there's a cookie consent or login modal blocking content
  const modals = await page.evaluate(() => {
    const overlays = Array.from(document.querySelectorAll('[class*="modal"], [class*="overlay"], [class*="popup"], [class*="dialog"], [role="dialog"]'));
    return overlays.map(o => ({
      tag: o.tagName,
      cls: (o.className || '').toString().slice(0, 100),
      visible: o.getBoundingClientRect().height > 0,
      text: (o.textContent || '').slice(0, 100),
    }));
  });
  console.log('\nModals/Overlays:', JSON.stringify(modals, null, 2));

  // Check if page is an SPA that needs client-side navigation
  console.log('\nChecking for React/Next.js root:');
  const spaInfo = await page.evaluate(() => {
    return {
      hasNextRoot: !!document.querySelector('#__next'),
      hasReactRoot: !!document.querySelector('#root'),
      hasApp: !!document.querySelector('#app'),
      scripts: Array.from(document.querySelectorAll('script[src]')).slice(0, 5).map(s => s.src),
    };
  });
  console.log(JSON.stringify(spaInfo, null, 2));

  // Extract a section of HTML around any job-related content
  if (hasQuant) {
    const idx = html.indexOf('퀀트');
    console.log('\nHTML around 퀀트 (+-300 chars):');
    console.log(html.slice(Math.max(0, idx - 300), idx + 300));
  }

  // Screenshot for visual check
  const screenshotBuf = await page.screenshot({ fullPage: false, type: 'png' });
  require('fs').writeFileSync('/app/rocketpunch-screenshot.png', screenshotBuf);
  console.log('\nScreenshot saved to /app/rocketpunch-screenshot.png');

  await browser.close();
  console.log('\nDone.');
})().catch(e => console.error('Error:', e.message));
