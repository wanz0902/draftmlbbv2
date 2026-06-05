/**
 * Draft Pattern Engine — Learns draft sequencing patterns per team.
 *
 * Analyzes match history to identify:
 * - First pick tendencies (frequency + winRate)
 * - Ban sequencing patterns (common ban triplet/quintuplet sequences)
 * - Hero sequencing (transition map: after hero X → hero Y)
 * - Draft avoidances (meta tier S/A heroes the team never picks)
 *
 * All data derived exclusively through MatchHistoryService.
 */

import { DraftPatternProfile } from "./draftTypes";
import {
  MatchHistoryService,
  Game,
  normalizeTeamName,
} from "../services/matchHistoryService";

/**
 * Build draft pattern profile for a team from their match history.
 *
 * Algorithm:
 * 1. Get all team matches via MatchHistoryService
 * 2. Flatten all series into individual games
 * 3. For each game where team participates:
 *    - Determine team picks and bans based on side (blue/red)
 *    - Track first pick heroes with win/loss
 *    - Track ban sequences (triplets)
 *    - Track hero transitions (consecutive pick pairs)
 * 4. Aggregate into DraftPatternProfile
 */
export function buildDraftPatterns(
  teamId: string,
  matchHistoryService: MatchHistoryService
): DraftPatternProfile {
  const normalizedTeamId = normalizeTeamName(teamId);
  const response = matchHistoryService.getTeamMatches(teamId, {
    result: "all" as const,
  });

  // Flatten all series into individual games
  const allGames: Game[] = [];
  for (const series of response.series) {
    for (const game of series.games) {
      allGames.push(game);
    }
  }

  const totalGames = allGames.length;

  // Tracking structures
  const firstPickMap = new Map<
    string,
    { count: number; wins: number; losses: number }
  >();
  const banSequenceMap = new Map<string, number>();
  const heroTransitionMap = new Map<
    string,
    Map<string, number>
  >();
  // Track how many times each hero appears in a non-last position (for frequency calc)
  const heroTransitionTotal = new Map<string, number>();

  for (const game of allGames) {
    // Determine which side the team is on
    const isBlue =
      normalizeTeamName(game.blueTeam) === normalizedTeamId;
    const isRed =
      normalizeTeamName(game.redTeam) === normalizedTeamId;

    if (!isBlue && !isRed) continue;

    const teamPicks = isBlue ? game.bluePicks : game.redPicks;
    const teamBans = isBlue ? game.blueBans : game.redBans;
    const didWin =
      normalizeTeamName(game.winner) === normalizedTeamId;

    // --- First pick tendencies ---
    if (teamPicks.length > 0) {
      const firstPick = teamPicks[0];
      if (firstPick) {
        const entry = firstPickMap.get(firstPick) || {
          count: 0,
          wins: 0,
          losses: 0,
        };
        entry.count++;
        if (didWin) {
          entry.wins++;
        } else {
          entry.losses++;
        }
        firstPickMap.set(firstPick, entry);
      }
    }

    // --- Ban sequencing patterns ---
    // Track ban triplets (ban[0]→ban[1]→ban[2])
    if (teamBans.length >= 3) {
      const triplet = teamBans.slice(0, 3).filter(Boolean);
      if (triplet.length === 3) {
        const tripletKey = triplet.join("→");
        banSequenceMap.set(
          tripletKey,
          (banSequenceMap.get(tripletKey) || 0) + 1
        );
      }
    }

    // Track full ban sequences (ban[0]→...→ban[4]) if 5 bans exist
    if (teamBans.length >= 5) {
      const fullSeq = teamBans.slice(0, 5).filter(Boolean);
      if (fullSeq.length === 5) {
        const fullKey = fullSeq.join("→");
        banSequenceMap.set(
          fullKey,
          (banSequenceMap.get(fullKey) || 0) + 1
        );
      }
    }

    // --- Hero sequencing (transitions) ---
    // For each consecutive pair in picks array
    for (let i = 0; i < teamPicks.length - 1; i++) {
      const currentHero = teamPicks[i];
      const nextHero = teamPicks[i + 1];

      if (!currentHero || !nextHero) continue;

      // Increment transition count
      if (!heroTransitionMap.has(currentHero)) {
        heroTransitionMap.set(currentHero, new Map());
      }
      const transitions = heroTransitionMap.get(currentHero)!;
      transitions.set(nextHero, (transitions.get(nextHero) || 0) + 1);

      // Increment total times this hero appeared in a non-last position
      heroTransitionTotal.set(
        currentHero,
        (heroTransitionTotal.get(currentHero) || 0) + 1
      );
    }
  }

  // --- Build firstPickTendencies ---
  const firstPickTendencies: Array<{
    heroName: string;
    frequency: number;
    winRate: number;
  }> = [];

  for (const [heroName, stats] of firstPickMap) {
    const frequency = totalGames > 0 ? stats.count / totalGames : 0;
    const winRate =
      stats.count > 0
        ? (stats.wins / stats.count) * 100
        : 0;
    firstPickTendencies.push({
      heroName,
      frequency,
      winRate,
    });
  }

  // Sort by frequency descending
  firstPickTendencies.sort((a, b) => b.frequency - a.frequency);

  // --- Build banSequences ---
  const banSequences: Array<{ sequence: string[]; count: number }> = [];

  for (const [key, count] of banSequenceMap) {
    const sequence = key.split("→");
    banSequences.push({ sequence, count });
  }

  // Sort by count descending
  banSequences.sort((a, b) => b.count - a.count);

  // --- Build heroSequencing ---
  const heroSequencing = new Map<
    string,
    Array<{ followHero: string; count: number; frequency: number }>
  >();

  for (const [hero, transitions] of heroTransitionMap) {
    const totalAfterHero = heroTransitionTotal.get(hero) || 0;
    const followList: Array<{
      followHero: string;
      count: number;
      frequency: number;
    }> = [];

    for (const [followHero, count] of transitions) {
      const frequency =
        totalAfterHero > 0 ? count / totalAfterHero : 0;
      followList.push({ followHero, count, frequency });
    }

    // Sort by count descending
    followList.sort((a, b) => b.count - a.count);
    heroSequencing.set(hero, followList);
  }

  // --- Draft avoidances ---
  // Left as empty array for now (requires meta tier data not easily available from MatchHistoryService alone)
  const draftAvoidances: string[] = [];

  return {
    teamId: normalizedTeamId,
    totalGames,
    firstPickTendencies,
    banSequences,
    heroSequencing,
    draftAvoidances,
  };
}

/**
 * Compute how well a hero candidate aligns with the team's historical
 * draft sequencing patterns given the current picks.
 *
 * Algorithm:
 * 1. If currentPicks is empty, return 0
 * 2. Get the last picked hero from currentPicks
 * 3. Look up heroSequencing map for that hero
 * 4. If heroCandidate appears in the follow list: use that frequency (0-1)
 * 5. Also check earlier picks in sequence for partial alignment
 * 6. Return max alignment score found (clamped 0-1)
 *
 * @returns A score between 0 and 1 indicating alignment
 */
export function getSequenceAlignment(
  heroCandidate: string,
  currentPicks: string[],
  patterns: DraftPatternProfile
): number {
  if (currentPicks.length === 0) return 0;

  let maxAlignment = 0;

  // Check each prior pick for transitions to the candidate
  for (let i = 0; i < currentPicks.length; i++) {
    const priorHero = currentPicks[i];
    if (!priorHero) continue;

    const followList = patterns.heroSequencing.get(priorHero);
    if (!followList) continue;

    const match = followList.find(
      (entry) => entry.followHero === heroCandidate
    );
    if (match) {
      // Weight by recency: the last pick gets full weight, earlier picks get diminished weight
      const recencyFactor =
        currentPicks.length === 1
          ? 1
          : 0.5 + 0.5 * (i / (currentPicks.length - 1));
      const alignmentScore = match.frequency * recencyFactor;

      if (alignmentScore > maxAlignment) {
        maxAlignment = alignmentScore;
      }
    }
  }

  // Clamp to 0-1
  return Math.min(1, Math.max(0, maxAlignment));
}
