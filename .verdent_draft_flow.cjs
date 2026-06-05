const { chromium } = require('playwright');
(async()=>{
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const summary = { steps: [], errors: [] };
  page.on('console', msg => { if (msg.type() === 'error') summary.errors.push(msg.text()); });
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
  await page.getByText('Open Draft Master').click().catch(()=>{});
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: /MPL Mode/i }).first().click().catch(()=>{});
  await page.waitForTimeout(600);
  await page.locator('select').nth(0).selectOption('BTR').catch(async()=>{ await page.locator('select').nth(0).selectOption('ONIC').catch(()=>{}); });
  await page.locator('select').nth(1).selectOption('DEWA').catch(async()=>{ await page.locator('select').nth(1).selectOption('ONIC').catch(()=>{}); });
  await page.getByText(/Mulai Simulasi MPL/i).first().click().catch(()=>{});
  await page.waitForTimeout(1800);
  summary.steps.push('start-draft');
  const firstHero = page.locator('button[title]').filter({ hasText: /Available|Recommended|Counter|Risky/i }).first();
  if (await firstHero.count()) {
    await firstHero.click().catch(()=>{});
    await page.getByText('Lock').first().click().catch(()=>{});
    await page.waitForTimeout(900);
    summary.steps.push('lock-first-hero');
  }
  await page.getByText('AI Coach').first().click().catch(()=>{});
  await page.waitForTimeout(1600);
  summary.steps.push('coach-opened');
  const selectedState = await page.getByText('Selected:').count();
  const coachCards = await page.locator('text=Coach recommendation akan muncul saat draft berjalan.').count();
  const heroPoolCount = await page.getByText('Hero Pool').count();
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  const viewWidth = await page.evaluate(() => window.innerWidth);
  const unavailableButtons = await page.locator('button[disabled]').count();
  console.log(JSON.stringify({ ...summary, selectedState, coachCards, heroPoolCount, unavailableButtons, overflow: bodyWidth > viewWidth }, null, 2));
  await browser.close();
})();
