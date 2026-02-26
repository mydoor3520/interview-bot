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
    new Promise(r => setTimeout(r, 8000)),
  ]);
  await page.waitForTimeout(3000);

  // Find the detail panel by looking for the element containing the job title
  console.log('=== Finding detail panel structure ===');
  const structure = await page.evaluate(() => {
    // Find the element containing the specific job title
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let titleElement = null;
    while (walker.nextNode()) {
      if (walker.currentNode.textContent.includes('리드 퀀트(Senior Quant')) {
        titleElement = walker.currentNode.parentElement;
        break;
      }
    }

    if (!titleElement) return { error: 'Title not found' };

    // Walk up the DOM tree to find the detail panel container
    const ancestors = [];
    let el = titleElement;
    for (let i = 0; i < 15 && el; i++) {
      ancestors.push({
        depth: i,
        tag: el.tagName,
        id: el.id || '',
        cls: (typeof el.className === 'string' ? el.className : '').slice(0, 200),
        textLen: (el.textContent || '').length,
        childCount: el.children.length,
        rect: el.getBoundingClientRect ? {
          x: Math.round(el.getBoundingClientRect().x),
          y: Math.round(el.getBoundingClientRect().y),
          w: Math.round(el.getBoundingClientRect().width),
          h: Math.round(el.getBoundingClientRect().height),
        } : null,
      });
      el = el.parentElement;
    }

    return { ancestors };
  });

  console.log(JSON.stringify(structure, null, 2));

  // Now find the detail panel — look for the right-side container
  console.log('\n=== Finding right panel by position ===');
  const rightPanel = await page.evaluate(() => {
    // Find elements positioned on the right side of the viewport (x > 400)
    const allDivs = Array.from(document.querySelectorAll('div'));
    const rightDivs = allDivs
      .filter(d => {
        const rect = d.getBoundingClientRect();
        // Right panel should be x > 400, width > 300, has significant text
        return rect.x > 400 && rect.width > 300 && (d.textContent || '').length > 500;
      })
      .map(d => {
        const rect = d.getBoundingClientRect();
        return {
          tag: d.tagName,
          cls: (typeof d.className === 'string' ? d.className : '').slice(0, 200),
          id: d.id || '',
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
          textLen: (d.textContent || '').length,
          childCount: d.children.length,
          role: d.getAttribute('role') || '',
          dataAttrs: Array.from(d.attributes).filter(a => a.name.startsWith('data-')).map(a => a.name + '=' + a.value.slice(0, 50)),
        };
      })
      .sort((a, b) => a.textLen - b.textLen);

    // Return the smallest right-panel div that has the job detail content
    return rightDivs.slice(0, 10);
  });

  for (const d of rightPanel) {
    console.log(`x=${d.x} w=${d.w} textLen=${d.textLen} children=${d.childCount} cls="${d.cls}" id="${d.id}" data=${JSON.stringify(d.dataAttrs)}`);
  }

  // Find the #job-content element and see what it actually contains
  console.log('\n=== #job-content actual content ===');
  const jobContent = await page.evaluate(() => {
    const el = document.querySelector('#job-content');
    if (!el) return { error: 'not found' };
    const rect = el.getBoundingClientRect();
    return {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      w: Math.round(rect.width),
      h: Math.round(rect.height),
      textPreview: (el.textContent || '').slice(0, 300),
      cls: el.className,
      childCount: el.children.length,
    };
  });
  console.log(JSON.stringify(jobContent, null, 2));

  await browser.close();
  console.log('\nDone.');
})().catch(e => console.error('Error:', e.message));
