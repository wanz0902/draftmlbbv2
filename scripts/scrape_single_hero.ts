import { scrapeAndSaveHero } from '../lib/scraper/hero-scraper.js';
import { getDb, seedHeroesIfEmpty } from '../lib/db/database.js';

const heroId = process.argv[2] || 'miya';
console.log(`Scraping hero: ${heroId}...`);

const db = getDb();
seedHeroesIfEmpty(db);

const result = await scrapeAndSaveHero(heroId, true);
console.log('Result:', JSON.stringify(result, null, 2));

// Read back from DB to verify
const row = db.prepare('SELECT skills FROM heroes WHERE hero_id = ?').get(heroId) as any;
if (row?.skills) {
  const skills = JSON.parse(row.skills);
  console.log('\nDB Skills keys:', Object.keys(skills));
  for (const [key, val] of Object.entries(skills)) {
    if (typeof val === 'object' && val !== null) {
      console.log(`  ${key}: name="${(val as any).name}", desc="${String((val as any).description || '').substring(0, 60)}..."`);
    } else {
      console.log(`  ${key}: "${String(val).substring(0, 80)}..."`);
    }
  }
}
