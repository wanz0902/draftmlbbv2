const { chromium } = require('playwright');
(async()=>{
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
  await page.getByText('Open Draft Master').click().catch(()=>{});
  await page.waitForTimeout(800);
  const btns1 = await page.getByRole('button').allTextContents();
  console.log('STEP1', JSON.stringify(btns1.slice(0,30),null,2));
  const mplBtn = page.getByRole('button', { name: /MPL Mode/i }).first();
  console.log('MPL_COUNT', await mplBtn.count());
  await mplBtn.click().catch(e=>console.log('MPL_CLICK_ERR', String(e)));
  await page.waitForTimeout(800);
  const btns2 = await page.getByRole('button').allTextContents();
  console.log('STEP2', JSON.stringify(btns2.slice(0,50),null,2));
  console.log('HAS_MULAI_MPL', await page.getByText(/Mulai Simulasi MPL/i).count());
  await browser.close();
})();
