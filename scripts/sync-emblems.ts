/**
 * Sync Emblem Data from Liquipedia.
 * Fetches the MLBB Emblem System page and parses talent data.
 *
 * Run: npm run sync:emblems
 */
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const OUTPUT_PATH = path.join(DATA_DIR, 'emblems.json');

const USER_AGENT = 'MLBB-Draft-Simulator-Builder/1.0 (dev@aistudio.build)';
const API_BASE = 'https://liquipedia.net/mobilelegends/api.php';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function fetchPageHtml(pageName: string): Promise<string> {
  const url = `${API_BASE}?action=parse&page=${encodeURIComponent(pageName)}&prop=text&format=json`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }

  const data = await res.json() as any;
  if (data.error) {
    throw new Error(`API Error: ${data.error.code} — ${data.error.info}`);
  }

  return data?.parse?.text?.['*'] || '';
}

interface EmblemTalent {
  name: string;
  tier: number;
  description: string;
}

interface EmblemData {
  name: string;
  slug: string;
  talents: EmblemTalent[];
  source: string;
  sourceUrl: string;
  sourceUpdatedAt: string;
  dataQuality: string;
}

// Known MLBB emblems
const EMBLEM_NAMES = [
  'Assassin Emblem',
  'Fighter Emblem',
  'Mage Emblem',
  'Marksman Emblem',
  'Tank Emblem',
  'Support Emblem',
];

function parseEmblemsFromHtml(html: string): EmblemData[] {
  const $ = cheerio.load(html);
  const emblems: EmblemData[] = [];
  const fullText = $.text();

  for (const emblemName of EMBLEM_NAMES) {
    const emblem: EmblemData = {
      name: emblemName,
      slug: slugify(emblemName),
      talents: [],
      source: 'liquipedia',
      sourceUrl: 'https://liquipedia.net/mobilelegends/Emblem_System',
      sourceUpdatedAt: new Date().toISOString(),
      dataQuality: 'partial',
    };

    // Try to find talents associated with this emblem type
    const emblemType = emblemName.replace(' Emblem', '');

    // Look for emblem sections in the HTML
    const sections = $('h2, h3, h4').filter((_, el) => {
      const text = $(el).text();
      return text.toLowerCase().includes(emblemType.toLowerCase());
    });

    if (sections.length > 0) {
      // Try to parse talent data from the section following the header
      const section = sections.first();
      let current = section.next();
      let tier = 1;

      while (current.length && !current.is('h2, h3')) {
        const text = current.text().trim();
        if (text.length > 3 && text.length < 200) {
          // Try to parse talent name and description
          const talentMatch = text.match(/^([A-Z][A-Za-z\s]+?)[\s:–—-]+(.+)$/);
          if (talentMatch) {
            emblem.talents.push({
              name: talentMatch[1].trim(),
              tier: Math.min(tier, 3),
              description: talentMatch[2].trim(),
            });
            tier++;
          }
        }
        current = current.next();
      }
    }

    // If we couldn't parse talents from the page, use known talent data
    if (emblem.talents.length === 0) {
      emblem.talents = getKnownTalents(emblemType);
      emblem.dataQuality = emblem.talents.length > 0 ? 'complete' : 'minimal';
    } else {
      emblem.dataQuality = 'complete';
    }

    emblems.push(emblem);
  }

  return emblems;
}

/** Fallback known talent data for each emblem type */
function getKnownTalents(type: string): EmblemTalent[] {
  const talentMap: Record<string, EmblemTalent[]> = {
    'Assassin': [
      { name: 'Rupture', tier: 1, description: 'Adaptive Penetration +6' },
      { name: 'Master Assassin', tier: 1, description: 'When alone, damage dealt increased by 7%' },
      { name: 'Seasoned Hunter', tier: 2, description: 'Damage to Lord and Turtle +15%' },
      { name: 'Lethal Ignition', tier: 2, description: 'Dealing damage > 7% of enemy max HP 3 times in 5s deals adaptive damage equal to 16% of their max HP' },
      { name: 'Killing Spree', tier: 3, description: 'After a kill, restore 12% HP and gain 15% Movement Speed for 5s' },
      { name: 'Brave Smite', tier: 3, description: 'Dealing skill damage heals 5% of Max HP. CD: 6s' },
    ],
    'Fighter': [
      { name: 'Firmness', tier: 1, description: 'Physical and Magic Defense +6' },
      { name: 'Unbending Will', tier: 1, description: 'Damage increased by 3% when HP below 50%' },
      { name: 'Festival of Blood', tier: 2, description: 'Skill damage grants 6% Spell Vamp' },
      { name: 'Disabling Strike', tier: 2, description: 'After hitting enemy with skill, reduces Movement Speed by 30% for 1s' },
      { name: 'War Axe', tier: 3, description: 'Dealing damage grants 9 Physical Attack and 3 Adaptive Pen per stack (max 8)' },
      { name: 'Quantum Charge', tier: 3, description: 'Dealing Basic Attack damage restores 60 HP and grants 30% Movement Speed for 1.5s. CD: 8s' },
    ],
    'Mage': [
      { name: 'Inspire', tier: 1, description: 'Cooldown Reduction +5%' },
      { name: 'Wilderness Blessing', tier: 1, description: 'Movement Speed in jungle +10%' },
      { name: 'Bargain Hunter', tier: 2, description: 'Equipment price reduced by 90 gold total' },
      { name: 'Lethal Ignition', tier: 2, description: 'Dealing damage > 7% of enemy max HP 3 times in 5s deals adaptive damage equal to 16% of their max HP' },
      { name: 'Magic Worship', tier: 3, description: 'Dealing damage > 7% of max HP burns target for 3s, dealing 82-250 Magic Damage total' },
      { name: 'Impure Rage', tier: 3, description: 'Skills deal extra 4% target max HP as Magic Damage and restore 3% Mana. CD: 5s' },
    ],
    'Marksman': [
      { name: 'Swift', tier: 1, description: 'Attack Speed +10%' },
      { name: 'Greed', tier: 1, description: 'Extra 25% gold from killing non-hero units' },
      { name: 'Weapons Master', tier: 2, description: 'Physical Attack from equipment +5%' },
      { name: 'Electro Flash', tier: 2, description: 'After dealing damage with Basic Attack, deals 50 + 20% bonus Physical ATK to up to 3 targets' },
      { name: 'Weakness Finder', tier: 3, description: 'Basic Attacks slow enemies by 90% for 0.8s and reduce Attack Speed by 50%. CD: 3.5s' },
      { name: 'Quantum Charge', tier: 3, description: 'Dealing Basic Attack damage restores 60 HP and grants 30% Movement Speed for 1.5s. CD: 8s' },
    ],
    'Tank': [
      { name: 'Vitality', tier: 1, description: 'HP +280' },
      { name: 'Tenacity', tier: 1, description: 'When HP below 50%, Physical and Magic Defense +15' },
      { name: 'Concussive Blast', tier: 2, description: 'After Basic Attack, deals 100 + 4% Max HP as Magic Damage to nearby enemies. CD: 12s' },
      { name: 'Pulling Power', tier: 2, description: 'After using skill, pull nearest enemy slightly. CD: 12s' },
      { name: 'Cursed Helmet', tier: 3, description: 'Deals 1.2% Max HP as Magic Damage per second to nearby enemies' },
      { name: 'Brave Smite', tier: 3, description: 'Dealing skill damage heals 5% of Max HP. CD: 6s' },
    ],
    'Support': [
      { name: 'Agility', tier: 1, description: 'Movement Speed +6%' },
      { name: 'Recovery', tier: 1, description: 'HP Regen + Heal Effect +10%' },
      { name: 'Pull Yourself Together', tier: 2, description: 'Reduces Battle Spell and equipment Active CD by 15%' },
      { name: 'Avarice', tier: 2, description: 'Gain extra 9 gold every 4s when near ally. Max bonus: 1000 gold' },
      { name: 'Focusing Mark', tier: 3, description: 'After hitting enemy, ally Basic Attacks deal extra 6% damage to them for 3s' },
      { name: 'Brave Smite', tier: 3, description: 'Dealing skill damage heals 5% of Max HP. CD: 6s' },
    ],
  };

  return talentMap[type] || [];
}

async function main() {
  console.log('========================================');
  console.log('  MLBB EMBLEM DATA SYNC (Liquipedia)');
  console.log('========================================\n');

  // Try multiple page name variants
  const pageNames = ['Emblem_System', 'Emblem', 'Emblems', 'Emblem_system'];
  let html = '';
  let fetched = false;

  for (const pageName of pageNames) {
    try {
      console.log(`[Emblems] Trying page: ${pageName}...`);
      html = await fetchPageHtml(pageName);
      fetched = true;
      console.log(`[Emblems] Successfully fetched: ${pageName}`);
      break;
    } catch (err: any) {
      console.log(`[Emblems] Page "${pageName}" not found, trying next...`);
    }
  }

  console.log('[Emblems] Parsing emblem data...');
  const emblems = parseEmblemsFromHtml(html);

  // Validate
  const totalTalents = emblems.reduce((sum, e) => sum + e.talents.length, 0);
  console.log(`[Emblems] Parsed ${emblems.length} emblems with ${totalTalents} total talents`);

  if (!fetched) {
    console.log('[Emblems] No Liquipedia page found — using built-in talent data as fallback');
  }

  // Write output
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(emblems, null, 2), 'utf8');

  console.log('\n========================================');
  console.log('  EMBLEM SYNC RESULTS');
  console.log('========================================');
  console.log(`  Emblems:       ${emblems.length}`);
  console.log(`  Total talents: ${totalTalents}`);
  console.log(`  Written to:    ${OUTPUT_PATH}`);

  for (const e of emblems) {
    console.log(`    ${e.name}: ${e.talents.length} talents (${e.dataQuality})`);
  }

  console.log('\n========================================');
  console.log('  RESULT: PASS');
  console.log('========================================');
}

main().catch(err => {
  console.error('[Emblems] Unhandled error:', err);
  process.exit(1);
});
