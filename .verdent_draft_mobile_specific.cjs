const { chromium } = require('playwright');
(async()=>{
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
  await page.getByText('Open Draft Master').click().catch(()=>{});
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: /MPL Mode/i }).first().click().catch(()=>{});
  await page.waitForTimeout(600);
  await page.locator('select').nth(0).selectOption('BTR').catch(()=>{});
  await page.locator('select').nth(1).selectOption('ONIC').catch(()=>{});
  await page.getByText(/Mulai Simulasi MPL/i).first().click().catch(()=>{});
  await page.waitForTimeout(1500);
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  const viewWidth = await page.evaluate(() => window.innerWidth);
  const texts = {
    heroPool: await page.getByText('Hero Pool').count(),
    aiCoach: await page.getByText('AI Coach').count(),
    back: await page.getByText('Back to Home').count()
  };
  console.log(JSON.stringify({ overflow: bodyWidth > viewWidth, texts }, null, 2));
  await browser.close();
})();
