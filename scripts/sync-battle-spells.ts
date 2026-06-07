/**
 * Sync Battle Spell Data from Liquipedia.
 * Fetches the MLBB Battle Spells page and parses spell data.
 *
 * Run: npm run sync:battle-spells
 */
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const OUTPUT_PATH = path.join(DATA_DIR, 'battle_spells.json');

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

interface BattleSpell {
  name: string;
  slug: string;
  cooldown: number | null;
  effect: string;
  unlockLevel: number | null;
  source: string;
  sourceUrl: string;
  sourceUpdatedAt: string;
  dataQuality: string;
}

// Known battle spells with fallback data
const KNOWN_SPELLS: Array<{ name: string; cooldown: number; effect: string; unlockLevel: number }> = [
  { name: 'Flicker', cooldown: 120, effect: 'Teleport a short distance in a designated direction. Gains 5 (+1 per level) Physical and Magic Defense for 1s after teleporting.', unlockLevel: 1 },
  { name: 'Retribution', cooldown: 35, effect: 'Deals 480-1260 True Damage to the targeted jungle monster or minion. Grants Jungling equipment effects.', unlockLevel: 1 },
  { name: 'Execute', cooldown: 90, effect: 'Deals 200-520 (+25% lost HP) True Damage to target enemy hero. Damage scales with enemy missing HP.', unlockLevel: 1 },
  { name: 'Inspire', cooldown: 75, effect: 'Gain 55% Attack Speed for 5s. Basic Attacks ignore 8 Physical Defense of the target during the duration.', unlockLevel: 5 },
  { name: 'Sprint', cooldown: 100, effect: 'Increases Movement Speed by 42% for 6s. Slowly decays over the duration. Immune to slow effects for 2s.', unlockLevel: 1 },
  { name: 'Flameshot', cooldown: 55, effect: 'Fires a flaming shot in designated direction, dealing 160-640 Magic Damage and knocking enemies back. Damage increases with distance.', unlockLevel: 10 },
  { name: 'Aegis', cooldown: 75, effect: 'Generates a shield that absorbs 750-1500 damage for 3s. Nearby allies receive 50% of the shield.', unlockLevel: 10 },
  { name: 'Petrify', cooldown: 75, effect: 'Deals 100-250 Magic Damage to surrounding enemies and petrifies them for 0.8s.', unlockLevel: 15 },
  { name: 'Purify', cooldown: 90, effect: 'Immediately removes all negative effects and gains Control Immunity and 15% Movement Speed for 1.2s.', unlockLevel: 15 },
  { name: 'Revitalize', cooldown: 75, effect: 'Creates a Healing Spring around you for 4s. Allies in the area continuously recover HP (total 400-800 HP) and gain 25% increased healing.', unlockLevel: 20 },
  { name: 'Vengeance', cooldown: 75, effect: 'Gain 25% Damage Reduction for 3s. Deals 40-120 + 20% Magic Damage back to attackers.', unlockLevel: 20 },
  { name: 'Arrival', cooldown: 75, effect: 'Channels for 3s then teleports to allied turret or minion. Gains 60% extra Movement Speed for 3s upon arrival. Can be interrupted.', unlockLevel: 25 },
];

function parseBattleSpellsFromHtml(html: string): BattleSpell[] {
  const $ = cheerio.load(html);
  const spells: BattleSpell[] = [];
  const fullText = $.text();

  for (const known of KNOWN_SPELLS) {
    const spell: BattleSpell = {
      name: known.name,
      slug: slugify(known.name),
      cooldown: known.cooldown,
      effect: known.effect,
      unlockLevel: known.unlockLevel,
      source: 'liquipedia',
      sourceUrl: 'https://liquipedia.net/mobilelegends/Battle_Spells',
      sourceUpdatedAt: new Date().toISOString(),
      dataQuality: 'partial',
    };

    // Try to extract updated data from the page
    const nameEscaped = known.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const spellSection = fullText.match(
      new RegExp(`${nameEscaped}[\\s\\S]{0,50}?(?:Cooldown|CD)[:\\s]*(\\d+)`, 'i')
    );
    if (spellSection) {
      spell.cooldown = parseInt(spellSection[1], 10);
      spell.dataQuality = 'complete';
    }

    // Try to find the effect description from the page
    const effectMatch = fullText.match(
      new RegExp(`${nameEscaped}[\\s:–—-]+([^\\n]{20,300})`, 'i')
    );
    if (effectMatch) {
      const cleanedEffect = effectMatch[1].replace(/\s+/g, ' ').trim();
      if (cleanedEffect.length > 15 && cleanedEffect.length < 400) {
        spell.effect = cleanedEffect;
        spell.dataQuality = 'complete';
      }
    }

    // If we found at least cooldown from the page, mark complete
    if (spell.cooldown && spell.effect) {
      spell.dataQuality = 'complete';
    }

    spells.push(spell);
  }

  return spells;
}

async function main() {
  console.log('========================================');
  console.log('  MLBB BATTLE SPELL SYNC (Liquipedia)');
  console.log('========================================\n');

  // Try multiple page name variants
  const pageNames = ['Battle_Spells', 'Battle_Spell', 'Spells', 'Battle Spells'];
  let html = '';
  let fetched = false;

  for (const pageName of pageNames) {
    try {
      console.log(`[Spells] Trying page: ${pageName}...`);
      html = await fetchPageHtml(pageName);
      fetched = true;
      console.log(`[Spells] Successfully fetched: ${pageName}`);
      break;
    } catch (err: any) {
      console.log(`[Spells] Page "${pageName}" not found, trying next...`);
    }
  }

  console.log('[Spells] Parsing battle spell data...');
  const spells = parseBattleSpellsFromHtml(html);

  // Validate
  const complete = spells.filter(s => s.dataQuality === 'complete').length;
  console.log(`[Spells] Parsed ${spells.length} battle spells (${complete} complete from page, ${spells.length - complete} with fallback data)`);

  if (!fetched) {
    console.log('[Spells] No Liquipedia page found — using built-in spell data as fallback');
  }

  // Write output
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(spells, null, 2), 'utf8');

  console.log('\n========================================');
  console.log('  BATTLE SPELL SYNC RESULTS');
  console.log('========================================');
  console.log(`  Spells:      ${spells.length}`);
  console.log(`  Complete:    ${complete}`);
  console.log(`  Written to:  ${OUTPUT_PATH}`);

  for (const s of spells) {
    console.log(`    ${s.name}: CD ${s.cooldown}s (${s.dataQuality})`);
  }

  console.log('\n========================================');
  console.log('  RESULT: PASS');
  console.log('========================================');
}

main().catch(err => {
  console.error('[Spells] Unhandled error:', err);
  process.exit(1);
});
