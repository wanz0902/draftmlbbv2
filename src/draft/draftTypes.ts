/**
 * Draft Coach Type Definitions
 *
 * Core types used across the lane resolver, scoring engine,
 * recommendation engine, and frontend components.
 */

/** Draft mode: MPL for team-based drafting, Ranked for solo meta-based */
export type DraftMode = "mpl" | "ranked" | "custom";

/** Side of the draft */
export type DraftSide = "BLUE" | "RED";

/** Type of draft action */
export type DraftActionType = "BAN" | "PICK";

/** Current phase of the draft sequence */
export type DraftPhase = "BANS_1" | "PICKS_1" | "BANS_2" | "PICKS_2" | "COMPLETED";

/** MLBB lane assignments */
export type Lane = "Gold" | "EXP" | "Mid" | "Jungle" | "Roam";

/** Current lane status for a team — null means lane is unfilled */
export interface LaneStatus {
  gold: string | null;
  exp: string | null;
  mid: string | null;
  jungle: string | null;
  roam: string | null;
}

/** Breakdown of all scoring factors for a recommendation */
export interface ScoreBreakdown {
  laneFit: number;
  roleBalance: number;
  counter: number;
  synergy: number;
  meta: number;
  draftPhase: number;
  denyPick: number;
  flexValue: number;
}

/** A single hero recommendation with scoring details */
export interface DraftRecommendation {
  heroName: string;
  totalScore: number;
  scoreBreakdown: ScoreBreakdown;
  lane: string;
  role: string;
  reason: string;
  tags: string[];
}

/** Payload sent from frontend to request draft recommendations */
export interface DraftRequestPayload {
  bluePicks: string[];
  redPicks: string[];
  blueBans: string[];
  redBans: string[];
  currentPhase: string;
  currentTurnSide: string;
  mode: DraftMode;
  blueTeam?: string;
  redTeam?: string;
}

export interface HistoricalDraftRetrieverInput {
  mode: DraftMode;
  blueTeam?: string;
  redTeam?: string;
  bluePicks: string[];
  redPicks: string[];
  blueBans: string[];
  redBans: string[];
  currentPicks: string[];
  currentBans: string[];
  currentTurn: DraftSide;
  currentPhase: string;
}

export interface HistoricalHeroTrend {
  heroName: string;
  count: number;
  winRate: number | null;
  reason: string;
  source: string;
}

export interface SimilarHistoricalGame {
  seriesId: string;
  gameId: string;
  sourceLabel: string;
  week: number | null;
  gameNumber: number;
  blueTeam: string;
  redTeam: string;
  winner: string;
  similarityScore: number;
  matchingSignals: string[];
  bluePicks: string[];
  redPicks: string[];
  blueBans: string[];
  redBans: string[];
}

export interface DraftPatternMatch {
  patternType: "first-pick" | "ban-sequence" | "pick-sequence" | "comfort-priority";
  teamId: string;
  confidence: number;
  summary: string;
  heroes: string[];
  source: string;
}

export interface HistoricalTeamProfileSummary {
  teamId: string;
  totalGames: number;
  winRate: number;
  topPicks: Array<{ heroName: string; count: number; winRate: number }>;
  topBans: Array<{ heroName: string; count: number; frequency: number }>;
  firstPicks: Array<{ heroName: string; count: number; winRate: number }>;
  comfortHeroes: Array<{ heroName: string; count: number; winRate: number }>;
}

export interface HistoricalMatchupSummary {
  teamId: string;
  opponentId: string;
  headToHeadGames: number;
  teamSeriesWins: number;
  opponentSeriesWins: number;
  teamGameWins: number;
  opponentGameWins: number;
  headToHeadWinRate: number;
  summary: string;
}

export interface CompactDraftState {
  bluePicks: string[];
  redPicks: string[];
  blueBans: string[];
  redBans: string[];
  currentTurn: DraftSide;
  currentPhase: string;
}

export interface CompactWaferPayload {
  mode: DraftMode;
  teams: {
    blue: string;
    red: string;
  };
  currentDraftState: CompactDraftState;
  topTeamPicks: {
    blue: Array<{ heroName: string; count: number; winRate: number }>;
    red: Array<{ heroName: string; count: number; winRate: number }>;
  };
  topTeamBans: {
    blue: Array<{ heroName: string; count: number; frequency: number }>;
    red: Array<{ heroName: string; count: number; frequency: number }>;
  };
  headToHeadSummary: {
    summary: string;
    games: number;
    teamSeriesWins: number;
    opponentSeriesWins: number;
  };
  similarGamesTop3: Array<{
    sourceLabel: string;
    similarityScore: number;
    matchingSignals: string[];
    pivotNote: string;
  }>;
  recommendationCandidatesTop5: Array<{
    heroName: string;
    actionType: "pick" | "ban";
    score: number;
    type: string;
    reason: string;
    evidence: string[];
    fallback?: string;
  }>;
  constraints: {
    maxWords: number;
    noRawDataDump: boolean;
    noFabrication: boolean;
    aiNotSourceOfTruth: boolean;
    missingData: string[];
  };
}

export interface HistoricalDraftRetrieverResult {
  cacheHit: boolean;
  recommendationSource: "matchup-history" | "team-history" | "global-fallback";
  teamProfiles: {
    blue: HistoricalTeamProfileSummary;
    red: HistoricalTeamProfileSummary;
  };
  matchupProfile: HistoricalMatchupSummary;
  similarGames: SimilarHistoricalGame[];
  draftPatternMatches: DraftPatternMatch[];
  likelyRepicks: HistoricalHeroTrend[];
  likelyRebans: HistoricalHeroTrend[];
  pivotCandidates: HistoricalHeroTrend[];
  recommendationCandidates: MplDraftRecommendation[];
  compactWaferPayload: CompactWaferPayload;
  localSummary: string;
}

/** MPL team profile data */
export interface TeamProfile {
  key: string;
  name: string;
  logo: string;
  signatureHeroes: string[];
  preferredStyle: string[];
}

// ============================================================================
// MPL Draft Intelligence Engine — Interfaces
// ============================================================================

// --- Team Identity ---

export interface HeroPickStats {
  heroName: string;
  pickCount: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  banCount: number;
  banAgainstCount: number;
  positions: number[]; // pick positions 1-5
}

export interface ComfortHero {
  heroName: string;
  pickCount: number;
  winRate: number;
  winCount: number;
}

export interface PickPreference {
  heroName: string;
  count: number;
  winRate: number;
}

export interface SignatureComposition {
  heroes: string[];
  gameCount: number;
  winCount: number;
  winRate: number;
}

export interface HeroPairing {
  heroA: string;
  heroB: string;
  coOccurrence: number;
  winRate: number;
}

export interface TargetBanProfile {
  opponentId: string;
  bans: Array<{ heroName: string; banCount: number }>;
}

export type DraftTendency =
  | "early_aggression"
  | "scaling"
  | "flex_first"
  | "objective_control"
  | "split_push";

export interface HeroSuccessEntry {
  heroName: string;
  winRate: number;
  gamesPlayed: number;
}

export interface ContestedHeroEntry {
  heroName: string;
  pickCount: number;
  banCount: number;
  totalContestRate: number;
}

export interface PriorityBanEntry {
  heroName: string;
  banCount: number;
  frequency: number;
}

export interface TeamIdentityProfile {
  teamId: string;
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  heroStats: Map<string, HeroPickStats>;
  comfortHeroes: ComfortHero[];
  firstPickPreferences: PickPreference[];
  secondPickPreferences: PickPreference[];
  signatureCompositions: SignatureComposition[];
  heroPairings: HeroPairing[];
  targetBans: Map<string, TargetBanProfile>;
  draftTendencies: DraftTendency[];
  mostSuccessfulHeroes: HeroSuccessEntry[];
  mostContestedHeroes: ContestedHeroEntry[];
  priorityBans: PriorityBanEntry[];
  sideStats: {
    blue: { games: number; wins: number; winRate: number };
    red: { games: number; wins: number; winRate: number };
  };
}

// --- Draft Pattern ---

export interface DraftPatternProfile {
  teamId: string;
  totalGames: number;
  firstPickTendencies: Array<{ heroName: string; frequency: number; winRate: number }>;
  banSequences: Array<{ sequence: string[]; count: number }>;
  heroSequencing: Map<string, Array<{ followHero: string; count: number; frequency: number }>>;
  draftAvoidances: string[];
}

// --- Matchup ---

export interface MatchupProfile {
  teamId: string;
  opponentId: string;
  headToHeadGames: number;
  teamSeriesWins: number;
  opponentSeriesWins: number;
  teamGameWins: number;
  opponentGameWins: number;
  headToHeadWinRate: number;
  teamMatchupComfort: ComfortHero[];
  opponentMatchupComfort: ComfortHero[];
  teamMatchupBans: PriorityBanEntry[];
  opponentMatchupBans: PriorityBanEntry[];
  seriesRecord: Array<{ date: string; teamScore: number; opponentScore: number; winner: string }>;
}

// --- MPL Scoring ---

export interface MplScoreBreakdown {
  matchupHistoryScore: number;
  teamHistoryScore: number;
  comfortScore: number;
  patternScore: number;
  repickScore: number;
  rebanScore: number;
  pivotScore: number;
  counterScore: number;
  availabilityScore: number;
  metaScore: number;
}

export interface MplScoringContext {
  allyIdentity: TeamIdentityProfile | null;
  enemyIdentity: TeamIdentityProfile | null;
  matchupProfile: MatchupProfile | null;
  draftPatterns: DraftPatternProfile | null;
  currentPicks: string[];
  enemyPicks: string[];
  currentBans?: string[];
  enemyBans?: string[];
  laneStatus: LaneStatus;
  mode: DraftMode;
  heroDatabase?: any[];
}

// --- MPL Recommendation ---

export interface MplDraftRecommendation {
  heroName: string;
  totalScore: number;
  scoreBreakdown: MplScoreBreakdown;
  lane: string;
  role: string;
  reason: string;
  tags: string[];
  pickType?: "Comfort Pick" | "Priority Pick" | "Team Need Pick" | "Signature Pick" | "Flex Pick" | "Counter Pick" | "Deny Pick" | "Meta Fallback Pick";
  banType?: "Comfort Ban" | "Target Ban" | "Deny Ban" | "Counter Ban" | "Meta Fallback Ban" | "Meta Ban" | "Noise Ban";
  evidence: {
    pickCount?: number;
    banCount?: number;
    winRate?: number;
    source: string;
    team?: string;
    recommendationSource?: "matchup-history" | "team-history" | "global-fallback";
    pairingData?: string;
  };
  pivotPrediction?: string;
  fallbackBranch?: {
    heroName: string;
    reason: string;
  };
}

// --- Hero Availability Tree ---

export interface PivotPrediction {
  bannedHero: string;
  confidence: "high" | "medium" | "low";
  likelyPivots: Array<{
    heroName: string;
    pickCount: number;
    winRate: number;
    reasoning: string;
  }>;
  secondOrderPivots?: Array<{
    ifAlsoBanned: string;
    thenPivotTo: string[];
    roleCollapse: boolean;
  }>;
}

export interface PoolCollapseResult {
  totalHeroPool: number;
  remainingPool: number;
  collapsedRoles: Array<{
    role: string;
    remainingOptions: string[];
    severity: "critical" | "moderate" | "safe";
  }>;
}

// --- Lane Prediction ---

export interface LanePrediction {
  heroName: string;
  lanes: Record<string, number>; // e.g., { "Mid": 0.85, "Gold": 0.15 }
}

// --- Draft Analysis ---

export interface DraftAnalysisResult {
  teamComfortScore: {
    blue: { score: number; comfortPicks: string[]; totalPicks: number };
    red: { score: number; comfortPicks: string[]; totalPicks: number };
  };
  draftExecutionScore: {
    blue: { score: number; patternAlignment: string };
    red: { score: number; patternAlignment: string };
  };
  signaturePickUsage: {
    blue: { secured: string[]; missed: string[] };
    red: { secured: string[]; missed: string[] };
  };
  comfortHeroSuccessRate: {
    blue: Array<{ heroName: string; historicalWinRate: number }>;
    red: Array<{ heroName: string; historicalWinRate: number }>;
  };
  headToHeadImpact: {
    totalGames: number;
    blueSeriesWins: number;
    redSeriesWins: number;
    narrative: string;
  };
  banEfficiency: {
    blue: { score: number; targetedHighValue: string[]; wasted: string[] };
    red: { score: number; targetedHighValue: string[]; wasted: string[] };
  };
  draftRiskAnalysis: {
    blue: Array<{ risk: string; historicalWinRate: number }>;
    red: Array<{ risk: string; historicalWinRate: number }>;
  };
  powerSpikeTimeline: {
    blue: Array<{ heroName: string; spike: "early" | "mid" | "late" }>;
    red: Array<{ heroName: string; spike: "early" | "mid" | "late" }>;
  };
  laneAssignment: {
    blue: Record<string, string | null>;
    red: Record<string, string | null>;
  };
  winCondition: {
    blue: string;
    red: string;
  };
  evidenceSource: {
    dataFiles: string[];
    totalGamesAnalyzed: number;
    teamGamesUsed: { blue: number; red: number };
  };
}

// --- Gemini Guard ---

export interface GeminiValidationResult {
  isValid: boolean;
  violations: string[];
  sanitizedOutput: string | null;
}
