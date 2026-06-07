/**
 * READ-ONLY MLBB asset validation script.
 *
 * This script NEVER writes to any file or modifies assets. It only reads
 * the filesystem to verify that required image/asset files are present,
 * tracked by git, and correctly structured.
 *
 * Run with: npm run validate:assets
 *
 * Exit codes:
 *   0 -> zero errors (warnings allowed)
 *   1 -> one or more errors (required assets missing)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// ---------------------------------------------------------------------------
// Reporting helpers (matching validate-data.ts style)
// ---------------------------------------------------------------------------
interface Issue {
  file: string;
  location: string;
  message: string;
}

const errors: Issue[] = [];
const warnings: Issue[] = [];

function addError(file: string, location: string, message: string): void {
  errors.push({ file, location, message });
}

function addWarning(file: string, location: string, message: string): void {
  warnings.push({ file, location, message });
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const CWD = process.cwd();

const ASSET_FOLDERS = [
  'aset_hero',
  'aset_item',
  'skill_icons',
  'regular_season_files',
  'public',
];

const EXPECTED_TEAMS: Record<string, string> = {
  AE: '51px-Alter_Ego_2022_allmode.png',
  BTR: '56px-Bigetron_2020_allmode.png',
  DEWA: '76px-Dewa_United_Esports_allmode.png',
  EVOS: '52px-EVOS_Esports_allmode.png',
  GEEK: '43px-Geek_Fam_2019_allmode.png',
  NAVI: '57px-Natus_Vincere_2021_lightmode.png',
  ONIC: '74px-ONIC_Esports_2019_allmode.png',
  RRQ: '70px-Rex_Regum_Qeon_allmode.png',
  TLID: '44px-Team_Liquid_2024_lightmode.png',
};

const NEWEST_HEROES_MISSING_ICONS = [
  'zhuxin',
  'suyou',
  'lukas',
  'sora',
  'marcel',
  'kalea',
  'obsidia',
  'zetian',
];

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg']);

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------
interface HeroMaster {
  hero_name?: string;
  slug?: string;
  [key: string]: unknown;
}

function normalizeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function walkFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

function isImageFile(filePath: string): boolean {
  return IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function getGitTrackedFiles(folder: string): string[] | null {
  try {
    const output = execSync(`git ls-files "${folder}"`, {
      cwd: CWD,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return null;
  }
}

function isGitIgnored(folder: string): boolean {
  try {
    const result = execSync(`git check-ignore "${folder}"`, {
      cwd: CWD,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result.trim().length > 0;
  } catch {
    // exit code 1 = not ignored
    return false;
  }
}

// ---------------------------------------------------------------------------
// Report counters
// ---------------------------------------------------------------------------
let heroPortraitTotal = 0;
let heroPortraitMissing = 0;
let itemImageTotal = 0;
let skillIconFoldersTotal = 0;
let skillIconFoldersMissing = 0;
let teamLogosTotal = 0;
let teamLogosMissing = 0;
let junkFileCount = 0;

// ===========================================================================
// 1. Folder existence checks
// ===========================================================================
function validateFolderExistence(): void {
  for (const folder of ASSET_FOLDERS) {
    const fullPath = path.join(CWD, folder);
    if (!fs.existsSync(fullPath)) {
      addError(folder, 'existence', `Required asset folder "${folder}" does not exist.`);
    }
  }
}

// ===========================================================================
// 2. Hero portrait validation
// ===========================================================================
function validateHeroPortraits(): void {
  const masterPath = path.join(CWD, 'src', 'data', 'heroes_master.json');
  if (!fs.existsSync(masterPath)) {
    addError('src/data/heroes_master.json', 'file', 'Hero master file missing — cannot validate hero portraits.');
    return;
  }

  let heroes: HeroMaster[];
  try {
    heroes = JSON.parse(fs.readFileSync(masterPath, 'utf-8'));
  } catch {
    addError('src/data/heroes_master.json', 'parse', 'Failed to parse heroes_master.json.');
    return;
  }

  const heroDir = path.join(CWD, 'aset_hero');
  if (!fs.existsSync(heroDir)) {
    addError('aset_hero', 'existence', 'aset_hero/ folder missing.');
    return;
  }

  // Build normalized set of all image filenames in aset_hero
  const allImages = walkFiles(heroDir).filter(isImageFile);
  heroPortraitTotal = heroes.length;

  // Build a lookup of normalized hero names from filenames
  const imageNamesNormalized = new Set<string>();
  for (const img of allImages) {
    const basename = path.basename(img);
    const cleaned = basename
      .replace(/^\d+px-/, '')
      .replace(/^ML_icon_/i, '')
      .replace(/\.[^.]+$/, '')
      .replace(/_dd$/i, '')
      .replace(/_\d{4}(?:_v\d+)?$/i, '')
      .replace(/_v\d+$/i, '')
      .replace(/_/g, ' ')
      .trim();
    imageNamesNormalized.add(normalizeName(cleaned));
  }

  // Known aliases (matching server.ts logic)
  const aliases: Record<string, string[]> = {
    zetian: ['wuzetian'],
    wuzetian: ['zetian'],
    yisunshin: ['yisunsin'],
    xborg: ['xborg'],
    popolandkupa: ['popolkupa'],
    popolkupa: ['popolandkupa'],
  };

  for (const hero of heroes) {
    const name = hero.hero_name || '';
    const slug = hero.slug || '';
    const normalized = normalizeName(name);

    let found = imageNamesNormalized.has(normalized) || imageNamesNormalized.has(slug);

    // Check aliases
    if (!found) {
      const aliasKeys = aliases[normalized] || aliases[slug] || [];
      for (const alias of aliasKeys) {
        if (imageNamesNormalized.has(alias)) {
          found = true;
          break;
        }
      }
    }

    if (!found) {
      heroPortraitMissing++;
      addError('aset_hero', `hero: ${name}`, `No portrait image found for hero "${name}" (slug: ${slug}).`);
    }
  }
}

// ===========================================================================
// 3. Item image validation
// ===========================================================================
function validateItemImages(): void {
  const itemDir = path.join(CWD, 'aset_item');
  if (!fs.existsSync(itemDir)) {
    addError('aset_item', 'existence', 'aset_item/ folder missing.');
    return;
  }

  const itemImages = walkFiles(itemDir).filter(isImageFile);
  itemImageTotal = itemImages.length;

  if (itemImageTotal === 0) {
    addError('aset_item', 'count', 'No item images found in aset_item/.');
  }

  // Check enrichment data (warning only if sparse)
  const itemsJsonPath = path.join(CWD, 'data', 'items.json');
  if (fs.existsSync(itemsJsonPath)) {
    try {
      const itemsData = JSON.parse(fs.readFileSync(itemsJsonPath, 'utf-8'));
      const enrichCount = Array.isArray(itemsData) ? itemsData.length : 0;
      if (enrichCount < itemImageTotal) {
        addWarning(
          'data/items.json',
          'enrichment',
          `Only ${enrichCount} item(s) have enrichment data, but ${itemImageTotal} item images exist. Items without enrichment show placeholder UI.`,
        );
      }
    } catch {
      addWarning('data/items.json', 'parse', 'Could not parse items.json for enrichment check.');
    }
  } else {
    addWarning('data/items.json', 'missing', 'items.json not found — item enrichment data unavailable.');
  }
}

// ===========================================================================
// 4. Team logo validation
// ===========================================================================
function validateTeamLogos(): void {
  const regDir = path.join(CWD, 'regular_season_files');
  if (!fs.existsSync(regDir)) {
    addError('regular_season_files', 'existence', 'regular_season_files/ folder missing.');
    return;
  }

  for (const [team, logoFile] of Object.entries(EXPECTED_TEAMS)) {
    teamLogosTotal++;
    const logoPath = path.join(regDir, logoFile);
    if (!fs.existsSync(logoPath)) {
      teamLogosMissing++;
      addError('regular_season_files', `team: ${team}`, `Team logo missing: ${logoFile}`);
    }
  }

  // Check fallback images
  const fallbacks = ['60px-ML_icon_Zhuxin.png', '36px-Id_hd.png'];
  for (const fb of fallbacks) {
    const fbPath = path.join(regDir, fb);
    if (!fs.existsSync(fbPath)) {
      addError('regular_season_files', `fallback: ${fb}`, `Fallback image missing: ${fb}`);
    }
  }
}

// ===========================================================================
// 5. Skill icon validation
// ===========================================================================
function validateSkillIcons(): void {
  const skillDir = path.join(CWD, 'skill_icons');
  if (!fs.existsSync(skillDir)) {
    addWarning('skill_icons', 'existence', 'skill_icons/ folder missing.');
    return;
  }

  const masterPath = path.join(CWD, 'src', 'data', 'heroes_master.json');
  if (!fs.existsSync(masterPath)) return;

  let heroes: HeroMaster[];
  try {
    heroes = JSON.parse(fs.readFileSync(masterPath, 'utf-8'));
  } catch {
    return;
  }

  const existingFolders = new Set(
    fs.readdirSync(skillDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name.toLowerCase()),
  );

  skillIconFoldersTotal = existingFolders.size;

  for (const hero of heroes) {
    const slug = hero.slug || normalizeName(hero.hero_name || '');
    if (!existingFolders.has(slug)) {
      skillIconFoldersMissing++;
      const isNewest = NEWEST_HEROES_MISSING_ICONS.includes(slug);
      addWarning(
        'skill_icons',
        `hero: ${hero.hero_name || slug}`,
        `No skill icon folder for "${hero.hero_name || slug}"${isNewest ? ' (newest hero — expected)' : ''}.`,
      );
    }
  }
}

// ===========================================================================
// 6. Git tracking / ignored asset validation
// ===========================================================================
function validateGitTracking(): void {
  const requiredFolders = ['aset_hero', 'aset_item', 'skill_icons', 'regular_season_files'];

  for (const folder of requiredFolders) {
    const fullPath = path.join(CWD, folder);
    if (!fs.existsSync(fullPath)) continue;

    // Check if folder is gitignored
    if (isGitIgnored(folder)) {
      addError(folder, 'gitignore', `Required asset folder "${folder}" is listed in .gitignore — assets will be missing after clone.`);
      continue;
    }

    // Compare tracked vs actual file count
    const tracked = getGitTrackedFiles(folder);
    if (tracked === null) {
      addWarning(folder, 'git', 'Could not determine git tracking status (git command failed).');
      continue;
    }

    const actual = walkFiles(fullPath);
    const untrackedCount = actual.length - tracked.length;

    if (untrackedCount > 0) {
      addWarning(
        folder,
        'untracked',
        `${untrackedCount} file(s) in "${folder}" are not tracked by git and may be missing after clone/extract.`,
      );
    }
  }
}

// ===========================================================================
// 7. Junk file detection in regular_season_files
// ===========================================================================
function detectJunkFiles(): void {
  const regDir = path.join(CWD, 'regular_season_files');
  if (!fs.existsSync(regDir)) return;

  const allFiles = fs.readdirSync(regDir);
  const junkFiles: string[] = [];

  for (const file of allFiles) {
    const ext = path.extname(file).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext)) {
      junkFiles.push(file);
    }
  }

  junkFileCount = junkFiles.length;
  if (junkFileCount > 0) {
    addWarning(
      'regular_season_files',
      'junk files',
      `${junkFileCount} non-image file(s) detected (scraped web artifacts). These add unnecessary weight but do not affect functionality.`,
    );
  }
}

// ===========================================================================
// Report
// ===========================================================================
function printReport(): void {
  console.log('========================================');
  console.log('  MLBB ASSET VALIDATION REPORT');
  console.log('========================================');
  console.log(`Hero portraits: ${heroPortraitTotal - heroPortraitMissing}/${heroPortraitTotal} present${heroPortraitMissing > 0 ? ` (${heroPortraitMissing} MISSING)` : ''}`);
  console.log(`Item images: ${itemImageTotal} found`);
  console.log(`Skill icon folders: ${skillIconFoldersTotal}/${skillIconFoldersTotal + skillIconFoldersMissing} present${skillIconFoldersMissing > 0 ? ` (${skillIconFoldersMissing} missing — warnings only)` : ''}`);
  console.log(`Team logos: ${teamLogosTotal - teamLogosMissing}/${teamLogosTotal} present${teamLogosMissing > 0 ? ` (${teamLogosMissing} MISSING)` : ''}`);
  console.log(`Junk files in regular_season_files: ${junkFileCount}`);
  console.log('');
  console.log(`Errors: ${errors.length}`);
  console.log(`Warnings: ${warnings.length}`);

  if (errors.length > 0) {
    console.log('');
    console.log('[ERRORS]');
    for (const e of errors) {
      console.log(`  - ${e.file} :: ${e.location} :: ${e.message}`);
    }
  }

  if (warnings.length > 0) {
    console.log('');
    console.log('[WARNINGS]');
    for (const w of warnings) {
      console.log(`  - ${w.file} :: ${w.location} :: ${w.message}`);
    }
  }

  console.log('');
  console.log('========================================');
  console.log(`  RESULT: ${errors.length === 0 ? 'PASS' : 'FAIL'}`);
  console.log('========================================');
}

// ===========================================================================
// Main
// ===========================================================================
function main(): void {
  validateFolderExistence();
  validateHeroPortraits();
  validateItemImages();
  validateTeamLogos();
  validateSkillIcons();
  validateGitTracking();
  detectJunkFiles();
  printReport();
  process.exit(errors.length === 0 ? 0 : 1);
}

main();
