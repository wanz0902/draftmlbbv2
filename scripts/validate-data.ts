/**
 * READ-ONLY MLBB data validation script.
 *
 * This script NEVER writes to any file or database. It only reads:
 *   - src/data/heroes_master.json
 *   - data/heroes/ (directory of individual hero json files)
 *   - data/mpl_id_s17_regular_season.json
 *
 * Run with: npm run validate:data
 *
 * Exit codes:
 *   0 -> zero errors (warnings allowed)
 *   1 -> one or more errors
 */

import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Types (loose — the script defends against malformed data at runtime)
// ---------------------------------------------------------------------------
interface HeroMaster {
  hero_name?: unknown;
  [key: string]: unknown;
}

interface Game {
  gameId?: unknown;
  seriesId?: unknown;
  gameNumber?: unknown;
  blueTeam?: unknown;
  redTeam?: unknown;
  winner?: unknown;
  loser?: unknown;
  blueBans?: unknown;
  redBans?: unknown;
  bluePicks?: unknown;
  redPicks?: unknown;
  [key: string]: unknown;
}

interface Series {
  seriesId?: unknown;
  format?: unknown;
  teamA?: unknown;
  teamB?: unknown;
  teamAScore?: unknown;
  teamBScore?: unknown;
  winner?: unknown;
  loser?: unknown;
  games?: unknown;
  [key: string]: unknown;
}

interface MatchData {
  series?: unknown;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Reporting helpers
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
// Small utilities
// ---------------------------------------------------------------------------
const EXPECTED_TEAMS = ['AE', 'BTR', 'DEWA', 'EVOS', 'GEEK', 'NAVI', 'ONIC', 'RRQ', 'TLID'];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeTeam(value: unknown): string {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function sameTeam(a: unknown, b: unknown): boolean {
  return normalizeTeam(a) !== '' && normalizeTeam(a) === normalizeTeam(b);
}

// ---------------------------------------------------------------------------
// Resolve paths relative to the current working directory
// ---------------------------------------------------------------------------
const CWD = process.cwd();
const HEROES_MASTER_PATH = path.join(CWD, 'src', 'data', 'heroes_master.json');
const HEROES_DIR_PATH = path.join(CWD, 'data', 'heroes');
const MATCH_DATA_PATH = path.join(CWD, 'data', 'mpl_id_s17_regular_season.json');

const HEROES_MASTER_REL = path.relative(CWD, HEROES_MASTER_PATH);
const HEROES_DIR_REL = path.relative(CWD, HEROES_DIR_PATH);
const MATCH_DATA_REL = path.relative(CWD, MATCH_DATA_PATH);

// ---------------------------------------------------------------------------
// Report values populated during validation
// ---------------------------------------------------------------------------
let heroCount = 0;
let heroesDirFileCount = 0;
let seriesCount = 0;
let gameCount = 0;
const teamIdsFound = new Set<string>();

// ===========================================================================
// 1. Hero checks (heroes_master.json)
// ===========================================================================
function validateHeroes(): void {
  let raw: string;
  try {
    raw = fs.readFileSync(HEROES_MASTER_PATH, 'utf-8');
  } catch {
    addError(HEROES_MASTER_REL, 'file', 'Required hero master file is missing or unreadable.');
    return;
  }

  let heroes: HeroMaster[];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      addError(HEROES_MASTER_REL, 'root', 'Expected an array of hero objects.');
      return;
    }
    heroes = parsed as HeroMaster[];
  } catch (err) {
    addError(HEROES_MASTER_REL, 'parse', `Failed to parse JSON: ${(err as Error).message}`);
    return;
  }

  heroCount = heroes.length;

  // Check 1: count must equal 132
  if (heroCount !== 132) {
    addError(HEROES_MASTER_REL, 'count', `Expected 132 heroes, found ${heroCount}.`);
  }

  // Check 2 & 3: duplicates and empty/null names
  const seen = new Map<string, number>();
  heroes.forEach((hero, index) => {
    const name = hero?.hero_name;
    if (!isNonEmptyString(name)) {
      addError(HEROES_MASTER_REL, `index ${index}`, 'Hero has an empty/null hero_name.');
      return;
    }
    const key = name.trim().toLowerCase();
    const prev = seen.get(key);
    if (prev !== undefined) {
      addError(
        HEROES_MASTER_REL,
        `index ${index}`,
        `Duplicate hero name "${name}" (first seen at index ${prev}).`,
      );
    } else {
      seen.set(key, index);
    }
  });
}

// ===========================================================================
// 4. data/heroes/ directory checks
// ===========================================================================
function validateHeroesDir(): void {
  let entries: string[];
  try {
    entries = fs.readdirSync(HEROES_DIR_PATH);
  } catch {
    addWarning(HEROES_DIR_REL, 'directory', 'Could not read data/heroes/ directory.');
    return;
  }

  heroesDirFileCount = entries.filter((f) => f.toLowerCase().endsWith('.json')).length;

  if (heroesDirFileCount !== 132) {
    addWarning(
      HEROES_DIR_REL,
      'file count',
      `Expected 132 .json files, found ${heroesDirFileCount} (directory count vs roster).`,
    );
  }
}

// ===========================================================================
// 5-21. Match data checks
// ===========================================================================
function validateMatchData(): void {
  let raw: string;
  try {
    raw = fs.readFileSync(MATCH_DATA_PATH, 'utf-8');
  } catch {
    // Check 5: fatal — file missing
    addError(MATCH_DATA_REL, 'file', 'Required match data file is missing or unreadable (fatal).');
    return;
  }

  let data: MatchData;
  try {
    data = JSON.parse(raw) as MatchData;
  } catch (err) {
    addError(MATCH_DATA_REL, 'parse', `Failed to parse JSON: ${(err as Error).message}`);
    return;
  }

  // Check 6: series array readable
  if (!Array.isArray(data.series)) {
    addError(MATCH_DATA_REL, 'series', 'Expected a "series" array.');
    return;
  }

  const series = data.series as Series[];
  seriesCount = series.length;

  if (seriesCount === 0) {
    addError(MATCH_DATA_REL, 'series', 'Series count is 0.');
  }

  series.forEach((s, sIndex) => {
    const seriesId = isNonEmptyString(s?.seriesId) ? s.seriesId : `<index ${sIndex}>`;
    const loc = (extra?: string) =>
      extra ? `series ${seriesId} (#${sIndex}) ${extra}` : `series ${seriesId} (#${sIndex})`;

    // Check 8: seriesId present
    if (!isNonEmptyString(s?.seriesId)) {
      addError(MATCH_DATA_REL, loc(), 'Series is missing "seriesId".');
    }

    // Check 9: teamA and teamB present
    if (!isNonEmptyString(s?.teamA)) {
      addError(MATCH_DATA_REL, loc(), 'Series is missing "teamA".');
    }
    if (!isNonEmptyString(s?.teamB)) {
      addError(MATCH_DATA_REL, loc(), 'Series is missing "teamB".');
    }

    // Check 10: format present
    if (!isNonEmptyString(s?.format)) {
      addWarning(MATCH_DATA_REL, loc(), 'Series is missing "format".');
    }

    // Check 11: winner present
    if (!isNonEmptyString(s?.winner)) {
      addWarning(MATCH_DATA_REL, loc(), 'Series is missing "winner".');
    }

    // Check 13: winner is a participant
    if (isNonEmptyString(s?.winner)) {
      if (!sameTeam(s.winner, s.teamA) && !sameTeam(s.winner, s.teamB)) {
        addError(
          MATCH_DATA_REL,
          loc(),
          `Series winner "${s.winner}" is not a participant (teamA="${s.teamA}", teamB="${s.teamB}").`,
        );
      }
    }

    // Check 14: higher score corresponds to winner
    const aScore = s?.teamAScore;
    const bScore = s?.teamBScore;
    if (typeof aScore === 'number' && typeof bScore === 'number' && isNonEmptyString(s?.winner)) {
      if (aScore !== bScore) {
        const higherTeam = aScore > bScore ? s.teamA : s.teamB;
        if (!sameTeam(higherTeam, s.winner)) {
          addWarning(
            MATCH_DATA_REL,
            loc(),
            `Score/winner conflict: teamAScore=${aScore}, teamBScore=${bScore}, but winner="${s.winner}".`,
          );
        }
      }
    }

    // Check 12: games array present
    if (!Array.isArray(s?.games)) {
      addError(MATCH_DATA_REL, loc(), 'Series is missing a "games" array (or it is not an array).');
      return;
    }

    const games = s.games as Game[];
    gameCount += games.length;

    games.forEach((g, gIndex) => {
      const hasGameId = isNonEmptyString(g?.gameId);
      const hasGameNumber = typeof g?.gameNumber === 'number' || isNonEmptyString(g?.gameNumber);
      const gameLabel = hasGameId
        ? `game ${g.gameId}`
        : hasGameNumber
          ? `game #${String(g.gameNumber)}`
          : `game @index ${gIndex}`;
      const gLoc = `${loc()} :: ${gameLabel}`;

      // Check 15: gameId or gameNumber present
      if (!hasGameId && !hasGameNumber) {
        addError(MATCH_DATA_REL, gLoc, 'Game has neither "gameId" nor "gameNumber".');
      }

      // Check 16: blueTeam and redTeam present
      if (!isNonEmptyString(g?.blueTeam)) {
        addError(MATCH_DATA_REL, gLoc, 'Game is missing "blueTeam".');
      }
      if (!isNonEmptyString(g?.redTeam)) {
        addError(MATCH_DATA_REL, gLoc, 'Game is missing "redTeam".');
      }

      // Check 17: winner present
      if (!isNonEmptyString(g?.winner)) {
        addError(MATCH_DATA_REL, gLoc, 'Game is missing "winner".');
      }

      // Check 18 & 19: pick/ban arrays
      const arrayFields: Array<keyof Game> = ['bluePicks', 'redPicks', 'blueBans', 'redBans'];
      for (const field of arrayFields) {
        const value = g?.[field];
        if (!Array.isArray(value)) {
          addError(MATCH_DATA_REL, gLoc, `"${field}" is not an array.`);
          continue;
        }
        // Check 19: empty/null hero names
        value.forEach((entry, eIndex) => {
          if (!isNonEmptyString(entry)) {
            addWarning(
              MATCH_DATA_REL,
              gLoc,
              `"${field}"[${eIndex}] contains an empty/null hero name.`,
            );
          }
        });
      }

      // Check 20: game winner is blueTeam/redTeam
      if (isNonEmptyString(g?.winner)) {
        if (!sameTeam(g.winner, g.blueTeam) && !sameTeam(g.winner, g.redTeam)) {
          addError(
            MATCH_DATA_REL,
            gLoc,
            `Game winner "${g.winner}" is not a participant (blueTeam="${g.blueTeam}", redTeam="${g.redTeam}").`,
          );
        }
      }

      // Check 21: blueTeam/redTeam are participants of parent series
      if (isNonEmptyString(g?.blueTeam)) {
        if (!sameTeam(g.blueTeam, s.teamA) && !sameTeam(g.blueTeam, s.teamB)) {
          addWarning(
            MATCH_DATA_REL,
            gLoc,
            `blueTeam "${g.blueTeam}" is not a series participant (teamA="${s.teamA}", teamB="${s.teamB}").`,
          );
        }
      }
      if (isNonEmptyString(g?.redTeam)) {
        if (!sameTeam(g.redTeam, s.teamA) && !sameTeam(g.redTeam, s.teamB)) {
          addWarning(
            MATCH_DATA_REL,
            gLoc,
            `redTeam "${g.redTeam}" is not a series participant (teamA="${s.teamA}", teamB="${s.teamB}").`,
          );
        }
      }

      // Check 22: collect team identifiers
      if (isNonEmptyString(g?.blueTeam)) teamIdsFound.add(normalizeTeam(g.blueTeam));
      if (isNonEmptyString(g?.redTeam)) teamIdsFound.add(normalizeTeam(g.redTeam));
    });
  });

  // Check 22: report unexpected teams
  const expectedSet = new Set(EXPECTED_TEAMS.map((t) => t.toUpperCase()));
  for (const team of teamIdsFound) {
    if (!expectedSet.has(team)) {
      addWarning(
        MATCH_DATA_REL,
        'team set',
        `Unexpected team identifier "${team}" not in expected set [${EXPECTED_TEAMS.join(', ')}].`,
      );
    }
  }
}

// ===========================================================================
// Report
// ===========================================================================
function printReport(): void {
  const sortedTeams = [...teamIdsFound].sort();

  console.log('========================================');
  console.log('  MLBB DATA VALIDATION REPORT');
  console.log('========================================');
  console.log(`Hero count: ${heroCount}`);
  console.log(`data/heroes/ files: ${heroesDirFileCount}`);
  console.log(`Series count: ${seriesCount}`);
  console.log(`Game count: ${gameCount}`);
  console.log(`Team IDs found: ${sortedTeams.join(', ')} (${sortedTeams.length})`);
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
// Hero stats duplicate/collision check (data/heroes_stats.json)
// ===========================================================================
function validateHeroStats(): void {
  const statsPath = path.join(CWD, 'data', 'heroes_stats.json');
  const statsRel = path.relative(CWD, statsPath);

  let raw: string;
  try {
    raw = fs.readFileSync(statsPath, 'utf-8');
  } catch {
    addWarning(statsRel, 'file', 'Hero stats file not found (optional).');
    return;
  }

  let stats: any[];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    stats = parsed;
  } catch {
    addWarning(statsRel, 'parse', 'Could not parse hero stats JSON.');
    return;
  }

  // Check for duplicate normalized hero names
  const seen = new Map<string, number>();
  stats.forEach((entry, index) => {
    const name = typeof entry?.hero_name === 'string' ? entry.hero_name.trim() : '';
    if (!name) {
      addWarning(statsRel, `index ${index}`, 'Hero stats entry has empty hero_name.');
      return;
    }
    const norm = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const prev = seen.get(norm);
    if (prev !== undefined) {
      addError(
        statsRel,
        `index ${index}`,
        `Duplicate normalized hero name "${name}" (normalized: "${norm}") — first at index ${prev}. This may cause dedup/collision issues.`,
      );
    } else {
      seen.set(norm, index);
    }
  });
}

// ===========================================================================
// Main
// ===========================================================================
function main(): void {
  validateHeroes();
  validateHeroesDir();
  validateHeroStats();
  validateMatchData();
  printReport();
  process.exit(errors.length === 0 ? 0 : 1);
}

main();
