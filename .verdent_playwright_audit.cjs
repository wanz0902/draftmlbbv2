const { chromium } = require('playwright');
(async()=>{
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const log = [];
  page.on('console', msg => { if (msg.type() === 'error') log.push('console:'+msg.text()); });
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
  try { await page.getByText('Open Draft Master').click(); } catch { try { await page.getByText('Mulai Draft Simulator').click(); } catch {} }
  await page.waitForTimeout(1200);
  const draftVisible = await page.getByText('Draft Master').count();
  try { await page.getByText('MPL Mode').first().click(); } catch {}
  await page.waitForTimeout(300);
  const onic = page.getByText('ONIC').first(); if (await onic.count()) await onic.click().catch(()=>{});
  const rrq = page.getByText('RRQ').first(); if (await rrq.count()) await rrq.click().catch(()=>{});
  const start = page.getByText('Mulai Simulasi MPL').first(); if (await start.count()) await start.click().catch(()=>{});
  await page.waitForTimeout(1500);
  const hasBackButton = await page.getByText('Back to Home').count();
  const hasTimeline = await page.getByText('Draft Phase Timeline').count();
  const hasHeroPool = await page.getByText('Interactive Hero Pool').count();
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  const viewWidth = await page.evaluate(() => window.innerWidth);
  console.log(JSON.stringify({draftVisible,hasBackButton,hasTimeline,hasHeroPool,bodyWidth,viewWidth,overflow:bodyWidth>viewWidth,errors:log.slice(0,20)}, null, 2));
  await browser.close();
})();
