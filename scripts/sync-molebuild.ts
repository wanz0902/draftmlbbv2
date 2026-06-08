/**
 * Sync community builds from molebuild.com via Supabase API.
 *
 * The site uses Supabase (PostgREST) for data. We intercepted the anon API key
 * and can query directly — no Playwright needed for data extraction.
 *
 * Run: npx tsx scripts/sync-molebuild.ts [--test|--full]
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const HERO_DIR = path.join(ROOT, 'data', 'heroes');
const REPORT_DIR = path.join(ROOT, 'reports');
const MODE = process.argv.includes('--test') ? 'test' : 'full';

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmbmFnZGVnc2dxcnJobHVybHBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MTE1NzQsImV4cCI6MjA2OTI4NzU3NH0._RoSCboOxjr3ldxbn_WYPGOCsTADqV6siaS0wVmkBSA';
const BASE = 'https://bfnagdegsgqrrhlurlpc.supabase.co/rest/v1';
const headers = { 'apikey': API_KEY, 'Authorization': `Bearer ${API_KEY}` };

function readHeroJson(id: string): Record<string, any> | null {
  const fp = path.join(HERO_DIR, `${id}.json`);
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf-8'));
}
function writeHeroJson(id: string, data: Record<string, any>): void {
  fs.writeFileSync(path.join(HERO_DIR, `${id}.json`), JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

const SLUG_OVERRIDES: Record<string, string> = {
  'Yi Sun-shin': 'yisunshin', 'Popol and Kupa': 'popolandkupa', 'Luo Yi': 'luoyi',
  'X.Borg': 'xborg', 'Lapu-Lapu': 'lapulapu', 'Yu Zhong': 'yuzhong', "Chang'e": 'change',
};
function heroNameToId(name: string): string {
  return SLUG_OVERRIDES[name] || name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

async function fetchJson(url: string): Promise<any> {
  const resp = await fetch(url, { headers });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

async function main() {
  console.log('[START] molebuild.com sync via Supabase API');

  // 1. Fetch all heroes
  console.log('[INFO] Fetching heroes...');
  const heroes = await fetchJson(`${BASE}/heroes?select=id,name,roles&order=name.asc`);
  console.log(`[INFO] Got ${heroes.length} heroes`);

  // 2. Fetch all items (for name resolution)
  console.log('[INFO] Fetching items...');
  const items = await fetchJson(`${BASE}/items?select=id,name`);
  const itemMap: Record<string, string> = {};
  for (const item of items) itemMap[item.id] = item.name;
  console.log(`[INFO] Got ${items.length} items (${Object.keys(itemMap).length} mapped)`);

  // 3. Fetch all builds
  console.log('[INFO] Fetching builds...');
  const allBuilds = await fetchJson(`${BASE}/builds?select=*,heroes(name),emblems(name),battle_spells(name)&order=likes_count.desc`);
  console.log(`[INFO] Got ${allBuilds.length} builds`);

  // 4. Group builds by hero
  const buildsByHero: Record<string, any[]> = {};
  for (const build of allBuilds) {
    const heroName = build.heroes?.name || '';
    if (!heroName) continue;
    if (!buildsByHero[heroName]) buildsByHero[heroName] = [];
    buildsByHero[heroName].push(build);
  }
  console.log(`[INFO] Builds分布在 ${Object.keys(buildsByHero).length} heroes`);

  // 5. Process each hero
  const heroFiles = fs.readdirSync(HERO_DIR).filter(f => f.endsWith('.json'));
  const toProcess = MODE === 'test'
    ? heroFiles.filter(f => ['miya.json', 'ling.json', 'claude.json'].includes(f))
    : heroFiles;

  let successCount = 0, skipCount = 0, totalBuilds = 0;

  for (const file of toProcess) {
    const id = file.replace('.json', '');
    const existing = readHeroJson(id);
    if (!existing) continue;

    const heroName = existing.name;
    const builds = buildsByHero[heroName] || [];

    if (builds.length === 0) {
      skipCount++;
      continue;
    }

    // Take top 5 builds by likes
    const topBuilds = builds.slice(0, 5).map(b => ({
      source: 'molebuild',
      buildName: b.title || `Build for ${heroName}`,
      author: 'community',
      votes: b.likes_count || 0,
      items: (b.items || []).map((itemId: string) => itemMap[itemId] || itemId).filter((n: string) => n && !n.match(/^[0-9a-f-]{36}$/)),
      emblem: b.emblems ? { name: b.emblems.name, talents: b.selected_emblem_attributes || [] } : null,
      spell: b.battle_spells?.name || null,
      skillOrder: null,
      notes: b.description || b.tips || null,
      tags: [],
      lastUpdated: b.created_at || '',
    }));

    existing.communityBuilds = topBuilds;
    writeHeroJson(id, existing);
    successCount++;
    totalBuilds += topBuilds.length;
    console.log(`[OK] ${heroName}: ${topBuilds.length} builds`);
  }

  // Report
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  let report = `# molebuild.com Sync Report — ${dateStr}\n\n`;
  report += `## Summary\n`;
  report += `- Heroes with builds: ${successCount}\n`;
  report += `- Heroes skipped (no builds): ${skipCount}\n`;
  report += `- Total builds collected: ${totalBuilds}\n`;
  report += `- Source: Supabase API (molebuild.com backend)\n\n`;
  report += `## Data Fields\n`;
  report += `- items: resolved from UUID to item names\n`;
  report += `- emblem: name + talents from Supabase\n`;
  report += `- spell: battle spell name\n`;
  report += `- votes: likes_count from database\n`;
  report += `- notes: build description\n`;

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(path.join(REPORT_DIR, 'sync-molebuild-report.md'), report, 'utf-8');
  const archiveDir = path.join(REPORT_DIR, 'archive');
  fs.mkdirSync(archiveDir, { recursive: true });
  const ts = `${dateStr}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  fs.writeFileSync(path.join(archiveDir, `sync-molebuild-${ts}.md`), report, 'utf-8');

  console.log(`\n[DONE] Report: reports/sync-molebuild-report.md`);
  console.log(`[DONE] ${successCount} heroes with builds, ${skipCount} skipped, ${totalBuilds} total builds`);
}

main().catch(err => { console.error('[FATAL]', err); process.exit(1); });
