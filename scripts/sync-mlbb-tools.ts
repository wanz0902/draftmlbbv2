/**
 * Sync hero meta data from mlbb.tools (Playwright rendered mode).
 * V2: Complete re-scrape with all sections including combos, skill priority,
 * connections, power curve text, base stats, synergy %, region/race, title.
 *
 * Run: npx tsx scripts/sync-mlbb-tools.ts [--test|--full]
 */
import fs from 'fs';
import path from 'path';
import { chromium, Page } from 'playwright';

const ROOT = process.cwd();
const HERO_DIR = path.join(ROOT, 'data', 'heroes');
const REPORT_DIR = path.join(ROOT, 'reports');
const RATE_LIMIT_MS = 2000;
const MODE = process.argv.includes('--test') ? 'test' : 'full';

interface LogEntry { hero: string; status: 'OK' | 'PARTIAL' | 'FAILED'; message: string; }
const logs: LogEntry[] = [];

function sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }
function slugToId(slug: string): string { return slug.replace(/-/g, '').toLowerCase(); }

function readHeroJson(id: string): Record<string, any> | null {
  const fp = path.join(HERO_DIR, `${id}.json`);
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf-8'));
}
function writeHeroJson(id: string, data: Record<string, any>): void {
  const fp = path.join(HERO_DIR, `${id}.json`);
  const content = JSON.stringify(data, null, 2) + '\n';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      fs.writeFileSync(fp, content, 'utf-8');
      return;
    } catch (e: any) {
      if (attempt < 2) {
        console.log(`[RETRY] Write failed for ${id}, attempt ${attempt + 1}: ${e.message}`);
        const start = Date.now();
        while (Date.now() - start < 1000) {}
      } else {
        throw e;
      }
    }
  }
}

const SLUG_OVERRIDES: Record<string, string> = {
  'yi-sun-shin': 'yisunshin', 'popol-and-kupa': 'popolandkupa', 'luo-yi': 'luoyi',
  'x-borg': 'xborg', 'lapu-lapu': 'lapulapu', 'yu-zhong': 'yuzhong', 'change': 'change',
};
function slugToFileId(slug: string): string { return SLUG_OVERRIDES[slug] || slug.replace(/-/g, '').toLowerCase(); }

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/<!--\s*-->/g, '').replace(/\s+/g, ' ').trim();
}

function parseHeroPageHtml(html: string): Record<string, any> {
  const r: Record<string, any> = {};

  // === Meta Stats ===
  const metaSection = html.indexOf('Meta Stats</h2>');
  if (metaSection > 0) {
    const section = html.substring(metaSection, metaSection + 2000);
    const wrM = section.match(/([\d.]+)%<\/p>\s*<p[^>]*>Win Rate/);
    if (wrM) r.winRate = parseFloat(wrM[1]);
    const prM = section.match(/([\d.]+)%<\/p>\s*<p[^>]*>Pick Rate/);
    if (prM) r.pickRate = parseFloat(prM[1]);
    const brM = section.match(/([\d.]+)%<\/p>\s*<p[^>]*>Ban Rate/);
    if (brM) r.banRate = parseFloat(brM[1]);
  }

  // === Hero Attributes ===
  const attrMatch = html.match(/aria-label="Hero attributes:\s*Durability\s+(\d+),\s*Offense\s+(\d+),\s*Ability Effects\s+(\d+),\s*Difficulty\s+(\d+)"/i);
  if (attrMatch) {
    r.heroAttributes = {
      durability: parseInt(attrMatch[1]), offense: parseInt(attrMatch[2]),
      abilityEffects: parseInt(attrMatch[3]), difficulty: parseInt(attrMatch[4]),
    };
  }

  // === Base Stats ===
  const bsIdx = html.indexOf('Base Stats</h2>');
  if (bsIdx > 0) {
    const bsSection = html.substring(bsIdx, bsIdx + 5000);
    const statMap: Record<string, string> = {
      'HP': 'hp', 'HP Regen': 'hpRegen', 'Mana': 'mana', 'Mana Regen': 'manaRegen',
      'Physical ATK': 'physicalAttack', 'Physical DEF': 'physicalDefense',
      'Magic ATK': 'magicPower', 'Magic DEF': 'magicDefense',
      'Attack Speed': 'attackSpeed', 'Movement Speed': 'movementSpeed',
    };
    const baseStats: Record<string, any> = {};
    for (const [label, field] of Object.entries(statMap)) {
      const re = new RegExp(`>${label}</span><span[^>]*>([^<]+)</span>`);
      const m = bsSection.match(re);
      if (m) {
        const val = m[1].trim();
        baseStats[field] = field === 'attackSpeed' ? val : parseFloat(val) || val;
      }
    }
    if (Object.keys(baseStats).length > 0) r.baseStats = baseStats;
  }

  // === Strong Against ===
  const strongIdx = html.indexOf('Strong Against</h4>');
  if (strongIdx > 0) {
    const endIdx = html.indexOf('Weak Against</h4>', strongIdx);
    const section = html.substring(strongIdx, endIdx > 0 ? endIdx : strongIdx + 5000);
    const strong: { name: string; advantage: number }[] = [];
    const re = /href="\/heroes\/([a-z0-9-]+)"[\s\S]*?<span[^>]*>([^<]+)<\/span><span[^>]*font-mono[^>]*>([+-]?[\d.]+)%<\/span>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(section)) !== null) {
      strong.push({ name: m[2].trim(), advantage: Math.abs(parseFloat(m[3])) });
    }
    if (strong.length) r.strongAgainst = strong;
  }

  // === Weak Against ===
  const weakIdx = html.indexOf('Weak Against</h4>');
  if (weakIdx > 0) {
    const synCheck = html.indexOf('Best With</h2>', weakIdx);
    const buildCheck = html.indexOf('Pro Builds</h2>', weakIdx);
    const endIdx = synCheck > 0 ? synCheck : (buildCheck > 0 ? buildCheck : weakIdx + 5000);
    const section = html.substring(weakIdx, endIdx);
    const weak: { name: string; advantage: number }[] = [];
    const re = /href="\/heroes\/([a-z0-9-]+)"[\s\S]*?<span[^>]*>([^<]+)<\/span><span[^>]*font-mono[^>]*>([+-]?[\d.]+)%<\/span>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(section)) !== null) {
      weak.push({ name: m[2].trim(), advantage: Math.abs(parseFloat(m[3])) });
    }
    if (weak.length) r.weakAgainst = weak;
  }

  // === Best With (Synergy) with actual % ===
  const synIdx = html.indexOf('Best With</h2>');
  if (synIdx > 0) {
    const synSection = html.substring(synIdx, synIdx + 5000);
    const syn: { name: string; synergy: number }[] = [];
    const re = /href="\/heroes\/([a-z0-9-]+)"[\s\S]*?<span[^>]*>([^<]+)<\/span><span[^>]*font-mono[^>]*>\+<!-- -->([\d.]+)<!-- -->%<\/span>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(synSection)) !== null) {
      syn.push({ name: m[2].trim(), synergy: parseFloat(m[3]) });
    }
    if (syn.length === 0) {
      const re2 = /href="\/heroes\/([a-z0-9-]+)"[\s\S]*?<span[^>]*>([^<]+)<\/span><span[^>]*font-mono[^>]*>\+([\d.]+)%<\/span>/g;
      while ((m = re2.exec(synSection)) !== null) {
        syn.push({ name: m[2].trim(), synergy: parseFloat(m[3]) });
      }
    }
    if (syn.length) r.synergyHeroes = syn;
  }

  // === Pro Builds ===
  const buildIdx = html.indexOf('Pro Builds</h2>');
  if (buildIdx > 0) {
    const builds: { player: string; games: number; items: string[] }[] = [];
    const buildSection = html.substring(buildIdx, buildIdx + 15000);
    const buildCards = buildSection.split('clip-path:polygon(0 0');
    for (let i = 1; i < Math.min(buildCards.length, 4); i++) {
      const card = buildCards[i];
      const nameMatch = card.match(/truncate[^>]*>([^<]+)<\/span>/);
      const gamesMatch = card.match(/([\d,]+)<!-- --> games/);
      const items: string[] = [];
      const itemRe = /title="([^"]+)"/g;
      let im: RegExpExecArray | null;
      while ((im = itemRe.exec(card)) !== null) {
        if (!items.includes(im[1])) items.push(im[1]);
      }
      if (nameMatch && items.length > 0) {
        builds.push({
          player: nameMatch[1].trim(),
          games: gamesMatch ? parseInt(gamesMatch[1].replace(/,/g, '')) : 0,
          items,
        });
      }
    }
    if (builds.length) r.proBuilds = builds;
  }

  // === Power Curve (from TEXT, not SVG) ===
  const pcIdx = html.indexOf('Power Curve</h2>');
  if (pcIdx > 0) {
    const pcSection = html.substring(pcIdx, pcIdx + 6000);
    // Match: 38<!-- -->%</text>...EARLY</text>
    const earlyM = pcSection.match(/(\d+)<!-- -->%<\/text><text[^>]*>EARLY/);
    const midM = pcSection.match(/(\d+)<!-- -->%<\/text><text[^>]*>MID/);
    const lateM = pcSection.match(/(\d+)<!-- -->%<\/text><text[^>]*>LATE/);
    if (earlyM && midM && lateM) {
      r.powerCurve = {
        early: parseInt(earlyM[1]),
        mid: parseInt(midM[1]),
        late: parseInt(lateM[1]),
      };
    }

    // Dominant phase badge
    const phaseM = pcSection.match(/>(Early Game|Mid Game|Late Game)</i);
    if (phaseM) r.powerCurveDominantPhase = phaseM[1];

    // Spikes: Spikes:<!-- --> <span class="font-bold text-text-secondary">Lv 4, Lv 8, Lv 12</span>
    const spikesM = pcSection.match(/Spikes:<!-- --> <span[^>]*>([^<]+)<\/span>/);
    if (spikesM) {
      r.powerCurveSpikeLevels = spikesM[1].split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    // Core items: Core items:<!-- --> <span class="font-medium text-text-secondary">...</span>
    const coreM = pcSection.match(/Core items:<!-- --> <span[^>]*>([^<]+)<\/span>/);
    if (coreM) {
      r.powerCurveCoreItems = coreM[1].split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    // Description
    const descM = pcSection.match(/<p[^>]*class="[^"]*italic[^"]*"[^>]*>([^<]+)<\/p>/);
    if (descM) r.powerCurveDescription = descM[1].trim();
  }

  // === Combos ===
  const cbIdx = html.indexOf('Combos</h2>');
  if (cbIdx > 0) {
    const cbSection = html.substring(cbIdx, cbIdx + 8000);
    const combos: { name: string; sequence: string[]; description: string }[] = [];
    const comboCards = cbSection.split('clip-path:polygon(0 0');
    for (let i = 1; i < comboCards.length; i++) {
      const card = comboCards[i];
      const nameM = card.match(/">(LANING|TEAMFIGHT|GANK|OBJECTIVE|DEFENSE|GENERAL)<\/span>/i);
      if (!nameM) continue;
      const comboName = nameM[1].toUpperCase();
      const skills: string[] = [];
      const skillRe = /alt="(Skill \d|Passive|Ultimate)"/g;
      let sm: RegExpExecArray | null;
      while ((sm = skillRe.exec(card)) !== null) {
        skills.push(sm[1]);
      }
      const descM = card.match(/<p[^>]*class="[^"]*text-text-secondary[^"]*"[^>]*>([^<]+)<\/p>/);
      const desc = descM ? descM[1].trim() : '';
      if (skills.length > 0) {
        combos.push({ name: comboName, sequence: skills, description: desc });
      }
    }
    if (combos.length) r.combos = combos;
  }

  // === Skill Level Priority ===
  const spIdx = html.indexOf('Skill Level Priority</h2>');
  if (spIdx > 0) {
    const spSection = html.substring(spIdx, spIdx + 3000);
    const order: string[] = [];
    const skillRe = /alt="([^"]+)"[\s\S]*?<span[^>]*>([^<]+)<\/span>/g;
    let sm: RegExpExecArray | null;
    while ((sm = skillRe.exec(spSection)) !== null) {
      const name = sm[2].trim();
      if (name && !order.includes(name)) order.push(name);
    }
    if (order.length) r.skillLevelPriority = { order };

    const altM = spSection.match(/Alt:<\/span>\s*(?:<!-- -->)?\s*(?:<!-- -->)?\s*([^<]+)<\/p>/);
    if (altM && r.skillLevelPriority) {
      r.skillLevelPriority.altNote = altM[1].trim();
    }
  }

  // === Connections ===
  const cnIdx = html.indexOf('Connections</h2>');
  if (cnIdx > 0) {
    const cnSection = html.substring(cnIdx, cnIdx + 8000);
    const connections: { name: string; relationship: string }[] = [];
    const relRe = /href="\/heroes\/([a-z0-9-]+)"[\s\S]*?<span[^>]*>([^<]+)<\/span><span[^>]*>([^<]+)<\/span>/g;
    let cm: RegExpExecArray | null;
    while ((cm = relRe.exec(cnSection)) !== null) {
      const name = cm[2].trim();
      const rel = cm[3].trim().toUpperCase();
      if (name && rel && !connections.find(c => c.name === name)) {
        connections.push({ name, relationship: rel });
      }
    }
    if (connections.length) r.connections = connections;
  }

  // === Difficulty Label ===
  const diffM = html.match(/Difficulty:<!-- --> <span[^>]*>(Easy|Medium|Hard|Very Hard|Very Easy)<\/span>/i);
  if (diffM) r.difficultyLabel = diffM[1];

  // === Specialty (from header badges) ===
  const specRe = /bg-\[#c084fc\]\/10 text-\[#c084fc\][^>]*>([^<]+)<\/span>/g;
  const specs: string[] = [];
  let spm: RegExpExecArray | null;
  while ((spm = specRe.exec(html)) !== null) {
    const s = spm[1].trim();
    if (s && !specs.includes(s)) specs.push(s);
  }
  if (specs.length) r.specialtyFromMlbb = specs;

  // === Region & Race (from header links) ===
  const raceM = html.match(/href="\/lore\/races#([^"]+)"[\s\S]*?<span[^>]*>([^<]+)<\/span>/);
  if (raceM) {
    r.race = raceM[2].trim();
    r.raceSlug = raceM[1];
  }
  // Region: /lore/regions/azrya-woodlands
  const regionM = html.match(/href="\/lore\/regions\/([^"]+)"[\s\S]*?<span[^>]*>([^<]+)<\/span>/);
  if (regionM) r.region = regionM[2].trim();

  // === Matchup explanation text (from tooltips or sections) ===
  const strongReasonIdx = html.indexOf('Strong Against</h4>');
  if (strongReasonIdx > 0) {
    const reasonSection = html.substring(strongReasonIdx, strongReasonIdx + 5000);
    const reasonM = reasonSection.match(/<p[^>]*class="[^"]*text-text-muted[^"]*"[^>]*>([^<]{20,})<\/p>/);
    if (reasonM) r.strongAgainstReason = reasonM[1].trim();
  }

  const weakReasonIdx = html.indexOf('Weak Against</h4>');
  if (weakReasonIdx > 0) {
    const reasonSection = html.substring(weakReasonIdx, weakReasonIdx + 5000);
    const reasonM = reasonSection.match(/<p[^>]*class="[^"]*text-text-muted[^"]*"[^>]*>([^<]{20,})<\/p>/);
    if (reasonM) r.weakAgainstReason = reasonM[1].trim();
  }

  const synReasonIdx = html.indexOf('Best With</h2>');
  if (synReasonIdx > 0) {
    const reasonSection = html.substring(synReasonIdx, synReasonIdx + 5000);
    const reasonM = reasonSection.match(/<p[^>]*class="[^"]*text-text-muted[^"]*"[^>]*>([^<]{20,})<\/p>/);
    if (reasonM) r.synergyReason = reasonM[1].trim();
  }

  return r;
}

async function extractBulk(page: Page): Promise<Record<string, any>> {
  console.log('[INFO] Loading heroes list page...');
  let rscBody = '';
  page.on('response', async (resp) => {
    try {
      const url = resp.url();
      if (url.includes('/heroes') && url.includes('_rsc') && !url.includes('/heroes/')) {
        const body = await resp.text();
        if (body.length > rscBody.length) rscBody = body;
      }
    } catch {}
  });
  await page.goto('https://mlbb.tools/heroes/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(10000);
  if (rscBody.length > 1000) {
    console.log(`[INFO] RSC payload: ${rscBody.length} bytes`);
    return parseRscHeroes(rscBody);
  }
  return {};
}

function parseRscHeroes(body: string): Record<string, any> {
  const result: Record<string, any> = {};
  try {
    const heroPattern = /\{"id":"[^"]+","slug":"([^"]+)","name":"([^"]+)"[^}]*?"statsMap":\{([^}]+)\}/g;
    let m: RegExpExecArray | null;
    while ((m = heroPattern.exec(body)) !== null) {
      const slug = m[1];
      const name = m[2];
      const statsRaw = m[3];
      const allMatch = statsRaw.match(/"all":\{"winRate":([\d.]+),"pickRate":([\d.]+),"banRate":([\d.]+)/);
      const gloryMatch = statsRaw.match(/"glory":\{"winRate":([\d.]+),"pickRate":([\d.]+),"banRate":([\d.]+)/);
      const stats = allMatch || gloryMatch;
      result[slug] = {
        slug, name,
        winRate: stats ? parseFloat(stats[1]) * 100 : 0,
        pickRate: stats ? parseFloat(stats[2]) * 100 : 0,
        banRate: stats ? parseFloat(stats[3]) * 100 : 0,
      };
    }
  } catch {}
  return result;
}

function deepMerge(target: Record<string, any>, source: Record<string, any>): void {
  for (const [k, v] of Object.entries(source)) {
    if (k === 'id' || k === 'name' || k === 'heroName' || k === 'skills') continue;
    if (v === null || v === undefined) continue;
    if (typeof v === 'object' && !Array.isArray(v) && v !== null) {
      target[k] = { ...(target[k] || {}), ...v };
      for (const [sk, sv] of Object.entries(v)) {
        if (sv === null || sv === undefined || (Array.isArray(sv) && sv.length === 0)) continue;
        target[k][sk] = sv;
      }
    } else if (Array.isArray(v)) {
      if (v.length > 0) target[k] = v;
    } else if (v !== '' && v !== 0) {
      target[k] = v;
    }
  }
}

async function main() {
  console.log(`[START] mlbb.tools sync v2 — mode: ${MODE}`);
  const heroFiles = fs.readdirSync(HERO_DIR).filter(f => f.endsWith('.json'));
  console.log(`[INFO] Found ${heroFiles.length} hero files`);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  });
  const page = await ctx.newPage();

  let bulkData: Record<string, any> = {};
  try { bulkData = await extractBulk(page); } catch (e: any) { console.error(`[WARN] Bulk failed: ${e.message}`); }
  console.log(`[INFO] Bulk: ${Object.keys(bulkData).length} heroes`);

  const slugToName: Record<string, string> = {};
  for (const [k, v] of Object.entries(bulkData)) slugToName[k] = (v as any)?.name || k;

  const fileIdToSlug: Record<string, string> = {};
  for (const file of heroFiles) {
    const id = file.replace('.json', '');
    let slug = id;
    for (const [s] of Object.entries(slugToName)) { if (slugToId(s) === id) { slug = s; break; } }
    fileIdToSlug[id] = slug;
  }

  const toProcess = MODE === 'test' ? ['miya', 'ling', 'fanny'] : heroFiles.map(f => f.replace('.json', ''));
  console.log(`[INFO] Processing ${toProcess.length} heroes`);

  let successCount = 0, partialCount = 0, failedCount = 0;
  const partialList: { name: string; missing: string; reason: string }[] = [];
  const failedList: { name: string; error: string }[] = [];

  const fieldCounts: Record<string, number> = {
    baseStats: 0, powerCurve: 0, combos: 0, skillLevelPriority: 0,
    connections: 0, synergyHeroes: 0, strongAgainst: 0, weakAgainst: 0,
    proBuilds: 0, heroAttributes: 0, winRate: 0, difficultyLabel: 0,
    region: 0, race: 0, powerCurveDominantPhase: 0, powerCurveSpikeLevels: 0,
    powerCurveCoreItems: 0, strongAgainstReason: 0, weakAgainstReason: 0,
    synergyReason: 0,
  };

  for (let i = 0; i < toProcess.length; i++) {
    const fileId = toProcess[i];
    const slug = fileIdToSlug[fileId] || fileId;
    const heroName = slugToName[slug] || bulkData[slug]?.name || fileId;
    const existing = readHeroJson(fileId);
    if (!existing) { console.log(`[${i+1}/${toProcess.length}] [FAILED] ${heroName} — no file`); failedList.push({ name: heroName, error: 'File not found' }); failedCount++; continue; }

    const bulkHero = bulkData[slug] || bulkData[fileId] || null;
    let htmlData: Record<string, any> = {};
    try {
      await page.goto(`https://mlbb.tools/heroes/${slug}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(12000);
      const html = await page.content();
      htmlData = parseHeroPageHtml(html);
    } catch (e: any) { console.log(`[${i+1}/${toProcess.length}] [WARN] Page failed: ${e.message}`); }

    // Build merge object
    const merge: Record<string, any> = { metaSource: 'mlbb.tools', metaUpdatedAt: new Date().toISOString().split('T')[0] };

    // Meta stats
    const wr = htmlData.winRate || bulkHero?.winRate;
    const pr = htmlData.pickRate || bulkHero?.pickRate;
    const br = htmlData.banRate || bulkHero?.banRate;
    if (wr && wr > 0) merge.winRate = Math.round(wr * 10) / 10;
    if (pr && pr > 0) merge.pickRate = Math.round(pr * 10) / 10;
    if (br && br >= 0) merge.banRate = Math.round(br * 10) / 10;

    // Counters
    const strongFrom = htmlData.strongAgainst || bulkHero?.counters?.strongAgainst || [];
    const weakFrom = htmlData.weakAgainst || bulkHero?.counters?.weakAgainst || [];
    if (strongFrom.length > 0) {
      merge.matchupSystem = merge.matchupSystem || {};
      merge.matchupSystem.strongAgainst = strongFrom.map((c: any) => ({
        name: c.heroName || c.name || String(c),
        advantage: typeof c.advantage === 'number' ? c.advantage : (typeof c.winRate === 'number' ? Math.round(c.winRate - 50) : 5),
      }));
    }
    if (weakFrom.length > 0) {
      merge.matchupSystem = merge.matchupSystem || {};
      merge.matchupSystem.weakAgainst = weakFrom.map((c: any) => ({
        name: c.heroName || c.name || String(c),
        advantage: typeof c.advantage === 'number' ? c.advantage : (typeof c.winRate === 'number' ? Math.round(50 - c.winRate) : 5),
      }));
    }

    // Synergy with actual %
    const synFrom = htmlData.synergyHeroes || bulkHero?.synergies || [];
    if (synFrom.length > 0) {
      merge.matchupSystem = merge.matchupSystem || {};
      merge.matchupSystem.synergyHeroes = synFrom.map((s: any) => ({
        name: s.heroName || s.name || String(s),
        synergy: typeof s.synergy === 'number' ? s.synergy : (typeof s.synergyScore === 'number' ? s.synergyScore : 5),
      }));
    }

    // Matchup explanation text
    if (htmlData.strongAgainstReason) {
      merge.matchupSystem = merge.matchupSystem || {};
      merge.matchupSystem.strongAgainstReason = htmlData.strongAgainstReason;
    }
    if (htmlData.weakAgainstReason) {
      merge.matchupSystem = merge.matchupSystem || {};
      merge.matchupSystem.weakAgainstReason = htmlData.weakAgainstReason;
    }
    if (htmlData.synergyReason) {
      merge.matchupSystem = merge.matchupSystem || {};
      merge.matchupSystem.synergyReason = htmlData.synergyReason;
    }

    // Hero attributes
    if (htmlData.heroAttributes) merge.heroAttributes = htmlData.heroAttributes;

    // Base stats
    if (htmlData.baseStats) merge.baseStats = htmlData.baseStats;

    // Power curve (from text)
    if (htmlData.powerCurve) {
      merge.powerCurve = {
        early: htmlData.powerCurve.early,
        mid: htmlData.powerCurve.mid,
        late: htmlData.powerCurve.late,
        spikeLevels: htmlData.powerCurveSpikeLevels || existing.powerCurve?.spikeLevels || [],
        coreItems: htmlData.powerCurveCoreItems || existing.powerCurve?.coreItems || [],
        dominantPhase: htmlData.powerCurveDominantPhase || existing.powerCurve?.dominantPhase || null,
        description: htmlData.powerCurveDescription || existing.powerCurve?.description || null,
      };
    }

    // Combos
    if (htmlData.combos) merge.combos = htmlData.combos;

    // Skill level priority
    if (htmlData.skillLevelPriority) merge.skillLevelPriority = htmlData.skillLevelPriority;

    // Connections
    if (htmlData.connections) merge.connections = htmlData.connections;

    // Pro builds
    if (htmlData.proBuilds?.length) merge.proBuilds = htmlData.proBuilds;

    // Difficulty label
    if (htmlData.difficultyLabel) merge.difficultyLabel = htmlData.difficultyLabel;

    // Region & Race
    if (htmlData.region) merge.region = htmlData.region;
    if (htmlData.race) merge.race = htmlData.race;

    // Specialty (update only if different)
    if (htmlData.specialtyFromMlbb?.length) merge.specialty = htmlData.specialtyFromMlbb;

    // Video placeholders
    merge.videoUrl = existing.videoUrl ?? null;
    merge.skillVideos = existing.skillVideos ?? { passive: null, skill1: null, skill2: null, ultimate: null };

    // Deep merge into existing
    deepMerge(existing, merge);

    // Sync strategicData.counterSystem
    if (merge.matchupSystem?.strongAgainst) {
      existing.strategicData = existing.strategicData || {};
      existing.strategicData.counterSystem = existing.strategicData.counterSystem || {};
      existing.strategicData.counterSystem.strongAgainst = merge.matchupSystem.strongAgainst.map((c: any) => c.name);
    }
    if (merge.matchupSystem?.weakAgainst) {
      existing.strategicData = existing.strategicData || {};
      existing.strategicData.counterSystem = existing.strategicData.counterSystem || {};
      existing.strategicData.counterSystem.weakAgainst = merge.matchupSystem.weakAgainst.map((c: any) => c.name);
    }
    if (merge.matchupSystem?.synergyHeroes) {
      existing.strategicData = existing.strategicData || {};
      existing.strategicData.counterSystem = existing.strategicData.counterSystem || {};
      existing.strategicData.counterSystem.synergyWith = merge.matchupSystem.synergyHeroes.map((c: any) => c.name);
    }

    writeHeroJson(fileId, existing);

    // Count fields
    if (existing.baseStats?.hp) fieldCounts.baseStats++;
    if (existing.powerCurve?.early) fieldCounts.powerCurve++;
    if (existing.combos?.length) fieldCounts.combos++;
    if (existing.skillLevelPriority?.order?.length) fieldCounts.skillLevelPriority++;
    if (existing.connections?.length) fieldCounts.connections++;
    if (existing.matchupSystem?.synergyHeroes?.length) fieldCounts.synergyHeroes++;
    if (existing.matchupSystem?.strongAgainst?.length) fieldCounts.strongAgainst++;
    if (existing.matchupSystem?.weakAgainst?.length) fieldCounts.weakAgainst++;
    if (existing.proBuilds?.length) fieldCounts.proBuilds++;
    if (existing.heroAttributes) fieldCounts.heroAttributes++;
    if (existing.winRate) fieldCounts.winRate++;
    if (existing.difficultyLabel) fieldCounts.difficultyLabel++;
    if (existing.region) fieldCounts.region++;
    if (existing.race) fieldCounts.race++;
    if (existing.powerCurve?.dominantPhase) fieldCounts.powerCurveDominantPhase++;
    if (existing.powerCurve?.spikeLevels?.length) fieldCounts.powerCurveSpikeLevels++;
    if (existing.powerCurve?.coreItems?.length) fieldCounts.powerCurveCoreItems++;
    if (existing.matchupSystem?.strongAgainstReason) fieldCounts.strongAgainstReason++;
    if (existing.matchupSystem?.weakAgainstReason) fieldCounts.weakAgainstReason++;
    if (existing.matchupSystem?.synergyReason) fieldCounts.synergyReason++;

    const sc = existing.matchupSystem?.strongAgainst?.length || 0;
    const wc = existing.matchupSystem?.weakAgainst?.length || 0;
    const sy = existing.matchupSystem?.synergyHeroes?.length || 0;
    const comboCount = existing.combos?.length || 0;
    const connCount = existing.connections?.length || 0;
    const spOrder = existing.skillLevelPriority?.order?.length || 0;

    const missing: string[] = [];
    if (!existing.baseStats?.hp) missing.push('baseStats');
    if (!existing.powerCurve?.early) missing.push('powerCurve');
    if (!existing.combos?.length) missing.push('combos');
    if (!existing.connections?.length) missing.push('connections');
    if (!existing.matchupSystem?.synergyHeroes?.length) missing.push('synergy');
    // skillLevelPriority is optional — not all heroes have this section

    if (missing.length === 0) {
      console.log(`[${i+1}/${toProcess.length}] [OK] ${heroName} — ${sc}/${wc} counters, ${sy} syn, ${comboCount} combos, ${connCount} conn, sp:${spOrder}`);
      logs.push({ hero: heroName, status: 'OK', message: `${sc}+${wc} counters, ${sy} syn, ${comboCount} combos` });
      successCount++;
    } else {
      console.log(`[${i+1}/${toProcess.length}] [PARTIAL] ${heroName} — missing: ${missing.join(', ')}`);
      logs.push({ hero: heroName, status: 'PARTIAL', message: `missing: ${missing.join(', ')}` });
      partialCount++;
      partialList.push({ name: heroName, missing: missing.join(', '), reason: 'Data not available on mlbb.tools or parse failed' });
    }

    if (i < toProcess.length - 1) await sleep(RATE_LIMIT_MS);
  }

  await browser.close();

  if (MODE === 'test') {
    console.log(`\n[TEST COMPLETE] ${successCount} OK, ${partialCount} partial, ${failedCount} failed`);
    console.log('\nField counts:', JSON.stringify(fieldCounts, null, 2));
    return;
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  let report = `# mlbb.tools Sync Report V2 — ${dateStr}\n\n`;
  report += `## Summary\n- Total heroes processed: ${toProcess.length}\n- Full success: ${successCount}\n- Partial success: ${partialCount}\n- Failed: ${failedCount}\n\n`;
  report += `## Field Coverage\n`;
  for (const [field, count] of Object.entries(fieldCounts)) {
    report += `- ${field}: ${count}/${heroFiles.length} heroes\n`;
  }
  report += `\n## Full Success (${successCount} heroes)\n${logs.filter(l => l.status === 'OK').map(l => l.hero).join(', ')}\n\n`;
  report += `## Partial Success (${partialCount} heroes)\n`;
  if (partialList.length) {
    report += `| Hero | Missing Fields | Reason |\n|------|---------------|--------|\n`;
    partialList.forEach(p => report += `| ${p.name} | ${p.missing} | ${p.reason} |\n`);
  } else report += `None\n`;
  report += `\n## Failed (${failedCount} heroes)\n`;
  if (failedList.length) {
    report += `| Hero | Error |\n|------|-------|\n`;
    failedList.forEach(f => report += `| ${f.name} | ${f.error} |\n`);
  } else report += `None\n`;
  report += `\n## VIDEO STATUS\nAll heroes have skillVideos field set to null.\nUser needs to manually upload videos to: /public/videos/heroes/{heroId}/\nExpected files: passive.mp4, skill1.mp4, skill2.mp4, ultimate.mp4\n`;

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(path.join(REPORT_DIR, 'sync-mlbb-tools-report.md'), report, 'utf-8');
  const archiveDir = path.join(REPORT_DIR, 'archive');
  fs.mkdirSync(archiveDir, { recursive: true });
  const ts = `${dateStr}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  fs.writeFileSync(path.join(archiveDir, `sync-mlbb-tools-${ts}.md`), report, 'utf-8');
  console.log(`\n[DONE] Report: reports/sync-mlbb-tools-report.md`);
  console.log(`[DONE] ${successCount}/${heroFiles.length} OK, ${partialCount} partial, ${failedCount} failed`);
}

main().catch(err => { console.error('[FATAL]', err); process.exit(1); });
