const { chromium } = require('playwright');
(async()=>{
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
  const buttons = await page.locator('button').evaluateAll(els => els.map(el => (el.textContent||'').trim()).filter(Boolean).slice(0,40));
  console.log(JSON.stringify(buttons,null,2));
  await browser.close();
})();
