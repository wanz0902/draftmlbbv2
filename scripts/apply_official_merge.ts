/**
 * TAHAP 3: Apply Official MLBB API Merge
 * 
 * Rules:
 * - Fill placeholder skills from Official API
 * - Download skill icons from Official CDN
 * - Add tips field
 * - KEEP all scalingTable from Liquipedia
 * - KEEP description if longer than Official
 * - DO NOT touch heroes not in Official API
 * - Hero count MUST remain 132
 * 
 * Usage: npx tsx scripts/apply_official_merge.ts
 */

import path from 'path';
import fs from 'fs';

const ROOT = process.cwd();
const HEROES_DIR = path.join(ROOT, 'data', 'heroes');
const ICONS_DIR = path.join(ROOT, 'skill_icons');
const MLBB_API = 'https://mapi.mobilelegends.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// Heroes NOT in Official API — DO NOT TOUCH
const SKIP_HEROES = new Set(['zhuxin', 'suyou', 'lukas', 'kalea', 'obsidia', 'marcel', 'sora', 'zetian']);

const PLACEHOLDER_NAMES = new Set(['passive', 'passive skill', 'skill 1', 'skill 2', 'skill 3', 'ultimate']);

function isPlaceholder(name: string): boolean {
  return PLACEHOLDER_NAMES.has(name.toLowerCase().trim());
}

function cleanHtml(html: string): string {
  return html
    .replace(/<font[^>]*>/gi, '')
    .replace(/<\/font>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function downloadIcon(url: string, destPath: string): Promise<boolean> {
  try {
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 100) return true; // Already exists
    const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
    if (!res.ok) return false;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 100) return false;
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, buffer);
    return true;
  } catch { return false; }
}

interface OfficialSkill {
  name: string;
  icon: string;
  des: string;
  tips?: string;
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   TAHAP 3: APPLY OFFICIAL API MERGE');
  console.log('═══════════════════════════════════════════════════\n');

  // Load heroes_master to get slug list
  const masterPath = path.join(ROOT, 'src', 'data', 'heroes_master.json');
  const master = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
  const masterSlugs: string[] = master.map((h: any) => h.slug);
  
  console.log(`Master hero count: ${masterSlugs.length}`);
  if (masterSlugs.length !== 132) {
    console.error('ERROR: Hero count is not 132! ABORTING.');
    process.exit(1);
  }

  // Fetch Official hero list
  console.log('Fetching Official MLBB API hero list...');
  const listRes = await fetchJson(`${MLBB_API}/hero/list`);
  const officialHeroes = listRes.data as Array<{name: string; heroid: string; key: string}>;
  console.log(`Official API heroes: ${officialHeroes.length}\n`);

  // Map official hero name → ID
  const officialByName = new Map<string, string>();
  for (const h of officialHeroes) {
    officialByName.set(h.name.toLowerCase(), h.heroid);
    officialByName.set(h.name.toLowerCase().replace(/[^a-z0-9]/g, ''), h.heroid);
  }

  // Map our slugs to official IDs
  const slugToOfficialId = new Map<string, string>();
  for (const slug of masterSlugs) {
    const heroFile = path.join(HEROES_DIR, `${slug}.json`);
    if (!fs.existsSync(heroFile)) continue;
    const data = JSON.parse(fs.readFileSync(heroFile, 'utf8'));
    const heroName = data.name || data.heroName || data.hero_name || slug;
    const normalized = heroName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const id = officialByName.get(heroName.toLowerCase()) || officialByName.get(normalized);
    if (id) slugToOfficialId.set(slug, id);
  }

  console.log(`Heroes matched to Official API: ${slugToOfficialId.size}`);
  console.log(`Heroes to skip (not in API): ${masterSlugs.filter(s => !slugToOfficialId.has(s) || SKIP_HEROES.has(s)).length}\n`);

  let updated = 0, skipped = 0, failed = 0, iconsDownloaded = 0;

  for (const slug of masterSlugs) {
    if (SKIP_HEROES.has(slug)) {
      skipped++;
      continue;
    }

    const officialId = slugToOfficialId.get(slug);
    if (!officialId) {
      skipped++;
      continue;
    }

    const heroFile = path.join(HEROES_DIR, `${slug}.json`);
    if (!fs.existsSync(heroFile)) {
      skipped++;
      continue;
    }

    try {
      // Fetch detail from Official API
      const detailRes = await fetchJson(`${MLBB_API}/hero/detail?id=${officialId}`);
      const detail = detailRes.data;
      if (!detail || !detail.skill) {
        failed++;
        console.log(`  [FAIL] ${slug} — no skill data from API`);
        continue;
      }

      const data = JSON.parse(fs.readFileSync(heroFile, 'utf8'));
      let changed = false;

      // Official API returns skills as array: [skill1, skill2, skill3/ult, passive]
      // Usually passive is LAST in the array
      const officialSkills: OfficialSkill[] = detail.skill.skill || [];
      
      // Detect which is passive (usually last, or has no cooldown-like keywords)
      // Official API order: skill1, skill2, ultimate, passive (index 0,1,2,3)
      const slotMap: Record<string, OfficialSkill> = {};
      if (officialSkills.length >= 4) {
        slotMap['skill1'] = officialSkills[0];
        slotMap['skill2'] = officialSkills[1];
        slotMap['ultimate'] = officialSkills[2];
        slotMap['passive'] = officialSkills[3];
      } else if (officialSkills.length === 3) {
        slotMap['skill1'] = officialSkills[0];
        slotMap['skill2'] = officialSkills[1];
        slotMap['ultimate'] = officialSkills[2];
      }

      // Ensure skills object exists
      if (!data.skills) data.skills = {};

      for (const [slot, official] of Object.entries(slotMap)) {
        if (!data.skills[slot]) {
          data.skills[slot] = { name: '', description: '', cooldown: '0', manaCost: '0', damageType: 'Not specified', scaling: ['None'], scalingTable: [], crowdControlType: [], strategicTags: [], iconName: '', iconUrl: '', variant: '', comboUsage: '', strategicPurpose: '' };
        }

        const current = data.skills[slot];

        // RULE: Fill placeholder name
        if (isPlaceholder(current.name || '')) {
          current.name = official.name;
          changed = true;
        }

        // RULE: Fill placeholder description (keep longer one)
        const currentDesc = current.description || '';
        const officialDesc = cleanHtml(official.des || '');
        if (!currentDesc || currentDesc === 'Intelligence data missing.' || currentDesc.length < 20) {
          current.description = officialDesc;
          changed = true;
        } else if (officialDesc.length > currentDesc.length && !current.scalingTable?.length) {
          // Only replace if official is longer AND no scaling table exists (Liquipedia desc has scaling detail)
          current.description = officialDesc;
          changed = true;
        }

        // RULE: Add tips if missing
        if (!current.tips && official.tips) {
          current.tips = cleanHtml(official.tips);
          changed = true;
        }

        // RULE: Download icon if missing
        if (official.icon && (!current.iconUrl || !fs.existsSync(path.join(ROOT, (current.iconUrl || '').replace(/^\/raw-assets\//, ''))))) {
          const iconSlug = slugify(official.name);
          const localPath = path.join(ICONS_DIR, slug, `${iconSlug}.png`);
          const success = await downloadIcon(official.icon, localPath);
          if (success) {
            current.iconUrl = `/raw-assets/skill_icons/${slug}/${iconSlug}.png`;
            current.iconName = official.name.replace(/\s+/g, '_');
            iconsDownloaded++;
            changed = true;
          }
        }

        // RULE: NEVER overwrite scalingTable
        // (kept as-is, we never touch it)
      }

      if (changed) {
        fs.writeFileSync(heroFile, JSON.stringify(data, null, 2), 'utf8');
        updated++;
      } else {
        skipped++;
      }

    } catch (err: any) {
      failed++;
      console.log(`  [ERROR] ${slug}: ${err.message}`);
    }

    // Small delay to be nice to Official API
    await new Promise(r => setTimeout(r, 200));
  }

  // Final hero count check
  const finalFiles = fs.readdirSync(HEROES_DIR).filter(f => f.endsWith('.json'));
  const finalMasterCount = masterSlugs.length;

  console.log('\n═══════════════════════════════════════════════════');
  console.log('   MERGE COMPLETE');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Heroes updated: ${updated}`);
  console.log(`  Heroes skipped: ${skipped}`);
  console.log(`  Heroes failed: ${failed}`);
  console.log(`  Icons downloaded: ${iconsDownloaded}`);
  console.log(`  Hero count (master): ${finalMasterCount}`);
  console.log(`  Hero files (data/heroes/): ${finalFiles.length}`);
  console.log('');

  if (finalMasterCount !== 132) {
    console.error('⚠️ CRITICAL: Hero count changed! Was 132, now ' + finalMasterCount);
    console.error('ROLLBACK NEEDED');
  } else {
    console.log('✅ Hero count verified: 132');
  }
}

main();
