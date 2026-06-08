/**
 * DEBUG: Dump rendered hero page structure using locators (no evaluate).
 * Run: npx tsx scripts/_dump-hero-page.ts miya
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const slug = process.argv[2] || 'miya';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  });
  const page = await ctx.newPage();

  await page.goto(`https://mlbb.tools/heroes/${slug}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(15000);

  const html = await page.content();
  const outDir = path.join(process.cwd(), 'debug');
  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(path.join(outDir, `${slug}-full.html`), html);
  console.log(`Full HTML: ${(html.length / 1024).toFixed(0)} KB`);

  // Extract text around key section markers
  const markers = [
    'Base Stats', 'Power Curve', 'Hero Attributes', 'Combos', 'Connections',
    'Pro Builds', 'Skill Level Priority', 'Strong Against', 'Weak Against',
    'Best With', 'Lore', 'Early', 'Mid', 'Late', 'Spikes', 'Core items',
    'EARLY GAME', 'MID GAME', 'LATE GAME',
  ];

  const found: Record<string, string> = {};
  for (const marker of markers) {
    const idx = html.indexOf(marker);
    if (idx >= 0) {
      const start = Math.max(0, idx - 200);
      const end = Math.min(html.length, idx + 800);
      found[marker] = html.substring(start, end).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }

  fs.writeFileSync(path.join(outDir, `${slug}-markers.json`), JSON.stringify(found, null, 2));
  console.log(`Found ${Object.keys(found).length}/${markers.length} markers`);

  // Extract specific sections more precisely
  const sections: Record<string, string> = {};

  // Base Stats section
  const bsIdx = html.indexOf('Base Stats</h2>');
  if (bsIdx > 0) {
    sections['Base Stats'] = html.substring(bsIdx, bsIdx + 3000).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Power Curve section
  const pcIdx = html.indexOf('Power Curve</h2>');
  if (pcIdx > 0) {
    sections['Power Curve'] = html.substring(pcIdx, pcIdx + 5000).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Hero Attributes
  const haIdx = html.indexOf('Hero Attributes</h2>');
  if (haIdx > 0) {
    sections['Hero Attributes'] = html.substring(haIdx, haIdx + 2000).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Connections
  const cnIdx = html.indexOf('Connections</h2>');
  if (cnIdx > 0) {
    sections['Connections'] = html.substring(cnIdx, cnIdx + 3000).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Combos
  const cbIdx = html.indexOf('Combos</h2>');
  if (cbIdx > 0) {
    sections['Combos'] = html.substring(cbIdx, cbIdx + 3000).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Skill Level Priority (look for upgrade priority or similar)
  for (const kw of ['Skill Priority', 'Level Priority', 'Upgrade Priority', 'Skill Upgrade']) {
    const spIdx = html.indexOf(kw);
    if (spIdx > 0) {
      sections['Skill Priority'] = html.substring(spIdx, spIdx + 1000).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      break;
    }
  }

  // Lore section
  const loIdx = html.indexOf('Lore</h2>');
  if (loIdx > 0) {
    sections['Lore'] = html.substring(loIdx, loIdx + 3000).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Best With / Synergy
  const bwIdx = html.indexOf('Best With</h2>');
  if (bwIdx > 0) {
    sections['Best With'] = html.substring(bwIdx, bwIdx + 3000).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Strong Against
  const saIdx = html.indexOf('Strong Against</h4>');
  if (saIdx > 0) {
    sections['Strong Against'] = html.substring(saIdx, saIdx + 3000).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Weak Against
  const waIdx = html.indexOf('Weak Against</h4>');
  if (waIdx > 0) {
    sections['Weak Against'] = html.substring(waIdx, waIdx + 3000).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Pro Builds
  const pbIdx = html.indexOf('Pro Builds</h2>');
  if (pbIdx > 0) {
    sections['Pro Builds'] = html.substring(pbIdx, pbIdx + 5000).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Difficulty / Specialty from header
  const headerIdx = html.indexOf('Specialty');
  if (headerIdx > 0) {
    sections['Header'] = html.substring(Math.max(0, headerIdx - 500), headerIdx + 500).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Title from meta or header
  const titleIdx = html.indexOf('<title>');
  if (titleIdx > 0) {
    const titleEnd = html.indexOf('</title>', titleIdx);
    sections['Title Tag'] = html.substring(titleIdx + 7, titleEnd > 0 ? titleEnd : titleIdx + 200);
  }

  fs.writeFileSync(path.join(outDir, `${slug}-sections.json`), JSON.stringify(sections, null, 2));
  console.log(`Sections: ${Object.keys(sections).join(', ')}`);

  await browser.close();
})();
