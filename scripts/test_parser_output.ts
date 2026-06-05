import { scrapeAndSaveHero } from '../lib/scraper/hero-scraper.js';
import { getDb, seedHeroesIfEmpty } from '../lib/db/database.js';
import fs from 'fs';
import path from 'path';

const heroId = process.argv[2] || 'miya';
console.log(`=== Testing parser for: ${heroId} ===\n`);

const db = getDb();
seedHeroesIfEmpty(db);

const result = await scrapeAndSaveHero(heroId, true);
console.log('Scrape result:', result.success ? 'SUCCESS' : 'FAILED', '\n');

// Read from DB
const row = db.prepare('SELECT skills FROM heroes WHERE hero_id = ?').get(heroId) as any;
if (!row?.skills) { console.log('NO SKILLS IN DB'); process.exit(1); }

const skills = JSON.parse(row.skills);

for (const [key, skill] of Object.entries(skills) as [string, any][]) {
  console.log(`--- ${key.toUpperCase()} ---`);
  console.log(`  Name: ${skill.name}`);
  console.log(`  DamageType: ${skill.damageType}`);
  console.log(`  Cooldown: ${skill.cooldown}`);
  console.log(`  ManaCost: ${skill.manaCost}`);
  console.log(`  Scaling: ${JSON.stringify(skill.scaling)}`);
  console.log(`  Tags: ${JSON.stringify(skill.strategicTags)}`);
  console.log(`  ScalingTable: ${JSON.stringify(skill.scalingTable)}`);
  console.log(`  Description (first 200 chars):`);
  console.log(`    "${(skill.description || '').substring(0, 200)}"`);
  // Check for wiki markup remnants
  const desc = skill.description || '';
  if (desc.includes('{{')) console.log(`  ⚠️ WARNING: Contains {{ template markup!`);
  if (desc.includes('[[')) console.log(`  ⚠️ WARNING: Contains [[ wiki link markup!`);
  if (desc.includes('|tulip')) console.log(`  ⚠️ WARNING: Contains tulip color class!`);
  if (desc.includes('|cinnabar')) console.log(`  ⚠️ WARNING: Contains cinnabar color class!`);
  if (/\.\w/.test(desc) && !/\.\d/.test(desc.match(/\.\w/)?.[0] || '')) {
    const matches = desc.match(/[a-z]\.[A-Z]/g);
    if (matches) console.log(`  ⚠️ WARNING: Merged sentences: ${matches.join(', ')}`);
  }
  console.log('');
}

// Also write to JSON file for inspection
const heroFile = path.join(process.cwd(), 'data', 'heroes', `${heroId}.json`);
if (fs.existsSync(heroFile)) {
  const data = JSON.parse(fs.readFileSync(heroFile, 'utf8'));
  data.skills = skills;
  fs.writeFileSync(heroFile, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Updated ${heroFile}`);
}
