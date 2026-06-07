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
  heroes?: any[];
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

  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState<boolean>(true);

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

  useEffect(() => {
    if (teamsData.length > 0 && !selectedTeam) {
      setSelectedTeam(teamsData[0]);
    }
  }, [teamsData, selectedTeam]);

  const getTeamLogoImg = (teamKey: string) => {
    const normKey = normalizeTeamName(teamKey);
    const found = teamsData.find(t => normalizeTeamName(t.key) === normKey);
    return found?.logo || fallbackLogo;
  };

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

  const filteredTeams = useMemo(() => {
    return teamsData.filter((t) => {
      const matchName = t.name.toLowerCase().includes(searchTeam.toLowerCase());
      const matchKey = t.key.toLowerCase().includes(searchTeam.toLowerCase());
      return matchName || matchKey;
    });
  }, [teamsData, searchTeam]);

  const teamMatches = useMemo(() => {
    if (!selectedTeam) return [];
    const tKey = selectedTeam.key.toLowerCase();
    return matches.filter((m) => {
      const bTeam = normalizeTeamName(m.blueTeam).toLowerCase();
      const rTeam = normalizeTeamName(m.redTeam).toLowerCase();
      return bTeam === tKey || rTeam === tKey;
    });
  }, [matches, selectedTeam]);

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

        if (isBlue) {
          blueGames++;
          if (teamWon) blueWins++;
        } else {
          redGames++;
          if (teamWon) redWins++;
        }

        const picks = isBlue ? g.blueTeam?.picks : g.redTeam?.picks;
        if (picks && Array.isArray(picks)) {
          picks.forEach((hero) => {
            if (!heroCounts[hero]) heroCounts[hero] = { picks: 0, wins: 0 };
            heroCounts[hero].picks++;
            if (teamWon) heroCounts[hero].wins++;
          });
        }

        const oppBans = isBlue ? g.redTeam?.bans : g.blueTeam?.bans;
        if (oppBans && Array.isArray(oppBans)) {
          oppBans.forEach((hero) => {
            bannedAgainstCounts[hero] = (bannedAgainstCounts[hero] || 0) + 1;
          });
        }

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
    <div className="flex flex-col gap-6 min-h-screen">
      {/* Mobile Back Button */}
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

      {/* ═══════════════ PAGE HEADER ═══════════════ */}
      <div className="relative rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#080e1a] via-[#0a1225] to-[#060b16] p-6 sm:p-7 gap-5 overflow-hidden animate-fade-in">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 h-56 w-56 bg-indigo-600/[0.06] blur-[100px] rounded-full" />
          <div className="absolute -bottom-16 -left-16 h-40 w-40 bg-blue-500/[0.04] blur-[80px] rounded-full" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-gradient-to-br from-indigo-500/20 to-blue-600/10 border border-indigo-500/25 rounded-xl flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10 shrink-0">
              <Gamepad2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-[1.75rem] font-black text-white tracking-tight leading-none" style={{ fontFamily: 'var(--font-display)' }}>
                Analisis Tim & Sejarah Draf
              </h1>
              <p className="text-[13px] text-gray-400 mt-1.5 font-sans max-w-lg leading-relaxed">
                Portal intelijen esports — taktik pick/ban, riwayat match live, dan preferensi side.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-950/40 border border-indigo-500/15 px-3 py-1.5 text-[11px] font-mono font-bold text-indigo-300">
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Regular Season
            </span>
            <span className="inline-flex items-center rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-1.5 text-[11px] font-mono font-bold text-gray-400">
              {matchCenterData?.totalSeries ?? "—"} Series
            </span>
            <span className="inline-flex items-center rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-1.5 text-[11px] font-mono font-bold text-gray-400">
              {matchCenterData?.totalGames ?? "—"} Games
            </span>
          </div>
        </div>
        {import.meta.env.DEV && (
          <div className="relative z-10 flex items-center gap-2 font-mono text-[10px] text-gray-500 bg-gray-900/60 px-3 py-1.5 rounded-lg border border-gray-800/60 w-fit">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>DATA INTEGRATED: {matches.length} MATCHES RECORDED</span>
          </div>
        )}
      </div>

      {/* ═══════════════ MAIN 2-COLUMN LAYOUT ═══════════════ */}
      <div className="grid grid-cols-1 gap-6 lg:gap-7" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 3.5fr)' }}>

        {/* ─── LEFT COLUMN: STANDINGS & LEADERBOARD ─── */}
        <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-gradient-to-b from-[#080e1a] to-[#060b14] p-5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-40 bg-indigo-500/[0.04] blur-[90px] pointer-events-none" />

          {/* Standings Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-amber-950/40 border border-amber-500/20 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-amber-400" />
              </div>
              <h2 className="text-sm font-black text-white uppercase tracking-widest" style={{ fontFamily: 'var(--font-display)' }}>
                S17 Standings
              </h2>
            </div>
            <div className="text-[10px] font-mono font-bold text-indigo-300 bg-indigo-950/50 px-3 py-1 rounded-lg border border-indigo-500/20">
              WEEK 9
            </div>
          </div>

          {/* Standings Table */}
          <div className="overflow-hidden rounded-xl border border-white/[0.04] bg-black/30 relative z-10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/[0.06]">
                  <th className="py-3 px-3 w-9 text-center font-mono text-[10px] text-gray-400 uppercase tracking-widest font-bold">#</th>
                  <th className="py-3 px-3 font-mono text-[10px] text-gray-400 uppercase tracking-widest font-bold">Team</th>
                  <th className="py-3 px-3 text-center font-mono text-[10px] text-gray-400 uppercase tracking-widest font-bold w-11">W</th>
                  <th className="py-3 px-3 text-center font-mono text-[10px] text-gray-400 uppercase tracking-widest font-bold w-11">L</th>
                  <th className="py-3 px-3 text-center font-mono text-[10px] text-gray-400 uppercase tracking-widest font-bold w-[72px]">WR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {(matchCenterData?.standings || []).map((teamData) => {
                  const teamDetails = teamsData.find((t) => t.key === teamData.team) || { logo: "", name: teamData.team };
                  const isSelected = selectedTeam?.key === teamData.team;
                  const teamZone = teamData.rank <= 2 ? "upper" : teamData.rank <= 6 ? "playoff" : "eliminated";
                  
                  let rowBg = "hover:bg-white/[0.02] transition-colors duration-150";
                  let rankColor = "text-gray-500";
                  let borderLeft = "border-l-[3px] border-transparent";
                  
                  if (teamZone === "upper") {
                    borderLeft = "border-l-[3px] border-emerald-500/60";
                    rankColor = "text-emerald-400";
                  } else if (teamZone === "playoff") {
                    borderLeft = "border-l-[3px] border-indigo-500/40";
                    rankColor = "text-indigo-400";
                  } else {
                    borderLeft = "border-l-[3px] border-rose-600/50";
                    rankColor = "text-rose-400/70";
                    rowBg = "bg-rose-950/[0.03] hover:bg-rose-950/[0.06] transition-colors duration-150";
                  }

                  if (isSelected) {
                    rowBg = teamZone === "eliminated" ? "bg-rose-950/10" : "bg-indigo-950/20";
                    borderLeft = borderLeft.replace('/60', '').replace('/40', '');
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
                      className={`cursor-pointer ${rowBg}`}
                    >
                      <td className={`py-3 px-3 text-center text-[12px] font-mono font-bold ${rankColor} ${borderLeft}`}>
                        {teamData.rank}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          {getTeamLogoImg(teamData.team) ? (
                            <div className="relative flex items-center justify-center h-7 w-7 shrink-0">
                              <img 
                                src={getTeamLogoImg(teamData.team)} 
                                alt={teamDetails.name} 
                                className="relative h-full w-full object-contain" 
                                loading="lazy" 
                              />
                            </div>
                          ) : (
                            <div className="h-7 w-7 rounded-lg bg-white/[0.03] border border-white/[0.06] shrink-0" />
                          )}
                          <span className={`relative text-[13px] font-semibold tracking-tight truncate max-w-[140px] ${
                            isSelected ? 'text-indigo-200' : 'text-gray-200'
                          }`}>
                            {teamDetails.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center text-[13px] font-mono font-bold text-emerald-400">
                        {teamData.wins}
                      </td>
                      <td className="py-3 px-3 text-center text-[13px] font-mono font-bold text-rose-400">
                        {teamData.losses}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-[12px] font-mono font-bold px-2.5 py-1 rounded-lg inline-block ${
                          teamData.winrate >= 50
                            ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/15" 
                            : "bg-rose-950/30 text-rose-400 border border-rose-500/10"
                        }`}>
                          {teamData.winrate}%
                        </span>
                        <div className="text-[10px] font-mono text-gray-600 mt-1.5 tabular-nums">
                          {teamData.gameRecord}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Zone Legend */}
          <div className="flex flex-col gap-2.5 px-1 mt-1 relative z-10">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] font-mono text-gray-400">
              <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" /> Upper Bracket</span>
              <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-indigo-500/40" /> Playoff</span>
              <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-rose-600/50" /> Eliminasi</span>
            </div>
            <div className="text-[10px] font-mono text-gray-600">
              Tiebreak: Series Record → Game Diff → Head-to-Head
            </div>
          </div>

          {/* ═══ Top Presensi Hero ═══ */}
          <div className="mt-1 p-4 bg-white/[0.015] rounded-xl border border-white/[0.04] flex flex-col gap-3.5 relative z-10">
            <h3 className="text-[12px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-2.5" style={{ fontFamily: 'var(--font-display)' }}>
              <div className="h-6 w-6 rounded-lg bg-orange-950/40 border border-orange-500/20 flex items-center justify-center">
                <Flame className="h-3.5 w-3.5 text-orange-400" />
              </div>
              Top Presensi Hero
            </h3>
            <div className="flex flex-col gap-3.5">
              {overallContestedList.slice(0, 3).map((item) => (
                <div key={item.name} className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <FallbackImage
                        src={getHeroImg(item.name)}
                        fallbackText={item.name}
                        className="h-7 w-7 rounded-lg object-cover border border-white/[0.06]"
                        containerClassName="h-7 w-7 rounded-lg text-[7px] border border-white/[0.06] bg-gray-900"
                      />
                      <span className="font-sans text-[13px] font-bold text-white">{item.name}</span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-orange-400 tabular-nums">
                      {item.presenceRate}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
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

        {/* ─── RIGHT COLUMN: TEAM ANALYTICS ─── */}
        <div className="flex flex-col gap-5 rounded-2xl border border-white/[0.06] bg-gradient-to-b from-[#080e1a] to-[#060b14] p-6 shadow-2xl min-h-[500px] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/[0.03] blur-[100px] pointer-events-none rounded-full" />

          {selectedTeam ? (
            <>
              {/* ═══════════════ TEAM PROFILE HEADER ═══════════════ */}
              <div className="relative z-10 flex flex-col gap-5 border-b border-white/[0.06] pb-5">
                <div className="flex items-start justify-between gap-5 flex-wrap">
                  {/* Logo + Name + Badges */}
                  <div className="flex items-center gap-5">
                    <div className="relative flex items-center justify-center shrink-0">
                      <FallbackImage
                        src={getTeamLogoImg(selectedTeam.key)}
                        fallbackText={selectedTeam.name}
                        alt={selectedTeam.name}
                        className="h-[72px] w-[72px] object-contain bg-black/40 p-3 rounded-2xl border border-white/[0.06] shadow-xl shadow-black/40"
                        containerClassName="h-[72px] w-[72px] rounded-2xl text-sm bg-black/40 border border-white/[0.06]"
                      />
                      {selectedStanding && (
                        <div className="absolute -bottom-1.5 -right-1.5 rounded-full bg-gray-950 border-2 border-gray-700 px-2 py-0.5 text-[10px] font-mono font-black text-white shadow-lg">
                          #{selectedStanding.rank}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <h3 className="text-2xl font-black tracking-tight text-white leading-none" style={{ fontFamily: 'var(--font-display)' }}>
                        {selectedTeam.name}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center rounded-lg bg-indigo-950/50 border border-indigo-500/20 px-2.5 py-1 text-[10px] font-bold text-indigo-400 uppercase tracking-widest font-mono">
                          MPL ID S17
                        </span>
                        {selectedStanding && (
                          <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-bold font-mono uppercase tracking-wider ${
                            selectedStanding.rank <= 2
                              ? "bg-emerald-950/40 border border-emerald-500/20 text-emerald-400"
                              : selectedStanding.rank <= 6
                                ? "bg-indigo-950/40 border border-indigo-500/20 text-indigo-400"
                                : "bg-rose-950/30 border border-rose-500/20 text-rose-400"
                          }`}>
                            {selectedStanding.rank <= 2 ? "Upper Bracket" : selectedStanding.rank <= 6 ? "Playoff" : "Eliminasi"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stat Pills */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-3 min-w-[80px]">
                      <div className="font-mono text-[10px] uppercase text-gray-500 tracking-widest mb-1 font-bold">Series</div>
                      <div className="font-mono text-lg font-black text-white tabular-nums">
                        {selectedStanding?.record || `${selectedTeam.wins}-${selectedTeam.losses}`}
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-3 min-w-[80px]">
                      <div className="font-mono text-[10px] uppercase text-gray-500 tracking-widest mb-1 font-bold">Games</div>
                      <div className="font-mono text-lg font-black text-white tabular-nums">
                        {selectedStanding?.gameRecord || "0-0"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-3 min-w-[80px]">
                      <div className="font-mono text-[10px] uppercase text-gray-500 tracking-widest mb-1 font-bold">Win Rate</div>
                      <div className="font-mono text-lg font-black text-white tabular-nums">
                        {selectedStanding?.winrate ?? selectedTeam.winRate}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tab Controls */}
                <div className="flex bg-white/[0.02] rounded-xl p-1.5 border border-white/[0.06] shrink-0 w-fit">
                  <button
                    onClick={() => setTeamTab("profile")}
                    className={`px-5 py-2.5 text-[13px] rounded-lg font-bold transition-all duration-200 ${
                      teamTab === "profile"
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                        : "text-gray-500 hover:text-white hover:bg-white/[0.03]"
                    }`}
                  >
                    Profil
                  </button>
                  <button
                    onClick={() => setTeamTab("history")}
                    className={`px-5 py-2.5 text-[13px] rounded-lg font-bold transition-all duration-200 flex items-center gap-1.5 ${
                      teamTab === "history"
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                        : "text-gray-500 hover:text-white hover:bg-white/[0.03]"
                    }`}
                  >
                    Match ({loadingMatchHistory ? "..." : matchHistoryData?.filteredMatches ?? 0})
                  </button>
                  <button
                    onClick={() => setTeamTab("trends")}
                    className={`px-5 py-2.5 text-[13px] rounded-lg font-bold transition-all duration-200 ${
                      teamTab === "trends"
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                        : "text-gray-500 hover:text-white hover:bg-white/[0.03]"
                    }`}
                  >
                    Taktis
                  </button>
                </div>
              </div>

              {/* ═══════════════ TAB 1: PROFIL ANALISIS ═══════════════ */}
              {teamTab === "profile" && (
                <div className="flex flex-col gap-6 animate-fade-in text-gray-250 relative z-10">

                  {/* Series Stat Cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5 text-center flex flex-col items-center justify-center gap-1">
                      <span className="font-mono text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                        SERIES DIMAINKAN
                      </span>
                      <span className="font-mono text-3xl font-black text-white tracking-tight tabular-nums">
                        {loadingMatches ? "..." : teamMatches.length}
                      </span>
                      <span className="text-[11px] text-gray-500 font-sans">
                        Regular Season
                      </span>
                    </div>
                    <div className="rounded-xl bg-emerald-950/[0.08] border border-emerald-500/10 p-5 text-center flex flex-col items-center justify-center gap-1">
                      <span className="font-mono text-[10px] text-emerald-400 uppercase tracking-widest font-bold">
                        SERIES WINS
                      </span>
                      <span className="font-mono text-3xl font-black text-emerald-400 tracking-tight tabular-nums">
                        {selectedTeam.wins}
                      </span>
                      <span className="text-[11px] text-emerald-500/60 font-sans">
                        W-L: {selectedTeam.wins}-{selectedTeam.losses}
                      </span>
                    </div>
                    <div className="rounded-xl bg-rose-950/[0.08] border border-rose-500/10 p-5 text-center flex flex-col items-center justify-center gap-1">
                      <span className="font-mono text-[10px] text-rose-400 uppercase tracking-widest font-bold">
                        SERIES LOSSES
                      </span>
                      <span className="font-mono text-3xl font-black text-rose-400 tracking-tight tabular-nums">
                        {selectedTeam.losses}
                      </span>
                      <span className="text-[11px] text-gray-500 font-sans">
                        Game Diff: {selectedStanding ? (selectedStanding.gameDiff > 0 ? '+' : '') + selectedStanding.gameDiff : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Side Preference */}
                  <div className="p-5 rounded-xl bg-white/[0.015] border border-white/[0.04] flex flex-col gap-4">
                    <h4 className="text-[12px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-2.5" style={{ fontFamily: 'var(--font-display)' }}>
                      <div className="h-6 w-6 rounded-lg bg-indigo-950/40 border border-indigo-500/20 flex items-center justify-center">
                        <Layers className="h-3.5 w-3.5 text-indigo-400" />
                      </div>
                      Analisis Preferensi Sisi
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-black/30 p-4 rounded-xl border border-white/[0.04] flex flex-col gap-2.5">
                        <div className="flex justify-between items-center">
                          <span className="text-blue-400 font-bold uppercase tracking-wider font-mono text-[11px]">
                            Laga Blue Side
                          </span>
                          <span className="font-mono font-semibold text-white text-[13px] tabular-nums">
                            {dynamicStats.blueWins}W - {dynamicStats.blueGames - dynamicStats.blueWins}L
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-[1.75rem] font-bold text-white font-mono tabular-nums leading-none">
                            {dynamicStats.blueGames > 0 ? Math.round((dynamicStats.blueWins / dynamicStats.blueGames) * 100) : 0}%
                          </span>
                          <span className="text-[10px] text-gray-500 uppercase font-mono font-bold">
                            {dynamicStats.blueGames} Game Dimainkan
                          </span>
                        </div>
                        <div className="h-2 w-full bg-white/[0.04] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                            style={{ width: `${dynamicStats.blueGames > 0 ? (dynamicStats.blueWins / dynamicStats.blueGames) * 100 : 0}%` }}
                          />
                        </div>
                      </div>

                      <div className="bg-black/30 p-4 rounded-xl border border-white/[0.04] flex flex-col gap-2.5">
                        <div className="flex justify-between items-center">
                          <span className="text-rose-400 font-bold uppercase tracking-wider font-mono text-[11px]">
                            Laga Red Side
                          </span>
                          <span className="font-mono font-semibold text-white text-[13px] tabular-nums">
                            {dynamicStats.redWins}W - {dynamicStats.redGames - dynamicStats.redWins}L
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-[1.75rem] font-bold text-white font-mono tabular-nums leading-none">
                            {dynamicStats.redGames > 0 ? Math.round((dynamicStats.redWins / dynamicStats.redGames) * 100) : 0}%
                          </span>
                          <span className="text-[10px] text-gray-500 uppercase font-mono font-bold">
                            {dynamicStats.redGames} Game Dimainkan
                          </span>
                        </div>
                        <div className="h-2 w-full bg-white/[0.04] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full"
                            style={{ width: `${dynamicStats.redGames > 0 ? (dynamicStats.redWins / dynamicStats.redGames) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Comfort Picks */}
                  <div className="flex flex-col gap-4">
                    <h4 className="text-[12px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-2.5" style={{ fontFamily: 'var(--font-display)' }}>
                      <div className="h-6 w-6 rounded-lg bg-indigo-950/40 border border-indigo-500/20 flex items-center justify-center">
                        <TrendingUp className="h-3.5 w-3.5 text-indigo-400" />
                      </div>
                      Comfort Picks — Hero Paling Sering Di-pick
                    </h4>
                    {comfortHeroesList.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {comfortHeroesList.map((hero, i) => (
                          <div
                            key={hero.name}
                            className="flex items-center justify-between rounded-xl bg-white/[0.02] p-3.5 border border-white/[0.04] hover:border-indigo-500/20 transition-all duration-200 group"
                          >
                            <div className="flex items-center gap-3.5">
                              <FallbackImage
                                src={getHeroImg(hero.name)}
                                fallbackText={hero.name}
                                alt={hero.name}
                                className="h-10 w-10 rounded-lg object-cover border border-white/[0.06] group-hover:border-indigo-500/30 transition duration-150"
                                containerClassName="h-10 w-10 rounded-lg text-[8px] bg-gray-900 border border-white/[0.06]"
                              />
                              <div className="flex flex-col gap-0.5">
                                <span className="font-sans text-[13px] text-white font-bold">
                                  {hero.name}
                                </span>
                                <span className="font-sans text-[11px] text-gray-500 font-medium">
                                  {hero.picks} Pick &bull; {hero.wins}W - {hero.picks - hero.wins}L
                                </span>
                              </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-0.5">
                              <span className={`font-mono text-[13px] font-bold tabular-nums ${
                                hero.winRate >= 60 ? "text-emerald-400" : hero.winRate >= 40 ? "text-amber-400" : "text-rose-400"
                              }`}>
                                {hero.winRate}% WR
                              </span>
                              <span className="font-mono text-[9px] text-gray-600 uppercase tracking-widest font-bold">
                                #{i + 1} Prio
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[13px] text-gray-500 italic py-6 font-sans text-center">
                        Belum ada data pick/ban dari game tim ini.
                      </p>
                    )}
                  </div>

                  {/* Target Bans + Our Bans */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Banned Against us */}
                    <div className="flex flex-col gap-3.5">
                      <h4 className="text-[12px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-2.5" style={{ fontFamily: 'var(--font-display)' }}>
                        <div className="h-6 w-6 rounded-lg bg-orange-950/40 border border-orange-500/20 flex items-center justify-center">
                          <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />
                        </div>
                        Target Ban Lawan
                      </h4>
                      {targetBansList.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          {targetBansList.map((hero, i) => (
                            <div
                              key={hero.name}
                              className="flex items-center justify-between rounded-xl bg-orange-950/[0.04] p-3 border border-orange-500/[0.06]"
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-[11px] text-orange-400/60 font-bold w-5 text-center">{i + 1}</span>
                                <FallbackImage
                                  src={getHeroImg(hero.name)}
                                  fallbackText={hero.name}
                                  alt={hero.name}
                                  className="h-9 w-9 rounded-lg bg-gray-900 object-cover border border-white/[0.06]"
                                  containerClassName="h-9 w-9 rounded-lg text-[8px] bg-gray-900 border border-white/[0.06]"
                                />
                                <span className="font-sans text-[13px] text-white font-medium">
                                  {hero.name}
                                </span>
                              </div>
                              <span className="font-mono text-[11px] text-orange-400 font-bold bg-orange-950/30 px-2.5 py-1 rounded-lg border border-orange-500/10 tabular-nums">
                                {hero.count}&times;
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[13px] text-gray-500 italic font-sans py-4 text-center">Belum ada data target ban.</p>
                      )}
                    </div>

                    {/* Most Banned by us */}
                    <div className="flex flex-col gap-3.5">
                      <h4 className="text-[12px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-2.5" style={{ fontFamily: 'var(--font-display)' }}>
                        <div className="h-6 w-6 rounded-lg bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-center">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                        </div>
                        Ban Favorit Tim Ini
                      </h4>
                      {ourBansList.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          {ourBansList.map((hero, i) => (
                            <div
                              key={hero.name}
                              className="flex items-center justify-between rounded-xl bg-emerald-950/[0.04] p-3 border border-emerald-500/[0.06]"
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-[11px] text-emerald-400/60 font-bold w-5 text-center">{i + 1}</span>
                                <FallbackImage
                                  src={getHeroImg(hero.name)}
                                  fallbackText={hero.name}
                                  alt={hero.name}
                                  className="h-9 w-9 rounded-lg bg-gray-900 object-cover border border-white/[0.06]"
                                  containerClassName="h-9 w-9 rounded-lg text-[8px] bg-gray-900 border border-white/[0.06]"
                                />
                                <span className="font-sans text-[13px] text-white font-medium">
                                  {hero.name}
                                </span>
                              </div>
                              <span className="font-mono text-[11px] text-emerald-400 font-bold bg-emerald-950/30 px-2.5 py-1 rounded-lg border border-emerald-500/10 tabular-nums">
                                {hero.count}&times;
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[13px] text-gray-500 italic font-sans py-4 text-center">Belum ada data ban.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════════════ TAB 2: GAME & DRAFT HISTORY ═══════════════ */}
              {teamTab === "history" && (
                <div className="flex flex-col gap-5 animate-fade-in relative z-10">
                  {/* Filter bar */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {(["all", "win", "lose"] as const).map((f) => {
                      const label = f === "all" ? "Semua Series" : f === "win" ? `Menang${matchHistoryData ? ` (${matchHistoryData.wins})` : ''}` : `Kalah${matchHistoryData ? ` (${matchHistoryData.losses})` : ''}`;
                      return (
                        <button key={f} onClick={() => setMatchResultFilter(f)}
                          className={`px-3.5 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                            matchResultFilter === f 
                              ? f === "win" ? "bg-emerald-600 text-white" : f === "lose" ? "bg-rose-600 text-white" : "bg-indigo-600 text-white"
                              : "bg-white/[0.03] text-gray-400 hover:text-gray-200 border border-white/[0.04]"
                          }`}>
                          {label}
                        </button>
                      );
                    })}
                    <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-1 flex-wrap">
                      <CalendarDays className="ml-1 h-4 w-4 text-indigo-400" />
                      {Array.from({ length: 9 }, (_, index) => index + 1).map((week) => (
                        <button
                          key={week}
                          onClick={() => setMatchWeekFilter(matchWeekFilter === week ? null : week)}
                          className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                            matchWeekFilter === week
                              ? "bg-indigo-600 text-white"
                              : "text-gray-500 hover:bg-white/[0.04] hover:text-gray-200"
                          }`}
                        >
                          {week}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Cari lawan..."
                      value={matchOpponentFilter}
                      onChange={(e) => setMatchOpponentFilter(e.target.value)}
                      className="px-3.5 py-2 rounded-lg text-[13px] bg-white/[0.02] border border-white/[0.06] text-gray-200 placeholder-gray-500 w-40"
                    />
                    <button
                      type="button"
                      onClick={resetMatchFilters}
                      className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-2 text-[13px] font-medium text-gray-400 transition hover:text-white"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset
                    </button>
                  </div>

                  {/* Stats summary */}
                  {matchHistoryData && (
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
                      {[
                        ["Total Series", matchHistoryData.totalMatches, "text-gray-200"],
                        ["Ditampilkan", matchHistoryData.filteredMatches, "text-indigo-300"],
                        ["Wins", matchHistoryData.wins, "text-emerald-400"],
                        ["Losses", matchHistoryData.losses, "text-red-400"],
                        ["Win Rate", `${matchHistoryData.winrate}%`, "text-amber-300"],
                        ["Total Games", matchHistoryData.gamesCount, "text-gray-200"],
                        ["Game W-L", matchHistoryData.gameRecord, "text-cyan-300"],
                      ].map(([label, value, color]) => (
                        <div key={label} className="rounded-xl border border-white/[0.04] bg-white/[0.015] px-3.5 py-2.5">
                          <div className="font-mono text-[10px] uppercase text-gray-500 font-bold">{label}</div>
                          <div className={`font-mono text-sm font-black ${color} tabular-nums`}>{value}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Loading state */}
                  {loadingMatchHistory && (
                    <div className="flex flex-col gap-3">
                      {[1,2,3].map(i => (
                        <div key={i} className="h-16 bg-white/[0.02] rounded-xl animate-pulse" />
                      ))}
                    </div>
                  )}

                  {/* Empty state */}
                  {!loadingMatchHistory && matchHistoryData && matchHistoryData.series.length === 0 && (
                    <div className="text-center text-gray-500 py-16 text-[13px] flex flex-col items-center gap-3">
                      <CalendarDays className="h-10 w-10 text-gray-700" />
                      <span>Tidak ada series ditemukan untuk filter ini.</span>
                      <button type="button" onClick={resetMatchFilters} className="text-indigo-400 hover:text-indigo-300 text-[13px] font-medium mt-1">
                        Reset filter
                      </button>
                    </div>
                  )}

                  {/* Series list */}
                  {!loadingMatchHistory && matchHistoryData && matchHistoryData.series.length > 0 && (
                    <div className="flex flex-col gap-3">
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
                    <details className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-5 text-[13px] text-gray-400">
                      <summary className="cursor-pointer font-bold text-gray-300 hover:text-white flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-indigo-400" />
                        <span>Match Center — Jadwal Week 1 sampai Week 9</span>
                        <span className="ml-auto text-[11px] font-mono text-gray-600">
                          {matchCenterData.totalSeries} series &bull; {matchCenterData.totalGames} games
                        </span>
                      </summary>
                      <div className="mt-4 space-y-5">
                        {visibleWeekGroups.map((week) => (
                          <div key={week.week} className="rounded-xl border border-white/[0.04] bg-black/30 p-4">
                            <h4 className="mb-3 font-sans text-sm font-bold text-indigo-300 flex items-center gap-2">
                              <span className="rounded-lg bg-indigo-950/50 px-2.5 py-1 text-[11px] font-mono border border-indigo-500/20">
                                WEEK {week.week}
                              </span>
                              <span className="text-[11px] font-mono text-gray-600">
                                {week.days.reduce((sum, d) => sum + d.series.length, 0)} series
                              </span>
                            </h4>
                            <div className="space-y-4">
                              {week.days.map((day) => (
                                <div key={`${week.week}-${day.day}`}>
                                  <div className="mb-2 flex items-center gap-2 border-b border-white/[0.04] pb-1.5">
                                    <span className="font-mono text-[11px] font-bold uppercase text-gray-400">
                                      Day {day.day}
                                    </span>
                                    {day.series[0]?.date && (
                                      <span className="text-[10px] font-mono text-gray-600">
                                        — {day.series[0].date}
                                      </span>
                                    )}
                                  </div>
                                  <div className="grid gap-2">
                                    {day.series.map((seriesItem) => {
                                      const isSelectedTeamA = selectedTeam && seriesItem.teamA === selectedTeam.key;
                                      const isSelectedTeamB = selectedTeam && seriesItem.teamB === selectedTeam.key;
                                      const isInvolved = isSelectedTeamA || isSelectedTeamB;
                                      const selectedWon = isInvolved && (
                                        (isSelectedTeamA && seriesItem.teamAScore > seriesItem.teamBScore) ||
                                        (isSelectedTeamB && seriesItem.teamBScore > seriesItem.teamAScore)
                                      );
                                      return (
                                        <div
                                          key={seriesItem.seriesId}
                                          className={`flex items-center gap-3 rounded-xl px-4 py-2.5 transition ${
                                            isInvolved
                                              ? selectedWon
                                                ? "bg-emerald-950/20 border border-emerald-500/15"
                                                : "bg-rose-950/20 border border-rose-500/15"
                                              : "bg-white/[0.015] border border-white/[0.04]"
                                          }`}
                                        >
                                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                            <img
                                              src={getTeamLogoImg(seriesItem.teamA)}
                                              alt={seriesItem.teamA}
                                              className="h-5 w-5 object-contain"
                                            />
                                            <span className={`text-[12px] font-bold truncate ${
                                              seriesItem.teamAScore > seriesItem.teamBScore ? "text-white" : "text-gray-500"
                                            }`}>
                                              {seriesItem.teamA}
                                            </span>
                                          </div>
                                          <div className="rounded-lg bg-black/40 border border-white/[0.06] px-3 py-1 font-mono text-[13px] font-black text-white shrink-0 tabular-nums">
                                            {seriesItem.teamAScore} - {seriesItem.teamBScore}
                                          </div>
                                          <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end">
                                            <span className={`text-[12px] font-bold truncate text-right ${
                                              seriesItem.teamBScore > seriesItem.teamAScore ? "text-white" : "text-gray-500"
                                            }`}>
                                              {seriesItem.teamB}
                                            </span>
                                            <img
                                              src={getTeamLogoImg(seriesItem.teamB)}
                                              alt={seriesItem.teamB}
                                              className="h-5 w-5 object-contain"
                                            />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {matchHistoryError && (
                    <div className="text-center text-red-400 py-4 text-[13px]">
                      Error: {matchHistoryError}
                    </div>
                  )}

                </div>
              )}

              {/* ═══════════════ TAB 3: TACTICAL & TRENDS ═══════════════ */}
              {teamTab === "trends" && (
                <div className="flex flex-col gap-6 animate-fade-in text-gray-300 leading-relaxed text-[13px] relative z-10">
                  <div className="p-5 bg-white/[0.015] rounded-xl border border-white/[0.04] flex flex-col gap-4">
                    <h4 className="text-[13px] font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/[0.04] pb-3 font-sans">
                      <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
                      Gaya Bermain & Kecenderungan Draf (Tournament Draft Assessment)
                    </h4>
                    
                    <div className="space-y-4 font-sans text-[12px] text-gray-400 leading-relaxed">
                      <p>
                        Berdasarkan integrasi data taktis dari {teamMatches.length} pertandingan turnamen, tim <strong className="text-white font-bold">{selectedTeam.name}</strong> menunjukkan karakteristik draft yang berbeda dari comfort pool, target ban, dan performa sisi.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                        <div className="bg-black/30 p-4 rounded-xl border border-white/[0.04] flex flex-col gap-2">
                          <span className="text-white font-bold block text-[13px] flex items-center gap-1.5">
                            <Zap className="h-3.5 w-3.5 text-indigo-400" /> Draft Identity
                          </span>
                          <p className="text-[11px] text-gray-500">
                            Pembacaan pola utama dari hero comfort yang paling sering mereka kembalikan:
                          </p>
                          <span className="font-mono text-[13px] font-bold text-emerald-400 uppercase">
                            {tacticalRead?.style || "Belum terbaca"}
                          </span>
                        </div>

                        <div className="bg-black/30 p-4 rounded-xl border border-white/[0.04] flex flex-col gap-2">
                          <span className="text-white font-bold block text-[13px] flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Side Preference
                          </span>
                          <p className="text-[11px] text-gray-500">
                            Kecenderungan performa saat blue/red side:
                          </p>
                          <span className="text-[12px] text-indigo-300 leading-relaxed">
                            {tacticalRead?.sideRead || "Belum terbaca"}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-4">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">Comfort Core</div>
                          <div className="mt-2 text-[12px] text-gray-300 leading-relaxed">
                            {tacticalRead?.opener || "Belum ada data."}
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-4">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-rose-300">Enemy Respect Ban</div>
                          <div className="mt-2 text-[12px] text-gray-300 leading-relaxed">
                            {tacticalRead?.denial || "Belum ada data."}
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-4">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300">Prep Ban Plan</div>
                          <div className="mt-2 text-[12px] text-gray-300 leading-relaxed">
                            {tacticalRead?.prep || "Belum ada data."}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Top Contested tournament-wide table */}
                  <div className="border-t border-white/[0.04] pt-4">
                    <h4 className="font-sans text-[13px] font-semibold text-gray-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                      <LineChart className="h-4 w-4 text-indigo-400" />
                      Hero Paling Diwaspadai Turnamen (Tournament Contested Rate)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {overallContestedList.map((item, i) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                        >
                          <div className="flex items-center gap-3">
                            <FallbackImage
                              src={getHeroImg(item.name)}
                              fallbackText={item.name}
                              className="h-9 w-9 rounded-lg object-cover border border-white/[0.06]"
                              containerClassName="h-9 w-9 rounded-lg text-[8px] bg-gray-900 border border-white/[0.06]"
                            />
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[13px] font-sans text-white font-bold">
                                {item.name}
                              </span>
                              <span className="text-[10px] font-sans text-gray-500 font-semibold uppercase">
                                {item.picks} Picks &bull; {item.bans} Bans
                              </span>
                            </div>
                          </div>
                          <span className="font-mono text-[12px] font-bold text-orange-400 bg-orange-950/30 px-2.5 py-1 rounded-lg border border-orange-500/10 tabular-nums">
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
              <Award className="h-12 w-12 mb-3 opacity-30 animate-bounce" />
              <p className="text-[15px] font-sans text-gray-500 pl-2 max-w-sm">
                Pilih salah satu tim franchise di sebelah kiri untuk menganalisis taktik draf, rekam jejak draf, dan history match.
              </p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
