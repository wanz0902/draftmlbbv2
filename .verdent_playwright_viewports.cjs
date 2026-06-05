const { chromium } = require('playwright');
(async()=>{
  const browser = await chromium.launch({ headless: true });
  const sizes = [320,375,390,414,768,1024,1366];
  const report=[];
  for (const width of sizes) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors=[];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewWidth = await page.evaluate(() => window.innerWidth);
    const navButton = await page.locator('button[aria-label="Toggle navigation menu"]').count();
    const homeCta = await page.getByText('Open Draft Master').count().catch(()=>0);
    report.push({ width, bodyWidth, overflow: bodyWidth > viewWidth, mobileMenu: navButton > 0, homeCta: homeCta > 0, errors: errors.slice(0,5) });
    await page.close();
  }
  console.log(JSON.stringify(report,null,2));
  await browser.close();
})();
