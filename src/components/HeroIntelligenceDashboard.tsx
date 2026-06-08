import React, { useState, useEffect } from "react";
import { DetailedHero } from "../types/hero";
import HeroDetailPanel from "./HeroDetailPanel";
import { ArrowLeft, Search, Hexagon, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import FallbackImage from "./FallbackImage";
import { getHeroImageUrl } from "../lib/heroUtils";
import HeroIntelCard from "./HeroIntelCard";

interface Props {
  heroAssets: Record<string, string>;
  initialHeroName?: string | null;
  onOpenFullPage?: (heroName: string) => void;
}

export default function HeroIntelligenceDashboard({ heroAssets, initialHeroName, onOpenFullPage }: Props) {
  const [heroes, setHeroes] = useState<DetailedHero[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedHero, setSelectedHero] = useState<DetailedHero | null>(null);

  useEffect(() => {
    fetch("/api/heroes")
      .then((res) => res.json())
      .then((data) => {
        const heroList = Array.isArray(data) ? data : [];
        setHeroes(heroList);
        // Auto-select hero if initialHeroName is provided
        if (initialHeroName) {
          const target = heroList.find((h: any) => {
            const name = (h.hero_name || h.name || h.heroName || "").toLowerCase();
            return name === initialHeroName.toLowerCase();
          });
          if (target) setSelectedHero(target);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // React to initialHeroName changes after heroes are loaded
  useEffect(() => {
    if (initialHeroName && heroes.length > 0) {
      const target = heroes.find((h: any) => {
        const name = (h.hero_name || h.name || h.heroName || "").toLowerCase();
        return name === initialHeroName.toLowerCase();
      });
      if (target) setSelectedHero(target);
    }
  }, [initialHeroName, heroes]);

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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {filteredHeroes.map((hero) => (
            <motion.div
              layoutId={`hero-card-${hero.id}`}
              key={hero.id}
            >
              <HeroIntelCard
                hero={hero}
                heroAssets={heroAssets}
                onClick={() => {
                  if (onOpenFullPage) {
                    onOpenFullPage(hero.hero_name || hero.name || "");
                  } else {
                    setSelectedHero(hero);
                  }
                }}
              />
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

      {/* Full Page Button (floating when a hero is selected) */}
      {selectedHero && onOpenFullPage && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 right-6 z-[10000]"
        >
          <button
            onClick={() => {
              const name = selectedHero.hero_name || selectedHero.name || "";
              setSelectedHero(null);
              onOpenFullPage(name);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-900/30 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open Full Page
          </button>
        </motion.div>
      )}
    </div>
  );
}
