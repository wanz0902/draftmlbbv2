const { chromium } = require('playwright');
(async()=>{
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 320, height: 812 } });
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
  const widest = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('*')];
    const items = nodes.map(el => ({
      tag: el.tagName,
      cls: el.className,
      w: el.getBoundingClientRect().width,
      r: el.getBoundingClientRect().right
    })).filter(x => x.r > window.innerWidth + 1).sort((a,b)=>b.r-a.r).slice(0,10);
    return { innerWidth: window.innerWidth, items };
  });
  console.log(JSON.stringify(widest,null,2));
  await browser.close();
})();
