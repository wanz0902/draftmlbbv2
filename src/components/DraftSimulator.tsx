import { useState, useEffect, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { User } from "firebase/auth";
import { saveDraft } from "../lib/firebase";
import {
  Users,
  Play,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Wand2,
  ShieldAlert,
  BookOpen,
  Save,
  Volume2,
  VolumeX,
  Trophy,
  ArrowLeft,
  Clock,
  Search,
  Swords,
  Zap,
  Shield,
  Crosshair,
  AlertTriangle,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  Sparkle,
  Undo2,
  Pause,
} from "lucide-react";
import { HeroStats } from "../types";
import { DraftMode, LaneStatus, DraftRecommendation, MplDraftRecommendation } from "../draft/draftTypes";
import { getHeroRole, getHeroImageUrl } from "../lib/heroUtils";
import { calculateDraftAnalysis } from "../draft/calculateDraftAnalysis";
import heroesMaster from "../data/heroes_master.json";
import FallbackImage from "./FallbackImage";
import { sounds } from "../lib/soundUtils";

interface DraftStep {
  idx: number;
  side: "BLUE" | "RED";
  type: "BAN" | "PICK";
  label: string;
}

const DRAFT_SEQUENCE: DraftStep[] = [
  // Phase 1 Ban (3 each)
  { idx: 0, side: "BLUE", type: "BAN", label: "Blue Ban 1" },
  { idx: 1, side: "RED", type: "BAN", label: "Red Ban 1" },
  { idx: 2, side: "BLUE", type: "BAN", label: "Blue Ban 2" },
  { idx: 3, side: "RED", type: "BAN", label: "Red Ban 2" },
  { idx: 4, side: "BLUE", type: "BAN", label: "Blue Ban 3" },
  { idx: 5, side: "RED", type: "BAN", label: "Red Ban 3" },
  // Phase 1 Pick (3 each)
  { idx: 6, side: "BLUE", type: "PICK", label: "Blue Pick 1" },
  { idx: 7, side: "RED", type: "PICK", label: "Red Pick 1" },
  { idx: 8, side: "RED", type: "PICK", label: "Red Pick 2" },
  { idx: 9, side: "BLUE", type: "PICK", label: "Blue Pick 2" },
  { idx: 10, side: "BLUE", type: "PICK", label: "Blue Pick 3" },
  { idx: 11, side: "RED", type: "PICK", label: "Red Pick 3" },
  // Phase 2 Ban (2 each)
  { idx: 12, side: "RED", type: "BAN", label: "Red Ban 4" },
  { idx: 13, side: "BLUE", type: "BAN", label: "Blue Ban 4" },
  { idx: 14, side: "RED", type: "BAN", label: "Red Ban 5" },
  { idx: 15, side: "BLUE", type: "BAN", label: "Blue Ban 5" },
  // Phase 2 Pick (2 each)
  { idx: 16, side: "RED", type: "PICK", label: "Red Pick 4" },
  { idx: 17, side: "BLUE", type: "PICK", label: "Blue Pick 4" },
  { idx: 18, side: "BLUE", type: "PICK", label: "Blue Pick 5" },
  { idx: 19, side: "RED", type: "PICK", label: "Red Pick 5" },
];

// Static fallback data — used if API fetch fails
const FALLBACK_MPL_TEAMS: Array<{ key: string; name: string; logo: string }> = [
  { key: "RRQ", name: "Rex Regum Qeon", logo: "" },
  { key: "EVOS", name: "EVOS Esports", logo: "" },
  { key: "ONIC", name: "ONIC Esports", logo: "" },
  { key: "TLID", name: "Team Liquid", logo: "" },
  { key: "GEEK", name: "Geek Fam", logo: "" },
  { key: "BTR", name: "Bigetron", logo: "" },
  { key: "AE", name: "Alter Ego", logo: "" },
  { key: "DEWA", name: "Dewa United Esports", logo: "" },
  { key: "NAVI", name: "Natus Vincere", logo: "" },
];

const getDraftTurnDuration = (mode: DraftMode | null) =>
  mode === "mpl" ? 50 : 30;

const ROLE_OPTIONS = ["ALL", "Tank", "Fighter", "Assassin", "Mage", "Marksman", "Support"] as const;
const LANE_OPTIONS = ["ALL", "EXP", "Jungle", "Mid", "Gold", "Roam"] as const;
const TIER_OPTIONS = ["ALL", "S", "A", "B", "C", "D"] as const;

const PHASE_LABELS = {
  ban: "Ban Phase",
  pick: "Pick Phase",
  lane: "Lane Assignment",
  complete: "Draft Complete",
} as const;

interface DraftSimulatorProps {
  heroes: HeroStats[];
  heroAssets: Record<string, string>;
  teamsData: any[];
  user?: User | null;
  setDraftInProgress?: (inProgress: boolean) => void;
}

interface AIRecommendResult {
  recommendations: Array<(Partial<MplDraftRecommendation> & {
    heroName: string;
    role?: string;
    reason: string;
  })>;
  overallStrategy: string;
  debug?: any;
  mplIntelligence?: any;
  cached?: boolean;
  tokenEstimate?: { input: number; output: number } | null;
  estimatedCost?: number;
  historicalContext?: {
    teamProfiles?: any;
    matchupProfile?: any;
    similarGames?: Array<{
      sourceLabel: string;
      similarityScore: number;
      matchingSignals: string[];
    }>;
    draftPatternMatches?: Array<{ summary: string }>;
    likelyRepicks?: Array<{ heroName: string; reason: string }>;
    likelyRebans?: Array<{ heroName: string; reason: string }>;
    pivotCandidates?: Array<{ heroName: string; reason: string }>;
  };
}

interface EvaluationResponse {
  analysis?: string;
  success?: boolean;
  error?: string;
  validationFallback?: boolean;
  dataNotes?: string[];
  latencyMs?: number;
  cached?: boolean;
}

interface HeroInsight {
  lane: string;
  tier: string;
  powerSpike: string;
  counterTags: string[];
  synergyTags: string[];
  macroIdentity: string[];
  status: "available" | "picked" | "banned" | "recommended" | "risky";
  whyRecommended: string;
}

interface CompactDraftTimelineEntry {
  idx: number;
  side: "BLUE" | "RED";
  type: "BAN" | "PICK";
  label: string;
  heroName: string;
  isCurrent: boolean;
  isPast: boolean;
}

type CoachRecommendationTone = "ban" | "pick" | "priority" | "counter" | "comfort" | "deny" | "meta" | "adaptive";

interface CoachRecommendationView {
  heroName: string;
  label: string;
  reason: string;
  source: string;
  evidence: string;
  score: number;
  tone: CoachRecommendationTone;
  scoreBreakdown?: Record<string, number>;
}

export default function DraftSimulator({
  heroes,
  heroAssets,
  // teamsData not used in draft logic but kept in interface for compatibility
  user,
  setDraftInProgress
}: DraftSimulatorProps) {
  const [draftStarted, setDraftStarted] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  useEffect(() => {
    if (setDraftInProgress) {
      setDraftInProgress(draftStarted);
    }
  }, [draftStarted, setDraftInProgress]);

  // Draft States
  const [blueBans, setBlueBans] = useState<string[]>([]);
  const [redBans, setRedBans] = useState<string[]>([]);
  const [bluePicks, setBluePicks] = useState<string[]>([]);
  const [redPicks, setRedPicks] = useState<string[]>([]);

  // Undo history — snapshots taken BEFORE each lock action
  type DraftSnapshot = {
    stepIdx: number;
    blueBans: string[];
    redBans: string[];
    bluePicks: string[];
    redPicks: string[];
    blueLaneStatus: LaneStatus;
    redLaneStatus: LaneStatus;
  };
  const [draftHistory, setDraftHistory] = useState<DraftSnapshot[]>([]);

  // Lane status for both teams
  const [blueLaneStatus, setBlueLaneStatus] = useState<LaneStatus>({ gold: null, exp: null, mid: null, jungle: null, roam: null });
  const [redLaneStatus, setRedLaneStatus] = useState<LaneStatus>({ gold: null, exp: null, mid: null, jungle: null, roam: null });

  // Simulation settings
  const [selectedHeroName, setSelectedHeroName] = useState<string>("");
  const [timerSeconds, setTimerSeconds] = useState(getDraftTurnDuration(null));
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [laneFilter, setLaneFilter] = useState("ALL");
  const [tierFilter, setTierFilter] = useState("ALL");
  const [recommendedOnly, setRecommendedOnly] = useState(false);
  const [counterOnly, setCounterOnly] = useState(false);
  const [synergyOnly, setSynergyOnly] = useState(false);
  const [comfortOnly, setComfortOnly] = useState(false);
  const [blueTeam, setBlueTeam] = useState<string>("Blue Team");
  const [redTeam, setRedTeam] = useState<string>("Red Team");

  // Mode selection states
  const [draftMode, setDraftMode] = useState<DraftMode | null>(null);
  const [mplTeams, setMplTeams] = useState<Array<{ key: string; name: string; logo: string }>>([]);
  const [selectedBlueTeam, setSelectedBlueTeam] = useState<string>("");
  const [selectedRedTeam, setSelectedRedTeam] = useState<string>("");
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsError, setTeamsError] = useState<string>("");
  const [retryCount, setRetryCount] = useState(0);

  // Coach service states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIRecommendResult | null>(null);
  const [aiError, setAiError] = useState("");

  // Auto-recommendation state (fires on each draft step)
  const [draftRecommendations, setDraftRecommendations] = useState<DraftRecommendation[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recommendationsPaused, setRecommendationsPaused] = useState(false);
  const recommendationCacheRef = useRef<Map<string, DraftRecommendation[]>>(new Map());
  const aiCoachCacheRef = useRef<Map<string, AIRecommendResult>>(new Map());

  const [soundEnabled, setSoundEnabled] = useState(true);

  // Final Evaluation
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<string>("");
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [evaluationMeta, setEvaluationMeta] = useState<EvaluationResponse | null>(null);
  const [localIntelGeneratedAt, setLocalIntelGeneratedAt] = useState<number>(0);

  useEffect(() => {
    sounds.setEnabled(soundEnabled);
  }, [soundEnabled]);

  // Auto-fetch recommendations on each draft step change
  useEffect(() => {
    if (!draftStarted || isCompleted) return;
    if (recommendationsPaused) {
      setRecsLoading(false);
      return;
    }

    const fetchRecommendations = async () => {
      const cacheKey = buildRecommendationCacheKey();
      const cached = recommendationCacheRef.current.get(cacheKey);
      if (cached) {
        setDraftRecommendations(cached);
        setRecsLoading(false);
        return;
      }

      setRecsLoading(true);
      try {
        const response = await fetch("/api/draft/recommendation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bluePicks,
            redPicks,
            blueBans,
            redBans,
            currentPhase: currentStep?.label || "PICKS_1",
            currentTurnSide: currentStep?.side || "BLUE",
            mode: draftMode || "ranked",
            blueTeam: draftMode === "mpl" ? selectedBlueTeam : blueTeam,
            redTeam: draftMode === "mpl" ? selectedRedTeam : redTeam,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.recommendations && Array.isArray(data.recommendations)) {
            const nextRecommendations = data.recommendations.slice(0, 5);
            recommendationCacheRef.current.set(cacheKey, nextRecommendations);
            setDraftRecommendations(nextRecommendations);
          }
        }
      } catch (err) {
        // Silently fail — recommendations are non-critical
        console.error("Auto-recommendation fetch failed:", err);
      } finally {
        setRecsLoading(false);
      }
    };

    fetchRecommendations();
  }, [currentStepIdx, draftStarted, draftMode, selectedBlueTeam, selectedRedTeam, blueTeam, redTeam, bluePicks, redPicks, blueBans, redBans, recommendationsPaused]);

  // Fetch lane status from recommendation endpoint whenever picks change
  useEffect(() => {
    if (!draftStarted) return;

    const fetchLaneStatus = async (picks: string[], side: "BLUE" | "RED") => {
      if (picks.length === 0) {
        if (side === "BLUE") setBlueLaneStatus({ gold: null, exp: null, mid: null, jungle: null, roam: null });
        else setRedLaneStatus({ gold: null, exp: null, mid: null, jungle: null, roam: null });
        return;
      }
      try {
        const response = await fetch("/api/draft/recommendation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bluePicks,
            redPicks,
            blueBans,
            redBans,
            currentPhase: currentStep?.label || "PICKS_1",
            currentTurnSide: side,
            mode: draftMode || "ranked",
            blueTeam: draftMode === "mpl" ? selectedBlueTeam : blueTeam,
            redTeam: draftMode === "mpl" ? selectedRedTeam : redTeam,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.laneStatus) {
            if (side === "BLUE") setBlueLaneStatus(data.laneStatus);
            else setRedLaneStatus(data.laneStatus);
          }
        }
      } catch (err) {
        // Silently fail — lane status is non-critical UI enhancement
      }
    };

    fetchLaneStatus(bluePicks, "BLUE");
    fetchLaneStatus(redPicks, "RED");
  }, [bluePicks, redPicks, blueBans, redBans, draftStarted, draftMode, selectedBlueTeam, selectedRedTeam, blueTeam, redTeam, currentStepIdx]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveDraft = async () => {
    if (!user || !isCompleted) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const draftDataStr = JSON.stringify({
        bluePicks,
        redPicks,
        blueBans,
        redBans,
        evaluation: evaluationResult
      });
      await saveDraft(user.uid, draftDataStr);
      setSaveSuccess(true);
    } catch (e) {
      console.error("Failed to save draft:", e);
      alert("Failed to save draft. Check console for details.");
    } finally {
      setIsSaving(false);
    }
  };

  const currentStep = DRAFT_SEQUENCE[currentStepIdx];
  const isCompleted = currentStepIdx >= 20;

  const getHeroImgUrl = (heroName: string) => {
    return getHeroImageUrl(heroName, heroAssets);
  };

  const normalizeHeroKey = (value: string) =>
    String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const buildRecommendationCacheKey = (
    side = currentStep?.side || "BLUE",
    phase = currentStep?.label || "PICKS_1",
    mode = draftMode || "ranked"
  ) =>
    JSON.stringify({
      bluePicks,
      redPicks,
      blueBans,
      redBans,
      currentStepIdx,
      currentPhase: phase,
      currentTurnSide: side,
      mode,
      blueTeam: draftMode === "mpl" ? selectedBlueTeam : blueTeam,
      redTeam: draftMode === "mpl" ? selectedRedTeam : redTeam,
    });

  const getRecommendationTone = (label: string, fallbackAction?: "BAN" | "PICK"): CoachRecommendationTone => {
    const text = String(label || "").toLowerCase();
    if (text.includes("deny")) return "deny";
    if (text.includes("counter") || text.includes("target")) return "counter";
    if (text.includes("comfort") || text.includes("signature")) return "comfort";
    if (text.includes("priority") || text.includes("team need")) return "priority";
    if (text.includes("meta")) return "meta";
    if (text.includes("ban") || fallbackAction === "BAN") return "ban";
    if (text.includes("pick") || fallbackAction === "PICK") return "pick";
    return "adaptive";
  };

  const coachToneClass: Record<CoachRecommendationTone, {
    card: string;
    badge: string;
    accent: string;
    score: string;
    title: string;
  }> = {
    ban: {
      card: "border-red-500/30 bg-red-950/15 hover:border-red-400/55",
      badge: "border-red-400/40 bg-red-500/15 text-red-200",
      accent: "bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.65)]",
      score: "text-red-300",
      title: "text-red-50",
    },
    pick: {
      card: "border-cyan-500/28 bg-cyan-950/12 hover:border-cyan-400/55",
      badge: "border-cyan-400/40 bg-cyan-500/15 text-cyan-200",
      accent: "bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.65)]",
      score: "text-cyan-300",
      title: "text-cyan-50",
    },
    priority: {
      card: "border-amber-400/28 bg-amber-950/10 hover:border-amber-300/50",
      badge: "border-amber-300/40 bg-amber-500/15 text-amber-200",
      accent: "bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.6)]",
      score: "text-amber-300",
      title: "text-amber-50",
    },
    counter: {
      card: "border-orange-400/28 bg-orange-950/10 hover:border-orange-300/50",
      badge: "border-orange-300/40 bg-orange-500/15 text-orange-200",
      accent: "bg-orange-300 shadow-[0_0_12px_rgba(251,146,60,0.6)]",
      score: "text-orange-300",
      title: "text-orange-50",
    },
    comfort: {
      card: "border-violet-400/28 bg-violet-950/12 hover:border-violet-300/50",
      badge: "border-violet-300/40 bg-violet-500/15 text-violet-200",
      accent: "bg-violet-300 shadow-[0_0_12px_rgba(196,181,253,0.6)]",
      score: "text-violet-300",
      title: "text-violet-50",
    },
    deny: {
      card: "border-pink-400/28 bg-pink-950/12 hover:border-pink-300/50",
      badge: "border-pink-300/40 bg-pink-500/15 text-pink-200",
      accent: "bg-pink-300 shadow-[0_0_12px_rgba(249,168,212,0.6)]",
      score: "text-pink-300",
      title: "text-pink-50",
    },
    meta: {
      card: "border-slate-400/20 bg-slate-900/30 hover:border-slate-300/35",
      badge: "border-slate-300/25 bg-slate-500/10 text-slate-300",
      accent: "bg-slate-400",
      score: "text-slate-300",
      title: "text-white",
    },
    adaptive: {
      card: "border-indigo-400/24 bg-indigo-950/12 hover:border-indigo-300/45",
      badge: "border-indigo-300/35 bg-indigo-500/15 text-indigo-200",
      accent: "bg-indigo-300 shadow-[0_0_12px_rgba(165,180,252,0.6)]",
      score: "text-indigo-300",
      title: "text-indigo-50",
    },
  };

  const formatSourceLabel = (sourceKey?: string) => {
    if (!sourceKey) return "";
    const sourceMap: Record<string, string> = {
      matchupHistoryScore: "Matchup History",
      matchupHistory: "Matchup History",
      teamHistoryScore: "Team History",
      teamHistory: "Team History",
      comfortScore: "Comfort Pool",
      comfortPick: "Comfort Pool",
      patternScore: "Draft Pattern",
      similarDraft: "Similar Draft",
      repickScore: "Repick Pattern",
      repickPattern: "Repick Pattern",
      rebanScore: "Reban Pattern",
      rebanPattern: "Reban Pattern",
      pivotScore: "Pivot Read",
      pivotPick: "Pivot Read",
      counterScore: "Counter Read",
      counter: "Counter Read",
      metaScore: "Meta Fallback",
      meta: "Meta Fallback",
      laneFit: "Lane Fit",
      roleBalance: "Role Balance",
      draftPhase: "Draft Phase",
      denyPick: "Deny Pick",
      flexValue: "Flex Value",
      availabilityScore: "Availability",
    };
    return sourceMap[sourceKey] || sourceKey.replace(/([A-Z])/g, " $1").replace(/Score$/, "").replace(/^./, (s) => s.toUpperCase()).trim();
  };

  const getTopScoreEntries = (scoreBreakdown?: Record<string, number>) =>
    Object.entries(scoreBreakdown || {})
      .filter(([, value]) => Number(value) > 0)
      .sort(([, left], [, right]) => Number(right) - Number(left))
      .slice(0, 3);

  const resetHeroFilters = () => {
    setSearchQuery("");
    setRoleFilter("ALL");
    setLaneFilter("ALL");
    setTierFilter("ALL");
    setRecommendedOnly(false);
    setCounterOnly(false);
    setSynergyOnly(false);
    setComfortOnly(false);
  };

  const turnDurationSeconds = getDraftTurnDuration(draftMode);
  const normalizedMode: DraftMode = draftMode || "ranked";
  const currentPhaseLabel = isCompleted
    ? PHASE_LABELS.complete
    : currentStep?.type === "BAN"
      ? PHASE_LABELS.ban
      : PHASE_LABELS.pick;

  const progressPercent = Math.min(100, Math.round((currentStepIdx / DRAFT_SEQUENCE.length) * 100));

  const currentTeamPicks = currentStep?.side === "BLUE" ? bluePicks : redPicks;
  const enemyTeamPicks = currentStep?.side === "BLUE" ? redPicks : bluePicks;

  const currentRecommendedNames = useMemo(
    () =>
      new Set(
        [
          ...draftRecommendations.map((entry) => normalizeHeroKey(entry.heroName)),
          ...(aiResult?.recommendations || []).map((entry) => normalizeHeroKey(entry.heroName)),
        ]
      ),
    [draftRecommendations, aiResult]
  );

  const historicalContext = aiResult?.historicalContext;
  const debugDraftAI =
    import.meta.env.VITE_SHOW_AI_DEBUG === "true" ||
    (typeof window !== "undefined" && window.localStorage.getItem("debugDraftAI") === "true");
  const blueComfortHeroes = useMemo(
    () =>
      (historicalContext?.teamProfiles?.blue?.comfortHeroes || [])
        .map((entry: any) => entry.heroName)
        .filter(Boolean),
    [historicalContext]
  );
  const redComfortHeroes = useMemo(
    () =>
      (historicalContext?.teamProfiles?.red?.comfortHeroes || [])
        .map((entry: any) => entry.heroName)
        .filter(Boolean),
    [historicalContext]
  );

  const evaluationDashboard = useMemo(
    () =>
      calculateDraftAnalysis(bluePicks, redPicks, {
        heroes,
        blueTeamName: blueTeam,
        redTeamName: redTeam,
        mode: normalizedMode,
        blueLaneStatus,
        redLaneStatus,
        blueComfortHeroes,
        redComfortHeroes,
        matchupSummary: historicalContext?.matchupProfile?.summary,
        recommendationSource:
          aiResult?.debug?.recommendationSource ||
          aiResult?.mplIntelligence?.recommendationSource,
      }),
    [
      bluePicks,
      redPicks,
      heroes,
      blueTeam,
      redTeam,
      normalizedMode,
      blueLaneStatus,
      redLaneStatus,
      blueComfortHeroes,
      redComfortHeroes,
      historicalContext,
      aiResult,
    ]
  );

  const laneNeeds = useMemo(() => {
    const status = currentStep?.side === "BLUE" ? blueLaneStatus : redLaneStatus;
    return (["exp", "jungle", "mid", "gold", "roam"] as const)
      .filter((lane) => !status[lane])
      .map((lane) => {
        switch (lane) {
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
        }
      });
  }, [currentStep?.side, blueLaneStatus, redLaneStatus]);

  const heroInsights = useMemo<Record<string, HeroInsight>>(() => {
    const insightMap: Record<string, HeroInsight> = {};
    const unavailable = new Set(
      [...bluePicks, ...redPicks, ...blueBans, ...redBans].map((hero) => normalizeHeroKey(hero))
    );
    const enemyKeys = new Set(enemyTeamPicks.map((hero) => normalizeHeroKey(hero)));
    const allyKeys = new Set(currentTeamPicks.map((hero) => normalizeHeroKey(hero)));
    const comfortSet = new Set(
      (currentStep?.side === "BLUE" ? blueComfortHeroes : redComfortHeroes).map((hero) =>
        normalizeHeroKey(hero)
      )
    );

    heroes.forEach((hero) => {
      const key = normalizeHeroKey(hero.hero_name);
      const tier = String(hero.tier || "C").toUpperCase();
      const lane =
        Array.isArray(hero.lanes) && hero.lanes.length > 0
          ? hero.lanes[0]
          : hero.lane || "Flex";
      const powerSpike = Array.isArray((hero as any).power_spike)
        ? (hero as any).power_spike.join(", ")
        : String((hero as any).power_spike || (hero as any).aiTags?.powerSpikeTiming || "Data tidak tersedia");
      const counterTags = Array.isArray(hero.counters) ? hero.counters.slice(0, 3) : [];
      const synergyTags = Array.isArray(hero.synergies) ? hero.synergies.slice(0, 3) : [];
      const macroIdentity = Array.isArray((hero as any).draft_analysis?.macro_identity)
        ? (hero as any).draft_analysis.macro_identity.slice(0, 3)
        : [];

      let status: HeroInsight["status"] = "available";
      if (bluePicks.includes(hero.hero_name) || redPicks.includes(hero.hero_name)) status = "picked";
      else if (blueBans.includes(hero.hero_name) || redBans.includes(hero.hero_name)) status = "banned";
      else if (currentRecommendedNames.has(key)) status = "recommended";
      else {
        const collidesWithFilledLane =
          laneNeeds.length > 0 &&
          !laneNeeds.some((laneNeed) => String(lane).toLowerCase().includes(laneNeed.toLowerCase()));
        const enemyCountered = counterTags.some((tag) => enemyKeys.has(normalizeHeroKey(tag)));
        if (collidesWithFilledLane || enemyCountered) status = "risky";
      }

      let whyRecommended = "Heuristic estimate";
      if (currentRecommendedNames.has(key)) {
        const rec =
          draftRecommendations.find((entry) => normalizeHeroKey(entry.heroName) === key) ||
          aiResult?.recommendations?.find((entry) => normalizeHeroKey(entry.heroName) === key);
        whyRecommended = rec?.reason || "Masuk shortlist rekomendasi aktif.";
      } else if (comfortSet.has(key)) {
        whyRecommended = "Comfort/team history tersedia untuk mode MPL.";
      } else if (synergyTags.some((tag) => allyKeys.has(normalizeHeroKey(tag)))) {
        whyRecommended = "Memiliki sinergi langsung dengan core tim saat ini.";
      } else if (counterTags.some((tag) => enemyKeys.has(normalizeHeroKey(tag)))) {
        whyRecommended = "Mempunyai nilai counter terhadap komposisi lawan.";
      }

      insightMap[key] = {
        lane: String(lane),
        tier,
        powerSpike,
        counterTags,
        synergyTags,
        macroIdentity,
        status: unavailable.has(key) ? (status === "picked" ? "picked" : "banned") : status,
        whyRecommended,
      };
    });

    return insightMap;
  }, [
    bluePicks,
    redPicks,
    blueBans,
    redBans,
    currentRecommendedNames,
    heroes,
    enemyTeamPicks,
    currentTeamPicks,
    currentStep?.side,
    blueComfortHeroes,
    redComfortHeroes,
    laneNeeds,
    aiResult,
    draftRecommendations,
  ]);

  const compactTimelineEntries = useMemo<CompactDraftTimelineEntry[]>(() => {
    const blueBanMap = [0, 2, 4, 12, 14];
    const redBanMap = [1, 3, 5, 13, 15];
    const bluePickMap = [6, 9, 10, 17, 18];
    const redPickMap = [7, 8, 11, 16, 19];

    const lookupHero = (entry: typeof DRAFT_SEQUENCE[number]) => {
      if (entry.type === "BAN") {
        if (entry.side === "BLUE") {
          const index = blueBanMap.indexOf(entry.idx);
          return index >= 0 ? blueBans[index] || "" : "";
        }
        const index = redBanMap.indexOf(entry.idx);
        return index >= 0 ? redBans[index] || "" : "";
      }
      if (entry.side === "BLUE") {
        const index = bluePickMap.indexOf(entry.idx);
        return index >= 0 ? bluePicks[index] || "" : "";
      }
      const index = redPickMap.indexOf(entry.idx);
      return index >= 0 ? redPicks[index] || "" : "";
    };

    return DRAFT_SEQUENCE.map((entry) => ({
      idx: entry.idx,
      side: entry.side,
      type: entry.type,
      label: entry.label,
      heroName: lookupHero(entry),
      isCurrent: !isCompleted && entry.idx === currentStepIdx,
      isPast: entry.idx < currentStepIdx || isCompleted,
    }));
  }, [blueBans, redBans, bluePicks, redPicks, currentStepIdx, isCompleted]);

  const displayedCoachRecommendations = useMemo(() => {
    if (aiResult?.recommendations?.length) {
      return aiResult.recommendations.slice(0, 5).map((entry): CoachRecommendationView => {
        const label = entry.pickType || entry.banType || (currentStep?.type === "BAN" ? "Target Ban" : "Priority Pick");
        const evidenceParts = [
          entry.evidence?.team ? `Team: ${entry.evidence.team}` : "",
          entry.evidence?.pickCount ? `Pick ${entry.evidence.pickCount}` : "",
          entry.evidence?.banCount ? `Ban ${entry.evidence.banCount}` : "",
          entry.evidence?.winRate ? `WR ${entry.evidence.winRate.toFixed(0)}%` : "",
        ].filter(Boolean);
        const source =
          entry.evidence?.recommendationSource === "matchup-history" ? "Matchup History" :
          entry.evidence?.recommendationSource === "team-history" ? "Team History" :
          entry.evidence?.recommendationSource === "global-fallback" ? "Meta Fallback" :
          entry.evidence?.source || "AI Coach";
        const scoreBreakdown = entry.scoreBreakdown as unknown as Record<string, number> | undefined;
        return {
          heroName: entry.heroName,
          label,
          reason: entry.reason,
          source,
          evidence: evidenceParts.join(" · ") || entry.evidence?.source || "Local coach evidence",
          score: (entry as any).priorityScore ?? entry.totalScore ?? 0,
          tone: getRecommendationTone(label, currentStep?.type),
          scoreBreakdown,
        };
      });
    }

    if (draftRecommendations.length) {
      return draftRecommendations.slice(0, 5).map((entry): CoachRecommendationView => {
        const mplEntry = entry as DraftRecommendation & Partial<MplDraftRecommendation>;
        const scoreBreakdown = entry.scoreBreakdown as unknown as Record<string, number>;
        const topFactor = getTopScoreEntries(scoreBreakdown)[0];
        // Determine source label from score breakdown
        const sourcePriority = [
          "matchupHistoryScore", "matchupHistory", "teamHistoryScore", "teamHistory",
          "comfortScore", "comfortPick", "counterScore", "counter", "patternScore",
          "similarDraft", "rebanScore", "rebanPattern", "repickScore", "repickPattern",
          "pivotScore", "pivotPick", "metaScore", "meta",
        ];
        const topSource = sourcePriority.find((k) => (scoreBreakdown?.[k] ?? 0) > 0);
        const sourceLabel =
          mplEntry.evidence?.recommendationSource === "matchup-history" ? "Matchup History" :
          mplEntry.evidence?.recommendationSource === "team-history" ? "Team History" :
          mplEntry.evidence?.recommendationSource === "global-fallback" ? "Meta Fallback" :
          formatSourceLabel(topSource) || "Local Engine";
        const label = mplEntry.pickType || mplEntry.banType || (currentStep?.type === "BAN"
          ? sourceLabel === "Meta Fallback" ? "Meta Fallback Ban" : sourceLabel === "Counter Read" ? "Counter Ban" : "Target Ban"
          : sourceLabel === "Comfort Pool" ? "Comfort Pick" : sourceLabel === "Counter Read" ? "Counter Pick" : sourceLabel === "Meta Fallback" ? "Meta Fallback Pick" : "Priority Pick");
        const evidenceParts = [
          mplEntry.evidence?.team ? `Team: ${mplEntry.evidence.team}` : "",
          mplEntry.evidence?.pickCount ? `Pick ${mplEntry.evidence.pickCount}` : "",
          mplEntry.evidence?.banCount ? `Ban ${mplEntry.evidence.banCount}` : "",
          mplEntry.evidence?.winRate ? `WR ${mplEntry.evidence.winRate.toFixed(0)}%` : "",
        ].filter(Boolean);
        return {
          heroName: entry.heroName,
          label,
          reason: entry.reason,
          source: sourceLabel,
          evidence: evidenceParts.join(" · ") || mplEntry.evidence?.source || (topFactor ? `${formatSourceLabel(topFactor[0])} ${topFactor[1]}` : `${entry.totalScore}/100`),
          score: entry.totalScore ?? 0,
          tone: getRecommendationTone(label, currentStep?.type),
          scoreBreakdown,
        };
      });
    }

    return [];
  }, [aiResult, draftRecommendations, currentStep?.type]);

  const localTeamIntel = useMemo(() => {
    return {
      selectedTeams: {
        blue: (draftMode === "mpl" ? selectedBlueTeam : blueTeam) || blueTeam,
        red: (draftMode === "mpl" ? selectedRedTeam : redTeam) || redTeam,
      },
      gamesFound:
        Number(historicalContext?.teamProfiles?.blue?.totalGames || 0) +
        Number(historicalContext?.teamProfiles?.red?.totalGames || 0),
      matchupGamesFound: Number(historicalContext?.matchupProfile?.headToHeadGames || 0),
      topPicks: {
        blue: (historicalContext?.teamProfiles?.blue?.topPicks || []).slice(0, 5),
        red: (historicalContext?.teamProfiles?.red?.topPicks || []).slice(0, 5),
      },
      topBans: {
        blue: (historicalContext?.teamProfiles?.blue?.topBans || []).slice(0, 5),
        red: (historicalContext?.teamProfiles?.red?.topBans || []).slice(0, 5),
      },
      comfortHeroes: {
        blue: blueComfortHeroes.slice(0, 5),
        red: redComfortHeroes.slice(0, 5),
      },
      similarGames: (historicalContext?.similarGames || []).slice(0, 5),
      likelyRepicks: (historicalContext?.likelyRepicks || []).slice(0, 5),
      likelyRebans: (historicalContext?.likelyRebans || []).slice(0, 5),
      pivotCandidates: (historicalContext?.pivotCandidates || []).slice(0, 5),
    };
  }, [draftMode, selectedBlueTeam, selectedRedTeam, blueTeam, redTeam, historicalContext, blueComfortHeroes, redComfortHeroes]);

  const selectedHeroInsight = selectedHeroName
    ? heroInsights[normalizeHeroKey(selectedHeroName)]
    : null;

  // Reset Draft Function
  const handleReset = () => {
    setBlueBans([]);
    setRedBans([]);
    setBluePicks([]);
    setRedPicks([]);
    setCurrentStepIdx(0);
    setSelectedHeroName("");
    setTimerSeconds(getDraftTurnDuration(null));
    setSearchQuery("");
    setRoleFilter("ALL");
    setLaneFilter("ALL");
    setTierFilter("ALL");
    setRecommendedOnly(false);
    setCounterOnly(false);
    setSynergyOnly(false);
    setComfortOnly(false);
    setAiResult(null);
    setAiError("");
    setEvaluationResult("");
    setEvaluationMeta(null);
    setDraftStarted(false);
    setDraftMode(null);
    setSelectedBlueTeam("");
    setSelectedRedTeam("");
    setBlueLaneStatus({ gold: null, exp: null, mid: null, jungle: null, roam: null });
    setRedLaneStatus({ gold: null, exp: null, mid: null, jungle: null, roam: null });
    setDraftRecommendations([]);
    setRecommendationsPaused(false);
    recommendationCacheRef.current.clear();
    aiCoachCacheRef.current.clear();
  };

  // Start draft without resetting mode/team selection
  const handleStartDraft = () => {
    setBlueBans([]);
    setRedBans([]);
    setBluePicks([]);
    setRedPicks([]);
    setCurrentStepIdx(0);
    setSelectedHeroName("");
    setTimerSeconds(getDraftTurnDuration(draftMode));
    setAiResult(null);
    setAiError("");
    setEvaluationResult("");
    setEvaluationMeta(null);
    setDraftRecommendations([]);
    setRecommendationsPaused(false);
    recommendationCacheRef.current.clear();
    aiCoachCacheRef.current.clear();
    setDraftStarted(true);
  };

  // Turn simulation timer ticks
  useEffect(() => {
    if (!draftStarted || isCompleted) return;

    if (timerSeconds <= 0) {
      // Time is up. Only lock if a hero is actually selected, otherwise skip
      if (selectedHeroName) {
        handleLockHero(selectedHeroName);
      } else {
        // Skip turn - lock empty string (random/no pick)
        handleLockHero("");
      }
      return;
    }

    const interval = setInterval(() => {
      setTimerSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [draftStarted, isCompleted, timerSeconds, selectedHeroName]);

  // Actions
  const handleSelectHero = (name: string) => {
    sounds.playSelect();
    setSelectedHeroName(name);
  };

  const lastLockTime = useRef<number>(0);
  const handleLockHero = (name: string) => {
    if (!draftStarted || isCompleted) return;
    
    // Prevent double clicking / double processing within 500ms
    const now = Date.now();
    if (now - lastLockTime.current < 500) return;
    lastLockTime.current = now;

    const currentName = name;

    if (currentName !== "") {
      const usedHeroes = new Set([
        ...blueBans,
        ...redBans,
        ...bluePicks,
        ...redPicks,
      ].map(normalizeHeroKey));
      if (usedHeroes.has(normalizeHeroKey(currentName))) {
        alert("Hero sudah dipilih/dibanned!");
        return;
      }
    }

    // Save snapshot BEFORE applying this action (for undo)
    setDraftHistory((prev) => [
      ...prev,
      {
        stepIdx: currentStepIdx,
        blueBans: [...blueBans],
        redBans: [...redBans],
        bluePicks: [...bluePicks],
        redPicks: [...redPicks],
        blueLaneStatus: { ...blueLaneStatus },
        redLaneStatus: { ...redLaneStatus },
      },
    ]);

    const { side, type } = currentStep;
    sounds.playLock(type === "BAN");

    if (side === "BLUE") {
      if (type === "BAN") {
        setBlueBans((prev) => [...prev, currentName]);
      } else {
        setBluePicks((prev) => [...prev, currentName]);
      }
    } else {
      if (type === "BAN") {
        setRedBans((prev) => [...prev, currentName]);
      } else {
        setRedPicks((prev) => [...prev, currentName]);
      }
    }

    // Advance to next turn
    setCurrentStepIdx((prev) => prev + 1);
    setSelectedHeroName("");
    setTimerSeconds(turnDurationSeconds);
    setAiResult(null); // Clear recommendations for the next turn
  };

  // Undo last draft action
  const handleUndo = () => {
    if (draftHistory.length === 0 || isCompleted) return;
    const snapshot = draftHistory[draftHistory.length - 1];
    setDraftHistory((prev) => prev.slice(0, -1));
    setCurrentStepIdx(snapshot.stepIdx);
    setBlueBans(snapshot.blueBans);
    setRedBans(snapshot.redBans);
    setBluePicks(snapshot.bluePicks);
    setRedPicks(snapshot.redPicks);
    setBlueLaneStatus(snapshot.blueLaneStatus);
    setRedLaneStatus(snapshot.redLaneStatus);
    setSelectedHeroName("");
    setAiResult(null);
  };

  // Ctrl+Z keyboard shortcut for undo
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftHistory, isCompleted]);

  useEffect(() => {
    if (!draftStarted) {
      setTimerSeconds(getDraftTurnDuration(draftMode));
    }
  }, [draftMode, draftStarted]);

  // Ask AI Coach for suggestions
  const [aiLoadingText, setAiLoadingText] = useState("Analyzing draft...");
  const fetchAICoach = async () => {
    if (isCompleted) return;

    if (
      draftMode !== "mpl" &&
      bluePicks.length === 0 &&
      redPicks.length === 0 &&
      blueBans.length === 0 &&
      redBans.length === 0
    ) {
      setAiError("Not enough draft data to generate analysis.");
      return;
    }

    const cacheKey = buildRecommendationCacheKey();
    const cachedCoach = aiCoachCacheRef.current.get(cacheKey);
    if (cachedCoach) {
      setAiError("");
      setAiResult(cachedCoach);
      setLocalIntelGeneratedAt(Date.now());
      return;
    }

    setAiLoading(true);
    setAiError("");
    setAiResult(null);
    setLocalIntelGeneratedAt(Date.now());

    const loadingTexts = [
      "Analyzing draft...",
      "Calculating synergy...",
      "Evaluating counter picks...",
    ];
    let intervalIndex = 0;
    const interval = setInterval(() => {
      intervalIndex = (intervalIndex + 1) % loadingTexts.length;
      setAiLoadingText(loadingTexts[intervalIndex]);
    }, 1200);

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 15000);
      const response = await fetch(draftMode === "mpl" ? "/api/draft/recommendation" : "/api/draft/ai-recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          bluePicks,
          redPicks,
          blueBans,
          redBans,
          currentPhase: currentStep.label,
          currentTurnSide: currentStep.side,
          mode: draftMode || "ranked",
          blueTeam: draftMode === "mpl" ? selectedBlueTeam : blueTeam,
          redTeam: draftMode === "mpl" ? selectedRedTeam : redTeam,
        }),
      });
      window.clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("API Error");
      }

      const result = await response.json();
      if (!result.recommendations || !Array.isArray(result.recommendations)) {
        throw new Error("Malformed Response");
      }
      // Filter out any AI-recommended heroes that are already banned/picked
      const normalizeHeroKey = (value: string) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const unavailable = new Set([...bluePicks, ...redPicks, ...blueBans, ...redBans].map(normalizeHeroKey));
      const filteredRecs = result.recommendations.filter(
        (rec: any) => !unavailable.has(normalizeHeroKey(rec.heroName))
      );
      if (filteredRecs.length === 0) {
        setAiError("Semua rekomendasi AI sudah tidak tersedia (sudah di-ban/pick). Coba generate ulang.");
      } else {
        const nextAiResult = {
          ...result,
          recommendations: filteredRecs,
          overallStrategy: draftMode === "mpl"
            ? `Local MPL engine aktif: rekomendasi memakai ${result.debug?.recommendationSource || result.mplIntelligence?.recommendationSource || "team-history"} untuk ${currentStep.side === "BLUE" ? blueTeam : redTeam}.`
            : result.overallStrategy,
        };
        aiCoachCacheRef.current.set(cacheKey, nextAiResult);
        setAiResult(nextAiResult);
      }
    } catch (err: any) {
      console.error("AI Coach Error:", err);
      if (draftMode === "mpl") {
        setAiError("MPL local recommendation engine gagal membaca data team. Tidak memakai fallback meta agar rekomendasi tidak menyesatkan.");
        return;
      }
      // Fallback Engine
      const availableHeroes = heroes.filter(
        (h) =>
          !bluePicks.includes(h.hero_name) &&
          !redPicks.includes(h.hero_name) &&
          !blueBans.includes(h.hero_name) &&
          !redBans.includes(h.hero_name),
      );
      const topMeta = availableHeroes
        .sort(
          (a, b) =>
            parseFloat(b.tournament_presence || "0") -
            parseFloat(a.tournament_presence || "0"),
        )
        .slice(0, 5);

      setAiResult({
        overallStrategy:
          "Koneksi ke server AI perlahan. Menampilkan fallback berdasarkan Meta Priority dan Pick/Ban rates kompetitif saat ini. Perkuat role yang masih kurang.",
        recommendations: topMeta.map((h) => ({
          heroName: h.hero_name,
          role: getHeroRole(h.hero_name),
          reason: `Meta pick kuat dengan presensi turnamen tinggi (${h.tournament_presence}%). Alternatif yang aman dalam situasi ini.`,
        })),
      });
    } finally {
      clearInterval(interval);
      setAiLoading(false);
    }
  };

  // Comprehensive local fallback analysis when server/Gemini is unreachable
  const generateLocalFallbackAnalysis = (): string => {
    const getHeroData = (name: string) => heroes.find(h => h.hero_name === name);

    const predictLane = (heroName: string): string => {
      const data = getHeroData(heroName);
      if (!data) return "Flex";
      const role = getHeroRole(heroName);
      if (role === "Marksman") return "Gold Lane";
      if (role === "Fighter") return "EXP Lane";
      if (role === "Mage") return "Mid Lane";
      if (role === "Assassin") return "Jungle";
      if (role === "Support" || role === "Tank") return "Roam";
      return "Flex";
    };

    const analyzeTeam = (picks: string[]) => {
      const roles = picks.map(name => getHeroRole(name));
      const hasMarksman = roles.includes("Marksman");
      const hasTank = roles.includes("Tank");
      const hasAssassin = roles.includes("Assassin");
      const hasMage = roles.includes("Mage");
      const hasFighter = roles.includes("Fighter");
      const hasSupport = roles.includes("Support");

      const strengths: string[] = [];
      const weaknesses: string[] = [];

      if (hasTank || hasSupport) strengths.push("Memiliki frontline/peel untuk melindungi carry");
      if (hasAssassin) strengths.push("Burst damage dan dive potential untuk eliminasi target");
      if (hasMage) strengths.push("Magic damage dan area control di teamfight");
      if (hasMarksman) strengths.push("Sustained DPS untuk late game dan objective");
      if (hasFighter) strengths.push("Sustain fighter untuk pressure side lane");
      if (hasTank && hasSupport) strengths.push("Double frontline untuk perlindungan ekstra");
      if (hasAssassin && hasMage) strengths.push("Burst combo tinggi untuk pick-off");

      if (!hasTank && !hasSupport) weaknesses.push("Tidak ada frontline — rentan terhadap dive");
      if (!hasMarksman) weaknesses.push("Kurang sustained DPS untuk late game objective");
      if (!hasMage) weaknesses.push("Kurang magic damage — musuh bisa build full armor");
      if (!hasAssassin && !hasMage) weaknesses.push("Kurang burst damage untuk eliminasi carry");
      if (!hasFighter) weaknesses.push("Kurang pressure di EXP lane");

      const uniqueRoles = new Set(roles);
      if (uniqueRoles.size <= 2 && picks.length >= 4) weaknesses.push("Role diversity rendah — komposisi monoton");

      // Power spike analysis
      let powerSpike = "Mid Game";
      if (hasMarksman && hasFighter) powerSpike = "Late Game";
      if (hasAssassin && !hasMarksman) powerSpike = "Early-Mid Game";

      return { roles, strengths, weaknesses, powerSpike };
    };

    const blue = analyzeTeam(bluePicks);
    const red = analyzeTeam(redPicks);

    // Calculate draft scores
    const calcScore = (team: typeof blue) => {
      let score = 50;
      score += team.strengths.length * 7;
      score -= team.weaknesses.length * 6;
      // Role diversity bonus
      const uniqueRoles = new Set(team.roles);
      score += uniqueRoles.size * 3;
      return Math.max(20, Math.min(95, score));
    };

    const blueScore = calcScore(blue);
    const redScore = calcScore(red);

    let md = `## Analisis Pasca-Draft (Lokal)\n\n`;
    md += `> *Gemini AI tidak terhubung. Analisis ini dibuat berdasarkan database hero lokal.*\n\n`;

    md += `## Predicted Lane Assignment\n\n`;
    md += `**Tim Biru:**\n`;
    bluePicks.forEach(name => {
      md += `- ${name} → ${predictLane(name)} (${getHeroRole(name)})\n`;
    });
    md += `\n**Tim Merah:**\n`;
    redPicks.forEach(name => {
      md += `- ${name} → ${predictLane(name)} (${getHeroRole(name)})\n`;
    });

    md += `\n## Kekuatan Tim Biru\n`;
    md += blue.strengths.length > 0
      ? blue.strengths.map(s => `- ${s}`).join("\n")
      : "- Komposisi standar tanpa keunggulan menonjol";

    md += `\n\n## Kelemahan Tim Biru\n`;
    md += blue.weaknesses.length > 0
      ? blue.weaknesses.map(w => `- ${w}`).join("\n")
      : "- Tidak ada kelemahan signifikan terdeteksi";

    md += `\n\n## Kekuatan Tim Merah\n`;
    md += red.strengths.length > 0
      ? red.strengths.map(s => `- ${s}`).join("\n")
      : "- Komposisi standar tanpa keunggulan menonjol";

    md += `\n\n## Kelemahan Tim Merah\n`;
    md += red.weaknesses.length > 0
      ? red.weaknesses.map(w => `- ${w}`).join("\n")
      : "- Tidak ada kelemahan signifikan terdeteksi";

    md += `\n\n## Power Spike Comparison\n`;
    md += `- Tim Biru: ${blue.powerSpike}\n`;
    md += `- Tim Merah: ${red.powerSpike}\n`;

    md += `\n## Win Condition\n`;
    md += `**Tim Biru:** `;
    if (blue.powerSpike === "Early-Mid Game") {
      md += `Dominasi early game dengan agresivitas dan pick-off. Tutup game sebelum late.`;
    } else if (blue.powerSpike === "Late Game") {
      md += `Farm safely, scale ke late game, dan menangkan teamfight objektif.`;
    } else {
      md += `Kontrol tempo mid game melalui rotasi dan objektif.`;
    }
    md += `\n**Tim Merah:** `;
    if (red.powerSpike === "Early-Mid Game") {
      md += `Dominasi early game dengan agresivitas dan pick-off. Tutup game sebelum late.`;
    } else if (red.powerSpike === "Late Game") {
      md += `Farm safely, scale ke late game, dan menangkan teamfight objektif.`;
    } else {
      md += `Kontrol tempo mid game melalui rotasi dan objektif.`;
    }

    md += `\n\n## Draft Score\n`;
    md += `- Tim Biru: **${blueScore}/100**\n`;
    md += `- Tim Merah: **${redScore}/100**\n`;
    if (blueScore > redScore) {
      md += `\n> Tim Biru memiliki draft yang sedikit lebih unggul.\n`;
    } else if (redScore > blueScore) {
      md += `\n> Tim Merah memiliki draft yang sedikit lebih unggul.\n`;
    } else {
      md += `\n> Draft kedua tim cukup seimbang.\n`;
    }

    md += `\n## Bans Impact\n`;
    md += `- Tim Biru Banned: ${blueBans.join(", ") || "Tidak ada"}\n`;
    md += `- Tim Merah Banned: ${redBans.join(", ") || "Tidak ada"}\n`;

    md += `\n## Damage Profile\n`;
    const blueHasPhysical = blue.roles.some(r => ["Marksman", "Assassin", "Fighter"].includes(r));
    const blueHasMagic = blue.roles.some(r => ["Mage"].includes(r));
    const redHasPhysical = red.roles.some(r => ["Marksman", "Assassin", "Fighter"].includes(r));
    const redHasMagic = red.roles.some(r => ["Mage"].includes(r));
    md += `- Tim Biru: ${blueHasPhysical && blueHasMagic ? "Mixed (Physical + Magic)" : blueHasPhysical ? "Physical Heavy" : "Magic Heavy"}\n`;
    md += `- Tim Merah: ${redHasPhysical && redHasMagic ? "Mixed (Physical + Magic)" : redHasPhysical ? "Physical Heavy" : "Magic Heavy"}\n`;

    md += `\n---\n*Untuk analisis AI mendalam, pastikan GEMINI_API_KEY dikonfigurasi di server.*`;

    return md;
  };

  // Final Expert Evaluation — AI Provider Router (primary → fallback → local)
  const evaluateDraftGame = async () => {
    setEvaluationLoading(true);
    setEvaluationResult("");

    let aiStatus = "";

    try {
      // Try AI Provider Router (server handles tokenplan → wafer → local failover)
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 12000);
      const aiResponse = await fetch("/api/ai/draft-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          mode: draftMode || "ranked",
          blueTeam: draftMode === "mpl" ? selectedBlueTeam : undefined,
          redTeam: draftMode === "mpl" ? selectedRedTeam : undefined,
          bluePicks,
          redPicks,
          blueBans,
          redBans,
        }),
      });
      window.clearTimeout(timeoutId);

      if (aiResponse.ok) {
        const aiResult: EvaluationResponse = await aiResponse.json();
        if (aiResult.success && aiResult.analysis) {
          setEvaluationResult(aiResult.analysis);
          setEvaluationMeta(aiResult);
          return; // AI analysis succeeded
        }
        // AI returned success:false — check for credit/config issues
        const errMsg = aiResult.error || "";
        if (errMsg.includes("insufficient") || errMsg.includes("402") || errMsg.includes("credit")) {
          aiStatus = "> ⚠️ *AI Analyst: credit habis (insufficient credits). Menggunakan fallback.*\n\n";
        } else if (errMsg.includes("not configured") || errMsg.includes("YOUR_KEY")) {
          aiStatus = "> ⚠️ *AI Analyst: API key belum dikonfigurasi. Menggunakan fallback.*\n\n";
        } else {
          aiStatus = "> ⚠️ *AI Analyst tidak tersedia. Menggunakan analisis alternatif.*\n\n";
        }
      } else {
        aiStatus = "> ⚠️ *AI Analyst tidak tersedia. Menggunakan analisis alternatif.*\n\n";
      }

      // Fallback to existing Gemini endpoint
      const response = await fetch("/api/draft/final-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bluePicks,
          redPicks,
          blueBans,
          redBans,
          mode: draftMode || "ranked",
        }),
      });

      if (!response.ok) {
        throw new Error("Gagal memperoleh evaluasi pelatih.");
      }

      const result: EvaluationResponse = await response.json();
      const analysis = result.analysis || "Tidak ada hasil draf analisis.";
      setEvaluationResult(aiStatus + analysis);
      setEvaluationMeta(result);
    } catch (err: any) {
      console.error("Evaluation fetch failed:", err);
      setEvaluationResult(aiStatus + generateLocalFallbackAnalysis());
      setEvaluationMeta({
        success: false,
        analysis: aiStatus + generateLocalFallbackAnalysis(),
        dataNotes: ["Heuristic estimate — fallback lokal karena endpoint analisis tidak tersedia."],
      });
    } finally {
      setEvaluationLoading(false);
    }
  };

  // Sequence of picking elements
  const usedHeroesMap = useMemo(() => {
    const map = new Set<string>();
    const normalizeHeroKey = (value: string) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    blueBans.forEach((h) => map.add(normalizeHeroKey(h)));
    redBans.forEach((h) => map.add(normalizeHeroKey(h)));
    bluePicks.forEach((h) => map.add(normalizeHeroKey(h)));
    redPicks.forEach((h) => map.add(normalizeHeroKey(h)));
    return map;
  }, [blueBans, redBans, bluePicks, redPicks]);

  // Build full hero pool: heroesMaster (all 132) as base, enriched with tournament stats
  const fullHeroPool = useMemo(() => {
    const statsMap = new Map(
      heroes.map((h) => [normalizeHeroKey(h.hero_name), h])
    );
    return (heroesMaster as Array<{ hero_name: string; role?: string | string[]; lanes?: string[] }>).map(
      (master) => {
        const stats = statsMap.get(normalizeHeroKey(master.hero_name));
        return {
          hero_name: master.hero_name,
          ...(stats || {}),
          // Always use master roles/lanes so filtering is reliable
          _masterRoles: Array.isArray(master.role)
            ? master.role
            : master.role
            ? [master.role]
            : [],
          _masterLanes: master.lanes || [],
        };
      }
    );
  }, [heroes]);

  const sortedHeroesList = useMemo(() => {
    return fullHeroPool
      .filter((h) => {
        const matchesSearch = String(h.hero_name || "")
          .toLowerCase()
          .includes(String(searchQuery || "").toLowerCase().trim());
        // Multi-role support: check all roles from master data
        const heroRoles: string[] = (h as any)._masterRoles || [];
        const matchesRole =
          roleFilter === "ALL" ||
          heroRoles.some((r) => r === roleFilter) ||
          heroRoles.some((r) =>
            r.toLowerCase().includes(roleFilter.toLowerCase())
          );
        const insight = heroInsights[normalizeHeroKey(h.hero_name)];
        const heroLanes: string[] = (h as any)._masterLanes || [];
        const matchesLane =
          laneFilter === "ALL" ||
          heroLanes.some((lane) =>
            String(lane || "")
              .toLowerCase()
              .includes(laneFilter.toLowerCase())
          );
        const matchesTier =
          tierFilter === "ALL" ||
          String((h as any).tier || insight?.tier || "")
            .toUpperCase()
            .startsWith(tierFilter);
        const matchesRecommended = !recommendedOnly || insight?.status === "recommended";
        const matchesCounter =
          !counterOnly ||
          (insight?.counterTags || []).some((tag) =>
            enemyTeamPicks.some((heroName) => normalizeHeroKey(heroName) === normalizeHeroKey(tag))
          );
        const matchesSynergy =
          !synergyOnly ||
          (insight?.synergyTags || []).some((tag) =>
            currentTeamPicks.some((heroName) => normalizeHeroKey(heroName) === normalizeHeroKey(tag))
          );
        const comfortPool = currentStep?.side === "BLUE" ? blueComfortHeroes : redComfortHeroes;
        const matchesComfort =
          !comfortOnly ||
          comfortPool.some((heroName) => normalizeHeroKey(heroName) === normalizeHeroKey(h.hero_name));
        return (
          matchesSearch &&
          matchesRole &&
          matchesLane &&
          matchesTier &&
          matchesRecommended &&
          matchesCounter &&
          matchesSynergy &&
          matchesComfort
        );
      })
      .sort((left, right) => {
        const leftInsight = heroInsights[normalizeHeroKey(left.hero_name)];
        const rightInsight = heroInsights[normalizeHeroKey(right.hero_name)];
        const leftPriority =
          leftInsight?.status === "recommended" ? 3 : leftInsight?.status === "available" ? 2 : leftInsight?.status === "risky" ? 1 : 0;
        const rightPriority =
          rightInsight?.status === "recommended" ? 3 : rightInsight?.status === "available" ? 2 : rightInsight?.status === "risky" ? 1 : 0;
        if (leftPriority !== rightPriority) return rightPriority - leftPriority;
        return String(left.hero_name || "").localeCompare(String(right.hero_name || ""));
      });
  }, [
    fullHeroPool,
    searchQuery,
    roleFilter,
    laneFilter,
    tierFilter,
    recommendedOnly,
    counterOnly,
    synergyOnly,
    comfortOnly,
    heroInsights,
    enemyTeamPicks,
    currentTeamPicks,
    currentStep?.side,
    blueComfortHeroes,
    redComfortHeroes,
  ]);

  // Fetch MPL teams when MPL mode is selected
  useEffect(() => {
    if (draftMode === "mpl" && mplTeams.length === 0) {
      setTeamsLoading(true);
      setTeamsError("");
      fetch("/api/draft/teams")
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => {
          if (data.teams && Array.isArray(data.teams) && data.teams.length > 0) {
            setMplTeams(data.teams);
          } else {
            throw new Error("Empty teams response");
          }
        })
        .catch((err) => {
          console.error("Failed to fetch MPL teams:", err);
          setTeamsError("Gagal memuat data tim MPL — menggunakan data lokal");
          setMplTeams(FALLBACK_MPL_TEAMS);
        })
        .finally(() => setTeamsLoading(false));
    }
  }, [draftMode, retryCount]);

  const handleRetryTeams = () => {
    setMplTeams([]);
    setTeamsError("");
    setRetryCount((c) => c + 1);
  };

  const [analysisTab, setAnalysisTab] = useState<"rec" | "counter" | "intel">("rec");

  // ── helpers for inline render ──────────────────────────────────────────────
  const BanSlot = ({ heroName, side }: { heroName: string; side: "blue" | "red" }) => (
    <div className={`h-9 w-9 xl:h-10 xl:w-10 aspect-square rounded-full overflow-hidden border ${side === "blue" ? "border-blue-900/50" : "border-red-900/50"} bg-slate-900/60 shrink-0`}>
      {heroName ? (
        <FallbackImage src={getHeroImgUrl(heroName)} fallbackText={heroName} alt={heroName}
          className="block h-full w-full object-cover object-center grayscale opacity-75"
          containerClassName="h-full w-full text-[6px]" />
      ) : <div className="h-full w-full" />}
    </div>
  );

  const PickSlot = ({
    heroName, index, isBlue, isActive, assignment,
  }: { heroName: string; index: number; isBlue: boolean; isActive: boolean; assignment: any }) => (
    <div className={`flex items-center gap-2 h-14 xl:h-16 rounded-xl px-2.5 border transition-all
      ${isActive ? (isBlue ? "border-cyan-500/50 bg-cyan-950/20 shadow-[0_0_8px_rgba(6,182,212,0.15)]" : "border-rose-500/50 bg-rose-950/20 shadow-[0_0_8px_rgba(244,63,94,0.12)]")
        : (isBlue ? "border-blue-900/20 bg-blue-950/10" : "border-red-900/20 bg-red-950/10")}`}>
      {!isBlue && heroName && (
        <div className="min-w-0 flex-1 text-right">
          <div className="text-xs font-semibold text-white truncate">{heroName}</div>
          <div className="text-[9px] text-red-300/60">{assignment?.lane || getHeroRole(heroName)}</div>
        </div>
      )}
      <div className={`h-11 w-11 xl:h-12 xl:w-12 aspect-square rounded-xl shrink-0 overflow-hidden border flex items-center justify-center bg-slate-950/70
        ${heroName ? (isBlue ? "border-blue-700/50" : "border-red-700/50") : "border-dashed border-white/10"}`}>
        {heroName ? (
          <FallbackImage src={getHeroImgUrl(heroName)} fallbackText={heroName} alt={heroName}
            className="block h-full w-full object-cover object-center" containerClassName="h-full w-full text-[7px]" />
        ) : (
          isActive
            ? <div className={`h-2 w-2 rounded-full animate-pulse ${isBlue ? "bg-cyan-400" : "bg-rose-400"}`} />
            : <span className="text-[9px] text-white/20">{index + 1}</span>
        )}
      </div>
      {isBlue && heroName && (
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-white truncate">{heroName}</div>
          <div className="text-[9px] text-blue-300/60">{assignment?.lane || getHeroRole(heroName)}</div>
        </div>
      )}
      {isBlue && !heroName && (
        <div className="text-[11px] text-white/20">{isActive ? "Picking…" : `Slot ${index + 1}`}</div>
      )}
      {!isBlue && !heroName && (
        <div className="text-[11px] text-white/20 flex-1 text-right">{isActive ? "Picking…" : `Slot ${index + 1}`}</div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {!draftStarted ? (
        /* Mode Selection / Setup Screen */
        <div className="mx-auto max-w-2xl rounded-2xl border border-gray-950 bg-gray-950 p-6 sm:p-8 shadow-2xl text-center flex flex-col items-center gap-5 my-10 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-red-600 opacity-80" />

          {/* Step 1: Mode not yet selected */}
          {draftMode === null && (
            <>
              <div className="h-16 w-16 rounded-full bg-indigo-900/40 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
                <Users className="h-8 w-8 text-indigo-400" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Draft Coach Simulator
                </h2>
                <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                  Pilih mode draf yang ingin kamu gunakan. Sistem akan mengatur flow draft MPL resmi (3 Ban - 3 Pick - 2 Ban - 2 Pick) dan menganalisis setiap langkah.
                </p>
              </div>

              <div className="grid w-full gap-2 rounded-xl border border-gray-800 bg-gray-900/40 p-4 text-left">
                <div className="flex items-center gap-2 text-sm text-indigo-300">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span className="font-semibold">Info Timer Draft</span>
                </div>
                <div className="text-xs text-gray-400 leading-relaxed">
                  <div><span className="text-indigo-300 font-semibold">MPL Mode:</span> semua giliran pick atau ban memakai timer 50 detik.</div>
                  <div><span className="text-amber-300 font-semibold">Ranked / Casual Mode:</span> semua giliran pick atau ban memakai timer 30 detik.</div>
                </div>
              </div>

              {/* Mode Selection Cards */}
              <div className="grid w-full gap-4 mt-4 md:grid-cols-3">
                {/* MPL Mode Card */}
                <button
                  onClick={() => setDraftMode("mpl")}
                  className="flex-1 flex flex-col items-center gap-3 rounded-2xl border border-gray-800 bg-gray-900/50 p-6 hover:border-indigo-500/50 hover:bg-indigo-950/10 transition cursor-pointer group"
                >
                  <div className="h-14 w-14 rounded-full bg-indigo-900/40 border border-indigo-500/25 flex items-center justify-center group-hover:border-indigo-400/50 transition">
                    <Users className="h-7 w-7 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition">MPL Mode</h3>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      Simulasi draf dengan tim MPL. Pilih tim yang bertanding dari daftar resmi.
                    </p>
                  </div>
                </button>

                {/* Ranked Mode Card */}
                <button
                  onClick={() => {
                    setDraftMode("ranked");
                    setBlueTeam("Blue Team");
                    setRedTeam("Red Team");
                  }}
                  className="flex-1 flex flex-col items-center gap-3 rounded-2xl border border-gray-800 bg-gray-900/50 p-6 hover:border-amber-500/50 hover:bg-amber-950/10 transition cursor-pointer group"
                >
                  <div className="h-14 w-14 rounded-full bg-amber-900/40 border border-amber-500/25 flex items-center justify-center group-hover:border-amber-400/50 transition">
                    <Trophy className="h-7 w-7 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition">Ranked Mode</h3>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      Simulasi draf ranked. Semua giliran pick/ban memakai timer 30 detik.
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setDraftMode("custom");
                    setBlueTeam("Blue Team");
                    setRedTeam("Red Team");
                  }}
                  className="flex-1 flex flex-col items-center gap-3 rounded-2xl border border-gray-800 bg-gray-900/50 p-6 hover:border-cyan-500/50 hover:bg-cyan-950/10 transition cursor-pointer group"
                >
                  <div className="h-14 w-14 rounded-full bg-cyan-900/30 border border-cyan-500/20 flex items-center justify-center group-hover:border-cyan-400/50 transition">
                    <Sparkle className="h-7 w-7 text-cyan-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-cyan-200 transition">Custom Mode</h3>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      Draft bebas untuk latihan lane swap, eksperimen, dan evaluasi komposisi tanpa konteks tim esports.
                    </p>
                  </div>
                </button>
              </div>
            </>
          )}

          {/* Step 2: MPL Mode — Team Selection */}
          {draftMode === "mpl" && (
            <>
              <button
                onClick={() => setDraftMode(null)}
                className="absolute top-5 left-5 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Kembali
              </button>

              <div className="h-14 w-14 rounded-full bg-indigo-900/40 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
                <Users className="h-7 w-7 text-indigo-400" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  MPL Mode — Pilih Tim
                </h2>
                <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                  Pilih tim MPL untuk sisi Biru dan Merah. Rekomendasi akan disesuaikan berdasarkan profil tim.
                </p>
              </div>

              {/* MPL Timer Info Badge */}
              <div className="flex items-center gap-2 rounded-lg bg-indigo-950/60 border border-indigo-500/30 px-4 py-2 text-sm text-indigo-300">
                <Clock className="h-4 w-4 shrink-0 text-indigo-400" />
                <span>
                  <span className="font-semibold text-indigo-200">Pick &amp; Ban Timer: 50 detik per giliran</span>
                  <span className="text-indigo-400/80 ml-1">(MPL Standard)</span>
                </span>
              </div>

              {teamsLoading ? (
                <div className="flex items-center gap-2 py-6">
                  <div className="h-5 w-5 border-t-2 border-indigo-500 rounded-full animate-spin" />
                  <span className="text-sm text-gray-400">Memuat data tim...</span>
                </div>
              ) : (
                <>
                {teamsError && (
                  <div className="flex items-center gap-2 py-2">
                    <span className="text-xs text-amber-400">{teamsError}</span>
                    <button onClick={handleRetryTeams} className="text-xs text-indigo-400 hover:text-indigo-300 underline">
                      Coba lagi
                    </button>
                  </div>
                )}
                <div className="flex gap-4 w-full mt-4 flex-col sm:flex-row items-center justify-center">
                  <div className="w-full sm:w-1/2 flex flex-col gap-1 items-start">
                    <label className="text-xs text-blue-400 font-bold uppercase tracking-wider">Tim Biru (First Pick)</label>
                    <select
                      value={selectedBlueTeam}
                      onChange={(e) => {
                        setSelectedBlueTeam(e.target.value);
                        const team = mplTeams.find((t) => t.key === e.target.value);
                        if (team) setBlueTeam(team.name);
                      }}
                      className="w-full rounded-lg bg-gray-900 border border-gray-800 px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="">Pilih tim...</option>
                      {mplTeams.map((team) => (
                        <option key={team.key} value={team.key} disabled={team.key === selectedRedTeam}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-full sm:w-1/2 flex flex-col gap-1 items-start">
                    <label className="text-xs text-red-500 font-bold uppercase tracking-wider">Tim Merah</label>
                    <select
                      value={selectedRedTeam}
                      onChange={(e) => {
                        setSelectedRedTeam(e.target.value);
                        const team = mplTeams.find((t) => t.key === e.target.value);
                        if (team) setRedTeam(team.name);
                      }}
                      className="w-full rounded-lg bg-gray-900 border border-gray-800 px-4 py-2.5 text-white focus:outline-none focus:border-red-500 transition-colors"
                    >
                      <option value="">Pilih tim...</option>
                      {mplTeams.map((team) => (
                        <option key={team.key} value={team.key} disabled={team.key === selectedBlueTeam}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                </>
              )}

              {selectedBlueTeam && selectedRedTeam && selectedBlueTeam === selectedRedTeam && (
                <p className="text-xs text-amber-400 text-center mt-1">⚠️ Blue Team dan Red Team tidak boleh sama.</p>
              )}

              <div className="flex flex-col gap-2 w-full sm:flex-row sm:justify-center mt-3">
                <button
                  onClick={() => {
                    handleStartDraft();
                  }}
                  disabled={!selectedBlueTeam || !selectedRedTeam || selectedBlueTeam === selectedRedTeam}
                  className={`flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-white transition ${
                    selectedBlueTeam && selectedRedTeam && selectedBlueTeam !== selectedRedTeam
                      ? "bg-indigo-600 hover:bg-indigo-500 active:scale-95 cursor-pointer"
                      : "bg-gray-800 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  <Play className="h-4.5 w-4.5" />
                  Mulai Simulasi MPL
                </button>
              </div>
            </>
          )}

          {/* Step 2: Ranked Mode — Free text team names */}
          {draftMode === "ranked" && (
            <>
              <button
                onClick={() => setDraftMode(null)}
                className="absolute top-5 left-5 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Kembali
              </button>

              <div className="h-14 w-14 rounded-full bg-amber-900/40 border border-amber-500/25 flex items-center justify-center text-amber-400">
                <Trophy className="h-7 w-7 text-amber-400" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Ranked Mode
                </h2>
                <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                  Simulasi draf ranked. Rekomendasi berbasis meta tier dan statistik hero terkini.
                </p>
              </div>

              <div className="flex gap-4 w-full mt-4 flex-col sm:flex-row items-center justify-center">
                <div className="w-full sm:w-1/2 flex flex-col gap-1 items-start">
                  <label className="text-xs text-blue-400 font-bold uppercase tracking-wider">Tim Biru (First Pick)</label>
                  <input
                    type="text"
                    value={blueTeam}
                    onChange={(e) => setBlueTeam(e.target.value)}
                    className="w-full rounded-lg bg-gray-900 border border-gray-800 px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Ketik nama tim..."
                  />
                </div>
                <div className="w-full sm:w-1/2 flex flex-col gap-1 items-start">
                  <label className="text-xs text-red-500 font-bold uppercase tracking-wider">Tim Merah</label>
                  <input
                    type="text"
                    value={redTeam}
                    onChange={(e) => setRedTeam(e.target.value)}
                    className="w-full rounded-lg bg-gray-900 border border-gray-800 px-4 py-2 text-white focus:outline-none focus:border-red-500 transition-colors"
                    placeholder="Ketik nama tim..."
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full sm:flex-row sm:justify-center mt-3">
                <button
                  onClick={() => {
                    handleStartDraft();
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-500 active:scale-95 transition"
                >
                  <Play className="h-4.5 w-4.5" />
                  Mulai Simulasi Draf
                </button>
              </div>
            </>
          )}

          {draftMode === "custom" && (
            <>
              <button
                onClick={() => setDraftMode(null)}
                className="absolute top-5 left-5 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Kembali
              </button>

              <div className="h-14 w-14 rounded-full bg-cyan-900/30 border border-cyan-500/20 flex items-center justify-center text-cyan-300">
                <Sparkle className="h-7 w-7 text-cyan-300" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Custom Mode
                </h2>
                <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                  Draft manual untuk eksperimen komposisi, lane swap, dan analyst review tanpa wajib memakai konteks MPL.
                </p>
              </div>

              <div className="flex gap-4 w-full mt-4 flex-col sm:flex-row items-center justify-center">
                <div className="w-full sm:w-1/2 flex flex-col gap-1 items-start">
                  <label className="text-xs text-blue-400 font-bold uppercase tracking-wider">Blue Side</label>
                  <input
                    type="text"
                    value={blueTeam}
                    onChange={(e) => setBlueTeam(e.target.value)}
                    className="w-full rounded-lg bg-gray-900 border border-gray-800 px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Nama sisi biru..."
                  />
                </div>
                <div className="w-full sm:w-1/2 flex flex-col gap-1 items-start">
                  <label className="text-xs text-red-500 font-bold uppercase tracking-wider">Red Side</label>
                  <input
                    type="text"
                    value={redTeam}
                    onChange={(e) => setRedTeam(e.target.value)}
                    className="w-full rounded-lg bg-gray-900 border border-gray-800 px-4 py-2 text-white focus:outline-none focus:border-red-500 transition-colors"
                    placeholder="Nama sisi merah..."
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full sm:flex-row sm:justify-center mt-3">
                <button
                  onClick={handleStartDraft}
                  className="flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-6 py-3 font-semibold text-white hover:bg-cyan-500 active:scale-95 transition"
                >
                  <Play className="h-4.5 w-4.5" />
                  Mulai Simulasi Custom
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        /* ── MLBB-STYLE DRAFT BOARD ─────────────────────────────────────────── */
        <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] shadow-2xl bg-gradient-to-b from-[#060e1e] to-[#030810]">
          {/* Atmospheric background */}
          <div className="absolute inset-0 pointer-events-none z-0">
            <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-blue-900/12 to-transparent" />
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-red-900/10 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(10,25,80,0.3),transparent)]" />
            <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "radial-gradient(circle,#ffffff 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
          </div>

          {/* ── ZONE 1: TOP HEADER BAR ──────────────────────────────────────── */}
          <div className="relative z-10 flex items-center gap-2 px-3 h-11 bg-black/50 border-b border-white/[0.06]">
            <button onClick={handleReset} className="flex items-center gap-1 text-gray-400 hover:text-white text-xs transition-colors shrink-0">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="h-4 w-px bg-white/10" />
            <div className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border shrink-0 ${normalizedMode === "mpl" ? "border-indigo-500/30 bg-indigo-900/30 text-indigo-300" : normalizedMode === "ranked" ? "border-amber-500/30 bg-amber-900/20 text-amber-300" : "border-cyan-500/30 bg-cyan-900/20 text-cyan-300"}`}>
              {normalizedMode.toUpperCase()}
            </div>
            <div className="flex-1 flex items-center justify-center gap-3">
              <span className="font-bold text-blue-300 text-sm truncate max-w-[120px]">{blueTeam}</span>
              <span className="text-[10px] text-gray-600 uppercase tracking-widest">vs</span>
              <span className="font-bold text-red-300 text-sm truncate max-w-[120px]">{redTeam}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!isCompleted && (
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${currentStep?.type === "BAN" ? "border-red-500/40 bg-red-900/20 text-red-300" : "border-cyan-500/40 bg-cyan-900/20 text-cyan-300"}`}>
                  {currentStep?.type}
                </span>
              )}
              {isCompleted && <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">COMPLETE</span>}
              <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-1.5 rounded-lg border border-white/[0.08] hover:border-white/[0.15] text-gray-500 hover:text-white transition-colors">
                {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              </button>
              <button onClick={handleReset} className="p-1.5 rounded-lg border border-white/[0.08] hover:border-red-500/30 text-gray-500 hover:text-red-300 transition-colors">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* ── ZONE 2: BAN / PICK PREVIEW STRIP ────────────────────────────── */}
          <div className="relative z-10 flex items-stretch bg-black/30 border-b border-white/[0.04]">
            {/* Blue side */}
            <div className="flex-1 flex flex-col gap-1 px-3 py-2">
              <div className="text-[10px] text-blue-400/50 font-bold uppercase tracking-widest">BANS</div>
              <div className="flex gap-1 flex-wrap">
                {Array.from({ length: 5 }).map((_, i) => (
                  <BanSlot key={i} heroName={blueBans[i] || ""} side="blue" />
                ))}
              </div>
              <div className="text-[10px] text-blue-400/40 mt-0.5 uppercase tracking-widest">PICKS</div>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => {
                  const h = bluePicks[i] || "";
                  return (
                    <div key={i} className={`h-9 w-9 xl:h-10 xl:w-10 aspect-square rounded-lg overflow-hidden border shrink-0 ${h ? "border-blue-700/50" : "border-blue-900/20 border-dashed"} bg-slate-900/40`}>
                      {h ? (
                        <FallbackImage src={getHeroImgUrl(h)} fallbackText={h} alt={h} className="block h-full w-full object-cover object-center" containerClassName="h-full w-full text-[6px]" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-[8px] text-blue-900/50">{i + 1}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Center: timer + phase */}
            <div className="flex flex-col items-center justify-center px-4 min-w-[110px] border-x border-white/[0.04] py-2">
              {!isCompleted ? (
                <>
                  <div className={`text-[11px] font-bold uppercase tracking-widest mb-0.5 ${currentStep?.side === "BLUE" ? "text-blue-400" : "text-red-400"}`}>
                    {currentStep?.side === "BLUE" ? blueTeam : redTeam}
                  </div>
                  <div className={`text-3xl font-black tabular-nums leading-none ${timerSeconds <= 8 ? "text-red-400 animate-pulse" : "text-white"}`}>
                    {String(timerSeconds).padStart(2, "0")}
                  </div>
                  <div className={`text-[11px] uppercase tracking-widest mt-0.5 ${currentStep?.type === "BAN" ? "text-red-400/70" : "text-cyan-400/70"}`}>
                    {currentStep?.type}
                  </div>
                  <div className="mt-1 w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${currentStep?.side === "BLUE" ? "bg-blue-500" : "bg-red-500"}`}
                      style={{ width: `${(timerSeconds / turnDurationSeconds) * 100}%` }}
                    />
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-1" />
                  <div className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest">Draft Over</div>
                </div>
              )}
            </div>

            {/* Red side */}
            <div className="flex-1 flex flex-col gap-1 px-3 py-2 items-end">
              <div className="text-[10px] text-red-400/50 font-bold uppercase tracking-widest">BANS</div>
              <div className="flex gap-1 flex-wrap justify-end">
                {Array.from({ length: 5 }).map((_, i) => (
                  <BanSlot key={i} heroName={redBans[i] || ""} side="red" />
                ))}
              </div>
              <div className="text-[10px] text-red-400/40 mt-0.5 uppercase tracking-widest">PICKS</div>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => {
                  const h = redPicks[i] || "";
                  return (
                    <div key={i} className={`h-9 w-9 xl:h-10 xl:w-10 aspect-square rounded-lg overflow-hidden border shrink-0 ${h ? "border-red-700/50" : "border-red-900/20 border-dashed"} bg-slate-900/40`}>
                      {h ? (
                        <FallbackImage src={getHeroImgUrl(h)} fallbackText={h} alt={h} className="block h-full w-full object-cover object-center" containerClassName="h-full w-full text-[6px]" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-[8px] text-red-900/50">{i + 1}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── ZONE 3: MAIN DRAFT BOARD ─────────────────────────────────────── */}
          <div className="relative z-10 flex" style={{ minHeight: "520px" }}>
            {/* LEFT: Blue team pick slots (xl+) */}
            <div className="hidden xl:flex w-[210px] shrink-0 flex-col border-r border-blue-900/20 bg-blue-950/5">
              <div className="px-3 pt-3 pb-1">
                <div className="text-[9px] text-blue-400/60 uppercase tracking-widest font-bold">Blue · First Pick</div>
                <div className="text-sm font-bold text-blue-200 truncate">{blueTeam}</div>
              </div>
              <div className="flex-1 flex flex-col gap-1.5 px-2 pb-2 overflow-y-auto">
                {Array.from({ length: 5 }).map((_, i) => {
                  const heroName = bluePicks[i] || "";
                  const assignment = heroName
                    ? evaluationDashboard.teamPanels.blue.assignedHeroes.find(
                        (e) => normalizeHeroKey(e.heroName) === normalizeHeroKey(heroName)
                      )
                    : null;
                  const isActive = !isCompleted && currentStep?.side === "BLUE" && currentStep?.type === "PICK" && bluePicks.length === i;
                  return <PickSlot key={i} heroName={heroName} index={i} isBlue={true} isActive={isActive} assignment={assignment} />;
                })}
              </div>
              <div className="px-2 pb-2 border-t border-blue-900/20 pt-2 space-y-1">
                <div className="text-[9px] text-blue-400/50 uppercase tracking-widest">Status</div>
                <div className="text-[10px] leading-relaxed">
                  <span className={evaluationDashboard.teamPanels.blue.missingLanes.length ? "text-amber-400" : "text-emerald-400"}>
                    {evaluationDashboard.teamPanels.blue.missingLanes.length
                      ? `Missing: ${evaluationDashboard.teamPanels.blue.missingLanes.join(", ")}`
                      : "Lanes covered ✓"}
                  </span>
                </div>
                {evaluationDashboard.teamPanels.blue.roleWarnings[0] && (
                  <div className="text-[10px] text-amber-400/80 truncate">{evaluationDashboard.teamPanels.blue.roleWarnings[0]}</div>
                )}
              </div>
            </div>

            {/* CENTER: Hero pool */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              {/* Role tabs */}
              <div className="flex items-center overflow-x-auto scrollbar-none border-b border-white/[0.05] bg-black/20">
                {ROLE_OPTIONS.map((role) => (
                  <button
                    key={role}
                    onClick={() => setRoleFilter(role)}
                    className={`px-3 py-2 text-xs font-medium shrink-0 border-b-2 -mb-px transition-colors ${roleFilter === role ? "border-cyan-400 text-cyan-300" : "border-transparent text-gray-500 hover:text-gray-300"}`}
                  >
                    {role}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-1 px-2">
                  <select value={laneFilter} onChange={(e) => setLaneFilter(e.target.value)} className="text-[10px] bg-white/5 border border-white/[0.06] rounded px-1.5 py-1 text-gray-400 outline-none">
                    {LANE_OPTIONS.map((o) => <option key={o} value={o}>{o === "ALL" ? "Lane" : o}</option>)}
                  </select>
                  <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)} className="text-[10px] bg-white/5 border border-white/[0.06] rounded px-1.5 py-1 text-gray-400 outline-none">
                    {TIER_OPTIONS.map((o) => <option key={o} value={o}>{o === "ALL" ? "Tier" : `T${o}`}</option>)}
                  </select>
                </div>
              </div>

              {/* Search + filter chips */}
              <div className="flex items-center gap-2 px-2 py-1.5 bg-black/10 border-b border-white/[0.03]">
                <div className="relative flex-1 max-w-[200px]">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-600" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search…"
                    className="w-full pl-6 pr-2 py-1 text-xs bg-white/[0.04] border border-white/[0.06] rounded-lg text-white placeholder:text-gray-600 outline-none focus:border-cyan-500/40"
                  />
                </div>
                {[
                  { label: "Rec", active: recommendedOnly, toggle: () => setRecommendedOnly((v) => !v) },
                  { label: "Counter", active: counterOnly, toggle: () => setCounterOnly((v) => !v) },
                  { label: "Synergy", active: synergyOnly, toggle: () => setSynergyOnly((v) => !v) },
                  { label: "Comfort", active: comfortOnly, toggle: () => setComfortOnly((v) => !v) },
                ].map((chip) => (
                  <button key={chip.label} onClick={chip.toggle} className={`text-[10px] px-2 py-1 rounded-full border transition-colors shrink-0 ${chip.active ? "border-cyan-500/40 bg-cyan-900/20 text-cyan-300" : "border-white/[0.07] text-gray-500 hover:text-gray-300"}`}>
                    {chip.label}
                  </button>
                ))}
                <span className="ml-auto text-[10px] text-gray-600">{sortedHeroesList.length}</span>
              </div>

              {/* Turn indicator */}
              {!isCompleted && (
                <div className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-2 ${currentStep?.side === "BLUE" ? "bg-blue-950/20 text-blue-300" : "bg-red-950/15 text-red-300"}`}>
                  <div className={`h-1.5 w-1.5 rounded-full animate-pulse ${currentStep?.side === "BLUE" ? "bg-blue-400" : "bg-red-400"}`} />
                  {currentStep?.side === "BLUE" ? blueTeam : redTeam} · {currentStep?.type === "BAN" ? "Ban a hero" : "Pick a hero"}
                  <span className="ml-auto text-[10px] opacity-60">Lane: {laneNeeds.length ? laneNeeds.join(", ") : "all covered"}</span>
                </div>
              )}

              {/* Hero grid */}
              <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-white/10">
                {sortedHeroesList.length > 0 ? (
                  <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-7 xl:grid-cols-5 2xl:grid-cols-7 gap-1.5">
                    {sortedHeroesList.map((hero) => {
                      const heroKey = normalizeHeroKey(hero.hero_name);
                      const insight = heroInsights[heroKey];
                      const recommendationView = displayedCoachRecommendations.find(
                        (rec) => normalizeHeroKey(rec.heroName) === heroKey
                      );
                      const recTone = recommendationView ? coachToneClass[recommendationView.tone] : null;
                      const recMiniLabel = recommendationView?.label?.toLowerCase().includes("comfort")
                        ? "COM"
                        : recommendationView?.label?.toLowerCase().includes("counter")
                          ? "CTR"
                          : recommendationView?.label?.toLowerCase().includes("deny")
                            ? "DENY"
                            : currentStep?.type === "BAN"
                              ? "BAN"
                              : "PICK";
                      const isUsed = usedHeroesMap.has(heroKey);
                      const isSelected = selectedHeroName === hero.hero_name;
                      const isRec = insight?.status === "recommended";
                      const isBanned = insight?.status === "banned";
                      const isPicked = insight?.status === "picked";
                      return (
                        <button
                          key={hero.hero_name}
                          disabled={isUsed || isCompleted}
                          onClick={() => handleSelectHero(hero.hero_name)}
                          title={insight?.whyRecommended || hero.hero_name}
                          className={`relative flex flex-col items-center gap-0.5 p-1.5 rounded-xl border transition-all ${isSelected ? "border-cyan-400/60 bg-cyan-900/20 ring-1 ring-cyan-400/25 scale-105" : recommendationView && !isUsed && recTone ? recTone.card : isRec && !isUsed ? "border-emerald-500/40 bg-emerald-900/10" : isBanned ? "border-red-900/20 opacity-30 cursor-not-allowed" : isPicked ? "border-blue-900/20 opacity-30 cursor-not-allowed" : insight?.status === "risky" ? "border-amber-500/20 bg-amber-900/5" : "border-white/[0.05] hover:border-white/[0.15] hover:bg-white/[0.03]"} ${!isUsed && !isCompleted ? "cursor-pointer hover:-translate-y-0.5" : ""}`}
                        >
                          <div className={`relative h-12 w-12 xl:h-[52px] xl:w-[52px] aspect-square rounded-xl overflow-hidden border bg-slate-950/70 ${isSelected ? "border-cyan-500/50" : isRec && !isUsed ? "border-emerald-500/25" : "border-white/[0.06]"}`}>
                            <FallbackImage
                              src={getHeroImgUrl(hero.hero_name)}
                              fallbackText={hero.hero_name}
                              alt={hero.hero_name}
                              className={`block h-full w-full object-cover object-center ${(isBanned || isPicked) ? "grayscale" : ""}`}
                              containerClassName="h-full w-full text-[7px]"
                            />
                            {isBanned && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <div className="h-4 w-4 rounded-full border border-red-500/60 flex items-center justify-center">
                                  <span className="text-red-400 text-[8px] font-black">x</span>
                                </div>
                              </div>
                            )}
                            {isRec && !isUsed && (
                              <div className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(74,222,128,0.8)]" />
                            )}
                          </div>
                          <span className={`text-[9px] font-medium truncate w-full text-center leading-tight ${isSelected ? "text-cyan-200" : isRec && !isUsed ? "text-emerald-200" : (isBanned || isPicked) ? "text-gray-700" : "text-gray-400"}`}>
                            {hero.hero_name}
                          </span>
                          {(isRec || recommendationView) && !isUsed && (
                            <div className={`absolute -top-0.5 -right-0.5 text-[7px] font-black px-1 rounded-full leading-tight border ${recTone ? recTone.badge : "border-emerald-400/40 bg-emerald-500 text-black"}`}>
                              {recMiniLabel}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-full min-h-[220px] flex items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-black/20 px-4 text-center">
                    <div className="max-w-sm">
                      <div className="mx-auto mb-3 h-10 w-10 rounded-2xl border border-cyan-400/20 bg-cyan-950/20 flex items-center justify-center">
                        <Search className="h-5 w-5 text-cyan-300" />
                      </div>
                      <div className="text-sm font-bold text-white">Tidak ada hero cocok dengan filter ini</div>
                      <p className="mt-1 text-xs leading-relaxed text-gray-500">
                        Counter, Synergy, dan Comfort bergantung pada draft yang sudah terkunci dan data team. Kalau masih kosong, reset filter atau lock hero dulu.
                      </p>
                      <button
                        onClick={resetHeroFilters}
                        className="mt-3 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-200 hover:bg-cyan-500/20"
                      >
                        Reset filter
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Lock bar */}
              {!isCompleted ? (
                <div className="border-t border-white/[0.05] bg-black/40 px-3 py-2 flex items-center gap-2 shrink-0">
                  {selectedHeroName ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="h-10 w-10 aspect-square rounded-xl overflow-hidden border border-cyan-500/40 shrink-0 bg-slate-950/70">
                        <FallbackImage src={getHeroImgUrl(selectedHeroName)} fallbackText={selectedHeroName} alt={selectedHeroName} className="block h-full w-full object-cover object-center" containerClassName="h-full w-full text-[7px]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-cyan-200 truncate">{selectedHeroName}</div>
                        <div className="text-[9px] text-gray-500">{selectedHeroInsight?.lane || "Flex"}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 text-xs text-gray-600">Select a hero to lock in</div>
                  )}
                  <button
                    onClick={handleUndo}
                    disabled={draftHistory.length === 0}
                    title="Undo last action (Ctrl+Z)"
                    className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] bg-amber-900/30 border border-amber-600/30 text-amber-300 rounded-lg hover:bg-amber-900/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                    Undo
                  </button>
                  <button
                    onClick={() => setRecommendationsPaused((value) => !value)}
                    title={recommendationsPaused ? "Resume auto recommendations" : "Pause auto recommendations supaya tidak fetch ulang saat mikir draft"}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] rounded-lg border transition-colors shrink-0 ${
                      recommendationsPaused
                        ? "bg-slate-800/70 border-slate-500/30 text-slate-200 hover:bg-slate-700/70"
                        : "bg-cyan-900/25 border-cyan-500/25 text-cyan-300 hover:bg-cyan-900/40"
                    }`}
                  >
                    {recommendationsPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                    {recommendationsPaused ? "Resume" : "Pause"}
                  </button>
                  <button onClick={fetchAICoach} disabled={aiLoading} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] bg-indigo-900/40 border border-indigo-500/30 text-indigo-300 rounded-lg hover:bg-indigo-900/60 transition-colors disabled:opacity-50 shrink-0">
                    <Sparkles className="h-3.5 w-3.5" />
                    {aiLoading ? "…" : "AI"}
                  </button>
                  <button
                    onClick={() => handleLockHero(selectedHeroName)}
                    disabled={!selectedHeroName}
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm uppercase tracking-wider transition-all shrink-0 ${selectedHeroName ? "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-[0_0_16px_rgba(6,182,212,0.3)]" : "bg-slate-900 text-slate-600 cursor-not-allowed"}`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {currentStep?.type === "BAN" ? "BAN" : "LOCK IN"}
                  </button>
                </div>
              ) : (
                <div className="border-t border-white/[0.05] bg-black/40 px-3 py-2 flex items-center gap-2 shrink-0 flex-wrap">
                  <button onClick={() => { evaluateDraftGame(); setShowAnalysis(true); }} disabled={evaluationLoading} className="flex items-center gap-2 px-4 py-2 text-xs bg-emerald-700/40 border border-emerald-500/40 text-emerald-300 rounded-xl font-bold uppercase hover:bg-emerald-700/60 transition-colors disabled:opacity-50">
                    <BarChart3 className="h-4 w-4" />
                    {evaluationLoading ? "Analyzing…" : "Run Final Analysis"}
                  </button>
                  {user && (
                    <button onClick={handleSaveDraft} disabled={isSaving || saveSuccess} className="flex items-center gap-2 px-4 py-2 text-xs bg-blue-700/40 border border-blue-500/40 text-blue-300 rounded-xl font-bold uppercase hover:bg-blue-700/60 transition-colors disabled:opacity-50">
                      <Save className="h-4 w-4" />
                      {saveSuccess ? "Saved" : isSaving ? "Saving…" : "Save Draft"}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT: Red team pick slots (xl+) */}
            <div className="hidden xl:flex w-[210px] shrink-0 flex-col border-l border-red-900/20 bg-red-950/5">
              <div className="px-3 pt-3 pb-1 text-right">
                <div className="text-[9px] text-red-400/60 uppercase tracking-widest font-bold">Second Pick · Red</div>
                <div className="text-sm font-bold text-red-200 truncate">{redTeam}</div>
              </div>
              <div className="flex-1 flex flex-col gap-1.5 px-2 pb-2 overflow-y-auto">
                {Array.from({ length: 5 }).map((_, i) => {
                  const heroName = redPicks[i] || "";
                  const assignment = heroName
                    ? evaluationDashboard.teamPanels.red.assignedHeroes.find(
                        (e) => normalizeHeroKey(e.heroName) === normalizeHeroKey(heroName)
                      )
                    : null;
                  const isActive = !isCompleted && currentStep?.side === "RED" && currentStep?.type === "PICK" && redPicks.length === i;
                  return <PickSlot key={i} heroName={heroName} index={i} isBlue={false} isActive={isActive} assignment={assignment} />;
                })}
              </div>
              <div className="px-2 pb-2 border-t border-red-900/20 pt-2 space-y-1">
                <div className="text-[9px] text-red-400/50 uppercase tracking-widest text-right">Status</div>
                <div className="text-[10px] text-right leading-relaxed">
                  <span className={evaluationDashboard.teamPanels.red.missingLanes.length ? "text-amber-400" : "text-emerald-400"}>
                    {evaluationDashboard.teamPanels.red.missingLanes.length
                      ? `Missing: ${evaluationDashboard.teamPanels.red.missingLanes.join(", ")}`
                      : "Lanes covered ✓"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile team display */}
          <div className="xl:hidden border-t border-white/[0.04] grid grid-cols-2 gap-0">
            <div className="border-r border-white/[0.04] p-3 bg-blue-950/5">
              <div className="text-[9px] text-blue-400/60 uppercase tracking-widest mb-2">Blue Picks</div>
              <div className="flex flex-col gap-1">
                {Array.from({ length: 5 }).map((_, i) => {
                  const h = bluePicks[i] || "";
                  return (
                    <div key={i} className="flex items-center gap-1.5 h-8">
                      <div className="h-8 w-8 aspect-square rounded-lg border border-blue-900/30 overflow-hidden bg-slate-900/40 shrink-0">
                        {h ? <FallbackImage src={getHeroImgUrl(h)} fallbackText={h} alt={h} className="block h-full w-full object-cover object-center" containerClassName="h-full w-full text-[6px]" /> : <div className="h-full w-full" />}
                      </div>
                      <span className="text-[10px] text-gray-400 truncate">{h || "—"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-3 bg-red-950/5">
              <div className="text-[9px] text-red-400/60 uppercase tracking-widest mb-2 text-right">Red Picks</div>
              <div className="flex flex-col gap-1">
                {Array.from({ length: 5 }).map((_, i) => {
                  const h = redPicks[i] || "";
                  return (
                    <div key={i} className="flex items-center gap-1.5 h-8 justify-end">
                      <span className="text-[10px] text-gray-400 truncate">{h || "—"}</span>
                      <div className="h-8 w-8 aspect-square rounded-lg border border-red-900/30 overflow-hidden bg-slate-900/40 shrink-0">
                        {h ? <FallbackImage src={getHeroImgUrl(h)} fallbackText={h} alt={h} className="block h-full w-full object-cover object-center" containerClassName="h-full w-full text-[6px]" /> : <div className="h-full w-full" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── ZONE 4: ANALYSIS PANEL ───────────────────────────────────────── */}
          <div className="relative z-10 border-t border-white/[0.05]">
            <div className="flex items-center gap-0 px-2 border-b border-white/[0.04] bg-black/20">
              {([
                { id: "rec", label: "Recommendations", Icon: Sparkles },
                { id: "counter", label: "Counter Read", Icon: Swords },
                { id: "intel", label: "Team Intel", Icon: HelpCircle },
              ] as const).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setAnalysisTab(id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${analysisTab === id ? "border-cyan-400 text-cyan-300" : "border-transparent text-gray-500 hover:text-gray-300"}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
              {recommendationsPaused ? (
                <span className="ml-auto text-[10px] text-amber-300/80 pr-3">Paused · cache only</span>
              ) : recsLoading ? (
                <span className="ml-auto text-[10px] text-gray-500 animate-pulse pr-3">Updating…</span>
              ) : null}
            </div>
            <div className="p-3 min-h-[150px]">
              {analysisTab === "rec" && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider">
                    <span className="text-gray-500">Action signals</span>
                    {[
                      { label: "Ban", tone: "ban" as const },
                      { label: "Pick", tone: "pick" as const },
                      { label: "Priority", tone: "priority" as const },
                      { label: "Counter", tone: "counter" as const },
                      { label: "Comfort", tone: "comfort" as const },
                      { label: "Deny", tone: "deny" as const },
                    ].map((item) => (
                      <span key={item.label} className={`rounded-full border px-2 py-0.5 ${coachToneClass[item.tone].badge}`}>
                        {item.label}
                      </span>
                    ))}
                  </div>
                  {displayedCoachRecommendations.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-5 gap-2.5">
                      {displayedCoachRecommendations.map((rec, i) => {
                        const tone = coachToneClass[rec.tone];
                        const isUnavailable = usedHeroesMap.has(normalizeHeroKey(rec.heroName));
                        const scoreEntries = getTopScoreEntries(rec.scoreBreakdown);
                        return (
                          <button
                            key={`${rec.heroName}-${i}`}
                            onClick={() => handleSelectHero(rec.heroName)}
                            disabled={isUnavailable}
                            className={`group relative min-h-[170px] overflow-hidden rounded-2xl border p-3 text-left transition-all disabled:opacity-45 disabled:cursor-not-allowed ${tone.card}`}
                          >
                            <div className={`absolute left-0 top-0 h-full w-1 ${tone.accent}`} />
                            <div className="flex items-start gap-3">
                              <div className="relative h-14 w-14 aspect-square rounded-xl overflow-hidden border border-white/[0.1] shrink-0 bg-black/30">
                                <FallbackImage src={getHeroImgUrl(rec.heroName)} fallbackText={rec.heroName} alt={rec.heroName} className="block h-full w-full object-cover object-center" containerClassName="h-full w-full text-[7px]" />
                                {isUnavailable && <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[9px] font-black text-red-300">USED</div>}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className={`text-base font-black leading-tight ${tone.title}`}>{rec.heroName}</div>
                                  {rec.score > 0 && <div className={`text-[11px] font-black shrink-0 ${tone.score}`}>{Math.round(rec.score)}pt</div>}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-bold ${tone.badge}`}>{rec.label}</span>
                                  {rec.source && <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">{rec.source}</span>}
                                </div>
                              </div>
                            </div>
                            <p className="mt-3 text-xs leading-relaxed text-gray-300 whitespace-normal">
                              {rec.reason}
                            </p>
                            <div className="mt-3 space-y-2">
                              {rec.evidence && (
                                <div className="rounded-lg border border-white/[0.06] bg-black/20 px-2 py-1.5 text-[10px] leading-relaxed text-gray-400">
                                  {rec.evidence}
                                </div>
                              )}
                              {scoreEntries.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {scoreEntries.map(([key, value]) => (
                                    <span key={key} className="rounded-full border border-white/[0.07] bg-white/[0.04] px-1.5 py-0.5 text-[9px] text-gray-400">
                                      {formatSourceLabel(key)} {value}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/[0.08] bg-black/20 p-5 text-center">
                      <Sparkles className="mx-auto h-6 w-6 text-cyan-300/70" />
                      <div className="mt-2 text-sm font-bold text-white">{recsLoading ? "Loading recommendations…" : "Belum ada rekomendasi untuk step ini"}</div>
                      <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-gray-500">
                        Rekomendasi muncul otomatis saat draft berjalan. Klik AI untuk memaksa fetch, atau lock hero dulu agar engine punya konteks pick/ban.
                      </p>
                    </div>
                  )}
                  {aiError && <div className="text-xs text-amber-300 p-3 rounded-xl border border-amber-500/20 bg-amber-900/10">{aiError}</div>}
                </div>
              )}
              {analysisTab === "counter" && (
                <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                  {[
                    ...evaluationDashboard.risks.blue.map((r) => ({ side: "Blue", risk: r })),
                    ...evaluationDashboard.risks.red.map((r) => ({ side: "Red", risk: r })),
                  ].slice(0, 6).map((entry, i) => (
                    <div key={i} className="shrink-0 w-[190px] flex items-start gap-2 p-2.5 rounded-xl border border-amber-500/15 bg-amber-900/5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[9px] font-bold text-amber-400 uppercase">{entry.side}</div>
                        <p className="text-[10px] text-gray-400 leading-relaxed">{entry.risk}</p>
                      </div>
                    </div>
                  ))}
                  {evaluationDashboard.risks.blue.length === 0 && evaluationDashboard.risks.red.length === 0 && (
                    <div className="text-xs text-gray-600 py-3">No major threats detected yet.</div>
                  )}
                  {evaluationDashboard.recommendations.slice(0, 5).map((rec, i) => (
                    <div key={`adj-${i}`} className="shrink-0 w-[190px] flex items-start gap-2 p-2.5 rounded-xl border border-cyan-500/10 bg-cyan-900/5">
                      <ChevronRight className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-gray-400 leading-relaxed">{rec}</p>
                    </div>
                  ))}
                </div>
              )}
              {analysisTab === "intel" && (
                <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                  {/* Local data — always shown immediately */}
                  {draftMode === "mpl" && (selectedBlueTeam || selectedRedTeam) ? (
                    <>
                      {/* Blue team comfort heroes — local or AI enriched */}
                      <div className="shrink-0 w-[180px] p-2.5 rounded-xl border border-blue-500/20 bg-blue-950/10">
                        <div className="text-[8px] text-blue-400/70 uppercase tracking-wider mb-1.5">{blueTeam} Comfort</div>
                        {blueComfortHeroes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {blueComfortHeroes.slice(0, 5).map((h) => (
                              <span key={h} className="text-[9px] bg-blue-900/40 text-blue-200 px-1.5 py-0.5 rounded-full border border-blue-500/20">{h}</span>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[9px] text-gray-600 italic">{aiLoading ? "Loading…" : "Click AI to load"}</div>
                        )}
                      </div>
                      {/* Red team comfort heroes */}
                      <div className="shrink-0 w-[180px] p-2.5 rounded-xl border border-red-500/20 bg-red-950/10">
                        <div className="text-[8px] text-red-400/70 uppercase tracking-wider mb-1.5">{redTeam} Comfort</div>
                        {redComfortHeroes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {redComfortHeroes.slice(0, 5).map((h) => (
                              <span key={h} className="text-[9px] bg-red-900/40 text-red-200 px-1.5 py-0.5 rounded-full border border-red-500/20">{h}</span>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[9px] text-gray-600 italic">{aiLoading ? "Loading…" : "Click AI to load"}</div>
                        )}
                      </div>
                    </>
                  ) : null}
                  {/* Global meta context — always available instantly */}
                  <div className="shrink-0 w-[180px] p-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02]">
                    <div className="text-[8px] text-gray-500 uppercase tracking-wider mb-1.5">Meta Top Picks</div>
                    <div className="flex flex-wrap gap-1">
                      {heroes
                        .slice()
                        .sort((a, b) => Number(b.picks_total || 0) - Number(a.picks_total || 0))
                        .slice(0, 6)
                        .map((h) => (
                          <span key={h.hero_name} className="text-[9px] bg-white/5 text-gray-300 px-1.5 py-0.5 rounded-full border border-white/10">{h.hero_name}</span>
                        ))}
                    </div>
                  </div>
                  <div className="shrink-0 w-[180px] p-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02]">
                    <div className="text-[8px] text-gray-500 uppercase tracking-wider mb-1.5">Meta Top Bans</div>
                    <div className="flex flex-wrap gap-1">
                      {heroes
                        .slice()
                        .sort((a, b) => Number(b.bans_total || 0) - Number(a.bans_total || 0))
                        .slice(0, 6)
                        .map((h) => (
                          <span key={h.hero_name} className="text-[9px] bg-white/5 text-gray-300 px-1.5 py-0.5 rounded-full border border-white/10">{h.hero_name}</span>
                        ))}
                    </div>
                  </div>
                  {/* AI-enriched: repick/pivot signals */}
                  {localTeamIntel.likelyRepicks.map((entry: any, i: number) => (
                    <div key={i} className="shrink-0 w-[180px] p-2.5 rounded-xl border border-indigo-500/15 bg-indigo-900/5">
                      <div className="text-[8px] text-indigo-400/70 uppercase tracking-wider mb-1">Likely Repick</div>
                      <div className="text-xs font-bold text-white">{entry.heroName}</div>
                      <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{entry.reason}</p>
                    </div>
                  ))}
                  {localTeamIntel.likelyRebans.map((entry: any, i: number) => (
                    <div key={`reban-${i}`} className="shrink-0 w-[180px] p-2.5 rounded-xl border border-rose-500/15 bg-rose-900/5">
                      <div className="text-[8px] text-rose-400/70 uppercase tracking-wider mb-1">Likely Reban</div>
                      <div className="text-xs font-bold text-white">{entry.heroName}</div>
                      <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{entry.reason}</p>
                    </div>
                  ))}
                  {localTeamIntel.pivotCandidates.map((entry: any, i: number) => (
                    <div key={`pivot-${i}`} className="shrink-0 w-[180px] p-2.5 rounded-xl border border-violet-500/15 bg-violet-900/5">
                      <div className="text-[8px] text-violet-400/70 uppercase tracking-wider mb-1">Pivot Candidate</div>
                      <div className="text-xs font-bold text-white">{entry.heroName}</div>
                      <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{entry.reason}</p>
                    </div>
                  ))}
                  {localTeamIntel.similarGames.slice(0, 2).map((g: any, i: number) => (
                    <div key={`sim-${i}`} className="shrink-0 w-[200px] p-2.5 rounded-xl border border-slate-700/40 bg-white/[0.02]">
                      <div className="text-[8px] text-gray-500 uppercase tracking-wider mb-1">Similar Game</div>
                      <div className="text-[10px] font-bold text-white">{g.sourceLabel}</div>
                      <div className="text-[9px] text-gray-500 mt-0.5">Match: {Math.round(g.similarityScore * 100)}%</div>
                      {g.matchingSignals.slice(0, 2).map((s: string, si: number) => (
                        <div key={si} className="text-[9px] text-gray-500 truncate">{s}</div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── ZONE 5: POST-DRAFT ANALYSIS (summary strip, always visible after complete) ──── */}
          {isCompleted && !showAnalysis && (
            <div className="relative z-10 border-t border-white/[0.05] px-4 py-3 flex flex-wrap items-center gap-3 bg-black/30">
              <div className="flex-1 flex flex-wrap gap-2 min-w-0">
                <div className="rounded-lg border border-blue-500/20 bg-blue-950/15 px-3 py-1.5 text-center">
                  <div className="text-[8px] text-blue-400/70 uppercase">Blue Win</div>
                  <div className="text-lg font-black text-white">{evaluationDashboard.blueWinProbability}%</div>
                </div>
                <div className="rounded-lg border border-red-500/20 bg-red-950/15 px-3 py-1.5 text-center">
                  <div className="text-[8px] text-red-400/70 uppercase">Red Win</div>
                  <div className="text-lg font-black text-white">{evaluationDashboard.redWinProbability}%</div>
                </div>
                <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-1.5">
                  <div className="text-[8px] text-gray-500 uppercase">Winner Edge</div>
                  <div className={`text-sm font-bold mt-0.5 ${evaluationDashboard.predictedWinner === "blue" ? "text-blue-300" : evaluationDashboard.predictedWinner === "red" ? "text-red-300" : "text-gray-300"}`}>
                    {evaluationDashboard.predictedWinner === "even" ? "Even" : evaluationDashboard.predictedWinner === "blue" ? blueTeam : redTeam}
                  </div>
                </div>
              </div>
              <button
                onClick={() => { evaluateDraftGame(); setShowAnalysis(true); }}
                className="flex items-center gap-2 px-4 py-2 text-xs bg-emerald-700/50 border border-emerald-500/40 text-emerald-300 rounded-xl font-bold uppercase hover:bg-emerald-700/70 transition-colors shrink-0"
              >
                <BarChart3 className="h-4 w-4" />
                Full Analysis
              </button>
            </div>
          )}
          {/* ── FULL ANALYSIS VIEW OVERLAY ──────────────────────────────────── */}
          {isCompleted && showAnalysis && (
            <div className="absolute inset-0 z-50 bg-[#08091a] overflow-y-auto">
              {/* Back bar */}
              <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-[#08091a]/90 backdrop-blur border-b border-white/[0.06]">
                <button
                  onClick={() => setShowAnalysis(false)}
                  className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to Draft
                </button>
                <div className="flex-1 text-center text-sm font-bold text-white">Draft Analysis</div>
                <div className="text-[10px] text-gray-600 w-20 text-right">{evaluationLoading ? "Analyzing…" : "Complete"}</div>
              </div>
              {/* Analysis cards */}
              <div className="p-4 space-y-4">
                {/* Win probability */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-blue-500/20 bg-blue-950/15 p-3">
                    <div className="text-[9px] text-blue-400/70 uppercase tracking-widest">Blue Win</div>
                    <div className="text-2xl font-black text-white mt-1">{evaluationDashboard.blueWinProbability}%</div>
                    <div className="mt-2 h-1 rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400" style={{ width: `${evaluationDashboard.blueWinProbability}%` }} />
                    </div>
                    <div className="text-[10px] text-blue-300 mt-1 truncate">{blueTeam}</div>
                  </div>
                  <div className="rounded-xl border border-red-500/20 bg-red-950/15 p-3">
                    <div className="text-[9px] text-red-400/70 uppercase tracking-widest">Red Win</div>
                    <div className="text-2xl font-black text-white mt-1">{evaluationDashboard.redWinProbability}%</div>
                    <div className="mt-2 h-1 rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-gradient-to-r from-red-600 to-rose-400" style={{ width: `${evaluationDashboard.redWinProbability}%` }} />
                    </div>
                    <div className="text-[10px] text-red-300 mt-1 truncate">{redTeam}</div>
                  </div>
                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                    <div className="text-[9px] text-gray-500 uppercase tracking-widest">Predicted Winner</div>
                    <div className={`text-sm font-black mt-1 ${evaluationDashboard.predictedWinner === "blue" ? "text-blue-300" : evaluationDashboard.predictedWinner === "red" ? "text-red-300" : "text-gray-300"}`}>
                      {evaluationDashboard.predictedWinner === "even" ? "Even Draft" : evaluationDashboard.predictedWinner === "blue" ? blueTeam : redTeam}
                    </div>
                    <div className="text-[10px] text-gray-600 mt-0.5">{evaluationDashboard.confidenceLabel} · {evaluationDashboard.confidence}%</div>
                  </div>
                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                    <div className="text-[9px] text-gray-500 uppercase tracking-widest">Lane Coverage</div>
                    <div className="mt-1.5 space-y-0.5">
                      <div className="text-[10px]">
                        <span className="text-blue-400">Blue: </span>
                        <span className={evaluationDashboard.teamPanels.blue.missingLanes.length ? "text-amber-400" : "text-emerald-400"}>
                          {evaluationDashboard.teamPanels.blue.missingLanes.length ? evaluationDashboard.teamPanels.blue.missingLanes.join(", ") : "Full ✓"}
                        </span>
                      </div>
                      <div className="text-[10px]">
                        <span className="text-red-400">Red: </span>
                        <span className={evaluationDashboard.teamPanels.red.missingLanes.length ? "text-amber-400" : "text-emerald-400"}>
                          {evaluationDashboard.teamPanels.red.missingLanes.length ? evaluationDashboard.teamPanels.red.missingLanes.join(", ") : "Full ✓"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Score breakdown */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-4">
                  <div className="text-[11px] font-bold text-gray-300 uppercase tracking-widest mb-3">Score Breakdown</div>
                  <div className="grid gap-2">
                    {Object.values(evaluationDashboard.scoreBreakdown).map((metric) => {
                      const total = Math.max(metric.blue, metric.red, 1);
                      return (
                        <div key={metric.label} className="flex items-center gap-2">
                          <div className="w-28 text-gray-500 truncate shrink-0 text-[11px]">{metric.label}</div>
                          <span className="text-blue-300 w-6 text-right shrink-0 text-[11px]">{metric.blue}</span>
                          <div className="flex-1 flex items-center h-2 gap-0.5">
                            <div className="flex-1 flex justify-end h-full">
                              <div className="h-full rounded-l-full bg-gradient-to-l from-blue-500 to-blue-700" style={{ width: `${(metric.blue / total) * 100}%` }} />
                            </div>
                            <div className="w-px h-3 bg-white/10" />
                            <div className="flex-1 h-full">
                              <div className="h-full rounded-r-full bg-gradient-to-r from-red-500 to-red-700" style={{ width: `${(metric.red / total) * 100}%` }} />
                            </div>
                          </div>
                          <span className="text-red-300 w-6 shrink-0 text-[11px]">{metric.red}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Lane matchups */}
                {evaluationDashboard.laneMatchups.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-gray-300 uppercase tracking-widest mb-3">Lane Matchups</div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      {evaluationDashboard.laneMatchups.map((lane) => (
                        <div key={lane.lane} className={`rounded-xl border p-3 ${lane.favoredSide === "blue" ? "border-blue-500/20 bg-blue-950/10" : lane.favoredSide === "red" ? "border-red-500/20 bg-red-950/10" : "border-white/[0.06] bg-white/[0.01]"}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider">{lane.lane}</div>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${lane.favoredSide === "blue" ? "bg-blue-900/40 text-blue-300" : lane.favoredSide === "red" ? "bg-red-900/40 text-red-300" : "bg-white/5 text-gray-400"}`}>
                              {lane.matchupScore}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex flex-col items-center gap-1">
                              <div className="h-11 w-11 aspect-square rounded-xl overflow-hidden border border-blue-900/40 bg-slate-950/70">
                                <FallbackImage src={getHeroImgUrl(lane.blueHero)} fallbackText={lane.blueHero} alt={lane.blueHero} className="block h-full w-full object-cover object-center" containerClassName="h-full w-full text-[6px]" />
                              </div>
                              <div className="text-[9px] text-blue-300 truncate max-w-[52px] text-center">{lane.blueHero}</div>
                            </div>
                            <span className="text-[10px] text-gray-600 font-bold">vs</span>
                            <div className="flex flex-col items-center gap-1">
                              <div className="h-11 w-11 aspect-square rounded-xl overflow-hidden border border-red-900/40 bg-slate-950/70">
                                <FallbackImage src={getHeroImgUrl(lane.redHero)} fallbackText={lane.redHero} alt={lane.redHero} className="block h-full w-full object-cover object-center" containerClassName="h-full w-full text-[6px]" />
                              </div>
                              <div className="text-[9px] text-red-300 truncate max-w-[52px] text-center">{lane.redHero}</div>
                            </div>
                          </div>
                          <div className="text-[10px] text-gray-500 mt-2 leading-relaxed line-clamp-2">{lane.reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key factors */}
                {evaluationDashboard.keyFactors.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-gray-300 uppercase tracking-widest mb-3">Key Factors</div>
                    <div className="flex flex-wrap gap-2">
                      {evaluationDashboard.keyFactors.slice(0, 8).map((f, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[12px] text-gray-300 px-3 py-2 rounded-lg border border-white/[0.07] bg-white/[0.02]">
                          <Zap className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risk warnings */}
                {(evaluationDashboard.risks.blue.length > 0 || evaluationDashboard.risks.red.length > 0) && (
                  <div>
                    <div className="text-[11px] font-bold text-gray-300 uppercase tracking-widest mb-3">Risk Warnings</div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        ...evaluationDashboard.risks.blue.map((r) => ({ side: "Blue", r })),
                        ...evaluationDashboard.risks.red.map((r) => ({ side: "Red", r })),
                      ].map((entry, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[12px] text-gray-300 px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-900/5 max-w-sm">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span><span className="font-bold text-white">{entry.side}:</span> {entry.r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Analyst Notes */}
                {(evaluationLoading || evaluationResult) && (
                  <div className="rounded-xl border border-emerald-500/15 bg-emerald-900/5 p-4">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-3">
                      <BookOpen className="h-4 w-4" />
                      Analyst Notes
                    </div>
                    {evaluationLoading ? (
                      <div className="flex items-center gap-2 text-sm text-emerald-300">
                        <Wand2 className="h-5 w-5 animate-pulse" />
                        Running final analysis…
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        {evaluationResult
                          .split("\n")
                          .map((line) => line.replace(/^[-*]\s*/, "").trim())
                          .filter(Boolean)
                          .slice(0, 5)
                          .map((line, index) => (
                            <div key={index} className="rounded-lg border border-emerald-500/10 bg-black/20 px-3 py-2 text-sm text-gray-200">
                              • {line}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
                {debugDraftAI && (
                  <div className="rounded-xl border border-fuchsia-500/15 bg-fuchsia-950/5 p-4">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-fuchsia-300 mb-3">Draft AI Debug</div>
                    <div className="grid gap-2 text-[11px] text-gray-300">
                      <div>Teams: {blueTeam || "-"} vs {redTeam || "-"}</div>
                      <div>Current Step: {currentStep?.label || "COMPLETED"}</div>
                      <div>Source: {aiResult?.debug?.recommendationSource || aiResult?.mplIntelligence?.recommendationSource || "local"}</div>
                      <div>Team Games: B {historicalContext?.teamProfiles?.blue?.totalGames || 0} / R {historicalContext?.teamProfiles?.red?.totalGames || 0}</div>
                      <div>Matchup Games: {historicalContext?.matchupProfile?.headToHeadGames || 0}</div>
                      <div>Local Intel Ready: {localIntelGeneratedAt ? "yes" : "no"}</div>
                      <div>AI Latency: {evaluationMeta?.latencyMs ?? "n/a"} ms</div>
                      <div>Cache Hit: {String(evaluationMeta?.cached ?? aiResult?.cached ?? false)}</div>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {[...(aiResult?.recommendations || []), ...draftRecommendations]
                        .slice(0, 10)
                        .map((rec: any, idx: number) => (
                          <div key={`${rec.heroName}-${idx}`} className="rounded-lg border border-white/8 bg-black/20 px-3 py-2 text-[11px]">
                            <div className="font-bold text-white">{rec.heroName} — {rec.totalScore ?? rec.score ?? 0}</div>
                            <div className="text-gray-400 break-all">{JSON.stringify(rec.scoreBreakdown || {})}</div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
