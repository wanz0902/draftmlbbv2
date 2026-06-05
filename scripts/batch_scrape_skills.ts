/**
 * Batch Scrape Hero Skills from Liquipedia
 * Updates data/heroes/*.json files with real skill data
 * 
 * Usage: npx tsx scripts/batch_scrape_skills.ts
 * Options:
 *   --heroes=miya,balmond,gord   Only scrape specific heroes
 *   --all                        Scrape all heroes with placeholder skills
 */

import path from 'path';
import fs from 'fs';
import { scrapeAndSaveHero, HERO_LIQUIPEDIA_MAP } from '../lib/scraper/hero-scraper.js';
import { getDb, seedHeroesIfEmpty } from '../lib/db/database.js';

const ROOT = process.cwd();
const HEROES_DIR = path.join(ROOT, 'data', 'heroes');

const args = process.argv.slice(2);
const heroesArg = args.find(a => a.startsWith('--heroes='));
const allMode = args.includes('--all');
const targetHeroes = heroesArg ? heroesArg.split('=')[1].split(',') : null;

function hasPlaceholderSkills(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return true;
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!data.skills) return true;
  const vals = Object.values(data.skills);
  return vals.every((s: any) => {
    if (!s || typeof s !== 'object') return true;
    const name = String(s.name || '').toLowerCase();
    const desc = String(s.description || '').toLowerCase();
    return name === 'passive' || name === 'skill 1' || name === 'skill 2' || name === 'ultimate' ||
           name === 'passive skill' || desc.includes('intelligence data missing') ||
           desc.includes('description.');
  });
}

async function main() {
  const db = getDb();
  seedHeroesIfEmpty(db);

  let heroIds: string[];
  if (targetHeroes) {
    heroIds = targetHeroes;
  } else if (allMode) {
    heroIds = Object.keys(HERO_LIQUIPEDIA_MAP).filter(id => {
      const filePath = path.join(HEROES_DIR, `${id}.json`);
      return hasPlaceholderSkills(filePath);
    });
  } else {
    // Default: scrape key heroes that are likely viewed
    heroIds = ['miya', 'balmond', 'gord', 'ling', 'fanny', 'harley', 'hylos', 'valentina', 'vale', 'tigreal', 'chou', 'zhuxin', 'suyou', 'zetian'];
    heroIds = heroIds.filter(id => HERO_LIQUIPEDIA_MAP[id]);
  }

  console.log(`=== Batch Scrape Skills (${heroIds.length} heroes) ===\n`);

  let success = 0, failed = 0, skipped = 0;

  for (const heroId of heroIds) {
    if (!HERO_LIQUIPEDIA_MAP[heroId]) {
      console.log(`  [SKIP] ${heroId} — no Liquipedia mapping`);
      skipped++;
      continue;
    }

    try {
      const result = await scrapeAndSaveHero(heroId, true);
      
      if (result.success && result.source === 'liquipedia') {
        // Read DB skills and update JSON file
        const row = db.prepare('SELECT * FROM heroes WHERE hero_id = ?').get(heroId) as any;
        if (row?.skills) {
          const dbSkills = JSON.parse(row.skills);
          const filePath = path.join(HEROES_DIR, `${heroId}.json`);
          
          let existingData: any = {};
          if (fs.existsSync(filePath)) {
            existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          }

          // Update skills in the JSON file
          existingData.skills = dbSkills;
          
          // Also update base stats if scraper got them
          if (row.stat_hp > 0) {
            existingData.baseStats = {
              ...existingData.baseStats,
              hp: row.stat_hp || existingData.baseStats?.hp,
              hpRegen: row.stat_hp_regen || existingData.baseStats?.hpRegen,
              mana: row.stat_mana || existingData.baseStats?.mana,
              manaRegen: row.stat_mana_regen || existingData.baseStats?.manaRegen,
              physicalAttack: row.stat_phys_atk || existingData.baseStats?.physicalAttack,
              physicalDefense: row.stat_phys_def || existingData.baseStats?.physicalDefense,
              magicDefense: row.stat_magic_def || existingData.baseStats?.magicDefense,
              movementSpeed: row.stat_move_speed || existingData.baseStats?.movementSpeed,
              attackSpeed: row.stat_atk_speed || existingData.baseStats?.attackSpeed,
            };
          }

          fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2), 'utf8');
          console.log(`  [OK] ${heroId} — ${result.heroName} — skills updated`);
          success++;
        }
      } else if (result.source === 'db_cache') {
        console.log(`  [CACHE] ${heroId} — using cached data`);
        skipped++;
      } else {
        console.log(`  [FAIL] ${heroId} — ${result.source}`);
        failed++;
      }
    } catch (err: any) {
      console.log(`  [ERROR] ${heroId} — ${err.message}`);
      failed++;
    }

    // Rate limit pause between requests
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\n=== Complete: ${success} updated, ${failed} failed, ${skipped} skipped ===`);
}

main();
