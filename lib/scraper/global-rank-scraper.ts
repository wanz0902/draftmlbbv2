// lib/scraper/global-rank-scraper.ts
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

interface GlobalRankHero {
  hero_name: string;
  rank: number;
  win_rate: number;
  pick_rate: number;
  ban_rate: number;
}

interface ScrapeResult {
  success: boolean;
  heroes: GlobalRankHero[];
  updateTime?: string;
  errors?: string[];
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export async function scrapeGlobalRank(): Promise<ScrapeResult> {
  const errors: string[] = [];
  let browser;

  try {
    const masterPath = path.resolve(process.cwd(), 'src/data/heroes_master.json');
    let masterData: any[] = [];
    if (fs.existsSync(masterPath)) {
      masterData = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
    }

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    console.log('[GlobalRank] Navigating to Moonton rank page...');
    await page.goto('https://www.mobilelegends.com/rank', {
      waitUntil: 'networkidle',
      timeout: 60000,
    });
    await page.waitForTimeout(3000);

    // Scroll inside the list container to load all heroes (lazy loading via virtual scroll)
    console.log('[GlobalRank] Scrolling list container to load all heroes...');
    const heroCount = await page.evaluate(async () => {
      // Find the scrollable list container
      const allEls = document.querySelectorAll('*');
      let target: HTMLElement | null = null;
      let maxHeight = 0;
      allEls.forEach(el => {
        const style = getComputedStyle(el);
        const htmlEl = el as HTMLElement;
        if ((style.overflow === 'auto' || style.overflow === 'scroll' ||
             style.overflowY === 'auto' || style.overflowY === 'scroll') &&
            htmlEl.scrollHeight > htmlEl.clientHeight + 50 &&
            htmlEl.scrollHeight > maxHeight) {
          maxHeight = htmlEl.scrollHeight;
          target = htmlEl;
        }
      });

      if (!target) return 0;

      // Scroll to bottom repeatedly to trigger lazy loading
      let prevHeight = 0;
      let stableCount = 0;
      for (let i = 0; i < 60; i++) {
        (target as HTMLElement).scrollTop = (target as HTMLElement).scrollHeight;
        await new Promise(r => setTimeout(r, 500));
        const curHeight = (target as HTMLElement).scrollHeight;
        if (curHeight === prevHeight) {
          stableCount++;
          if (stableCount > 5) break;
        } else {
          stableCount = 0;
        }
        prevHeight = curHeight;
      }

      // Count rank numbers visible
      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').filter(l => l.trim());
      let rankNumbers = 0;
      for (const line of lines) {
        if (/^\d+$/.test(line.trim()) && parseInt(line.trim()) <= 200) {
          rankNumbers++;
        }
      }
      return rankNumbers;
    });
    console.log(`[GlobalRank] After container scroll: ${heroCount} rank entries visible`);

    // Extract all body text
    const bodyText = await page.evaluate(() => document.body.innerText);
    await browser.close();
    browser = undefined;

    if (!bodyText || bodyText.length < 200) {
      return { success: false, heroes: [], errors: ['Page returned insufficient content'] };
    }

    // Extract update time
    let updateTime: string | undefined;
    const timeMatch = bodyText.match(/Update Time:\s*([^\n]+)/i);
    if (timeMatch) updateTime = timeMatch[1].trim();

    // Parse the repeating pattern: rank#, heroName, pickRate%, winRate%, banRate%
    const lines = bodyText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const heroes: GlobalRankHero[] = [];
    const seenRanks = new Set<number>();

    let i = 0;
    while (i < lines.length) {
      const rankMatch = lines[i].match(/^(\d+)$/);
      if (!rankMatch) { i++; continue; }

      const rank = parseInt(rankMatch[1], 10);
      if (rank < 1 || rank > 200 || seenRanks.has(rank)) { i++; continue; }

      if (i + 4 >= lines.length) break;

      const heroNameRaw = lines[i + 1];
      if (/^\d+(\.\d+)?%?$/.test(heroNameRaw)) { i++; continue; }

      const parseRate = (s: string): number | null => {
        const m = s.match(/^(\d+(?:\.\d+)?)%?$/);
        return m ? parseFloat(m[1]) : null;
      };

      const pickRate = parseRate(lines[i + 2]);
      const winRate = parseRate(lines[i + 3]);
      const banRate = parseRate(lines[i + 4]);

      if (pickRate === null || winRate === null || banRate === null) { i++; continue; }

      // Map to canonical name (exact match only, no substring includes)
      let canonicalName = heroNameRaw;
      if (masterData.length > 0) {
        const rawNorm = norm(heroNameRaw);
        const found = masterData.find(
          (h: any) => norm(h.hero_name) === rawNorm || h.slug === rawNorm
        );
        if (found) {
          canonicalName = found.hero_name;
        } else {
          errors.push(`Unmapped hero: "${heroNameRaw}" (norm: "${rawNorm}")`);
        }
      }

      seenRanks.add(rank);
      heroes.push({ hero_name: canonicalName, rank, win_rate: winRate, pick_rate: pickRate, ban_rate: banRate });
      i += 5;
    }

    console.log(`[GlobalRank] Scraped ${heroes.length} heroes.`);

    if (heroes.length === 0) {
      return { success: false, heroes: [], errors: [...errors, 'No heroes parsed'] };
    }

    return { success: true, heroes, updateTime, errors: errors.length > 0 ? errors : undefined };
  } catch (err: any) {
    if (browser) { try { await browser.close(); } catch {} }
    return { success: false, heroes: [], errors: [...errors, `Error: ${err.message}`] };
  }
}
