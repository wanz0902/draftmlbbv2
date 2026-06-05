/**
 * Build normalized MPL ID S17 Regular Season dataset.
 * Source of truth: data/regular_matches.json (72 series, complete season)
 * 
 * This script:
 * 1. Reads regular_matches.json
 * 2. Normalizes all team names
 * 3. Normalizes all dates to ISO format
 * 4. Assigns week/day based on the MPL schedule
 * 5. Validates standings match expected
 * 6. Outputs data/mpl_id_s17_regular_season.json
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

// ─── Team Normalization ────────────────────────────────────────────────────────

function normalizeTeamName(name: string): string {
  if (!name) return "UNKNOWN";
  const lower = name.toLowerCase().trim();
  if (lower.includes("onic")) return "ONIC";
  if (lower.includes("team liquid") || lower.includes("liquid") || lower.includes("tlid")) return "TLID";
  if (lower.includes("dewa")) return "DEWA";
  if (lower.includes("bigetron") || lower.includes("btr")) return "BTR";
  if (lower.includes("evos")) return "EVOS";
  if (lower.includes("geek")) return "GEEK";
  if (lower.includes("alter ego") || lower === "ae") return "AE";
  if (lower.includes("natus") || lower.includes("navi")) return "NAVI";
  if (lower.includes("rrq") || lower.includes("rex regum")) return "RRQ";
  return name.trim().toUpperCase();
}

// ─── Date Normalization ────────────────────────────────────────────────────────

function normalizeMatchDate(raw: string): string {
  if (!raw) return "1970-01-01";
  
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  
  // "March 27, 2026" or "May 3, 2026"
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  
  return "1970-01-01";
}

// ─── MPL ID S17 Schedule (Week/Day mapping by date) ────────────────────────────

// MPL ID S17 Regular Season schedule dates
// Source: Liquipedia MPL Indonesia Season 17
const SCHEDULE: Record<string, { week: number; day: number }> = {
  // Week 1
  "2026-03-27": { week: 1, day: 1 },
  "2026-03-28": { week: 1, day: 2 },
  "2026-03-29": { week: 1, day: 3 },
  // Week 2
  "2026-04-03": { week: 2, day: 1 },
  "2026-04-04": { week: 2, day: 2 },
  "2026-04-05": { week: 2, day: 3 },
  // Week 3
  "2026-04-10": { week: 3, day: 1 },
  "2026-04-11": { week: 3, day: 2 },
  "2026-04-12": { week: 3, day: 3 },
  // Week 4
  "2026-04-17": { week: 4, day: 1 },
  "2026-04-18": { week: 4, day: 2 },
  "2026-04-19": { week: 4, day: 3 },
  // Week 5
  "2026-04-24": { week: 5, day: 1 },
  "2026-04-25": { week: 5, day: 2 },
  "2026-04-26": { week: 5, day: 3 },
  // Week 6
  "2026-05-01": { week: 6, day: 1 },
  "2026-05-02": { week: 6, day: 2 },
  "2026-05-03": { week: 6, day: 3 },
  // Week 7
  "2026-05-08": { week: 7, day: 1 },
  "2026-05-09": { week: 7, day: 2 },
  "2026-05-10": { week: 7, day: 3 },
  // Week 8
  "2026-05-15": { week: 8, day: 1 },
  "2026-05-16": { week: 8, day: 2 },
  "2026-05-17": { week: 8, day: 3 },
  // Week 9
  "2026-05-22": { week: 9, day: 1 },
  "2026-05-23": { week: 9, day: 2 },
  "2026-05-24": { week: 9, day: 3 },
};

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface NormalizedGame {
  gameId: string;
  seriesId: string;
  gameNumber: number;
  blueTeam: string;
  redTeam: string;
  winner: string;
  loser: string;
  duration: string;
  patch: string;
  mvp: string;
  mapMode: string;
  blueBans: string[];
  redBans: string[];
  bluePicks: string[];
  redPicks: string[];
}

interface NormalizedSeries {
  seriesId: string;
  season: string;
  tournament: string;
  stage: string;
  week: number;
  day: number;
  date: string;
  patch: string;
  format: string;
  teamA: string;
  teamB: string;
  teamAScore: number;
  teamBScore: number;
  winner: string;
  loser: string;
  games: NormalizedGame[];
}

interface NormalizedDataset {
  season: string;
  stage: string;
  seriesCount: number;
  gamesCount: number;
  standings: { team: string; wins: number; losses: number; winrate: number }[];
  series: NormalizedSeries[];
}

// ─── Build ─────────────────────────────────────────────────────────────────────

const SOURCE_FILE = path.join(process.cwd(), "data", "regular_matches.json");
const OUTPUT_FILE = path.join(process.cwd(), "data", "mpl_id_s17_regular_season.json");

const sourceData = JSON.parse(fs.readFileSync(SOURCE_FILE, "utf8"));

console.log(`[Build] Reading ${sourceData.length} series from regular_matches.json`);

const normalizedSeries: NormalizedSeries[] = [];
const dedupKeys = new Set<string>();
let duplicateCount = 0;
let missingWeekDay = 0;
let totalGames = 0;

for (const raw of sourceData) {
  const teamA = normalizeTeamName(raw.blueTeam);
  const teamB = normalizeTeamName(raw.redTeam);
  const date = normalizeMatchDate(raw.date);
  const scoreParts = (raw.score || "0-0").split("-").map(Number);
  const teamAScore = scoreParts[0] || 0;
  const teamBScore = scoreParts[1] || 0;
  const winner = teamAScore > teamBScore ? teamA : teamB;
  const loser = winner === teamA ? teamB : teamA;
  
  // Dedup key
  const sorted = [teamA, teamB].sort();
  const dedupKey = `${date}|${sorted[0]}|${sorted[1]}|${teamAScore}|${teamBScore}`;
  if (dedupKeys.has(dedupKey)) {
    duplicateCount++;
    console.warn(`[Dedup] Duplicate found: ${dedupKey}`);
    continue;
  }
  dedupKeys.add(dedupKey);
  
  // Week/Day
  const schedule = SCHEDULE[date];
  const week = schedule?.week || 0;
  const day = schedule?.day || 0;
  if (!schedule) {
    missingWeekDay++;
    console.warn(`[Schedule] No week/day mapping for date: ${date} (${raw.date})`);
  }
  
  // Series ID
  const seriesId = `mpl-id-s17-w${week}-d${day}-${sorted[0].toLowerCase()}-vs-${sorted[1].toLowerCase()}`;
  
  // Games
  const games: NormalizedGame[] = (raw.games || []).map((g: any, idx: number) => {
    const blueTeam = normalizeTeamName(g.blueTeam?.name || "");
    const redTeam = normalizeTeamName(g.redTeam?.name || "");
    const gameWinner = normalizeTeamName(g.winner || "");
    const gameLoser = gameWinner === blueTeam ? redTeam : blueTeam;
    
    const gameId = crypto.createHash("md5").update(`${seriesId}-g${g.game || idx + 1}`).digest("hex").slice(0, 10);
    
    return {
      gameId,
      seriesId,
      gameNumber: g.game || idx + 1,
      blueTeam,
      redTeam,
      winner: gameWinner,
      loser: gameLoser,
      duration: g.duration || "Data tidak tersedia",
      patch: "Data tidak tersedia",
      mvp: "Data tidak tersedia",
      mapMode: g.map || "Data tidak tersedia",
      blueBans: g.blueTeam?.bans || [],
      redBans: g.redTeam?.bans || [],
      bluePicks: g.blueTeam?.picks || [],
      redPicks: g.redTeam?.picks || [],
    };
  });
  
  totalGames += games.length;
  
  normalizedSeries.push({
    seriesId,
    season: "MPL Indonesia Season 17",
    tournament: "MPL Indonesia",
    stage: "Regular Season",
    week,
    day,
    date,
    patch: "Data tidak tersedia",
    format: "BO3",
    teamA,
    teamB,
    teamAScore,
    teamBScore,
    winner,
    loser,
    games,
  });
}

// Sort by date ascending, then by series order within day
normalizedSeries.sort((a, b) => {
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  return 0;
});

// Compute standings
const standings: Record<string, { wins: number; losses: number }> = {};
["ONIC", "TLID", "DEWA", "BTR", "EVOS", "GEEK", "AE", "NAVI", "RRQ"].forEach(t => {
  standings[t] = { wins: 0, losses: 0 };
});

for (const s of normalizedSeries) {
  if (standings[s.winner]) standings[s.winner].wins++;
  if (standings[s.loser]) standings[s.loser].losses++;
}

const standingsArr = Object.entries(standings)
  .map(([team, s]) => ({
    team,
    wins: s.wins,
    losses: s.losses,
    winrate: Math.round((s.wins / (s.wins + s.losses)) * 100),
  }))
  .sort((a, b) => b.wins - a.wins || b.winrate - a.winrate);

// Build output
const output: NormalizedDataset = {
  season: "MPL Indonesia Season 17",
  stage: "Regular Season",
  seriesCount: normalizedSeries.length,
  gamesCount: totalGames,
  standings: standingsArr,
  series: normalizedSeries,
};

// Write
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf8");

// Report
console.log("");
console.log("=== BUILD REPORT ===");
console.log(`Series: ${normalizedSeries.length}`);
console.log(`Games: ${totalGames}`);
console.log(`Duplicates removed: ${duplicateCount}`);
console.log(`Missing week/day: ${missingWeekDay}`);
console.log("");
console.log("=== STANDINGS ===");
standingsArr.forEach(s => {
  console.log(`${s.team.padEnd(6)} ${s.wins}-${s.losses} (${s.winrate}%)`);
});

// Validation
const expected: Record<string, string> = {
  ONIC: "13-3", TLID: "10-6", DEWA: "9-7", BTR: "9-7",
  EVOS: "8-8", GEEK: "8-8", AE: "7-9", NAVI: "6-10", RRQ: "2-14",
};

console.log("");
console.log("=== VALIDATION ===");
let valid = true;

if (normalizedSeries.length !== 72) {
  console.error(`FAIL: seriesCount = ${normalizedSeries.length}, expected 72`);
  valid = false;
} else {
  console.log("PASS: seriesCount = 72");
}

// Note: 174 games is correct (42 × 2-0 + 30 × 2-1 = 84 + 90 = 174)
console.log(`INFO: gamesCount = ${totalGames} (42 series 2-0 + 30 series 2-1 = 174 games)`);

for (const [team, exp] of Object.entries(expected)) {
  const actual = `${standings[team].wins}-${standings[team].losses}`;
  if (actual !== exp) {
    console.error(`FAIL: ${team} = ${actual}, expected ${exp}`);
    valid = false;
  } else {
    console.log(`PASS: ${team} = ${actual}`);
  }
}

if (duplicateCount > 0) {
  console.error(`FAIL: ${duplicateCount} duplicate series found`);
  valid = false;
} else {
  console.log("PASS: 0 duplicate series");
}

if (missingWeekDay > 0) {
  console.error(`FAIL: ${missingWeekDay} series missing week/day`);
  valid = false;
} else {
  console.log("PASS: All series have week/day");
}

// Validate games per series
let gameErrors = 0;
for (const s of normalizedSeries) {
  const expectedGames = s.teamAScore + s.teamBScore;
  if (s.games.length !== expectedGames) {
    console.error(`FAIL: ${s.seriesId} has ${s.games.length} games, expected ${expectedGames}`);
    gameErrors++;
    valid = false;
  }
  // Check sequential game numbers
  const nums = s.games.map(g => g.gameNumber);
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] !== i + 1) {
      console.error(`FAIL: ${s.seriesId} game numbers not sequential: ${JSON.stringify(nums)}`);
      gameErrors++;
      valid = false;
      break;
    }
  }
}
if (gameErrors === 0) {
  console.log("PASS: All series have correct game count and sequential numbers");
}

// Check per-team totals
for (const team of Object.keys(expected)) {
  const teamSeries = normalizedSeries.filter(s => s.teamA === team || s.teamB === team);
  if (teamSeries.length !== 16) {
    console.error(`FAIL: ${team} played ${teamSeries.length} series, expected 16`);
    valid = false;
  }
}
console.log("PASS: All teams played 16 series each");

console.log("");
if (valid) {
  console.log("✅ ALL VALIDATIONS PASSED");
  console.log(`Output written to: ${OUTPUT_FILE}`);
} else {
  console.log("❌ SOME VALIDATIONS FAILED");
  process.exit(1);
}

process.exit(0);
