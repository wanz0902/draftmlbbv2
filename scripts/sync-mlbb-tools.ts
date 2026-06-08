/**
 * Sync hero meta data from mlbb.tools (Playwright rendered mode).
 *
 * Strategy:
 * 1. Intercept RSC payload on /heroes/ list page → parse hero slugs + meta stats
 * 2. For each hero, parse rendered HTML (no page.evaluate — avoids Turbopack conflict)
 * 3. MERGE into existing data/heroes/{id}.json
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
  fs.writeFileSync(path.join(HERO_DIR, `${id}.json`), JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

const SLUG_OVERRIDES: Record<string, string> = {
  'yi-sun-shin': 'yisunshin', 'popol-and-kupa': 'popolandkupa', 'luo-yi': 'luoyi',
  'x-borg': 'xborg', 'lapu-lapu': 'lapulapu', 'yu-zhong': 'yuzhong', 'change': 'change',
};
function slugToFileId(slug: string): string { return SLUG_OVERRIDES[slug] || slug.replace(/-/g, '').toLowerCase(); }

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

function parseHeroPageHtml(html: string): Record<string, any> {
  const r: Record<string, any> = {};

  const metaMatch = html.match(/Win Rate<\/p><\/div>[\s\S]*?<\/div><div[\s\S]*?<\/div><div[\s\S]*?Pick Rate<\/p>/);
  if (!metaMatch) {
    const wrMatch = html.match(/<p[^>]*font-mono[^>]*>([\d.]+)%<\/p>\s*<p[^>]*>Win Rate<\/p>/i);
    if (wrMatch) r.winRate = parseFloat(wrMatch[1]);
    const prMatch = html.match(/<p[^>]*font-mono[^>]*>([\d.]+)%<\/p>\s*<p[^>]*>Pick Rate<\/p>/i);
    if (prMatch) r.pickRate = parseFloat(prMatch[1]);
    const brMatch = html.match(/<p[^>]*font-mono[^>]*>([\d.]+)%<\/p>\s*<p[^>]*>Ban Rate<\/p>/i);
    if (brMatch) r.banRate = parseFloat(brMatch[1]);
  } else {
    const section = html.substring(html.indexOf('Meta Stats'));
    const wrM = section.match(/([\d.]+)%<\/p>\s*<p[^>]*>Win Rate/);
    if (wrM) r.winRate = parseFloat(wrM[1]);
    const prM = section.match(/([\d.]+)%<\/p>\s*<p[^>]*>Pick Rate/);
    if (prM) r.pickRate = parseFloat(prM[1]);
    const brM = section.match(/([\d.]+)%<\/p>\s*<p[^>]*>Ban Rate/);
    if (brM) r.banRate = parseFloat(brM[1]);
  }

  const attrMatch = html.match(/aria-label="Hero attributes:\s*Durability\s+(\d+),\s*Offense\s+(\d+),\s*Ability Effects\s+(\d+),\s*Difficulty\s+(\d+)"/i);
  if (attrMatch) {
    r.heroAttributes = {
      durability: parseInt(attrMatch[1]), offense: parseInt(attrMatch[2]),
      abilityEffects: parseInt(attrMatch[3]), difficulty: parseInt(attrMatch[4]),
    };
  }

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

  const synIdx = html.indexOf('Best With</h2>');
  if (synIdx > 0) {
    const endIdx = html.indexOf('</div>', synIdx + 2000);
    const section = html.substring(synIdx, endIdx > 0 ? Math.min(endIdx + 10, synIdx + 3000) : synIdx + 3000);
    const syn: { name: string; synergy: number }[] = [];
    const re = /href="\/heroes\/([a-z0-9-]+)"[\s\S]*?<span[^>]*>([^<]+)<\/span>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(section)) !== null) {
      const name = m[2].trim();
      if (name && !syn.find(s => s.name === name)) syn.push({ name, synergy: 5 });
    }
    if (syn.length) r.synergyHeroes = syn;
  }

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

  const curveIdx = html.indexOf('Power Curve</h2>');
  if (curveIdx > 0) {
    const section = html.substring(curveIdx, curveIdx + 15000);
    const svgStart = section.indexOf('aria-label="Power curve chart"');
    if (svgStart >= 0) {
      const svgTagStart = section.lastIndexOf('<svg', svgStart);
      const svgTagEnd = section.indexOf('</svg>', svgStart);
      if (svgTagStart >= 0 && svgTagEnd >= 0) {
        const svgContent = section.substring(svgTagStart, svgTagEnd + 6);
        const firstPathMatch = svgContent.match(/d="((?:M|L|C)\s*[^"]+)"/);
        if (firstPathMatch) {
          const d = firstPathMatch[1];
          const points: { x: number; y: number }[] = [];
          const cmdPattern = /([MLC])\s*([\d.,\s]+)/g;
          let cm: RegExpExecArray | null;
          while ((cm = cmdPattern.exec(d)) !== null) {
            const cmd = cm[1];
            const nums = cm[2].match(/[\d.]+/g)?.map(Number) || [];
            if (cmd === 'M' || cmd === 'L') {
              points.push({ x: nums[0], y: nums[1] });
            } else if (cmd === 'C' && nums.length >= 6) {
              points.push({ x: nums[4], y: nums[5] });
            }
          }
          const fillPoints = points.filter(p => p.y < 120);
          if (fillPoints.length >= 2) {
            const baseline = 128;
            const toV = (y: number) => Math.round(((baseline - y) / baseline) * 100);
            const third = Math.max(1, Math.floor(fillPoints.length / 3));
            const avg = (arr: { x: number; y: number }[]) => arr.length ? arr.reduce((s, c) => s + c.y, 0) / arr.length : 80;
            r.powerCurve = {
              early: Math.max(0, Math.min(100, toV(avg(fillPoints.slice(0, third))))),
              mid: Math.max(0, Math.min(100, toV(avg(fillPoints.slice(third, third * 2))))),
              late: Math.max(0, Math.min(100, toV(avg(fillPoints.slice(third * 2))))),
            };
          }
        }
        const levels: string[] = [];
        const lvlRe = />(Lv\s*\d+)</gi;
        let lm: RegExpExecArray | null;
        while ((lm = lvlRe.exec(svgContent)) !== null) levels.push(lm[1]);
        if (levels.length) {
          if (!r.powerCurve) r.powerCurve = { early: 50, mid: 75, late: 60 };
          r.powerCurve.spikeLevels = levels;
        }
      }
    }
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

async function main() {
  console.log(`[START] mlbb.tools sync — mode: ${MODE}`);
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

  const toProcess = MODE === 'test' ? ['ling', 'fanny', 'gord'] : heroFiles.map(f => f.replace('.json', ''));
  console.log(`[INFO] Processing ${toProcess.length} heroes`);

  let successCount = 0, partialCount = 0, failedCount = 0;
  const partialList: { name: string; missing: string; reason: string }[] = [];
  const failedList: { name: string; error: string }[] = [];

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
      await page.waitForTimeout(8000);
      const html = await page.content();
      htmlData = parseHeroPageHtml(html);
    } catch (e: any) { console.log(`[${i+1}/${toProcess.length}] [WARN] Page failed: ${e.message}`); }

    const merge: Record<string, any> = { metaSource: 'mlbb.tools', metaUpdatedAt: new Date().toISOString().split('T')[0] };

    const wr = htmlData.winRate || bulkHero?.winRate;
    const pr = htmlData.pickRate || bulkHero?.pickRate;
    const br = htmlData.banRate || bulkHero?.banRate;
    if (wr && wr > 0) merge.winRate = Math.round(wr * 10) / 10;
    if (pr && pr > 0) merge.pickRate = Math.round(pr * 10) / 10;
    if (br && br >= 0) merge.banRate = Math.round(br * 10) / 10;

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
    const synFrom = htmlData.synergyHeroes || bulkHero?.synergies || [];
    if (synFrom.length > 0) {
      merge.matchupSystem = merge.matchupSystem || {};
      merge.matchupSystem.synergyHeroes = synFrom.map((s: any) => ({
        name: s.heroName || s.name || String(s),
        synergy: typeof s.synergy === 'number' ? s.synergy : (typeof s.synergyScore === 'number' ? s.synergyScore : 5),
      }));
    }

    if (htmlData.heroAttributes) merge.heroAttributes = htmlData.heroAttributes;

    if (htmlData.powerCurve && (htmlData.powerCurve.early > 0 || htmlData.powerCurve.mid > 0)) {
      merge.powerCurve = {
        early: htmlData.powerCurve.early, mid: htmlData.powerCurve.mid, late: htmlData.powerCurve.late,
        spikeLevels: htmlData.powerCurve.spikeLevels || existing.powerCurve?.spikeLevels || [],
        coreItems: existing.powerCurve?.coreItems || [],
      };
    }

    if (htmlData.proBuilds?.length) merge.proBuilds = htmlData.proBuilds;

    merge.videoUrl = existing.videoUrl ?? null;
    merge.skillVideos = existing.skillVideos ?? { passive: null, skill1: null, skill2: null, ultimate: null };

    for (const [k, v] of Object.entries(merge)) {
      if (k === 'id' || k === 'name' || k === 'heroName' || k === 'skills') continue;
      if (v === null || v === undefined) continue;
      if (typeof v === 'object' && !Array.isArray(v)) {
        existing[k] = { ...(existing[k] || {}), ...v };
        for (const [sk, sv] of Object.entries(v)) {
          if (sv === null || sv === undefined || (Array.isArray(sv) && sv.length === 0)) continue;
          existing[k][sk] = sv;
        }
      } else if (Array.isArray(v)) {
        if (v.length > 0) existing[k] = v;
      } else if (v !== '' && v !== 0) {
        existing[k] = v;
      }
    }

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

    const missing: string[] = [];
    if (!existing.winRate) missing.push('winRate');
    if (!existing.pickRate) missing.push('pickRate');
    if (!existing.matchupSystem?.strongAgainst?.length) missing.push('strongAgainst');
    if (!existing.matchupSystem?.weakAgainst?.length) missing.push('weakAgainst');
    if (!existing.matchupSystem?.synergyHeroes?.length) missing.push('synergyHeroes');
    if (!existing.heroAttributes) missing.push('heroAttributes');
    if (!existing.proBuilds?.length) missing.push('proBuilds');

    const sc = existing.matchupSystem?.strongAgainst?.length || 0;
    const wc = existing.matchupSystem?.weakAgainst?.length || 0;
    const sy = existing.matchupSystem?.synergyHeroes?.length || 0;

    if (missing.length === 0) {
      console.log(`[${i+1}/${toProcess.length}] [OK] ${heroName} — ${sc} counters, ${wc} weak, ${sy} synergy, attrs OK, builds OK`);
      logs.push({ hero: heroName, status: 'OK', message: `${sc} counters, ${wc} weak, ${sy} synergy` });
      successCount++;
    } else {
      console.log(`[${i+1}/${toProcess.length}] [PARTIAL] ${heroName} — missing: ${missing.join(', ')}`);
      logs.push({ hero: heroName, status: 'PARTIAL', message: `missing: ${missing.join(', ')}` });
      partialCount++;
      partialList.push({ name: heroName, missing: missing.join(', '), reason: 'Data not available on mlbb.tools or page timeout' });
    }

    if (i < toProcess.length - 1) await sleep(RATE_LIMIT_MS);
  }

  await browser.close();

  if (MODE === 'test') {
    console.log(`\n[TEST COMPLETE] ${successCount} OK, ${partialCount} partial, ${failedCount} failed`);
    return;
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const stats = { wr: 0, strong: 0, curve: 0, builds: 0, attrs: 0 };
  for (const file of heroFiles) {
    const data = readHeroJson(file.replace('.json', ''));
    if (!data) continue;
    if (data.winRate) stats.wr++;
    if (data.matchupSystem?.strongAgainst?.length) stats.strong++;
    if (data.powerCurve) stats.curve++;
    if (data.proBuilds?.length) stats.builds++;
    if (data.heroAttributes) stats.attrs++;
  }

  let report = `# mlbb.tools Sync Report — ${dateStr}\n\n`;
  report += `## Summary\n- Total heroes processed: ${toProcess.length}\n- Full success: ${successCount}\n- Partial success: ${partialCount}\n- Failed: ${failedCount}\n\n`;
  report += `## Full Success (${successCount} heroes)\n${logs.filter(l => l.status === 'OK').map(l => l.hero).join(', ')}\n\n`;
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
  report += `\n## New Fields Added\n`;
  report += `- winRate/pickRate/banRate: ${stats.wr}/${heroFiles.length} heroes\n`;
  report += `- matchupSystem.strongAgainst: ${stats.strong}/${heroFiles.length} heroes\n`;
  report += `- powerCurve: ${stats.curve}/${heroFiles.length} heroes\n`;
  report += `- proBuilds: ${stats.builds}/${heroFiles.length} heroes\n`;
  report += `- heroAttributes: ${stats.attrs}/${heroFiles.length} heroes\n\n`;
  report += `## VIDEO STATUS\nAll heroes have skillVideos field set to null.\nUser needs to manually upload videos to: /public/videos/heroes/{heroId}/\nExpected files: passive.mp4, skill1.mp4, skill2.mp4, ultimate.mp4\n`;

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
