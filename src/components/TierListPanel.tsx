import React, { useState, useMemo } from "react";
import { HeroStats } from "../types";
import { Award, Search } from "lucide-react";
import { getHeroImageUrl } from "../lib/heroUtils";
import FallbackImage from "./FallbackImage";

interface TierListPanelProps {
  heroes: HeroStats[];
  heroAssets: Record<string, string>;
}

const TIERS = ["S+", "S", "A", "B", "C", "D"] as const;

export default function TierListPanel({ heroes, heroAssets }: TierListPanelProps) {
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [laneFilter, setLaneFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const roles = ["ALL", "Assassin", "Fighter", "Mage", "Marksman", "Support", "Tank"];
  const lanes = ["ALL", "Jungle", "EXP Lane", "Mid Lane", "Gold Lane", "Roamer"];

  // Filter heroes
  const filteredHeroes = useMemo(() => {
    return heroes.filter((hero) => {
      const nameMatch = hero.hero_name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const roleMatch =
        roleFilter === "ALL" ||
        (Array.isArray(hero.role) && hero.role.includes(roleFilter)) ||
        hero.role === roleFilter;

      const laneMatch =
        laneFilter === "ALL" ||
        (Array.isArray(hero.lanes) && hero.lanes.includes(laneFilter)) ||
        hero.lane === laneFilter;

      return nameMatch && roleMatch && laneMatch;
    });
  }, [heroes, searchQuery, roleFilter, laneFilter]);

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
        // Fallback to closest mapping
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
      case "S+": return "Metagame Demigods (First Pick or Permaban)";
      case "S":  return "Highly Dominant Strategy Builders";
      case "A":  return "Strong Competitive Backbone Picks";
      case "B":  return "Balanced & Dependable Comfort Selections";
      case "C":  return "Situational & Pocket Deception Picks";
      default:   return "Low Efficiency / Requires Extreme Team Synergy";
    }
  };

  return (
    <div className="space-y-6 page-enter">
      {/* Top Heading */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-900/35 pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white flex items-center gap-2 tracking-tight">
            <Award className="h-6 w-6 text-[#f0b429]" />
            NEXUS COMPETITIVE TIER LIST
          </h2>
          <p className="font-mono text-[10px] text-blue-400 font-bold tracking-wider uppercase mt-1">
            MAPPING META PRIORITIES FOR PATCH 2.1.61
          </p>
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
                    Priority Tier
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
                        <div
                          key={h.id}
                          className="flex items-center gap-2.5 p-1.5 bg-gray-950/25 border border-white/5 rounded-lg hover:border-blue-500/20 transition-all duration-200"
                        >
                          <div className="relative h-9 w-9 overflow-hidden rounded-md border border-white/5 shrink-0">
                            <FallbackImage src={img} fallbackText={h.hero_name} className="h-full w-full object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-sans text-xs font-bold text-gray-100 truncate">
                              {h.hero_name}
                            </h4>
                            <p className="font-mono text-[8px] text-emerald-400 font-bold">
                              WR {h.win_rate ? `${h.win_rate}%` : h.winrate ? h.winrate : "50.0%"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
