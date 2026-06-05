import {
  DraftRequestPayload,
  HistoricalDraftRetrieverInput,
  HistoricalDraftRetrieverResult,
  HistoricalHeroTrend,
  HistoricalMatchupSummary,
  HistoricalTeamProfileSummary,
  SimilarHistoricalGame,
  DraftPatternMatch,
  MplDraftRecommendation,
  TeamIdentityProfile,
  MatchupProfile,
  DraftPatternProfile,
  CompactWaferPayload,
} from "./draftTypes";
import { buildTeamIdentity } from "./teamIdentityEngine";
import { buildMatchupProfile } from "./matchupProfileEngine";
import { buildDraftPatterns, getSequenceAlignment } from "./draftPatternEngine";
import {
  MatchHistoryService,
  Game,
  SeriesMatch,
  normalizeTeamName,
} from "../services/matchHistoryService";
import { generateMplRecommendations } from "./draftRecommendationEngine";

const retrieverCache = new Map<string, Omit<HistoricalDraftRetrieverResult, "cacheHit">>();
const MAX_CACHE_SIZE = 100;

function heroKey(value: string | undefined | null): string {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function percentage(value: number): number {
  return Math.round(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function stateKey(input: HistoricalDraftRetrieverInput): string {
  return JSON.stringify({
    mode: input.mode,
    blueTeam: normalizeTeamName(input.blueTeam || ""),
    redTeam: normalizeTeamName(input.redTeam || ""),
    bluePicks: input.bluePicks.map(heroKey).sort(),
    redPicks: input.redPicks.map(heroKey).sort(),
    blueBans: input.blueBans.map(heroKey).sort(),
    redBans: input.redBans.map(heroKey).sort(),
    currentTurn: input.currentTurn,
    currentPhase: input.currentPhase,
  });
}

function cloneResult(
  result: Omit<HistoricalDraftRetrieverResult, "cacheHit">,
  cacheHit: boolean
): HistoricalDraftRetrieverResult {
  return {
    ...JSON.parse(JSON.stringify(result)),
    cacheHit,
  };
}

function toTeamSummary(identity: TeamIdentityProfile): HistoricalTeamProfileSummary {
  const topPicks = [...identity.heroStats.values()]
    .filter((entry) => entry.pickCount > 0)
    .sort((left, right) => right.pickCount - left.pickCount || right.winRate - left.winRate)
    .slice(0, 5)
    .map((entry) => ({
      heroName: entry.heroName,
      count: entry.pickCount,
      winRate: percentage(entry.winRate),
    }));

  const topBans = identity.priorityBans.slice(0, 5).map((entry) => ({
    heroName: entry.heroName,
    count: entry.banCount,
    frequency: percentage(entry.frequency * 100),
  }));

  const firstPicks = identity.firstPickPreferences.slice(0, 5).map((entry) => ({
    heroName: entry.heroName,
    count: entry.count,
    winRate: percentage(entry.winRate),
  }));

  const comfortHeroes = identity.comfortHeroes.slice(0, 5).map((entry) => ({
    heroName: entry.heroName,
    count: entry.pickCount,
    winRate: percentage(entry.winRate),
  }));

  return {
    teamId: identity.teamId,
    totalGames: identity.totalGames,
    winRate: percentage(identity.winRate),
    topPicks,
    topBans,
    firstPicks,
    comfortHeroes,
  };
}

function toMatchupSummary(profile: MatchupProfile): HistoricalMatchupSummary {
  const summary =
    profile.headToHeadGames > 0
      ? `${profile.teamId} vs ${profile.opponentId}: ${profile.headToHeadGames} game tersedia, series ${profile.teamSeriesWins}-${profile.opponentSeriesWins}, game ${profile.teamGameWins}-${profile.opponentGameWins}.`
      : `Data head-to-head ${profile.teamId} vs ${profile.opponentId} tidak tersedia.`;

  return {
    teamId: profile.teamId,
    opponentId: profile.opponentId,
    headToHeadGames: profile.headToHeadGames,
    teamSeriesWins: profile.teamSeriesWins,
    opponentSeriesWins: profile.opponentSeriesWins,
    teamGameWins: profile.teamGameWins,
    opponentGameWins: profile.opponentGameWins,
    headToHeadWinRate: profile.headToHeadWinRate,
    summary,
  };
}

function getTeamSide(game: Game, teamId: string): "BLUE" | "RED" | null {
  const normalizedTeamId = normalizeTeamName(teamId);
  if (normalizeTeamName(game.blueTeam) === normalizedTeamId) return "BLUE";
  if (normalizeTeamName(game.redTeam) === normalizedTeamId) return "RED";
  return null;
}

function countOverlap(left: string[], right: string[]): string[] {
  const rightSet = new Set(right.map(heroKey));
  return left.filter((entry) => rightSet.has(heroKey(entry)));
}

function buildSourceLabel(game: Game): string {
  const week = typeof game.week === "number" && game.week > 0 ? `Week ${game.week}` : "Week ?";
  return `MPL ID S17 ${week} Game ${game.gameNumber} antara ${game.blueTeam} vs ${game.redTeam}`;
}

function findSimilarGames(
  input: HistoricalDraftRetrieverInput,
  actingTeamId: string,
  opponentTeamId: string,
  actingIdentity: TeamIdentityProfile,
  patterns: DraftPatternProfile,
  allSeries: SeriesMatch[]
): SimilarHistoricalGame[] {
  const currentFirstPick = input.currentPicks[0] || "";
  const currentComfortKeys = new Set(actingIdentity.comfortHeroes.map((entry) => heroKey(entry.heroName)));

  const results: SimilarHistoricalGame[] = [];
  for (const series of allSeries) {
    const exactTeams =
      [normalizeTeamName(series.teamA), normalizeTeamName(series.teamB)].sort().join("|") ===
      [actingTeamId, opponentTeamId].sort().join("|");

    for (const game of series.games) {
      const actingSide = getTeamSide(game, actingTeamId);
      const opponentSide = getTeamSide(game, opponentTeamId);
      if (!actingSide || !opponentSide) continue;

      const gamePicks = actingSide === "BLUE" ? game.bluePicks : game.redPicks;
      const gameBans = actingSide === "BLUE" ? game.blueBans : game.redBans;

      let score = 0;
      const matchingSignals: string[] = [];

      if (exactTeams) {
        score += 35;
        matchingSignals.push("same teams");
      } else if (normalizeTeamName(game.blueTeam) === actingTeamId || normalizeTeamName(game.redTeam) === actingTeamId) {
        score += 15;
        matchingSignals.push("same opponent context");
      }

      if (actingSide === input.currentTurn) {
        score += 10;
        matchingSignals.push("same side");
      }

      const pickOverlap = countOverlap(input.currentPicks, gamePicks);
      if (pickOverlap.length > 0) {
        score += pickOverlap.length * 6;
        matchingSignals.push(`overlap picks: ${pickOverlap.join(", ")}`);
      }

      const banOverlap = countOverlap(input.currentBans, gameBans);
      if (banOverlap.length > 0) {
        score += banOverlap.length * 5;
        matchingSignals.push(`overlap bans: ${banOverlap.join(", ")}`);
      }

      if (currentFirstPick && heroKey(currentFirstPick) === heroKey(gamePicks[0])) {
        score += 12;
        matchingSignals.push(`same first pick: ${currentFirstPick}`);
      }

      const comfortOverlap = gamePicks.filter((hero) => currentComfortKeys.has(heroKey(hero)));
      if (comfortOverlap.length > 0) {
        score += Math.min(10, comfortOverlap.length * 3);
        matchingSignals.push(`comfort overlap: ${comfortOverlap.slice(0, 2).join(", ")}`);
      }

      const patternAlignment = currentFirstPick
        ? getSequenceAlignment(currentFirstPick, gamePicks.slice(0, Math.max(0, gamePicks.length - 1)), patterns)
        : 0;
      if (patternAlignment > 0) {
        score += Math.round(patternAlignment * 10);
        matchingSignals.push("same draft pattern");
      }

      if (score <= 0) continue;

      results.push({
        seriesId: game.seriesId || series.id || "",
        gameId: game.gameId || `${series.id}-g${game.gameNumber}`,
        sourceLabel: buildSourceLabel(game),
        week: typeof game.week === "number" ? game.week : null,
        gameNumber: game.gameNumber,
        blueTeam: game.blueTeam,
        redTeam: game.redTeam,
        winner: game.winner,
        similarityScore: score,
        matchingSignals,
        bluePicks: [...game.bluePicks],
        redPicks: [...game.redPicks],
        blueBans: [...game.blueBans],
        redBans: [...game.redBans],
      });
    }
  }

  return results
    .sort((left, right) => right.similarityScore - left.similarityScore)
    .slice(0, 3);
}

function buildPatternMatches(
  input: HistoricalDraftRetrieverInput,
  actingTeamId: string,
  actingIdentity: TeamIdentityProfile,
  patterns: DraftPatternProfile
): DraftPatternMatch[] {
  const matches: DraftPatternMatch[] = [];
  const firstPick = input.currentPicks[0];
  if (firstPick) {
    const hit = patterns.firstPickTendencies.find((entry) => heroKey(entry.heroName) === heroKey(firstPick));
    if (hit) {
      matches.push({
        patternType: "first-pick",
        teamId: actingTeamId,
        confidence: clamp(hit.frequency * 100, 0, 100),
        summary: `${actingTeamId} pernah first-pick ${hit.heroName} dengan frekuensi ${percentage(hit.frequency * 100)}%.`,
        heroes: [hit.heroName],
        source: `${actingTeamId} first pick history`,
      });
    }
  }

  const sequenceKey = input.currentBans.slice(0, 3).filter(Boolean).map(heroKey);
  if (sequenceKey.length >= 2) {
    for (const entry of patterns.banSequences.slice(0, 5)) {
      const patternKey = entry.sequence.map(heroKey);
      const overlap = sequenceKey.filter((hero) => patternKey.includes(hero));
      if (overlap.length >= 2) {
        matches.push({
          patternType: "ban-sequence",
          teamId: actingTeamId,
          confidence: clamp(entry.count * 20, 0, 100),
          summary: `${actingTeamId} punya pola ban ${entry.sequence.join(" → ")} sebanyak ${entry.count} game.`,
          heroes: [...entry.sequence],
          source: `${actingTeamId} ban sequence history`,
        });
      }
    }
  }

  const comfortIntersection = actingIdentity.comfortHeroes
    .filter((entry) => input.currentPicks.some((hero) => heroKey(hero) === heroKey(entry.heroName)))
    .slice(0, 2);
  if (comfortIntersection.length > 0) {
    matches.push({
      patternType: "comfort-priority",
      teamId: actingTeamId,
      confidence: 70,
      summary: `${actingTeamId} sudah mengunci comfort hero ${comfortIntersection.map((entry) => entry.heroName).join(", ")}.`,
      heroes: comfortIntersection.map((entry) => entry.heroName),
      source: `${actingTeamId} comfort history`,
    });
  }

  return matches.slice(0, 4);
}

function uniqueTrends(entries: HistoricalHeroTrend[], limit: number): HistoricalHeroTrend[] {
  const seen = new Set<string>();
  const results: HistoricalHeroTrend[] = [];
  for (const entry of entries) {
    const key = heroKey(entry.heroName);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    results.push(entry);
    if (results.length >= limit) break;
  }
  return results;
}

function deriveLikelyRepicks(
  actingIdentity: TeamIdentityProfile,
  patterns: DraftPatternProfile,
  currentPicks: string[],
  recommendations: MplDraftRecommendation[]
): HistoricalHeroTrend[] {
  const unavailable = new Set(currentPicks.map(heroKey));
  const trends: HistoricalHeroTrend[] = [];

  for (const entry of actingIdentity.firstPickPreferences) {
    if (unavailable.has(heroKey(entry.heroName))) continue;
    trends.push({
      heroName: entry.heroName,
      count: entry.count,
      winRate: percentage(entry.winRate),
      reason: `${actingIdentity.teamId} sering memprioritaskan hero ini di early phase.`,
      source: `${actingIdentity.teamId} first pick history`,
    });
  }

  const lastPick = currentPicks[currentPicks.length - 1];
  if (lastPick) {
    const transitions = patterns.heroSequencing.get(lastPick) || [];
    for (const entry of transitions.slice(0, 3)) {
      if (unavailable.has(heroKey(entry.followHero))) continue;
      trends.push({
        heroName: entry.followHero,
        count: entry.count,
        winRate: null,
        reason: `Sering muncul sebagai follow-up setelah ${lastPick}.`,
        source: `${actingIdentity.teamId} pick sequence history`,
      });
    }
  }

  for (const entry of recommendations) {
    trends.push({
      heroName: entry.heroName,
      count: Math.round(entry.totalScore),
      winRate: entry.evidence?.winRate ?? null,
      reason: entry.reason,
      source: entry.evidence?.source || "local recommendation engine",
    });
  }

  return uniqueTrends(trends, 5);
}

function deriveLikelyRebans(
  enemyIdentity: TeamIdentityProfile,
  matchupProfile: MatchupProfile,
  currentBans: string[]
): HistoricalHeroTrend[] {
  const unavailable = new Set(currentBans.map(heroKey));
  const trends: HistoricalHeroTrend[] = [];

  for (const entry of enemyIdentity.priorityBans) {
    if (unavailable.has(heroKey(entry.heroName))) continue;
    trends.push({
      heroName: entry.heroName,
      count: entry.banCount,
      winRate: null,
      reason: `${enemyIdentity.teamId} sering menghilangkan hero ini dari pool.`,
      source: `${enemyIdentity.teamId} priority bans`,
    });
  }

  for (const entry of matchupProfile.opponentMatchupBans) {
    if (unavailable.has(heroKey(entry.heroName))) continue;
    trends.push({
      heroName: entry.heroName,
      count: entry.banCount,
      winRate: null,
      reason: `Sering muncul sebagai ban head-to-head vs ${matchupProfile.teamId}.`,
      source: `${matchupProfile.opponentId} head-to-head bans`,
    });
  }

  return uniqueTrends(trends, 5);
}

function derivePivotCandidates(
  actingIdentity: TeamIdentityProfile,
  currentBans: string[],
  recommendations: MplDraftRecommendation[]
): HistoricalHeroTrend[] {
  const banned = new Set(currentBans.map(heroKey));
  const trends: HistoricalHeroTrend[] = [];

  for (const entry of actingIdentity.comfortHeroes) {
    if (!banned.has(heroKey(entry.heroName))) continue;
    const fallback = recommendations.find((candidate) => heroKey(candidate.heroName) !== heroKey(entry.heroName));
    if (!fallback) continue;
    trends.push({
      heroName: fallback.heroName,
      count: fallback.totalScore,
      winRate: fallback.evidence?.winRate ?? null,
      reason: `${entry.heroName} diban; pivot paling dekat adalah ${fallback.heroName}.`,
      source: fallback.evidence?.source || `${actingIdentity.teamId} pivot fallback`,
    });
  }

  for (const recommendation of recommendations) {
    if (recommendation.fallbackBranch) {
      trends.push({
        heroName: recommendation.fallbackBranch.heroName,
        count: Math.max(1, recommendation.totalScore - 1),
        winRate: null,
        reason: recommendation.fallbackBranch.reason,
        source: recommendation.evidence?.source || "fallback branch",
      });
    }
  }

  return uniqueTrends(trends, 5);
}

function compactRecommendationCandidates(
  recommendations: MplDraftRecommendation[]
): CompactWaferPayload["recommendationCandidatesTop5"] {
  return recommendations.slice(0, 5).map((entry) => ({
    heroName: entry.heroName,
    actionType: entry.banType ? "ban" : "pick",
    score: Math.round(entry.totalScore),
    type: entry.pickType || entry.banType || "Adaptive",
    reason: entry.reason.split(". ")[0].slice(0, 140),
    evidence: [
      entry.evidence?.source || "data tidak tersedia",
      entry.evidence?.team ? `team: ${entry.evidence.team}` : "",
      entry.evidence?.pairingData ? entry.evidence.pairingData.slice(0, 90) : "",
    ].filter(Boolean).slice(0, 3),
    fallback: entry.fallbackBranch?.heroName,
  }));
}

function prioritizeRecommendations(recommendations: MplDraftRecommendation[]): MplDraftRecommendation[] {
  return [...recommendations].sort((left, right) => right.totalScore - left.totalScore);
}

function buildLocalSummary(
  actingTeamId: string,
  opponentTeamId: string,
  similarGames: SimilarHistoricalGame[],
  recommendationSource: "matchup-history" | "team-history" | "global-fallback"
): string {
  if (similarGames.length > 0) {
    const best = similarGames[0];
    return `${actingTeamId} vs ${opponentTeamId} memakai ${recommendationSource}. Draft ini mirip dengan ${best.sourceLabel}. Evidence fokus pada history tim lokal, bukan meta global.`;
  }

  if (recommendationSource === "global-fallback") {
    return `Data historical ${actingTeamId} vs ${opponentTeamId} terbatas. Engine lokal memakai fallback minimum dan akan menulis data tidak tersedia bila evidence kurang.`;
  }

  return `${actingTeamId} vs ${opponentTeamId} memakai ${recommendationSource}. Rekomendasi berasal dari profile tim, matchup, dan pola draft lokal.`;
}

export class HistoricalDraftRetriever {
  constructor(private readonly matchHistoryService: MatchHistoryService) {}

  retrieve(
    input: HistoricalDraftRetrieverInput,
    heroDatabase: any[],
    heroesMaster: any[]
  ): HistoricalDraftRetrieverResult {
    const key = stateKey(input);
    const cached = retrieverCache.get(key);
    if (cached) {
      return cloneResult(cached, true);
    }

    const normalizedBlueTeam = normalizeTeamName(input.blueTeam || "");
    const normalizedRedTeam = normalizeTeamName(input.redTeam || "");
    const actingTeamId = input.currentTurn === "BLUE" ? normalizedBlueTeam : normalizedRedTeam;
    const opponentTeamId = input.currentTurn === "BLUE" ? normalizedRedTeam : normalizedBlueTeam;

    const blueIdentity = buildTeamIdentity(normalizedBlueTeam, this.matchHistoryService);
    const redIdentity = buildTeamIdentity(normalizedRedTeam, this.matchHistoryService);
    const actingIdentity = input.currentTurn === "BLUE" ? blueIdentity : redIdentity;
    const opponentIdentity = input.currentTurn === "BLUE" ? redIdentity : blueIdentity;
    const actingPatterns = buildDraftPatterns(actingTeamId, this.matchHistoryService);
    const matchupProfile = buildMatchupProfile(actingTeamId, opponentTeamId, this.matchHistoryService);

    const payload: DraftRequestPayload = {
      bluePicks: input.bluePicks,
      redPicks: input.redPicks,
      blueBans: input.blueBans,
      redBans: input.redBans,
      currentPhase: input.currentPhase,
      currentTurnSide: input.currentTurn,
      mode: input.mode,
      blueTeam: normalizedBlueTeam,
      redTeam: normalizedRedTeam,
    };

    const recommendationCandidates = prioritizeRecommendations(generateMplRecommendations(
      payload,
      heroDatabase,
      heroesMaster,
      blueIdentity,
      redIdentity,
      matchupProfile,
      actingPatterns,
      5
    ));

    const recommendationSource =
      matchupProfile.headToHeadGames > 0
        ? "matchup-history"
        : actingIdentity.totalGames > 0 || opponentIdentity.totalGames > 0
          ? "team-history"
          : "global-fallback";

    const similarGames = findSimilarGames(
      input,
      actingTeamId,
      opponentTeamId,
      actingIdentity,
      actingPatterns,
      this.matchHistoryService.getAllSeries()
    );

    const draftPatternMatches = buildPatternMatches(
      input,
      actingTeamId,
      actingIdentity,
      actingPatterns
    );
    const likelyRepicks = deriveLikelyRepicks(
      actingIdentity,
      actingPatterns,
      input.currentPicks,
      recommendationCandidates
    );
    const likelyRebans = deriveLikelyRebans(opponentIdentity, matchupProfile, input.currentBans);
    const pivotCandidates = derivePivotCandidates(actingIdentity, input.currentBans, recommendationCandidates);

    const blueSummary = toTeamSummary(blueIdentity);
    const redSummary = toTeamSummary(redIdentity);
    const matchupSummary = toMatchupSummary(matchupProfile);
    const missingData: string[] = [];

    if (matchupProfile.headToHeadGames === 0) {
      missingData.push("head-to-head data tidak tersedia");
    }
    if (similarGames.length === 0) {
      missingData.push("similar historical game tidak tersedia");
    }
    if (recommendationCandidates.length === 0) {
      missingData.push("recommendation candidates tidak tersedia");
    }

    const compactWaferPayload: CompactWaferPayload = {
      mode: input.mode,
      teams: {
        blue: normalizedBlueTeam,
        red: normalizedRedTeam,
      },
      currentDraftState: {
        bluePicks: [...input.bluePicks],
        redPicks: [...input.redPicks],
        blueBans: [...input.blueBans],
        redBans: [...input.redBans],
        currentTurn: input.currentTurn,
        currentPhase: input.currentPhase,
      },
      topTeamPicks: {
        blue: blueSummary.topPicks.slice(0, 5),
        red: redSummary.topPicks.slice(0, 5),
      },
      topTeamBans: {
        blue: blueSummary.topBans.slice(0, 5),
        red: redSummary.topBans.slice(0, 5),
      },
      headToHeadSummary: {
        summary: matchupSummary.summary,
        games: matchupSummary.headToHeadGames,
        teamSeriesWins: matchupSummary.teamSeriesWins,
        opponentSeriesWins: matchupSummary.opponentSeriesWins,
      },
      similarGamesTop3: similarGames.slice(0, 3).map((entry) => ({
        sourceLabel: entry.sourceLabel,
        similarityScore: entry.similarityScore,
        matchingSignals: entry.matchingSignals.slice(0, 4),
        pivotNote:
          entry.bluePicks.length + entry.redPicks.length > 0
            ? `Pivot historis: ${[...entry.bluePicks, ...entry.redPicks].slice(2, 5).join(", ") || "data tidak tersedia"}`
            : "data tidak tersedia",
      })),
      recommendationCandidatesTop5: compactRecommendationCandidates(recommendationCandidates),
      constraints: {
        maxWords: 350,
        noRawDataDump: true,
        noFabrication: true,
        aiNotSourceOfTruth: true,
        missingData,
      },
    };

    const resultWithoutCache: Omit<HistoricalDraftRetrieverResult, "cacheHit"> = {
      recommendationSource,
      teamProfiles: {
        blue: blueSummary,
        red: redSummary,
      },
      matchupProfile: matchupSummary,
      similarGames,
      draftPatternMatches,
      likelyRepicks,
      likelyRebans,
      pivotCandidates,
      recommendationCandidates,
      compactWaferPayload,
      localSummary: buildLocalSummary(actingTeamId, opponentTeamId, similarGames, recommendationSource),
    };

    retrieverCache.set(key, resultWithoutCache);
    if (retrieverCache.size > MAX_CACHE_SIZE) {
      const firstKey = retrieverCache.keys().next().value;
      if (firstKey) retrieverCache.delete(firstKey);
    }

    return cloneResult(resultWithoutCache, false);
  }
}