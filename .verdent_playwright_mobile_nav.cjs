const { chromium } = require('playwright');
(async()=>{
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
  await page.click('button[aria-label="Toggle navigation menu"]').catch(()=>{});
  await page.waitForTimeout(500);
  const mobileBack = await page.getByText('Back to Home').count();
  await page.getByText('Hero Intelligence').first().click().catch(()=>{});
  await page.waitForTimeout(700);
  const pageBack = await page.getByText('Back to Home').count();
  console.log(JSON.stringify({ mobileBack, pageBack }, null, 2));
  await browser.close();
})();
