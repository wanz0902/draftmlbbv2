import React, { useState, useMemo } from "react";
import { HeroStats } from "../types";
import { Search, Flame, ShieldAlert, Users, Compass, ShieldCheck } from "lucide-react";
import { getHeroImageUrl } from "../lib/heroUtils";
import FallbackImage from "./FallbackImage";

interface CounterMatrixPanelProps {
  heroes: HeroStats[];
  heroAssets: Record<string, string>;
}

export default function CounterMatrixPanel({ heroes, heroAssets }: CounterMatrixPanelProps) {
  const [selectedHeroId, setSelectedHeroId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Sort heroes alphabetically for dropdown
  const sortedHeroesList = useMemo(() => {
    return [...heroes].sort((a, b) => a.hero_name.localeCompare(b.hero_name));
  }, [heroes]);

  // Selected hero details
  const currentHero = useMemo(() => {
    if (!selectedHeroId) {
      // Default to first hero like Chou if list exists
      const chou = sortedHeroesList.find((h) => h.hero_name.toLowerCase().includes("chou"));
      return chou || sortedHeroesList[0] || null;
    }
    return sortedHeroesList.find((h) => h.id === selectedHeroId) || null;
  }, [selectedHeroId, sortedHeroesList]);

  // Searched heroes for selector
  const eligibleSelectorHeroes = useMemo(() => {
    if (!searchQuery) return sortedHeroesList.slice(0, 10);
    return sortedHeroesList
      .filter((h) => h.hero_name.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 12);
  }, [searchQuery, sortedHeroesList]);

  // Safe JSON extraction of counter systems
  const strongAgainstList = useMemo(() => {
    if (!currentHero) return [];
    if (Array.isArray(currentHero.counters)) return currentHero.counters;
    return [];
  }, [currentHero]);

  const weakAgainstList = useMemo(() => {
    if (!currentHero) return [];
    if (Array.isArray(currentHero.countered_by)) return currentHero.countered_by;
    return [];
  }, [currentHero]);

  const synergyList = useMemo(() => {
    if (!currentHero) return [];
    if (Array.isArray(currentHero.synergies)) return currentHero.synergies;
    return [];
  }, [currentHero]);

  // Pivot handler (click on counter list hero)
  const handlePivot = (heroName: string) => {
    const found = heroes.find(
      (h) => h.hero_name.toLowerCase().trim() === heroName.toLowerCase().trim()
    );
    if (found) {
      setSelectedHeroId(found.id);
      setSearchQuery("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (!currentHero) {
    return (
      <div className="py-20 text-center font-mono text-gray-500 animate-pulse text-xs uppercase tracking-widest leading-relaxed">
        Sourcing core tactical blueprints from database...
      </div>
    );
  }

  const currentImg = getHeroImageUrl(currentHero.hero_name, heroAssets);

  return (
    <div className="space-y-6 page-enter">
      {/* Selector and Main Display Card */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Selector: Search & Select */}
        <div className="w-full lg:w-80 shrink-0 bg-[#0a111f]/60 border border-blue-900/20 rounded-xl p-5 space-y-4">
          <div>
            <h3 className="font-display text-md font-bold text-white tracking-tight flex items-center gap-1.5">
              <Compass className="h-4 w-4 text-blue-400" />
              Blue Counter Picker
            </h3>
            <p className="font-mono text-[9px] text-gray-500 tracking-wider uppercase mt-0.5">
              Select hero to dissect tactics
            </p>
          </div>

          {/* Quick Search Dropdown */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-gray-500" />
            </span>
            <input
              type="text"
              className="w-full pl-9 pr-4 py-2 bg-[#090f1d] border border-blue-900/30 rounded-lg text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
              placeholder="Search hero..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* List of matched options */}
          <div className="space-y-1 max-h-80 overflow-y-auto scrollbar-thin pr-1">
            {eligibleSelectorHeroes.map((h) => {
              const active = h.id === currentHero.id;
              const img = getHeroImageUrl(h.hero_name, heroAssets);
              return (
                <button
                  key={h.id}
                  onClick={() => {
                    setSelectedHeroId(h.id);
                    setSearchQuery("");
                  }}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg text-left cursor-pointer transition-all duration-150 ${
                    active
                      ? "bg-blue-600/15 border border-blue-550/25 text-blue-300 font-bold"
                      : "border border-transparent text-gray-400 hover:bg-gray-950/45 hover:text-white"
                  }`}
                >
                  <div className="h-8 w-8 rounded overflow-hidden shrink-0 border border-white/5">
                    <FallbackImage src={img} fallbackText={h.hero_name} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs truncate">{h.hero_name}</div>
                    <div className="font-mono text-[8px] text-gray-500">
                      {Array.isArray(h.role) ? h.role[0] : h.role}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Dashboard: Hero Blueprint Visualization */}
        <div className="flex-1 glass-card p-6 flex flex-col md:flex-row shadow-xl gap-6">
          <div className="md:w-56 flex flex-col items-center text-center p-4 bg-gray-950/40 border border-white/5 rounded-xl shrink-0 gap-3">
            <div className="relative h-24 w-24 overflow-hidden rounded-2xl border-2 border-[#f0b429] shadow-md shadow-[#f0b429]/10">
              <FallbackImage src={currentImg} fallbackText={currentHero.hero_name} className="h-full w-full object-cover" />
            </div>

            <div>
              <h2 className="text-lg font-display font-black text-white">{currentHero.hero_name}</h2>
              <p className="font-mono text-[9px] text-[#f0b429] font-bold tracking-widest mt-0.5">
                TIER {currentHero.tier || "B"} PRIORITAS
              </p>
            </div>

            {/* Microstats Table */}
            <div className="w-full border-t border-white/5 pt-3 space-y-1.5 text-left font-mono text-[10px]">
              <div className="flex justify-between">
                <span className="text-gray-500">Win Rate:</span>
                <span className="text-emerald-400 font-bold">{currentHero.win_rate ? `${currentHero.win_rate}%` : currentHero.winrate || "50.0%"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Pick Rate:</span>
                <span className="text-blue-400 font-bold">{currentHero.pick_rate ? `${currentHero.pick_rate}%` : currentHero.picks_total || "0.0%"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Presence:</span>
                <span className="text-purple-400 font-bold">{currentHero.tournament_presence || "0.0"}%</span>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-4 flex flex-col justify-between">
            <div>
              <div className="font-mono text-[9px] text-gray-500 uppercase tracking-widest">
                Blueprints & Matchups Matrix
              </div>
              <h2 className="text-xl font-display font-extrabold text-white mt-1 leading-tight uppercase">
                Blue Tactical Board: {currentHero.hero_name}
              </h2>
              <p className="text-xs text-gray-400 leading-relaxed mt-2 p-3 bg-blue-950/20 border border-blue-900/15 rounded-lg">
                Klik hero matchup mana saja di bawah untuk <strong>Pivot</strong> papan taktis ke profil draf hero tersebut secara instan.
              </p>
            </div>

            {/* Tactical Notes */}
            <div className="border-t border-white/5 pt-4 space-y-2">
              <h4 className="font-display text-xs font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#f0b429]" />
                TACTICAL ENGAGEMENT MATRIX
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Ketika merancang counter-draft pada fasa draf {currentHero.hero_name}, prioritas utama adalah membatasi mobilitas skill-set miliknya atau memaksa dia menggunakan cooldown utama sebelum inisiasi objektif lord/turtle dimulai.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tri-Column Matrix Cards (Strong, Weak, Synergy) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* COUNTER MATRIX (STRONG AGAINST) */}
        <div className="bg-[#0a111f]/60 border border-emerald-950/25 rounded-xl p-5 shadow-lg shadow-black/25">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-display text-sm font-bold text-white tracking-tight uppercase">
                Strong Against
              </h4>
              <p className="font-mono text-[9px] text-emerald-500 uppercase font-bold tracking-widest">
                Heroes dia Counter
              </p>
            </div>
          </div>

          {strongAgainstList.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-white/5 rounded-lg text-xs font-mono text-gray-500">
              No strong matchup counters indexed.
            </div>
          ) : (
            <div className="space-y-2">
              {strongAgainstList.map((heroName) => (
                <button
                  key={heroName}
                  onClick={() => handlePivot(heroName)}
                  className="w-full flex items-center gap-3 p-2.5 bg-gray-950/20 border border-emerald-500/10 rounded-lg text-left cursor-pointer hover:border-emerald-500/30 transition-colors"
                >
                  <FallbackImage fallbackText={heroName} className="h-7 w-7 rounded overflow-hidden" />
                  <span className="text-xs text-gray-100 font-sans font-bold capitalize">
                    {heroName}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* COUNTERED BY (WEAK AGAINST) */}
        <div className="bg-[#0a111f]/60 border border-rose-950/25 rounded-xl p-5 shadow-lg shadow-black/25">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-display text-sm font-bold text-white tracking-tight uppercase">
                Countered By
              </h4>
              <p className="font-mono text-[9px] text-rose-500 uppercase font-bold tracking-widest">
                Vulnerable Matchups
              </p>
            </div>
          </div>

          {weakAgainstList.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-white/5 rounded-lg text-xs font-mono text-gray-500">
              No vulnerability matchups mapped.
            </div>
          ) : (
            <div className="space-y-2">
              {weakAgainstList.map((heroName) => (
                <button
                  key={heroName}
                  onClick={() => handlePivot(heroName)}
                  className="w-full flex items-center gap-3 p-2.5 bg-gray-950/20 border border-rose-500/10 rounded-lg text-left cursor-pointer hover:border-rose-500/30 transition-colors"
                >
                  <FallbackImage fallbackText={heroName} className="h-7 w-7 rounded overflow-hidden" />
                  <span className="text-xs text-gray-100 font-sans font-bold capitalize">
                    {heroName}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* STRATEGIC SYNERGY */}
        <div className="bg-[#0a111f]/60 border border-blue-950/25 rounded-xl p-5 shadow-lg shadow-black/25">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-display text-sm font-bold text-white tracking-tight uppercase">
                Strategic Allies
              </h4>
              <p className="font-mono text-[9px] text-blue-500 uppercase font-bold tracking-widest">
                High Synergy Pairs
              </p>
            </div>
          </div>

          {synergyList.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-white/5 rounded-lg text-xs font-mono text-gray-500">
              No synergy blueprints recorded.
            </div>
          ) : (
            <div className="space-y-2">
              {synergyList.map((heroName) => (
                <button
                  key={heroName}
                  onClick={() => handlePivot(heroName)}
                  className="w-full flex items-center gap-3 p-2.5 bg-gray-950/20 border border-blue-500/10 rounded-lg text-left cursor-pointer hover:border-blue-500/30 transition-colors"
                >
                  <FallbackImage fallbackText={heroName} className="h-7 w-7 rounded overflow-hidden" />
                  <span className="text-xs text-gray-100 font-sans font-bold capitalize">
                    {heroName}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
