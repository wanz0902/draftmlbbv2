import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
import * as cheerio from "cheerio";
import dotenv from "dotenv";

dotenv.config();

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
};

import { getDb, getDbHealth, seedHeroesIfEmpty, needsRescrape } from './lib/db/database.js';
import { batchScrapeHeroes, scrapeAndSaveHero } from './lib/scraper/hero-scraper.js';
import { getGatewayQueueStatus } from './lib/scraper/liquipedia-gateway.js';
import { scrapeTournamentStats, scrapeTournament } from './lib/scraper/tournament-scraper.js';

// ——— DB INIT ON SERVER START ———
(async () => {
  try {
    const db = getDb();
    seedHeroesIfEmpty(db);

    // Clean rejected heroes from DB
    const rejectedPath = path.join(process.cwd(), "data", "rejected_heroes.json");
    const rejected = safeJson(rejectedPath, []);
    if (rejected.length > 0) {
      const slugs = rejected.map((r: any) => r.slug);
      for (const slug of slugs) {
        db.prepare('DELETE FROM heroes WHERE hero_id = ?').run(slug);
      }
      console.log('[Server] Rejected heroes purged from DB:', slugs.join(', '));
    }

    console.log('[Server] Sacred DB initialized. Health:', getDbHealth(db));
  } catch (err) {
    console.error('[Server] DB init failed:', err);
  }
})();


const app = express();
const PORT = 3001;

app.use(express.json());

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const REGULAR_FILE = path.join(DATA_DIR, "regular_matches.json");
const HISTORY_FILE = path.join(DATA_DIR, "matches.json");
const HERO_STATS_FILE = path.join(DATA_DIR, "heroes_stats.json");
const ADVANCED_HERO_FILE = path.join(DATA_DIR, "heroes_advanced.json");
const ITEM_DIR = path.join(ROOT, "aset_item");
const HERO_DIR = path.join(ROOT, "aset_hero");
const REGULAR_ASSET_DIR = path.join(ROOT, "regular_season_files");

const TEAM_LOGOS: Record<string, string> = {
  AE: "51px-Alter_Ego_2022_allmode.png",
  BTR: "56px-Bigetron_2020_allmode.png",
  DEWA: "76px-Dewa_United_Esports_allmode.png",
  EVOS: "52px-EVOS_Esports_allmode.png",
  GEEK: "43px-Geek_Fam_2019_allmode.png",
  NAVI: "57px-Natus_Vincere_2021_lightmode.png",
  ONIC: "74px-ONIC_Esports_2019_allmode.png",
  RRQ: "70px-Rex_Regum_Qeon_allmode.png",
  TLID: "44px-Team_Liquid_2024_lightmode.png",
};

// Initialize Gemini AI Client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn(
      "GEMINI_API_KEY is missing. Gemini Coach will be unavailable.",
    );
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

function normalizeName(value: string): string {
  return String(value || "")
    .replace(/Â/g, "")
    .replace(/\u00a0/g, " ")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
}

function cleanText(v: string): string { return String(v||"").replace(/[\s\u00A0]+/g, " ").trim(); }

function safeJson(filePath: string, fallback: any) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    }
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
  }
  return fallback;
}

function walkFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const results: string[] = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

function assetUrl(filePath: string): string {
  return `/raw-assets/${path.relative(ROOT, filePath).split(path.sep).map(encodeURIComponent).join("/")}`;
}

// Extract hero logos mapping (scans aset_hero and regular_season_files)
function getHeroAssets(): Record<string, string> {
  const heroAssets: Record<string, string> = {};

  // Walk aset_hero first
  if (fs.existsSync(HERO_DIR)) {
    walkFiles(HERO_DIR)
      .filter((file) => /\.(png|webp|jpg|jpeg)$/i.test(file))
      .forEach((file) => {
        const basename = path.basename(file);
        // Clean name e.g. 85px-ML_icon_Aamon.png or ML_icon_Aamon.png
        const namePart = basename
          .replace(/^\d+px-/, "")
          .replace(/^ML_icon_/i, "")
          .replace(/\.[^.]+$/, "")
          .replace(/_dd$/i, "")
          .replace(/_\d{4}(?:_v\d+)?$/i, "")
          .replace(/_v\d+$/i, "")
          .replace(/_/g, " ")
          .trim();

        heroAssets[normalizeName(namePart)] = assetUrl(file);
      });
  }

  // Walk regular_season_files for other icons if missing
  if (fs.existsSync(REGULAR_ASSET_DIR)) {
    walkFiles(REGULAR_ASSET_DIR)
      .filter((file) => /^60px-ML_icon_/i.test(path.basename(file)))
      .forEach((file) => {
        const base = path
          .basename(file)
          .replace(/^60px-ML_icon_/i, "")
          .replace(/\.[^.]+$/, "")
          .replace(/_\d{4}(?:_v\d+)?$/i, "")
          .replace(/_v\d+$/i, "")
          .replace(/_/g, " ");

        const norm = normalizeName(base);
        if (!heroAssets[norm]) {
          heroAssets[norm] = assetUrl(file);
        }
      });
  }

  // Aliases/fallbacks mapping
  if (
    heroAssets[normalizeName("Wu Zetian")] &&
    !heroAssets[normalizeName("Zetian")]
  ) {
    heroAssets[normalizeName("Zetian")] =
      heroAssets[normalizeName("Wu Zetian")];
  }

  // Hero name alias mappings for special characters
  const aliases: Record<string, string> = {
    "yisunshin": "yi sunshin",
    "xborg": "x borg",
    "changé": "change",
    "popol and kupa": "popol kupa",
  };

  Object.entries(aliases).forEach(([alias, target]) => {
    const normAlias = normalizeName(alias);
    const normTarget = normalizeName(target);
    if (heroAssets[normTarget] && !heroAssets[normAlias]) {
      heroAssets[normAlias] = heroAssets[normTarget];
    }
    if (heroAssets[normAlias] && !heroAssets[normTarget]) {
      heroAssets[normTarget] = heroAssets[normAlias];
    }
  });

  return heroAssets;
}

function getTeamAssets(): Record<string, string> {
  const assets: Record<string, string> = {};
  Object.entries(TEAM_LOGOS).forEach(([team, file]) => {
    const filePath = path.join(REGULAR_ASSET_DIR, file);
    if (fs.existsSync(filePath)) {
      assets[team] = assetUrl(filePath);
    } else {
      // Return a blank or fallback if logo not found
      assets[team] = `/raw-assets/regular_season_files/36px-Id_hd.png`;
    }
  });
  return assets;
}

function itemNameFromFile(file: string): string {
  return path
    .basename(file)
    .replace(/^Item_/i, "")
    .replace(/_ML\.png$/i, "")
    .replace(/_\d{4}/g, "")
    .replace(/_/g, " ")
    .trim();
}

function getItemsList() {
  if (!fs.existsSync(ITEM_DIR)) {
    return [];
  }
  const enrichmentData = safeJson(path.join(DATA_DIR, "items.json"), []);
  const scannedItems = walkFiles(ITEM_DIR)
    .filter((file) => /\.(png|webp|jpg|jpeg)$/i.test(file))
    .filter((file) => !/Mobile_Legends_Gold/i.test(path.basename(file)))
    .map((file) => {
      const category = path.basename(path.dirname(file));
      const name = itemNameFromFile(file);
      const enriched = enrichmentData.find(
        (item: any) => normalizeName(item.name) === normalizeName(name),
      );
      return {
        name,
        category: category.charAt(0).toUpperCase() + category.slice(1),
        image: assetUrl(file),
        gold: enriched?.gold || 2000,
        stats: enriched?.stats || ["+ Physical / Magic stats"],
        passive: enriched?.passive || "Unique Passive",
        description: enriched?.description || "A solid battlefield gear item.",
      };
    })
    .sort(
      (a, b) =>
        a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
    );

  return scannedItems;
}

// Normalize team names helper
function normalizeTeamName(name: string): string {
  if (!name) return "UNKNOWN";
  const lower = name.toLowerCase().trim();
  if (lower.includes("onic")) return "ONIC";
  if (
    lower.includes("team liquid id") ||
    lower.includes("liquid") ||
    lower.includes("tlid")
  )
    return "TLID";
  if (lower.includes("dewa united") || lower.includes("dewa")) return "DEWA";
  if (lower.includes("bigetron") || lower.includes("btr")) return "BTR";
  if (lower.includes("evos")) return "EVOS";
  if (lower.includes("geek fam") || lower.includes("geek")) return "GEEK";
  if (lower.includes("alter ego") || lower.includes("ae")) return "AE";
  if (lower.includes("natus vincere") || lower.includes("navi")) return "NAVI";
  if (lower.includes("rrq") || lower.includes("rex regum")) return "RRQ";
  return name.trim();
}

// CALCULATE TEAM STATS DYNAMICALLY FROM matches
function calculateTeamStats(matches: any[]) {
  const statsMap: Record<
    string,
    {
      key: string;
      matchesPlayed: number;
      wins: number;
      losses: number;
      picks: Record<string, number>;
      bans: Record<string, number>;
    }
  > = {};

  const teamKeys = [
    "RRQ",
    "ONIC",
    "TLID",
    "EVOS",
    "BTR",
    "AE",
    "GEEK",
    "DEWA",
    "NAVI",
  ];
  teamKeys.forEach((key) => {
    statsMap[key] = {
      key,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      picks: {},
      bans: {},
    };
  });

  matches.forEach((m) => {
    const teamBlue = normalizeTeamName(m.blueTeam);
    const teamRed = normalizeTeamName(m.redTeam);

    if (statsMap[teamBlue]) statsMap[teamBlue].matchesPlayed += 1;
    if (statsMap[teamRed]) statsMap[teamRed].matchesPlayed += 1;

    // Check winner
    const scoreParts = (m.score || "0-0").split("-").map(Number);
    const blueWins = scoreParts[0] || 0;
    const redWins = scoreParts[1] || 0;

    if (blueWins > redWins) {
      if (statsMap[teamBlue]) statsMap[teamBlue].wins += 1;
      if (statsMap[teamRed]) statsMap[teamRed].losses += 1;
    } else if (redWins > blueWins) {
      if (statsMap[teamRed]) statsMap[teamRed].wins += 1;
      if (statsMap[teamBlue]) statsMap[teamBlue].losses += 1;
    }

    // Accumulate Hero Picks and Bans from individual games
    if (m.games && Array.isArray(m.games)) {
      m.games.forEach((game: any) => {
        // Blue picks
        if (game.blueTeam?.picks) {
          game.blueTeam.picks.forEach((h: string) => {
            if (statsMap[teamBlue]) {
              statsMap[teamBlue].picks[h] =
                (statsMap[teamBlue].picks[h] || 0) + 1;
            }
          });
        }
        // Blue bans
        if (game.blueTeam?.bans) {
          game.blueTeam.bans.forEach((h: string) => {
            if (statsMap[teamBlue]) {
              statsMap[teamBlue].bans[h] =
                (statsMap[teamBlue].bans[h] || 0) + 1;
            }
          });
        }
        // Red picks
        if (game.redTeam?.picks) {
          game.redTeam.picks.forEach((h: string) => {
            if (statsMap[teamRed]) {
              statsMap[teamRed].picks[h] =
                (statsMap[teamRed].picks[h] || 0) + 1;
            }
          });
        }
        // Red bans
        if (game.redTeam?.bans) {
          game.redTeam.bans.forEach((h: string) => {
            if (statsMap[teamRed]) {
              statsMap[teamRed].bans[h] = (statsMap[teamRed].bans[h] || 0) + 1;
            }
          });
        }
      });
    }
  });

  const logos = getTeamAssets();
  const teamNames: Record<string, string> = {
    RRQ: "Rex Regum Qeon",
    ONIC: "Fnatic ONIC",
    TLID: "Team Liquid ID",
    EVOS: "EVOS Glory",
    BTR: "Bigetron Alpha",
    AE: "Alter Ego",
    GEEK: "Geek Fam ID",
    DEWA: "Dewa United Esports",
    NAVI: "Natus Vincere",
  };

  return Object.values(statsMap).map((stats) => {
    // Sort picks
    const sortedPicks = Object.entries(stats.picks)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([hero]) => hero);

    const sortedBans = Object.entries(stats.bans)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([hero]) => hero);

    const total = stats.wins + stats.losses;
    const wr = total > 0 ? Math.round((stats.wins / total) * 100) : 0;

    return {
      name: teamNames[stats.key] || stats.key,
      key: stats.key,
      logo:
        logos[stats.key] || "/raw-assets/regular_season_files/36px-Id_hd.png",
      matchesPlayed: stats.matchesPlayed,
      wins: stats.wins,
      losses: stats.losses,
      winRate: wr,
      mostPickedHeroes: sortedPicks,
      mostBannedHeroes: sortedBans,
    };
  });
}

// ——— INTELLIGENCE GENERATION HELPERS ———

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

function isPlaceholderSkills(skills: any): boolean {
  if (!skills || typeof skills !== 'object') return true;
  const values = Object.values(skills);
  if (values.length === 0) return true;
  // Check if skill entries have placeholder markers
  return values.some((s: any) => {
    if (typeof s === 'string') return true; // Old concatenated string format from DB
    if (s && typeof s === 'object') {
      return (s.description === "Intelligence data missing." ||
              s.name === "Passive" || s.name === "Skill 1" || s.name === "Skill 2" || s.name === "Ultimate");
    }
    return false;
  });
}

function hasRealFileSkills(fileHero: any): boolean {
  if (!fileHero?.skills || typeof fileHero.skills !== 'object') return false;
  const skillValues = Object.values(fileHero.skills);
  if (skillValues.length === 0) return false;
  // At least one skill must have a real name and non-placeholder description
  return skillValues.some((s: any) => {
    if (!s || typeof s !== 'object') return false;
    const desc = String(s.description || '').toLowerCase();
    const name = String(s.name || '').toLowerCase();
    const isPlaceholderDesc = !desc || 
      desc === "intelligence data missing." ||
      /^(passive|skill \d|ultimate)\s*description\.?$/i.test(desc);
    const isPlaceholderName = !name ||
      name === "passive" || name === "passive skill" ||
      name === "skill 1" || name === "skill 2" || name === "skill 3" ||
      name === "ultimate";
    return !isPlaceholderDesc && !isPlaceholderName;
  });
}

// Merge stats data into the advanced hero database with database fortress fallback
function getStructuredHeroes() {
  const db = getDb();
  const dbHeroes = db.prepare('SELECT * FROM heroes').all() as any[];

  // Filter out rejected heroes
  const rejectedPath = path.join(DATA_DIR, "rejected_heroes.json");
  const rejectedSlugs = new Set(
    safeJson(rejectedPath, []).map((r: any) => r.slug)
  );

  const heroesDir = path.join(DATA_DIR, "heroes");
  const statsList = safeJson(HERO_STATS_FILE, []);

  return dbHeroes.map((h: any) => {
    const slug = h.hero_id;
    const heroFile = path.join(heroesDir, `${slug}.json`);
    const fileHero = fs.existsSync(heroFile) ? safeJson(heroFile, null) : null;

    const statsName = h.hero_name;
    const statMatch = statsList.find(
      (s: any) =>
        cleanText(s.hero_name).toLowerCase() === statsName.toLowerCase(),
    );

    // Merge skills: parse DB skills column
    let skillsParsed: any = {};
    try {
      if (h.skills) {
        skillsParsed = JSON.parse(h.skills || '{}');
      }
    } catch (e) {}

    // Determine best skills source: prefer real file data, then DB data, then placeholder file data
    const fileHasReal = hasRealFileSkills(fileHero);
    const dbHasReal = Object.keys(skillsParsed).length > 0 && !isPlaceholderSkills(skillsParsed);
    let mergedSkills: any;
    if (fileHasReal) {
      mergedSkills = fileHero.skills;
    } else if (dbHasReal) {
      mergedSkills = skillsParsed;
    } else {
      mergedSkills = fileHero?.skills || skillsParsed || {};
    }

    // Determine roles and lanes for generating intelligence
    const roles: string[] = JSON.parse(h.roles || '[]');
    const lanes: string[] = JSON.parse(h.lanes || '[]');
    const tempoClass = String(fileHero?.strategicData?.tempoClassification || "Mid");

    // Specialty: use file if real, otherwise generate from role
    let specialty: string[];
    if (fileHero) {
      const rawSpecialty = Array.isArray(fileHero.specialty) ? fileHero.specialty : [fileHero.specialty].filter(Boolean);
      const isPlaceholderSpecialty = rawSpecialty.length === 0 ||
        (rawSpecialty.length === 1 && (rawSpecialty[0] === "Unknown" || !rawSpecialty[0]));
      specialty = isPlaceholderSpecialty ? generateSpecialty(roles) : rawSpecialty;
    } else {
      const dbSpecialty = h.specialty;
      specialty = (dbSpecialty && dbSpecialty !== "Unknown" && dbSpecialty !== "None")
        ? [dbSpecialty]
        : generateSpecialty(roles);
    }

    // Macro Identity: use file if real, otherwise generate
    const fileMacro = fileHero?.strategicData?.macroIdentity || [];
    const isPlaceholderMacro = fileMacro.length === 0 ||
      (fileMacro.length === 1 && (fileMacro[0] === "Data Pending Analysis" || fileMacro[0] === "Unknown"));
    const macroIdentity = isPlaceholderMacro ? generateMacroIdentity(roles, lanes) : fileMacro;

    // Power Spike: use file if real, otherwise generate
    const filePowerSpike = fileHero?.strategicData?.powerSpikeTiming || [];
    const isPlaceholderSpike = filePowerSpike.length === 0 ||
      (filePowerSpike.length === 1 && (filePowerSpike[0] === "Unknown" || !filePowerSpike[0]));
    const powerSpike = isPlaceholderSpike ? generatePowerSpike(roles, tempoClass) : filePowerSpike;

    // Construct the structured hero, fallback to DB stats
    const mappedHero = {
      id: h.hero_id,
      hero_name: h.hero_name === "Wu Zetian" ? "Zetian" : h.hero_name,
      role: roles,
      specialty: specialty,
      lanes: lanes,
      damage_type: fileHero?.skills?.passive?.damageType || (mergedSkills?.passive?.damageType) || "Physical",
      tier: h.tier_rating || fileHero?.metaTier || "B",
      difficulty: fileHero?.difficulty || (h.difficulty === 1 ? "Easy" : h.difficulty === 3 ? "Hard" : "Medium"),
      lane: fileHero?.lane || (lanes[0] || "UNKNOWN"),
      flex_lanes: fileHero?.flex_lanes || [],
      releaseYear: fileHero?.releaseYear || 2016,

      pick_rate: statMatch
        ? parseFloat((statMatch.picks_total || "0").replace("%", ""))
        : (h.pick_rate_overall || 0),
      ban_rate: statMatch
        ? parseFloat((statMatch.bans_total || "0").replace("%", ""))
        : (h.ban_rate_overall || 0),
      win_rate: statMatch
        ? parseFloat((statMatch.winrate || "0").replace("%", ""))
        : (h.win_rate_overall || 0),
      tournament_presence: statMatch
        ? parseFloat((statMatch.tournament_presence || "0").replace("%", ""))
        : (h.tournament_presence || 0),

      gold_per_min: fileHero?.baseStats?.gpm || 0,
      power_spike: powerSpike,

      early_game: tempoClass.toLowerCase() === "early" ? 9 : 6,
      mid_game: 7,
      late_game: tempoClass.toLowerCase() === "late" ? 9 : 6,

      farming_speed: fileHero?.strategicData?.objectiveControlValue || 5,
      teamfight_value: fileHero?.strategicData?.flexibilityRating || 5,
      objective_control: fileHero?.strategicData?.objectiveControlValue || 5,
      mobility: 6,
      crowd_control: fileHero?.skills?.skill1?.crowdControlType ? 8 : 5,

      counters: JSON.parse(h.counters || '[]').length > 0 ? JSON.parse(h.counters || '[]') : (fileHero?.strategicData?.counterSystem?.strongAgainst || []),
      synergies: JSON.parse(h.synergies || '[]').length > 0 ? JSON.parse(h.synergies || '[]') : (fileHero?.strategicData?.counterSystem?.synergyWith || []),
      countered_by: JSON.parse(h.countered_by || '[]').length > 0 ? JSON.parse(h.countered_by || '[]') : (fileHero?.strategicData?.counterSystem?.weakAgainst || []),

      items: [],
      emblems: [],
      skills: mergedSkills,

      draft_analysis: {
        draft_signals: fileHero?.strategicData?.draftSignals || [],
        hidden_gameplans: fileHero?.strategicData?.hiddenGameplans || [],
        macro_identity: macroIdentity,
        philosophy_tags: fileHero?.strategicData?.draftPhilosophyTags || [],
      },

      aiTags: {
        tempo: roles.includes("Assassin") ? "Fast" : roles.includes("Marksman") ? "Late" : "Mid",
        powerSpikeTiming: roles.includes("Marksman") ? "Late Game" : roles.includes("Assassin") ? "Early-Mid Game" : "Mid Game",
        flexibilityRating: fileHero?.strategicData?.flexibilityRating || 6,
        deceptionValue: "Medium",
        heroDraftIdentity: roles[0] || "Fighter",
        hiddenGameplanSynergy: "Balanced Draft"
      },
      base_stats: {
        hp: h.stat_hp || fileHero?.baseStats?.hp || 2500,
        hpRegen: h.stat_hp_regen || fileHero?.baseStats?.hpRegen || 30,
        mana: h.stat_mana || fileHero?.baseStats?.mana || 400,
        manaRegen: h.stat_mana_regen || fileHero?.baseStats?.manaRegen || 15,
        physicalAttack: h.stat_phys_atk || fileHero?.baseStats?.physicalAttack || 110,
        physicalDefense: h.stat_phys_def || fileHero?.baseStats?.physicalDefense || 20,
        magicPower: h.stat_magic_power || fileHero?.baseStats?.magicPower || 0,
        magicDefense: h.stat_magic_def || fileHero?.baseStats?.magicDefense || 10,
        attackSpeed: h.stat_atk_speed || fileHero?.baseStats?.attackSpeed || 0.8,
        movementSpeed: h.stat_move_speed || fileHero?.baseStats?.movementSpeed || 250,
      },
      pro_statistics: statMatch || {},
    };

    return mappedHero;
  }).filter((h: any) => h && !rejectedSlugs.has(h.id));
}

// API ROUTE: STRUCTURED HERO DATABASE (ALL)
app.get("/api/heroes", (req, res) => {
  res.json(getStructuredHeroes());
});

// API ROUTE: ADVANCED HERO DATABASE
app.get("/api/heroes/advanced", (req, res) => {
  res.json(getStructuredHeroes());
});

// API ROUTE: STRUCTURED HERO (SINGLE)
app.get("/api/heroes/:id", (req, res) => {
  const heroesDir = path.join(DATA_DIR, "heroes");
  const id = String(req.params.id || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const heroFile = path.join(heroesDir, `${id}.json`);

  if (fs.existsSync(heroFile)) {
    return res.json(safeJson(heroFile, {}));
  } else {
    // Generate an artificial structure for heroes without files
    // so the Intelligence Dashboard works gracefully
    const fallback = {
      id: id,
      heroName: id.charAt(0).toUpperCase() + id.slice(1),
      role: "UNKNOWN",
      secondaryRole: "",
      specialty: ["Unknown"],
      lane: "UNKNOWN",
      releaseYear: 2016,
      baseStats: {
        hp: 2500,
        hpRegen: 30,
        mana: 400,
        manaRegen: 15,
        physicalAttack: 110,
        physicalDefense: 20,
        magicPower: 0,
        magicDefense: 10,
        attackSpeed: 0.8,
        attackSpeedRatio: 100,
        movementSpeed: 250,
      },
      skills: [
        {
          name: "Unknown Passive",
          type: "PASSIVE",
          description: "Intelligence data missing.",
          cooldown: [],
          manaCost: [],
          damageType: "NONE",
          scaling: "None",
          crowdControlType: "NONE",
          strategicTags: [],
        },
        {
          name: "Unknown Skill 1",
          type: "SKILL_1",
          description: "Intelligence data missing.",
          cooldown: [10],
          manaCost: [50],
          damageType: "PHYSICAL",
          scaling: "None",
          crowdControlType: "NONE",
          strategicTags: [],
        },
        {
          name: "Unknown Skill 2",
          type: "SKILL_2",
          description: "Intelligence data missing.",
          cooldown: [10],
          manaCost: [50],
          damageType: "PHYSICAL",
          scaling: "None",
          crowdControlType: "NONE",
          strategicTags: [],
        },
        {
          name: "Unknown Ultimate",
          type: "ULTIMATE",
          description: "Intelligence data missing.",
          cooldown: [30],
          manaCost: [100],
          damageType: "PHYSICAL",
          scaling: "None",
          crowdControlType: "NONE",
          strategicTags: [],
        },
      ],
      aiTags: {
        tempo: "Mid",
        powerSpikeTiming: "Mid Game",
        comfortProfiles: ["Data Pending"],
        macroIdentity: "Data Pending Analysis",
        draftSignals: ["Intelligence profile incomplete"],
        synergy: [],
        counters: [],
        counteredBy: [],
        deceptionValue: "LOW",
      },
    };
    return res.json(fallback);
  }
});

// API ROUTE: HERO STATS
app.get("/api/hero-stats", (req, res) => {
  const heroesData = safeJson(HERO_STATS_FILE, []);
  const db = getDb();
  const dbHeroes = db.prepare('SELECT hero_name, tier_rating, roles, counters, countered_by, synergies FROM heroes').all() as any[];
  
  // Deduplicate by normalized name and prefer the entry with more picks/bans combined
  const uniqueHeroesMap = new Map();
  heroesData.forEach((h: any) => {
    const cleanName = cleanText(h.hero_name);
    const normalName = String(cleanName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    
    if (!normalName) return;
    
    // Find matching DB entry for enriched stats
    const dbMatch = dbHeroes.find(d => cleanText(d.hero_name).toLowerCase().replace(/[^a-z0-9]/g, "") === normalName);
    const tier = dbMatch?.tier_rating || ((parseInt(h.picks_total)*1.5 + parseInt(h.bans_total)*2.0) > 40 ? "A" : "B");
    
    let counters = [], countered_by = [], synergies = [], roles = undefined;
    try {
      if (dbMatch?.counters) counters = JSON.parse(dbMatch.counters);
      if (dbMatch?.countered_by) countered_by = JSON.parse(dbMatch.countered_by);
      if (dbMatch?.synergies) synergies = JSON.parse(dbMatch.synergies);
      if (dbMatch?.roles) roles = JSON.parse(dbMatch.roles);
    } catch(e) {}

    const existing = uniqueHeroesMap.get(normalName);
    const newTotalParams = (parseInt(h.picks_total || "0") || 0) + (parseInt(h.bans_total || "0") || 0);
    const existingTotalParams = existing ? (parseInt(existing.picks_total || "0") || 0) + (parseInt(existing.bans_total || "0") || 0) : -1;
    
    if (!existing || newTotalParams > existingTotalParams) {
       uniqueHeroesMap.set(normalName, {
           ...h,
           hero_name: cleanName,
           tier,
           role: roles || h.role, // normalize arrays if missing
           counters,
           countered_by,
           synergies,
           win_rate: parseFloat((h.winrate || "50%").replace("%", "")),
           pick_rate: parseFloat((h.picks_total || "0")),
           ban_rate: parseFloat((h.bans_total || "0")),
           id: normalName
       });
    }
  });

  res.json(Array.from(uniqueHeroesMap.values()));
});

// API ROUTE: REGULAR SEASON MATCHES
app.get("/api/matches", (req, res) => {
  const data = safeJson(REGULAR_FILE, []);
  res.json(data);
});

// API ROUTE: MATCH HISTORY
app.get("/api/history", (req, res) => {
  const data = safeJson(HISTORY_FILE, []);
  res.json(data);
});

// API ROUTE: ITEMS
app.get("/api/items", (req, res) => {
  res.json(getItemsList());
});

// API ROUTE: ASSET MAPS
app.get("/api/assets", (req, res) => {
  res.json({
    heroes: getHeroAssets(),
    teams: getTeamAssets(),
  });
});

// API ROUTE: DYNAMIC TEAM STATS
app.get("/api/team-stats", (req, res) => {
  const matches = safeJson(REGULAR_FILE, []);
  res.json(calculateTeamStats(matches));
});

import { MLBB_LANE_SYSTEM } from "./src/data/lane_system.js";

// API ROUTE: GEMINI AI DRAFT ANALYST & RECOMMENDATION
app.post("/api/draft/ai-recommend", async (req, res): Promise<any> => {
  const {
    bluePicks = [],
    redPicks = [],
    blueBans = [],
    redBans = [],
    currentPhase,
    currentTurnSide,
  } = req.body;

  const ai = getGeminiClient();
  const openAI = getOpenAIClient();
  if (!ai && !openAI) {
    // Provide fallback recommendations, filtering out already used heroes
    const unavailable = new Set([...bluePicks, ...redPicks, ...blueBans, ...redBans]);
    const fallbackPool = [
      { heroName: "Zhuxin", role: "Mage", reason: "Standard pick/ban priority." },
      { heroName: "Suyou", role: "Assassin", reason: "Great high tier flexible pick." },
      { heroName: "Harith", role: "Marksman", reason: "Strong sidelane lane pressure." },
      { heroName: "Ling", role: "Assassin", reason: "High mobility jungle carry." },
      { heroName: "Valentina", role: "Mage", reason: "Flex pick with ultimate copy." },
      { heroName: "Mathilda", role: "Support", reason: "Roam priority with engage." },
    ];
    const available = fallbackPool.filter(h => !unavailable.has(h.heroName)).slice(0, 3);
    return res.status(503).json({
      error:
        "AI service is currently unavailable. Ensure GEMINI_API_KEY or OPENAI_API_KEY is configured in Settings.",
      recommendations: available.length > 0 ? available : [{ heroName: "N/A", role: "N/A", reason: "Semua fallback hero sudah terpakai." }],
      overallStrategy:
        "Configure your GEMINI_API_KEY in Settings > Secrets to unlock dynamic tactical AI recommendations.",
    });
  }

  try {
    let prompt = `Anda adalah Asisten Pelatih Tim Esports MLBB yang jenius (Nexus Analytics).
Tugas Anda memberikan rekomendasi DRAFT (PICK BAN) sesingkat dan se-to-the-point mungkin berdasarkan data yang diberikan. Evaluasi sinergi dan counter.
JANGAN BERTELE-TELE. Jawab maksimal 2 KALIMAT per hero reason. Fokus pada FAKTA (Winrate/Tier/Counter), bukan sekadar opini.

DRAFT STATE SAAT INI:
- Tim Biru (Picks): ${JSON.stringify(bluePicks)}
- Tim Merah (Picks): ${JSON.stringify(redPicks)}
- Tim Biru (Bans): ${JSON.stringify(blueBans)}
- Tim Merah (Bans): ${JSON.stringify(redBans)}
- Giliran: ${currentTurnSide}
- Fase: ${currentPhase}

HERO YANG TIDAK BOLEH DIREKOMENDASIKAN (sudah di-ban atau di-pick):
${JSON.stringify([...bluePicks, ...redPicks, ...blueBans, ...redBans])}
JANGAN PERNAH merekomendasikan hero yang ada di daftar di atas. Hanya rekomendasikan hero yang BELUM dipilih/dibanned.

Pertimbangkan stats Hero (Tier, Meta) yang ideal untuk counter/sinergi.
Berikan 3 rekomendasi terbaik (Prioritas tertinggi ke rendah) untuk aksi saat ini.

FORMAT JSON:
{
  "recommendations": [
    {
      "heroName": "Nama Hero",
      "role": "Role",
      "reason": "1-2 Kalimat singkat padat jelas dengan insight data why pick/ban."
    }
  ],
  "overallStrategy": "Ringkasan 2 Kalimat: Arah draft sekarang dan antisipasi pergerakan musuh."
}`;

    let responseText = "{}";

    let openaiFailed = false;
    if (openAI) {
      try {
        const completion = await openAI.chat.completions.create({
          model: "gpt-4-turbo",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "Lakukan output format JSON yang valid. " },
            { role: "user", content: prompt }
          ]
        });
        responseText = completion.choices[0].message.content || "{}";
      } catch (err: any) {
        console.warn("OpenAI API Failed:", err.message);
        openaiFailed = true;
      }
    } 
    
    if ((!openAI || openaiFailed) && ai) {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    heroName: { type: Type.STRING },
                    role: { type: Type.STRING },
                    reason: { type: Type.STRING },
                  },
                  required: ["heroName", "role", "reason"],
                },
              },
              overallStrategy: { type: Type.STRING },
            },
            required: ["recommendations", "overallStrategy"],
          },
        },
      });
      responseText = response.text || "{}";
    }

    const parsedData = JSON.parse(responseText);
    res.json(parsedData);
  } catch (error: any) {
    console.error("Gemini AI API Call failed:", error);
    res
      .status(500)
      .json({
        error: "Failed to query Gemini AI model",
        details: error.message,
      });
  }
});

// API ROUTE: GEMINI AI DRAFT GLOBAL EVALUATION
app.post("/api/draft/evaluate", async (req, res): Promise<any> => {
  const {
    bluePicks = [],
    redPicks = [],
    blueBans = [],
    redBans = [],
  } = req.body;

  const ai = getGeminiClient();
  const openAI = getOpenAIClient();
  if (!ai && !openAI) {
    return res.status(503).json({
      error:
        "AI service is currently unavailable. Ensure GEMINI_API_KEY or OPENAI_API_KEY is configured in Settings.",
      evaluation: `## Analisis Draf (API Key Hilang)
      
Silakan konfigurasi \`GEMINI_API_KEY\` atau \`OPENAI_API_KEY\` Anda di panel **Settings > Secrets** untuk mengaktifkan asisten pelatih analisis draf Gemini secara real-time.

### Lineup Draft Terpilih:
- **Tim Biru**: ${bluePicks.join(", ") || "Belum ada"}
- **Tim Merah**: ${redPicks.join(", ") || "Belum ada"}`,
    });
  }

  try {
    const prompt = `Lakukan evaluasi post-draf singkat, ringkas, dan to the point.
Anda adalah seorang analis pro scene MLBB. Bahasa jangan kaku, gunakan bahasa semi-kasual tapi profesional dan penuh data/fakta. Minta user baca dalam waktu singkat.
JANGAN gunakan paragraf panjang, gunakan bullet points saja. Max 10-15 detik waktu baca.

- Tim Biru: Picks: ${JSON.stringify(bluePicks)} (Bans: ${JSON.stringify(blueBans)})
- Tim Merah: Picks: ${JSON.stringify(redPicks)} (Bans: ${JSON.stringify(redBans)})

Muat poin berikut:
1. Sinergi Biru & Power Spike.
2. Sinergi Merah & Power Spike.
3. Win Condition masing-masing.
4. Kesimpulan probabilitas menang (misal: Biru 55% vs Merah 45%) berdasarkan counter/draft.`;

    let evaluationText = "Gagal memperoleh draf analisis dari AI.";
    
    let openaiFailed = false;
    if (openAI) {
      try {
        const completion = await openAI.chat.completions.create({
          model: "gpt-4-turbo",
          messages: [
            { role: "system", content: "Lakukan output text biasa dan informatif." },
            { role: "user", content: prompt }
          ]
        });
        evaluationText = completion.choices[0].message.content || evaluationText;
      } catch (err: any) {
        console.warn("OpenAI evaluate Failed:", err.message);
        openaiFailed = true;
      }
    } 
    
    if ((!openAI || openaiFailed) && ai) {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });
      evaluationText = response.text || evaluationText;
    }

    res.json({
      evaluation: evaluationText,
    });
  } catch (error: any) {
    console.error("Gemini Post-Draft Evaluation failed:", error);
    res
      .status(500)
      .json({ error: "Failed to evaluate draft", details: error.message });
  }
});

// API ROUTE: LIVE INTERNET SCAN & SCRAPING (OPTIMIZED LOGIC)
app.post("/api/scrape/liquipedia", async (req, res) => {
  try {
    const apiEndpoint = "https://liquipedia.net/mobilelegends/api.php";
    const params = new URLSearchParams({
      action: "parse",
      page: "MPL/Indonesia/Season_17/Statistics",
      prop: "text",
      format: "json",
    });

    const headers = {
      "User-Agent": "MLBB-Draft-Simulator-Builder/1.0 (dev@aistudio.build)",
    };

    console.log("Fetching live stats from Liquipedia...");
    const fetchResponse = await fetch(`${apiEndpoint}?${params.toString()}`, {
      headers,
    });

    if (!fetchResponse.ok) {
      if (fetchResponse.status === 429) {
        console.warn("Liquipedia 429 Too Many Requests");
        return res.status(429).json({ success: false, error: "Liquipedia 429 Too Many Requests" });
      }
      throw new Error(
        `Liquipedia response status error: ${fetchResponse.status}`,
      );
    }

    const data: any = await fetchResponse.json();
    if (!data?.parse?.text?.["*"]) {
      throw new Error(
        "Invalid response format received from Liquipedia MediaWiki API",
      );
    }

    const htmlContent = data.parse.text["*"];
    const $ = cheerio.load(htmlContent);
    const tables = $("table.wikitable");

    if (tables.length === 0) {
      throw new Error("Stats wikitable not found in parsed HTML");
    }

    const firstTable = tables.first();
    const rows = firstTable.find("tr");

    // Semantic parsing: Map headers to indices
    const headerMap: Record<string, number> = {};
    const headerRows = firstTable.find("tr").slice(0, 2); // Check first two rows for headers

    headerRows.each((i, tr) => {
      $(tr)
        .find("th, td")
        .each((colIndex, col) => {
          const text = cleanText($(col).text()).toLowerCase();
          if (text.includes("hero") && !headerMap["hero"])
            headerMap["hero"] = colIndex;
          if (text === "Σ" && !headerMap["picks_total"])
            headerMap["picks_total"] = colIndex;
          if (text === "w" && !headerMap["picks_win"])
            headerMap["picks_win"] = colIndex;
          if (text === "l" && !headerMap["picks_loss"])
            headerMap["picks_loss"] = colIndex;
          if (text === "wr" && !headerMap["winrate"])
            headerMap["winrate"] = colIndex;
          if (text === "presence" && !headerMap["presence"])
            headerMap["presence"] = colIndex;
          // Fallback parsing (since liquipedia has complex subheaders under "Picks", "Bans" etc.)
        });
    });

    // We will do a generic fallback if headers are merged (as they often are on LQ),
    // but the instruction is to not rely solely on hardcoded arrays if we can avoid it.
    // Given the complexity of their TH colspan layout, we will build a robust row validation instead of just relying on the exact cells[0].

    const heroes: any[] = [];
    const parseErrors: string[] = [];

    // Setup manual override mapping for weird liquipedia outputs
    const masterPath = path.join(
      process.cwd(),
      "src",
      "data",
      "heroes_master.json",
    );
    let masterData: any[] = [];
    if (fs.existsSync(masterPath)) {
      masterData = JSON.parse(fs.readFileSync(masterPath, "utf8"));
    }

    const norm = (s: string) =>
      String(s || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

    rows.each((index, tr) => {
      const cells = $(tr).find("td");

      // Skip the header rows or empty rows
      if (cells.length < 10) return;

      // Look for the hero cell (usually index 1, an icon + text)
      // We can find the hero name by looking for the first text cell that matches hero characteristics
      let rawHeroName = "";
      let offset = 0;

      const c0 = cleanText($(cells[0]).text());
      const c1 = cleanText($(cells[1]).text());

      if (!isNaN(parseInt(c0)) && c1.length > 1) {
        // Normal layout: Rank (c0), Hero (c1)
        rawHeroName = c1;
        offset = 0;
      } else if (c0.length > 2 && isNaN(parseInt(c0))) {
        // Shifted: No rank column
        rawHeroName = c0;
        offset = -1;
      }

      if (!rawHeroName) {
        parseErrors.push(`Row ${index}: Could not determine hero name.`);
        return;
      }

      // Hero mapper validation logic
      let heroName = rawHeroName;
      if (masterData.length > 0) {
        const rawNorm = norm(rawHeroName);

        // special liquipedia names
        let mapped = rawNorm;
        if (
          mapped === "yisun-shin" ||
          mapped.includes("yss") ||
          mapped === "yisunshin"
        )
          mapped = "yisunshin";
        if (mapped === "xborg") mapped = "xborg";

        const found = masterData.find(
          (h: any) =>
            norm(h.hero_name) === mapped ||
            h.slug === mapped ||
            (h.slug && mapped.includes(h.slug)),
        );

        if (found) {
          heroName = found.hero_name;
        } else {
          parseErrors.push(
            `Row ${index}: Unknown hero detected -> "${rawHeroName}". Evaluated but might drop if no fallback.`,
          );
          // We do not return here, we let it pass with raw name so it's not totally broken
        }
      }

      // Robust extraction using offset
      const extract = (idx: number) => {
        const targetIdx = idx + offset;
        if (targetIdx < 0 || targetIdx >= cells.length) return "0";
        return cleanText($(cells[targetIdx]).text());
      };

      const hData = {
        hero_name: heroName,
        picks_total: extract(2),
        picks_win: extract(3),
        picks_loss: extract(4),
        winrate: extract(5),
        tournament_presence: extract(6),
        blue_side_picks: extract(7),
        blue_side_win: extract(8),
        blue_side_loss: extract(9),
        blue_side_wr: extract(10),
        red_side_picks: extract(11),
        red_side_win: extract(12),
        red_side_loss: extract(13),
        red_side_wr: extract(14),
        bans_total: extract(15),
        bans_presence: extract(16),
        picks_bans_total: extract(17),
        picks_bans_presence: extract(18) || extract(17), // fallback
      };

      // Validation System
      const pTotal = parseInt(hData.picks_total);
      const pWin = parseInt(hData.picks_win);
      const bTotal = parseInt(hData.bans_total);

      if (isNaN(pTotal) || isNaN(pWin) || isNaN(bTotal)) {
        parseErrors.push(
          `Row ${index} (${heroName}): Invalid numeric stats. Dropped.`,
        );
        return;
      }

      if (pWin > pTotal) {
        parseErrors.push(
          `Row ${index} (${heroName}): Abnormal stats (Wins > Total). Dropped.`,
        );
        return;
      }

      heroes.push(hData);
    });

    if (parseErrors.length > 0) {
      console.warn("Liquipedia Parsing Warnings:\n", parseErrors.join("\n"));
    }

    if (heroes.length > 0) {
      fs.writeFileSync(
        HERO_STATS_FILE,
        JSON.stringify(heroes, null, 2),
        "utf8",
      );
      console.log(`Saved ${heroes.length} hero statistics!`);
      res.json({
        success: true,
        count: heroes.length,
        warnings: parseErrors.length > 0 ? parseErrors : undefined,
        message:
          "Successfully fetched and compiled live hero statistics from Liquipedia!",
      });
    } else {
      throw new Error(
        "No hero data crawled from the table elements. Columns may have shifted drastically.",
      );
    }
  } catch (error: any) {
    console.error("Scraping Liquipedia failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

async function repairAsset(filePath: string, relativePath: string): Promise<boolean> {
  try {
    const filename = path.basename(filePath);
    
    // We will generate the candidate filenames to try downloading directly via the MD5 Commons URL
    const candidates: string[] = [];
    
    // 1. Direct filename without dimensions prefix (e.g. "85px-ML_icon_Aamon.png" -> "ML_icon_Aamon.png")
    const cleanPrefix = filename.replace(/^\d+px-/, "");
    candidates.push(cleanPrefix);
    
    // 2. Original filename as is
    candidates.push(filename);
    
    // 3. For team logos or others with allmode prefix, try cleaning extra suffixes (e.g., Alter_Ego_2022_allmode -> Alter_Ego)
    const cleanedAllmode = cleanPrefix
      .replace(/_\d{4}_allmode/i, "_allmode")
      .replace(/_allmode/i, "")
      .replace(/_lightmode/i, "")
      .replace(/_darkmode/i, "");
    if (cleanedAllmode !== cleanPrefix) {
      candidates.push(cleanedAllmode);
      candidates.push(cleanedAllmode + "_allmode.png");
      candidates.push(cleanedAllmode + ".png");
    }

    const uniqueCandidates = Array.from(new Set(candidates));
    const headers = { 'User-Agent': 'MLBB-Draft-Simulator-Builder/1.0 (dev@aistudio.build)' };
    
    let buffer: Buffer | null = null;
    let successfulUrl = "";
    
    for (const cand of uniqueCandidates) {
      // Spaces must be converted to underscores for MediaWiki Commons standard
      const lpFilename = cand.replace(/\s+/g, "_");
      const md5 = crypto.createHash("md5").update(lpFilename).digest("hex");
      const url = `https://liquipedia.net/commons/images/${md5[0]}/${md5.slice(0, 2)}/${lpFilename}`;
      
      console.log(`[Repair] Trying direct download for: ${filename} (candidate: ${lpFilename})`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      try {
        const imgRes = await fetch(url, { headers, signal: controller.signal });
        clearTimeout(timeoutId);
        if (imgRes.ok) {
          const arrBuffer = await imgRes.arrayBuffer();
          const b = Buffer.from(arrBuffer);
          if (b.length >= 100) {
            buffer = b;
            successfulUrl = url;
            break;
          }
        }
      } catch (e: any) {
        clearTimeout(timeoutId);
        console.warn(`[Repair] Direct fetch failed for ${lpFilename}:`, e.message);
      }
    }
    
    // Fallback: If direct downloads fail, try Liquipedia Search API (original query mode)
    if (!buffer) {
      console.log(`[Repair] Direct downloads failed for ${filename}. Trying Liquipedia Search API fallback.`);
      const titles: string[] = uniqueCandidates.map(c => `File:${c.replace(/\s+/g, "_")}`);
      const titlesParam = titles.map(encodeURIComponent).join("|");
      const apiUrl = `https://liquipedia.net/mobilelegends/api.php?action=query&titles=${titlesParam}&prop=imageinfo&iiprop=url&format=json`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      try {
        const apiRes = await fetch(apiUrl, { headers, signal: controller.signal }); if (apiRes.status === 429) { console.log("[Repair] Hit 429 rate limit. Passing."); return false; }
        clearTimeout(timeoutId);
        if (apiRes.ok) {
          const apiData: any = await apiRes.json();
          const pages = apiData?.query?.pages || {};
          let downloadUrl = "";
          for (const pageId of Object.keys(pages)) {
            const page = pages[pageId];
            if (page && page.imageinfo && page.imageinfo[0] && page.imageinfo[0].url) {
              downloadUrl = page.imageinfo[0].url;
              break;
            }
          }
          if (downloadUrl) {
            console.log(`[Repair] API Fallback downloading from: ${downloadUrl}`);
            const imgController = new AbortController();
            const imgTimeoutId = setTimeout(() => imgController.abort(), 15000);
            const imgRes = await fetch(downloadUrl, { headers, signal: imgController.signal });
            imgTimeoutId; // suppress unused warning
            if (imgRes.ok) {
              const b = Buffer.from(await imgRes.arrayBuffer());
              if (b.length >= 100) {
                buffer = b;
                successfulUrl = downloadUrl;
              }
            }
            clearTimeout(imgTimeoutId);
          }
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        console.error(`[Repair] API Fallback search failed for ${filename}:`, err.message);
      }
    }
    
    if (!buffer) {
      console.warn(`[Repair] Could not retrieve any valid image for ${filename}`);
      return false;
    }
    
    // Create folders if they don't exist
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write original uncorrupted image buffer to disk!
    fs.writeFileSync(filePath, buffer);
    console.log(`[Repair] Successfully repaired and saved ${filename} (${buffer.length} bytes) from ${successfulUrl}`);
    return true;
  } catch (err: any) {
    console.error(`[Repair] Failed to repair ${relativePath}:`, err.message);
    return false;
  }
}

// Setup dev server or static static assets route
async function startServer() {
  // Always serve raw assets from process.cwd() directly through /raw-assets route first, repairing on-demand if corrupted or missing
  
// ——— SCRAPER STATUS ———
app.get('/api/scraper/status', (req, res) => {
  try {
    const db = getDb();
    res.json({
      dbHealth: getDbHealth(db),
      queueStatus: getGatewayQueueStatus(),
      currentPatch: '2.1.61',
      heroCount: 132,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ——— TRIGGER SCRAPE: Semua Heroes ———
app.post('/api/scraper/trigger/heroes', async (req, res) => {
  const { force = false } = req.body || {};

  res.json({
    message: 'Hero batch scrape queued. Results akan tersimpan ke DB secara bertahap.',
    heroCount: 132,
    estimatedMinutes: '~132 heroes × 32 detik/hero ≈ 71 menit (parseQueue)',
  });

  batchScrapeHeroes(force).catch(err =>
    console.error('[Server] Batch hero scrape error:', err)
  );
});

// ——— TRIGGER SCRAPE: Satu Hero ———
app.post('/api/scraper/trigger/hero/:heroId', async (req, res) => {
  const { heroId } = req.params;
  const { force = false } = req.body || {};

  try {
    const result = await scrapeAndSaveHero(heroId, force);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ——— TRIGGER SCRAPE: Tournament Stats (MPL) ———
app.post('/api/scraper/trigger/tournament-stats', async (req, res) => {
  const { tournamentId = 'MPL-ID-S17', force = false } = req.body || {};

  res.json({ message: `Scraping stats untuk: ${tournamentId}` });

  // Page name mapping is resolved inside tournament-scraper
  const pageName = 'MPL/Indonesia/Season_17/Statistics'; 
  scrapeTournamentStats(tournamentId, pageName, force).catch(err => 
    console.error('[Server] Tournament stats scrape error:', err)
  );
});

// ——— GET HEROES FROM DB (NEW ENDPOINT) ———
app.get('/api/db/heroes', (req, res) => {
  try {
    const db = getDb();
    const { tier, minQuality = 0 } = req.query;

    let query = 'SELECT * FROM heroes WHERE data_quality >= ?';
    const params: any[] = [Number(minQuality)];

    if (tier) {
      query += ' AND tier_rating = ?';
      params.push(tier);
    }

    const heroes = db.prepare(query + ' ORDER BY tier_score DESC, hero_name ASC').all(...params);
    res.json(heroes.map((h: any) => ({
      ...h,
      roles: JSON.parse(h.roles || '[]'),
      lanes: JSON.parse(h.lanes || '[]'),
      skills: JSON.parse(h.skills || '{}'),
      counters: JSON.parse(h.counters || '[]'),
      synergies: JSON.parse(h.synergies || '[]'),
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ——— DB HEALTH CHECK ———
app.get('/api/db/health', (req, res) => {
  try {
    const db = getDb();
    res.json({
      health: getDbHealth(db),
      queueStatus: getGatewayQueueStatus(),
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


  app.get("/raw-assets/*", async (req, res) => {
    const relPath = decodeURIComponent(req.params[0]);
    const filePath = path.join(process.cwd(), relPath);

    let needRepair = false;
    if (!fs.existsSync(filePath)) {
      needRepair = true;
    } else {
      try {
        const stat = fs.statSync(filePath);
        if (stat.size === 0) {
          needRepair = true;
        } else {
          const fd = fs.openSync(filePath, "r");
          const buffer = Buffer.alloc(3);
          const bytesRead = fs.readSync(fd, buffer, 0, 3, 0);
          fs.closeSync(fd);
          if (buffer.toString("hex") === "efbfbd") {
            needRepair = true;
          }
        }
      } catch (e) {
        needRepair = true;
      }
    }

    if (needRepair) {
      const success = await repairAsset(filePath, relPath);
      if (!success) {
        console.warn(`[Repair] Serving transparent 1x1 pixel fallback for ${relPath}`);
        // Transparent 1x1 Pixel PNG
        const transparentPng = Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
          "base64"
        );
        res.type("image/png");
        return res.send(transparentPng);
      }
    }

    res.sendFile(filePath);
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: { port: 24680 } },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));

    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Backend server successfully running on port ${PORT}`);
  });
}

startServer();
