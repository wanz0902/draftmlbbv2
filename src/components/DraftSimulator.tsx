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
} from "lucide-react";
import { HeroStats } from "../types";
import { DraftMode, LaneStatus, DraftRecommendation, MplDraftRecommendation } from "../draft/draftTypes";
import { getHeroRole, getHeroImageUrl } from "../lib/heroUtils";
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

  // Lane status for both teams
  const [blueLaneStatus, setBlueLaneStatus] = useState<LaneStatus>({ gold: null, exp: null, mid: null, jungle: null, roam: null });
  const [redLaneStatus, setRedLaneStatus] = useState<LaneStatus>({ gold: null, exp: null, mid: null, jungle: null, roam: null });

  // Simulation settings
  const [selectedHeroName, setSelectedHeroName] = useState<string>("");
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
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

  const [soundEnabled, setSoundEnabled] = useState(true);

  // Final Evaluation
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<string>("");

  useEffect(() => {
    sounds.setEnabled(soundEnabled);
  }, [soundEnabled]);

  // Auto-fetch recommendations on each draft step change
  useEffect(() => {
    if (!draftStarted || isCompleted) return;

    const fetchRecommendations = async () => {
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
            setDraftRecommendations(data.recommendations.slice(0, 3));
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
  }, [currentStepIdx, draftStarted, draftMode, selectedBlueTeam, selectedRedTeam, blueTeam, redTeam, bluePicks, redPicks, blueBans, redBans]);

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

  // Reset Draft Function
  const handleReset = () => {
    setBlueBans([]);
    setRedBans([]);
    setBluePicks([]);
    setRedPicks([]);
    setCurrentStepIdx(0);
    setSelectedHeroName("");
    setTimerSeconds(30);
    setAiResult(null);
    setAiError("");
    setEvaluationResult("");
    setDraftStarted(false);
    setDraftMode(null);
    setSelectedBlueTeam("");
    setSelectedRedTeam("");
    setBlueLaneStatus({ gold: null, exp: null, mid: null, jungle: null, roam: null });
    setRedLaneStatus({ gold: null, exp: null, mid: null, jungle: null, roam: null });
    setDraftRecommendations([]);
  };

  // Start draft without resetting mode/team selection
  const handleStartDraft = () => {
    setBlueBans([]);
    setRedBans([]);
    setBluePicks([]);
    setRedPicks([]);
    setCurrentStepIdx(0);
    setSelectedHeroName("");
    setTimerSeconds(30);
    setAiResult(null);
    setAiError("");
    setEvaluationResult("");
    setDraftRecommendations([]);
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
    setTimerSeconds(30);
    setAiResult(null); // Clear recommendations for the next turn
  };

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

    setAiLoading(true);
    setAiError("");
    setAiResult(null);

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
      const response = await fetch(draftMode === "mpl" ? "/api/draft/recommendation" : "/api/draft/ai-recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        setAiResult({
          ...result,
          recommendations: filteredRecs,
          overallStrategy: draftMode === "mpl"
            ? `Local MPL engine aktif: rekomendasi memakai ${result.debug?.recommendationSource || result.mplIntelligence?.recommendationSource || "team-history"} untuk ${currentStep.side === "BLUE" ? blueTeam : redTeam}.`
            : result.overallStrategy,
        });
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
        .slice(0, 3);

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

  // Final Expert Evaluation — Wafer AI primary, Gemini fallback, local last resort
  const evaluateDraftGame = async () => {
    setEvaluationLoading(true);
    setEvaluationResult("");

    let waferStatus = "";

    try {
      // Try Wafer AI first (server-side proxy)
      const waferResponse = await fetch("/api/ai/draft-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      if (waferResponse.ok) {
        const waferResult = await waferResponse.json();
        if (waferResult.success && waferResult.analysis) {
          setEvaluationResult(waferResult.analysis);
          return; // Wafer AI succeeded
        }
        // Wafer returned success:false — check for credit/config issues
        const errMsg = waferResult.error || "";
        if (errMsg.includes("insufficient") || errMsg.includes("402") || errMsg.includes("credit")) {
          waferStatus = "> ⚠️ *Wafer AI: credit habis (insufficient credits). Menggunakan fallback.*\n\n";
        } else if (errMsg.includes("not configured") || errMsg.includes("YOUR_KEY")) {
          waferStatus = "> ⚠️ *Wafer AI: API key belum dikonfigurasi. Menggunakan fallback.*\n\n";
        } else {
          waferStatus = "> ⚠️ *Wafer AI tidak tersedia. Menggunakan analisis alternatif.*\n\n";
        }
      } else {
        waferStatus = "> ⚠️ *Wafer AI tidak tersedia. Menggunakan analisis alternatif.*\n\n";
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

      const result = await response.json();
      const analysis = result.analysis || "Tidak ada hasil draf analisis.";
      setEvaluationResult(waferStatus + analysis);
    } catch (err: any) {
      console.error("Evaluation fetch failed:", err);
      setEvaluationResult(waferStatus + generateLocalFallbackAnalysis());
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

  const sortedHeroesList = useMemo(() => {
    return heroes
      .filter((h) => {
        const matchesSearch = String(h.hero_name || "")
          .toLowerCase()
          .includes(String(searchQuery || "").toLowerCase());
        const role = getHeroRole(h.hero_name);
        const matchesRole = roleFilter === "ALL" || role === roleFilter;
        return matchesSearch && matchesRole;
      })
      .sort((a, b) =>
        String(a.hero_name || "").localeCompare(String(b.hero_name || "")),
      );
  }, [heroes, searchQuery, roleFilter]);

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

              {/* Mode Selection Cards */}
              <div className="flex gap-4 w-full mt-4 flex-col sm:flex-row items-stretch justify-center">
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
                      Simulasi draf ranked. Rekomendasi berbasis meta dan statistik hero.
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
                  Mulai Simulasi Draf
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
        </div>
      ) : (
        /* Active Draft Layout */
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
          {/* Main Draft Screen Panel */}
          <div className="xl:col-span-3 flex flex-col gap-5 rounded-2xl border border-gray-900 bg-gray-950 p-4 shadow-xl">
            {/* Top Stat/Timer Dashboard Info */}
            <div className="flex items-center justify-between border-b border-gray-900 pb-4">
              {/* Blue Team Label */}
              <div className="text-left overflow-hidden">
                <h3 className="font-semibold text-blue-400 text-sm tracking-wider uppercase truncate">
                  {blueTeam || "TIM BIRU (BLUE)"}
                </h3>
                <span className="font-mono text-xs text-gray-400">
                  First Pick Side
                </span>
              </div>

              {/* Realtime Turn Timer Indicator */}
              {!isCompleted ? (
                <div className="flex flex-col items-center justify-center bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-center min-w-[120px]">
                  <span
                    className={`font-mono text-2xl font-bold tracking-tight ${
                      timerSeconds <= 8
                        ? "text-rose-500 animate-pulse"
                        : "text-white"
                    }`}
                  >
                    00:{timerSeconds.toString().padStart(2, "0")}
                  </span>
                  <span
                    className={`font-mono text-[9px] font-bold tracking-widest uppercase mt-0.5 ${
                      currentStep.side === "BLUE"
                        ? "text-blue-400"
                        : "text-red-400"
                    }`}
                  >
                    {currentStep.side === "BLUE" ? blueTeam : redTeam} {currentStep.type} TURN
                  </span>
                </div>
              ) : (
                <div className="bg-emerald-900/20 border border-emerald-500/10 rounded-xl px-5 py-2 text-center">
                  <span className="font-mono text-xs font-bold text-emerald-400 block tracking-widest uppercase">
                    DRAFT COMPLETED
                  </span>
                </div>
              )}

              {/* Red Team Label */}
              <div className="text-right overflow-hidden">
                <h3 className="font-semibold text-red-400 text-sm tracking-wider uppercase truncate">
                  {redTeam || "TIM MERAH (RED)"}
                </h3>
                <span className="font-mono text-xs text-gray-400">
                  Second Pick Side
                </span>
              </div>
            </div>

            {/* Bans Bar */}
            <div className="grid grid-cols-2 gap-4 bg-gray-900/30 p-2.5 rounded-xl border border-gray-900">
              {/* Blue Bans */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-gray-500 uppercase font-semibold">
                  Bans:
                </span>
                <div className="flex gap-1.5 overflow-hidden">
                  {[0, 1, 2, 3, 4].map((i) => {
                    const bansHero = blueBans[i];
                    return (
                      <div
                        key={i}
                        className="relative h-8 w-8 rounded border border-rose-950 bg-gray-950 overflow-hidden flex items-center justify-center"
                      >
                        {bansHero ? (
                          <>
                            <FallbackImage src={getHeroImgUrl(bansHero)} fallbackText={bansHero} alt={bansHero} className="h-full w-full object-cover grayscale opacity-60" containerClassName="h-full w-full grayscale opacity-60 text-[8px]" />
                            <div className="absolute inset-0 border border-rose-500/30 rounded" />
                          </>
                        ) : (
                          <span className="text-[10px] text-gray-800 font-bold">
                            -
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Red Bans */}
              <div className="flex items-center gap-2 justify-end">
                <div className="flex gap-1.5 overflow-hidden">
                  {[0, 1, 2, 3, 4].map((i) => {
                    const bansHero = redBans[i];
                    return (
                      <div
                        key={i}
                        className="relative h-8 w-8 rounded border border-rose-950 bg-gray-950 overflow-hidden flex items-center justify-center"
                      >
                        {bansHero ? (
                          <>
                            <FallbackImage src={getHeroImgUrl(bansHero)} fallbackText={bansHero} alt={bansHero} className="h-full w-full object-cover grayscale opacity-60" containerClassName="h-full w-full grayscale opacity-60 text-[8px]" />
                            <div className="absolute inset-0 border border-rose-500/30 rounded" />
                          </>
                        ) : (
                          <span className="text-[10px] text-gray-800 font-bold">
                            -
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <span className="font-mono text-[9px] text-gray-500 uppercase font-semibold">
                  Bans:
                </span>
              </div>
            </div>

            {/* Lane Status Display */}
            <div className="grid grid-cols-2 gap-4 bg-gray-900/20 p-2 rounded-xl border border-gray-900/50">
              {draftMode === "mpl" && (
                <p className="col-span-2 text-[9px] text-gray-600 text-center italic mb-0">
                  Prediksi lane assignment — bukan urutan pick wajib
                </p>
              )}
              {/* Blue Lane Status */}
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[9px] text-gray-500 uppercase font-semibold shrink-0">
                  {draftMode === "mpl" ? "PREDICTED" : "BLUE LANES"}
                </span>
                <div className="flex gap-1 overflow-hidden">
                  {(["gold", "exp", "mid", "jungle", "roam"] as const).map((lane) => {
                    const heroName = blueLaneStatus[lane];
                    const laneLabels = { gold: "Gold", exp: "EXP", mid: "Mid", jungle: "Jgl", roam: "Roam" };
                    const showWarning = !heroName && bluePicks.length >= 3;
                    return (
                      <div
                        key={lane}
                        className={`flex flex-col items-center rounded px-1 py-0.5 min-w-[36px] border ${
                          heroName
                            ? "border-blue-800/50 bg-blue-950/20"
                            : showWarning
                              ? "border-amber-500/50 bg-amber-950/10"
                              : "border-gray-800/50 bg-gray-950/30"
                        }`}
                        title={heroName ? `${laneLabels[lane]}: ${heroName}` : `${laneLabels[lane]}: Kosong`}
                      >
                        {heroName ? (
                          <div className="h-5 w-5 rounded overflow-hidden">
                            <FallbackImage
                              src={getHeroImgUrl(heroName)}
                              fallbackText={heroName}
                              alt={heroName}
                              className="h-full w-full object-cover"
                              containerClassName="h-full w-full text-[6px]"
                            />
                          </div>
                        ) : (
                          <div className={`h-5 w-5 rounded flex items-center justify-center ${
                            showWarning ? "text-amber-500" : "text-gray-700"
                          }`}>
                            <span className="text-[8px] font-bold">—</span>
                          </div>
                        )}
                        <span className={`text-[7px] font-bold mt-0.5 uppercase tracking-tight ${
                          heroName
                            ? "text-blue-400"
                            : showWarning
                              ? "text-amber-400"
                              : "text-gray-600"
                        }`}>
                          {laneLabels[lane]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Red Lane Status */}
              <div className="flex items-center gap-1.5 justify-end">
                <div className="flex gap-1 overflow-hidden">
                  {(["gold", "exp", "mid", "jungle", "roam"] as const).map((lane) => {
                    const heroName = redLaneStatus[lane];
                    const laneLabels = { gold: "Gold", exp: "EXP", mid: "Mid", jungle: "Jgl", roam: "Roam" };
                    const showWarning = !heroName && redPicks.length >= 3;
                    return (
                      <div
                        key={lane}
                        className={`flex flex-col items-center rounded px-1 py-0.5 min-w-[36px] border ${
                          heroName
                            ? "border-red-800/50 bg-red-950/20"
                            : showWarning
                              ? "border-amber-500/50 bg-amber-950/10"
                              : "border-gray-800/50 bg-gray-950/30"
                        }`}
                        title={heroName ? `${laneLabels[lane]}: ${heroName}` : `${laneLabels[lane]}: Kosong`}
                      >
                        {heroName ? (
                          <div className="h-5 w-5 rounded overflow-hidden">
                            <FallbackImage
                              src={getHeroImgUrl(heroName)}
                              fallbackText={heroName}
                              alt={heroName}
                              className="h-full w-full object-cover"
                              containerClassName="h-full w-full text-[6px]"
                            />
                          </div>
                        ) : (
                          <div className={`h-5 w-5 rounded flex items-center justify-center ${
                            showWarning ? "text-amber-500" : "text-gray-700"
                          }`}>
                            <span className="text-[8px] font-bold">—</span>
                          </div>
                        )}
                        <span className={`text-[7px] font-bold mt-0.5 uppercase tracking-tight ${
                          heroName
                            ? "text-red-400"
                            : showWarning
                              ? "text-amber-400"
                              : "text-gray-600"
                        }`}>
                          {laneLabels[lane]}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <span className="font-mono text-[9px] text-gray-500 uppercase font-semibold shrink-0">
                  {draftMode === "mpl" ? "PREDICTED" : "RED LANES"}
                </span>
              </div>
            </div>

            {/* Picks Layout Grid */}
            <div className="grid grid-cols-2 gap-2 sm:gap-6 bg-gray-900/10 rounded-2xl p-2 sm:p-4 border border-gray-900/60 flex-1 min-h-[280px]">
              {/* Blue Picks List */}
              <div className="flex flex-col gap-2 sm:gap-3">
                {[0, 1, 2, 3, 4].map((i) => {
                  const pickHero = bluePicks[i];
                  const activePick =
                    !isCompleted &&
                    currentStep.side === "BLUE" &&
                    currentStep.type === "PICK" &&
                    bluePicks.length === i;
                  return (
                    <div
                      key={i}
                      className={`relative flex items-center gap-2 sm:gap-3.5 rounded-xl border p-1.5 sm:p-2 bg-gray-950/70 ${
                        activePick
                          ? "border-blue-500 ring-1 ring-blue-500/30 bg-blue-950/5"
                          : pickHero
                            ? "border-gray-850"
                            : "border-gray-900 opacity-30"
                      }`}
                    >
                      <div className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-gray-900 border border-gray-850 overflow-hidden shrink-0">
                        {pickHero ? (
                          <FallbackImage src={getHeroImgUrl(pickHero)} fallbackText={pickHero} alt={pickHero} className="h-full w-full object-cover" containerClassName="h-full w-full text-[10px]" />
                        ) : activePick ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-blue-950/35">
                            <span className="animate-pulse font-bold text-xs text-blue-400">
                              PICK
                            </span>
                          </div>
                        ) : null}
                      </div>
                      <div className="overflow-hidden">
                        <div className="font-sans text-sm font-bold text-white truncate">
                          {pickHero ||
                            (activePick ? "Memilih..." : `Slot Pick ${i + 1}`)}
                        </div>
                        <div className="font-mono text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">
                          {pickHero ? getHeroRole(pickHero) : "Kosong"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Red Picks List */}
              <div className="flex flex-col gap-2 sm:gap-3">
                {[0, 1, 2, 3, 4].map((i) => {
                  const pickHero = redPicks[i];
                  const activePick =
                    !isCompleted &&
                    currentStep.side === "RED" &&
                    currentStep.type === "PICK" &&
                    redPicks.length === i;
                  return (
                    <div
                      key={i}
                      className={`relative flex items-center gap-2 sm:gap-3.5 rounded-xl border p-1.5 sm:p-2 bg-gray-950/70 flex-row-reverse text-right ${
                        activePick
                          ? "border-red-500 ring-1 ring-red-500/30 bg-red-950/5"
                          : pickHero
                            ? "border-gray-850"
                            : "border-gray-900 opacity-30"
                      }`}
                    >
                      <div className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-gray-900 border border-gray-850 overflow-hidden shrink-0">
                        {pickHero ? (
                          <FallbackImage src={getHeroImgUrl(pickHero)} fallbackText={pickHero} alt={pickHero} className="h-full w-full object-cover" containerClassName="h-full w-full text-[10px]" />
                        ) : activePick ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-red-950/35">
                            <span className="animate-pulse font-bold text-xs text-red-400">
                              PICK
                            </span>
                          </div>
                        ) : null}
                      </div>
                      <div className="overflow-hidden">
                        <div className="font-sans text-sm font-bold text-white truncate">
                          {pickHero ||
                            (activePick ? "Memilih..." : `Slot Pick ${i + 1}`)}
                        </div>
                        <div className="font-mono text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">
                          {pickHero ? getHeroRole(pickHero) : "Kosong"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Turn Guidance and Controls */}
            {!isCompleted ? (
              <div className="rounded-xl border border-dashed border-gray-800 bg-gray-950 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-inner">
                <div>
                  <span className="font-mono text-[9px] text-gray-550 block uppercase tracking-wider mb-0.5">
                    Langkah Draf {currentStepIdx + 1}/20
                  </span>
                  <div className="font-sans text-sm font-bold text-gray-300 flex items-center gap-1.5">
                    <span
                      className={
                        currentStep.side === "BLUE"
                          ? "text-blue-400"
                          : "text-red-400"
                      }
                    >
                      {currentStep.side === "BLUE" ? "Tim Biru" : "Tim Merah"}
                    </span>
                    <span>seharusnya melakukan</span>
                    <span className="text-gray-100 uppercase">
                      {currentStep.type === "BAN" ? "Ban Hero" : "Pick Hero"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <button
                    onClick={fetchAICoach}
                    disabled={aiLoading}
                    className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold border border-indigo-500/20 bg-indigo-900/10 text-indigo-400 hover:bg-indigo-900/20 transition disabled:opacity-50"
                  >
                    <Sparkles className="h-4 w-4" />
                    AI Coach Rekomendasi
                  </button>

                  <button
                    onClick={() => handleLockHero(selectedHeroName)}
                    disabled={!selectedHeroName}
                    className={`rounded-lg px-5 py-2 text-xs font-bold transition shadow-sm uppercase shrink-0 ${
                      selectedHeroName
                        ? "bg-indigo-600 hover:bg-indigo-505 text-white cursor-pointer"
                        : "bg-gray-900 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    Konfirmasi Lock
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-emerald-950 bg-emerald-950/5 p-5 flex flex-col gap-4 shadow-inner animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h4 className="font-sans text-md font-bold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                      Draf MPL Berhasil Diselesaikan!
                    </h4>
                    <p className="text-xs text-gray-400 leading-relaxed mt-1">
                      Kedua draf lineup telah berhasil dikonfirmasi. Gunakan
                      asisten Gemini untuk mengevaluasi kekuatan komposisi draf
                      final!
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={evaluateDraftGame}
                      disabled={evaluationLoading}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-bold uppercase tracking-wider transition disabled:opacity-50 cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {evaluationLoading
                        ? "Mengevaluasi..."
                        : "Analisis Draf (AI)"}
                    </button>
                    {user && (
                      <button
                        onClick={handleSaveDraft}
                        disabled={isSaving || saveSuccess}
                        className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 text-xs font-bold uppercase tracking-wider transition disabled:opacity-50 cursor-pointer"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {saveSuccess
                          ? "Disimpan!"
                          : isSaving
                            ? "Menyimpan..."
                            : "Simpan Draf"}
                      </button>
                    )}
                    <button
                      onClick={handleReset}
                      className="flex items-center gap-1.5 rounded-lg px-4 py-2 border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-900 text-xs font-semibold uppercase tracking-wider transition cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Setel Ulang Draf
                    </button>
                    <button
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className={`flex items-center justify-center p-2 rounded-lg border transition cursor-pointer ${
                        soundEnabled 
                          ? "bg-indigo-900/30 border-indigo-500/50 text-indigo-400" 
                          : "bg-gray-900 border-gray-800 text-gray-500"
                      }`}
                      title="Toggle Sound Effects"
                    >
                      {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Evaluation State / Result */}
                {evaluationLoading && (
                  <div className="flex flex-col items-center justify-center py-10 gap-6 border-t border-gray-900 mt-2">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="absolute inset-0 border-t-2 border-emerald-500 rounded-full animate-spin h-8 w-8"></div>
                        <Wand2 className="h-8 w-8 text-emerald-400 p-1.5 animate-pulse" />
                      </div>
                      <div className="font-bold text-sm text-emerald-200 animate-pulse">
                        Gemini sedang menganalisis draf...
                      </div>
                    </div>

                    {/* Skeleton Text Blocks */}
                    <div className="w-full max-w-2xl space-y-4">
                      {/* Section 1 */}
                      <div className="space-y-2.5">
                        <div className="h-4 w-1/4 bg-gray-800 rounded animate-pulse"></div>
                        <div className="h-2.5 w-full bg-gray-900 rounded animate-pulse"></div>
                        <div className="h-2.5 w-full bg-gray-900 rounded animate-pulse"></div>
                        <div className="h-2.5 w-5/6 bg-gray-900 rounded animate-pulse"></div>
                      </div>
                      {/* Section 2 */}
                      <div className="space-y-2.5 pt-2">
                        <div className="h-4 w-1/3 bg-gray-800 rounded animate-pulse"></div>
                        <div className="h-2.5 w-full bg-gray-900 rounded animate-pulse"></div>
                        <div className="h-2.5 w-4/5 bg-gray-900 rounded animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                )}

                {evaluationResult && !evaluationLoading && (
                  <div className="border-t border-gray-900 pt-4 mt-2">
                    <div className="rounded-xl border border-blue-900/30 bg-[#0a111f]/60 p-5 shadow-inner">
                      <div className="flex items-center gap-2 mb-3.5 text-blue-400 font-bold text-xs uppercase tracking-widest border-b border-blue-900/20 pb-2">
                        <BookOpen className="h-4 w-4" />
                        Analisis Pasca-Draf oleh Gemini Coach
                      </div>
                      <div className="prose prose-invert prose-xs text-gray-300 max-w-none leading-relaxed text-xs">
                        <div className="markdown-body">
                          <ReactMarkdown>{evaluationResult}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Selection Grid inside Draft */}
            {!isCompleted && (
              <div className="border-t border-gray-900 pt-4 flex flex-col gap-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* Selector Header */}
                  <h4 className="font-sans text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    Pilih Hero Untuk di-
                    {currentStep.type === "BAN" ? "Ban" : "Pick"}:
                  </h4>

                  {/* Filter inputs */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Cari hero..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="rounded-lg border border-gray-800 bg-gray-900 px-3 py-1 text-xs text-gray-200 outline-none w-36 sm:w-48"
                    />

                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="rounded-lg border border-gray-800 bg-gray-900 px-2 py-1 text-xs text-gray-300 outline-none"
                    >
                      <option value="ALL">Semua Role</option>
                      <option value="Assassin">Assassin</option>
                      <option value="Fighter">Fighter</option>
                      <option value="Mage">Mage</option>
                      <option value="Marksman">Marksman</option>
                      <option value="Tank">Tank</option>
                      <option value="Support">Support</option>
                    </select>
                  </div>
                </div>

                {/* Hero Options */}
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 h-[260px] sm:h-[320px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                  {sortedHeroesList.map((hero) => {
                    const isUsed = usedHeroesMap.has(normalizeHeroKey(hero.hero_name));
                    const isSelected = selectedHeroName === hero.hero_name;
                    return (
                      <button
                        key={hero.hero_name}
                        disabled={isUsed}
                        onClick={() => handleSelectHero(hero.hero_name)}
                        className={`group relative flex flex-col items-center rounded-lg border p-1.5 text-center transition ${
                          isUsed
                            ? "border-gray-900/30 opacity-20 cursor-not-allowed bg-black/10"
                            : isSelected
                              ? "border-indigo-500 bg-indigo-950/30 scale-105 shadow-md shadow-indigo-500/5 font-semibold"
                              : "border-gray-900 bg-gray-900/40 hover:border-gray-700 hover:bg-gray-800"
                        }`}
                      >
                        <FallbackImage
                          src={getHeroImgUrl(hero.hero_name)}
                          fallbackText={hero.hero_name}
                          alt={hero.hero_name}
                          className="h-10 w-10 sm:h-12 sm:w-12 rounded-md object-cover bg-gray-950 p-0.5 border border-gray-800"
                          containerClassName="h-10 w-10 sm:h-12 sm:w-12 rounded-md text-[10px]"
                        />
                        <span className="font-sans text-[9px] sm:text-[10px] text-gray-300 mt-1 line-clamp-1 w-full truncate">
                          {hero.hero_name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* AI Coach sidebar panel */}
          <div className="flex flex-col gap-4 rounded-2xl border border-gray-900 bg-gray-950 p-4 shadow-xl">
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-gray-900 pb-3">
              <Sparkles className="h-5 w-5 text-indigo-400 shrink-0" />
              <div>
                <h3 className="font-sans text-md font-bold text-white tracking-tight">
                  Gemini Coach Analyst
                </h3>
                <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-0.5">
                  Indonesian MLBB Strategist
                </p>
              </div>
            </div>

            {/* AI Coach Suggestion State Views */}
            {aiLoading ? (
              <div className="py-6 space-y-6">
                <div className="flex items-center gap-3 justify-center mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 border-t-2 border-indigo-500 rounded-full animate-spin h-8 w-8"></div>
                    <Wand2 className="h-8 w-8 text-indigo-400 p-1.5 animate-pulse" />
                  </div>
                  <div className="font-bold text-sm text-indigo-200 animate-pulse">
                    {aiLoadingText}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="h-3 w-1/3 bg-gray-800 rounded animate-pulse"></div>
                  <div className="h-3 w-full bg-gray-800 rounded animate-pulse"></div>
                  <div className="h-3 w-4/5 bg-gray-800 rounded animate-pulse"></div>
                </div>

                <div className="grid gap-3 pt-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="rounded-lg bg-gray-900/30 border border-gray-800 p-3 flex gap-4 animate-pulse"
                    >
                      <div className="h-12 w-12 rounded-lg bg-gray-800 shrink-0"></div>
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-3 w-1/4 bg-gray-800 rounded"></div>
                        <div className="h-2.5 w-full bg-gray-800/80 rounded"></div>
                        <div className="h-2.5 w-2/3 bg-gray-800/80 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : aiError ? (
              <div className="rounded-lg bg-orange-950/20 border border-orange-900/40 p-4 text-center mt-2 flex flex-col items-center gap-3">
                <ShieldAlert className="h-8 w-8 text-orange-400" />
                <div>
                  <div className="text-sm font-bold text-orange-300 mb-1">
                    AI Analysis Unavailable
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed font-sans">
                    {aiError}
                  </p>
                </div>
                <button
                  onClick={fetchAICoach}
                  className="mt-2 text-xs px-4 py-2 bg-gray-900 hover:bg-gray-800 text-gray-300 rounded border border-gray-700 transition"
                >
                  Retry Analysis
                </button>
              </div>
            ) : aiResult ? (
              /* Success Result display */
              <div className="flex flex-col gap-4 scrollbar-none overflow-y-visible xl:overflow-y-auto max-h-none xl:max-h-[620px]">
                {/* Overall Strategy */}
                <div className="rounded-lg bg-indigo-900/10 border border-indigo-500/10 p-3 flex flex-col gap-1.5 shadow-inner">
                  <h4 className="font-mono text-[9px] text-indigo-400 font-bold uppercase tracking-wider">
                    Saran Strategi Draf Pelatih:
                  </h4>
                  <p className="text-xs text-gray-300 leading-relaxed font-sans">
                    {aiResult.overallStrategy}
                  </p>
                </div>

                {/* Hero list block */}
                <div className="flex flex-col gap-2.5">
                  <h4 className="font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-0.5 font-bold">
                    Rekomendasi Hero Terkuat ({currentStep?.type || "ACTION"}):
                  </h4>

                  {aiResult.recommendations?.map((rec, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        // Directly select this hero in the draft picker if available
                        const available = heroes.some(
                          (h) =>
                            String(h.hero_name || "").toLowerCase() ===
                              String(rec.heroName || "").toLowerCase() &&
                            !usedHeroesMap.has(normalizeHeroKey(h.hero_name)),
                        );
                        if (available) {
                          handleSelectHero(rec.heroName);
                        } else {
                          alert(
                            `Hero ${rec.heroName} sudah digunakan atau tidak ada dalam data lokal.`,
                          );
                        }
                      }}
                      className="group flex flex-col gap-2 rounded-xl border border-gray-900 bg-gray-900/30 p-3 hover:border-indigo-505 hover:bg-indigo-950/10 text-left transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <FallbackImage
                          src={getHeroImgUrl(rec.heroName)}
                          fallbackText={rec.heroName}
                          alt={rec.heroName}
                          className="h-8 w-8 rounded bg-gray-950 border border-gray-800 object-cover"
                          containerClassName="h-8 w-8 rounded text-[8px] bg-gray-950 border border-gray-800"
                        />
                        <div>
                          <div className="font-sans text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">
                            {rec.heroName}
                          </div>
                          <span className="font-mono text-[9px] text-gray-500 uppercase font-semibold">
                            {rec.pickType || rec.banType || rec.role || "Adaptive"}
                          </span>
                        </div>
                      </div>

                      {(rec.evidence?.source || rec.evidence?.team) && (
                        <div className="grid gap-1 rounded-lg border border-gray-800/70 bg-gray-950/60 p-2 text-[9px] font-mono text-gray-400">
                          <div>
                            <span className="text-indigo-300">Source:</span>{" "}
                            {rec.evidence?.source || "Team History"}
                          </div>
                          {rec.evidence?.team && (
                            <div>
                              <span className="text-indigo-300">Team:</span>{" "}
                              {rec.evidence.team}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-x-3 gap-y-1">
                            {typeof rec.evidence?.pickCount === "number" && (
                              <span>Pick: {rec.evidence.pickCount}</span>
                            )}
                            {typeof rec.evidence?.banCount === "number" && (
                              <span>Ban: {rec.evidence.banCount}</span>
                            )}
                            {typeof rec.evidence?.winRate === "number" && (
                              <span>WR: {rec.evidence.winRate.toFixed(0)}%</span>
                            )}
                          </div>
                        </div>
                      )}

                      <p className="text-[11px] text-gray-400 leading-relaxed font-sans pl-1 border-l border-indigo-500/20">
                        {rec.reason}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Auto-Recommendation Panel (replaces idle state) */
              <div className="flex flex-col gap-3 scrollbar-none overflow-y-visible xl:overflow-y-auto max-h-none xl:max-h-[620px]">
                {recsLoading ? (
                  /* Loading skeleton for auto-recommendations */
                  <div className="py-4 space-y-3">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="h-4 w-4 border-t-2 border-indigo-500 rounded-full animate-spin" />
                      <span className="text-xs text-gray-400 animate-pulse">Menganalisis rekomendasi...</span>
                    </div>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="rounded-lg bg-gray-900/30 border border-gray-800 p-3 flex gap-3 animate-pulse">
                        <div className="h-10 w-10 rounded-lg bg-gray-800 shrink-0"></div>
                        <div className="flex-1 space-y-2 py-0.5">
                          <div className="h-3 w-1/3 bg-gray-800 rounded"></div>
                          <div className="h-2 w-full bg-gray-800/60 rounded"></div>
                          <div className="h-2 w-2/3 bg-gray-800/60 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : draftRecommendations.length > 0 ? (
                  /* Recommendation Cards */
                  <>
                    <h4 className="font-mono text-[9px] text-indigo-400 uppercase tracking-wider font-bold">
                      Auto Rekomendasi ({currentStep?.type || "ACTION"}):
                    </h4>
                    {draftRecommendations.map((rec, i) => {
                      const topFactors = Object.entries(rec.scoreBreakdown)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 3);
                      const factorLabels: Record<string, string> = {
                        laneFit: "Lane",
                        roleBalance: "Role",
                        counter: "Counter",
                        synergy: "Synergy",
                        meta: "Meta",
                        draftPhase: "Phase",
                        denyPick: "Deny",
                        flexValue: "Flex",
                        teamHistory: "Team",
                        headToHead: "H2H",
                        draftPattern: "Pattern",
                        teamComfort: "Comfort",
                        teamDeny: "Deny",
                        availability: "Avail",
                      };
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            if (usedHeroesMap.has(normalizeHeroKey(rec.heroName))) {
                              alert(`Hero ${rec.heroName} sudah digunakan atau diban.`);
                              return;
                            }
                            handleSelectHero(rec.heroName);
                          }}
                          className="group flex flex-col gap-2 rounded-xl border border-gray-900 bg-gray-900/30 p-3 hover:border-indigo-500/50 hover:bg-indigo-950/10 text-left transition"
                        >
                          {/* Hero info row */}
                          <div className="flex items-center gap-2.5 w-full">
                            <FallbackImage
                              src={getHeroImgUrl(rec.heroName)}
                              fallbackText={rec.heroName}
                              alt={rec.heroName}
                              className="h-10 w-10 rounded-lg bg-gray-950 border border-gray-800 object-cover"
                              containerClassName="h-10 w-10 rounded-lg text-[8px] bg-gray-950 border border-gray-800"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-sans text-xs font-bold text-white group-hover:text-indigo-400 transition-colors truncate">
                                {rec.heroName}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-emerald-900/30 text-emerald-400 border border-emerald-800/30">
                                  {rec.lane}
                                </span>
                                <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-purple-900/30 text-purple-400 border border-purple-800/30">
                                  {rec.role}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Total Score Bar */}
                          <div className="w-full">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[9px] text-gray-500 font-mono font-bold">Score</span>
                              <span className="text-[9px] text-indigo-400 font-mono font-bold">{rec.totalScore}/100</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all"
                                style={{ width: `${Math.min(rec.totalScore, 100)}%` }}
                              />
                            </div>
                          </div>

                          {/* Top 3 Score Factors */}
                          <div className="flex items-center gap-2 text-[9px] text-gray-500 font-mono">
                            {topFactors.map(([key, val]) => (
                              <span key={key} className="whitespace-nowrap">
                                <span className="text-gray-400">{factorLabels[key] || key}:</span>{" "}
                                <span className="text-indigo-300">{val}</span>
                              </span>
                            ))}
                          </div>

                          {/* Reason */}
                          {(rec as any).evidence?.source && (
                            <div className="grid gap-1 rounded-lg border border-gray-800/70 bg-gray-950/50 p-2 text-[9px] font-mono text-gray-400">
                              <div>
                                <span className="text-indigo-300">Source:</span>{" "}
                                {(rec as any).evidence.source}
                              </div>
                              {(rec as any).evidence.team && (
                                <div>
                                  <span className="text-indigo-300">Team:</span>{" "}
                                  {(rec as any).evidence.team}
                                </div>
                              )}
                              <div className="flex flex-wrap gap-x-3 gap-y-1">
                                {typeof (rec as any).evidence.pickCount === "number" && (
                                  <span>Pick: {(rec as any).evidence.pickCount}</span>
                                )}
                                {typeof (rec as any).evidence.banCount === "number" && (
                                  <span>Ban: {(rec as any).evidence.banCount}</span>
                                )}
                                {typeof (rec as any).evidence.winRate === "number" && (
                                  <span>WR: {(rec as any).evidence.winRate.toFixed(0)}%</span>
                                )}
                              </div>
                            </div>
                          )}
                          <p className="text-[10px] text-gray-400 leading-relaxed font-sans pl-1 border-l-2 border-indigo-500/20">
                            {rec.reason}
                          </p>
                        </button>
                      );
                    })}

                    {/* Secondary manual AI Coach button */}
                    <div className="border-t border-gray-900 pt-3 mt-1">
                      <button
                        onClick={fetchAICoach}
                        disabled={aiLoading}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-bold border border-gray-800 bg-gray-900/50 text-gray-400 hover:text-indigo-400 hover:border-indigo-500/30 hover:bg-indigo-950/10 transition disabled:opacity-50"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Analisis Mendalam (AI Coach)
                      </button>
                    </div>
                  </>
                ) : (
                  /* Fallback idle if no recommendations available */
                  <div className="flex flex-col items-center justify-center text-center py-12 text-gray-600 gap-2">
                    <HelpCircle className="h-8 w-8 mb-1 opacity-20" />
                    <h4 className="font-sans text-xs font-semibold text-white">
                      Menunggu Rekomendasi
                    </h4>
                    <p className="text-[11px] text-gray-500 leading-relaxed max-w-[200px]">
                      Rekomendasi otomatis akan muncul saat draf berlangsung.
                    </p>
                    <button
                      onClick={fetchAICoach}
                      disabled={aiLoading}
                      className="mt-2 flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-bold border border-gray-800 bg-gray-900/50 text-gray-400 hover:text-indigo-400 hover:border-indigo-500/30 transition disabled:opacity-50"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      AI Coach Rekomendasi
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
