/**
 * Download Skill Icons from MLBB Fandom Wiki
 * 
 * Usage:
 *   npx tsx scripts/download_skill_icons.ts --hero miya
 *   npx tsx scripts/download_skill_icons.ts --all
 */

import path from 'path';
import fs from 'fs';

const ROOT = process.cwd();
const ICONS_DIR = path.join(ROOT, 'skill_icons');
const HEROES_DIR = path.join(ROOT, 'data', 'heroes');
const FANDOM_API = 'https://mobile-legends.fandom.com/api.php';

const args = process.argv.slice(2);
const heroArg = args.find(a => a.startsWith('--hero'));
const targetHero = heroArg ? (args[args.indexOf(heroArg) + 1] || heroArg.split('=')[1]) : null;
const allMode = args.includes('--all');
const forceMode = args.includes('--force');

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

async function getIconUrl(iconName: string): Promise<string | null> {
  const fileName = iconName.replace(/_/g, ' ') + '.png';
  const url = `${FANDOM_API}?action=query&titles=File:${encodeURIComponent(fileName)}&prop=imageinfo&iiprop=url&format=json`;
  
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MLBB Draft Simulator' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data?.query?.pages;
    if (!pages) return null;
    const page = Object.values(pages)[0] as any;
    if (page?.missing !== undefined) return null;
    return page?.imageinfo?.[0]?.url || null;
  } catch {
    return null;
  }
}

async function downloadFile(url: string, destPath: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MLBB Draft Simulator' },
      redirect: 'follow'
    });
    if (!res.ok) return false;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 100) return false; // Too small to be a real image
    fs.writeFileSync(destPath, buffer);
    return true;
  } catch {
    return false;
  }
}

async function processHero(heroSlug: string): Promise<{downloaded: number; skipped: number; failed: number}> {
  const heroFile = path.join(HEROES_DIR, `${heroSlug}.json`);
  if (!fs.existsSync(heroFile)) {
    console.log(`  [SKIP] ${heroSlug} — no data file`);
    return { downloaded: 0, skipped: 1, failed: 0 };
  }

  const data = JSON.parse(fs.readFileSync(heroFile, 'utf8'));
  if (!data.skills) {
    console.log(`  [SKIP] ${heroSlug} — no skills`);
    return { downloaded: 0, skipped: 1, failed: 0 };
  }

  const heroIconDir = path.join(ICONS_DIR, heroSlug);
  fs.mkdirSync(heroIconDir, { recursive: true });

  let downloaded = 0, skipped = 0, failed = 0;
  let needsUpdate = false;

  for (const [key, skill] of Object.entries(data.skills) as [string, any][]) {
    if (!skill || typeof skill !== 'object') continue;
    
    const iconName = skill.iconName || skill.name?.replace(/\s+/g, '_') || '';
    if (!iconName) continue;

    const localFileName = slugify(iconName) + '.png';
    const localPath = path.join(heroIconDir, localFileName);
    const urlPath = `/raw-assets/skill_icons/${heroSlug}/${localFileName}`;

    // Skip if file already exists and not force
    if (fs.existsSync(localPath) && !forceMode) {
      const stat = fs.statSync(localPath);
      if (stat.size > 100) {
        skipped++;
        // Still update iconUrl if needed
        if (skill.iconUrl !== urlPath) {
          skill.iconUrl = urlPath;
          needsUpdate = true;
        }
        continue;
      }
    }

    // Try to download
    const imageUrl = await getIconUrl(iconName);
    if (imageUrl) {
      const success = await downloadFile(imageUrl, localPath);
      if (success) {
        const stat = fs.statSync(localPath);
        console.log(`    ✓ ${key}: ${iconName} (${stat.size} bytes)`);
        skill.iconUrl = urlPath;
        needsUpdate = true;
        downloaded++;
      } else {
        console.log(`    ✗ ${key}: ${iconName} — download failed`);
        failed++;
      }
    } else {
      // Try alternative name formats
      const altNames = [
        iconName,
        iconName.replace(/'s/g, '%27s'),
        skill.name?.replace(/\s+/g, '_'),
      ].filter((v, i, a) => v && a.indexOf(v) === i);
      
      let found = false;
      for (const alt of altNames) {
        if (alt === iconName) continue;
        const altUrl = await getIconUrl(alt);
        if (altUrl) {
          const success = await downloadFile(altUrl, localPath);
          if (success) {
            const stat = fs.statSync(localPath);
            console.log(`    ✓ ${key}: ${alt} (${stat.size} bytes) [alt name]`);
            skill.iconUrl = urlPath;
            needsUpdate = true;
            downloaded++;
            found = true;
            break;
          }
        }
        await sleep(500);
      }
      if (!found) {
        console.log(`    - ${key}: ${iconName} — not found on wiki`);
        failed++;
      }
    }

    // Rate limit: wait between requests
    await sleep(800);
  }

  // Save updated data with iconUrl paths
  if (needsUpdate) {
    fs.writeFileSync(heroFile, JSON.stringify(data, null, 2), 'utf8');
  }

  return { downloaded, skipped, failed };
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('=== MLBB Skill Icon Downloader ===');
  console.log(`Source: MLBB Fandom Wiki`);
  console.log(`Dest: ${ICONS_DIR}\n`);

  let heroes: string[] = [];

  if (targetHero) {
    heroes = [targetHero.toLowerCase().replace(/[^a-z0-9]+/g, '')];
  } else if (allMode) {
    heroes = fs.readdirSync(HEROES_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  } else {
    console.log('Usage: --hero <slug> or --all');
    process.exit(1);
  }

  let totalDownloaded = 0, totalSkipped = 0, totalFailed = 0;

  for (const hero of heroes) {
    console.log(`[${hero}]`);
    const result = await processHero(hero);
    totalDownloaded += result.downloaded;
    totalSkipped += result.skipped;
    totalFailed += result.failed;
  }

  console.log(`\n=== Complete ===`);
  console.log(`  Downloaded: ${totalDownloaded}`);
  console.log(`  Skipped (exists): ${totalSkipped}`);
  console.log(`  Failed/Not found: ${totalFailed}`);
}

main();
