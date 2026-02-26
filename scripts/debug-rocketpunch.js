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
    timeout: 30000
  });

  // Wait for network idle
  await Promise.race([
    page.waitForLoadState('networkidle').catch(() => {}),
    new Promise(r => setTimeout(r, 8000)),
  ]);
  await page.waitForTimeout(3000);

  console.log('\n=== Selector check ===');
  const selectors = [
    '#job-content', '#job-duty', '.job-title', '.job-detail',
    'div.job-stat-info', '.content-wrapper', 'main', 'article',
    '[class*="job-detail"]', '[class*="job-list"]', '[class*="job-card"]',
    '[class*="selected"]', '[class*="panel"]', '[class*="right"]',
    '[class*="detail"]', '[class*="content"]',
    'h2', 'h1', 'h3',
  ];

  for (const sel of selectors) {
    try {
      const count = await page.$$eval(sel, els => els.length);
      if (count > 0) {
        const text = await page.$eval(sel, el => (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120));
        console.log(`${sel}: count=${count} text="${text}"`);
      }
    } catch (e) {
      // skip
    }
  }

  console.log('\n=== Relevant div classes ===');
  const divInfo = await page.evaluate(() => {
    const allDivs = Array.from(document.querySelectorAll('div[class]'));
    const relevant = allDivs
      .filter(d => {
        const cls = d.className;
        if (typeof cls !== 'string') return false;
        return cls.includes('job') || cls.includes('detail') || cls.includes('content') ||
               cls.includes('panel') || cls.includes('right') || cls.includes('selected');
      })
      .map(d => ({
        cls: typeof d.className === 'string' ? d.className.slice(0, 120) : String(d.className).slice(0, 120),
        textLen: (d.textContent || '').length,
        children: d.children.length,
      }));
    return relevant.slice(0, 30);
  });

  for (const d of divInfo) {
    console.log(`class="${d.cls}" textLen=${d.textLen} children=${d.children}`);
  }

  console.log('\n=== Full body text length ===');
  const bodyLen = await page.evaluate(() => document.body.textContent?.length || 0);
  console.log('Body text length:', bodyLen);

  // Get the page title and h2 elements specifically
  console.log('\n=== Headings ===');
  const headings = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('h1, h2, h3')).map(h => ({
      tag: h.tagName,
      cls: h.className,
      text: (h.textContent || '').trim().slice(0, 100)
    }));
  });
  for (const h of headings) {
    console.log(`${h.tag} class="${h.cls}" text="${h.text}"`);
  }

  // Dump a portion of the HTML near any element containing "퀀트" (the job title)
  console.log('\n=== Search for job title text ===');
  const titleContext = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const results = [];
    while (walker.nextNode()) {
      const text = walker.currentNode.textContent || '';
      if (text.includes('퀀트') || text.includes('Quant')) {
        const parent = walker.currentNode.parentElement;
        results.push({
          parentTag: parent?.tagName || 'unknown',
          parentClass: (parent?.className || '').slice(0, 100),
          parentId: parent?.id || '',
          text: text.trim().slice(0, 100),
          grandparentClass: (parent?.parentElement?.className || '').slice(0, 100),
          grandparentId: parent?.parentElement?.id || '',
        });
      }
    }
    return results.slice(0, 10);
  });
  for (const t of titleContext) {
    console.log(`Found "${t.text}" in <${t.parentTag} class="${t.parentClass}" id="${t.parentId}"> parent=<class="${t.grandparentClass}" id="${t.grandparentId}">`);
  }

  await browser.close();
  console.log('\nDone.');
})().catch(e => console.error('Error:', e.message));
