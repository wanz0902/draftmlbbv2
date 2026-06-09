import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HEROES_DIR = path.resolve(__dirname, '../public/videos/heroes');
const JSON_DIR = path.resolve(__dirname, '../data/heroes');

const SKILL_MAP: Record<number, string> = {
  0: 'passive',
  1: 'skill1',
  2: 'skill2',
  3: 'ultimate',
};

let updated = 0;
let skipped = 0;
let noVideos = 0;

const heroDirs = fs.readdirSync(HEROES_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

for (const heroId of heroDirs) {
  const jsonPath = path.join(JSON_DIR, `${heroId}.json`);
  if (!fs.existsSync(jsonPath)) {
    console.log(`[SKIP] No JSON file for ${heroId}`);
    noVideos++;
    continue;
  }

  const raw = fs.readFileSync(jsonPath, 'utf-8').replace(/^\uFEFF/, '');
  const hero = JSON.parse(raw);

  if (hero.skillVideos && Object.values(hero.skillVideos).some((v: any) => v !== null)) {
    console.log(`[SKIP] ${heroId} already has populated skillVideos`);
    skipped++;
    continue;
  }

  const heroVideoDir = path.join(HEROES_DIR, heroId);
  if (!fs.existsSync(heroVideoDir)) {
    console.log(`[SKIP] No video directory for ${heroId}`);
    noVideos++;
    continue;
  }

  const files = fs.readdirSync(heroVideoDir).filter(f => f.endsWith('.mp4'));

  const skillVideos: Record<string, string> = {};
  const fileBySkill: Record<number, string[]> = {};

  for (const file of files) {
    const match = file.match(/^video-(\d+)-(\d+)\.mp4$/);
    if (match) {
      const skillIndex = parseInt(match[1], 10);
      const variant = parseInt(match[2], 10);
      if (!fileBySkill[skillIndex]) fileBySkill[skillIndex] = [];
      fileBySkill[skillIndex].push(file);
    }
  }

  let hasAny = false;
  for (const [skillIdxStr, skillName] of Object.entries(SKILL_MAP)) {
    const skillIdx = parseInt(skillIdxStr, 10);
    const filesForSkill = fileBySkill[skillIdx];
    if (filesForSkill && filesForSkill.length > 0) {
      const sorted = filesForSkill.sort();
      skillVideos[skillName] = `/videos/heroes/${heroId}/${sorted[0]}`;
      hasAny = true;
    }
  }

  if (!hasAny) {
    console.log(`[SKIP] ${heroId} has no matching video files`);
    noVideos++;
    continue;
  }

  hero.skillVideos = {
    passive: skillVideos.passive || null,
    skill1: skillVideos.skill1 || null,
    skill2: skillVideos.skill2 || null,
    ultimate: skillVideos.ultimate || null,
  };

  fs.writeFileSync(jsonPath, JSON.stringify(hero, null, 2) + '\n', 'utf-8');
  console.log(`[UPDATED] ${heroId}: ${JSON.stringify(hero.skillVideos)}`);
  updated++;
}

console.log(`\n=== SUMMARY ===`);
console.log(`Updated: ${updated}`);
console.log(`Skipped (already populated): ${skipped}`);
console.log(`No videos/no JSON: ${noVideos}`);
console.log(`Total hero dirs scanned: ${heroDirs.length}`);
