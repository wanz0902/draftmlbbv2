import React, { useState, useMemo } from "react";
import { HeroStats } from "../types";
import { ArrowLeft, Search, Flame, ShieldAlert, Users, Compass, ShieldCheck, Star, Link2 } from "lucide-react";
import { getHeroImageUrl } from "../lib/heroUtils";
import FallbackImage from "./FallbackImage";

interface CounterMatrixPanelProps {
  heroes: HeroStats[];
  heroAssets: Record<string, string>;
  onOpenHeroIntelligence?: (heroName: string) => void;
}

export default function CounterMatrixPanel({ heroes, heroAssets, onOpenHeroIntelligence }: CounterMatrixPanelProps) {
  const [selectedHeroId, setSelectedHeroId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const sortedHeroesList = useMemo(() => {
    return [...heroes].sort((a, b) => a.hero_name.localeCompare(b.hero_name));
  }, [heroes]);

  const currentHero = useMemo(() => {
    if (!selectedHeroId) {
      const first = sortedHeroesList[0];
      return first || null;
    }
    return sortedHeroesList.find((h) => h.id === selectedHeroId) || null;
  }, [selectedHeroId, sortedHeroesList]);

  const eligibleSelectorHeroes = useMemo(() => {
    if (!searchQuery) return sortedHeroesList;
    const q = searchQuery.toLowerCase();
    return sortedHeroesList.filter((h) => h.hero_name.toLowerCase().includes(q));
  }, [searchQuery, sortedHeroesList]);

  const strongAgainstList = useMemo(() => {
    if (!currentHero) return [];
    return Array.isArray(currentHero.counters) ? currentHero.counters : [];
  }, [currentHero]);

  const weakAgainstList = useMemo(() => {
    if (!currentHero) return [];
    return Array.isArray(currentHero.countered_by) ? currentHero.countered_by : [];
  }, [currentHero]);

  const synergyList = useMemo(() => {
    if (!currentHero) return [];
    return Array.isArray(currentHero.synergies) ? currentHero.synergies : [];
  }, [currentHero]);

  const handlePivot = (heroName: string) => {
    const found = heroes.find(
      (h) => h.hero_name.toLowerCase().trim() === heroName.toLowerCase().trim()
    );
    if (found) {
      setSelectedHeroId(found.id);
      setSearchQuery("");
    }
  };

  if (!currentHero) {
    return (
      <div className="py-20 text-center font-mono text-gray-500 animate-pulse text-xs uppercase tracking-widest leading-relaxed">
        Sourcing counter data for 132 heroes...
      </div>
    );
  }

  const currentImg = getHeroImageUrl(currentHero.hero_name, heroAssets);

  return (
    <div className="space-y-6">
      {/* Selector + Hero Profile */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Hero Selector (all 132) */}
        <div className="w-full lg:w-72 shrink-0 bg-[#0a111f]/60 border border-white/[0.06] rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-cyan-400" />
            <h3 className="font-display text-sm font-bold text-white">Select Hero</h3>
            <span className="ml-auto font-mono text-[10px] text-gray-500">{heroes.length}</span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
            <input
              type="text"
              className="w-full pl-8 pr-3 py-2 bg-[#090f1d] border border-white/[0.06] rounded-lg text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-cyan-500/40 transition-colors"
              placeholder="Search hero..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="space-y-0.5 max-h-[50vh] overflow-y-auto scrollbar-thin pr-1">
            {eligibleSelectorHeroes.map((h) => {
              const active = h.id === currentHero.id;
              const img = getHeroImageUrl(h.hero_name, heroAssets);
              const count = Array.isArray(h.counters) ? h.counters.length : 0;
              return (
                <button
                  key={h.id}
                  onClick={() => { setSelectedHeroId(h.id); setSearchQuery(""); }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-all duration-100 ${
                    active
                      ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-300"
                      : "border border-transparent text-gray-400 hover:bg-white/[0.03] hover:text-gray-200"
                  }`}
                >
                  <div className="h-6 w-6 rounded overflow-hidden shrink-0 border border-white/5">
                    <FallbackImage src={img} fallbackText={h.hero_name} className="h-full w-full object-cover" />
                  </div>
                  <span className="text-xs truncate flex-1">{h.hero_name}</span>
                  {count > 0 && (
                    <span className="font-mono text-[9px] text-gray-600 shrink-0">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Hero Profile Card */}
        <div className="flex-1 glass-card p-6 flex flex-col sm:flex-row gap-6">
          <div className="sm:w-48 flex flex-col items-center text-center gap-3 shrink-0">
            <div className="relative h-20 w-20 overflow-hidden rounded-2xl border-2 border-cyan-400/30 shadow-lg shadow-cyan-400/5">
              <FallbackImage src={currentImg} fallbackText={currentHero.hero_name} className="h-full w-full object-cover" />
            </div>
            <div>
              <h2 className="text-lg font-display font-black text-white">{currentHero.hero_name}</h2>
              <p className="font-mono text-[9px] text-cyan-400 font-bold tracking-widest mt-0.5 uppercase">
                {Array.isArray(currentHero.role) ? currentHero.role.join(" / ") : currentHero.role || "Fighter"}
              </p>
            </div>
            <div className="w-full border-t border-white/5 pt-2 space-y-1 text-left font-mono text-[10px]">
              <div className="flex justify-between">
                <span className="text-gray-500">Win Rate</span>
                <span className="text-emerald-400 font-bold">{currentHero.win_rate ? `${currentHero.win_rate}%` : currentHero.winrate || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Pick Rate</span>
                <span className="text-blue-400 font-bold">{currentHero.pick_rate ? `${currentHero.pick_rate}%` : currentHero.picks_total || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Presence</span>
                <span className="text-purple-400 font-bold">{currentHero.tournament_presence || "—"}%</span>
              </div>
            </div>
            {onOpenHeroIntelligence && (
              <button
                onClick={() => onOpenHeroIntelligence(currentHero.hero_name)}
                className="flex items-center gap-1.5 text-[10px] text-cyan-400 hover:text-cyan-300 font-mono transition-colors"
              >
                <Link2 className="h-3 w-3" />
                Full Intelligence
              </button>
            )}
          </div>

          <div className="flex-1 flex flex-col justify-between gap-4">
            <div>
              <div className="font-mono text-[9px] text-gray-500 uppercase tracking-widest">Counter Matchup Board</div>
              <h2 className="text-xl font-display font-extrabold text-white mt-1 leading-tight uppercase">
                Matchup Matrix: {currentHero.hero_name}
              </h2>
              <p className="text-xs text-gray-400 leading-relaxed mt-2 p-3 bg-white/[0.02] border border-white/[0.04] rounded-lg">
                Klik hero matchup mana saja di bawah untuk pivot ke profil hero tersebut. Data dari {strongAgainstList.length + weakAgainstList.length + synergyList.length} matchup teridentifikasi.
              </p>
            </div>

            <div className="border-t border-white/5 pt-3">
              <h4 className="font-display text-xs font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                TACTICAL ENGAGEMENT NOTES
              </h4>
              <p className="text-[11px] text-gray-400 leading-relaxed mt-1">
                Prioritas saat counter-draft {currentHero.hero_name}: batasi mobilitas, paksa cooldown sebelum objektif, dan hindari pick yang rentan terhadap skill-set utamanya.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tri-Column Matchup Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Strong Against */}
        <div className="bg-[#0a111f]/60 border border-emerald-500/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-emerald-500/10">
              <Flame className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <h4 className="font-display text-xs font-bold text-white uppercase">Strong Against</h4>
              <p className="font-mono text-[8px] text-emerald-500 uppercase tracking-widest">{strongAgainstList.length} counters</p>
            </div>
          </div>
          {strongAgainstList.length === 0 ? (
            <div className="p-4 text-center border border-dashed border-white/5 rounded-lg text-[10px] font-mono text-gray-600">No data</div>
          ) : (
            <div className="space-y-1.5">
              {strongAgainstList.map((heroName) => (
                <button
                  key={heroName}
                  onClick={() => handlePivot(heroName)}
                  className="w-full flex items-center gap-2.5 p-2 bg-white/[0.02] border border-emerald-500/10 rounded-lg text-left hover:border-emerald-500/25 hover:bg-emerald-500/5 transition-colors cursor-pointer"
                >
                  <FallbackImage fallbackText={heroName} className="h-6 w-6 rounded overflow-hidden shrink-0" />
                  <span className="text-xs text-gray-200 font-medium capitalize truncate">{heroName}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Weak Against */}
        <div className="bg-[#0a111f]/60 border border-rose-500/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-rose-500/10">
              <ShieldAlert className="h-4 w-4 text-rose-400" />
            </div>
            <div>
              <h4 className="font-display text-xs font-bold text-white uppercase">Countered By</h4>
              <p className="font-mono text-[8px] text-rose-500 uppercase tracking-widest">{weakAgainstList.length} threats</p>
            </div>
          </div>
          {weakAgainstList.length === 0 ? (
            <div className="p-4 text-center border border-dashed border-white/5 rounded-lg text-[10px] font-mono text-gray-600">No data</div>
          ) : (
            <div className="space-y-1.5">
              {weakAgainstList.map((heroName) => (
                <button
                  key={heroName}
                  onClick={() => handlePivot(heroName)}
                  className="w-full flex items-center gap-2.5 p-2 bg-white/[0.02] border border-rose-500/10 rounded-lg text-left hover:border-rose-500/25 hover:bg-rose-500/5 transition-colors cursor-pointer"
                >
                  <FallbackImage fallbackText={heroName} className="h-6 w-6 rounded overflow-hidden shrink-0" />
                  <span className="text-xs text-gray-200 font-medium capitalize truncate">{heroName}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Synergies */}
        <div className="bg-[#0a111f]/60 border border-blue-500/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-blue-500/10">
              <Users className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <h4 className="font-display text-xs font-bold text-white uppercase">Best Teammates</h4>
              <p className="font-mono text-[8px] text-blue-500 uppercase tracking-widest">{synergyList.length} synergies</p>
            </div>
          </div>
          {synergyList.length === 0 ? (
            <div className="p-4 text-center border border-dashed border-white/5 rounded-lg text-[10px] font-mono text-gray-600">No data</div>
          ) : (
            <div className="space-y-1.5">
              {synergyList.map((heroName) => (
                <button
                  key={heroName}
                  onClick={() => handlePivot(heroName)}
                  className="w-full flex items-center gap-2.5 p-2 bg-white/[0.02] border border-blue-500/10 rounded-lg text-left hover:border-blue-500/25 hover:bg-blue-500/5 transition-colors cursor-pointer"
                >
                  <FallbackImage fallbackText={heroName} className="h-6 w-6 rounded overflow-hidden shrink-0" />
                  <span className="text-xs text-gray-200 font-medium capitalize truncate">{heroName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
