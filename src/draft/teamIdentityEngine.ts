/**
 * Team Identity Engine
 *
 * Builds comprehensive identity profiles from ALL match history per team.
 * Derives: comfort heroes, first/second pick preferences, signature compositions,
 * hero pairings, target bans, draft tendencies, side stats, and more.
 *
 * All data derived exclusively through MatchHistoryService.
 */

import {
  TeamIdentityProfile,
  HeroPickStats,
  ComfortHero,
  PickPreference,
  SignatureComposition,
  HeroPairing,
  TargetBanProfile,
  DraftTendency,
  HeroSuccessEntry,
  ContestedHeroEntry,
  PriorityBanEntry,
} from "./draftTypes";

import { MatchHistoryService, Game, normalizeTeamName } from "../services/matchHistoryService";

/**
 * Build a comprehensive team identity profile from match history.
 *
 * @param teamId - Normalized team ID (e.g., "BTR", "ONIC", "GEEK")
 * @param matchHistoryService - Service instance with loaded match data
 * @returns TeamIdentityProfile with all derived statistics
 */
export function buildTeamIdentity(
  teamId: string,
  matchHistoryService: MatchHistoryService
): TeamIdentityProfile {
  const normalizedTeamId = normalizeTeamName(teamId);
  // Step 1: Get all matches for this team
  const response = matchHistoryService.getTeamMatches(normalizedTeamId, { result: "all" as const });
  const allSeries = response.series;

  // Step 2: Flatten all games
  const allGames: Game[] = allSeries.flatMap((series) => series.games);
  const totalGames = allGames.length;

  // Tracking structures
  const heroStatsMap = new Map<string, HeroPickStats>();
  const pairTracker = new Map<string, { count: number; wins: number }>();
  const targetBanMap = new Map<string, Map<string, number>>(); // opponent -> hero -> count

  // Side stats
  let blueGames = 0;
  let blueWins = 0;
  let redGames = 0;
  let redWins = 0;

  // Overall wins/losses
  let totalWins = 0;
  let totalLosses = 0;

  // Step 3: Process each game
  for (const game of allGames) {
    const isBlue = normalizeTeamName(game.blueTeam) === normalizedTeamId;
    const isRed = normalizeTeamName(game.redTeam) === normalizedTeamId;

    if (!isBlue && !isRed) continue;

    const teamPicks = isBlue ? game.bluePicks : game.redPicks;
    const teamBans = isBlue ? game.blueBans : game.redBans;
    const opponentBans = isBlue ? game.redBans : game.blueBans;
    const opponentId = normalizeTeamName(isBlue ? game.redTeam : game.blueTeam);
    const isWin = normalizeTeamName(game.winner) === normalizedTeamId;

    // Track side stats
    if (isBlue) {
      blueGames++;
      if (isWin) blueWins++;
    } else {
      redGames++;
      if (isWin) redWins++;
    }

    // Track overall W/L
    if (isWin) totalWins++;
    else totalLosses++;

    // Track picks with positions
    for (let i = 0; i < teamPicks.length; i++) {
      const hero = teamPicks[i];
      if (!hero) continue;

      const stats = getOrCreateHeroStats(heroStatsMap, hero);
      stats.pickCount++;
      stats.positions.push(i + 1); // 1-indexed position
      if (isWin) stats.winCount++;
      else stats.lossCount++;
    }

    // Track team bans
    for (const hero of teamBans) {
      if (!hero) continue;
      const stats = getOrCreateHeroStats(heroStatsMap, hero);
      stats.banCount++;
    }

    // Track bans against (opponent banning heroes vs this team)
    for (const hero of opponentBans) {
      if (!hero) continue;
      const stats = getOrCreateHeroStats(heroStatsMap, hero);
      stats.banAgainstCount++;
    }

    // Track target bans per opponent
    for (const hero of teamBans) {
      if (!hero) continue;
      if (!targetBanMap.has(opponentId)) {
        targetBanMap.set(opponentId, new Map());
      }
      const opponentBanCounts = targetBanMap.get(opponentId)!;
      opponentBanCounts.set(hero, (opponentBanCounts.get(hero) || 0) + 1);
    }

    // Track hero pairings (all pairs of heroes picked together)
    for (let i = 0; i < teamPicks.length; i++) {
      for (let j = i + 1; j < teamPicks.length; j++) {
        const heroA = teamPicks[i];
        const heroB = teamPicks[j];
        if (!heroA || !heroB) continue;

        const pairKey = [heroA, heroB].sort().join("|");
        if (!pairTracker.has(pairKey)) {
          pairTracker.set(pairKey, { count: 0, wins: 0 });
        }
        const pair = pairTracker.get(pairKey)!;
        pair.count++;
        if (isWin) pair.wins++;
      }
    }
  }

  // Step 4: Compute winRate for each hero
  for (const [, stats] of heroStatsMap) {
    stats.winRate = stats.pickCount > 0
      ? (stats.winCount / stats.pickCount) * 100
      : 0;
  }

  // Step 5: Derive comfort heroes (top 5, picked >= 3 times, WR > 50%)
  const comfortHeroes = deriveComfortHeroes(heroStatsMap);

  // Step 6: Derive first/second pick preferences
  const firstPickPreferences = derivePickPreferences(heroStatsMap, 1, allGames, teamId);
  const secondPickPreferences = derivePickPreferences(heroStatsMap, 2, allGames, teamId);

  // Step 7: Derive signature compositions (pairs appearing >= 3, WR > 50%)
  const signatureCompositions = deriveSignatureCompositions(pairTracker);

  // Step 8: Derive hero pairings (pairs appearing >= 2)
  const heroPairings = deriveHeroPairings(pairTracker);

  // Step 9: Compute target ban profiles per opponent
  const targetBans = deriveTargetBans(targetBanMap);

  // Step 10: Classify draft tendencies
  const draftTendencies = classifyDraftTendencies(allGames, teamId);

  // Step 11: Most successful heroes (top 5 by WR, min 2 games)
  const mostSuccessfulHeroes = deriveMostSuccessfulHeroes(heroStatsMap);

  // Step 12: Most contested heroes (top 5 by pick+ban frequency)
  const mostContestedHeroes = deriveMostContestedHeroes(heroStatsMap, totalGames);

  // Step 13: Priority bans (top 5 most frequently banned by team)
  const priorityBans = derivePriorityBans(heroStatsMap, totalGames);

  // Step 14: Build side stats
  const sideStats = {
    blue: {
      games: blueGames,
      wins: blueWins,
      winRate: blueGames > 0 ? (blueWins / blueGames) * 100 : 0,
    },
    red: {
      games: redGames,
      wins: redWins,
      winRate: redGames > 0 ? (redWins / redGames) * 100 : 0,
    },
  };

  // Step 15: Build overall stats
  const winRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;

  return {
    teamId: normalizedTeamId,
    totalGames,
    wins: totalWins,
    losses: totalLosses,
    winRate,
    heroStats: heroStatsMap,
    comfortHeroes,
    firstPickPreferences,
    secondPickPreferences,
    signatureCompositions,
    heroPairings,
    targetBans,
    draftTendencies,
    mostSuccessfulHeroes,
    mostContestedHeroes,
    priorityBans,
    sideStats,
  };
}

// ─── Helper Functions ──────────────────────────────────────────────────────────

/** Get or create a HeroPickStats entry in the map */
function getOrCreateHeroStats(
  map: Map<string, HeroPickStats>,
  heroName: string
): HeroPickStats {
  if (!map.has(heroName)) {
    map.set(heroName, {
      heroName,
      pickCount: 0,
      winCount: 0,
      lossCount: 0,
      winRate: 0,
      banCount: 0,
      banAgainstCount: 0,
      positions: [],
    });
  }
  return map.get(heroName)!;
}

/** Derive comfort heroes: top 5 picked >= 3 times with WR > 50% */
function deriveComfortHeroes(heroStatsMap: Map<string, HeroPickStats>): ComfortHero[] {
  const candidates: ComfortHero[] = [];

  for (const [, stats] of heroStatsMap) {
    if (stats.pickCount >= 3 && stats.winRate > 50) {
      candidates.push({
        heroName: stats.heroName,
        pickCount: stats.pickCount,
        winRate: stats.winRate,
        winCount: stats.winCount,
      });
    }
  }

  // Sort by pickCount descending, then winRate descending
  candidates.sort((a, b) => {
    if (b.pickCount !== a.pickCount) return b.pickCount - a.pickCount;
    return b.winRate - a.winRate;
  });

  return candidates.slice(0, 5);
}

/** Derive pick preferences at a specific position (1 = first pick, 2 = second pick) */
function derivePickPreferences(
  heroStatsMap: Map<string, HeroPickStats>,
  position: number,
  allGames: Game[],
  teamId: string
): PickPreference[] {
  // Count frequency of each hero at this position
  const positionCounts = new Map<string, { count: number; wins: number }>();
  const normalizedTeamId = normalizeTeamName(teamId);

  for (const game of allGames) {
    const isBlue = normalizeTeamName(game.blueTeam) === normalizedTeamId;
    const isRed = normalizeTeamName(game.redTeam) === normalizedTeamId;
    if (!isBlue && !isRed) continue;

    const teamPicks = isBlue ? game.bluePicks : game.redPicks;
    const isWin = normalizeTeamName(game.winner) === normalizedTeamId;

    // Position is 1-indexed, array is 0-indexed
    const hero = teamPicks[position - 1];
    if (!hero) continue;

    if (!positionCounts.has(hero)) {
      positionCounts.set(hero, { count: 0, wins: 0 });
    }
    const entry = positionCounts.get(hero)!;
    entry.count++;
    if (isWin) entry.wins++;
  }

  // Build preferences sorted by count descending
  const preferences: PickPreference[] = [];
  for (const [heroName, data] of positionCounts) {
    preferences.push({
      heroName,
      count: data.count,
      winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
    });
  }

  preferences.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.winRate - a.winRate;
  });

  return preferences.slice(0, 5);
}

/** Derive signature compositions: pairs with >= 3 co-occurrences and WR > 50% */
function deriveSignatureCompositions(
  pairTracker: Map<string, { count: number; wins: number }>
): SignatureComposition[] {
  const compositions: SignatureComposition[] = [];

  for (const [pairKey, data] of pairTracker) {
    if (data.count >= 3) {
      const winRate = (data.wins / data.count) * 100;
      if (winRate > 50) {
        const [heroA, heroB] = pairKey.split("|");
        compositions.push({
          heroes: [heroA, heroB],
          gameCount: data.count,
          winCount: data.wins,
          winRate,
        });
      }
    }
  }

  // Sort by gameCount descending, then winRate descending
  compositions.sort((a, b) => {
    if (b.gameCount !== a.gameCount) return b.gameCount - a.gameCount;
    return b.winRate - a.winRate;
  });

  return compositions;
}

/** Derive hero pairings: pairs drafted together in >= 2 games */
function deriveHeroPairings(
  pairTracker: Map<string, { count: number; wins: number }>
): HeroPairing[] {
  const pairings: HeroPairing[] = [];

  for (const [pairKey, data] of pairTracker) {
    if (data.count >= 2) {
      const [heroA, heroB] = pairKey.split("|");
      pairings.push({
        heroA,
        heroB,
        coOccurrence: data.count,
        winRate: (data.wins / data.count) * 100,
      });
    }
  }

  // Sort by co-occurrence descending
  pairings.sort((a, b) => b.coOccurrence - a.coOccurrence);

  return pairings;
}

/** Derive target ban profiles per opponent */
function deriveTargetBans(
  targetBanMap: Map<string, Map<string, number>>
): Map<string, TargetBanProfile> {
  const result = new Map<string, TargetBanProfile>();

  for (const [opponentId, heroBanCounts] of targetBanMap) {
    const bans: Array<{ heroName: string; banCount: number }> = [];
    for (const [heroName, banCount] of heroBanCounts) {
      bans.push({ heroName, banCount });
    }
    // Sort by banCount descending
    bans.sort((a, b) => b.banCount - a.banCount);

    result.set(opponentId, { opponentId, bans });
  }

  return result;
}

/** Classify draft tendencies based on first-phase picks (positions 1-3) */
function classifyDraftTendencies(
  allGames: Game[],
  teamId: string
): DraftTendency[] {
  const normalizedTeamId = normalizeTeamName(teamId);
  // Classify heroes by type for tendency analysis
  const assassins = new Set([
    "Lancelot", "Ling", "Fanny", "Hayabusa", "Gusion", "Benedetta",
    "Nolan", "Joy", "Suyou", "Sora", "Karina", "Helcurt", "Natalia",
    "Harley", "Selena", "Aamon", "Yin", "Paquito",
  ]);

  const aggressiveFighters = new Set([
    "Paquito", "Chou", "Arlott", "Martis", "Dyrroth", "Khaleed",
    "Benedetta", "Suyou", "Fredrinn", "X.Borg", "Badang",
  ]);

  const marksmen = new Set([
    "Beatrix", "Brody", "Wanwan", "Bruno", "Claude", "Karrie",
    "Moskov", "Melissa", "Clint", "Irithel", "Miya", "Layla",
    "Granger", "Popol and Kupa", "Kimmy",
  ]);

  const lateGameMages = new Set([
    "Lunox", "Cecillion", "Valentina", "Pharsa", "Kagura",
    "Lylia", "Aurora", "Luo Yi",
  ]);

  const junglers = new Set([
    "Ling", "Lancelot", "Fanny", "Hayabusa", "Gusion", "Nolan",
    "Joy", "Roger", "Karina", "Alucard", "Suyou", "Sora",
  ]);

  const tanks = new Set([
    "Khufra", "Atlas", "Tigreal", "Akai", "Hylos", "Gloo",
    "Baxia", "Johnson", "Edith", "Minotaur", "Belerick",
    "Franco", "Hilda", "Gatotkaca",
  ]);

  const splitPushHeroes = new Set([
    "Sun", "Masha", "Zilong", "Argus", "Leomord", "Thamuz",
    "Esmeralda", "Dyrroth", "X.Borg",
  ]);

  // Flex heroes — heroes that have been played in 3+ different lanes commonly
  const flexHeroes = new Set([
    "Chou", "Mathilda", "Jawhead", "Benedetta", "Paquito",
    "Julian", "Arlott", "Kaja", "Silvanna", "Esmeralda",
  ]);

  // Count first-phase picks (positions 1-3) by tendency
  let earlyAggressionCount = 0;
  let scalingCount = 0;
  let flexFirstCount = 0;
  let objectiveControlCount = 0;
  let splitPushCount = 0;
  let totalFirstPhase = 0;

  for (const game of allGames) {
    const isBlue = normalizeTeamName(game.blueTeam) === normalizedTeamId;
    const isRed = normalizeTeamName(game.redTeam) === normalizedTeamId;
    if (!isBlue && !isRed) continue;

    const teamPicks = isBlue ? game.bluePicks : game.redPicks;
    const firstPhasePicks = teamPicks.slice(0, 3); // First 3 picks

    let hasJungler = false;
    let hasTank = false;

    for (const hero of firstPhasePicks) {
      if (!hero) continue;
      totalFirstPhase++;

      if (assassins.has(hero) || aggressiveFighters.has(hero)) {
        earlyAggressionCount++;
      }
      if (marksmen.has(hero) || lateGameMages.has(hero)) {
        scalingCount++;
      }
      if (flexHeroes.has(hero)) {
        flexFirstCount++;
      }
      if (splitPushHeroes.has(hero)) {
        splitPushCount++;
      }
      if (junglers.has(hero)) hasJungler = true;
      if (tanks.has(hero)) hasTank = true;
    }

    // Objective control = jungle + tank combo in first phase
    if (hasJungler && hasTank) {
      objectiveControlCount++;
    }
  }

  // Determine dominant tendencies (> 40% of total first phase picks or game scenarios)
  const tendencies: DraftTendency[] = [];
  const totalGamesForTeam = allGames.filter(
    (g) => normalizeTeamName(g.blueTeam) === normalizedTeamId || normalizeTeamName(g.redTeam) === normalizedTeamId
  ).length;

  if (totalFirstPhase > 0) {
    if (earlyAggressionCount / totalFirstPhase > 0.4) {
      tendencies.push("early_aggression");
    }
    if (scalingCount / totalFirstPhase > 0.4) {
      tendencies.push("scaling");
    }
    if (flexFirstCount / totalFirstPhase > 0.4) {
      tendencies.push("flex_first");
    }
    if (splitPushCount / totalFirstPhase > 0.4) {
      tendencies.push("split_push");
    }
  }

  if (totalGamesForTeam > 0 && objectiveControlCount / totalGamesForTeam > 0.4) {
    tendencies.push("objective_control");
  }

  // If no dominant tendency found, pick the highest one
  if (tendencies.length === 0 && totalFirstPhase > 0) {
    const counts = [
      { tendency: "early_aggression" as DraftTendency, count: earlyAggressionCount },
      { tendency: "scaling" as DraftTendency, count: scalingCount },
      { tendency: "flex_first" as DraftTendency, count: flexFirstCount },
      { tendency: "objective_control" as DraftTendency, count: objectiveControlCount },
      { tendency: "split_push" as DraftTendency, count: splitPushCount },
    ];
    counts.sort((a, b) => b.count - a.count);
    if (counts[0].count > 0) {
      tendencies.push(counts[0].tendency);
    }
  }

  return tendencies;
}

/** Derive most successful heroes: top 5 by win rate, minimum 2 games */
function deriveMostSuccessfulHeroes(
  heroStatsMap: Map<string, HeroPickStats>
): HeroSuccessEntry[] {
  const candidates: HeroSuccessEntry[] = [];

  for (const [, stats] of heroStatsMap) {
    if (stats.pickCount >= 2) {
      candidates.push({
        heroName: stats.heroName,
        winRate: stats.winRate,
        gamesPlayed: stats.pickCount,
      });
    }
  }

  // Sort by winRate descending, then gamesPlayed descending
  candidates.sort((a, b) => {
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    return b.gamesPlayed - a.gamesPlayed;
  });

  return candidates.slice(0, 5);
}

/** Derive most contested heroes: top 5 by pick+ban frequency */
function deriveMostContestedHeroes(
  heroStatsMap: Map<string, HeroPickStats>,
  totalGames: number
): ContestedHeroEntry[] {
  const candidates: ContestedHeroEntry[] = [];

  for (const [, stats] of heroStatsMap) {
    const totalContest = stats.pickCount + stats.banCount + stats.banAgainstCount;
    if (totalContest > 0) {
      candidates.push({
        heroName: stats.heroName,
        pickCount: stats.pickCount,
        banCount: stats.banCount + stats.banAgainstCount,
        totalContestRate: totalGames > 0 ? totalContest / totalGames : 0,
      });
    }
  }

  // Sort by totalContestRate descending
  candidates.sort((a, b) => b.totalContestRate - a.totalContestRate);

  return candidates.slice(0, 5);
}

/** Derive priority bans: top 5 most frequently banned by team */
function derivePriorityBans(
  heroStatsMap: Map<string, HeroPickStats>,
  totalGames: number
): PriorityBanEntry[] {
  const candidates: PriorityBanEntry[] = [];

  for (const [, stats] of heroStatsMap) {
    if (stats.banCount > 0) {
      candidates.push({
        heroName: stats.heroName,
        banCount: stats.banCount,
        frequency: totalGames > 0 ? stats.banCount / totalGames : 0,
      });
    }
  }

  // Sort by banCount descending
  candidates.sort((a, b) => b.banCount - a.banCount);

  return candidates.slice(0, 5);
}
