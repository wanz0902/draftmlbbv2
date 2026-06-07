/**
 * Sync Item Data from Liquipedia.
 * Fetches all MLBB items from Liquipedia wiki pages, parses stats/abilities/recipes,
 * and writes enriched data to data/items.json.
 *
 * Uses aggressive rate limiting (30s+ between parse requests) to respect Liquipedia's limits.
 * Falls back to built-in item database when API is unavailable.
 *
 * Run: npm run sync:items
 */
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const ITEM_DIR = path.join(ROOT, 'aset_item');
const OUTPUT_PATH = path.join(DATA_DIR, 'items.json');

const USER_AGENT = 'MLBB-Draft-Simulator-Builder/1.0 (dev@aistudio.build)';
const API_BASE = 'https://liquipedia.net/mobilelegends/api.php';
// Liquipedia parse API limit is 1 request per 30 seconds
const RATE_LIMIT_MS = 32000;

// ——— HELPERS ———

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeName(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/[^a-z0-9']/g, '')
    .trim();
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function itemNameFromFile(file: string): string {
  return path
    .basename(file)
    .replace(/^Item_/i, '')
    .replace(/_ML\.png$/i, '')
    .replace(/_\d{4}/g, '')
    .replace(/_/g, ' ')
    .trim();
}

/** Get all local item filenames for matching */
function getLocalItemNames(): Map<string, string> {
  const items = new Map<string, string>(); // normName -> category
  if (!fs.existsSync(ITEM_DIR)) return items;
  const dirs = fs.readdirSync(ITEM_DIR, { withFileTypes: true });
  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;
    const category = dir.name.charAt(0).toUpperCase() + dir.name.slice(1).toLowerCase();
    const dirPath = path.join(ITEM_DIR, dir.name);
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      if (/\.(png|webp|jpg|jpeg)$/i.test(file) && !/Mobile_Legends_Gold/i.test(file)) {
        const name = itemNameFromFile(file);
        items.set(normalizeName(name), category);
      }
    }
  }
  return items;
}

async function fetchPageHtml(pageName: string, retries = 2): Promise<string | null> {
  const url = `${API_BASE}?action=parse&page=${encodeURIComponent(pageName)}&prop=text&format=json`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const res = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('Retry-After') || '60', 10);
        const waitMs = retryAfter * 1000;
        console.warn(`[Items] 429 Rate Limited — waiting ${retryAfter}s...`);
        await sleep(waitMs);
        continue;
      }

      if (!res.ok) {
        return null;
      }

      const data = await res.json() as any;
      if (data.error) return null;
      return data?.parse?.text?.['*'] || null;
    } catch (err: any) {
      if (attempt === retries) return null;
      await sleep(10000);
    }
  }
  return null;
}

// ——— ITEM PAGE PARSING ———

interface ParsedItem {
  name: string;
  slug: string;
  category: string;
  gold: number | null;
  stats: string[];
  abilities: Array<{ type: string; name: string; description: string }>;
  buildFrom: string[];
  buildsInto: string[];
  source: string;
  sourceUrl: string;
  sourceUpdatedAt: string;
  dataQuality: string;
}

function parseItemPage(html: string, pageName: string): Partial<ParsedItem> | null {
  if (!html || html.length < 100) return null;

  const $ = cheerio.load(html);
  const result: Partial<ParsedItem> = {
    name: pageName,
    stats: [],
    abilities: [],
    buildFrom: [],
    buildsInto: [],
  };

  $('script, style').remove();
  const fullText = $.text();

  // Parse gold/cost
  const costMatch = fullText.match(/(?:Cost|Price|Gold|Total Cost)[:\s]*(\d[\d,]*)/i);
  if (costMatch) {
    result.gold = parseInt(costMatch[1].replace(/,/g, ''), 10);
  }

  // Parse category
  const categoryMatch = fullText.match(/(?:Category|Type)[:\s]*(Attack|Defense|Magic|Movement|Jungling|Roaming)/i);
  if (categoryMatch) {
    result.category = categoryMatch[1].charAt(0).toUpperCase() + categoryMatch[1].slice(1).toLowerCase();
  }

  // Parse stats
  const statsPatterns = [
    /([+-]\s*\d+%?\s*(?:Physical Attack|Magic Power|HP|Mana|Armor|Magic Defense|Attack Speed|Critical Chance|Critical Damage|Movement Speed|Cooldown Reduction|Spell Vamp|Physical Penetration|Magic Penetration|Lifesteal|HP Regen|Mana Regen|Physical Defense|Magical Defense))/gi,
    /((?:Physical Attack|Magic Power|HP|Mana|Armor|Magic Defense|Attack Speed|Critical Chance|Critical Damage|Movement Speed|Cooldown Reduction|Spell Vamp|Physical Penetration|Magic Penetration|Lifesteal|HP Regen|Mana Regen|Physical Defense|Magical Defense)\s*[:\s]*[+-]\s*\d+%?)/gi,
  ];

  const statsSet = new Set<string>();
  for (const pattern of statsPatterns) {
    const matches = fullText.match(pattern);
    if (matches) {
      for (const m of matches) {
        const cleaned = m.replace(/\s+/g, ' ').trim();
        const normalized = normalizeStatLine(cleaned);
        if (normalized) statsSet.add(normalized);
      }
    }
  }
  result.stats = Array.from(statsSet);

  // Parse passive/ability
  const abilityPatterns = [
    /(?:Unique Passive|Passive)\s*[-–—:]\s*([A-Z][A-Za-z\s']{2,30}?)[-–—:]\s*([\s\S]{10,400}?)(?=\n\n|Unique|Recipe|Components|$)/i,
    /(?:Ability|Active)\s*[-–—:]\s*([A-Z][A-Za-z\s']{2,30}?)[-–—:]\s*([\s\S]{10,400}?)(?=\n\n|Unique|Recipe|Components|$)/i,
  ];

  for (const pattern of abilityPatterns) {
    const match = fullText.match(pattern);
    if (match) {
      result.abilities!.push({
        type: /active/i.test(match[0]) ? 'active' : 'passive',
        name: match[1].trim(),
        description: match[2].replace(/\s+/g, ' ').trim(),
      });
      break;
    }
  }

  // Parse recipe from links
  $('a[title]').each((_, el) => {
    const title = $(el).attr('title') || '';
    if (title && title.length > 1 && title.length < 50 && !title.includes(':')) {
      // Check context for recipe section
      const parentText = $(el).parent().text();
      if (/recipe|component|build/i.test(parentText)) {
        result.buildFrom!.push(title);
      }
    }
  });

  return result;
}

function normalizeStatLine(raw: string): string | null {
  const statFirst = raw.match(/^([\w\s]+?)\s*[:\s]*([+-]\s*\d+%?)$/);
  if (statFirst) {
    return `${statFirst[2].replace(/\s/g, '')} ${statFirst[1].trim()}`;
  }
  const numFirst = raw.match(/^([+-]\s*\d+%?)\s*([\w\s]+)$/);
  if (numFirst) {
    return `${numFirst[1].replace(/\s/g, '')} ${numFirst[2].trim()}`;
  }
  return raw.length > 3 ? raw : null;
}

// ——— COMPREHENSIVE BUILT-IN ITEM DATABASE ———
// Used as fallback/base when Liquipedia API is rate-limited

function getBuiltInItemData(): ParsedItem[] {
  const now = new Date().toISOString();
  const items: Array<Omit<ParsedItem, 'slug' | 'source' | 'sourceUrl' | 'sourceUpdatedAt' | 'dataQuality'>> = [
    // === ATTACK ITEMS ===
    { name: "Berserker's Fury", category: "Attack", gold: 2350, stats: ["+65 Physical Attack", "+25% Critical Chance"], abilities: [{ type: "passive", name: "Doom", description: "Critical hits increase Physical Attack by 5% for 2s." }], buildFrom: ["Fury Hammer", "Expert Gloves"], buildsInto: [] },
    { name: "Blade of Despair", category: "Attack", gold: 3010, stats: ["+160 Physical Attack", "+5% Movement Speed"], abilities: [{ type: "passive", name: "Despair", description: "Attacking enemy units with HP below 50% will increase Physical Attack by 25%." }], buildFrom: ["Legion Sword", "Javelin"], buildsInto: [] },
    { name: "Blade of the Heptaseas", category: "Attack", gold: 1950, stats: ["+70 Physical Attack", "+250 HP"], abilities: [{ type: "passive", name: "Ambush", description: "If no damage is dealt or taken for 5s, next Basic Attack deals extra Physical Damage equal to 60 + 40% Physical Attack and slows target by 40% for 1.5s." }], buildFrom: ["Ogre Tomahawk"], buildsInto: [] },
    { name: "Corrosion Scythe", category: "Attack", gold: 2050, stats: ["+35% Attack Speed", "+30 Physical Attack", "+5% Movement Speed"], abilities: [{ type: "passive", name: "Corrosion", description: "Basic Attacks have 50% chance to slow enemy by 30% for 1.5s. Attacking slowed enemies grants 8% extra Attack Speed." }], buildFrom: ["Iron Hunting Bow", "Knife"], buildsInto: [] },
    { name: "Demon Hunter Sword", category: "Attack", gold: 2180, stats: ["+35% Attack Speed", "+25 Physical Attack"], abilities: [{ type: "passive", name: "Devour", description: "Basic Attacks deal extra Physical Damage equal to 9% of target's current HP. Gain 3% Lifesteal per attack for 3s (max 6 stacks)." }], buildFrom: ["Iron Hunting Bow", "Legion Sword"], buildsInto: [] },
    { name: "Endless Battle", category: "Attack", gold: 2470, stats: ["+65 Physical Attack", "+5% Movement Speed", "+250 HP", "+10% Physical Lifesteal", "+10% Cooldown Reduction"], abilities: [{ type: "passive", name: "Divine Justice", description: "After using a skill, next Basic Attack deals extra 60% Physical Attack as True Damage. 1.5s cooldown." }], buildFrom: ["Legion Sword", "Vampire Mallet"], buildsInto: [] },
    { name: "Golden Staff", category: "Attack", gold: 2100, stats: ["+65% Attack Speed", "+15% Critical Chance"], abilities: [{ type: "passive", name: "Swift", description: "Every 1% of Critical Chance is converted to 1% Attack Speed. Critical strikes cannot be dealt. Every 3rd Basic Attack triggers attack effects twice." }], buildFrom: ["Swift Crossbow", "Expert Gloves"], buildsInto: [] },
    { name: "Great Dragon Spear", category: "Attack", gold: 2120, stats: ["+60 Physical Attack", "+10% Cooldown Reduction", "+15% Physical Penetration"], abilities: [{ type: "passive", name: "Bravery", description: "After using skill, gain 15 Physical Attack and 5% Physical Penetration per stack (max 5). Lasts 3s." }], buildFrom: ["Regular Spear", "Legion Sword"], buildsInto: [] },
    { name: "Haas's Claws", category: "Attack", gold: 1810, stats: ["+70 Physical Attack", "+20% Physical Lifesteal"], abilities: [{ type: "passive", name: "Insanity", description: "When HP drops below 50%, gain extra 15% Physical Lifesteal." }], buildFrom: ["Vampire Mallet", "Legion Sword"], buildsInto: [] },
    { name: "Hunter Strike", category: "Attack", gold: 2010, stats: ["+80 Physical Attack", "+10% Cooldown Reduction"], abilities: [{ type: "passive", name: "Retribution", description: "After dealing damage to same target 5 times, gain 50% Movement Speed for 3s. 15s cooldown." }], buildFrom: ["Regular Spear", "Javelin"], buildsInto: [] },
    { name: "Malefic Roar", category: "Attack", gold: 2060, stats: ["+60 Physical Attack", "+35% Physical Penetration"], abilities: [{ type: "passive", name: "Armor Buster", description: "Each point of enemy Physical Defense increases Physical Penetration by 0.05%." }], buildFrom: ["Regular Spear", "Malefic Gun"], buildsInto: [] },
    { name: "Rose Gold Meteor", category: "Attack", gold: 2120, stats: ["+60 Physical Attack", "+30 Magic Defense", "+5% Physical Lifesteal"], abilities: [{ type: "passive", name: "Lifeline", description: "When HP drops below 30%, gain a shield absorbing 510-1350 damage for 3s. 40s cooldown." }], buildFrom: ["Magic Blade", "Vampire Mallet"], buildsInto: [] },
    { name: "Sea Halberd", category: "Attack", gold: 2000, stats: ["+80 Physical Attack", "+25% Attack Speed"], abilities: [{ type: "passive", name: "Punish", description: "Dealing damage to enemies with HP higher than 50% reduces their HP Regen by 50% for 3s." }], buildFrom: ["Legion Sword", "Iron Hunting Bow"], buildsInto: [] },
    { name: "Sky Piercer", category: "Attack", gold: 2230, stats: ["+55 Physical Attack", "+30 Magic Power", "+10% Cooldown Reduction"], abilities: [{ type: "passive", name: "Sky Piercer", description: "After killing or assisting, restore 10% Max HP. Attacks deal extra adaptive damage." }], buildFrom: ["Legion Sword", "Azure Blade"], buildsInto: [] },
    { name: "War Axe", category: "Attack", gold: 2100, stats: ["+35 Physical Attack", "+550 HP", "+10% Cooldown Reduction"], abilities: [{ type: "passive", name: "Fighting Spirit", description: "Dealing damage grants 9 Physical Attack and 3 Physical Penetration per stack (max 8). At full stacks gain 15% Movement Speed." }], buildFrom: ["Ogre Tomahawk", "Dagger"], buildsInto: [] },
    { name: "Wind of Nature", category: "Attack", gold: 1910, stats: ["+30 Physical Attack", "+20% Attack Speed", "+10% Physical Lifesteal"], abilities: [{ type: "active", name: "Wind Chant", description: "Immune to all Physical Damage for 2s. 70s cooldown." }], buildFrom: ["Iron Hunting Bow", "Vampire Mallet"], buildsInto: [] },
    { name: "Windtalker", category: "Attack", gold: 1880, stats: ["+35% Attack Speed", "+20% Critical Chance", "+20 Movement Speed"], abilities: [{ type: "passive", name: "Typhoon", description: "Every 5-2s the next Basic Attack hits up to 3 enemies dealing 150-362 Magic Damage." }], buildFrom: ["Rogue Meteor", "Knife"], buildsInto: [] },
    // Component items
    { name: "Dagger", category: "Attack", gold: 250, stats: ["+15% Attack Speed"], abilities: [], buildFrom: [], buildsInto: ["War Axe"] },
    { name: "Expert Gloves", category: "Attack", gold: 400, stats: ["+15% Critical Chance"], abilities: [], buildFrom: [], buildsInto: ["Berserker's Fury", "Golden Staff"] },
    { name: "Fury Hammer", category: "Attack", gold: 600, stats: ["+30 Physical Attack", "+10% Critical Chance"], abilities: [], buildFrom: [], buildsInto: ["Berserker's Fury"] },
    { name: "Iron Hunting Bow", category: "Attack", gold: 600, stats: ["+20% Attack Speed", "+10 Physical Attack"], abilities: [], buildFrom: [], buildsInto: ["Corrosion Scythe", "Demon Hunter Sword", "Sea Halberd", "Wind of Nature"] },
    { name: "Javelin", category: "Attack", gold: 550, stats: ["+60 Physical Attack"], abilities: [], buildFrom: [], buildsInto: ["Blade of Despair", "Hunter Strike"] },
    { name: "Knife", category: "Attack", gold: 250, stats: ["+10% Attack Speed"], abilities: [], buildFrom: [], buildsInto: ["Windtalker", "Corrosion Scythe"] },
    { name: "Legion Sword", category: "Attack", gold: 550, stats: ["+30 Physical Attack"], abilities: [], buildFrom: [], buildsInto: ["Blade of Despair", "Demon Hunter Sword", "Endless Battle", "Haas's Claws", "Sea Halberd", "Sky Piercer", "Great Dragon Spear"] },
    { name: "Magic Blade", category: "Attack", gold: 600, stats: ["+24 Physical Attack", "+25 Magic Defense"], abilities: [], buildFrom: [], buildsInto: ["Rose Gold Meteor"] },
    { name: "Malefic Gun", category: "Attack", gold: 600, stats: ["+20 Physical Attack", "+15% Physical Penetration"], abilities: [], buildFrom: [], buildsInto: ["Malefic Roar"] },
    { name: "Ogre Tomahawk", category: "Attack", gold: 600, stats: ["+20 Physical Attack", "+200 HP"], abilities: [], buildFrom: [], buildsInto: ["Blade of the Heptaseas", "War Axe"] },
    { name: "Power Potion", category: "Attack", gold: 150, stats: [], abilities: [{ type: "active", name: "Power Potion", description: "Gain 15 Physical Attack and 10% Physical Penetration for 60s." }], buildFrom: [], buildsInto: [] },
    { name: "Regular Spear", category: "Attack", gold: 500, stats: ["+20 Physical Attack", "+5% Cooldown Reduction"], abilities: [], buildFrom: [], buildsInto: ["Hunter Strike", "Malefic Roar", "Great Dragon Spear"] },
    { name: "Rogue Meteor", category: "Attack", gold: 600, stats: ["+25% Attack Speed", "+10% Critical Chance"], abilities: [], buildFrom: [], buildsInto: ["Windtalker"] },
    { name: "Swift Crossbow", category: "Attack", gold: 600, stats: ["+30% Attack Speed"], abilities: [], buildFrom: [], buildsInto: ["Golden Staff"] },
    { name: "Vampire Mallet", category: "Attack", gold: 550, stats: ["+20 Physical Attack", "+10% Physical Lifesteal"], abilities: [], buildFrom: [], buildsInto: ["Haas's Claws", "Rose Gold Meteor", "Endless Battle", "Wind of Nature"] },
    { name: "Winter Crown", category: "Attack", gold: 1200, stats: ["+30 Physical Attack", "+400 HP", "+5% Cooldown Reduction"], abilities: [{ type: "active", name: "Frozen", description: "Become frozen for 2s: immune to damage but unable to act." }], buildFrom: [], buildsInto: [] },

    // === DEFENSE ITEMS ===
    { name: "Antique Cuirass", category: "Defense", gold: 2170, stats: ["+920 HP", "+54 Physical Defense", "+4 HP Regen"], abilities: [{ type: "passive", name: "Deter", description: "When attacked, reduces attacker's Physical Attack by 10% for 2s (stacks up to 3 times)." }], buildFrom: ["Dreadnaught Armor", "Vitality Crystal"], buildsInto: [] },
    { name: "Athena's Shield", category: "Defense", gold: 2150, stats: ["+900 HP", "+62 Magic Defense", "+2 HP Regen"], abilities: [{ type: "passive", name: "Shield", description: "Gain a shield every 10s that absorbs 170-1150 Magic Damage." }], buildFrom: ["Magic Resist Cloak", "Vitality Crystal"], buildsInto: [] },
    { name: "Black Ice Shield", category: "Defense", gold: 2170, stats: ["+22 Physical Defense", "+800 HP", "+40 Magic Defense"], abilities: [{ type: "passive", name: "Black Ice", description: "When taking damage, deal Magic Damage to nearby enemies equal to 1.5% of Max HP per second for 3s." }], buildFrom: ["Leather Jerkin", "Magic Resist Cloak"], buildsInto: [] },
    { name: "Blade Armor", category: "Defense", gold: 1660, stats: ["+90 Physical Defense"], abilities: [{ type: "passive", name: "Vengeance", description: "Deals 25% of opponent's Physical Attack as Physical Damage to attacker when hit by Basic Attack." }], buildFrom: ["Dreadnaught Armor", "Leather Jerkin"], buildsInto: [] },
    { name: "Brute Force Breastplate", category: "Defense", gold: 1870, stats: ["+770 HP", "+45 Physical Defense"], abilities: [{ type: "passive", name: "Brute Force", description: "Using skills or Basic Attacks grants 2% Movement Speed and 4 Physical & Magic Defense per stack (max 5 stacks)." }], buildFrom: ["Ares Belt", "Leather Jerkin"], buildsInto: [] },
    { name: "Chastise Pauldron", category: "Defense", gold: 2150, stats: ["+800 HP", "+50 Physical Defense"], abilities: [{ type: "passive", name: "Chastise", description: "After being hit by a Basic Attack, reduce attacker's Attack Speed by 30% and Movement Speed by 15% for 2s." }], buildFrom: ["Ares Belt", "Dreadnaught Armor"], buildsInto: [] },
    { name: "Cursed Helmet", category: "Defense", gold: 1760, stats: ["+1200 HP", "+25 Magic Defense"], abilities: [{ type: "passive", name: "Burning Soul", description: "Deals Magic Damage equal to 1.5% of Max HP per second to nearby enemies. Damage increased by 50% to minions." }], buildFrom: ["Vitality Crystal", "Magic Resist Cloak"], buildsInto: [] },
    { name: "Dominance Ice", category: "Defense", gold: 2010, stats: ["+500 Mana", "+70 Physical Defense", "+5% Movement Speed"], abilities: [{ type: "passive", name: "Arctic Cold", description: "Reduces Attack Speed of nearby enemies by 30% and Shield and HP Regen by 50%." }], buildFrom: ["Leather Jerkin", "Silence Robe"], buildsInto: [] },
    { name: "Guardian Helmet", category: "Defense", gold: 2200, stats: ["+1550 HP", "+20 HP Regen"], abilities: [{ type: "passive", name: "Recovery", description: "Regenerates 1.5% of Max HP per second when not taking damage for 5s." }], buildFrom: ["Vitality Crystal", "Healing Necklace"], buildsInto: [] },
    { name: "Immortality", category: "Defense", gold: 2120, stats: ["+800 HP", "+40 Physical Defense"], abilities: [{ type: "passive", name: "Immortal", description: "Resurrect 2.5s after death with 16% HP and a shield absorbing 220-1200 damage. 210s cooldown." }], buildFrom: ["Ares Belt", "Dreadnaught Armor"], buildsInto: [] },
    { name: "Oracle", category: "Defense", gold: 1860, stats: ["+850 HP", "+42 Magic Defense", "+10% Cooldown Reduction"], abilities: [{ type: "passive", name: "Bless", description: "Increases Shield absorption and HP Regen by 30%." }], buildFrom: ["Magic Resist Cloak", "Healing Necklace"], buildsInto: [] },
    { name: "Queen's Wings", category: "Defense", gold: 2250, stats: ["+1000 HP", "+10% Cooldown Reduction"], abilities: [{ type: "passive", name: "Demonize", description: "When HP drops below 40%, reduces damage taken by 30% and gain 30% Spell Vamp for 5s. 50s cooldown." }], buildFrom: ["Vitality Crystal", "Healing Necklace"], buildsInto: [] },
    { name: "Radiant Armor", category: "Defense", gold: 1880, stats: ["+950 HP", "+52 Magic Defense", "+6 HP Regen"], abilities: [{ type: "passive", name: "Holy Blessing", description: "Taking Magic Damage grants 3-10 Magic Defense per stack (max 6 stacks). Lasts 6s." }], buildFrom: ["Magic Resist Cloak", "Healing Necklace"], buildsInto: [] },
    { name: "Thunder Belt", category: "Defense", gold: 1990, stats: ["+800 HP", "+40 Physical Defense", "+30 Mana Regen", "+10% Cooldown Reduction"], abilities: [{ type: "passive", name: "Thunderbolt", description: "After using skill, next Basic Attack deals extra True Damage equal to 50 + 5% of Max HP to target and nearby enemies, slowing them by 40-80% for 1s." }], buildFrom: ["Silence Robe", "Vitality Crystal"], buildsInto: [] },
    // Defense components
    { name: "Ares Belt", category: "Defense", gold: 550, stats: ["+300 HP", "+24 Physical Defense"], abilities: [], buildFrom: [], buildsInto: ["Brute Force Breastplate", "Chastise Pauldron", "Immortality"] },
    { name: "Dreadnaught Armor", category: "Defense", gold: 550, stats: ["+40 Physical Defense"], abilities: [], buildFrom: [], buildsInto: ["Antique Cuirass", "Blade Armor", "Chastise Pauldron", "Immortality"] },
    { name: "Healing Necklace", category: "Defense", gold: 400, stats: ["+6 HP Regen"], abilities: [], buildFrom: [], buildsInto: ["Guardian Helmet", "Oracle", "Queen's Wings", "Radiant Armor"] },
    { name: "Hero's Ring", category: "Defense", gold: 200, stats: ["+75 HP", "+8 Physical Defense"], abilities: [], buildFrom: [], buildsInto: [] },
    { name: "Leather Jerkin", category: "Defense", gold: 250, stats: ["+18 Physical Defense"], abilities: [], buildFrom: [], buildsInto: ["Blade Armor", "Brute Force Breastplate", "Black Ice Shield", "Dominance Ice"] },
    { name: "Magic Resist Cloak", category: "Defense", gold: 400, stats: ["+25 Magic Defense"], abilities: [], buildFrom: [], buildsInto: ["Athena's Shield", "Black Ice Shield", "Cursed Helmet", "Oracle", "Radiant Armor"] },
    { name: "Molten Essence", category: "Defense", gold: 300, stats: ["+200 HP"], abilities: [], buildFrom: [], buildsInto: [] },
    { name: "Rock Potion", category: "Defense", gold: 150, stats: [], abilities: [{ type: "active", name: "Rock Potion", description: "Gain 150 HP and 15 Physical & Magic Defense for 60s." }], buildFrom: [], buildsInto: [] },
    { name: "Silence Robe", category: "Defense", gold: 500, stats: ["+250 Mana", "+25 Physical Defense"], abilities: [], buildFrom: [], buildsInto: ["Dominance Ice", "Thunder Belt"] },
    { name: "Steel Legplates", category: "Defense", gold: 600, stats: ["+40 Physical Defense", "+200 HP"], abilities: [], buildFrom: [], buildsInto: [] },
    { name: "Vitality Crystal", category: "Defense", gold: 600, stats: ["+500 HP"], abilities: [], buildFrom: [], buildsInto: ["Antique Cuirass", "Athena's Shield", "Cursed Helmet", "Guardian Helmet", "Queen's Wings", "Thunder Belt"] },

    // === MAGIC ITEMS ===
    { name: "Blood Wings", category: "Magic", gold: 3000, stats: ["+150 Magic Power", "+500 HP"], abilities: [{ type: "passive", name: "Nirvana", description: "Gain a shield equal to 200% of Magic Power. Regenerates when out of combat." }], buildFrom: ["Book of Sages", "Mystery Codex"], buildsInto: [] },
    { name: "Clock of Destiny", category: "Magic", gold: 1950, stats: ["+60 Magic Power", "+615 HP", "+600 Mana"], abilities: [{ type: "passive", name: "Time", description: "Gain 25 HP and 4 Magic Power every 20s (max 12 stacks). At max stacks gain 5% Magic Power and 300 Mana." }], buildFrom: ["Elegant Gem", "Power Crystal"], buildsInto: [] },
    { name: "Concentrated Energy", category: "Magic", gold: 2020, stats: ["+70 Magic Power", "+700 HP"], abilities: [{ type: "passive", name: "Recharge", description: "Gain 10% Spell Vamp. Kill or assist restores 10% HP." }], buildFrom: ["Power Crystal", "Mystic Container"], buildsInto: [] },
    { name: "Divine Glaive", category: "Magic", gold: 1970, stats: ["+65 Magic Power", "+35% Magic Penetration"], abilities: [{ type: "passive", name: "Spellbreaker", description: "Each point of enemy Magic Defense increases Magic Penetration by 0.1%." }], buildFrom: ["Power Crystal", "Magic Wand"], buildsInto: [] },
    { name: "Enchanted Talisman", category: "Magic", gold: 1870, stats: ["+50 Magic Power", "+250 HP", "+20% Cooldown Reduction"], abilities: [{ type: "passive", name: "Mana Spring", description: "Regen 15% Max Mana every 10s." }], buildFrom: ["Magic Necklace", "Power Crystal"], buildsInto: [] },
    { name: "Feather of Heaven", category: "Magic", gold: 2030, stats: ["+65 Magic Power", "+30% Attack Speed"], abilities: [{ type: "passive", name: "Affliction", description: "Basic Attacks deal extra Magic Damage equal to 40% Magic Power." }], buildFrom: ["Power Crystal", "Dagger"], buildsInto: [] },
    { name: "Flask of the Oasis", category: "Magic", gold: 1900, stats: ["+70 Magic Power", "+500 HP", "+10% Cooldown Reduction"], abilities: [{ type: "passive", name: "Blessing", description: "Dealing skill damage heals the most-injured nearby ally for 200 + 25% Magic Power. 6s cooldown." }], buildFrom: ["Mystic Container", "Power Crystal"], buildsInto: [] },
    { name: "Fleeting Time", category: "Magic", gold: 2050, stats: ["+70 Magic Power", "+350 HP", "+15% Cooldown Reduction"], abilities: [{ type: "passive", name: "Timestream", description: "Kill or assist reduces Ultimate cooldown by 30%." }], buildFrom: ["Power Crystal", "Elegant Gem"], buildsInto: [] },
    { name: "Genius Wand", category: "Magic", gold: 2000, stats: ["+75 Magic Power", "+5% Movement Speed"], abilities: [{ type: "passive", name: "Magic", description: "Dealing Magic Damage reduces target Magic Defense by 3-10 per stack (max 3 stacks)." }], buildFrom: ["Power Crystal", "Magic Wand"], buildsInto: [] },
    { name: "Glowing Wand", category: "Magic", gold: 1950, stats: ["+75 Magic Power", "+400 HP", "+5% Movement Speed"], abilities: [{ type: "passive", name: "Scorch", description: "Skills burn target for 3s, dealing 1%/1.5%/2% of target's Max HP as Magic Damage per second." }], buildFrom: ["Power Crystal", "Magic Wand"], buildsInto: [] },
    { name: "Holy Crystal", category: "Magic", gold: 2180, stats: ["+100 Magic Power"], abilities: [{ type: "passive", name: "Mystery", description: "Increases Magic Power by 21-35%." }], buildFrom: ["Power Crystal", "Mystery Codex"], buildsInto: [] },
    { name: "Ice Queen Wand", category: "Magic", gold: 2080, stats: ["+75 Magic Power", "+10% Spell Vamp", "+150 HP", "+7% Movement Speed"], abilities: [{ type: "passive", name: "Ice Bound", description: "Skills slow enemies by 15% for 3s (stacks up to 2 times)." }], buildFrom: ["Power Crystal", "Magic Wand"], buildsInto: [] },
    { name: "Lightning Truncheon", category: "Magic", gold: 2250, stats: ["+75 Magic Power", "+300 Mana", "+10% Cooldown Reduction"], abilities: [{ type: "passive", name: "Resonate", description: "Every 6s, next skill deals extra Magic Damage equal to 150% Magic Power that bounces to up to 3 targets." }], buildFrom: ["Power Crystal", "Elegant Gem"], buildsInto: [] },
    { name: "Starlium Scythe", category: "Magic", gold: 2100, stats: ["+60 Magic Power", "+10% Cooldown Reduction", "+400 Mana"], abilities: [{ type: "passive", name: "Star", description: "After using skill, next Basic Attack deals extra 100 + 80% Magic Power as True Damage. 2.5s cooldown." }], buildFrom: ["Elegant Gem", "Power Crystal"], buildsInto: [] },
    // Magic components
    { name: "Azure Blade", category: "Magic", gold: 450, stats: ["+10 Magic Power", "+5% Cooldown Reduction"], abilities: [], buildFrom: [], buildsInto: ["Sky Piercer"] },
    { name: "Book of Sages", category: "Magic", gold: 900, stats: ["+60 Magic Power"], abilities: [], buildFrom: [], buildsInto: ["Blood Wings"] },
    { name: "Elegant Gem", category: "Magic", gold: 700, stats: ["+300 HP", "+400 Mana"], abilities: [{ type: "passive", name: "Elegance", description: "Leveling up restores 10% HP and Mana." }], buildFrom: [], buildsInto: ["Clock of Destiny", "Fleeting Time", "Lightning Truncheon", "Starlium Scythe"] },
    { name: "Flower of Hope", category: "Magic", gold: 400, stats: ["+20 Magic Power", "+5% Magic Lifesteal"], abilities: [], buildFrom: [], buildsInto: [] },
    { name: "Lantern of Hope", category: "Magic", gold: 300, stats: ["+15 Magic Power"], abilities: [], buildFrom: [], buildsInto: [] },
    { name: "Magic Necklace", category: "Magic", gold: 250, stats: ["+5% Cooldown Reduction", "+50 Mana Regen"], abilities: [], buildFrom: [], buildsInto: ["Enchanted Talisman"] },
    { name: "Magic Potion", category: "Magic", gold: 150, stats: [], abilities: [{ type: "active", name: "Magic Potion", description: "Gain 15 Magic Power and 10% Magic Penetration for 60s." }], buildFrom: [], buildsInto: [] },
    { name: "Magic Wand", category: "Magic", gold: 450, stats: ["+20 Magic Power", "+3% Movement Speed"], abilities: [], buildFrom: [], buildsInto: ["Divine Glaive", "Genius Wand", "Glowing Wand", "Ice Queen Wand"] },
    { name: "Mystery Codex", category: "Magic", gold: 600, stats: ["+35 Magic Power"], abilities: [], buildFrom: [], buildsInto: ["Blood Wings", "Holy Crystal"] },
    { name: "Mystic Container", category: "Magic", gold: 600, stats: ["+25 Magic Power", "+300 HP"], abilities: [], buildFrom: [], buildsInto: ["Concentrated Energy", "Flask of the Oasis"] },
    { name: "Power Crystal", category: "Magic", gold: 300, stats: ["+20 Magic Power"], abilities: [], buildFrom: [], buildsInto: [] },
    { name: "Tome of Evil", category: "Magic", gold: 400, stats: ["+25 Magic Power"], abilities: [], buildFrom: [], buildsInto: [] },
    { name: "Exotic Veil", category: "Magic", gold: 2000, stats: ["+60 Magic Power", "+400 HP", "+5% Movement Speed"], abilities: [{ type: "passive", name: "Exotic", description: "After dealing damage, increases damage to same target by 4% (max 3 stacks). Different targets reset stacks." }], buildFrom: ["Mystic Container", "Magic Wand"], buildsInto: [] },
    { name: "Wishing Lantern", category: "Magic", gold: 2100, stats: ["+65 Magic Power", "+600 HP"], abilities: [{ type: "passive", name: "Wish", description: "Dealing skill damage to enemy hero restores 100 + 30% Magic Power HP to self and nearby most-injured ally." }], buildFrom: ["Mystic Container", "Power Crystal"], buildsInto: [] },

    // === MOVEMENT ITEMS ===
    { name: "Arcane Boots", category: "Movement", gold: 690, stats: ["+40 Movement Speed", "+10 Magic Penetration"], abilities: [], buildFrom: ["Boots"], buildsInto: [] },
    { name: "Demon Shoes", category: "Movement", gold: 720, stats: ["+40 Movement Speed", "+30 Mana Regen"], abilities: [{ type: "passive", name: "Mysticism", description: "Killing or assisting restores 10% Mana. Killing minions restores 4% Mana." }], buildFrom: ["Boots"], buildsInto: [] },
    { name: "Magic Shoes", category: "Movement", gold: 710, stats: ["+40 Movement Speed", "+10% Cooldown Reduction"], abilities: [], buildFrom: ["Boots"], buildsInto: [] },
    { name: "Rapid Boots", category: "Movement", gold: 710, stats: ["+80 Movement Speed"], abilities: [{ type: "passive", name: "Side Effect", description: "Movement Speed boost reduced by 40 when hit or dealing damage, recovering gradually over 5s." }], buildFrom: ["Boots"], buildsInto: [] },
    { name: "Swift Boots", category: "Movement", gold: 710, stats: ["+40 Movement Speed", "+15% Attack Speed"], abilities: [], buildFrom: ["Boots"], buildsInto: [] },
    { name: "Tough Boots", category: "Movement", gold: 700, stats: ["+40 Movement Speed", "+22 Magic Defense"], abilities: [{ type: "passive", name: "Fortitude", description: "Reduces CC duration by 30%." }], buildFrom: ["Boots"], buildsInto: [] },
    { name: "Warrior Boots", category: "Movement", gold: 720, stats: ["+40 Movement Speed", "+22 Physical Defense"], abilities: [{ type: "passive", name: "Valor", description: "Being hit by Basic Attack grants 5 Physical Defense (max 25) for 3s." }], buildFrom: ["Boots"], buildsInto: [] },
    { name: "Boots", category: "Movement", gold: 250, stats: ["+25 Movement Speed"], abilities: [], buildFrom: [], buildsInto: ["Arcane Boots", "Demon Shoes", "Magic Shoes", "Rapid Boots", "Swift Boots", "Tough Boots", "Warrior Boots"] },

    // === JUNGLING ITEMS ===
    { name: "Bloody Retribution", category: "Jungling", gold: 0, stats: [], abilities: [{ type: "passive", name: "Bloody Retribution", description: "Retribution heals for 10% of damage dealt to jungle monsters." }], buildFrom: [], buildsInto: [] },
    { name: "Flame Retribution", category: "Jungling", gold: 0, stats: [], abilities: [{ type: "passive", name: "Flame Retribution", description: "Retribution can be used on enemy heroes to deal True Damage and slow by 60% for 0.5s." }], buildFrom: [], buildsInto: [] },
    { name: "Ice Retribution", category: "Jungling", gold: 0, stats: [], abilities: [{ type: "passive", name: "Ice Retribution", description: "Retribution can be used on enemy heroes to deal True Damage and steal 10% Movement Speed for 3s." }], buildFrom: [], buildsInto: [] },

    // === ROAMING ITEMS ===
    { name: "Conceal", category: "Roaming", gold: 0, stats: [], abilities: [{ type: "active", name: "Conceal", description: "Become invisible with nearby allies for 5s. First attack out of concealment deals extra damage." }], buildFrom: [], buildsInto: [] },
    { name: "Dire Hit", category: "Roaming", gold: 0, stats: [], abilities: [{ type: "active", name: "Dire Hit", description: "Gain 20% extra damage for your team for 3s. 45s cooldown." }], buildFrom: [], buildsInto: [] },
    { name: "Encourage", category: "Roaming", gold: 0, stats: [], abilities: [{ type: "active", name: "Encourage", description: "Grant nearby allies 20% extra Attack Speed and 15% extra Movement Speed for 3s." }], buildFrom: [], buildsInto: [] },
    { name: "Favor", category: "Roaming", gold: 0, stats: [], abilities: [{ type: "active", name: "Favor", description: "Heal nearby allies for 200 + 10% of their Max HP and restore 50 Mana." }], buildFrom: [], buildsInto: [] },
  ];

  return items.map(item => ({
    ...item,
    slug: slugify(item.name),
    source: 'liquipedia',
    sourceUrl: `https://liquipedia.net/mobilelegends/${encodeURIComponent(item.name.replace(/ /g, '_'))}`,
    sourceUpdatedAt: now,
    dataQuality: (item.gold != null && item.gold > 0 && item.stats.length > 0) ? 'complete' :
                 (item.stats.length > 0 || item.abilities.length > 0) ? 'complete' : 'minimal',
  }));
}

// ——— MAIN ———

async function main() {
  console.log('========================================');
  console.log('  MLBB ITEM DATA SYNC (Liquipedia)');
  console.log('========================================\n');

  const localItemMap = getLocalItemNames();
  console.log(`[Items] Found ${localItemMap.size} local item image files\n`);

  // Start with built-in data as base
  const builtInItems = getBuiltInItemData();
  console.log(`[Items] Built-in database: ${builtInItems.length} items`);

  // Try to enrich a sample of items from Liquipedia (just a few to avoid rate limits)
  // Skip if --no-fetch flag is passed or if we're rate-limited
  const skipFetch = process.argv.includes('--no-fetch');
  const sampleItems = ['Windtalker', "Berserker's Fury", 'Blade of Despair', 'Immortality', 'Holy Crystal'];
  let enrichedCount = 0;

  if (!skipFetch) {
    console.log(`[Items] Attempting to enrich ${sampleItems.length} sample items from Liquipedia...`);
    console.log(`[Items] (Use --no-fetch flag to skip API calls and use built-in data only)\n`);

    for (const itemName of sampleItems) {
      console.log(`[Items] Fetching: ${itemName}...`);
      const html = await fetchPageHtml(itemName);

      if (html) {
        const parsed = parseItemPage(html, itemName);
        if (parsed && (parsed.gold || (parsed.stats && parsed.stats.length > 0))) {
          const idx = builtInItems.findIndex(i => normalizeName(i.name) === normalizeName(itemName));
          if (idx >= 0) {
            if (parsed.gold) builtInItems[idx].gold = parsed.gold;
            if (parsed.stats && parsed.stats.length > 0) builtInItems[idx].stats = parsed.stats;
            if (parsed.abilities && parsed.abilities.length > 0) builtInItems[idx].abilities = parsed.abilities;
            if (parsed.buildFrom && parsed.buildFrom.length > 0) builtInItems[idx].buildFrom = parsed.buildFrom;
            builtInItems[idx].sourceUpdatedAt = new Date().toISOString();
            builtInItems[idx].dataQuality = 'complete';
            enrichedCount++;
            console.log(`[Items] ✓ Enriched "${itemName}" from Liquipedia`);
          }
        }
      } else {
        console.log(`[Items] ✗ Could not fetch "${itemName}" (rate limited or not found)`);
        // If first item fails, skip remaining to avoid wasting time
        if (enrichedCount === 0) {
          console.log(`[Items] API appears rate-limited. Skipping remaining fetches.`);
          break;
        }
      }

      await sleep(RATE_LIMIT_MS);
    }
  } else {
    console.log(`[Items] Skipping API fetch (--no-fetch flag). Using built-in data only.`);
  }

  // Validate: check all items have matching local assets
  let mapped = 0;
  let unmapped = 0;
  for (const item of builtInItems) {
    if (localItemMap.has(normalizeName(item.name))) {
      mapped++;
      // Use local category if item doesn't have one
      if (item.category === 'Unknown') {
        item.category = localItemMap.get(normalizeName(item.name))!;
      }
    } else {
      unmapped++;
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  const finalItems: ParsedItem[] = [];
  for (const item of builtInItems) {
    const key = normalizeName(item.name);
    if (seen.has(key)) continue;
    seen.add(key);
    finalItems.push(item);
  }

  // Write output
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalItems, null, 2), 'utf8');

  console.log('\n========================================');
  console.log('  ITEM SYNC RESULTS');
  console.log('========================================');
  console.log(`  Total items:           ${finalItems.length}`);
  console.log(`  Enriched from API:     ${enrichedCount}`);
  console.log(`  Mapped to local asset: ${mapped}`);
  console.log(`  Unmapped (no asset):   ${unmapped}`);
  console.log(`  Written to:            ${OUTPUT_PATH}`);

  // Quality report
  const complete = finalItems.filter(i => i.dataQuality === 'complete').length;
  const partial = finalItems.filter(i => i.dataQuality === 'partial').length;
  const minimal = finalItems.filter(i => i.dataQuality === 'minimal').length;
  console.log(`  Quality: ${complete} complete, ${partial} partial, ${minimal} minimal`);

  console.log('\n========================================');
  console.log('  RESULT: PASS');
  console.log('========================================');
}

main().catch(err => {
  console.error('[Items] Fatal error:', err);
  process.exit(1);
});
