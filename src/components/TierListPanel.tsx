import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { HeroStats } from "../types";
import { DetailedHero } from "../types/hero";
import { ArrowLeft, Award, Search } from "lucide-react";
import { getHeroImageUrl } from "../lib/heroUtils";
import FallbackImage from "./FallbackImage";
import HeroDetailPanel from "./HeroDetailPanel";
import heroesMaster from "../data/heroes_master.json";

interface TierListPanelProps {
  heroes: HeroStats[];
  heroAssets: Record<string, string>;
}

type TierMode = "mpl" | "global";

const TIERS = ["S+", "S", "A", "B", "C", "D"] as const;

// Lane normalization: map filter label to all possible equivalent data values
const LANE_ALIASES: Record<string, string[]> = {
  "Jungle": ["Jungle", "Jungler"],
  "EXP Lane": ["EXP Lane", "EXP"],
  "Mid Lane": ["Mid Lane", "Mid"],
  "Gold Lane": ["Gold Lane", "Gold"],
  "Roamer": ["Roam", "Roamer", "Roam Lane"],
};

function matchesLane(heroLanes: any, heroLane: any, filterValue: string): boolean {
  if (filterValue === "ALL") return true;
  const aliases = LANE_ALIASES[filterValue] || [filterValue];
  const lanesToCheck: string[] = [];
  if (Array.isArray(heroLanes)) lanesToCheck.push(...heroLanes);
  if (typeof heroLane === "string" && heroLane) lanesToCheck.push(heroLane);
  return lanesToCheck.some(l => aliases.includes(l));
}

interface GlobalRankData {
  source: string;
  source_url: string;
  source_updated_at: string | null;
  time_range: string;
  rank_filter: string;
  heroes: Array<{
    hero_name: string;
    rank: number;
    win_rate: number;
    pick_rate: number;
    ban_rate: number;
    tier: string;
  }>;
  available: boolean;
}

export default function TierListPanel({ heroes, heroAssets }: TierListPanelProps) {
  const [mode, setMode] = useState<TierMode>("mpl");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [laneFilter, setLaneFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [detailHero, setDetailHero] = useState<DetailedHero | null>(null);
  const detailedHeroesCache = useRef<DetailedHero[]>([]);

  // Global rank data cache
  const [globalData, setGlobalData] = useState<GlobalRankData | null>(null);
  const [globalLoading, setGlobalLoading] = useState(false);
  const globalFetched = useRef(false);

  useEffect(() => {
    if (mode === "global" && !globalFetched.current) {
      globalFetched.current = true;
      setGlobalLoading(true);
      fetch("/api/global-rank-stats")
        .then(r => r.json())
        .then(data => setGlobalData(data))
        .catch(() => setGlobalData({ source: "", source_url: "", source_updated_at: null, time_range: "", rank_filter: "", heroes: [], available: false }))
        .finally(() => setGlobalLoading(false));
    }
  }, [mode]);

  const openHeroDetail = useCallback(async (heroName: string) => {
    if (detailedHeroesCache.current.length === 0) {
      try {
        const res = await fetch("/api/heroes");
        const data = await res.json();
        detailedHeroesCache.current = Array.isArray(data) ? data : [];
      } catch { return; }
    }
    const found = detailedHeroesCache.current.find((h: any) => {
      const name = (h.hero_name || h.name || h.heroName || "").toLowerCase();
      return name === heroName.toLowerCase();
    });
    if (found) setDetailHero(found);
  }, []);

  const roles = ["ALL", "Assassin", "Fighter", "Mage", "Marksman", "Support", "Tank"];
  const lanes = ["ALL", "Jungle", "EXP Lane", "Mid Lane", "Gold Lane", "Roamer"];

  // MPL mode hero pool (existing logic)
  const mplHeroPool = useMemo(() => {
    const statsMap = new Map(
      heroes.map((hero) => [String(hero.hero_name || "").toLowerCase(), hero])
    );

    return (heroesMaster as Array<any>).map((master) => {
      const stats = statsMap.get(String(master.hero_name || "").toLowerCase());
      const picks = Number(stats?.picks_total || 0);
      const bans = Number(stats?.bans_total || 0);
      const winRate = Number(stats?.win_rate ?? stats?.winrate ?? 0);
      const presence = Number(stats?.tournament_presence || 0);
      const totalImpact = picks + bans;

      let derivedTier = "C";
      if (presence >= 55 || totalImpact >= 28) derivedTier = "S+";
      else if (presence >= 40 || totalImpact >= 22) derivedTier = "S";
      else if (presence >= 24 || totalImpact >= 14) derivedTier = "A";
      else if (presence >= 12 || totalImpact >= 8) derivedTier = "B";
      else if (presence >= 5 || totalImpact >= 3) derivedTier = "C";
      else derivedTier = "D";

      return {
        hero_name: master.hero_name,
        id: stats?.id || String(master.hero_id || master.hero_name),
        role: master.role || stats?.role,
        lane: master.lane || stats?.lane,
        lanes: master.lanes || stats?.lanes,
        tier: derivedTier,
        win_rate: winRate,
        winrate: stats?.winrate || String(winRate),
        picks_total: String(picks),
        bans_total: String(bans),
        tournament_presence: String(presence),
      } as HeroStats;
    });
  }, [heroes]);

  // Global Rank mode hero pool
  const globalHeroPool = useMemo(() => {
    if (!globalData?.available || !globalData.heroes?.length) return [];

    const masterMap = new Map(
      (heroesMaster as Array<any>).map(m => [m.hero_name.toLowerCase(), m])
    );

    return globalData.heroes.map((gh) => {
      const master = masterMap.get(gh.hero_name.toLowerCase());
      return {
        hero_name: gh.hero_name,
        id: master ? String(master.hero_id || gh.hero_name) : gh.hero_name,
        role: master?.role,
        lane: master?.lane,
        lanes: master?.lanes,
        tier: gh.tier,
        win_rate: gh.win_rate,
        winrate: `${gh.win_rate}%`,
        picks_total: `${gh.pick_rate}%`,
        bans_total: `${gh.ban_rate}%`,
        tournament_presence: String(gh.rank),
      } as HeroStats;
    });
  }, [globalData]);

  const fullHeroPool = mode === "mpl" ? mplHeroPool : globalHeroPool;

  // Filter heroes
  const filteredHeroes = useMemo(() => {
    return fullHeroPool.filter((hero) => {
      const nameMatch = hero.hero_name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const roleMatch =
        roleFilter === "ALL" ||
        (Array.isArray(hero.role) && hero.role.includes(roleFilter)) ||
        hero.role === roleFilter;

      const laneMatch = matchesLane(hero.lanes, hero.lane, laneFilter);

      return nameMatch && roleMatch && laneMatch;
    });
  }, [fullHeroPool, searchQuery, roleFilter, laneFilter]);

  // Group filtered heroes by tier rating
  const groupedByTier = useMemo(() => {
    const groups: Record<string, HeroStats[]> = {
      "S+": [],
      "S": [],
      "A": [],
      "B": [],
      "C": [],
      "D": []
    };

    filteredHeroes.forEach((h) => {
      let tr = String(h.tier || "B").toUpperCase().trim();
      if (tr === "S_PLUS" || tr === "S+" || tr === "SS") {
        tr = "S+";
      }
      if (!groups[tr]) {
        if (tr.includes("S")) groups["S"].push(h);
        else groups["B"].push(h);
      } else {
        groups[tr].push(h);
      }
    });

    return groups;
  }, [filteredHeroes]);

  const getTierClass = (tier: string) => {
    switch (tier) {
      case "S+": return "tier-s-plus glow-gold font-display text-2xl font-black";
      case "S":  return "tier-s font-display text-xl font-extrabold";
      case "A":  return "tier-a font-display text-xl font-bold";
      case "B":  return "tier-b font-display text-xl font-bold";
      case "C":  return "tier-c font-display text-xl font-medium";
      default:   return "tier-d font-display text-xl font-medium";
    }
  };

  const getTierDesc = (tier: string) => {
    switch (tier) {
      case "S+": return "Meta Priority — Hero prioritas tinggi. Layak first pick, contest pick, atau ban karena impact-nya besar di meta.";
      case "S":  return "Strong Pick — Hero kuat dan stabil. Cocok jadi pilihan utama jika S+ sudah di-ban atau tidak cocok dengan draft.";
      case "A":  return "Situational Pick — Hero bagus dalam kondisi tertentu. Kuat jika draft, role, dan matchup mendukung.";
      case "B":  return "Playable Pick — Masih bisa dipakai, terutama sebagai comfort pick atau counter situasional, tapi bukan prioritas utama meta.";
      case "C":  return "Off Meta — Jarang jadi prioritas. Butuh setup khusus, pilot kuat, atau kondisi draft tertentu agar efektif.";
      default:   return "Low Priority / No Data — Prioritas rendah atau minim data performa. Tidak otomatis buruk, tapi belum terbukti kuat di data saat ini.";
    }
  };

  return (
    <div className="space-y-6 page-enter">
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
          Tier List
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex items-center gap-2 bg-[#0a111f]/60 border border-blue-900/20 rounded-xl p-2">
        <button
          onClick={() => setMode("mpl")}
          className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
            mode === "mpl"
              ? "bg-blue-600/20 text-blue-300 border border-blue-500/35"
              : "text-gray-400 hover:text-white hover:bg-[#121c33]"
          }`}
        >
          MPL Pro Meta
        </button>
        <button
          onClick={() => setMode("global")}
          className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
            mode === "global"
              ? "bg-purple-600/20 text-purple-300 border border-purple-500/35"
              : "text-gray-400 hover:text-white hover:bg-[#121c33]"
          }`}
        >
          Global Rank Meta
        </button>
      </div>

      {/* Top Heading */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-900/35 pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white flex items-center gap-2 tracking-tight">
            <Award className="h-6 w-6 text-[#f0b429]" />
            NEXUS COMPETITIVE TIER LIST
          </h2>
          <p className="font-mono text-[10px] text-blue-400 font-bold tracking-wider uppercase mt-1">
            {mode === "mpl" ? "MAPPING META PRIORITIES FOR PATCH 2.1.61" : "GLOBAL RANK WIN/PICK/BAN RATES"}
          </p>
          {/* Source Badge */}
          <div className="mt-2">
            {mode === "mpl" ? (
              <span className="inline-block text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-blue-950/40 border border-blue-900/30 text-blue-400">
                Source: Liquipedia MPL ID S17
              </span>
            ) : (
              <span className="inline-block text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-purple-950/40 border border-purple-900/30 text-purple-400">
                Source: Moonton Global Rank {globalData?.source_updated_at ? `(updated: ${new Date(globalData.source_updated_at).toLocaleDateString()})` : ''}
              </span>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-gray-500" />
          </span>
          <input
            type="text"
            className="w-full pl-9 pr-4 py-2 bg-[#090f1d] border border-blue-900/30 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
            placeholder="Search meta hero..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Global mode: loading/empty states */}
      {mode === "global" && globalLoading && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-sm animate-pulse">Loading Global Rank data...</p>
        </div>
      )}

      {mode === "global" && !globalLoading && (!globalData?.available) && (
        <div className="text-center py-12">
          <p className="text-sm text-gray-400 mb-1">Global Rank data belum disinkronkan. Jalankan npm run sync:global-rank di terminal.</p>
          <p className="text-xs text-gray-600">Data akan tersimpan di data/global_rank_stats.json.</p>
        </div>
      )}

      {/* Show content when data is available */}
      {(mode === "mpl" || (mode === "global" && globalData?.available)) && (
        <>
          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#0a111f]/60 border border-blue-900/20 rounded-xl p-4">
            {/* Role Filters */}
            <div>
              <label className="block text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest mb-2">
                Filter Role
              </label>
              <div className="flex flex-wrap gap-1.5">
                {roles.map((role) => (
                  <button
                    key={role}
                    onClick={() => setRoleFilter(role)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200 ${
                      roleFilter === role
                        ? "bg-blue-600/20 text-blue-300 border border-blue-500/35"
                        : "bg-[#090f1d] text-gray-400 border border-transparent hover:text-white hover:bg-[#121c33]"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* Lane Filters */}
            <div>
              <label className="block text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest mb-2">
                Filter Lane
              </label>
              <div className="flex flex-wrap gap-1.5">
                {lanes.map((lane) => (
                  <button
                    key={lane}
                    onClick={() => setLaneFilter(lane)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200 ${
                      laneFilter === lane
                        ? "bg-blue-600/20 text-blue-300 border border-blue-500/35"
                        : "bg-[#090f1d] text-gray-400 border border-transparent hover:text-white hover:bg-[#121c33]"
                    }`}
                  >
                    {lane}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tier List Grid Stack */}
          <div className="space-y-4">
            {TIERS.map((tier) => {
              const list = groupedByTier[tier] || [];
              return (
                <div
                  key={tier}
                  className="glass-card flex flex-col md:flex-row shadow-lg shadow-black/40 overflow-hidden"
                >
                  {/* Left Side: Tier Sticker Panel */}
                  <div className="w-full md:w-36 flex flex-col items-center justify-center p-5 text-center bg-gray-950/45 border-b md:border-b-0 md:border-r border-blue-900/15 shrink-0 gap-1.5">
                    <div className={`h-14 w-14 flex items-center justify-center rounded-xl shadow-inner ${getTierClass(tier)}`}>
                      {tier}
                    </div>
                    <div className="hidden md:block">
                      <div className="font-sans text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-tight">
                        Tier
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Heroes Row List */}
                  <div className="flex-1 p-5 flex flex-col justify-center">
                    <div className="font-mono text-[9px] text-gray-500 tracking-wider uppercase mb-3">
                      {getTierDesc(tier)} ({list.length} heroes)
                    </div>

                    {list.length === 0 ? (
                      <div className="py-4 text-xs font-mono text-gray-600">
                        No matching heroes in this priority tier block.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {list.map((h) => {
                          const img = getHeroImageUrl(h.hero_name, heroAssets);
                          return (
                            <button
                              key={h.id}
                              onClick={() => openHeroDetail(h.hero_name)}
                              className="flex items-center gap-2.5 p-1.5 bg-gray-950/25 border border-white/5 rounded-lg hover:border-blue-500/30 hover:bg-blue-950/10 transition-all duration-200 text-left cursor-pointer group"
                            >
                              <div className="relative h-9 w-9 overflow-hidden rounded-md border border-white/5 shrink-0 group-hover:scale-105 transition-transform duration-200">
                                <FallbackImage src={img} fallbackText={h.hero_name} className="h-full w-full object-cover" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-sans text-xs font-bold text-gray-100 truncate group-hover:text-blue-300 transition-colors">
                                  {h.hero_name}
                                </h4>
                                {mode === "mpl" ? (
                                  <>
                                    <p className="font-mono text-[8px] text-emerald-400 font-bold">
                                      WR {h.win_rate ? `${h.win_rate}%` : h.winrate ? h.winrate : "0%"}
                                    </p>
                                    <p className="font-mono text-[8px] text-cyan-400/80 font-bold">
                                      P {h.picks_total || "0"} • B {h.bans_total || "0"}
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <p className="font-mono text-[8px] text-emerald-400 font-bold">
                                      WR {h.win_rate}%
                                    </p>
                                    <p className="font-mono text-[8px] text-cyan-400/80 font-bold">
                                      PR {h.picks_total} • BR {h.bans_total}
                                    </p>
                                  </>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Hero Detail Panel (inline modal) */}
      {detailHero && (
        <HeroDetailPanel
          hero={detailHero}
          onClose={() => setDetailHero(null)}
          heroAssets={heroAssets}
        />
      )}
    </div>
  );
}
