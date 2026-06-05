/**
 * Matchup Profile Engine — Builds head-to-head statistical profiles
 * between two specific teams using match history data.
 *
 * All data derived exclusively through MatchHistoryService.
 */

import {
  MatchupProfile,
  ComfortHero,
  PriorityBanEntry,
} from "./draftTypes";
import {
  MatchHistoryService,
  SeriesMatch,
  Game,
  normalizeTeamName,
} from "../services/matchHistoryService";

/**
 * Build a head-to-head matchup profile between two teams.
 *
 * Process:
 * 1. Filter head-to-head series via MatchHistoryService
 * 2. Compute series/game win counts and overall H2H win rate
 * 3. Identify matchup-specific comfort heroes and priority bans
 * 4. Build full series record with dates and results
 *
 * Returns an empty profile (headToHeadGames: 0) when no H2H games exist.
 */
export function buildMatchupProfile(
  teamId: string,
  opponentId: string,
  matchHistoryService: MatchHistoryService
): MatchupProfile {
  const normalizedTeamId = normalizeTeamName(teamId);
  const normalizedOpponentId = normalizeTeamName(opponentId);
  // Step 1: Get filtered head-to-head series
  const response = matchHistoryService.getTeamMatches(normalizedTeamId, {
    result: "all" as const,
    opponent: normalizedOpponentId,
  });

  // Step 2: If no head-to-head games exist, return empty profile
  if (response.filteredMatches === 0) {
    return createEmptyMatchupProfile(normalizedTeamId, normalizedOpponentId);
  }

  const series = response.series;

  // Step 3: Compute series win counts
  // We need to normalize both IDs the same way MatchHistoryService does internally
  const teamSeriesWins = series.filter((s) => isTeamWinner(s, normalizedTeamId)).length;
  const opponentSeriesWins = series.filter((s) => isTeamWinner(s, normalizedOpponentId)).length;

  // Step 4: Count total games and game wins
  let totalGames = 0;
  let teamGameWins = 0;
  let opponentGameWins = 0;

  // Track hero pick/win stats for comfort hero detection
  const teamHeroStats = new Map<string, { picks: number; wins: number }>();
  const opponentHeroStats = new Map<string, { picks: number; wins: number }>();

  // Track ban stats for priority ban detection
  const teamBanStats = new Map<string, number>();
  const opponentBanStats = new Map<string, number>();

  for (const s of series) {
    for (const game of s.games) {
      totalGames++;

      // Determine which side is our team vs the opponent
      const teamSide = getTeamSide(game, normalizedTeamId, s);
      const isTeamWin = isNormalizedMatch(game.winner, normalizedTeamId);

      if (isTeamWin) {
        teamGameWins++;
      } else {
        opponentGameWins++;
      }

      // Get picks and bans based on team side
      const teamPicks = teamSide === "blue" ? game.bluePicks : game.redPicks;
      const opponentPicks = teamSide === "blue" ? game.redPicks : game.bluePicks;
      const teamBans = teamSide === "blue" ? game.blueBans : game.redBans;
      const opponentBans = teamSide === "blue" ? game.redBans : game.blueBans;

      // Track team hero picks and wins
      for (const hero of teamPicks) {
        if (!hero) continue;
        const stats = teamHeroStats.get(hero) || { picks: 0, wins: 0 };
        stats.picks++;
        if (isTeamWin) stats.wins++;
        teamHeroStats.set(hero, stats);
      }

      // Track opponent hero picks and wins
      for (const hero of opponentPicks) {
        if (!hero) continue;
        const stats = opponentHeroStats.get(hero) || { picks: 0, wins: 0 };
        stats.picks++;
        if (!isTeamWin) stats.wins++;
        opponentHeroStats.set(hero, stats);
      }

      // Track team bans (bans made by the team in this matchup)
      for (const hero of teamBans) {
        if (!hero) continue;
        teamBanStats.set(hero, (teamBanStats.get(hero) || 0) + 1);
      }

      // Track opponent bans (bans made by the opponent in this matchup)
      for (const hero of opponentBans) {
        if (!hero) continue;
        opponentBanStats.set(hero, (opponentBanStats.get(hero) || 0) + 1);
      }
    }
  }

  // Step 5: Compute head-to-head win rate (series-based)
  const totalSeries = series.length;
  const headToHeadWinRate =
    totalSeries > 0 ? Math.round((teamSeriesWins / totalSeries) * 100) : 0;

  // Step 6: Identify matchup-specific comfort heroes (WR >50%, min 1 game in this matchup)
  const teamMatchupComfort = computeMatchupComfortHeroes(teamHeroStats);
  const opponentMatchupComfort = computeMatchupComfortHeroes(opponentHeroStats);

  // Step 7: Identify matchup-specific priority bans (most banned in this matchup)
  const teamMatchupBans = computeMatchupPriorityBans(teamBanStats, totalGames);
  const opponentMatchupBans = computeMatchupPriorityBans(opponentBanStats, totalGames);

  // Step 8: Build series record with dates and results
  const seriesRecord = series.map((s) => ({
    date: s.date,
      teamScore: getTeamScore(s, normalizedTeamId),
      opponentScore: getOpponentScore(s, normalizedTeamId),
    winner: s.winner,
  }));

  return {
    teamId: normalizedTeamId,
    opponentId: normalizedOpponentId,
    headToHeadGames: totalGames,
    teamSeriesWins,
    opponentSeriesWins,
    teamGameWins,
    opponentGameWins,
    headToHeadWinRate,
    teamMatchupComfort,
    opponentMatchupComfort,
    teamMatchupBans,
    opponentMatchupBans,
    seriesRecord,
  };
}

// ─── Helper Functions ──────────────────────────────────────────────────────────

/**
 * Create an empty matchup profile when no head-to-head games exist.
 */
function createEmptyMatchupProfile(
  teamId: string,
  opponentId: string
): MatchupProfile {
  return {
    teamId,
    opponentId,
    headToHeadGames: 0,
    teamSeriesWins: 0,
    opponentSeriesWins: 0,
    teamGameWins: 0,
    opponentGameWins: 0,
    headToHeadWinRate: 0,
    teamMatchupComfort: [],
    opponentMatchupComfort: [],
    teamMatchupBans: [],
    opponentMatchupBans: [],
    seriesRecord: [],
  };
}

/**
 * Normalize a team name for comparison (mirrors MatchHistoryService logic).
 */
function normalizeForComparison(name: string): string {
  return normalizeTeamName(name);
}

/**
 * Check if a normalized team name matches a given teamId.
 * Handles case-insensitive matching.
 */
function isNormalizedMatch(teamName: string, teamId: string): boolean {
  return normalizeForComparison(teamName) === normalizeForComparison(teamId);
}

/**
 * Determine if the given team won a series.
 */
function isTeamWinner(series: SeriesMatch, teamId: string): boolean {
  return isNormalizedMatch(series.winner, teamId);
}

/**
 * Determine which side (blue/red) the team is on in a given game.
 * Falls back to series-level teamA/teamB if game sides don't match directly.
 */
function getTeamSide(
  game: Game,
  teamId: string,
  series: SeriesMatch
): "blue" | "red" {
  if (isNormalizedMatch(game.blueTeam, teamId)) return "blue";
  if (isNormalizedMatch(game.redTeam, teamId)) return "red";

  // Fallback: use series-level team positions
  if (isNormalizedMatch(series.teamA, teamId)) {
    // teamA is typically blue in the first game, but game-level data is authoritative
    return "blue";
  }
  return "red";
}

/**
 * Get the team's score from a series.
 */
function getTeamScore(series: SeriesMatch, teamId: string): number {
  if (isNormalizedMatch(series.teamA, teamId)) return series.teamAScore;
  return series.teamBScore;
}

/**
 * Get the opponent's score from a series.
 */
function getOpponentScore(series: SeriesMatch, teamId: string): number {
  if (isNormalizedMatch(series.teamA, teamId)) return series.teamBScore;
  return series.teamAScore;
}

/**
 * Compute matchup-specific comfort heroes from hero pick/win stats.
 * Returns heroes with WR >50% in this matchup, sorted by pick count descending.
 * Limited to top 5.
 */
function computeMatchupComfortHeroes(
  heroStats: Map<string, { picks: number; wins: number }>
): ComfortHero[] {
  const comfortHeroes: ComfortHero[] = [];

  for (const [heroName, stats] of heroStats) {
    if (stats.picks < 1) continue;
    const winRate = Math.round((stats.wins / stats.picks) * 100);
    if (winRate > 50) {
      comfortHeroes.push({
        heroName,
        pickCount: stats.picks,
        winRate,
        winCount: stats.wins,
      });
    }
  }

  // Sort by pick count descending, then win rate descending
  comfortHeroes.sort((a, b) => {
    if (b.pickCount !== a.pickCount) return b.pickCount - a.pickCount;
    return b.winRate - a.winRate;
  });

  return comfortHeroes.slice(0, 5);
}

/**
 * Compute matchup-specific priority bans from ban stats.
 * Returns most banned heroes in this matchup, sorted by ban count descending.
 * Limited to top 5.
 */
function computeMatchupPriorityBans(
  banStats: Map<string, number>,
  totalGames: number
): PriorityBanEntry[] {
  const priorityBans: PriorityBanEntry[] = [];

  for (const [heroName, banCount] of banStats) {
    priorityBans.push({
      heroName,
      banCount,
      frequency: totalGames > 0 ? Math.round((banCount / totalGames) * 100) / 100 : 0,
    });
  }

  // Sort by ban count descending
  priorityBans.sort((a, b) => b.banCount - a.banCount);

  return priorityBans.slice(0, 5);
}
