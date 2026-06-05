import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Award,
  Zap,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Gamepad2,
  Flame,
  Layers,
  LineChart,
  Sparkles,
  Trophy,
  CalendarDays,
  RotateCcw,
} from "lucide-react";
import { TeamStats, Match } from "../types";
import FallbackImage from "./FallbackImage";
import { getHeroImageUrl } from "../lib/heroUtils";
import useTeamMatchHistory from "../hooks/useTeamMatchHistory";
import type { MatchHistoryFilters } from "../hooks/useTeamMatchHistory";
import MatchSeriesCard from "./MatchSeriesCard";

interface TeamAnalyticsProps {
  teamsData: TeamStats[];
  heroAssets: Record<string, string>;
  heroes?: any[]; // Keep compatible with parent props
}

interface MatchCenterStanding {
  rank: number;
  team: string;
  wins: number;
  losses: number;
  gameWins: number;
  gameLosses: number;
  gameDiff: number;
  winrate: number;
  record: string;
  gameRecord: string;
}

interface MatchCenterData {
  source: string;
  totalSeries: number;
  totalGames: number;
  standings: MatchCenterStanding[];
  weeks: Array<{
    week: number;
    days: Array<{
      day: number;
      series: any[];
    }>;
  }>;
}

// Helpers
export function normalizeTeamName(name: string): string {
  if (!name) return "UNKNOWN";
  const lower = name.toLowerCase().trim();
  if (lower.includes("onic")) return "ONIC";
  if (
    lower.includes("team liquid id") ||
    lower.includes("liquid") ||
    lower.includes("tlid")
  )
    return "TLID";
  if (lower.includes("dewa united") || lower.includes("dewa")) return "DEWA";
  if (lower.includes("bigetron") || lower.includes("btr")) return "BTR";
  if (lower.includes("evos")) return "EVOS";
  if (lower.includes("geek fam") || lower.includes("geek")) return "GEEK";
  if (lower.includes("alter ego") || lower.includes("ae")) return "AE";
  if (lower.includes("natus vincere") || lower.includes("navi")) return "NAVI";
  if (lower.includes("rrq") || lower.includes("rex regum")) return "RRQ";
  return name.trim().toUpperCase();
}

export default function TeamAnalytics({
  teamsData,
  heroAssets,
}: TeamAnalyticsProps) {
  const [selectedTeam, setSelectedTeam] = useState<TeamStats | null>(null);
  const [searchTeam, setSearchTeam] = useState<string>("");
  const [teamTab, setTeamTab] = useState<"profile" | "history" | "trends">("profile");

  // Dynamic API Matches States
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState<boolean>(true);

  // Match History filters using new API
  const [matchResultFilter, setMatchResultFilter] = useState<"all" | "win" | "lose">("all");
  const [matchOpponentFilter, setMatchOpponentFilter] = useState<string>("");
  const [matchWeekFilter, setMatchWeekFilter] = useState<number | null>(null);
  const [matchCenterData, setMatchCenterData] = useState<MatchCenterData | null>(null);

  const matchFilters: MatchHistoryFilters = useMemo(() => ({
    result: matchResultFilter,
    opponent: matchOpponentFilter || undefined,
    week: matchWeekFilter || undefined,
  }), [matchResultFilter, matchOpponentFilter, matchWeekFilter]);

  const { data: matchHistoryData, loading: loadingMatchHistory, error: matchHistoryError } = useTeamMatchHistory(
    selectedTeam?.key || null,
    matchFilters
  );

  const fallbackLogo = "/raw-assets/regular_season_files/36px-Id_hd.png";

  // Load matches for profile tab stats (uses regular_matches.json only — 72 series source)
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setLoadingMatches(true);
        const [matchesRes, centerRes] = await Promise.all([
          fetch("/api/matches"),
          fetch("/api/mpl/match-center"),
        ]);
        const regularData = matchesRes.ok ? await matchesRes.json() : [];
        const centerData = centerRes.ok ? await centerRes.json() : null;
        setMatches(Array.isArray(regularData) ? regularData : []);
        setMatchCenterData(centerData?.ok ? centerData : null);
      } catch (err) {
        console.error("Failed to load match data:", err);
      } finally {
        setLoadingMatches(false);
      }
    };

    fetchMatches();
  }, []);

  // Sync default selected team
  useEffect(() => {
    if (teamsData.length > 0 && !selectedTeam) {
      setSelectedTeam(teamsData[0]);
    }
  }, [teamsData, selectedTeam]);

  // Map any team key to its dynamic logo from teamsData
  const getTeamLogoImg = (teamKey: string) => {
    const normKey = normalizeTeamName(teamKey);
    const found = teamsData.find(t => normalizeTeamName(t.key) === normKey);
    return found?.logo || fallbackLogo;
  };
  
  const getTeamLogoStyle = (teamKey: string) => {
    return undefined;
  };

  // Helper to fetch Hero Img URLs
  const getHeroImg = (heroName: string) => {
    return getHeroImageUrl(heroName, heroAssets);
  };

  const selectedStanding = useMemo(() => {
    if (!selectedTeam || !matchCenterData) return null;
    return matchCenterData.standings.find((standing) => standing.team === selectedTeam.key) || null;
  }, [matchCenterData, selectedTeam]);

  const visibleWeekGroups = useMemo(() => {
    if (!matchCenterData) return [];
    if (matchWeekFilter) {
      return matchCenterData.weeks.filter((week) => week.week === matchWeekFilter);
    }
    return matchCenterData.weeks;
  }, [matchCenterData, matchWeekFilter]);

  const resetMatchFilters = () => {
    setMatchResultFilter("all");
    setMatchOpponentFilter("");
    setMatchWeekFilter(null);
  };

  // Filtered Teams based on Search input
  const filteredTeams = useMemo(() => {
    return teamsData.filter((t) => {
      const matchName = t.name.toLowerCase().includes(searchTeam.toLowerCase());
      const matchKey = t.key.toLowerCase().includes(searchTeam.toLowerCase());
      return matchName || matchKey;
    });
  }, [teamsData, searchTeam]);

  // Matches played specifically by the selected team
  const teamMatches = useMemo(() => {
    if (!selectedTeam) return [];
    const tKey = selectedTeam.key.toLowerCase();
    return matches.filter((m) => {
      const bTeam = normalizeTeamName(m.blueTeam).toLowerCase();
      const rTeam = normalizeTeamName(m.redTeam).toLowerCase();
      return bTeam === tKey || rTeam === tKey;
    });
  }, [matches, selectedTeam]);

  // Dynamic calculated stats for the selected team
  const dynamicStats = useMemo(() => {
    let blueGames = 0;
    let blueWins = 0;
    let redGames = 0;
    let redWins = 0;
    
    const heroCounts: Record<string, { picks: number; wins: number }> = {};
    const bannedAgainstCounts: Record<string, number> = {};
    const ourBanCounts: Record<string, number> = {};

    if (!selectedTeam) {
      return { blueGames, blueWins, redGames, redWins, heroCounts, bannedAgainstCounts, ourBanCounts };
    }

    const targetKey = selectedTeam.key.toLowerCase();

    teamMatches.forEach((m) => {
      const mBlue = normalizeTeamName(m.blueTeam).toLowerCase();
      
      (m.games || []).forEach((g) => {
        const isBlue = normalizeTeamName(g.blueTeam?.name || m.blueTeam).toLowerCase() === targetKey;
        const winnerKey = normalizeTeamName(g.winner).toLowerCase();
        const teamWon = winnerKey === targetKey;

        // Sides Performance
        if (isBlue) {
          blueGames++;
          if (teamWon) blueWins++;
        } else {
          redGames++;
          if (teamWon) redWins++;
        }

        // Hero usage
        const picks = isBlue ? g.blueTeam?.picks : g.redTeam?.picks;
        if (picks && Array.isArray(picks)) {
          picks.forEach((hero) => {
            if (!heroCounts[hero]) heroCounts[hero] = { picks: 0, wins: 0 };
            heroCounts[hero].picks++;
            if (teamWon) heroCounts[hero].wins++;
          });
        }

        // Target bans against us
        const oppBans = isBlue ? g.redTeam?.bans : g.blueTeam?.bans;
        if (oppBans && Array.isArray(oppBans)) {
          oppBans.forEach((hero) => {
            bannedAgainstCounts[hero] = (bannedAgainstCounts[hero] || 0) + 1;
          });
        }

        // Bans made by us
        const ourBans = isBlue ? g.blueTeam?.bans : g.redTeam?.bans;
        if (ourBans && Array.isArray(ourBans)) {
          ourBans.forEach((hero) => {
            ourBanCounts[hero] = (ourBanCounts[hero] || 0) + 1;
          });
        }
      });
    });

    return { blueGames, blueWins, redGames, redWins, heroCounts, bannedAgainstCounts, ourBanCounts };
  }, [teamMatches, selectedTeam]);

  // Format comfort heroes list
  const comfortHeroesList = useMemo(() => {
    return Object.entries(dynamicStats.heroCounts)
      .map(([name, s]) => ({
        name,
        picks: s.picks,
        wins: s.wins,
        winRate: s.picks > 0 ? Math.round((s.wins / s.picks) * 100) : 0
      }))
      .sort((a,b) => b.picks - a.picks || b.winRate - a.winRate)
      .slice(0, 8);
  }, [dynamicStats.heroCounts]);

  const targetBansList = useMemo(() => {
    return Object.entries(dynamicStats.bannedAgainstCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a,b) => b.count - a.count)
      .slice(0, 5);
  }, [dynamicStats.bannedAgainstCounts]);

  const ourBansList = useMemo(() => {
    return Object.entries(dynamicStats.ourBanCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a,b) => b.count - a.count)
      .slice(0, 5);
  }, [dynamicStats.ourBanCounts]);

  // Overall Contest rate list
  const overallContestedList = useMemo(() => {
    const presence: Record<string, { picks: number; bans: number; total: number }> = {};
    let totalGames = 0;

    matches.forEach((m) => {
      (m.games || []).forEach((g) => {
        totalGames++;
        const allPicks = [...(g.blueTeam?.picks || []), ...(g.redTeam?.picks || [])];
        const allBans = [...(g.blueTeam?.bans || []), ...(g.redTeam?.bans || [])];

        const uniqP = Array.from(new Set(allPicks));
        const uniqB = Array.from(new Set(allBans));

        uniqP.forEach((h) => {
          if (!presence[h]) presence[h] = { picks: 0, bans: 0, total: 0 };
          presence[h].picks++;
          presence[h].total++;
        });

        uniqB.forEach((h) => {
          if (!presence[h]) presence[h] = { picks: 0, bans: 0, total: 0 };
          presence[h].bans++;
          presence[h].total++;
        });
      });
    });

    return Object.entries(presence)
      .map(([name, s]) => ({
        name,
        picks: s.picks,
        bans: s.bans,
        total: s.total,
        presenceRate: totalGames > 0 ? Math.round((s.total / totalGames) * 100) : 0
      }))
      .sort((a,b) => b.total - a.total)
      .slice(0, 8);
  }, [matches]);

  const tacticalRead = useMemo(() => {
    if (!selectedTeam) return null;

    const comfort = comfortHeroesList.slice(0, 3).map((hero) => hero.name);
    const bans = ourBansList.slice(0, 3).map((hero) => hero.name);
    const targetBans = targetBansList.slice(0, 3).map((hero) => hero.name);
    const blueRate = dynamicStats.blueGames > 0 ? Math.round((dynamicStats.blueWins / dynamicStats.blueGames) * 100) : 0;
    const redRate = dynamicStats.redGames > 0 ? Math.round((dynamicStats.redWins / dynamicStats.redGames) * 100) : 0;
    const strongerSide = blueRate === redRate ? "balanced" : blueRate > redRate ? "blue" : "red";

    const style =
      comfort.some((hero) => ["Fanny", "Ling", "Hayabusa", "Nolan", "Joy"].includes(hero))
        ? "tempo agresif dengan ancaman jungle/mobile carry"
        : comfort.some((hero) => ["Fredrinn", "Edith", "Khufra", "Tigreal", "Hylos"].includes(hero))
          ? "front-to-back teamfight dengan frontline tebal"
          : comfort.some((hero) => ["Zhuxin", "Yve", "Xavier", "Valentina", "Pharsa"].includes(hero))
            ? "control-poke dengan penguncian area"
            : "comfort-flex yang menyesuaikan matchup";

    const sideRead =
      strongerSide === "blue"
        ? `Lebih stabil saat pegang blue side (${blueRate}% WR) dan cenderung nyaman buka tempo lebih awal.`
        : strongerSide === "red"
          ? `Lebih stabil saat red side (${redRate}% WR) dan terlihat nyaman menyimpan counter/pivot terakhir.`
          : "Performa blue/red relatif seimbang, jadi pembacaan draft lebih ditentukan lawan dan comfort pool.";

    return {
      style,
      sideRead,
      comfort,
      bans,
      targetBans,
      opener:
        comfort.length > 0
          ? `${selectedTeam.name} paling sering kembali ke comfort seperti ${comfort.join(", ")}.`
          : `${selectedTeam.name} belum punya comfort pool yang cukup kuat dari sampel saat ini.`,
      denial:
        targetBans.length > 0
          ? `Lawan paling sering menghormati ${targetBans.join(", ")} sebagai target ban.`
          : "Belum ada pola target ban lawan yang cukup jelas dari sampel ini.",
      prep:
        bans.length > 0
          ? `Ban andalan mereka sering mengarah ke ${bans.join(", ")} untuk memotong comfort atau tempo lawan.`
          : "Ban pool tim ini masih terlalu tersebar untuk dibaca sebagai pola tetap.",
    };
  }, [selectedTeam, comfortHeroesList, ourBansList, targetBansList, dynamicStats.blueGames, dynamicStats.blueWins, dynamicStats.redGames, dynamicStats.redWins]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 sm:hidden">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="btn-ghost justify-start text-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </button>
        <div className="ui-badge border-white/10 bg-white/[0.04] text-slate-300">
          Team Analytics
        </div>
      </div>
      {/* Top Header Widget */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center rounded-[24px] border border-gray-900 bg-gray-950 p-5 gap-4 relative overflow-hidden animate-fade-in text-gray-200">
        <div className="absolute right-0 top-0 h-32 w-32 bg-indigo-500/5 blur-3xl pointer-events-none rounded-full" />
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-indigo-950/40 border border-indigo-500/25 rounded-lg flex items-center justify-center text-indigo-400">
            <Gamepad2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Analisis Tim & Sejarah Draf
            </h1>
            <p className="text-xs text-gray-400 mt-0.5 font-sans">
              Portal intelijen esports mutakhir untuk menganalisis taktik pick/ban, riwayat match live, dan preferensi side.
            </p>
          </div>
        </div>
        {import.meta.env.DEV && (
          <div className="flex items-center gap-2 font-mono text-[10px] text-gray-500 bg-gray-900/40 px-3 py-1.5 rounded-lg border border-gray-800">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>DATA INTEGRATED: {matches.length} MATCHES RECORDED</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Team Selector List */}
        <div className="lg:col-span-1 flex flex-col gap-4 rounded-xl border border-gray-900 bg-gray-950 p-5 shadow-2xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 left-0 w-full h-32 bg-indigo-500/5 blur-[80px] pointer-events-none"></div>

          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-800/80 pb-3 relative z-10">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
              <h2 className="text-sm font-bold text-white uppercase tracking-widest">S17 Standings</h2>
            </div>
            <div className="text-[9px] font-mono text-indigo-300 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-500/20 shadow-inner">WEEK 9</div>
          </div>

          {/* Teams Table Container */}
          <div className="overflow-hidden rounded-lg border border-gray-800/60 bg-[#0a0a0c] relative z-10 shadow-inner">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-900/60 border-b border-gray-800/80 font-mono text-[9px] text-gray-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-8 text-center">#</th>
                  <th className="py-2.5 px-2">Franchise</th>
                  <th className="py-2.5 px-1 text-center w-12">Total Win</th>
                  <th className="py-2.5 px-1 text-center w-12">Total Lose</th>
                  <th className="py-2.5 px-2 text-center w-14">Win Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/40">
                {(matchCenterData?.standings || []).map((teamData) => {
                  const teamDetails = teamsData.find((t) => t.key === teamData.team) || { logo: "", name: teamData.team };
                  const isSelected = selectedTeam?.key === teamData.team;
                  const teamZone = teamData.rank <= 2 ? "upper" : teamData.rank <= 6 ? "playoff" : "eliminated";
                  
                  // Zone styling
                  let rowBg = "hover:bg-gray-900/40";
                  let rankColor = "text-gray-500";
                  let borderLeft = "border-l-[3px] border-transparent";
                  
                  if (teamZone === "upper") {
                    borderLeft = "border-l-[3px] border-emerald-500/50";
                    rankColor = "text-emerald-400/80";
                  } else if (teamZone === "playoff") {
                    borderLeft = "border-l-[3px] border-indigo-500/40";
                    rankColor = "text-indigo-400/80";
                  } else {
                    borderLeft = "border-l-[3px] border-rose-600/50";
                    rankColor = "text-rose-500/80";
                    rowBg = "bg-[#1c0808] hover:bg-[#280c0c]";
                  }

                  if (isSelected) {
                    rowBg = teamZone === "eliminated" ? "bg-[#2d0e0e]" : "bg-indigo-950/30";
                    borderLeft = borderLeft.replace('/50', '').replace('/40', '').replace('/30', '');
                    rankColor = "text-white font-bold";
                  }

                  return (
                    <tr
                      key={teamData.team}
                      onClick={() => {
                        const matching = teamsData.find(t => t.key === teamData.team);
                        if (matching) {
                          setSelectedTeam(matching);
                          setTeamTab("profile");
                        }
                      }}
                      className={`cursor-pointer transition duration-200 ${rowBg}`}
                    >
                      <td className={`py-2 px-2 text-center text-xs font-mono ${rankColor} ${borderLeft}`}>
                        {teamData.rank}
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-2.5">
                          {getTeamLogoImg(teamData.team) ? (
                            <div className="relative flex items-center justify-center h-6 w-6">
                              <img 
                                src={getTeamLogoImg(teamData.team)} 
                                alt={teamDetails.name} 
                                className={`relative h-full w-full object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]`} 
                                loading="lazy" 
                              />
                            </div>
                          ) : (
                            <div className="h-6 w-6 rounded bg-gray-800/80 border border-gray-700/50" />
                          )}
                          <span className={`relative text-[12px] font-semibold tracking-tight truncate max-w-[110px] sm:max-w-none ${
                            isSelected ? 'text-indigo-200 drop-shadow-md' : 'text-gray-200'
                          }`}>
                            {teamDetails.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-1 text-center text-[11px] font-mono font-medium text-emerald-400">
                        {teamData.wins}
                      </td>
                      <td className="py-2 px-1 text-center text-[11px] font-mono font-medium text-rose-400">
                        {teamData.losses}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          teamData.winrate >= 50
                            ? "bg-indigo-950/30 text-indigo-400" 
                            : "bg-rose-950/20 text-rose-400"
                        }`}>
                          {teamData.winrate}%
                        </span>
                        <div className="mt-0.5 text-[8px] font-mono text-gray-500">
                          G {teamData.gameRecord}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Legend / Tiebreakers */}
          <div className="flex items-center justify-between px-1 mt-1 text-[9px] font-mono text-gray-500">
            <div className="flex gap-3">
              <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></div> Upper</span>
              <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500/40"></div> Playoff</span>
              <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-rose-900/40"></div> Elim</span>
            </div>
            <span>Tie: Match &#8594; Diff &#8594; H2H</span>
          </div>

          {/* Top Contested overall widget */}
          <div className="mt-2 p-3.5 bg-gray-900/20 rounded-xl border border-gray-900/60 flex flex-col gap-2">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-orange-400 animate-pulse" />
              Top Presensi Hero Turnamen
            </h3>
            <div className="flex flex-col gap-2.5">
              {overallContestedList.slice(0, 3).map((item) => (
                <div key={item.name} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1.5">
                      <FallbackImage
                        src={getHeroImg(item.name)}
                        fallbackText={item.name}
                        className="h-5 w-5 rounded object-cover border border-gray-800"
                        containerClassName="h-5 w-5 rounded text-[6px] border border-gray-800 bg-gray-900"
                      />
                      <span className="font-medium text-white text-[11px] font-sans">{item.name}</span>
                    </div>
                    <span className="font-mono text-[10px] font-semibold text-gray-400">
                      {item.presenceRate}% presensi
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
                      style={{ width: `${item.presenceRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Deep-dive Esports Dashboard Container */}
        <div className="lg:col-span-2 flex flex-col gap-5 rounded-xl border border-gray-900 bg-gray-950 p-5 shadow-xl min-h-[500px] relative">
          {selectedTeam ? (
            <>
              {/* Selected Team Profile Header */}
              <div className="flex items-center justify-between border-b border-gray-900 pb-4 flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  <div className="relative flex items-center justify-center">
                    <FallbackImage
                      src={getTeamLogoImg(selectedTeam.key)}
                      fallbackText={selectedTeam.name}
                      alt={selectedTeam.name}
                      className="h-14 w-14 object-contain bg-gray-900 p-2 rounded-xl border border-indigo-500/30 shadow-inner"
                      containerClassName="h-14 w-14 rounded-xl text-[10px] bg-gray-900 border border-indigo-500/30"
                    />
                  </div>
                  <div>
                    <span className="inline-block rounded bg-indigo-900/20 border border-indigo-500/10 px-2 py-0.5 text-[9px] font-semibold text-indigo-400 uppercase tracking-widest mb-1 font-mono">
                      PORTAL INTEL TIM
                    </span>
                    <h3 className="font-sans text-lg font-bold tracking-tight text-white mb-0.5">
                      {selectedTeam.name}
                    </h3>
                    <div className="flex items-center gap-1.5 font-mono text-[9px] text-gray-500">
                      <span>REGIONAL ID S17</span>
                      <span>•</span>
                      <span>KEY: {selectedTeam.key}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg border border-emerald-500/10 bg-emerald-950/10 px-3 py-2">
                    <div className="font-mono text-[9px] uppercase text-emerald-500">Series</div>
                    <div className="font-mono text-sm font-bold text-white">
                      {selectedStanding?.record || `${selectedTeam.wins}-${selectedTeam.losses}`}
                    </div>
                  </div>
                  <div className="rounded-lg border border-indigo-500/10 bg-indigo-950/10 px-3 py-2">
                    <div className="font-mono text-[9px] uppercase text-indigo-400">Games</div>
                    <div className="font-mono text-sm font-bold text-white">
                      {selectedStanding?.gameRecord || "0-0"}
                    </div>
                  </div>
                  <div className="rounded-lg border border-amber-500/10 bg-amber-950/10 px-3 py-2">
                    <div className="font-mono text-[9px] uppercase text-amber-400">WR</div>
                    <div className="font-mono text-sm font-bold text-white">
                      {selectedStanding?.winrate ?? selectedTeam.winRate}%
                    </div>
                  </div>
                </div>

                {/* Main Tabs Selection */}
                <div className="flex bg-gray-900 rounded-lg p-0.5 border border-gray-800 shrink-0">
                  <button
                    onClick={() => setTeamTab("profile")}
                    className={`px-3 py-1.5 text-xs rounded-md font-medium transition ${
                      teamTab === "profile"
                        ? "bg-indigo-600 text-white shadow font-semibold"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Profil
                  </button>
                  <button
                    onClick={() => setTeamTab("history")}
                    className={`px-3 py-1.5 text-xs rounded-md font-medium transition flex items-center gap-1 ${
                      teamTab === "history"
                        ? "bg-indigo-600 text-white shadow font-semibold"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Match ({loadingMatchHistory ? "..." : matchHistoryData?.filteredMatches ?? 0})
                  </button>
                  <button
                    onClick={() => setTeamTab("trends")}
                    className={`px-3 py-1.5 text-xs rounded-md font-medium transition ${
                      teamTab === "trends"
                        ? "bg-indigo-600 text-white shadow font-semibold"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Taktis
                  </button>
                </div>
              </div>

              {/* RENDER ACTIVE TAB */}

              {/* TAB 1: PROFIL ANALISIS */}
              {teamTab === "profile" && (
                <div className="flex flex-col gap-5 animate-fade-in text-gray-250">
                  {/* General Stats summary card */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-gray-900/40 border border-gray-950 p-3.5 text-center flex flex-col items-center justify-center shadow-inner">
                      <span className="font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-1">
                        MATCHES PLAYED
                      </span>
                      <span className="font-mono text-xl font-bold text-white tracking-tight">
                        {loadingMatches ? "..." : teamMatches.length}
                      </span>
                      <span className="font-sans text-[8px] text-gray-400 block mt-1 uppercase font-semibold">
                        Season 17
                      </span>
                    </div>
                    <div className="rounded-xl bg-emerald-950/5 border border-emerald-500/10 p-3.5 text-center flex flex-col items-center justify-center">
                      <span className="font-mono text-[9px] text-emerald-500 uppercase tracking-wider mb-1">
                        TOTAL MATCH WINS
                      </span>
                      <span className="font-mono text-xl font-bold text-emerald-400 tracking-tight">
                        {selectedTeam.wins}
                      </span>
                      <span className="font-sans text-[8px] text-emerald-500/80 block mt-1 uppercase font-bold">
                        REGULAR SCORE
                      </span>
                    </div>
                    <div className="rounded-xl bg-rose-950/5 border border-rose-500/10 p-3.5 text-center flex flex-col items-center justify-center">
                      <span className="font-mono text-[9px] text-rose-500 uppercase tracking-wider mb-1">
                        TOTAL LOSSES
                      </span>
                      <span className="font-mono text-xl font-bold text-rose-400 tracking-tight">
                        {selectedTeam.losses}
                      </span>
                      <span className="font-sans text-[8px] text-gray-500 block mt-1 uppercase font-bold">
                        DEFEATED MAP
                      </span>
                    </div>
                  </div>

                  {/* Side Preference (Blue vs Red wins) */}
                  <div className="p-4 rounded-xl bg-gray-900/30 border border-gray-900 flex flex-col gap-3">
                    <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-indigo-400" />
                      Analisis Preferensi Sisi (Blue vs Red Side Preference)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Blue side analysis */}
                      <div className="bg-gray-950/60 p-3 rounded-lg border border-gray-900 flex flex-col gap-2 shadow-inner">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-blue-400 font-bold uppercase tracking-wider font-mono text-[10px]">
                            Laga Blue Side
                          </span>
                          <span className="font-mono font-semibold text-white">
                            {dynamicStats.blueWins}W - {dynamicStats.blueGames - dynamicStats.blueWins}L
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-2xl font-bold text-white font-mono">
                            {dynamicStats.blueGames > 0 ? Math.round((dynamicStats.blueWins / dynamicStats.blueGames) * 100) : 0}%
                          </span>
                          <span className="text-[9px] text-gray-500 uppercase font-mono">
                            {dynamicStats.blueGames} Game Dimainkan
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${dynamicStats.blueGames > 0 ? (dynamicStats.blueWins / dynamicStats.blueGames) * 100 : 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Red side analysis */}
                      <div className="bg-gray-950/60 p-3 rounded-lg border border-gray-900 flex flex-col gap-2 shadow-inner">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-rose-400 font-bold uppercase tracking-wider font-mono text-[10px]">
                            Laga Red Side
                          </span>
                          <span className="font-mono font-semibold text-white">
                            {dynamicStats.redWins}W - {dynamicStats.redGames - dynamicStats.redWins}L
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-2xl font-bold text-white font-mono">
                            {dynamicStats.redGames > 0 ? Math.round((dynamicStats.redWins / dynamicStats.redGames) * 100) : 0}%
                          </span>
                          <span className="text-[9px] text-gray-500 uppercase font-mono">
                            {dynamicStats.redGames} Game Dimainkan
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-rose-500 rounded-full"
                            style={{ width: `${dynamicStats.redGames > 0 ? (dynamicStats.redWins / dynamicStats.redGames) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Comfort Heroes with Actual Winrates */}
                  <div className="border-t border-gray-900 pt-4 flex flex-col gap-3">
                    <h4 className="font-sans text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-indigo-400" />
                      Hero Kenyamanan Paling Sering Di-pick (Comfort Picks)
                    </h4>
                    {comfortHeroesList.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {comfortHeroesList.map((hero, i) => (
                          <div
                            key={hero.name}
                            className="flex items-center justify-between rounded-xl bg-gray-900/30 p-3 border border-gray-900 hover:border-indigo-500/20 transition group"
                          >
                            <div className="flex items-center gap-3">
                              <FallbackImage
                                src={getHeroImg(hero.name)}
                                fallbackText={hero.name}
                                alt={hero.name}
                                className="h-9 w-9 rounded-lg bg-gray-955 object-cover border border-gray-800 group-hover:border-indigo-500/30 transition duration-150"
                                containerClassName="h-9 w-9 rounded-lg text-[8px] bg-gray-950 border border-gray-800"
                              />
                              <div>
                                <span className="font-sans text-xs text-white font-bold block">
                                  {hero.name}
                                </span>
                                <span className="font-sans text-[10px] text-gray-500 font-medium block mt-0.5">
                                  {hero.picks} Pick • {hero.wins}W - {hero.picks - hero.wins}L
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-mono text-xs font-bold text-emerald-400 block animate-pulse">
                                {hero.winRate}% WR
                              </span>
                              <span className="font-mono text-[8px] text-gray-500 uppercase tracking-widest font-bold block mt-0.5">
                                PRIO #{i + 1}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic pl-1 py-4 font-sans text-center">
                        Data pick dan history game tim tidak terdeteksi untuk sesi ini.
                      </p>
                    )}
                  </div>

                  {/* Target Bans Against us vs Our bans */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-900 pt-4">
                    {/* Banned Against us */}
                    <div className="flex flex-col gap-3.5">
                      <h4 className="font-sans text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-orange-400" />
                        Apresiasi Target Ban Lawan (Targeted Bans Against us)
                      </h4>
                      {targetBansList.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          {targetBansList.map((hero) => (
                            <div
                              key={hero.name}
                              className="flex items-center justify-between rounded-lg bg-orange-950/5 p-2.5 border border-orange-900/10"
                            >
                              <div className="flex items-center gap-2.5">
                                <FallbackImage
                                  src={getHeroImg(hero.name)}
                                  fallbackText={hero.name}
                                  alt={hero.name}
                                  className="h-8 w-8 rounded bg-gray-950 object-cover border border-gray-800"
                                  containerClassName="h-8 w-8 rounded text-[8px] bg-gray-950 border border-gray-800"
                                />
                                <span className="font-sans text-xs text-white font-medium">
                                  {hero.name}
                                </span>
                              </div>
                              <span className="font-mono text-[10px] text-orange-400 font-bold uppercase bg-orange-950/30 px-2 py-0.5 rounded border border-orange-500/5">
                                {hero.count} BAN AGAINST
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 italic font-sans py-2 text-center">No target ban data detected.</p>
                      )}
                    </div>

                    {/* Most Banned by us */}
                    <div className="flex flex-col gap-3.5">
                      <h4 className="font-sans text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-emerald-400" />
                        Draf Larangan Utama (Our Team Bans)
                      </h4>
                      {ourBansList.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          {ourBansList.map((hero) => (
                            <div
                              key={hero.name}
                              className="flex items-center justify-between rounded-lg bg-emerald-950/5 p-2.5 border border-emerald-900/10"
                            >
                              <div className="flex items-center gap-2.5">
                                <FallbackImage
                                  src={getHeroImg(hero.name)}
                                  fallbackText={hero.name}
                                  alt={hero.name}
                                  className="h-8 w-8 rounded bg-gray-950 object-cover border border-gray-800"
                                  containerClassName="h-8 w-8 rounded text-[8px] bg-gray-950 border border-gray-800"
                                />
                                <span className="font-sans text-xs text-white font-medium">
                                  {hero.name}
                                </span>
                              </div>
                              <span className="font-mono text-[10px] text-emerald-400 font-bold uppercase bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/5">
                                {hero.count} TOTAL BAN
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 italic font-sans py-2 text-center">No ban stats detected.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: GAME & DRAFT HISTORY */}
              {teamTab === "history" && (
                <div className="flex flex-col gap-4 animate-fade-in relative">
                  {/* Filter bar */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {(["all", "win", "lose"] as const).map((f) => (
                      <button key={f} onClick={() => setMatchResultFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          matchResultFilter === f 
                            ? "bg-indigo-600 text-white" 
                            : "bg-gray-900 text-gray-400 hover:text-gray-200"
                        }`}>
                        {f === "all" ? "Semua" : f === "win" ? "Menang" : "Kalah"}
                      </button>
                    ))}
                    <div className="flex items-center gap-1 rounded-lg border border-gray-800 bg-gray-900/50 p-1">
                      <CalendarDays className="ml-1 h-3.5 w-3.5 text-indigo-400" />
                      {Array.from({ length: 9 }, (_, index) => index + 1).map((week) => (
                        <button
                          key={week}
                          onClick={() => setMatchWeekFilter(matchWeekFilter === week ? null : week)}
                          className={`rounded px-2 py-1 text-[10px] font-bold transition ${
                            matchWeekFilter === week
                              ? "bg-indigo-600 text-white"
                              : "text-gray-500 hover:bg-gray-800 hover:text-gray-200"
                          }`}
                        >
                          W{week}
                        </button>
                      ))}
                    </div>
                    {/* Opponent search */}
                    <input
                      type="text"
                      placeholder="Cari lawan..."
                      value={matchOpponentFilter}
                      onChange={(e) => setMatchOpponentFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-lg text-xs bg-gray-900 border border-gray-800 text-gray-200 placeholder-gray-500 w-40"
                    />
                    <button
                      type="button"
                      onClick={resetMatchFilters}
                      className="flex items-center gap-1 rounded-lg border border-gray-800 bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-400 transition hover:text-white"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset
                    </button>
                  </div>

                  {/* Stats summary */}
                  {matchHistoryData && (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                      {[
                        ["Total", matchHistoryData.totalMatches, "text-gray-200"],
                        ["Showing", matchHistoryData.filteredMatches, "text-indigo-300"],
                        ["W", matchHistoryData.wins, "text-emerald-400"],
                        ["L", matchHistoryData.losses, "text-red-400"],
                        ["WR", `${matchHistoryData.winrate}%`, "text-amber-300"],
                        ["Games", matchHistoryData.gamesCount, "text-gray-200"],
                        ["Game Rec", matchHistoryData.gameRecord, "text-cyan-300"],
                      ].map(([label, value, color]) => (
                        <div key={label} className="rounded-lg border border-gray-900 bg-black/20 px-3 py-2">
                          <div className="font-mono text-[9px] uppercase text-gray-600">{label}</div>
                          <div className={`font-mono text-sm font-black ${color}`}>{value}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Loading state */}
                  {loadingMatchHistory && (
                    <div className="flex flex-col gap-3">
                      {[1,2,3].map(i => (
                        <div key={i} className="h-14 bg-gray-900/50 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  )}

                  {/* Empty state */}
                  {!loadingMatchHistory && matchHistoryData && matchHistoryData.series.length === 0 && (
                    <div className="text-center text-gray-500 py-8 text-sm">
                      Tidak ada match ditemukan.
                    </div>
                  )}

                  {/* Series list */}
                  {!loadingMatchHistory && matchHistoryData && matchHistoryData.series.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {matchHistoryData.series.map((s) => (
                        <MatchSeriesCard
                          key={s.id}
                          series={s}
                          selectedTeamKey={selectedTeam?.key || ""}
                          heroAssets={heroAssets}
                          getTeamLogo={getTeamLogoImg}
                        />
                      ))}
                    </div>
                  )}

                  {matchCenterData && (
                    <details className="rounded-xl border border-gray-900 bg-black/20 p-3 text-xs text-gray-400">
                      <summary className="cursor-pointer font-bold text-gray-300 hover:text-white">
                        Week View W1-W9
                      </summary>
                      <div className="mt-3 space-y-4">
                        {visibleWeekGroups.map((week) => (
                          <div key={week.week} className="rounded-lg border border-gray-900 bg-gray-950/50 p-3">
                            <h4 className="mb-2 font-mono text-xs font-black text-indigo-300">Week {week.week}</h4>
                            <div className="space-y-3">
                              {week.days.map((day) => (
                                <div key={`${week.week}-${day.day}`}>
                                  <div className="mb-1 font-mono text-[10px] font-bold uppercase text-gray-500">
                                    Day {day.day}
                                  </div>
                                  <div className="grid gap-1">
                                    {day.series.map((seriesItem) => (
                                      <div key={seriesItem.seriesId} className="flex items-center justify-between rounded bg-gray-900/40 px-2 py-1">
                                        <span>
                                          {seriesItem.teamA} {seriesItem.teamAScore}-{seriesItem.teamBScore} {seriesItem.teamB}
                                        </span>
                                        <span className="text-gray-500">{seriesItem.date}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {/* Error state */}
                  {matchHistoryError && (
                    <div className="text-center text-red-400 py-4 text-xs">
                      Error: {matchHistoryError}
                    </div>
                  )}

                </div>
              )}

              {/* TAB 3: TACTICAL & TRENDS */}
              {teamTab === "trends" && (
                <div className="flex flex-col gap-5 animate-fade-in text-gray-300 leading-relaxed text-xs">
                  <div className="p-4 bg-gray-900/30 rounded-xl border border-gray-900 flex flex-col gap-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-900 pb-2 font-sans">
                      <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
                      Gaya Bermain & Kecenderungan Draf (Tournament Draft Assessment)
                    </h4>
                    
                    <div className="space-y-3 font-sans text-[11px] text-gray-400 leading-relaxed">
                      <p>
                        Berdasarkan integrasi data taktis dari {teamMatches.length} pertandingan turnamen, tim <strong className="text-white font-bold">{selectedTeam.name}</strong> menunjukkan karakteristik draft yang berbeda dari comfort pool, target ban, dan performa sisi.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                        <div className="bg-gray-950/60 p-3 rounded-lg border border-gray-900 flex flex-col gap-1.5">
                          <span className="text-white font-bold block text-xs flex items-center gap-1">
                            <Zap className="h-3 w-3 text-indigo-400" /> Draft Identity
                          </span>
                          <p className="text-[10px] text-gray-500">
                            Pembacaan pola utama dari hero comfort yang paling sering mereka kembalikan:
                          </p>
                          <span className="font-mono text-xs font-bold text-emerald-400 uppercase">
                            {tacticalRead?.style || "Belum terbaca"}
                          </span>
                        </div>

                        <div className="bg-gray-950/60 p-3 rounded-lg border border-gray-900 flex flex-col gap-1.5">
                          <span className="text-white font-bold block text-xs flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3 text-emerald-400" /> Side Preference
                          </span>
                          <p className="text-[10px] text-gray-500">
                            Kecenderungan performa saat blue/red side:
                          </p>
                          <span className="text-[11px] text-indigo-300 leading-relaxed">
                            {tacticalRead?.sideRead || "Belum terbaca"}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="rounded-xl border border-gray-900 bg-black/20 p-3">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">Comfort Core</div>
                          <div className="mt-2 text-[11px] text-gray-300 leading-relaxed">
                            {tacticalRead?.opener || "Belum ada data."}
                          </div>
                        </div>
                        <div className="rounded-xl border border-gray-900 bg-black/20 p-3">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-rose-300">Enemy Respect Ban</div>
                          <div className="mt-2 text-[11px] text-gray-300 leading-relaxed">
                            {tacticalRead?.denial || "Belum ada data."}
                          </div>
                        </div>
                        <div className="rounded-xl border border-gray-900 bg-black/20 p-3">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Prep Ban Plan</div>
                          <div className="mt-2 text-[11px] text-gray-300 leading-relaxed">
                            {tacticalRead?.prep || "Belum ada data."}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Top Contested tournament-wide table for context */}
                  <div className="border-t border-gray-900 pt-3">
                    <h4 className="font-sans text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                      <LineChart className="h-4 w-4 text-indigo-450" />
                      Hero Paling Diwaspadai Turnamen (Tournament Contested Rate)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {overallContestedList.map((item, i) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-gray-900/30 border border-gray-900"
                        >
                          <div className="flex items-center gap-2.5">
                            <FallbackImage
                              src={getHeroImg(item.name)}
                              fallbackText={item.name}
                              className="h-8 w-8 rounded-lg object-cover border border-gray-800"
                              containerClassName="h-8 w-8 rounded-lg text-[8px] bg-gray-950 border border-gray-800"
                            />
                            <div>
                              <span className="text-xs font-sans text-white font-bold block">
                                {item.name}
                              </span>
                              <span className="text-[9px] font-sans text-gray-500 font-semibold uppercase">
                                {item.picks} Picks • {item.bans} Bans
                              </span>
                            </div>
                          </div>
                          <span className="font-mono text-xs font-bold text-orange-400 bg-orange-950/30 px-2 py-0.5 rounded border border-orange-500/10">
                            {item.presenceRate}% presensi
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center py-24 text-gray-600">
              <Award className="h-10 w-10 mb-2 opacity-30 animate-bounce" />
              <p className="text-sm font-sans text-gray-500 pl-2">
                Pilih salah satu tim franchise di sebelah kiri untuk menganalisis taktik draf, rekam jejak draf, dan history match.
              </p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
