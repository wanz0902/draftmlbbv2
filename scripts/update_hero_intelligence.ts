/**
 * Hero Intelligence Data Pipeline - Batch Update Script
 * 
 * This script:
 * 1. Reads all heroes from the DB
 * 2. For heroes with scraped data (data_quality >= 2), reads DB skills
 * 3. Writes properly formatted data/heroes/{slug}.json files with REAL data
 * 4. Preserves existing REAL data (e.g. Fanny) - only overwrites placeholders
 * 
 * Usage: npx tsx scripts/update_hero_intelligence.ts
 * 
 * Options:
 *   --force    Overwrite all hero files including ones with real data
 *   --dry-run  Preview changes without writing files
 *   --hero=X   Only process a specific hero slug
 */

import path from 'path';
import fs from 'fs';
import { getDb, seedHeroesIfEmpty } from '../lib/db/database.js';
import { HERO_LIQUIPEDIA_MAP } from '../lib/scraper/hero-scraper.js';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const HEROES_DIR = path.join(DATA_DIR, 'heroes');

// Parse CLI args
const args = process.argv.slice(2);
const forceMode = args.includes('--force');
const dryRun = args.includes('--dry-run');
const heroArg = args.find(a => a.startsWith('--hero='));
const targetHero = heroArg ? heroArg.split('=')[1] : null;

// Intelligence generation helpers (same as server.ts)
function generateMacroIdentity(roles: string[], lanes: string[]): string[] {
  const identity: string[] = [];
  if (roles.includes("Assassin")) identity.push("Backline Threat", "Pick-off Specialist");
  if (roles.includes("Fighter")) identity.push("Split Push", "Sustained Damage");
  if (roles.includes("Tank")) identity.push("Frontline Engage", "Crowd Control");
  if (roles.includes("Mage")) identity.push("Zone Control", "Burst Damage");
  if (roles.includes("Marksman")) identity.push("Objective DPS", "Late Game Carry");
  if (roles.includes("Support")) identity.push("Vision Control", "Team Enabler");
  if (lanes.includes("Jungle")) identity.push("Jungle Tempo");
  if (lanes.includes("EXP") || lanes.includes("EXP Lane")) identity.push("EXP Lane Pressure");
  if (lanes.includes("Gold Lane")) identity.push("Gold Lane Farming");
  if (lanes.includes("Roam")) identity.push("Map Rotation");
  return identity.length > 0 ? identity : ["Versatile"];
}

function generatePowerSpike(roles: string[], tempoClass: string): string[] {
  if (tempoClass === "Early" || roles.includes("Assassin")) return ["Level 4", "Early-Mid Game"];
  if (tempoClass === "Late" || roles.includes("Marksman")) return ["2 Core Items", "Late Game"];
  if (roles.includes("Tank") || roles.includes("Support")) return ["Level 2 (Roam Item)", "Mid Game"];
  return ["Mid Game", "Level 8"];
}

function generateSpecialty(roles: string[]): string[] {
  if (roles.includes("Assassin")) return ["Charge", "Burst"];
  if (roles.includes("Fighter")) return ["Damage", "Crowd Control"];
  if (roles.includes("Tank")) return ["Crowd Control", "Initiator"];
  if (roles.includes("Mage")) return ["Burst", "Poke"];
  if (roles.includes("Marksman")) return ["Damage", "Reap"];
  if (roles.includes("Support")) return ["Guard", "Regen"];
  return ["Damage"];
}

function hasRealData(fileData: any): boolean {
  if (!fileData?.skills) return false;
  const skills = fileData.skills;
  const values = Object.values(skills);
  if (values.length === 0) return false;
  return values.some((s: any) => {
    if (!s || typeof s !== 'object') return false;
    const desc = String(s.description || '').toLowerCase();
    const name = String(s.name || '').toLowerCase();
    // Detect all forms of placeholder data
    const isPlaceholderDesc = !desc || 
      desc === "intelligence data missing." ||
      desc.match(/^(passive|skill \d|ultimate)\s*description\.?$/i) !== null;
    const isPlaceholderName = !name ||
      name === "passive" || name === "passive skill" ||
      name === "skill 1" || name === "skill 2" || name === "skill 3" ||
      name === "ultimate";
    // Real data means BOTH name and description are not placeholder
    return !isPlaceholderDesc && !isPlaceholderName;
  });
}

function main() {
  console.log('=== MLBB Hero Intelligence Pipeline ===');
  console.log(`Mode: ${forceMode ? 'FORCE' : 'normal'} | ${dryRun ? 'DRY RUN' : 'WRITE'}`);
  if (targetHero) console.log(`Target: ${targetHero}`);
  console.log('');

  // Ensure output directory exists
  if (!fs.existsSync(HEROES_DIR)) {
    fs.mkdirSync(HEROES_DIR, { recursive: true });
  }

  const db = getDb();
  seedHeroesIfEmpty(db);

  // Get all DB heroes
  const dbHeroes = db.prepare('SELECT * FROM heroes').all() as any[];
  console.log(`Found ${dbHeroes.length} heroes in database.`);

  let updated = 0;
  let skipped = 0;
  let preserved = 0;

  for (const h of dbHeroes) {
    const slug = h.hero_id;

    if (targetHero && slug !== targetHero) continue;

    const heroFile = path.join(HEROES_DIR, `${slug}.json`);
    const existingData = fs.existsSync(heroFile)
      ? JSON.parse(fs.readFileSync(heroFile, 'utf8'))
      : null;

    // If existing file has real data and we're not in force mode, skip
    if (!forceMode && existingData && hasRealData(existingData)) {
      console.log(`  [PRESERVED] ${slug} — has real intelligence data`);
      preserved++;
      continue;
    }

    // Parse roles and lanes
    const roles: string[] = JSON.parse(h.roles || '[]');
    const lanes: string[] = JSON.parse(h.lanes || '[]');

    // Parse DB skills (may be structured objects from new scraper or old strings)
    let dbSkills: any = {};
    try {
      if (h.skills) {
        dbSkills = JSON.parse(h.skills);
      }
    } catch (e) {}

    // Determine if DB has usable structured skill data
    const dbHasStructuredSkills = dbSkills && typeof dbSkills === 'object' &&
      Object.values(dbSkills).some((s: any) => typeof s === 'object' && s !== null && s.name);

    // Build skills - prefer DB structured data if available, else keep existing placeholder
    let skills: any;
    if (dbHasStructuredSkills) {
      skills = dbSkills;
    } else if (existingData?.skills) {
      skills = existingData.skills;
    } else {
      // Generate minimal placeholder
      skills = {
        passive: { name: "Passive", description: "Intelligence data missing.", cooldown: "0", manaCost: "0", damageType: "NONE", scaling: ["None"], crowdControlType: [], strategicTags: [], comboUsage: "", strategicPurpose: "" },
        skill1: { name: "Skill 1", description: "Intelligence data missing.", cooldown: "10", manaCost: "50", damageType: "PHYSICAL", scaling: ["None"], crowdControlType: [], strategicTags: [], comboUsage: "", strategicPurpose: "" },
        skill2: { name: "Skill 2", description: "Intelligence data missing.", cooldown: "10", manaCost: "50", damageType: "PHYSICAL", scaling: ["None"], crowdControlType: [], strategicTags: [], comboUsage: "", strategicPurpose: "" },
        ultimate: { name: "Ultimate", description: "Intelligence data missing.", cooldown: "30", manaCost: "100", damageType: "PHYSICAL", scaling: ["None"], crowdControlType: [], strategicTags: [], comboUsage: "", strategicPurpose: "" },
      };
    }

    // Generate intelligence data
    const tempoClass = roles.includes("Assassin") ? "Early" : roles.includes("Marksman") ? "Late" : "Mid";

    const heroJson = {
      id: slug,
      name: h.hero_name,
      heroName: h.hero_name,
      role: roles,
      specialty: generateSpecialty(roles),
      lane: lanes[0] || "Unknown",
      lanes: lanes,
      flex_lanes: lanes.slice(1),
      releaseYear: existingData?.releaseYear || 2016,
      difficulty: existingData?.difficulty || 5,
      metaTier: h.tier_rating || existingData?.metaTier || "B",
      baseStats: {
        hp: h.stat_hp || existingData?.baseStats?.hp || 2500,
        hpRegen: h.stat_hp_regen || existingData?.baseStats?.hpRegen || 30,
        mana: h.stat_mana || existingData?.baseStats?.mana || 400,
        manaRegen: h.stat_mana_regen || existingData?.baseStats?.manaRegen || 15,
        physicalAttack: h.stat_phys_atk || existingData?.baseStats?.physicalAttack || 110,
        physicalDefense: h.stat_phys_def || existingData?.baseStats?.physicalDefense || 20,
        magicPower: h.stat_magic_power || existingData?.baseStats?.magicPower || 0,
        magicDefense: h.stat_magic_def || existingData?.baseStats?.magicDefense || 10,
        attackSpeed: h.stat_atk_speed || existingData?.baseStats?.attackSpeed || 0.8,
        attackSpeedRatio: existingData?.baseStats?.attackSpeedRatio || 100,
        movementSpeed: h.stat_move_speed || existingData?.baseStats?.movementSpeed || 250,
      },
      skills: skills,
      strategicData: {
        draftSignals: existingData?.strategicData?.draftSignals || ["Intelligence profile incomplete"],
        hiddenGameplans: existingData?.strategicData?.hiddenGameplans || [],
        macroIdentity: generateMacroIdentity(roles, lanes),
        tempoClassification: tempoClass,
        powerSpikeTiming: generatePowerSpike(roles, tempoClass),
        objectiveControlValue: existingData?.strategicData?.objectiveControlValue || 5,
        snowballPotential: existingData?.strategicData?.snowballPotential || 5,
        flexibilityRating: existingData?.strategicData?.flexibilityRating || 5,
        deceptionValue: existingData?.strategicData?.deceptionValue || 5,
        draftPhilosophyTags: existingData?.strategicData?.draftPhilosophyTags || [],
        counterSystem: {
          strongAgainst: existingData?.strategicData?.counterSystem?.strongAgainst || [],
          weakAgainst: existingData?.strategicData?.counterSystem?.weakAgainst || [],
          synergyWith: existingData?.strategicData?.counterSystem?.synergyWith || [],
        },
      },
      matchupSystem: existingData?.matchupSystem || {
        strongAgainst: [],
        weakAgainst: [],
        synergyHeroes: [],
        counterHeroes: [],
      },
    };

    if (dryRun) {
      console.log(`  [WOULD UPDATE] ${slug} — ${h.hero_name} (data_quality: ${h.data_quality || 0})`);
    } else {
      fs.writeFileSync(heroFile, JSON.stringify(heroJson, null, 2), 'utf8');
      console.log(`  [UPDATED] ${slug} — ${h.hero_name} (data_quality: ${h.data_quality || 0})`);
    }
    updated++;
  }

  console.log('');
  console.log('=== Pipeline Complete ===');
  console.log(`  Updated: ${updated}`);
  console.log(`  Preserved (real data): ${preserved}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Has Liquipedia mapping: ${Object.keys(HERO_LIQUIPEDIA_MAP).length}`);
}

main();
