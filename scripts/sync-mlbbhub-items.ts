/**
 * Enrich items, emblems, and battle spells data from mlbbhub.com.
 *
 * Strategy:
 * 1. Fetch /items → extract all items from JSON-LD + HTML cards
 * 2. For each item → fetch /items/{slug} → extract heroesWhoCore from RSC payload
 * 3. Fetch /emblems → extract emblem talent data
 * 4. Fetch /spells → extract spell data with recommendedRoles
 * 5. Merge into existing JSON files
 *
 * Run: npx tsx scripts/sync-mlbbhub-items.ts
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const REPORT_DIR = path.join(ROOT, 'reports');
const RATE_LIMIT_MS = 2000;

function sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
}

function extractJsonLd(html: string, type: string): any {
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1]);
      if (data['@type'] === type) return data;
      if (Array.isArray(data)) {
        const found = data.find((d: any) => d['@type'] === type);
        if (found) return found;
      }
    } catch {}
  }
  return null;
}

function extractAllJsonLd(html: string): any[] {
  const results: any[] = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1]);
      if (Array.isArray(data)) results.push(...data);
      else results.push(data);
    } catch {}
  }
  return results;
}

// === ITEMS ===
interface MlbhubItem {
  slug: string;
  name: string;
  categories: string[];
  tier: number;
  cost: number;
  stats: Record<string, number>;
  recipe: { slug: string; name: string }[];
  abilities: { kind: string; name: string; description: string }[];
  uniqueAttribute: string;
  heroesWhoCore: string[];
}

async function fetchItemsList(): Promise<{ slug: string; name: string }[]> {
  console.log('[INFO] Fetching items list...');
  const resp = await fetch('https://mlbbhub.com/items');
  const html = await resp.text();

  // Extract from JSON-LD CollectionPage
  const ld = extractJsonLd(html, 'CollectionPage');
  if (ld?.mainEntity?.itemListElement) {
    return ld.mainEntity.itemListElement.map((item: any) => ({
      slug: item.url.split('/items/')[1] || '',
      name: item.name,
    }));
  }

  // Fallback: extract from link elements
  const items: { slug: string; name: string }[] = [];
  const re = /href="\/items\/([a-z0-9-]+)"[^>]*aria-label="([^"]+) details"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    items.push({ slug: m[1], name: m[2] });
  }
  return items;
}

async function fetchItemDetail(slug: string): Promise<Partial<MlbhubItem>> {
  try {
    const resp = await fetch(`https://mlbbhub.com/items/${slug}`);
    const html = await resp.text();
    const result: Partial<MlbhubItem> = { slug };

    // Extract from RSC payload - look for the item object
    // Pattern: "item":{"slug":"...","name":"...","categories":[...],...}
    const itemMatch = html.match(/"item":\s*\{[^}]*"slug"\s*:\s*"([^"]+)"[^}]*"name"\s*:\s*"([^"]+)"[^}]*"categories"\s*:\s*\[([^\]]*)\][^}]*"tier"\s*:\s*(\d+)[^}]*"cost"\s*:\s*(\d+)/);
    if (itemMatch) {
      result.name = itemMatch[2];
      result.categories = itemMatch[3].replace(/"/g, '').split(',').map(s => s.trim());
      result.tier = parseInt(itemMatch[4]);
      result.cost = parseInt(itemMatch[5]);
    }

    // Extract stats object
    const statsMatch = html.match(/"stats"\s*:\s*\{([^}]*)\}/);
    if (statsMatch) {
      const statsRaw = statsMatch[1];
      const stats: Record<string, number> = {};
      const statRe = /"([^"]+)"\s*:\s*(\d+)/g;
      let sm: RegExpExecArray | null;
      while ((sm = statRe.exec(statsRaw)) !== null) {
        stats[sm[1]] = parseInt(sm[2]);
      }
      result.stats = stats;
    }

    // Extract recipe
    const recipeMatch = html.match(/"recipe"\s*:\s*\[([\s\S]*?)\]/);
    if (recipeMatch) {
      const recipeItems: { slug: string; name: string }[] = [];
      const recipeRe = /\{"slug"\s*:\s*"([^"]+)"\s*,\s*"name"\s*:\s*"([^"]+)"\}/g;
      let rm: RegExpExecArray | null;
      while ((rm = recipeRe.exec(recipeMatch[1])) !== null) {
        recipeItems.push({ slug: rm[1], name: rm[2] });
      }
      result.recipe = recipeItems;
    }

    // Extract abilities
    const abilitiesMatch = html.match(/"abilities"\s*:\s*\[([\s\S]*?)\]\s*,\s*"uniqueAttribute"/);
    if (abilitiesMatch) {
      const abilities: { kind: string; name: string; description: string }[] = [];
      const abilityRe = /\{"kind"\s*:\s*"([^"]+)"\s*,\s*"name"\s*:\s*"([^"]+)"\s*,\s*"description"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/g;
      let am: RegExpExecArray | null;
      while ((am = abilityRe.exec(abilitiesMatch[1])) !== null) {
        abilities.push({ kind: am[1], name: am[2], description: am[3].replace(/\\"/g, '"').replace(/\\n/g, '\n') });
      }
      result.abilities = abilities;
    }

    // Extract uniqueAttribute
    const uaMatch = html.match(/"uniqueAttribute"\s*:\s*"([^"]*)"/);
    if (uaMatch) result.uniqueAttribute = uaMatch[1];

    // Extract heroesWhoCore from hero links on the page
    const heroLinks = [...new Set([...html.matchAll(/href="\/heroes\/([a-z0-9-]+)"/g)].map(m => m[1]))];
    // Filter out navigation links (only keep ones that appear after "Heroes Who Core")
    const heroesIdx = html.indexOf('Heroes Who Core');
    if (heroesIdx > 0) {
      const afterSection = html.substring(heroesIdx);
      const coreHeroLinks = [...new Set([...afterSection.matchAll(/href="\/heroes\/([a-z0-9-]+)"/g)].map(m => m[1]))];
      result.heroesWhoCore = coreHeroLinks;
    } else if (heroLinks.length > 0) {
      // Fallback: use all hero links but exclude common nav heroes
      result.heroesWhoCore = heroLinks.filter(h => !['ling', 'fanny', 'gusion', 'lancelot'].includes(h) || heroLinks.length > 10);
    }

    return result;
  } catch (e: any) {
    console.log(`  [WARN] Failed to fetch item ${slug}: ${e.message}`);
    return {};
  }
}

// === EMBLEMS ===
interface MlbhubEmblem {
  slug: string;
  name: string;
  description: string;
  stats: { value: string; label: string }[];
  talents: { name: string; slug: string; description: string; type: string }[];
}

async function fetchEmblems(): Promise<MlbhubEmblem[]> {
  console.log('[INFO] Fetching emblems...');
  const resp = await fetch('https://mlbbhub.com/emblems');
  const html = await resp.text();
  // Strip HTML tags to get rendered text
  const text = html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ');

  // Parse from rendered text content
  const emblems: MlbhubEmblem[] = [];
  const emblemNames = ['Basic Common Emblem', 'Tank Emblem', 'Assassin Emblem', 'Mage Emblem', 'Fighter Emblem', 'Support Emblem', 'Marksman Emblem'];
  const emblemSlugs = ['common', 'tank', 'assassin', 'mage', 'fighter', 'support', 'marksman'];

  for (let i = 0; i < emblemNames.length; i++) {
    const name = emblemNames[i];
    const slug = emblemSlugs[i];
    const idx = text.indexOf(name);
    if (idx < 0) continue;

    const section = text.substring(idx, idx + 1000);
    const emblem: MlbhubEmblem = { slug, name, description: '', stats: [], talents: [] };

    // Extract description (text between name tags and first stat)
    const tagsEnd = section.indexOf('View talents');
    const descSection = tagsEnd > 0 ? section.substring(0, tagsEnd) : section;
    const descMatch = descSection.match(new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]{0,200}?([A-Z][^.]+\\.)`));
    if (descMatch) emblem.description = descMatch[1].trim();

    // Extract stats: +{value}{Label} pattern
    const statRe = /\+(\d+[%\s]*[A-Za-z\s]+?)(?=\+|\d+ talents|$)/g;
    let sm: RegExpExecArray | null;
    while ((sm = statRe.exec(section)) !== null) {
      const val = sm[1].trim();
      const labelMatch = val.match(/^(\d+[%\s]*)(.*)/);
      if (labelMatch) {
        emblem.stats.push({ value: labelMatch[1].trim(), label: labelMatch[2].trim() });
      }
    }

    // Extract talent count
    const talentMatch = section.match(/(\d+) talents/);
    if (talentMatch) {
      const count = parseInt(talentMatch[1]);
      emblem.talents = Array(count).fill(null).map((_, j) => ({
        name: `Talent ${j + 1}`, slug: '', description: '', type: j < count - 1 ? 'standard' : 'core',
      }));
    }

    emblems.push(emblem);
  }

  return emblems;
}

// === SPELLS ===
interface MlbhubSpell {
  slug: string;
  name: string;
  cooldown: string;
  cooldownSeconds: number;
  unlockLevel: number;
  effect: string;
  effectFull: string;
  description: string;
  recommendedRoles: string[];
}

async function fetchSpells(): Promise<MlbhubSpell[]> {
  console.log('[INFO] Fetching spells...');
  const resp = await fetch('https://mlbbhub.com/spells');
  const html = await resp.text();
  // Strip HTML tags to get rendered text
  const text = html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ');

  // Parse from rendered text content
  // Pattern: "{Name}{cooldown}sLv.{level}{effect}{Role1}{Role2}..."
  const spells: MlbhubSpell[] = [];
  const spellNames = ['Execute', 'Retribution', 'Inspire', 'Sprint', 'Revitalize', 'Aegis', 'Petrify', 'Purify', 'Flameshot', 'Flicker', 'Vengeance', 'Arrival'];

  for (const name of spellNames) {
    const idx = text.indexOf(name);
    if (idx < 0) continue;

    const section = text.substring(idx, idx + 500);
    const spell: MlbhubSpell = {
      slug: name.toLowerCase(),
      name,
      cooldown: '',
      cooldownSeconds: 0,
      unlockLevel: 1,
      effect: '',
      effectFull: '',
      description: '',
      recommendedRoles: [],
    };

    // Extract cooldown: {N}s
    const cdMatch = section.match(new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)s`));
    if (cdMatch) {
      spell.cooldown = cdMatch[1] + 's';
      spell.cooldownSeconds = parseInt(cdMatch[1]);
    }

    // Extract unlock level: Lv.{N}
    const lvMatch = section.match(/Lv\.(\d+)/);
    if (lvMatch) spell.unlockLevel = parseInt(lvMatch[1]);

    // Extract effect text (between level and roles)
    const effectMatch = section.match(/Lv\.\d+([\s\S]*?)(?=(?:Fighter|Assassin|Mage|Marksman|Support|Tank)[A-Z]|$)/);
    if (effectMatch) {
      spell.effect = effectMatch[1].trim().substring(0, 300);
    }

    // Extract roles
    const roles = ['Fighter', 'Assassin', 'Mage', 'Marksman', 'Support', 'Tank'];
    const roleSection = section.substring(section.indexOf('Lv.') + 5);
    for (const role of roles) {
      if (roleSection.includes(role)) {
        spell.recommendedRoles.push(role);
      }
    }

    spells.push(spell);
  }

  return spells;
}

// === MAIN ===
async function main() {
  console.log('[START] mlbbhub.com enrichment sync');

  // Load existing data
  const itemsPath = path.join(DATA_DIR, 'items.json');
  const emblemsPath = path.join(DATA_DIR, 'emblems.json');
  const spellsPath = path.join(DATA_DIR, 'battle_spells.json');

  const existingItems: any[] = JSON.parse(fs.readFileSync(itemsPath, 'utf-8'));
  const existingEmblems: any = JSON.parse(fs.readFileSync(emblemsPath, 'utf-8'));
  const existingSpells: any[] = JSON.parse(fs.readFileSync(spellsPath, 'utf-8'));

  console.log(`[INFO] Existing: ${existingItems.length} items, ${Object.keys(existingEmblems).length} emblem keys, ${existingSpells.length} spells`);

  const stats = { itemsEnriched: 0, itemsNew: 0, emblemsEnriched: 0, spellsEnriched: 0, heroesAdded: 0 };

  // === 1. ITEMS ===
  const itemList = await fetchItemsList();
  console.log(`[INFO] Found ${itemList.length} items on mlbbhub`);

  // Fetch detail for each item (rate limited)
  for (let i = 0; i < itemList.length; i++) {
    const { slug, name } = itemList[i];
    const detail = await fetchItemDetail(slug);

    // Find existing item by name match
    const existing = existingItems.find(item =>
      item.name.toLowerCase() === name.toLowerCase() ||
      item.slug === slug
    );

    if (existing) {
      // Merge heroesWhoCore
      if (detail.heroesWhoCore?.length) {
        existing.heroesWhoCore = detail.heroesWhoCore;
        stats.heroesAdded += detail.heroesWhoCore.length;
      }
      // Enrich stats if existing has empty stats
      if (detail.stats && Object.keys(detail.stats).length > 0) {
        existing.mlbhubStats = detail.stats;
      }
      // Enrich recipe
      if (detail.recipe?.length) {
        existing.mlbhubRecipe = detail.recipe;
      }
      // Enrich abilities
      if (detail.abilities?.length) {
        existing.mlbhubAbilities = detail.abilities;
      }
      existing.mlbhubSource = 'mlbbhub.com';
      stats.itemsEnriched++;
    } else {
      // New item not in existing list
      const newItem = {
        name: name,
        category: detail.categories?.[0] || 'Unknown',
        gold: detail.cost || 0,
        stats: detail.stats ? Object.entries(detail.stats).map(([k, v]) => `${k}: ${v}`) : [],
        uniqueAttributes: detail.uniqueAttribute ? [detail.uniqueAttribute] : [],
        abilities: detail.abilities || [],
        buildFrom: detail.recipe?.map(r => r.name) || [],
        buildsInto: [],
        slug: slug,
        source: 'mlbbhub',
        sourceUrl: `https://mlbbhub.com/items/${slug}`,
        sourceUpdatedAt: new Date().toISOString(),
        dataQuality: 'complete',
        heroesWhoCore: detail.heroesWhoCore || [],
      };
      existingItems.push(newItem);
      stats.itemsNew++;
    }

    if (i % 10 === 0) console.log(`  [${i + 1}/${itemList.length}] Items processed...`);
    if (i < itemList.length - 1) await sleep(RATE_LIMIT_MS);
  }

  // Write updated items
  fs.writeFileSync(itemsPath, JSON.stringify(existingItems, null, 2) + '\n', 'utf-8');
  console.log(`[INFO] Items: ${stats.itemsEnriched} enriched, ${stats.itemsNew} new`);

  // === 2. EMBLEMS ===
  const mlbhubEmblems = await fetchEmblems();
  console.log(`[INFO] Found ${mlbhubEmblems.length} emblems on mlbbhub`);

  for (const emblem of mlbhubEmblems) {
    const key = emblem.slug === 'common' ? 'universalTalents' : `${emblem.slug}Talents`;
    if (existingEmblems[key]) {
      // Enrich with mlbbhub data
      for (const talent of existingEmblems[key]) {
        if (!talent.mlbhubDescription && emblem.talents.length) {
          const match = emblem.talents.find((t: any) => t.name.toLowerCase() === talent.name.toLowerCase());
          if (match) {
            talent.mlbhubDescription = match.description;
            talent.mlbhubSource = 'mlbbhub.com';
          }
        }
      }
      stats.emblemsEnriched++;
    }
  }

  fs.writeFileSync(emblemsPath, JSON.stringify(existingEmblems, null, 2) + '\n', 'utf-8');
  console.log(`[INFO] Emblems: ${stats.emblemsEnriched} enriched`);

  // === 3. SPELLS ===
  const mlbhubSpells = await fetchSpells();
  console.log(`[INFO] Found ${mlbhubSpells.length} spells on mlbbhub`);

  for (const spell of mlbhubSpells) {
    const existing = existingSpells.find(s =>
      s.name.toLowerCase() === spell.name.toLowerCase() ||
      s.slug === spell.slug
    );
    if (existing) {
      if (spell.recommendedRoles.length) {
        existing.recommendedRoles = spell.recommendedRoles;
      }
      if (spell.effectFull) existing.effectFull = spell.effectFull;
      if (spell.description) existing.mlbhubDescription = spell.description;
      existing.mlbhubSource = 'mlbbhub.com';
      stats.spellsEnriched++;
    }
  }

  fs.writeFileSync(spellsPath, JSON.stringify(existingSpells, null, 2) + '\n', 'utf-8');
  console.log(`[INFO] Spells: ${stats.spellsEnriched} enriched`);

  // === REPORT ===
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  let report = `# mlbbhub.com Enrichment Report — ${dateStr}\n\n`;
  report += `## Summary\n`;
  report += `- Items enriched: ${stats.itemsEnriched}/${itemList.length}\n`;
  report += `- Items new: ${stats.itemsNew}\n`;
  report += `- Emblems enriched: ${stats.emblemsEnriched}\n`;
  report += `- Spells enriched: ${stats.spellsEnriched}/${existingSpells.length}\n`;
  report += `- Heroes added across items: ${stats.heroesAdded}\n\n`;
  report += `## Items\n`;
  report += `Enriched fields: heroesWhoCore, mlbhubStats, mlbhubRecipe, mlbhubAbilities\n`;
  report += `New items added: ${stats.itemsNew}\n\n`;
  report += `## Emblems\n`;
  report += `Added mlbbhubDescription to talents where available\n\n`;
  report += `## Spells\n`;
  report += `Added recommendedRoles, effectFull, mlbbhubDescription\n`;

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(path.join(REPORT_DIR, 'sync-mlbbhub-report.md'), report, 'utf-8');
  const archiveDir = path.join(REPORT_DIR, 'archive');
  fs.mkdirSync(archiveDir, { recursive: true });
  const ts = `${dateStr}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  fs.writeFileSync(path.join(archiveDir, `sync-mlbbhub-${ts}.md`), report, 'utf-8');

  console.log(`\n[DONE] Report: reports/sync-mlbbhub-report.md`);
  console.log(`[DONE] Items: ${stats.itemsEnriched}+${stats.itemsNew}, Emblems: ${stats.emblemsEnriched}, Spells: ${stats.spellsEnriched}`);
}

main().catch(err => { console.error('[FATAL]', err); process.exit(1); });
