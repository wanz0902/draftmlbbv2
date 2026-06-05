import React, { useState, useEffect } from "react";
import { DetailedHero } from "../types/hero";
import HeroDetailPanel from "./HeroDetailPanel";
import { ArrowLeft, Search, Info, Hexagon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import FallbackImage from "./FallbackImage";
import { getHeroImageUrl } from "../lib/heroUtils";

interface Props {
  heroAssets: Record<string, string>;
}

export default function HeroIntelligenceDashboard({ heroAssets }: Props) {
  const [heroes, setHeroes] = useState<DetailedHero[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedHero, setSelectedHero] = useState<DetailedHero | null>(null);

  useEffect(() => {
    fetch("/api/heroes")
      .then((res) => res.json())
      .then((data) => {
        setHeroes(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filteredHeroes = heroes.filter((h: any) => {
    const heroName = h.hero_name || h.name || h.heroName || "";
    const roles = Array.isArray(h.role) ? h.role : h.role ? [h.role] : [];
    return (
      String(heroName)
        .toLowerCase()
        .includes(String(search || "").toLowerCase()) ||
      roles.some((r: string) =>
        String(r || "")
          .toLowerCase()
          .includes(String(search || "").toLowerCase()),
      )
    );
  });

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
          Hero Intelligence
        </div>
      </div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-sans text-white uppercase tracking-tight flex items-center gap-2">
            <Hexagon className="h-6 w-6 text-blue-500" />
            Hero Intelligence Database
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            AI-powered MLBB Esports Draft Command Center
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search heroes, roles, tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-64 bg-[#0a1120] border border-blue-900/40 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400 animate-pulse">
          Loading intelligence data...
        </div>
      ) : filteredHeroes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <Search className="h-12 w-12 text-gray-700" />
          <p className="text-gray-500 text-sm">Tidak ada hero ditemukan untuk pencarian "<span className="text-gray-300">{search}</span>"</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredHeroes.map((hero) => (
            <motion.div
              layoutId={`hero-card-${hero.id}`}
              key={hero.id}
              onClick={() => setSelectedHero(hero)}
              className="group cursor-pointer rounded-xl bg-gradient-to-b from-[#101827] to-[#0a1120] border border-blue-900/30 overflow-hidden hover:border-blue-500/50 transition-all shadow-lg hover:shadow-blue-500/20"
            >
              <div className="aspect-square bg-[#060b13] relative overflow-hidden">
                {(() => {
                   const fallback = "/raw-assets/regular_season_files/60px-ML_icon_Zhuxin.png";
                   const heroName = hero.hero_name || hero.name || "";
                   const imgUrl = getHeroImageUrl(heroName, heroAssets);
                   return (
                     <FallbackImage
                       src={imgUrl}
                       fallbackText={heroName || "Unknown"}
                       alt={heroName}
                       className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300"
                       containerClassName="w-full h-full flex items-center justify-center font-bold pb-2 text-gray-700 text-3xl pb-2 bg-[#060b13]"
                     />
                   );
                })()}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a1120] via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-2 left-2 flex gap-1 flex-wrap">
                  {(Array.isArray(hero.role) ? hero.role : [hero.role])
                    .filter(Boolean)
                    .map((rol) => (
                      <span
                        key={rol}
                        className="text-[9px] font-mono uppercase bg-blue-900/60 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30 backdrop-blur-md"
                      >
                        {rol}
                      </span>
                    ))}
                </div>
              </div>
              <div className="p-3">
                <h3 className="font-bold text-white tracking-tight">
                  {(hero as any).hero_name || (hero as any).name}
                </h3>
                <p className="text-xs text-gray-500">
                  {Array.isArray(hero.specialty) ? hero.specialty.join(", ") : hero.specialty || ""}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-emerald-400">
                    <Info className="h-3 w-3" />
                    <span>View Intel</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail Panel Overlay */}
      <AnimatePresence>
        {selectedHero && (
          <HeroDetailPanel
            hero={selectedHero}
            onClose={() => setSelectedHero(null)}
            heroAssets={heroAssets}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
