const { chromium } = require('playwright');
(async()=>{
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
  await page.getByText('Open Draft Master').click().catch(()=>{});
  await page.waitForTimeout(700);
  await page.getByText('MPL Mode').first().click().catch(()=>{});
  await page.waitForTimeout(500);
  const texts = await page.locator('button').evaluateAll(els => els.map(el => (el.textContent||'').trim()).filter(Boolean).slice(0,120));
  console.log(JSON.stringify(texts, null, 2));
  await browser.close();
})();
