// lib/scraper/tournament-scraper.ts
// ============================================================
// PIVOT PATTERN TOURNAMENT:
// SAMA PERSIS dengan hero scraper — hanya page name yang berbeda!
// fetchWikitext('MPL_ID/Season_17') vs fetchWikitext('Chou')
// Infrastructure identik: queue, DB, log, needsRescrape check.
// ============================================================

import { fetchWikitext, fetchParsedHtml } from './liquipedia-gateway.js';
import { getDb, needsRescrape, logScrape } from '../db/database.js';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

// ——— MAPPING: tournament_id → exact Liquipedia page name ———
export const TOURNAMENT_LIQUIPEDIA_MAP: Record<string, string> = {
  // MPL Indonesia
  'MPL-ID-S17':  'MPL_ID/Season_17',
  'MPL-ID-S16':  'MPL_ID/Season_16',
  'MPL-ID-S15':  'MPL_ID/Season_15',
  'MPL-ID-S17-STATS': 'MPL/Indonesia/Season_17/Statistics', // Statistik khusus

  // MPL Philippines
  'MPL-PH-S14':  'MPL_Philippines/Season_14',
  'MPL-PH-S13':  'MPL_Philippines/Season_13',

  // MPL Malaysia-Singapore
  'MPL-MY-S10':  'MPL_Malaysia_Singapore/Season_10',

  // International
  'M7':          'M-Series/World_Championship/7',
  'M6':          'M-Series/World_Championship/6',
  'MSC-2025':    'M-Series/Southeast_Asia_Cup/2025',
  'MSC-2024':    'M-Series/Southeast_Asia_Cup/2024',
};

function cleanText(text: string): string {
  return text ? text.replace(/\s+/g, ' ').trim() : '';
}

// ——— SCRAPE STATISTICS PAGE — MEMANFAATKAN PARSER YANG SUDAH ADA ———
// Parses wikitable statistics, caches to SQLite / data/heroes_stats.json.
export async function scrapeTournamentStats(
  tournamentId: string,
  statsPageName: string,
  forceRefresh: boolean = false
): Promise<{ success: boolean; count: number; error?: string }> {
  const db = getDb();
  const cacheKey = `${tournamentId}-stats`;

  if (!forceRefresh && !needsRescrape(db, 'stats', cacheKey, 12)) {
    console.log(`[TournamentScraper] Stats cache hit: ${cacheKey}`);
    return { success: true, count: 0 };
  }

  console.log(`[TournamentScraper] Fetching stats page: ${statsPageName}`);

  try {
    const html = await fetchParsedHtml(statsPageName);
    if (!html || html.length < 100) {
      throw new Error(`Failed to load HTML for ${statsPageName}`);
    }

    const $ = cheerio.load(html);
    const tables = $('table.wikitable');
    if (tables.length === 0) {
      throw new Error(`No wikitable found in stats page: ${statsPageName}`);
    }

    const firstTable = tables.first();
    const rows = firstTable.find('tr');

    const heroesList: any[] = [];
    const parseErrors: string[] = [];

    const masterPath = path.resolve(process.cwd(), 'src/data/heroes_master.json');
    let masterData: any[] = [];
    if (fs.existsSync(masterPath)) {
      masterData = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
    }

    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    rows.each((index, tr) => {
      const cells = $(tr).find('td');

      // Skip the header rows or empty rows
      if (cells.length < 10) return;

      let rawHeroName = '';
      let offset = 0;

      const c0 = cleanText($(cells[0]).text());
      const c1 = cleanText($(cells[1]).text());

      if (!isNaN(parseInt(c0)) && c1.length > 1) {
        rawHeroName = c1;
        offset = 0;
      } else if (c0.length > 2 && isNaN(parseInt(c0))) {
        rawHeroName = c0;
        offset = -1;
      }

      if (!rawHeroName) {
        parseErrors.push(`Row ${index}: Could not determine hero name.`);
        return;
      }

      let heroName = rawHeroName;
      if (masterData.length > 0) {
        const rawNorm = norm(rawHeroName);
        let mapped = rawNorm;
        if (mapped === 'yisun-shin' || mapped.includes('yss') || mapped === 'yisunshin') {
          mapped = 'yisunshin';
        }

        const found = masterData.find(
          (h: any) => norm(h.hero_name) === mapped || h.slug === mapped
        );

        if (found) {
          heroName = found.hero_name;
        } else {
          parseErrors.push(`Row ${index}: Unknown hero detected -> "${rawHeroName}".`);
        }
      }

      const extract = (idx: number) => {
        const targetIdx = idx + offset;
        if (targetIdx < 2 || targetIdx >= cells.length) return '0';
        return cleanText($(cells[targetIdx]).text());
      };

      const hData = {
        hero_name: heroName,
        picks_total: extract(2),
        picks_win: extract(3),
        picks_loss: extract(4),
        winrate: extract(5),
        tournament_presence: extract(6),
        blue_side_picks: extract(7),
        blue_side_win: extract(8),
        blue_side_loss: extract(9),
        blue_side_wr: extract(10),
        red_side_picks: extract(11),
        red_side_win: extract(12),
        red_side_loss: extract(13),
        red_side_wr: extract(14),
        bans_total: extract(15),
        bans_presence: extract(16),
        picks_bans_total: extract(17),
        picks_bans_presence: extract(18) || extract(17),
      };

      const pTotal = parseInt(hData.picks_total, 10);
      const pWin = parseInt(hData.picks_win, 10);
      const bTotal = parseInt(hData.bans_total, 10);

      if (isNaN(pTotal) || isNaN(pWin) || isNaN(bTotal)) {
        parseErrors.push(`Row ${index} (${heroName}): Invalid numeric stats. Dropped.`);
        return;
      }

      heroesList.push(hData);
    });

    if (heroesList.length === 0) {
      throw new Error('No valid hero stats table items parsed.');
    }

    // Write hData to heroes_stats.json files
    const statsPath = path.resolve(process.cwd(), 'data/heroes_stats.json');
    fs.mkdirSync(path.dirname(statsPath), { recursive: true });
    fs.writeFileSync(statsPath, JSON.stringify(heroesList, null, 2), 'utf8');

    // Sync to SQLite Database
    const updateStmt = db.prepare(`
      UPDATE heroes SET
        win_rate_overall    = ?,
        pick_rate_overall   = ?,
        ban_rate_overall    = ?,
        tournament_presence = ?,
        blue_side_wr        = ?,
        red_side_wr         = ?,
        picks_total         = ?,
        bans_total          = ?,
        data_quality        = MAX(data_quality, 1),
        updated_at          = unixepoch()
      WHERE hero_name = ? OR hero_id = ?
    `);

    db.transaction(() => {
      for (const h of heroesList) {
        const wr = parseFloat(h.winrate.replace('%', '')) || 0;
        const pr = parseFloat(h.tournament_presence.replace('%', '')) || 0;
        const br = parseFloat(h.bans_presence.replace('%', '')) || 0;
        const tp = parseFloat(h.picks_bans_presence.replace('%', '')) || pr;
        const pt = parseInt(h.picks_total, 10) || 0;
        const bt = parseInt(h.bans_total, 10) || 0;
        const blueWr = parseFloat(h.blue_side_wr.replace('%', '')) || 0;
        const redWr = parseFloat(h.red_side_wr.replace('%', '')) || 0;
        const slug = h.hero_name.toLowerCase().replace(/[^a-z0-9]+/g, '');

        updateStmt.run(wr, pr, br, tp, blueWr, redWr, pt, bt, h.hero_name, slug);
      }
    })();

    logScrape(db, 'stats', cacheKey, {
      url: 'https://liquipedia.net/mobilelegends/' + statsPageName,
      status: 200,
      success: true,
      records: heroesList.length,
    });

    console.log(`[TournamentScraper] ✓ Successfully synced ${heroesList.length} heroes from stats page`);
    return { success: true, count: heroesList.length };

  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    logScrape(db, 'stats', cacheKey, { success: false, error });
    console.error(`[TournamentScraper] ✗ Failed stats scrape: ${error}`);
    return { success: false, count: 0, error };
  }
}

// ——— SCRAPE TOURNAMENT METADATA ———
export async function scrapeTournament(
  tournamentId: string,
  forceRefresh: boolean = false
): Promise<{ success: boolean; error?: string }> {
  const db = getDb();

  if (!forceRefresh && !needsRescrape(db, 'tournament', tournamentId, 24)) {
    console.log(`[TournamentScraper] Cache hit for tournament: ${tournamentId}`);
    return { success: true };
  }

  const pageName = TOURNAMENT_LIQUIPEDIA_MAP[tournamentId];
  if (!pageName) {
    console.warn(`[TournamentScraper] No page mapping for tournament: ${tournamentId}`);
    return { success: false, error: 'No mapping' };
  }

  try {
    const wikitext = await fetchWikitext(pageName);

    const nameMatch = wikitext.match(/\|\s*name\s*=\s*(.+)/i);
    const tierMatch = wikitext.match(/\|\s*tier\s*=\s*(.+)/i);
    const regionMatch = wikitext.match(/\|\s*region\s*=\s*(.+)/i);
    const startMatch = wikitext.match(/\|\s*sdate\s*=\s*(.+)/i);
    const endMatch = wikitext.match(/\|\s*edate\s*=\s*(.+)/i);
    const prizeMatch = wikitext.match(/\|\s*prizepool\s*=\s*(.+)/i);

    db.prepare(`
      INSERT INTO tournaments (tournament_id, name, liquipedia_page, tier, region, start_date, end_date, prize_pool, scraped_at)
      VALUES (@id, @name, @page, @tier, @region, @start, @end, @prize, unixepoch())
      ON CONFLICT(tournament_id) DO UPDATE SET
        name = excluded.name, tier = excluded.tier, region = excluded.region,
        start_date = excluded.start_date, end_date = excluded.end_date,
        prize_pool = excluded.prize_pool, scraped_at = unixepoch()
    `).run({
      id: tournamentId,
      name: nameMatch?.[1]?.trim() ?? tournamentId,
      page: pageName,
      tier: tierMatch?.[1]?.trim() ?? null,
      region: regionMatch?.[1]?.trim() ?? null,
      start: startMatch?.[1]?.trim() ?? null,
      end: endMatch?.[1]?.trim() ?? null,
      prize: prizeMatch?.[1]?.trim() ?? null,
    });

    logScrape(db, 'tournament', tournamentId, {
      url: 'https://liquipedia.net/mobilelegends/' + pageName,
      status: 200,
      success: true,
      records: 1,
    });

    console.log(`[TournamentScraper] ✓ Saved tournament: ${tournamentId}`);
    return { success: true };

  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    logScrape(db, 'tournament', tournamentId, { success: false, error });
    console.error(`[TournamentScraper] ✗ Failed: ${tournamentId} - ${error}`);
    return { success: false, error };
  }
}
