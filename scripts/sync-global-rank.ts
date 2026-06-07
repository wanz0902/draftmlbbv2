/**
 * Sync Global Rank data from Moonton.
 * Run: npm run sync:global-rank
 * 
 * Does NOT require admin token or .env admin variables.
 * Directly writes to data/global_rank_stats.json.
 */
import fs from 'fs';
import path from 'path';
import { scrapeGlobalRank } from '../lib/scraper/global-rank-scraper.js';

const ROOT = process.cwd();
const OUTPUT_PATH = path.join(ROOT, 'data', 'global_rank_stats.json');
const MASTER_PATH = path.join(ROOT, 'src', 'data', 'heroes_master.json');

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Tier calculation from global stats
// Uses combined signal: win_rate as primary, ban_rate as secondary indicator of meta pressure
function calculateTier(winRate: number, banRate: number, pickRate: number): string {
  // High ban rate = meta-defining regardless of win rate
  if (banRate >= 50) return 'S+';
  if (winRate >= 54 && banRate >= 10) return 'S+';
  if (winRate >= 54) return 'S+';
  if (winRate >= 52) return 'S';
  if (winRate >= 50) return 'A';
  if (winRate >= 48) return 'B';
  if (winRate >= 46) return 'C';
  return 'D';
}

async function main() {
  console.log('========================================');
  console.log('  GLOBAL RANK SYNC');
  console.log('========================================');
  console.log('');

  const result = await scrapeGlobalRank();

  if (!result.success) {
    console.error('FAILED:', result.errors?.join('; '));
    process.exit(1);
  }

  console.log(`Scraped: ${result.heroes.length} heroes`);
  if (result.updateTime) console.log(`Update time: ${result.updateTime}`);

  // Validation
  const masterData = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8'));
  const seenNorms = new Set<string>();
  let dupes = 0;

  for (const h of result.heroes) {
    const n = norm(h.hero_name);
    if (seenNorms.has(n)) { dupes++; console.warn(`  DUPE: ${h.hero_name}`); }
    seenNorms.add(n);
  }

  // Identity checks
  const checks = {
    mathilda: seenNorms.has('mathilda'),
    yiSunShin: seenNorms.has('yisunshin'),
    valentina: seenNorms.has('valentina'),
    luoYi: seenNorms.has('luoyi'),
    sun: seenNorms.has('sun'),
    hilda: seenNorms.has('hilda'),
  };

  console.log('');
  console.log('Identity checks:');
  Object.entries(checks).forEach(([k, v]) => console.log(`  ${v ? '✓' : '✗'} ${k}`));

  if (result.heroes.length < 120) {
    console.error(`\nFAILED: Only ${result.heroes.length} heroes (need >=120)`);
    process.exit(1);
  }
  if (dupes > 0) {
    console.error(`\nFAILED: ${dupes} duplicate names`);
    process.exit(1);
  }

  // Calculate tiers and build output
  const heroesWithTier = result.heroes.map(h => ({
    ...h,
    tier: calculateTier(h.win_rate, h.ban_rate, h.pick_rate),
  }));

  const output = {
    source: 'moonton_rank',
    source_url: 'https://www.mobilelegends.com/rank',
    source_updated_at: result.updateTime || new Date().toISOString(),
    time_range: 'past_1_day',
    rank_filter: 'ALL',
    heroes: heroesWithTier,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');
  console.log(`\nWritten: ${OUTPUT_PATH}`);
  console.log(`Heroes: ${heroesWithTier.length}`);

  // Tier distribution
  const tierCounts: Record<string, number> = {};
  heroesWithTier.forEach(h => { tierCounts[h.tier] = (tierCounts[h.tier] || 0) + 1; });
  console.log('Tier distribution:');
  ['S+', 'S', 'A', 'B', 'C', 'D'].forEach(t => console.log(`  ${t}: ${tierCounts[t] || 0}`));

  // Errors/warnings
  if (result.errors && result.errors.length > 0) {
    console.log(`\nWarnings (${result.errors.length}):`);
    result.errors.slice(0, 10).forEach(e => console.log(`  - ${e}`));
  }

  console.log('\n========================================');
  console.log('  RESULT: PASS');
  console.log('========================================');
}

main();
