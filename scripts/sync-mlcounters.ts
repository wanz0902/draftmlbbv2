/**
 * Sync counter data from mlcounters.app — MERGE only, never overwrite.
 *
 * Fetches ALL 132 heroes from the mlcounters.app API in a single request.
 * Adds: bestTeammates, worstTeammates, metaScore, metaRank,
 * mlcountersMatchup (cross-validate with mlbb.tools).
 *
 * Run: npx tsx scripts/sync-mlcounters.ts
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const HERO_DIR = path.join(ROOT, 'data', 'heroes');
const REPORT_DIR = path.join(ROOT, 'reports');
const API_URL = 'https://www.mlcounters.app/api/heroes?limit=all';

const SLUG_OVERRIDES: Record<string, string> = {
  'yi-sun-shin': 'yisunshin', 'popol-and-kupa': 'popolandkupa', 'luo-yi': 'luoyi',
  'x-borg': 'xborg', 'lapu-lapu': 'lapulapu', 'yu-zhong': 'yuzhong', 'change': 'change',
};
function slugToFileId(slug: string): string { return SLUG_OVERRIDES[slug] || slug.replace(/-/g, '').toLowerCase(); }

function readHeroJson(id: string): Record<string, any> | null {
  const fp = path.join(HERO_DIR, `${id}.json`);
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf-8'));
}
function writeHeroJson(id: string, data: Record<string, any>): void {
  fs.writeFileSync(path.join(HERO_DIR, `${id}.json`), JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

interface MlcHero {
  name: string;
  slug: string;
  meta_score: number;
  rank: number;
  win_rate: string;
  pick_rate: string;
  ban_rate: string;
  best_counters: { hero_name: string; counter_score: string; slug: string }[];
  most_countered_by: { hero_name: string; counter_score: string; slug: string }[];
  best_teammates: { hero_name: string; teammate_score: string; slug: string }[];
  weakest_teammates: { hero_name: string; teammate_score: string; slug: string }[];
}

async function fetchMlcData(): Promise<MlcHero[]> {
  console.log(`[INFO] Fetching ${API_URL}`);
  const resp = await fetch(API_URL);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
  const data = await resp.json() as { heroes: MlcHero[] };
  console.log(`[INFO] Got ${data.heroes.length} heroes from mlcounters.app`);
  return data.heroes;
}

function main() {
  console.log('[START] mlcounters.app sync');
  const heroFiles = fs.readdirSync(HERO_DIR).filter(f => f.endsWith('.json'));
  console.log(`[INFO] Found ${heroFiles.length} hero files`);

  const heroes = fetchMlcData();

  // Use synchronous approach with the API data
  // Since fetch is async, we need to handle this properly
  heroes.then(mlcHeroes => {
    const slugMap: Record<string, MlcHero> = {};
    for (const h of mlcHeroes) slugMap[h.slug] = h;

    // Map file IDs to mlc slugs
    const fileIdToMlc: Record<string, MlcHero> = {};
    for (const file of heroFiles) {
      const id = file.replace('.json', '');
      // Try direct slug match
      for (const [slug, hero] of Object.entries(slugMap)) {
        if (slugToFileId(slug) === id) { fileIdToMlc[id] = hero; break; }
      }
    }

    let successCount = 0, missCount = 0;
    const missList: { name: string; reason: string }[] = [];

    for (const file of heroFiles) {
      const id = file.replace('.json', '');
      const existing = readHeroJson(id);
      if (!existing) continue;

      const mlc = fileIdToMlc[id];
      if (!mlc) {
        missCount++;
        missList.push({ name: existing.name, reason: 'No mlcounters data found' });
        console.log(`[MISS] ${existing.name} — no mlcounters data`);
        continue;
      }

      // Merge best teammates
      const bestTeammates = mlc.best_teammates.map(t => ({
        name: t.hero_name,
        winrateDelta: parseFloat(t.teammate_score) || 0,
      }));

      // Merge worst teammates
      const worstTeammates = mlc.weakest_teammates.map(t => ({
        name: t.hero_name,
        winrateDelta: parseFloat(t.teammate_score) || 0,
      }));

      // Merge mlcounters matchup (separate from mlbb.tools)
      const mlcStrong = mlc.best_counters.map(c => ({
        name: c.hero_name,
        advantage: Math.abs(parseFloat(c.counter_score) || 0),
      }));
      const mlcWeak = mlc.most_countered_by.map(c => ({
        name: c.hero_name,
        advantage: Math.abs(parseFloat(c.counter_score) || 0),
      }));

      // Only add if data exists
      if (bestTeammates.length) existing.bestTeammates = bestTeammates;
      if (worstTeammates.length) existing.worstTeammates = worstTeammates;

      existing.metaScore = mlc.meta_score;
      existing.metaRank = mlc.rank;
      existing.mlcSource = 'mlcounters.app';
      existing.mlcUpdatedAt = new Date().toISOString().split('T')[0];

      // Cross-validate matchup data — keep existing mlbb.tools data, add mlcounters as separate field
      if (mlcStrong.length || mlcWeak.length) {
        existing.mlcountersMatchup = {};
        if (mlcStrong.length) existing.mlcountersMatchup.strongAgainst = mlcStrong;
        if (mlcWeak.length) existing.mlcountersMatchup.weakAgainst = mlcWeak;
      }

      writeHeroJson(id, existing);
      successCount++;
      console.log(`[OK] ${existing.name} — meta:${mlc.meta_score} rank:#${mlc.rank} ${bestTeammates.length} best/${worstTeammates.length} worst teammates`);
    }

    // Generate report
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    let report = `# mlcounters.app Sync Report — ${dateStr}\n\n`;
    report += `## Summary\n- Total heroes processed: ${heroFiles.length}\n- Success: ${successCount}\n- Missing: ${missCount}\n\n`;
    report += `## Success (${successCount} heroes)\n`;
    report += `All heroes have: bestTeammates, worstTeammates, metaScore, metaRank, mlcountersMatchup\n\n`;
    if (missList.length) {
      report += `## Missing (${missCount} heroes)\n| Hero | Reason |\n|------|--------|\n`;
      missList.forEach(m => report += `| ${m.name} | ${m.reason} |\n`);
    }
    report += `\n## Fields Added\n- bestTeammates: ${successCount}/${heroFiles.length} heroes\n`;
    report += `- worstTeammates: ${successCount}/${heroFiles.length} heroes\n`;
    report += `- metaScore: ${successCount}/${heroFiles.length} heroes\n`;
    report += `- metaRank: ${successCount}/${heroFiles.length} heroes\n`;
    report += `- mlcountersMatchup: ${successCount}/${heroFiles.length} heroes\n`;

    fs.mkdirSync(REPORT_DIR, { recursive: true });
    fs.writeFileSync(path.join(REPORT_DIR, 'sync-mlcounters-report.md'), report, 'utf-8');
    const archiveDir = path.join(REPORT_DIR, 'archive');
    fs.mkdirSync(archiveDir, { recursive: true });
    const ts = `${dateStr}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    fs.writeFileSync(path.join(archiveDir, `sync-mlcounters-${ts}.md`), report, 'utf-8');

    console.log(`\n[DONE] Report: reports/sync-mlcounters-report.md`);
    console.log(`[DONE] ${successCount}/${heroFiles.length} OK, ${missCount} missing`);
  }).catch(err => {
    console.error('[FATAL]', err);
    process.exit(1);
  });
}

main();
