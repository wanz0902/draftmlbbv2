import { fetchWikitext } from './liquipedia-gateway.js';
import { getDb, needsRescrape, logScrape } from '../db/database.js';

export const HERO_LIQUIPEDIA_MAP: Record<string, string> = {
  // ——— ASSASSINS ———
  'aamon':         'Aamon',
  'alucard':       'Alucard',
  'benedetta':     'Benedetta',
  'dyrroth':       'Dyrroth',
  'fanny':         'Fanny',
  'gusion':        'Gusion',
  'hanzo':         'Hanzo',
  'hayabusa':      'Hayabusa',
  'helcurt':       'Helcurt',
  'joy':           'Joy',
  'karina':        'Karina',
  'lancelot':      'Lancelot',
  'ling':          'Ling',
  'natalia':       'Natalia',
  'nolan':         'Nolan',
  'saber':         'Saber',
  'selena':        'Selena',
  'yisunshin':     'Yi_Sun-Shin',
  'zilong':        'Zilong',
  // ——— MAGES ———
  'alice':         'Alice',
  'aurora':        'Aurora',
  'bane': 'Bane',
  'cecilion': 'Cecilion',
  'change': 'Chang_e',
  'cyclops': 'Cyclops',
  'eudora': 'Eudora',
  'faramis':       'Faramis',
  'gord':          'Gord',
  'harith':        'Harith',
  'harley':        'Harley',
  'kadita':        'Kadita',
  'kagura':        'Kagura',
  'kimmy':         'Kimmy',
  'lunox':         'Lunox',
  'luoyi':         'Luo_Yi',
  'lylia':         'Lylia',
  'nana':          'Nana',
  'novaria':       'Novaria',
  'odette':        'Odette',
  'pharsa':        'Pharsa',
  'valir':         'Valir',
  'valentina':     'Valentina',
  'vale':          'Vale',
  'vexana':        'Vexana',
  'xavier':        'Xavier',
  'yve':           'Yve',
  'zhask':         'Zhask',
  'zhuxin':        'Zhuxin',
  'zetian':        'Zetian',
  // ——— MARKSMEN ———
  'beatrix':       'Beatrix',
  'brody':         'Brody',
  'bruno':         'Bruno',
  'clint':         'Clint',
  'claude':        'Claude',
  'granger':       'Granger',
  'hanabi':        'Hanabi',
  'irithel':       'Irithel',
  'ixia':          'Ixia',
  'karrie':        'Karrie',
  'layla':         'Layla',
  'lesley':        'Lesley',
  'melissa':       'Melissa',
  'miya':          'Miya',
  'moskov':        'Moskov',
  'natan':         'Natan',
  'popolkupa':     'Popol_and_Kupa',
  'roger':         'Roger',
  'wanwan':        'Wan_Wan',
  // ——— FIGHTERS ———
  'aldous':        'Aldous',
  'alpha':         'Alpha',
  'argus':         'Argus',
  'arlott':        'Arlott',
  'badang':        'Badang',
  'balmond':       'Balmond',
  'chou':          'Chou',
  'cici':          'Cici',
  'edith':         'Edith',
  'fredrinn':      'Fredrinn',
  'freya':         'Freya',
  'guinevere':     'Guinevere',
  'hilda':         'Hilda',
  'jawhead':       'Jaw_Head',
  'julian':        'Julian',
  'khaleed':       'Khaleed',
  'lapulapu':      'Lapu-Lapu',
  'leomord':       'Leomord',
  'masha':         'Masha',
  'minsitthar':    'Minsitthar',
  'paquito':       'Paquito',
  'phoveus':       'Phoveus',
  'ruby':          'Ruby',
  'silvanna':      'Silvanna',
  'sun':           'Sun',
  'suyou':         'Suyou',
  'lukas':         'Lukas',
  'aulus':         'Aulus',
  'terizla':       'Terizla',
  'thamuz':        'Thamuz',
  'xborg':         'X.Borg',
  'yuzhong':       'Yu_Zhong',
  // ——— TANKS ———
  'akai':          'Akai',
  'atlas':         'Atlas',
  'barats':        'Barats',
  'baxia':         'Baxia',
  'belerick':      'Belerick',
  'chip':          'Chip',
  'esmeralda':     'Esmeralda',
  'franco':        'Franco',
  'gatotkaca':     'Gatotkaca',
  'gloo':          'Gloo',
  'hylos':         'Hylos',
  'johnson':       'Johnson',
  'kalea':         'Kalea',
  'khufra':        'Khufra',
  'lolita':        'Lolita',
  'minotaur':      'Minotaur',
  'obsidia':       'Obsidia',
  'tigreal':       'Tigreal',
  'uranus':        'Uranus',
  // ——— SUPPORTS / ROAMERS ———
  'angela':        'Angela',
  'carmilla':      'Carmilla',
  'diggie':        'Diggie',
  'estes':         'Estes',
  'floryn':        'Floryn',
  'kaja':          'Kaja',
  'mathilda':      'Mathilda',
  'rafaela':       'Rafaela',
  'sora':          'Sora',
  'marcel':        'Marcel',
};

export async function scrapeAndSaveHero(
  heroId: string,
  forceRefresh: boolean = false
): Promise<{ success: boolean; heroName: string; source: 'db_cache' | 'liquipedia' | 'error' }> {
  const db = getDb();

  if (!forceRefresh && !needsRescrape(db, 'hero', heroId, 48)) {
    const row = db.prepare('SELECT hero_name FROM heroes WHERE hero_id = ?').get(heroId) as { hero_name: string } | undefined;
    console.log('[HeroScraper] Cache hit: ' + heroId + ' — serving from DB');
    return { success: true, heroName: row?.hero_name ?? heroId, source: 'db_cache' };
  }

  const pageName = HERO_LIQUIPEDIA_MAP[heroId];
  if (!pageName) {
    console.warn('[HeroScraper] No Liquipedia page mapping for hero_id: ' + heroId);
    return { success: false, heroName: heroId, source: 'error' };
  }

  console.log('[HeroScraper] Scraping from Liquipedia: ' + pageName + '...');

  try {
    const wikitext = await fetchWikitext(pageName);

    if (!wikitext || wikitext.length < 100) {
      throw new Error('Wikitext too short or empty for: ' + pageName);
    }

    const parsed = parseHeroWikitext(wikitext, pageName);

    if (!parsed) {
      throw new Error('parseHeroWikitext returned null for: ' + pageName);
    }

    db.prepare(`
      INSERT INTO heroes (
        hero_id, hero_name, liquipedia_page, roles, lanes,
        stat_hp, stat_hp_regen, stat_mana, stat_mana_regen,
        stat_phys_atk, stat_phys_def, stat_magic_def, stat_move_speed, stat_atk_speed,
        skills, scraped_at, data_quality, updated_at
      ) VALUES (
        @heroId, @name, @page, @roles, @lanes,
        @hp, @hpRegen, @mana, @manaRegen,
        @physAtk, @physDef, @magicDef, @moveSpeed, @atkSpeed,
        @skills, unixepoch(), 2, unixepoch()
      )
      ON CONFLICT(hero_id) DO UPDATE SET
        hero_name     = excluded.hero_name,
        liquipedia_page = excluded.liquipedia_page,
        stat_hp       = excluded.stat_hp,
        stat_hp_regen = excluded.stat_hp_regen,
        stat_mana     = excluded.stat_mana,
        stat_phys_atk = excluded.stat_phys_atk,
        stat_phys_def = excluded.stat_phys_def,
        stat_magic_def = excluded.stat_magic_def,
        stat_move_speed = excluded.stat_move_speed,
        stat_atk_speed = excluded.stat_atk_speed,
        skills        = excluded.skills,
        scraped_at    = unixepoch(),
        data_quality  = MAX(heroes.data_quality, 2),
        updated_at    = unixepoch()
    `).run({
      heroId,
      name: parsed.identity.name ?? pageName,
      page: pageName,
      roles: JSON.stringify([parsed.identity.role].filter(Boolean)),
      lanes: JSON.stringify([parsed.identity.lane].filter(Boolean)),
      hp: parsed.base_stats.hp ?? 0,
      hpRegen: parsed.base_stats.hp_regen ?? 0,
      mana: parsed.base_stats.mana ?? 0,
      manaRegen: parsed.base_stats.mana_regen ?? 0,
      physAtk: parsed.base_stats.physical_attack ?? 0,
      physDef: parsed.base_stats.physical_defense ?? 0,
      magicDef: parsed.base_stats.magic_defense ?? 0,
      moveSpeed: parsed.base_stats.movement_speed ?? 0,
      atkSpeed: String(parsed.base_stats.attack_speed ?? ''),
      skills: JSON.stringify(parsed.skills),
    });

    logScrape(db, 'hero', heroId, {
      url: 'https://liquipedia.net/mobilelegends/' + pageName,
      status: 200,
      success: true,
      records: 1,
    });

    console.log('[HeroScraper] ✓ Saved: ' + pageName);
    return { success: true, heroName: parsed.identity.name ?? pageName, source: 'liquipedia' };

  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    logScrape(db, 'hero', heroId, { success: false, error });
    console.error('[HeroScraper] ✗ Failed: ' + pageName + ' — ' + error);
    return { success: false, heroName: heroId, source: 'error' };
  }
}

export async function batchScrapeHeroes(
  forceRefresh: boolean = false,
  onProgress?: (current: number, total: number, heroId: string) => void
): Promise<{ success: number; failed: number; cached: number }> {
  const heroIds = Object.keys(HERO_LIQUIPEDIA_MAP);
  const results = { success: 0, failed: 0, cached: 0 };

  console.log('[HeroScraper] Starting batch scrape of ' + heroIds.length + ' heroes...');

  for (let i = 0; i < heroIds.length; i++) {
    const heroId = heroIds[i];
    onProgress?.(i + 1, heroIds.length, heroId);
    const result = await scrapeAndSaveHero(heroId, forceRefresh);

    if (!result.success) results.failed++;
    else if (result.source === 'db_cache') results.cached++;
    else results.success++;
  }

  console.log('[HeroScraper] Batch complete: ' + results.success + ' scraped, ' + results.cached + ' cached, ' + results.failed + ' failed');
  return results;
}

function cleanWikitext(text: string): string {
  if (!text) return "";
  let cleaned = text;
  
  // Remove HTML tags but preserve line breaks
  cleaned = cleaned.replace(/<br\s*\/?>/gi, "\n");
  cleaned = cleaned.replace(/<[^>]*>/g, "");
  
  // Handle nested {{bgcolortext|color|content}} — extract content (last param)
  // Must handle nested braces by iterating
  let maxIterations = 20;
  while (cleaned.includes('{{') && maxIterations-- > 0) {
    // Handle {{bgcolortext|color|text}} and similar color templates
    cleaned = cleaned.replace(/{{bgcolortext\|[^|]*\|([^{}]*)}}/gi, '$1');
    cleaned = cleaned.replace(/{{color\|[^|]*\|([^{}]*)}}/gi, '$1');
    cleaned = cleaned.replace(/{{tt\|([^{}]*)}}/gi, '$1');
    cleaned = cleaned.replace(/{{sic\|([^{}]*)}}/gi, '$1');
    // Generic templates with 2 params: {{template|param1|param2}} → param2
    cleaned = cleaned.replace(/{{[^|{}]+\|[^|{}]*\|([^{}]*)}}/g, '$1');
    // Generic templates with 1 param: {{template|param}} → param
    cleaned = cleaned.replace(/{{[^|{}]+\|([^{}]*)}}/g, '$1');
    // Empty templates: {{template}} → remove
    cleaned = cleaned.replace(/{{[^{}]*}}/g, '');
  }
  
  // Handle wiki links: [[link|display]] → display, [[link]] → link
  cleaned = cleaned.replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, '$1');
  
  // Remove remaining markup
  cleaned = cleaned.replace(/'''/g, "");
  cleaned = cleaned.replace(/''/g, "");
  
  // Fix paragraph breaks - normalize multiple newlines
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  
  // Fix merged words (no space after period before capital letter)
  cleaned = cleaned.replace(/\.([A-Z])/g, '. $1');
  
  // Collapse multiple spaces but preserve single newlines
  cleaned = cleaned.replace(/[ \t]+/g, " ");
  cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');
  cleaned = cleaned.trim();
  
  return cleaned;
}

function extractScalingTable(cardWt: string): Array<{label: string; values: string[]}> {
  const table: Array<{label: string; values: string[]}> = [];
  
  // Format 1: |stats1=Label|stats1_value=val1/val2/val3
  for (let i = 1; i <= 10; i++) {
    const labelMatch = cardWt.match(new RegExp(`\\|stats${i}\\s*=\\s*([^\\n|]+)`));
    const valueMatch = cardWt.match(new RegExp(`\\|stats${i}_value\\s*=\\s*([^\\n|]+)`));
    if (labelMatch && valueMatch) {
      const label = labelMatch[1].trim();
      const rawValues = valueMatch[1].trim();
      const values = rawValues.split(/\s*\/\s*/).map(v => v.replace(/<[^>]*>/g, '').trim()).filter(v => v);
      if (values.length > 0) {
        table.push({ label, values });
      }
    }
  }
  
  // Format 2: {{AbilityScale}} template (some heroes use this)
  if (table.length === 0) {
    const scaleStart = cardWt.indexOf('{{AbilityScale');
    if (scaleStart !== -1) {
      let braceCount = 0;
      let end = -1;
      for (let i = scaleStart; i < cardWt.length; i++) {
        if (cardWt.slice(i, i + 2) === '{{') { braceCount++; i++; }
        else if (cardWt.slice(i, i + 2) === '}}') {
          braceCount--;
          if (braceCount === 0) { end = i + 2; break; }
          i++;
        }
      }
      const scaleContent = end > scaleStart 
        ? cardWt.substring(scaleStart + '{{AbilityScale'.length, end - 2)
        : cardWt.substring(scaleStart + '{{AbilityScale'.length);
      
      const lines = scaleContent.split('\n');
      for (const line of lines) {
        const match = line.match(/\|(\w[\w\s]*\w?)\s*=\s*(.+)/);
        if (match) {
          const label = match[1].trim();
          if (label === 'header' || label === 'level' || label === 'levels') continue;
          const rawValues = match[2].trim();
          const values = rawValues.split(/\s*[\/,]\s*/).map(v => v.replace(/<[^>]*>/g, '').trim()).filter(v => v);
          if (values.length > 1) {
            table.push({ label, values });
          }
        }
      }
    }
  }
  
  return table;
}

function extractDamageScaling(desc: string): string[] {
  const scalings: string[] = [];
  // Match patterns like (+25% Total Physical Attack), (+100% Magic Power), etc.
  const matches = desc.matchAll(/\(\+?\d+%?\s*[^)]+\)/g);
  for (const m of matches) {
    scalings.push(m[0]);
  }
  return scalings;
}

function detectDamageType(desc: string, typeField: string): string {
  const descLower = desc.toLowerCase();
  const typeLower = (typeField || '').toLowerCase();
  
  // First check description for explicit damage mentions (most reliable)
  if (descLower.includes('physical damage')) return "Physical";
  if (descLower.includes('magic damage')) return "Magic";
  if (descLower.includes('true damage')) return "True";
  
  // Then check type field
  if (typeLower.includes('magic')) return "Magic";
  if (typeLower.includes('true')) return "True";
  if (typeLower.includes('physical')) return "Physical";
  
  // If type is explicitly non-damage
  if (typeLower.includes('buff') || typeLower.includes('heal') || typeLower.includes('passive')) return "None";
  
  return "Not specified in source";
}

function extractStrategicTags(tags: string, desc: string): string[] {
  const result: string[] = [];
  
  // Parse tags field (comma-separated or from template)
  if (tags) {
    const cleaned = cleanWikitext(tags);
    const parts = cleaned.split(/[,/]/).map(t => t.trim()).filter(t => t && t.length < 30);
    result.push(...parts);
  }
  
  // Infer from description if no tags
  if (result.length === 0) {
    const descLower = desc.toLowerCase();
    if (descLower.includes('attack speed')) result.push("Attack Speed");
    if (descLower.includes('movement speed')) result.push("Movement Speed");
    if (descLower.includes('stun')) result.push("CC");
    if (descLower.includes('slow')) result.push("Slow");
    if (descLower.includes('immobil')) result.push("CC");
    if (descLower.includes('knock')) result.push("CC");
    if (descLower.includes('heal') || descLower.includes('regen')) result.push("Sustain");
    if (descLower.includes('shield')) result.push("Shield");
    if (descLower.includes('conceal') || descLower.includes('invisible')) result.push("Conceal");
    if (descLower.includes('basic attack')) result.push("Basic Attack");
    if (descLower.includes('area') || descLower.includes('nearby enemies')) result.push("AOE");
    if (descLower.includes('blink') || descLower.includes('dash')) result.push("Mobility");
  }
  
  return result;
}

function parseInfobox(wt: string, heroName: string) {
  let infoboxWikitext = '';
  const infoboxStart = wt.indexOf('{{Infobox hero');
  if(infoboxStart !== -1) {
      let braceCount = 0;
      let infoboxEnd = -1;
      for (let i = infoboxStart; i < wt.length; i++) {
        if (wt.slice(i, i + 2) === '{{') braceCount++;
        if (wt.slice(i, i + 2) === '}}') {
          braceCount--;
          if (braceCount === 0) { infoboxEnd = i + 2; break; }
        }
      }
      infoboxWikitext = wt.substring(infoboxStart, infoboxEnd !== -1 ? infoboxEnd : wt.length);
  }

  const extractField = (key: string) => {
    const match = infoboxWikitext.match(new RegExp(`\\|${key}\\s*=\\s*([^\\n|]+)`));
    return match ? match[1].trim() : null;
  };

  const hp = parseInt(extractField('hp') || '', 10);
  const spec1 = extractField('specialty1');
  const spec2 = extractField('specialty2');
  
  return {
    identity: {
      name: extractField('name') || heroName,
      title: extractField('title') || null,
      role: extractField('primaryrole') || extractField('role') || null,
      lane: extractField('lane') || null,
      release_date: extractField('releasedate') || null,
      specialty: spec1 && spec2 ? `${spec1} / ${spec2}` : (spec1 || spec2 || null),
      resource: extractField('resourcebar') || null,
      region: extractField('region') || null,
      city: extractField('city') || null
    },
    base_stats: {
      hp: !isNaN(hp) ? hp : null,
      hp_regen: parseInt(extractField('hpreg') || '', 10) || null,
      mana: parseInt(extractField('mana') || '', 10) || null,
      mana_regen: parseInt(extractField('manareg') || '', 10) || null,
      physical_attack: parseInt(extractField('phyatk') || '', 10) || null,
      physical_defense: parseInt(extractField('phydef') || '', 10) || null,
      magic_power: parseInt(extractField('mp') || '', 10) || parseInt(extractField('magicpower') || '', 10) || 0,
      magic_defense: parseInt(extractField('magdef') || '', 10) || null,
      attack_speed: extractField('atkspeed') || null,
      movement_speed: parseInt(extractField('movespeed') || '', 10) || null,
    }
  };
}

function parseSkills(wt: string) {
  const result: Record<string, {
    name: string;
    description: string;
    cooldown: string;
    manaCost: string;
    damageType: string;
    scaling: string[];
    scalingTable: Array<{label: string; values: string[]}>;
    crowdControlType: string[];
    strategicTags: string[];
    iconName: string;
    iconUrl: string;
    variant: string;
    comboUsage: string;
    strategicPurpose: string;
  }> = {};

  // Find all AbilityCard blocks — handle nested braces properly
  const cardStarts: number[] = [];
  const marker = '{{AbilityCard';
  let searchFrom = 0;
  while (true) {
    const idx = wt.indexOf(marker, searchFrom);
    if (idx === -1) break;
    cardStarts.push(idx);
    searchFrom = idx + marker.length;
  }

  const cards: string[] = [];
  for (const start of cardStarts) {
    let braceCount = 0;
    let end = -1;
    for (let i = start; i < wt.length; i++) {
      if (wt.slice(i, i + 2) === '{{') { braceCount++; i++; }
      else if (wt.slice(i, i + 2) === '}}') {
        braceCount--;
        if (braceCount === 0) { end = i + 2; break; }
        i++;
      }
    }
    if (end > start) {
      cards.push(wt.substring(start + marker.length, end - 2));
    }
  }
  
  const getField = (cardWt: string, key: string): string => {
    // Match field that may span to end of line (before next |field= or end)
    const regex = new RegExp(`\\|${key}\\s*=\\s*([^\\n]*(?:\\n(?!\\|\\w).*)*)`);
    const m = cardWt.match(regex);
    return m ? m[1].trim() : "";
  };
  
  const getDesc = (cardWt: string): string => {
    // Match desc field — capture everything until next top-level field (including stats fields) or end
    const m = cardWt.match(/\|desc\s*=([\s\S]*?)(?=\n\|(?:scale|tags|vamp|cd|mana|cooldown|manacost|type|name|stats\d|hero|icon|attackeffects)\s*=|$)/i);
    let desc = m ? m[1].trim() : "";
    // Strip any remaining |stats lines that might have been captured
    desc = desc.replace(/\|stats\d+[^\n]*/g, '').trim();
    return desc;
  };

  let skillIdx = 0;
  for (const cardWt of cards) {
    const rawName = getField(cardWt, 'name');
    if (!rawName) continue;
    const name = cleanWikitext(rawName);

    const rawDesc = getDesc(cardWt);
    const description = cleanWikitext(rawDesc);

    const type = cleanWikitext(getField(cardWt, 'type'));
    const cd = cleanWikitext(getField(cardWt, 'cd') || getField(cardWt, 'cooldown')).replace(/<[^>]*>/g, '').trim();
    const mana = cleanWikitext(getField(cardWt, 'mana') || getField(cardWt, 'manacost')).replace(/<[^>]*>/g, '').trim();

    // Extract icon name from |icon= field
    const iconName = getField(cardWt, 'icon').replace(/[[\]]/g, '').trim();
    const heroField = getField(cardWt, 'hero').trim();

    // Extract scaling table
    const scalingTable = extractScalingTable(cardWt);

    // Detect damage type
    const damageType = detectDamageType(description, type);

    // Extract damage scaling from description
    const damageScaling = extractDamageScaling(description);

    // Extract strategic tags from type field and dedicated tags field
    const rawTags = getField(cardWt, 'tags') || type;
    const strategicTags = extractStrategicTags(rawTags, description);

    // Determine key — handle duplicate names (variants like Beatrix weapons)
    let key: string;
    if (skillIdx === 0) key = 'passive';
    else if (skillIdx === 1) key = 'skill1';
    else if (skillIdx === 2) key = 'skill2';
    else if (skillIdx === 3) key = 'ultimate';
    else key = `extra${skillIdx - 3}`;
    skillIdx++;

    // Build icon URL from Liquipedia CDN pattern
    const iconSlug = iconName ? iconName.replace(/\s+/g, '_') : name.replace(/\s+/g, '_');
    const iconUrl = iconSlug ? `/raw-assets/skill_icons/${heroField.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'unknown'}/${iconSlug.toLowerCase().replace(/[^a-z0-9_]+/g, '')}.png` : "";

    result[key] = {
      name,
      description,
      cooldown: cd || "0",
      manaCost: mana || "0",
      damageType,
      scaling: damageScaling.length > 0 ? damageScaling : ["None"],
      scalingTable,
      crowdControlType: strategicTags.filter(t => t === "CC" || t === "Slow"),
      strategicTags,
      iconName: iconSlug,
      iconUrl,
      variant: "",
      comboUsage: "",
      strategicPurpose: "",
    };
  }

  return result;
}

function parseHeroWikitext(wikitext: string, heroName: string): any {
  let wt = wikitext;
  const redirectMatch = wt.match(/#REDIRECT\s*\[\[([^\]]+)\]\]/i);
  // Simple check — we fetch top page directly, but in case there is a tiny redirect, use original wikitext or return null
  const infobox = parseInfobox(wt, heroName);
  if (!infobox) return null;
  return {
    ...infobox,
    skills: parseSkills(wt)
  };
}
