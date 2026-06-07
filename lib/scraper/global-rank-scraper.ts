// lib/scraper/global-rank-scraper.ts
// ============================================================
// Scrapes Moonton's official global rank page using Playwright.
// Returns structured hero data without writing any files.
// ============================================================

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

/** Normalize hero name — same logic as tournament-scraper norm() */
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export async function scrapeGlobalRank(): Promise<ScrapeResult> {
  const errors: string[] = [];
  let browser;

  try {
    // Load heroes_master.json for canonical name mapping
    const masterPath = path.resolve(process.cwd(), 'src/data/heroes_master.json');
    let masterData: any[] = [];
    if (fs.existsSync(masterPath)) {
      masterData = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
    } else {
      errors.push('heroes_master.json not found — name mapping unavailable');
    }

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    await page.goto('https://www.mobilelegends.com/rank', {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    // Extra wait for dynamic content rendering
    await page.waitForTimeout(3000);

    // Extract all visible text from the page body
    const bodyText = await page.evaluate(() => document.body.innerText);

    await browser.close();
    browser = undefined;

    if (!bodyText || bodyText.length < 100) {
      return { success: false, heroes: [], errors: ['Page returned insufficient content'] };
    }

    // Parse the repeating pattern: rank#, heroName, pickRate%, winRate%, banRate%
    const lines = bodyText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    const heroes: GlobalRankHero[] = [];
    let i = 0;

    while (i < lines.length) {
      // Look for a rank number (1, 2, 3, ...)
      const rankMatch = lines[i].match(/^(\d+)$/);
      if (!rankMatch) {
        i++;
        continue;
      }

      const rank = parseInt(rankMatch[1], 10);
      if (rank < 1 || rank > 200) {
        i++;
        continue;
      }

      // Next line should be hero name (non-numeric, non-percentage)
      if (i + 1 >= lines.length) break;
      const heroNameRaw = lines[i + 1];

      // Validate it's not a number or percentage
      if (/^\d+(\.\d+)?%?$/.test(heroNameRaw)) {
        i++;
        continue;
      }

      // Next 3 lines should be percentages: pick_rate, win_rate, ban_rate
      if (i + 4 >= lines.length) break;

      const pickRateStr = lines[i + 2];
      const winRateStr = lines[i + 3];
      const banRateStr = lines[i + 4];

      const parseRate = (s: string): number | null => {
        const m = s.match(/^(\d+(?:\.\d+)?)%?$/);
        return m ? parseFloat(m[1]) : null;
      };

      const pickRate = parseRate(pickRateStr);
      const winRate = parseRate(winRateStr);
      const banRate = parseRate(banRateStr);

      if (pickRate === null || winRate === null || banRate === null) {
        i++;
        continue;
      }

      // Map to canonical name using exact normalized matching (NO substring/includes)
      let canonicalName = heroNameRaw;
      if (masterData.length > 0) {
        const rawNorm = norm(heroNameRaw);
        let mapped = rawNorm;
        // Handle known special cases
        if (mapped === 'yisunshin' || mapped === 'yisunshin') {
          mapped = 'yisunshin';
        }

        const found = masterData.find(
          (h: any) => norm(h.hero_name) === mapped || h.slug === mapped
        );

        if (found) {
          canonicalName = found.hero_name;
        } else {
          errors.push(`Unknown hero: "${heroNameRaw}" (normalized: "${rawNorm}")`);
        }
      }

      heroes.push({
        hero_name: canonicalName,
        rank,
        win_rate: winRate,
        pick_rate: pickRate,
        ban_rate: banRate,
      });

      i += 5; // Move past this hero block
    }

    if (heroes.length === 0) {
      return {
        success: false,
        heroes: [],
        errors: [...errors, 'No heroes parsed from page content. Pattern may have changed.'],
      };
    }

    // Try to extract update time from page text
    let updateTime: string | undefined;
    const timeMatch = bodyText.match(/(?:updated?|last\s+update)[:\s]*([^\n]+)/i);
    if (timeMatch) {
      updateTime = timeMatch[1].trim();
    }

    return {
      success: true,
      heroes,
      updateTime,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (err: any) {
    if (browser) {
      try { await browser.close(); } catch {}
    }
    return {
      success: false,
      heroes: [],
      errors: [...errors, `Scraper error: ${err.message || String(err)}`],
    };
  }
}
