import type { ScoreBreakdown, LaneStatus, DraftMode, MplScoreBreakdown, MplScoringContext } from "./draftTypes";

function normalizeHeroKey(value: string | undefined | null): string {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Draft Scoring Engine
 *
 * Multi-factor scoring system that evaluates how suitable a hero is
 * for the current draft state. Each factor contributes a deterministic
 * score based on lane fit, role balance, counters, synergy, meta tier,
 * draft phase, deny potential, and flex value.
 */

/** Hero data from the full hero JSON files (data/heroes/*.json) */
export interface HeroData {
  id: string;
  name: string;
  heroName: string;
  role: string[];
  lanes: string[];
  flex_lanes: string[];
  metaTier: string;
  mechanicCategory: string[];
  playstyleTags: string[];
  draftTags: string[];
  counterTags: string[];
  synergyTags: string[];
  macroTags: string[];
  powerSpikeTags: string[];
  [key: string]: any;
}

/** Context needed to score a hero in the current draft */
export interface ScoringContext {
  currentPicks: string[];
  enemyPicks: string[];
  currentBans: string[];
  enemyBans: string[];
  laneStatus: LaneStatus;
  mode: DraftMode;
  heroDatabase: HeroData[];
}

/**
 * Scores a hero candidate against the current draft context.
 * Returns a breakdown of all scoring factors.
 */
export function scoreHero(heroSlug: string, context: ScoringContext): ScoreBreakdown {
  const hero = context.heroDatabase.find(
    (h) => h.id?.toLowerCase() === heroSlug.toLowerCase() ||
           h.heroName?.toLowerCase() === heroSlug.toLowerCase()
  );

  if (!hero) {
    return {
      laneFit: 0,
      roleBalance: 0,
      counter: 0,
      synergy: 0,
      meta: 0,
      draftPhase: 0,
      denyPick: 0,
      flexValue: 0,
    };
  }

  return {
    laneFit: calcLaneFit(hero, context.laneStatus),
    roleBalance: calcRoleBalance(hero, context.currentPicks, context.heroDatabase),
    counter: calcCounter(hero, context.enemyPicks, context.heroDatabase),
    synergy: calcSynergy(hero, context.currentPicks, context.heroDatabase),
    meta: calcMeta(hero),
    draftPhase: calcDraftPhase(hero, context.currentPicks),
    denyPick: calcDenyPick(hero, context.enemyPicks, context.heroDatabase),
    flexValue: calcFlexValue(hero),
  };
}

/**
 * Sums all factors in a ScoreBreakdown to produce a total score.
 */
export function calculateTotalScore(breakdown: ScoreBreakdown): number {
  return (
    breakdown.laneFit +
    breakdown.roleBalance +
    breakdown.counter +
    breakdown.synergy +
    breakdown.meta +
    breakdown.draftPhase +
    breakdown.denyPick +
    breakdown.flexValue
  );
}


// ─── Scoring Factor Implementations ───────────────────────────────────────────

/**
 * calcLaneFit: 20 points if hero fills an empty lane, 5 if flex lane, 0 if all lanes full.
 */
function calcLaneFit(hero: HeroData, laneStatus: LaneStatus): number {
  const laneKeys: (keyof LaneStatus)[] = ["gold", "exp", "mid", "jungle", "roam"];
  const emptyLanes = laneKeys.filter((k) => laneStatus[k] === null);

  // If all lanes are full, no lane fit value
  if (emptyLanes.length === 0) {
    return 0;
  }

  // Check if the hero's primary lane is empty
  const primaryLanes = hero.lanes || [];
  for (const rawLane of primaryLanes) {
    const key = rawLaneToKey(rawLane);
    if (key && laneStatus[key] === null) {
      return 20;
    }
  }

  // Check if any flex lane is empty
  const flexLanes = hero.flex_lanes || [];
  for (const rawLane of flexLanes) {
    const key = rawLaneToKey(rawLane);
    if (key && laneStatus[key] === null) {
      return 5;
    }
  }

  return 0;
}

/**
 * calcRoleBalance: 15 points if team lacks this role type, 5 if already has it.
 */
function calcRoleBalance(hero: HeroData, currentPicks: string[], heroDatabase: HeroData[]): number {
  const heroRoles = hero.role || [];
  if (heroRoles.length === 0) return 0;

  // Gather roles already present in the team
  const teamRoles = new Set<string>();
  for (const pickName of currentPicks) {
    const pickHero = findHeroByName(pickName, heroDatabase);
    if (pickHero && pickHero.role) {
      for (const r of pickHero.role) {
        teamRoles.add(r.toLowerCase());
      }
    }
  }

  // If any of the hero's roles are missing from the team, high value
  for (const role of heroRoles) {
    if (!teamRoles.has(role.toLowerCase())) {
      return 15;
    }
  }

  // Role already covered
  return 5;
}

/**
 * calcCounter: Compare hero's counterTags against enemy picks' synergyTags and playstyleTags.
 * Higher overlap = higher score (0-18).
 */
function calcCounter(hero: HeroData, enemyPicks: string[], heroDatabase: HeroData[]): number {
  if (enemyPicks.length === 0) return 0;

  const heroCounterTags = (hero.counterTags || []).map((t) => t.toLowerCase());
  if (heroCounterTags.length === 0) return 0;

  // Collect enemy synergyTags and playstyleTags
  const enemyTags = new Set<string>();
  for (const enemyName of enemyPicks) {
    const enemyHero = findHeroByName(enemyName, heroDatabase);
    if (enemyHero) {
      for (const tag of enemyHero.synergyTags || []) {
        enemyTags.add(tag.toLowerCase());
      }
      for (const tag of enemyHero.playstyleTags || []) {
        enemyTags.add(tag.toLowerCase());
      }
    }
  }

  if (enemyTags.size === 0) return 0;

  // Count how many of the hero's counter tags match enemy tags
  let matches = 0;
  for (const tag of heroCounterTags) {
    if (enemyTags.has(tag)) {
      matches++;
    }
  }

  // Scale: each match contributes proportionally, max 18
  const maxPossibleMatches = Math.max(heroCounterTags.length, 1);
  const score = Math.min(18, Math.round((matches / maxPossibleMatches) * 18));
  return score;
}

/**
 * calcSynergy: Compare hero's synergyTags against ally picks' playstyleTags and macroTags.
 * Higher overlap = higher score (0-15).
 */
function calcSynergy(hero: HeroData, currentPicks: string[], heroDatabase: HeroData[]): number {
  if (currentPicks.length === 0) return 0;

  const heroSynergyTags = (hero.synergyTags || []).map((t) => t.toLowerCase());
  if (heroSynergyTags.length === 0) return 0;

  // Collect ally playstyleTags and macroTags
  const allyTags = new Set<string>();
  for (const allyName of currentPicks) {
    const allyHero = findHeroByName(allyName, heroDatabase);
    if (allyHero) {
      for (const tag of allyHero.playstyleTags || []) {
        allyTags.add(tag.toLowerCase());
      }
      for (const tag of allyHero.macroTags || []) {
        allyTags.add(tag.toLowerCase());
      }
    }
  }

  if (allyTags.size === 0) return 0;

  // Count synergy tag matches
  let matches = 0;
  for (const tag of heroSynergyTags) {
    if (allyTags.has(tag)) {
      matches++;
    }
  }

  // Scale: each match contributes proportionally, max 15
  const maxPossibleMatches = Math.max(heroSynergyTags.length, 1);
  const score = Math.min(15, Math.round((matches / maxPossibleMatches) * 15));
  return score;
}

/**
 * calcMeta: Use hero's metaTier field (S=12, A=9, B=6, C=3, D=0).
 */
function calcMeta(hero: HeroData): number {
  const tier = (hero.metaTier || "D").toUpperCase();
  switch (tier) {
    case "S": return 12;
    case "A": return 9;
    case "B": return 6;
    case "C": return 3;
    case "D": return 0;
    default: return 0;
  }
}

/**
 * calcDraftPhase: Early picks reward flex heroes, late picks reward specific counters (0-8).
 * Early = 0-1 picks, Late = 3-4 picks.
 */
function calcDraftPhase(hero: HeroData, currentPicks: string[]): number {
  const pickCount = currentPicks.length;
  const totalLanes = (hero.lanes || []).length + (hero.flex_lanes || []).length;
  const counterTagCount = (hero.counterTags || []).length;

  if (pickCount <= 1) {
    // Early draft: reward flex heroes (more lanes = more flex)
    if (totalLanes >= 3) return 8;
    if (totalLanes >= 2) return 5;
    return 2;
  } else if (pickCount >= 3) {
    // Late draft: reward specific counters (more counter tags = better counter pick)
    if (counterTagCount >= 4) return 8;
    if (counterTagCount >= 2) return 5;
    return 2;
  } else {
    // Mid draft: balanced value
    const flexScore = totalLanes >= 2 ? 3 : 1;
    const counterScore = counterTagCount >= 2 ? 3 : 1;
    return Math.min(8, flexScore + counterScore);
  }
}

/**
 * calcDenyPick: If hero has high meta tier and enemy lacks that role, score higher (0-7).
 */
function calcDenyPick(hero: HeroData, enemyPicks: string[], heroDatabase: HeroData[]): number {
  const tier = (hero.metaTier || "D").toUpperCase();

  // Only relevant for high-tier heroes (S or A)
  if (tier !== "S" && tier !== "A") return 0;

  const heroRoles = (hero.role || []).map((r) => r.toLowerCase());
  if (heroRoles.length === 0) return 0;

  // Check which roles the enemy already has
  const enemyRoles = new Set<string>();
  for (const enemyName of enemyPicks) {
    const enemyHero = findHeroByName(enemyName, heroDatabase);
    if (enemyHero && enemyHero.role) {
      for (const r of enemyHero.role) {
        enemyRoles.add(r.toLowerCase());
      }
    }
  }

  // If enemy lacks any of this hero's roles, deny value is high
  for (const role of heroRoles) {
    if (!enemyRoles.has(role)) {
      return tier === "S" ? 7 : 5;
    }
  }

  return 0;
}

/**
 * calcFlexValue: Count hero's lanes array length. More lanes = higher score (0-5).
 */
function calcFlexValue(hero: HeroData): number {
  const totalLanes = (hero.lanes || []).length + (hero.flex_lanes || []).length;
  if (totalLanes >= 4) return 5;
  if (totalLanes >= 3) return 4;
  if (totalLanes >= 2) return 3;
  if (totalLanes === 1) return 1;
  return 0;
}

// ─── Utility Functions ────────────────────────────────────────────────────────

/** Normalize a raw lane string to a LaneStatus key */
function rawLaneToKey(raw: string): keyof LaneStatus | null {
  const lower = raw.toLowerCase().replace(/\s+lane$/i, "").trim();
  switch (lower) {
    case "gold": return "gold";
    case "exp": return "exp";
    case "mid": return "mid";
    case "jungle": return "jungle";
    case "roam": return "roam";
    default: return null;
  }
}

/** Find a hero in the database by name (case-insensitive) */
function findHeroByName(name: string, heroDatabase: HeroData[]): HeroData | undefined {
  return heroDatabase.find(
    (h) => h.id?.toLowerCase() === name.toLowerCase() ||
           h.heroName?.toLowerCase() === name.toLowerCase() ||
           h.name?.toLowerCase() === name.toLowerCase()
  );
}


// ─── MPL Scoring Functions ────────────────────────────────────────────────────

/**
 * Scores a hero candidate for MPL mode using team-history-driven factors.
 * Completely independent from the ranked scoreHero() function.
 *
 * Priority hierarchy:
 *   teamHistory (30) > headToHead (25) > draftPattern (20) > teamComfort (15) > teamDeny (10) > meta (≈0)
 */
export function scoreMplHero(heroSlug: string, context: MplScoringContext): MplScoreBreakdown {
  const heroNameLower = normalizeHeroKey(heroSlug);

  let matchupHistoryScore = 0;
  let teamHistoryScore = 0;
  let comfortScore = 0;
  let patternScore = 0;
  let repickScore = 0;
  let rebanScore = 0;
  let pivotScore = 0;
  let counterScore = 0;
  let availabilityScore = 20;
  let metaScore = 0;

  if (context.allyIdentity) {
    for (const [name, stats] of context.allyIdentity.heroStats) {
      if (normalizeHeroKey(name) === heroNameLower && stats.pickCount >= 2) {
        const volumeBoost = Math.min(8, stats.pickCount * 1.5);
        teamHistoryScore = Math.round((stats.winRate / 100) * 22 + volumeBoost);
        break;
      }
    }
  }

  if (context.matchupProfile) {
    const h2hComfort = context.matchupProfile.teamMatchupComfort.find(
      (h) => normalizeHeroKey(h.heroName) === heroNameLower
    );
    if (h2hComfort) {
      matchupHistoryScore = Math.round((h2hComfort.winRate / 100) * 22 + Math.min(10, h2hComfort.pickCount * 2));
    }

    const denyBan = context.matchupProfile.opponentMatchupBans.find(
      (h) => normalizeHeroKey(h.heroName) === heroNameLower
    );
    if (denyBan) {
      rebanScore += Math.min(12, denyBan.banCount * 3);
    }
  }

  if (context.allyIdentity) {
    const comfortEntry = context.allyIdentity.comfortHeroes.find(
      (h) => normalizeHeroKey(h.heroName) === heroNameLower
    );
    if (comfortEntry) {
      comfortScore = Math.min(18, 8 + comfortEntry.pickCount * 2 + Math.round(comfortEntry.winRate / 20));
      repickScore = Math.min(14, comfortEntry.pickCount * 2);
    }
  }

  if (context.enemyIdentity) {
    const isEnemyComfort = context.enemyIdentity.comfortHeroes.find(
      (h) => normalizeHeroKey(h.heroName) === heroNameLower
    );
    if (isEnemyComfort) {
      counterScore += Math.min(12, 5 + isEnemyComfort.pickCount * 2);
    }
  }

  if (context.draftPatterns) {
    const firstPickHit = context.draftPatterns.firstPickTendencies.find(
      (entry) => normalizeHeroKey(entry.heroName) === heroNameLower
    );
    if (firstPickHit) {
      patternScore += Math.min(14, Math.round(firstPickHit.frequency * 12));
    }

    const sequencingHits = Array.from(context.draftPatterns.heroSequencing.entries()).flatMap(
      ([baseHero, followUps]) =>
        context.currentPicks.some((pick) => normalizeHeroKey(pick) === normalizeHeroKey(baseHero))
          ? followUps.filter((entry) => normalizeHeroKey(entry.followHero) === heroNameLower)
          : []
    );

    if (sequencingHits.length > 0) {
      patternScore += Math.min(
        18,
        sequencingHits.reduce((sum, entry) => sum + Math.round(entry.frequency * 10), 0)
      );
      pivotScore += Math.min(12, sequencingHits.reduce((sum, entry) => sum + Math.round(entry.frequency * 7), 0));
    }
  }

  if (context.enemyPicks.length > 0 && context.heroDatabase?.length) {
    const hero = context.heroDatabase.find(
      (entry: any) =>
        normalizeHeroKey(entry.heroName || entry.name || entry.id) === heroNameLower
    );
    const counterTags = new Set(Array.from(hero?.counterTags || []).map((tag) => String(tag).toLowerCase()));
    const enemyTagBag = new Set<string>();

    context.enemyPicks.forEach((pick) => {
      const enemyHero = context.heroDatabase?.find(
        (entry: any) =>
          normalizeHeroKey(entry.heroName || entry.name || entry.id) === normalizeHeroKey(pick)
      );
      ((enemyHero?.playstyleTags || []) as string[]).forEach((tag) => enemyTagBag.add(String(tag).toLowerCase()));
      ((enemyHero?.draftTags || []) as string[]).forEach((tag) => enemyTagBag.add(String(tag).toLowerCase()));
      ((enemyHero?.synergyTags || []) as string[]).forEach((tag) => enemyTagBag.add(String(tag).toLowerCase()));
    });

    const tagHits = Array.from(counterTags).filter((tag) => enemyTagBag.has(tag)).length;
    counterScore += Math.min(18, tagHits * 4);
  }

  const metaTierHero = context.heroDatabase?.find(
    (entry: any) =>
      normalizeHeroKey(entry.heroName || entry.name || entry.id) === heroNameLower
  );
  const tier = String(metaTierHero?.metaTier || "D").toUpperCase();
  metaScore = tier === "S" ? 4 : tier === "A" ? 3 : tier === "B" ? 2 : 1;

  const historyExists =
    matchupHistoryScore > 0 ||
    teamHistoryScore > 0 ||
    comfortScore > 0 ||
    patternScore > 0 ||
    repickScore > 0 ||
    rebanScore > 0 ||
    pivotScore > 0;

  if (historyExists) {
    metaScore = Math.min(metaScore, 2);
  }

  if (context.currentPicks.some((pick) => normalizeHeroKey(pick) === heroNameLower)) {
    availabilityScore = 0;
  }
  if ((context.currentBans || []).some((ban) => normalizeHeroKey(ban) === heroNameLower)) {
    availabilityScore = 0;
  }
  if ((context.enemyBans || []).some((ban) => normalizeHeroKey(ban) === heroNameLower)) {
    availabilityScore = 0;
  }
  if (context.enemyPicks.some((pick) => normalizeHeroKey(pick) === heroNameLower)) {
    availabilityScore = 0;
  }

  return {
    matchupHistoryScore,
    teamHistoryScore,
    comfortScore,
    patternScore,
    repickScore,
    rebanScore,
    pivotScore,
    counterScore,
    availabilityScore,
    metaScore,
  };
}

/**
 * Sums all factors in an MplScoreBreakdown to produce a total score.
 * Separate from calculateTotalScore() which is used for ranked mode only.
 */
export function calculateMplTotalScore(breakdown: MplScoreBreakdown): number {
  return (
    breakdown.matchupHistoryScore +
    breakdown.teamHistoryScore +
    breakdown.comfortScore +
    breakdown.patternScore +
    breakdown.repickScore +
    breakdown.rebanScore +
    breakdown.pivotScore +
    breakdown.counterScore +
    breakdown.availabilityScore +
    breakdown.metaScore
  );
}
