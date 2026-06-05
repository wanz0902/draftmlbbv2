import type { DraftRequestPayload, DraftRecommendation, LaneStatus } from "./draftTypes";
import { resolveLanes } from "./laneResolver";
import { scoreHero, calculateTotalScore } from "./draftScoringEngine";
import type { HeroData, ScoringContext } from "./draftScoringEngine";
import { scoreMplHero, calculateMplTotalScore } from "./draftScoringEngine";
import type {
  MplScoreBreakdown, MplScoringContext, MplDraftRecommendation,
  TeamIdentityProfile, MatchupProfile as MplMatchupProfile, DraftPatternProfile
} from "./draftTypes";

function heroKey(value: string | undefined | null): string {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getHeroDisplayName(hero: any): string {
  return hero.heroName || hero.name || hero.id || "";
}

function getHeroEntryKey(hero: any): string {
  return heroKey(getHeroDisplayName(hero));
}

/**
 * Draft Recommendation Engine
 *
 * Generates top-N hero recommendations based on the current draft state.
 * Filters unavailable heroes, scores all candidates, and returns the
 * best options with full score breakdowns and strategic reasoning.
 */

/**
 * Generates top 5 hero recommendations for the current draft step.
 *
 * @param payload - Current draft state from frontend
 * @param heroDatabase - Full array of hero JSON objects with AI metadata
 * @param heroesMaster - The heroes_master.json array for lane resolution
 * @returns Array of top 5 DraftRecommendation objects sorted by score descending
 */
export function generateRecommendations(
  payload: DraftRequestPayload,
  heroDatabase: any[],
  heroesMaster: any[]
): DraftRecommendation[] {
  // Determine ally/enemy based on currentTurnSide
  const isBlue = payload.currentTurnSide === "BLUE";
  const currentPicks = isBlue ? payload.bluePicks : payload.redPicks;
  const enemyPicks = isBlue ? payload.redPicks : payload.bluePicks;
  const currentBans = isBlue ? payload.blueBans : payload.redBans;
  const enemyBans = isBlue ? payload.redBans : payload.blueBans;

  // Resolve lane status for the current team's picks
  const laneStatus: LaneStatus = resolveLanes(currentPicks, heroesMaster);

  // Collect all unavailable hero names (banned + picked by both teams)
  const unavailable = new Set<string>(
    [
      ...payload.bluePicks,
      ...payload.redPicks,
      ...payload.blueBans,
      ...payload.redBans,
    ].map(heroKey)
  );

  // Build scoring context
  const scoringContext: ScoringContext = {
    currentPicks,
    enemyPicks,
    currentBans,
    enemyBans,
    laneStatus,
    mode: payload.mode,
    heroDatabase: heroDatabase as HeroData[],
  };

  // Score all available heroes
  const scored: Array<{
    hero: any;
    breakdown: ReturnType<typeof scoreHero>;
    total: number;
  }> = [];

  for (const hero of heroDatabase) {
    const heroName = getHeroEntryKey(hero);
    const heroId = heroKey(hero.id);

    // Skip heroes that are banned or already picked
    if (unavailable.has(heroName) || unavailable.has(heroId)) {
      continue;
    }

    const breakdown = scoreHero(hero.id || hero.heroName, scoringContext);
    const total = calculateTotalScore(breakdown);

    scored.push({ hero, breakdown, total });
  }

  // Sort by total score descending
  scored.sort((a, b) => b.total - a.total);

  // Take top 5
  const top5 = scored.slice(0, 5);

  // Build recommendation objects
  const recommendations: DraftRecommendation[] = top5.map((entry) => {
    const hero = entry.hero;
    const primaryLane = hero.lanes && hero.lanes.length > 0 ? hero.lanes[0] : "Flex";
    const primaryRole = hero.role && hero.role.length > 0 ? hero.role[0] : "Unknown";
    const reason = generateReason(entry.breakdown, hero, laneStatus);
    const tags: string[] = hero.draftTags || [];

    return {
      heroName: hero.heroName || hero.name,
      totalScore: entry.total,
      scoreBreakdown: entry.breakdown,
      lane: primaryLane,
      role: primaryRole,
      reason,
      tags,
    };
  });

  return recommendations;
}

/**
 * Generates an Indonesian-language reason string based on the highest
 * scoring factor in the breakdown.
 */
function generateReason(
  breakdown: ReturnType<typeof scoreHero>,
  hero: any,
  laneStatus: LaneStatus
): string {
  // Identify the top scoring factor
  const factors: Array<{ key: string; value: number }> = [
    { key: "laneFit", value: breakdown.laneFit },
    { key: "roleBalance", value: breakdown.roleBalance },
    { key: "counter", value: breakdown.counter },
    { key: "synergy", value: breakdown.synergy },
    { key: "meta", value: breakdown.meta },
    { key: "draftPhase", value: breakdown.draftPhase },
    { key: "denyPick", value: breakdown.denyPick },
    { key: "flexValue", value: breakdown.flexValue },
  ];

  factors.sort((a, b) => b.value - a.value);
  const topFactor = factors[0].key;

  switch (topFactor) {
    case "laneFit": {
      // Determine which empty lane this hero fills
      const emptyLane = findEmptyLaneForHero(hero, laneStatus);
      return `Mengisi ${emptyLane} yang kosong`;
    }
    case "roleBalance":
      return `Melengkapi kebutuhan role ${hero.role?.[0] || "tim"}`;
    case "counter":
      return "Counter pick melawan lineup musuh";
    case "synergy":
      return "Sinergi kuat dengan pick ally";
    case "meta":
      return `Hero meta tier ${(hero.metaTier || "S").toUpperCase()} saat ini`;
    case "draftPhase":
      return "Cocok untuk fase draft saat ini";
    case "denyPick":
      return "Deny pick prioritas musuh";
    case "flexValue":
      return "Flex pick dengan banyak opsi lane";
    default:
      return "Rekomendasi strategis berdasarkan analisis draft";
  }
}

/**
 * Finds the first empty lane that a hero can fill (primary lanes first, then flex).
 * Returns a user-friendly lane name in Indonesian context.
 */
function findEmptyLaneForHero(hero: any, laneStatus: LaneStatus): string {
  const laneMapping: Record<string, keyof LaneStatus> = {
    "gold lane": "gold",
    "gold": "gold",
    "exp lane": "exp",
    "exp": "exp",
    "mid lane": "mid",
    "mid": "mid",
    "jungle": "jungle",
    "roam": "roam",
  };

  const laneName: Record<keyof LaneStatus, string> = {
    gold: "Gold Lane",
    exp: "EXP Lane",
    mid: "Mid Lane",
    jungle: "Jungle",
    roam: "Roam",
  };

  // Check primary lanes
  const primaryLanes = hero.lanes || [];
  for (const raw of primaryLanes) {
    const key = laneMapping[raw.toLowerCase()];
    if (key && laneStatus[key] === null) {
      return laneName[key];
    }
  }

  // Check flex lanes
  const flexLanes = hero.flex_lanes || [];
  for (const raw of flexLanes) {
    const key = laneMapping[raw.toLowerCase()];
    if (key && laneStatus[key] === null) {
      return laneName[key];
    }
  }

  // Fallback: find any empty lane
  const keys: (keyof LaneStatus)[] = ["gold", "exp", "mid", "jungle", "roam"];
  for (const k of keys) {
    if (laneStatus[k] === null) {
      return laneName[k];
    }
  }

  return "lane yang tersedia";
}


// ─── MPL Draft Recommendation Engine ──────────────────────────────────────────

/**
 * Generates top 5 MPL hero recommendations for the current draft step.
 * Uses team identity, matchup profiles, and draft patterns instead of generic meta.
 * Completely independent from generateRecommendations() which handles ranked mode.
 *
 * @param payload - Current draft state from frontend
 * @param heroDatabase - Full array of hero JSON objects with AI metadata
 * @param heroesMaster - The heroes_master.json array for lane resolution
 * @param blueIdentity - Blue team's identity profile
 * @param redIdentity - Red team's identity profile
 * @param matchupProfile - Head-to-head matchup profile (or null)
 * @param draftPatterns - Ally team's draft pattern profile
 * @returns Array of top 5 MplDraftRecommendation objects sorted by MPL score descending
 */
export function generateMplRecommendations(
  payload: DraftRequestPayload,
  heroDatabase: any[],
  heroesMaster: any[],
  blueIdentity: TeamIdentityProfile,
  redIdentity: TeamIdentityProfile,
  matchupProfile: MplMatchupProfile | null,
  draftPatterns: DraftPatternProfile,
  limit: number = 5
): MplDraftRecommendation[] {
  // Determine ally/enemy identity based on currentTurnSide
  const isBlue = payload.currentTurnSide === "BLUE";
  const allyIdentity = isBlue ? blueIdentity : redIdentity;
  const enemyIdentity = isBlue ? redIdentity : blueIdentity;
  const currentPicks = isBlue ? payload.bluePicks : payload.redPicks;
  const enemyPicks = isBlue ? payload.redPicks : payload.bluePicks;

  // Determine phase: ban or pick
  const currentPhase = (payload.currentPhase || "").toLowerCase();
  const isBanPhase = currentPhase.includes("ban");
  const isPickPhase = currentPhase.includes("pick");

  // Collect all unavailable hero names (banned + picked by both teams)
  const unavailable = new Set<string>(
    [
      ...payload.bluePicks,
      ...payload.redPicks,
      ...payload.blueBans,
      ...payload.redBans,
    ].map((name) => name.toLowerCase())
  );

  // Resolve lane status for the current team's picks
  const laneStatus: LaneStatus = resolveLanes(currentPicks, heroesMaster);

  // Build MPL scoring context
  const mplContext: MplScoringContext = {
    allyIdentity,
    enemyIdentity,
    matchupProfile,
    draftPatterns,
    currentPicks,
    enemyPicks,
    currentBans: isBlue ? payload.blueBans : payload.redBans,
    enemyBans: isBlue ? payload.redBans : payload.blueBans,
    laneStatus,
    mode: "mpl",
    heroDatabase,
  };

  // Score all available heroes
  const scored: Array<{
    hero: any;
    breakdown: MplScoreBreakdown;
    total: number;
  }> = [];

  for (const hero of heroDatabase) {
    const heroName = (hero.heroName || hero.name || "").toLowerCase();
    const heroId = (hero.id || "").toLowerCase();

    // Skip heroes that are banned or already picked
    if (unavailable.has(heroName) || unavailable.has(heroId)) {
      continue;
    }

    const breakdown = scoreMplHero(hero.heroName || hero.name || hero.id, mplContext);
    const total = calculateMplTotalScore(breakdown);

    scored.push({ hero, breakdown, total });
  }

  // Sort by total score descending
  scored.sort((a, b) => b.total - a.total);

  // Generate recommendations based on phase
  let recommendations: MplDraftRecommendation[];

  if (isBanPhase) {
    recommendations = generateHistoryBanRecommendations(scored, allyIdentity, enemyIdentity, matchupProfile, unavailable, limit);
  } else {
    recommendations = generatePickRecommendations(scored, allyIdentity, enemyIdentity, matchupProfile, currentPicks, heroDatabase, unavailable, limit);
  }

  // Generate fallback branches for each recommendation
  for (const rec of recommendations) {
    rec.fallbackBranch = findFallbackHero(rec.heroName, rec.role, scored, recommendations);
  }

  return recommendations;
}

/**
 * Generates ban-phase recommendations with classification:
 * Comfort Ban, Target Ban, Meta Ban, Deny Ban, Noise Ban.
 * Ensures at least one Noise Ban.
 */
function generateHistoryBanRecommendations(
  scored: Array<{ hero: any; breakdown: MplScoreBreakdown; total: number }>,
  allyIdentity: TeamIdentityProfile,
  enemyIdentity: TeamIdentityProfile,
  matchupProfile: MplMatchupProfile | null,
  unavailable: Set<string>,
  limit: number
): MplDraftRecommendation[] {
  const recommendations: MplDraftRecommendation[] = [];
  const usedHeroes = new Set<string>();
  const hasMatchup = !!matchupProfile && matchupProfile.headToHeadGames > 0;
  const recommendationSource = hasMatchup ? "matchup-history" : "team-history";

  const pushBan = (
    heroName: string,
    banType: MplDraftRecommendation["banType"],
    reason: string,
    evidence: MplDraftRecommendation["evidence"]
  ) => {
    if (recommendations.length >= limit) return;
    const candidateKey = heroKey(heroName);
    if (!candidateKey || unavailable.has(candidateKey) || usedHeroes.has(candidateKey)) return;

    const heroEntry = scored.find(
      (entry) => getHeroEntryKey(entry.hero) === candidateKey || heroKey(entry.hero.id) === candidateKey
    );
    if (!heroEntry) return;

    recommendations.push(buildMplRecommendation(heroEntry, {
      banType,
      reason,
      evidence,
    }));
    usedHeroes.add(candidateKey);
  };

  if (hasMatchup && matchupProfile) {
    for (const comfortHero of matchupProfile.opponentMatchupComfort) {
      pushBan(
        comfortHero.heroName,
        "Target Ban",
        `${enemyIdentity.teamId} pernah memakai ${comfortHero.heroName} dalam head-to-head vs ${allyIdentity.teamId} (${comfortHero.pickCount} game, ${comfortHero.winRate.toFixed(0)}% WR). Ban ini memotong opsi matchup-specific mereka.`,
        {
          pickCount: comfortHero.pickCount,
          winRate: comfortHero.winRate,
          source: `${enemyIdentity.teamId} vs ${allyIdentity.teamId} Matchup History (${matchupProfile.headToHeadGames} games)`,
          team: enemyIdentity.teamId,
          recommendationSource,
        }
      );
    }

    for (const ban of matchupProfile.opponentMatchupBans) {
      pushBan(
        ban.heroName,
        "Deny Ban",
        `${enemyIdentity.teamId} sering menempatkan ${ban.heroName} di ban/pool head-to-head vs ${allyIdentity.teamId}. Ini deny ban berdasarkan pola matchup, bukan global meta.`,
        {
          banCount: ban.banCount,
          source: `${enemyIdentity.teamId} vs ${allyIdentity.teamId} Matchup Ban History (${matchupProfile.headToHeadGames} games)`,
          team: enemyIdentity.teamId,
          recommendationSource,
        }
      );
    }
  }

  for (const comfortHero of enemyIdentity.comfortHeroes) {
    pushBan(
      comfortHero.heroName,
      "Comfort Ban",
      `${enemyIdentity.teamId} memakai ${comfortHero.heroName} ${comfortHero.pickCount} kali di data MPL yang tersedia dengan ${comfortHero.winRate.toFixed(0)}% WR. Ban ini menutup comfort option lawan.`,
      {
        pickCount: comfortHero.pickCount,
        winRate: comfortHero.winRate,
        source: `${enemyIdentity.teamId} Team History (${enemyIdentity.totalGames} games)`,
        team: enemyIdentity.teamId,
        recommendationSource,
      }
    );
  }

  for (const pref of enemyIdentity.firstPickPreferences) {
    pushBan(
      pref.heroName,
      "Target Ban",
      `${enemyIdentity.teamId} punya pola first-pick ${pref.heroName} sebanyak ${pref.count} kali (${pref.winRate.toFixed(0)}% WR). Ban ini menutup prioritas draft lawan.`,
      {
        pickCount: pref.count,
        winRate: pref.winRate,
        source: `${enemyIdentity.teamId} First Pick History (${enemyIdentity.totalGames} games)`,
        team: enemyIdentity.teamId,
        recommendationSource,
      }
    );
  }

  for (const contested of enemyIdentity.mostContestedHeroes) {
    pushBan(
      contested.heroName,
      "Deny Ban",
      `${contested.heroName} sering muncul di pool ${enemyIdentity.teamId} (${contested.pickCount} pick, ${contested.banCount} ban/ban against). Ini deny ban berbasis contest rate tim lawan.`,
      {
        pickCount: contested.pickCount,
        banCount: contested.banCount,
        source: `${enemyIdentity.teamId} Contested Hero History (${enemyIdentity.totalGames} games)`,
        team: enemyIdentity.teamId,
        recommendationSource,
      }
    );
  }

  if (recommendations.length === 0) {
    for (const entry of scored) {
      if (recommendations.length >= limit) break;
      const candidateKey = getHeroEntryKey(entry.hero);
      if (!candidateKey || unavailable.has(candidateKey) || usedHeroes.has(candidateKey)) continue;
      recommendations.push(buildMplRecommendation(entry, {
        banType: "Meta Fallback Ban",
        reason: "Data team belum tersedia, menggunakan fallback meta dengan filter availability.",
        evidence: {
          source: "Meta Fallback",
          recommendationSource: "global-fallback",
        },
      }));
      usedHeroes.add(candidateKey);
    }
  }

  return recommendations.slice(0, limit);
}

function generateBanRecommendations(
  scored: Array<{ hero: any; breakdown: MplScoreBreakdown; total: number }>,
  allyIdentity: TeamIdentityProfile,
  enemyIdentity: TeamIdentityProfile,
  matchupProfile: MplMatchupProfile | null,
  unavailable: Set<string>,
  limit: number
): MplDraftRecommendation[] {
  const recommendations: MplDraftRecommendation[] = [];
  const usedHeroes = new Set<string>();
  let hasNoiseBan = false;

  // Priority 1: Enemy comfort heroes (Comfort Ban / Deny Ban)
  for (const comfortHero of enemyIdentity.comfortHeroes) {
    if (recommendations.length >= 2) break;
    const heroNameLower = comfortHero.heroName.toLowerCase();
    if (unavailable.has(heroNameLower) || usedHeroes.has(heroNameLower)) continue;

    const heroEntry = scored.find(
      (s) => (s.hero.heroName || s.hero.name || "").toLowerCase() === heroNameLower ||
             (s.hero.id || "").toLowerCase() === heroNameLower
    );
    if (!heroEntry) continue;

    const isDenyBan = heroEntry.breakdown.counterScore >= 8;
    const banType = isDenyBan ? "Deny Ban" as const : "Comfort Ban" as const;

    const reason = isDenyBan
      ? `Deny pick — hero comfort ${enemyIdentity.teamId}. Mengambilnya mencegah musuh memakai hero andalannya.`
      : `Comfort hero ${enemyIdentity.teamId} — dipick ${comfortHero.pickCount} kali dengan winrate ${comfortHero.winRate.toFixed(0)}%. Target ban prioritas.`;

    recommendations.push(buildMplRecommendation(heroEntry, {
      banType,
      reason,
      evidence: {
        pickCount: comfortHero.pickCount,
        winRate: comfortHero.winRate,
        source: `${enemyIdentity.teamId} identity profile (${enemyIdentity.totalGames} games)`,
      },
    }));
    usedHeroes.add(heroNameLower);
  }

  // Priority 2: Target ban from first pick preferences or signature compositions
  if (recommendations.length < 2) {
    for (const pref of enemyIdentity.firstPickPreferences) {
      if (recommendations.length >= 2) break;
      const heroNameLower = pref.heroName.toLowerCase();
      if (unavailable.has(heroNameLower) || usedHeroes.has(heroNameLower)) continue;

      const heroEntry = scored.find(
        (s) => (s.hero.heroName || s.hero.name || "").toLowerCase() === heroNameLower ||
               (s.hero.id || "").toLowerCase() === heroNameLower
      );
      if (!heroEntry) continue;

      const reason = `Target ban — hero first pick ${enemyIdentity.teamId} (dipick pertama ${pref.count} kali, winrate ${pref.winRate.toFixed(0)}%).`;

      recommendations.push(buildMplRecommendation(heroEntry, {
        banType: "Target Ban",
        reason,
        evidence: {
          pickCount: pref.count,
          winRate: pref.winRate,
          source: `${enemyIdentity.teamId} first pick preferences (${enemyIdentity.totalGames} games)`,
        },
      }));
      usedHeroes.add(heroNameLower);
    }
  }

  // Priority 3: Noise Ban — meta-relevant hero NOT in enemy profile
  // At least 1 of the 3 must be a Noise Ban
  if (recommendations.length < limit) {
    const noiseBan = findNoiseBanCandidate(scored, enemyIdentity, allyIdentity, unavailable, usedHeroes);
    if (noiseBan) {
      recommendations.push(noiseBan);
      usedHeroes.add(noiseBan.heroName.toLowerCase());
      hasNoiseBan = true;
    }
  }

  // Fill remaining slots if needed (up to 3)
  if (recommendations.length < limit) {
    for (const entry of scored) {
      if (recommendations.length >= limit) break;
      const heroName = (entry.hero.heroName || entry.hero.name || "").toLowerCase();
      if (usedHeroes.has(heroName) || unavailable.has(heroName)) continue;

      // Check if this is in enemy priority picks
      const isTargetBan = enemyIdentity.firstPickPreferences.some(
        (p) => p.heroName.toLowerCase() === heroName
      ) || enemyIdentity.mostContestedHeroes.some(
        (c) => c.heroName.toLowerCase() === heroName
      );

      const banType = isTargetBan ? "Target Ban" as const : "Meta Ban" as const;
      const reason = isTargetBan
        ? `Target ban — hero contested ${enemyIdentity.teamId}. Sering dipick/diban di match mereka.`
        : `Meta ban — hero tier tinggi yang relevan secara strategis untuk fase ban ini.`;

      const stats = getHeroStatsFromIdentity(heroName, enemyIdentity);

      recommendations.push(buildMplRecommendation(entry, {
        banType,
        reason,
        evidence: {
          pickCount: stats?.pickCount,
          winRate: stats?.winRate,
          source: `${enemyIdentity.teamId} identity profile (${enemyIdentity.totalGames} games)`,
        },
      }));
      usedHeroes.add(heroName);
    }
  }

  // Ensure at least one Noise Ban — if not yet present, replace the lowest-scored non-noise recommendation
  if (!hasNoiseBan && recommendations.length > 0) {
    const noiseBan = findNoiseBanCandidate(scored, enemyIdentity, allyIdentity, unavailable, usedHeroes);
    if (noiseBan) {
      // Replace the last recommendation with noise ban
      recommendations[recommendations.length - 1] = noiseBan;
    }
  }

  return recommendations.slice(0, limit);
}

/**
 * Generates pick-phase recommendations with classification:
 * Comfort Pick, Signature Pick, Flex Pick, Counter Pick, Deny Pick.
 */
function generatePickRecommendations(
  scored: Array<{ hero: any; breakdown: MplScoreBreakdown; total: number }>,
  allyIdentity: TeamIdentityProfile,
  enemyIdentity: TeamIdentityProfile,
  matchupProfile: MplMatchupProfile | null,
  currentPicks: string[],
  heroDatabase: any[],
  unavailable: Set<string>,
  limit: number
): MplDraftRecommendation[] {
  const recommendations: MplDraftRecommendation[] = [];
  const usedHeroes = new Set<string>();

  // Iterate top scored heroes and classify each
  for (const entry of scored) {
    if (recommendations.length >= limit) break;
    const heroName = getHeroEntryKey(entry.hero);
    if (usedHeroes.has(heroName) || unavailable.has(heroName)) continue;

    const pickType = classifyPickType(heroName, entry, allyIdentity, enemyIdentity, currentPicks);
    const reason = generatePickReason(heroName, pickType, allyIdentity, enemyIdentity, entry);
    const stats = getHeroStatsFromIdentity(heroName, allyIdentity);
    const pairingInfo = getPairingInfo(heroName, allyIdentity, currentPicks);
    const recommendationSource =
      matchupProfile && matchupProfile.headToHeadGames > 0 && entry.breakdown.matchupHistoryScore > 0
        ? "matchup-history"
        : allyIdentity.totalGames > 0
          ? "team-history"
          : "global-fallback";

    recommendations.push(buildMplRecommendation(entry, {
      pickType,
      reason,
      evidence: {
        pickCount: stats?.pickCount,
        winRate: stats?.winRate,
        source: recommendationSource === "matchup-history"
          ? `${allyIdentity.teamId} Matchup History (${matchupProfile?.headToHeadGames || 0} games)`
          : `${allyIdentity.teamId} Team History (${allyIdentity.totalGames} games)`,
        team: allyIdentity.teamId,
        recommendationSource,
        pairingData: pairingInfo || undefined,
      },
    }));
    usedHeroes.add(heroName);
  }

  return recommendations.slice(0, limit);
}

/**
 * Classifies a pick into one of: Comfort Pick, Signature Pick, Flex Pick, Counter Pick, Deny Pick.
 */
function classifyPickType(
  heroNameLower: string,
  entry: { hero: any; breakdown: MplScoreBreakdown; total: number },
  allyIdentity: TeamIdentityProfile,
  enemyIdentity: TeamIdentityProfile,
  currentPicks: string[]
): "Comfort Pick" | "Signature Pick" | "Flex Pick" | "Counter Pick" | "Deny Pick" {
  const { breakdown } = entry;
  const hero = entry.hero;

  // Check if hero is in ally comfort list → Comfort Pick
  const isAllyComfort = allyIdentity.comfortHeroes.some(
    (h) => heroKey(h.heroName) === heroNameLower
  );

  // Check if hero is part of ally signature composition AND ally already has the pair partner
  const isSignature = allyIdentity.signatureCompositions.some((comp) => {
    const compHeroKeys = comp.heroes.map(heroKey);
    if (!compHeroKeys.includes(heroNameLower)) return false;
    // Check if at least one partner is already picked
    return compHeroKeys.some(
      (h) => h !== heroNameLower && currentPicks.some((p) => heroKey(p) === h)
    );
  });

  // Check if hero has flex value (3+ lanes)
  const totalLanes = ((hero.lanes || []).length + (hero.flex_lanes || []).length);
  const isFlex = totalLanes >= 3;

  // Check if hero's score is dominated by teamDeny
  const isDeny = breakdown.counterScore > 0 &&
    breakdown.counterScore >= breakdown.comfortScore &&
    breakdown.counterScore >= breakdown.teamHistoryScore;

  if (isSignature) return "Signature Pick";
  if (isAllyComfort) return "Comfort Pick";
  if (isDeny) return "Deny Pick";
  if (isFlex) return "Flex Pick";
  return "Counter Pick";
}

/**
 * Generates Indonesian-language reason for a pick recommendation.
 */
function generatePickReason(
  heroNameLower: string,
  pickType: string,
  allyIdentity: TeamIdentityProfile,
  enemyIdentity: TeamIdentityProfile,
  entry: { hero: any; breakdown: MplScoreBreakdown; total: number }
): string {
  const allyStats = getHeroStatsFromIdentity(heroNameLower, allyIdentity);
  const heroDisplayName = entry.hero.heroName || entry.hero.name || heroNameLower;

  switch (pickType) {
    case "Comfort Pick": {
      const wr = allyStats?.winRate ? allyStats.winRate.toFixed(0) : "N/A";
      const pc = allyStats?.pickCount || 0;
      return `Hero andalan ${allyIdentity.teamId} — sering dipakai dengan winrate ${wr}%. Dipick ${pc} kali. Cocok untuk draft saat ini.`;
    }
    case "Signature Pick": {
      const comp = allyIdentity.signatureCompositions.find((c) =>
        c.heroes.some((h) => heroKey(h) === heroNameLower)
      );
      const partners = comp ? comp.heroes.filter((h) => heroKey(h) !== heroNameLower).join(", ") : "";
      const wr = comp ? comp.winRate.toFixed(0) : "N/A";
      return `Signature composition ${allyIdentity.teamId} — melengkapi combo dengan ${partners} (winrate ${wr}%).`;
    }
    case "Flex Pick": {
      const lanes = [...(entry.hero.lanes || []), ...(entry.hero.flex_lanes || [])].join(", ");
      return `Flex pick — ${heroDisplayName} bisa dimainkan di ${lanes}. Menjaga ambiguitas draft.`;
    }
    case "Deny Pick": {
    const enemyStats = getHeroStatsFromIdentity(heroNameLower, enemyIdentity);
      const wr = enemyStats?.winRate ? enemyStats.winRate.toFixed(0) : "N/A";
      return `Deny pick — hero comfort musuh ${enemyIdentity.teamId}. Mengambilnya mencegah musuh memakai hero andalannya (winrate musuh ${wr}%).`;
    }
    case "Counter Pick":
    default: {
      return `Counter pick berdasarkan analisis matchup dan scoring MPL. Efektif melawan lineup musuh saat ini.`;
    }
  }
}

/**
 * Finds a Noise Ban candidate: a meta-relevant hero NOT in the enemy's profile.
 * This creates strategic ambiguity by banning heroes that don't reveal the gameplan.
 */
function findNoiseBanCandidate(
  scored: Array<{ hero: any; breakdown: MplScoreBreakdown; total: number }>,
  enemyIdentity: TeamIdentityProfile,
  allyIdentity: TeamIdentityProfile,
  unavailable: Set<string>,
  usedHeroes: Set<string>
): MplDraftRecommendation | null {
  // Find heroes with high meta tier (S or A) that are NOT in enemy comfort/priority lists
  const enemyHeroPool = new Set<string>();
  for (const ch of enemyIdentity.comfortHeroes) {
    enemyHeroPool.add(ch.heroName.toLowerCase());
  }
  for (const fp of enemyIdentity.firstPickPreferences) {
    enemyHeroPool.add(fp.heroName.toLowerCase());
  }
  for (const mc of enemyIdentity.mostContestedHeroes) {
    enemyHeroPool.add(mc.heroName.toLowerCase());
  }
  for (const ms of enemyIdentity.mostSuccessfulHeroes) {
    enemyHeroPool.add(ms.heroName.toLowerCase());
  }

  for (const entry of scored) {
    const heroName = (entry.hero.heroName || entry.hero.name || "").toLowerCase();
    if (unavailable.has(heroName) || usedHeroes.has(heroName)) continue;

    const metaTier = ((entry.hero.metaTier || "D") as string).toUpperCase();
    const isHighMeta = metaTier === "S" || metaTier === "A";

    // Noise Ban: high meta tier AND not in enemy data
    if (isHighMeta && !enemyHeroPool.has(heroName)) {
      const reason = `Noise ban — hero meta tier ${metaTier} yang tidak ada di profil musuh. Menciptakan ambiguitas dan menyembunyikan gameplan sebenarnya.`;

      return buildMplRecommendation(entry, {
        banType: "Noise Ban",
        reason,
        evidence: {
          pickCount: undefined,
          winRate: undefined,
          source: `Strategic noise — hero meta tier ${metaTier}, tidak terdaftar di ${enemyIdentity.teamId} pool`,
        },
      });
    }
  }

  // If no pure noise ban found, pick a high-scored hero not directly in enemy comfort
  for (const entry of scored) {
    const heroName = (entry.hero.heroName || entry.hero.name || "").toLowerCase();
    if (unavailable.has(heroName) || usedHeroes.has(heroName)) continue;

    const isEnemyComfort = enemyIdentity.comfortHeroes.some(
      (h) => h.heroName.toLowerCase() === heroName
    );

    if (!isEnemyComfort) {
      const reason = `Noise ban — ban strategis untuk menyembunyikan gameplan. Tidak menarget hero spesifik musuh.`;

      return buildMplRecommendation(entry, {
        banType: "Noise Ban",
        reason,
        evidence: {
          pickCount: undefined,
          winRate: undefined,
          source: `Strategic noise — diversionary ban`,
        },
      });
    }
  }

  return null;
}

/**
 * Finds a fallback hero in the same role as the primary recommendation.
 */
function findFallbackHero(
  primaryHeroName: string,
  primaryRole: string,
  scored: Array<{ hero: any; breakdown: MplScoreBreakdown; total: number }>,
  existingRecommendations: MplDraftRecommendation[]
): { heroName: string; reason: string } | undefined {
  const usedNames = new Set(existingRecommendations.map((r) => heroKey(r.heroName)));
  usedNames.add(heroKey(primaryHeroName));

  for (const entry of scored) {
    const heroName = getHeroEntryKey(entry.hero);
    if (usedNames.has(heroName)) continue;

    const heroRoles = (entry.hero.role || []).map((r: string) => r.toLowerCase());
    if (heroRoles.includes(primaryRole.toLowerCase())) {
      const displayName = entry.hero.heroName || entry.hero.name;
      return {
        heroName: displayName,
        reason: `Alternatif ${primaryRole} jika ${primaryHeroName} tidak tersedia.`,
      };
    }
  }

  return undefined;
}

/**
 * Gets hero stats from a team identity profile.
 */
function getHeroStatsFromIdentity(
  heroNameLower: string,
  identity: TeamIdentityProfile
): { pickCount: number; winRate: number } | null {
  for (const [name, stats] of identity.heroStats) {
    if (heroKey(name) === heroNameLower) {
      return { pickCount: stats.pickCount, winRate: stats.winRate };
    }
  }
  // Also check comfort heroes
  const comfort = identity.comfortHeroes.find(
    (h) => heroKey(h.heroName) === heroNameLower
  );
  if (comfort) {
    return { pickCount: comfort.pickCount, winRate: comfort.winRate };
  }
  return null;
}

/**
 * Gets pairing info string if the hero has known pairings with currently picked allies.
 */
function getPairingInfo(
  heroNameLower: string,
  allyIdentity: TeamIdentityProfile,
  currentPicks: string[]
): string | null {
  for (const pairing of allyIdentity.heroPairings) {
    const pairA = heroKey(pairing.heroA);
    const pairB = heroKey(pairing.heroB);

    if (pairA === heroNameLower || pairB === heroNameLower) {
      const partner = pairA === heroNameLower ? pairing.heroB : pairing.heroA;
      // Check if the partner is already picked
      if (currentPicks.some((p) => heroKey(p) === heroKey(partner))) {
        return `Paired with ${partner} ${pairing.coOccurrence} times (${pairing.winRate.toFixed(0)}% WR)`;
      }
    }
  }
  return null;
}

/**
 * Builds an MplDraftRecommendation object from a scored hero entry and additional data.
 */
function buildMplRecommendation(
  entry: { hero: any; breakdown: MplScoreBreakdown; total: number },
  overrides: {
    banType?: MplDraftRecommendation["banType"];
    pickType?: MplDraftRecommendation["pickType"];
    reason: string;
    evidence: MplDraftRecommendation["evidence"];
  }
): MplDraftRecommendation {
  const hero = entry.hero;
  const primaryLane = hero.lanes && hero.lanes.length > 0 ? hero.lanes[0] : "Flex";
  const primaryRole = hero.role && hero.role.length > 0 ? hero.role[0] : "Unknown";
  const tags: string[] = hero.draftTags || [];

  return {
    heroName: hero.heroName || hero.name,
    totalScore: entry.total,
    scoreBreakdown: entry.breakdown,
    lane: primaryLane,
    role: primaryRole,
    reason: overrides.reason,
    tags,
    pickType: overrides.pickType,
    banType: overrides.banType,
    evidence: overrides.evidence,
  };
}
