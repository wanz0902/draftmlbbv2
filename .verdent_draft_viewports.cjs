const { chromium } = require('playwright');
(async()=>{
  const browser = await chromium.launch({ headless: true });
  const sizes = [1440,1280,1024,768,430,390,360];
  const report=[];
  for (const width of sizes) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors=[];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
    try { await page.getByText('Draft Simulator').first().click({ timeout: 1500 }); } catch { try { await page.getByText('Open Draft Master').click({ timeout: 1500 }); } catch {} }
    await page.waitForTimeout(1000);
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewWidth = await page.evaluate(() => window.innerWidth);
    const draftMaster = await page.getByText('Draft Master').count();
    const backVisible = await page.getByText('Back to Home').count();
    const heroPool = await page.getByText('Hero Pool').count();
    report.push({ width, overflow: bodyWidth > viewWidth, draftMaster: draftMaster > 0, backVisible: backVisible > 0, heroPool: heroPool > 0, errors: errors.slice(0,3) });
    await page.close();
  }
  console.log(JSON.stringify(report,null,2));
  await browser.close();
})();
