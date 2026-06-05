import type { LaneStatus } from "./draftTypes";
import { resolveLanes } from "./laneResolver";

type Side = "blue" | "red";
type LaneKey = keyof LaneStatus;

export interface DraftAnalysisContext {
  heroes: any[];
  blueTeamName?: string;
  redTeamName?: string;
  mode: "mpl" | "ranked" | "custom";
  blueLaneStatus?: LaneStatus;
  redLaneStatus?: LaneStatus;
  blueComfortHeroes?: string[];
  redComfortHeroes?: string[];
  matchupSummary?: string;
  recommendationSource?: string;
}

export interface DraftMetricBreakdown {
  label: string;
  blue: number;
  red: number;
  source: "real-data" | "heuristic";
}

export interface LaneMatchupResult {
  lane: string;
  blueHero: string;
  redHero: string;
  favoredSide: "blue" | "red" | "even";
  matchupScore: number;
  reason: string;
}

export interface TeamRiskSummary {
  blue: string[];
  red: string[];
}

export interface DraftAnalysisResult {
  predictedWinner: "blue" | "red" | "even";
  blueWinProbability: number;
  redWinProbability: number;
  confidence: number;
  confidenceLabel: string;
  blueScore: number;
  redScore: number;
  laneMatchups: LaneMatchupResult[];
  keyFactors: string[];
  risks: TeamRiskSummary;
  recommendations: string[];
  scoreBreakdown: {
    overallScore: DraftMetricBreakdown;
    tierScore: DraftMetricBreakdown;
    laneCoverageScore: DraftMetricBreakdown;
    counterScore: DraftMetricBreakdown;
    synergyScore: DraftMetricBreakdown;
    roleBalanceScore: DraftMetricBreakdown;
    powerSpikeScore: DraftMetricBreakdown;
    teamComfortScore: DraftMetricBreakdown;
    ccScore: DraftMetricBreakdown;
    frontlineScore: DraftMetricBreakdown;
    damageBalanceScore: DraftMetricBreakdown;
    scalingScore: DraftMetricBreakdown;
    earlyGamePressure: DraftMetricBreakdown;
    lateGameInsurance: DraftMetricBreakdown;
  };
  teamPanels: {
    blue: TeamPanelSummary;
    red: TeamPanelSummary;
  };
  dataNotes: string[];
}

export interface TeamPanelSummary {
  assignedHeroes: Array<{
    heroName: string;
    lane: string;
    role: string;
    allowedLanes: string[];
    mismatch: boolean;
  }>;
  missingLanes: string[];
  filledLanes: string[];
  roleWarnings: string[];
  damageWarning: string | null;
  ccLevel: string;
  ccValue: number;
  frontlineLevel: string;
  frontlineValue: number;
  burstDpsRatio: string;
  overallScore: number;
  laneCoverageScore: number;
  damageBalanceScore: number;
  scalingScore: number;
  earlyGamePressure: number;
  lateGameInsurance: number;
  teamComfortScore: number;
  dataSourceNotes: string[];
}

const laneOrder: LaneKey[] = ["exp", "jungle", "mid", "gold", "roam"];
const laneLabelMap: Record<LaneKey, string> = {
  exp: "EXP",
  jungle: "Jungle",
  mid: "Mid",
  gold: "Gold",
  roam: "Roam",
};

function normalizeKey(value: string): string {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function getHeroName(hero: any): string {
  return hero?.hero_name || hero?.heroName || hero?.name || hero?.id || "";
}

function findHero(heroes: any[], heroName: string) {
  const key = normalizeKey(heroName);
  return heroes.find((hero) => normalizeKey(getHeroName(hero)) === key || normalizeKey(hero?.id || "") === key);
}

function roleArray(hero: any): string[] {
  if (!hero) return [];
  if (Array.isArray(hero.role)) return hero.role.filter(Boolean);
  if (typeof hero.role === "string" && hero.role) return [hero.role];
  if (typeof hero?.aiTags?.heroDraftIdentity === "string") return [hero.aiTags.heroDraftIdentity];
  return [];
}

function laneArray(hero: any): string[] {
  if (!hero) return [];
  if (Array.isArray(hero.lanes) && hero.lanes.length > 0) return hero.lanes;
  if (typeof hero.lane === "string" && hero.lane) return [hero.lane];
  return [];
}

function flexLaneArray(hero: any): string[] {
  if (!hero) return [];
  return Array.isArray(hero.flex_lanes) ? hero.flex_lanes : [];
}

function normalizeLaneLabel(value: string): string {
  const lower = String(value || "").toLowerCase().replace(/\s+lane$/i, "").trim();
  switch (lower) {
    case "exp":
      return "EXP";
    case "jungle":
      return "Jungle";
    case "mid":
      return "Mid";
    case "gold":
      return "Gold";
    case "roam":
      return "Roam";
    default:
      return "Flex";
  }
}

function laneToKey(value: string): LaneKey | null {
  const lower = String(value || "").toLowerCase().replace(/\s+lane$/i, "").trim();
  switch (lower) {
    case "exp":
      return "exp";
    case "jungle":
      return "jungle";
    case "mid":
      return "mid";
    case "gold":
      return "gold";
    case "roam":
      return "roam";
    default:
      return null;
  }
}

function allowedLaneLabels(hero: any): string[] {
  const labels = [...laneArray(hero), ...flexLaneArray(hero)].map(normalizeLaneLabel).filter(Boolean);
  return Array.from(new Set(labels));
}

function tierValue(hero: any): number {
  const tier = String(hero?.tier || hero?.metaTier || "C").toUpperCase();
  if (tier.includes("S+")) return 100;
  if (tier.includes("S")) return 92;
  if (tier.includes("A")) return 78;
  if (tier.includes("B")) return 62;
  if (tier.includes("C")) return 46;
  return 32;
}

function damageProfile(hero: any): "physical" | "magic" | "mixed" | "unknown" {
  const direct = String(hero?.damage_type || "").toLowerCase();
  if (direct.includes("mixed")) return "mixed";
  if (direct.includes("magic")) return "magic";
  if (direct.includes("phys")) return "physical";

  const skills = Object.values(hero?.skills || {}) as any[];
  const types = new Set<string>();
  for (const skill of skills) {
    const type = String(skill?.damageType || "").toLowerCase();
    if (type.includes("magic")) types.add("magic");
    if (type.includes("phys")) types.add("physical");
  }
  if (types.has("magic") && types.has("physical")) return "mixed";
  if (types.has("magic")) return "magic";
  if (types.has("physical")) return "physical";
  return "unknown";
}

function powerSpikeLabel(hero: any): string[] {
  const direct = hero?.power_spike;
  if (Array.isArray(direct) && direct.length > 0) return direct.map(String);
  const aiTag = hero?.aiTags?.powerSpikeTiming;
  if (typeof aiTag === "string" && aiTag) return [aiTag];
  return [];
}

function macroTags(hero: any): string[] {
  const tags = hero?.draft_analysis?.macro_identity;
  if (Array.isArray(tags)) return tags.map(String);
  return [];
}

function synergyNames(hero: any): string[] {
  return Array.isArray(hero?.synergies) ? hero.synergies.map(String) : [];
}

function counterNames(hero: any): string[] {
  return Array.isArray(hero?.counters) ? hero.counters.map(String) : [];
}

function counteredByNames(hero: any): string[] {
  return Array.isArray(hero?.countered_by) ? hero.countered_by.map(String) : [];
}

function crowdControlValue(hero: any): number {
  const baseValue = Number(hero?.crowd_control || 0);
  const skills = Object.values(hero?.skills || {}) as any[];
  const skillValue = skills.reduce((total, skill) => {
    const raw = skill?.crowdControlType;
    const entries: string[] = Array.isArray(raw)
      ? raw
      : String(raw || "").split(",").map((s) => s.trim()).filter(Boolean);
    const hits = entries.filter((e) => String(e).toLowerCase() !== "none").length;
    return hits > 0 ? total + hits * 12 : total;
  }, 0);

  // Fallback heuristic by role when no structured skill data
  const roles = roleArray(hero).map((r) => r.toLowerCase());
  let roleHeuristic = 0;
  if (roles.includes("tank")) roleHeuristic += 24;
  if (roles.includes("support")) roleHeuristic += 16;
  if (roles.includes("fighter")) roleHeuristic += 8;
  if (roles.includes("mage")) roleHeuristic += 6;
  if (roles.includes("assassin")) roleHeuristic += 4;

  const tags = macroTags(hero).map((t) => t.toLowerCase());
  if (tags.some((t) => t.includes("cc") || t.includes("crowd") || t.includes("stun") || t.includes("knock"))) {
    roleHeuristic += 10;
  }

  return clamp(baseValue * 8 + skillValue + roleHeuristic, 0, 100);
}

function frontlineValue(hero: any): number {
  const roles = roleArray(hero).map((role) => role.toLowerCase());
  const tags = macroTags(hero)
    .concat(hero?.draftTags || [])
    .concat(hero?.strategicTags || [])
    .map((tag) => String(tag).toLowerCase());

  let value = 0;
  if (roles.includes("tank")) value += 36;
  if (roles.includes("fighter")) value += 18;
  if (roles.includes("support")) value += 10;

  if (tags.some((tag) => tag.includes("engage") || tag.includes("frontline") || tag.includes("zone"))) value += 10;
  if (tags.some((tag) => tag.includes("durable") || tag.includes("sustain") || tag.includes("peel"))) value += 8;
  if (tags.some((tag) => tag.includes("initiator"))) value += 6;

  return clamp(value, 0, 40);
}

function burstValue(hero: any): number {
  const roles = roleArray(hero).map((role) => role.toLowerCase());
  let value = 0;
  if (roles.includes("assassin")) value += 38;
  if (roles.includes("mage")) value += 22;
  if (roles.includes("fighter")) value += 12;
  return value;
}

function sustainedValue(hero: any): number {
  const roles = roleArray(hero).map((role) => role.toLowerCase());
  let value = 0;
  if (roles.includes("marksman")) value += 40;
  if (roles.includes("fighter")) value += 16;
  if (roles.includes("mage")) value += 10;
  return value;
}

function scalingValue(hero: any): number {
  const spikes = powerSpikeLabel(hero).join(" ").toLowerCase();
  if (spikes.includes("late")) return 22;
  if (spikes.includes("early")) return 8;
  return 15;
}

function earlyPressureValue(hero: any): number {
  const spikes = powerSpikeLabel(hero).join(" ").toLowerCase();
  if (spikes.includes("early")) return 22;
  const roles = roleArray(hero).map((role) => role.toLowerCase());
  if (roles.includes("assassin")) return 18;
  if (roles.includes("fighter")) return 14;
  return 10;
}

function lateInsuranceValue(hero: any): number {
  const spikes = powerSpikeLabel(hero).join(" ").toLowerCase();
  if (spikes.includes("late")) return 24;
  const roles = roleArray(hero).map((role) => role.toLowerCase());
  if (roles.includes("marksman")) return 20;
  if (roles.includes("mage")) return 14;
  return 9;
}

function buildAssignments(
  picks: string[],
  laneStatus: LaneStatus | undefined,
  heroes: any[]
): TeamPanelSummary["assignedHeroes"] {
  const fallbackStatus = laneStatus || resolveLanes(picks, heroes);
  const assignments: TeamPanelSummary["assignedHeroes"] = [];
  const heroLaneMap = new Map<string, string>();

  for (const lane of laneOrder) {
    const heroName = fallbackStatus[lane];
    if (!heroName) continue;
    heroLaneMap.set(normalizeKey(heroName), laneLabelMap[lane]);
  }

  for (const heroName of picks) {
    const hero = findHero(heroes, heroName);
    const assignedLane = heroLaneMap.get(normalizeKey(heroName)) || normalizeLaneLabel(laneArray(hero)[0] || "Flex");
    const allowedLanes = allowedLaneLabels(hero);
    assignments.push({
      heroName,
      lane: assignedLane,
      role: roleArray(hero)[0] || "Unknown",
      allowedLanes,
      mismatch: allowedLanes.length > 0 && !allowedLanes.includes(assignedLane),
    });
  }

  return assignments;
}

function calcLaneCoverage(assignments: TeamPanelSummary["assignedHeroes"]): { score: number; filled: string[]; missing: string[] } {
  const filled = Array.from(new Set(assignments.map((entry) => entry.lane).filter((lane) => lane !== "Flex")));
  const missing = ["EXP", "Jungle", "Mid", "Gold", "Roam"].filter((lane) => !filled.includes(lane));
  return {
    score: round((filled.length / 5) * 100),
    filled,
    missing,
  };
}

function calcRoleBalance(picks: string[], heroes: any[]): { score: number; warnings: string[] } {
  const roleCount = new Map<string, number>();
  let frontlineCount = 0;
  let marksmanCount = 0;

  for (const heroName of picks) {
    const hero = findHero(heroes, heroName);
    for (const role of roleArray(hero)) {
      const key = role.toLowerCase();
      roleCount.set(key, (roleCount.get(key) || 0) + 1);
    }
    const roles = roleArray(hero).map((role) => role.toLowerCase());
    if (roles.includes("tank") || roles.includes("fighter") || roles.includes("support")) frontlineCount += 1;
    if (roles.includes("marksman")) marksmanCount += 1;
  }

  const uniqueRoles = roleCount.size;
  let score = uniqueRoles * 16;
  const warnings: string[] = [];

  if (frontlineCount === 0) {
    score -= 20;
    warnings.push("No frontline");
  }
  if (marksmanCount === 0) {
    score -= 10;
    warnings.push("No true DPS carry");
  }
  if ((roleCount.get("assassin") || 0) >= 2) {
    score -= 8;
    warnings.push("Double assassin increases volatility");
  }
  if ((roleCount.get("marksman") || 0) >= 2) {
    score -= 8;
    warnings.push("Double marksman weakens front line");
  }

  return {
    score: clamp(round(score), 0, 100),
    warnings,
  };
}

function calcDamageBalance(picks: string[], heroes: any[]): { score: number; warning: string | null } {
  let physical = 0;
  let magic = 0;

  for (const heroName of picks) {
    const profile = damageProfile(findHero(heroes, heroName));
    if (profile === "physical") physical += 1;
    if (profile === "magic") magic += 1;
    if (profile === "mixed") {
      physical += 1;
      magic += 1;
    }
  }

  const total = Math.max(physical + magic, 1);
  const physicalShare = physical / total;
  const magicShare = magic / total;
  const balance = 100 - Math.abs(physicalShare - magicShare) * 100;

  if (physical >= 4 && magic <= 1) {
    return { score: clamp(round(balance), 0, 100), warning: "Too much physical damage" };
  }
  if (magic >= 4 && physical <= 1) {
    return { score: clamp(round(balance), 0, 100), warning: "Too much magic damage" };
  }
  if (physical === 0 || magic === 0) {
    return { score: clamp(round(balance), 0, 100), warning: "Single damage profile is easy to itemize" };
  }

  return { score: clamp(round(balance), 0, 100), warning: null };
}

function calcSynergyScore(picks: string[], heroes: any[]): number {
  if (picks.length <= 1) return 35;
  let matches = 0;
  let possible = 0;
  for (let index = 0; index < picks.length; index += 1) {
    const hero = findHero(heroes, picks[index]);
    const synergy = synergyNames(hero).map(normalizeKey);
    const macro = macroTags(hero).map((tag) => tag.toLowerCase());
    for (let inner = index + 1; inner < picks.length; inner += 1) {
      const ally = findHero(heroes, picks[inner]);
      const allyKey = normalizeKey(getHeroName(ally));
      const allyMacro = macroTags(ally).map((tag) => tag.toLowerCase());
      possible += 1;
      if (synergy.includes(allyKey)) matches += 1;
      else if (macro.some((tag) => allyMacro.includes(tag))) matches += 0.6;
    }
  }
  if (possible === 0) return 35;
  return clamp(round((matches / possible) * 100), 20, 100);
}

function calcCounterScore(teamPicks: string[], enemyPicks: string[], heroes: any[]): number {
  if (teamPicks.length === 0 || enemyPicks.length === 0) return 35;
  let score = 35;
  for (const heroName of teamPicks) {
    const hero = findHero(heroes, heroName);
    const counters = counterNames(hero).map(normalizeKey);
    const enemyCounteredBy = enemyPicks.flatMap((enemyName) => counteredByNames(findHero(heroes, enemyName)).map(normalizeKey));
    const directHits = enemyPicks.filter((enemyName) => counters.includes(normalizeKey(enemyName))).length;
    const mirroredHits = enemyCounteredBy.filter((entry) => entry === normalizeKey(heroName)).length;
    score += directHits * 10 + mirroredHits * 6;
  }
  return clamp(round(score), 15, 100);
}

function calcPowerSpikeTeamScore(picks: string[], heroes: any[]): number {
  if (picks.length === 0) return 35;
  const values = picks.map((heroName) => {
    const spikes = powerSpikeLabel(findHero(heroes, heroName)).join(" ").toLowerCase();
    if (spikes.includes("late")) return 78;
    if (spikes.includes("early")) return 72;
    return 68;
  });
  return round(values.reduce((total, value) => total + value, 0) / values.length);
}

function calcComfortScore(picks: string[], comfortHeroes: string[] | undefined, mode: string, heroes: any[]): { score: number | null; source: "real-data" | "heuristic"; note: string | null } {
  if (mode !== "mpl") {
    return { score: null, source: "heuristic", note: "Data tidak tersedia untuk mode non-MPL." };
  }
  if (!comfortHeroes || comfortHeroes.length === 0) {
    return { score: null, source: "heuristic", note: "Data tidak tersedia — team comfort history tidak tersedia." };
  }
  const comfortSet = new Set(comfortHeroes.map(normalizeKey));
  const weightedMatches = picks.reduce((total, heroName) => {
    const inComfort = comfortSet.has(normalizeKey(heroName));
    if (!inComfort) return total;
    const hero = findHero(heroes, heroName);
    const pickFreq = Number(hero?.picks_total || 0);
    const winRate = Number(parseFloat(String(hero?.win_rate || hero?.winrate || "50")) || 50);
    return total + 1 + Math.min(1.5, pickFreq / 10) + Math.min(1.5, winRate / 100);
  }, 0);
  const maxWeight = Math.max(picks.length * 4, 1);
  return {
    score: round((weightedMatches / maxWeight) * 100),
    source: "real-data",
    note: null,
  };
}

function teamPanelSummary(
  picks: string[],
  heroes: any[],
  laneStatus: LaneStatus | undefined,
  comfortHeroes: string[] | undefined,
  mode: DraftAnalysisContext["mode"]
): TeamPanelSummary {
  const assignments = buildAssignments(picks, laneStatus, heroes);
  const laneCoverage = calcLaneCoverage(assignments);
  const roleBalance = calcRoleBalance(picks, heroes);
  const damageBalance = calcDamageBalance(picks, heroes);
  const comfort = calcComfortScore(picks, comfortHeroes, mode, heroes);

  const ccValue = clamp(round(picks.reduce((total, heroName) => total + crowdControlValue(findHero(heroes, heroName)), 0) / Math.max(picks.length, 1)), 0, 100);
  const frontlineValueTotal = clamp(round(picks.reduce((total, heroName) => total + frontlineValue(findHero(heroes, heroName)), 0)), 0, 100);
  const burstTotal = picks.reduce((total, heroName) => total + burstValue(findHero(heroes, heroName)), 0);
  const dpsTotal = picks.reduce((total, heroName) => total + sustainedValue(findHero(heroes, heroName)), 0);
  const scalingScore = clamp(round(picks.reduce((total, heroName) => total + scalingValue(findHero(heroes, heroName)), 0) / Math.max(picks.length, 1) * 4.2), 0, 100);
  const earlyGamePressure = clamp(round(picks.reduce((total, heroName) => total + earlyPressureValue(findHero(heroes, heroName)), 0) / Math.max(picks.length, 1) * 4.1), 0, 100);
  const lateGameInsurance = clamp(round(picks.reduce((total, heroName) => total + lateInsuranceValue(findHero(heroes, heroName)), 0) / Math.max(picks.length, 1) * 4), 0, 100);

  const ccLevel = ccValue >= 75 ? "High" : ccValue >= 48 ? "Medium" : "Low";
  const frontlineLevel = frontlineValueTotal >= 70 ? "High" : frontlineValueTotal >= 40 ? "Medium" : "Low";

  const tierScore = round(picks.reduce((total, heroName) => total + tierValue(findHero(heroes, heroName)), 0) / Math.max(picks.length, 1));
  const synergyScore = calcSynergyScore(picks, heroes);
  const powerSpikeScore = calcPowerSpikeTeamScore(picks, heroes);

  const dataSourceNotes = [comfort.note].filter(Boolean) as string[];

  return {
    assignedHeroes: assignments,
    missingLanes: laneCoverage.missing,
    filledLanes: laneCoverage.filled,
    roleWarnings: roleBalance.warnings,
    damageWarning: damageBalance.warning,
    ccLevel,
    ccValue,
    frontlineLevel,
    frontlineValue: frontlineValueTotal,
    burstDpsRatio: `${Math.max(1, Math.round(burstTotal))}:${Math.max(1, Math.round(dpsTotal))}`,
    overallScore: 0,
    laneCoverageScore: laneCoverage.score,
    damageBalanceScore: damageBalance.score,
    scalingScore,
    earlyGamePressure,
    lateGameInsurance,
    teamComfortScore: comfort.score ?? 0,
    dataSourceNotes: [
      ...dataSourceNotes,
      comfort.source === "heuristic" ? "Team comfort: data tidak tersedia." : "Team comfort memakai history MPL.",
      picks.length < 5 ? "Sebagian metrik bersifat heuristic estimate karena draft belum penuh." : "Metrik utama memakai hero data terstruktur.",
      `Tier baseline ${tierScore}, synergy ${synergyScore}, power spike ${powerSpikeScore}.`,
    ],
  };
}

function matchupReason(blueHero: any, redHero: any): { score: number; favoredSide: "blue" | "red" | "even"; reason: string } {
  if (!blueHero && !redHero) {
    return { score: 0, favoredSide: "even", reason: "Data tidak tersedia." };
  }
  if (blueHero && !redHero) {
    return { score: 24, favoredSide: "blue", reason: "Lane lawan belum terisi." };
  }
  if (!blueHero && redHero) {
    return { score: -24, favoredSide: "red", reason: "Lane lawan belum terisi." };
  }

  const blueName = getHeroName(blueHero);
  const redName = getHeroName(redHero);
  let score = round((tierValue(blueHero) - tierValue(redHero)) / 8);
  const blueCounters = counterNames(blueHero).map(normalizeKey);
  const redCounters = counterNames(redHero).map(normalizeKey);
  if (blueCounters.includes(normalizeKey(redName))) score += 16;
  if (redCounters.includes(normalizeKey(blueName))) score -= 16;

  const blueMacro = macroTags(blueHero).map((tag) => tag.toLowerCase());
  const redMacro = macroTags(redHero).map((tag) => tag.toLowerCase());
  if (blueMacro.some((tag) => tag.includes("zone")) && redMacro.some((tag) => tag.includes("dash"))) score += 8;
  if (redMacro.some((tag) => tag.includes("zone")) && blueMacro.some((tag) => tag.includes("dash"))) score -= 8;

  const favoredSide = score > 6 ? "blue" : score < -6 ? "red" : "even";
  let reason = "Lane relatif seimbang berdasarkan tier dan utility.";
  if (favoredSide === "blue") {
    reason = blueCounters.includes(normalizeKey(redName))
      ? `${blueName} memiliki counter langsung ke ${redName}.`
      : `${blueName} menawarkan tempo lane dan utilitas lebih stabil.`;
  }
  if (favoredSide === "red") {
    reason = redCounters.includes(normalizeKey(blueName))
      ? `${redName} memiliki counter langsung ke ${blueName}.`
      : `${redName} menawarkan pressure lane yang lebih kuat.`;
  }

  return {
    score: clamp(round(score), -35, 35),
    favoredSide,
    reason,
  };
}

export function calculateDraftAnalysis(
  blueTeam: string[],
  redTeam: string[],
  context: DraftAnalysisContext
): DraftAnalysisResult {
  const bluePanel = teamPanelSummary(blueTeam, context.heroes, context.blueLaneStatus, context.blueComfortHeroes, context.mode);
  const redPanel = teamPanelSummary(redTeam, context.heroes, context.redLaneStatus, context.redComfortHeroes, context.mode);

  const blueTierScore = round(blueTeam.reduce((total, heroName) => total + tierValue(findHero(context.heroes, heroName)), 0) / Math.max(blueTeam.length, 1));
  const redTierScore = round(redTeam.reduce((total, heroName) => total + tierValue(findHero(context.heroes, heroName)), 0) / Math.max(redTeam.length, 1));
  const blueCounterScore = calcCounterScore(blueTeam, redTeam, context.heroes);
  const redCounterScore = calcCounterScore(redTeam, blueTeam, context.heroes);
  const blueSynergyScore = calcSynergyScore(blueTeam, context.heroes);
  const redSynergyScore = calcSynergyScore(redTeam, context.heroes);
  const blueRoleScore = calcRoleBalance(blueTeam, context.heroes).score;
  const redRoleScore = calcRoleBalance(redTeam, context.heroes).score;
  const bluePowerScore = calcPowerSpikeTeamScore(blueTeam, context.heroes);
  const redPowerScore = calcPowerSpikeTeamScore(redTeam, context.heroes);
  const blueComfort = calcComfortScore(blueTeam, context.blueComfortHeroes, context.mode, context.heroes);
  const redComfort = calcComfortScore(redTeam, context.redComfortHeroes, context.mode, context.heroes);

  const blueScore = round(
    blueTierScore * 0.2 +
      bluePanel.laneCoverageScore * 0.15 +
      blueCounterScore * 0.2 +
      blueSynergyScore * 0.15 +
      blueRoleScore * 0.15 +
      bluePowerScore * 0.1 +
      (blueComfort.score ?? 0) * 0.05
  );
  const redScore = round(
    redTierScore * 0.2 +
      redPanel.laneCoverageScore * 0.15 +
      redCounterScore * 0.2 +
      redSynergyScore * 0.15 +
      redRoleScore * 0.15 +
      redPowerScore * 0.1 +
      (redComfort.score ?? 0) * 0.05
  );

  bluePanel.overallScore = blueScore;
  redPanel.overallScore = redScore;

  const laneMatchups: LaneMatchupResult[] = laneOrder.map((laneKey) => {
    const blueHeroName = context.blueLaneStatus?.[laneKey] || "";
    const redHeroName = context.redLaneStatus?.[laneKey] || "";
    const blueHero = findHero(context.heroes, blueHeroName);
    const redHero = findHero(context.heroes, redHeroName);
    const matchup = matchupReason(blueHero, redHero);
    return {
      lane: laneLabelMap[laneKey],
      blueHero: blueHeroName || "Data tidak tersedia",
      redHero: redHeroName || "Data tidak tersedia",
      favoredSide: matchup.favoredSide,
      matchupScore: matchup.score,
      reason: matchup.reason,
    };
  });

  const scoreDiff = blueScore - redScore;
  const blueWinProbability = clamp(round(50 + scoreDiff * 1.35), 20, 80);
  const redWinProbability = round(100 - blueWinProbability);
  const confidence = clamp(round(Math.abs(scoreDiff) * 1.8 + Math.abs(blueWinProbability - 50) * 0.6), 35, 95);
  const confidenceLabel = confidence >= 78 ? "High Confidence" : confidence >= 58 ? "Medium Confidence" : "Low Confidence";
  const predictedWinner = scoreDiff > 2 ? "blue" : scoreDiff < -2 ? "red" : "even";

  const keyFactors: string[] = [];
  if (blueCounterScore - redCounterScore >= 12) keyFactors.push("Blue memiliki counter edge yang lebih jelas terhadap core lawan.");
  if (redCounterScore - blueCounterScore >= 12) keyFactors.push("Red memiliki counter edge yang lebih jelas terhadap core lawan.");
  if (bluePanel.frontlineValue - redPanel.frontlineValue >= 18) keyFactors.push("Blue memiliki frontline lebih tebal untuk buka fight dan cover backline.");
  if (redPanel.frontlineValue - bluePanel.frontlineValue >= 18) keyFactors.push("Red memiliki frontline lebih tebal untuk kontrol area objektif.");
  if (bluePanel.lateGameInsurance - redPanel.lateGameInsurance >= 12) keyFactors.push("Blue punya late game insurance lebih stabil.");
  if (redPanel.lateGameInsurance - bluePanel.lateGameInsurance >= 12) keyFactors.push("Red punya late game insurance lebih stabil.");
  if (bluePanel.earlyGamePressure - redPanel.earlyGamePressure >= 14) keyFactors.push("Blue unggul tempo early dan berpotensi memaksa turtle lebih cepat.");
  if (redPanel.earlyGamePressure - bluePanel.earlyGamePressure >= 14) keyFactors.push("Red unggul tempo early dan berpotensi memaksa turtle lebih cepat.");
  if (bluePanel.missingLanes.length > 0) keyFactors.push(`Blue masih punya gap lane coverage: ${bluePanel.missingLanes.join(", ")}.`);
  if (redPanel.missingLanes.length > 0) keyFactors.push(`Red masih punya gap lane coverage: ${redPanel.missingLanes.join(", ")}.`);

  const risks: TeamRiskSummary = {
    blue: [],
    red: [],
  };

  if (bluePanel.frontlineValue < 38) risks.blue.push("Missing tank / weak frontline");
  if (redPanel.frontlineValue < 38) risks.red.push("Missing tank / weak frontline");
  if (bluePanel.damageWarning) risks.blue.push(bluePanel.damageWarning);
  if (redPanel.damageWarning) risks.red.push(redPanel.damageWarning);
  if (bluePanel.ccValue < 34) risks.blue.push("Low hard CC");
  if (redPanel.ccValue < 34) risks.red.push("Low hard CC");
  if (bluePanel.roleWarnings.length > 0) risks.blue.push(...bluePanel.roleWarnings);
  if (redPanel.roleWarnings.length > 0) risks.red.push(...redPanel.roleWarnings);
  if (bluePanel.missingLanes.includes("Roam")) risks.blue.push("No roam assignment");
  if (redPanel.missingLanes.includes("Roam")) risks.red.push("No roam assignment");

  const recommendations: string[] = [];
  if (bluePanel.missingLanes.length > 0) recommendations.push(`Blue perlu menutup lane ${bluePanel.missingLanes.join(", ")} atau swap lane assignment.`);
  if (redPanel.missingLanes.length > 0) recommendations.push(`Red perlu menutup lane ${redPanel.missingLanes.join(", ")} atau swap lane assignment.`);
  if ((blueComfort.score === null || blueComfort.score === 0) && context.mode === "mpl") recommendations.push("Blue belum masuk comfort profile tim — pertimbangkan comfort hero history jika masih bisa pivot.");
  if ((redComfort.score === null || redComfort.score === 0) && context.mode === "mpl") recommendations.push("Red belum masuk comfort profile tim — pertimbangkan comfort hero history jika masih bisa pivot.");
  if (bluePanel.damageWarning) recommendations.push("Blue perlu lindungi sumber magic/physical yang minor agar damage profile tidak mudah dibaca.");
  if (redPanel.damageWarning) recommendations.push("Red perlu lindungi sumber magic/physical yang minor agar damage profile tidak mudah dibaca.");

  const dataNotes = [
    context.matchupSummary ? `MPL matchup context: ${context.matchupSummary}` : "Matchup history tidak tersedia.",
    blueComfort.note || "Blue comfort score memakai data real jika tersedia.",
    redComfort.note || "Red comfort score memakai data real jika tersedia.",
    context.recommendationSource ? `Recommendation source: ${context.recommendationSource}.` : "Recommendation source: heuristic summary.",
  ].filter(Boolean);

  return {
    predictedWinner,
    blueWinProbability,
    redWinProbability,
    confidence,
    confidenceLabel,
    blueScore,
    redScore,
    laneMatchups,
    keyFactors,
    risks,
    recommendations,
    scoreBreakdown: {
      overallScore: { label: "Overall Score", blue: blueScore, red: redScore, source: "real-data" },
      tierScore: { label: "Tier Score", blue: blueTierScore, red: redTierScore, source: "real-data" },
      laneCoverageScore: { label: "Lane Coverage", blue: bluePanel.laneCoverageScore, red: redPanel.laneCoverageScore, source: "real-data" },
      counterScore: { label: "Counter Edge", blue: blueCounterScore, red: redCounterScore, source: "real-data" },
      synergyScore: { label: "Synergy Score", blue: blueSynergyScore, red: redSynergyScore, source: "real-data" },
      roleBalanceScore: { label: "Role Balance", blue: blueRoleScore, red: redRoleScore, source: "heuristic" },
      powerSpikeScore: { label: "Power Spike", blue: bluePowerScore, red: redPowerScore, source: "real-data" },
      teamComfortScore: { label: "Team Comfort", blue: blueComfort.score ?? 0, red: redComfort.score ?? 0, source: context.mode === "mpl" ? blueComfort.source : "heuristic" },
      ccScore: { label: "CC Score", blue: bluePanel.ccValue, red: redPanel.ccValue, source: "real-data" },
      frontlineScore: { label: "Frontline", blue: bluePanel.frontlineValue, red: redPanel.frontlineValue, source: "heuristic" },
      damageBalanceScore: { label: "Damage Balance", blue: bluePanel.damageBalanceScore, red: redPanel.damageBalanceScore, source: "real-data" },
      scalingScore: { label: "Scaling", blue: bluePanel.scalingScore, red: redPanel.scalingScore, source: "real-data" },
      earlyGamePressure: { label: "Early Pressure", blue: bluePanel.earlyGamePressure, red: redPanel.earlyGamePressure, source: "real-data" },
      lateGameInsurance: { label: "Late Insurance", blue: bluePanel.lateGameInsurance, red: redPanel.lateGameInsurance, source: "real-data" },
    },
    teamPanels: {
      blue: bluePanel,
      red: redPanel,
    },
    dataNotes,
  };
}