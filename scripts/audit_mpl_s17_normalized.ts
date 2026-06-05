/**
 * Audit script for MPL ID S17 Regular Season normalized dataset.
 * Exits with code 1 if any validation fails.
 */

import fs from "fs";
import path from "path";

const DATASET_PATH = path.join(process.cwd(), "data", "mpl_id_s17_regular_season.json");

if (!fs.existsSync(DATASET_PATH)) {
  console.error("FAIL: Normalized dataset not found at " + DATASET_PATH);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(DATASET_PATH, "utf8"));
let errors = 0;

function check(condition: boolean, msg: string) {
  if (condition) {
    console.log("PASS: " + msg);
  } else {
    console.error("FAIL: " + msg);
    errors++;
  }
}

console.log("=== MPL ID S17 NORMALIZED DATASET AUDIT ===\n");

// 1. Total Series
check(data.seriesCount === 72, `seriesCount = ${data.seriesCount} (expected 72)`);
check(data.series.length === 72, `series array length = ${data.series.length} (expected 72)`);

// 2. Total Games
check(data.gamesCount === 174, `gamesCount = ${data.gamesCount} (expected 174 = 42×2 + 30×3)`);
let actualGames = 0;
data.series.forEach((s: any) => { actualGames += s.games.length; });
check(actualGames === 174, `actual games in series = ${actualGames} (expected 174)`);

// 3. Standings
const expected: Record<string, { w: number; l: number }> = {
  ONIC: { w: 13, l: 3 }, TLID: { w: 10, l: 6 }, DEWA: { w: 9, l: 7 },
  BTR: { w: 9, l: 7 }, EVOS: { w: 8, l: 8 }, GEEK: { w: 8, l: 8 },
  AE: { w: 7, l: 9 }, NAVI: { w: 6, l: 10 }, RRQ: { w: 2, l: 14 },
};

// Compute standings from data
const computed: Record<string, { w: number; l: number }> = {};
Object.keys(expected).forEach(t => { computed[t] = { w: 0, l: 0 }; });
for (const s of data.series) {
  if (computed[s.winner]) computed[s.winner].w++;
  if (computed[s.loser]) computed[s.loser].l++;
}

console.log("\n--- Standings Validation ---");
for (const [team, exp] of Object.entries(expected)) {
  const act = computed[team] || { w: 0, l: 0 };
  check(act.w === exp.w && act.l === exp.l, `${team}: ${act.w}-${act.l} (expected ${exp.w}-${exp.l})`);
}

// 4. Per team = 16 series each
console.log("\n--- Team Appearance Count ---");
for (const team of Object.keys(expected)) {
  const count = data.series.filter((s: any) => s.teamA === team || s.teamB === team).length;
  check(count === 16, `${team} played ${count} series (expected 16)`);
}

// 5. Duplicate series
console.log("\n--- Duplicate Detection ---");
const dedupKeys = new Set<string>();
let dupes = 0;
for (const s of data.series) {
  const sorted = [s.teamA, s.teamB].sort();
  const key = `${s.date}|${sorted[0]}|${sorted[1]}|${s.teamAScore}|${s.teamBScore}`;
  if (dedupKeys.has(key)) {
    dupes++;
    console.error(`  Duplicate: ${key}`);
  }
  dedupKeys.add(key);
}
check(dupes === 0, `Duplicate series: ${dupes}`);

// 6. Duplicate games
let gameDupes = 0;
for (const s of data.series) {
  const gameNums = new Set<number>();
  for (const g of s.games) {
    if (gameNums.has(g.gameNumber)) {
      gameDupes++;
      console.error(`  Duplicate game ${g.gameNumber} in ${s.seriesId}`);
    }
    gameNums.add(g.gameNumber);
  }
}
check(gameDupes === 0, `Duplicate games: ${gameDupes}`);

// 7. Missing week/day
let missingWD = 0;
for (const s of data.series) {
  if (!s.week || !s.day) missingWD++;
}
check(missingWD === 0, `Missing week/day: ${missingWD}`);

// 8. Invalid dates
let invalidDates = 0;
for (const s of data.series) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.date)) {
    invalidDates++;
    console.error(`  Invalid date: ${s.date} in ${s.seriesId}`);
  }
}
check(invalidDates === 0, `Invalid dates: ${invalidDates}`);

// 9. Games per series validation
console.log("\n--- Games Per Series ---");
let gameCountErrors = 0;
for (const s of data.series) {
  const expectedGameCount = s.teamAScore + s.teamBScore;
  if (s.games.length !== expectedGameCount) {
    gameCountErrors++;
    console.error(`  ${s.seriesId}: ${s.games.length} games, expected ${expectedGameCount}`);
  }
  // Sequential check
  for (let i = 0; i < s.games.length; i++) {
    if (s.games[i].gameNumber !== i + 1) {
      gameCountErrors++;
      console.error(`  ${s.seriesId}: game numbers not sequential`);
      break;
    }
  }
}
check(gameCountErrors === 0, `Game count/sequence errors: ${gameCountErrors}`);

// 10. Week range
const weeks = new Set(data.series.map((s: any) => s.week));
check(weeks.size === 9, `Unique weeks: ${weeks.size} (expected 9), values: ${[...weeks].sort().join(",")}`);

// Summary
console.log("\n=== SUMMARY ===");
console.log(`Total series: ${data.seriesCount}`);
console.log(`Total games: ${data.gamesCount}`);
console.log(`Weeks covered: ${[...weeks].sort().join(", ")}`);
console.log(`Errors: ${errors}`);
console.log("");

if (errors === 0) {
  console.log("✅ ALL VALIDATIONS PASSED - Dataset is correct");
  process.exit(0);
} else {
  console.error(`❌ ${errors} VALIDATION(S) FAILED`);
  process.exit(1);
}
