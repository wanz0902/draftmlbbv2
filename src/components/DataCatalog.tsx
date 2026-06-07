import React, { useState, useEffect } from "react";
import { ShoppingBag, Shield, Zap, ChevronRight, Swords, Coins, Search } from "lucide-react";
import ItemsCatalog from "./ItemsCatalog";
import FallbackImage from "./FallbackImage";
import { Item, HeroStats } from "../types";

interface DataCatalogProps {
  items: Item[];
  heroAssets: Record<string, string>;
  heroes: HeroStats[];
}

function getAccentForTab(tab: string): string {
  if (tab === "items") return "#C8AA6E";
  if (tab === "emblems") return "#9B59B6";
  return "#F0C040";
}

export default function DataCatalog({ items, heroAssets, heroes }: DataCatalogProps) {
  const [tab, setTab] = useState<"items" | "emblems" | "spells">("items");
  const [emblems, setEmblems] = useState<any>(null);
  const [spells, setSpells] = useState<any[]>([]);

  useEffect(() => {
    if (tab === "emblems" && !emblems) {
      fetch("/api/emblems")
        .then((r) => r.json())
        .then((d) => setEmblems(d))
        .catch(() => {});
    }
    if (tab === "spells" && spells.length === 0) {
      fetch("/api/battle-spells")
        .then((r) => r.json())
        .then((d) => setSpells(Array.isArray(d) ? d : []))
        .catch(() => {});
    }
  }, [tab]);

  const accent = getAccentForTab(tab);

  return (
    <div className="flex flex-col gap-6">
      {/* Tab switcher */}
      <div className="flex items-center gap-1.5 bg-[#060d1a] border border-[#C8AA6E]/15 p-1.5 shadow-lg"
        style={{ clipPath: "polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)" }}>
        {(["items", "emblems", "spells"] as const).map((t) => {
          const isActive = tab === t;
          const label = t === "items" ? "Items" : t === "emblems" ? "Emblems" : "Battle Spells";
          const Icon = t === "items" ? ShoppingBag : t === "emblems" ? Shield : Zap;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide transition-all ${
                isActive
                  ? "text-black"
                  : "text-[#9BA0B4] hover:text-white hover:bg-[#111111]/60"
              }`}
              style={isActive ? {
                background: accent,
                clipPath: "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)"
              } : {}}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {tab === "items" && <ItemsCatalog items={items} heroAssets={heroAssets} heroes={heroes} />}
      {tab === "emblems" && <EmblemsCatalog emblems={emblems} />}
      {tab === "spells" && <SpellsCatalog spells={spells} />}
    </div>
  );
}

// ─── EMBLEM HELPERS ───

function getEmblemAccent(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("basic") || n.includes("common")) return "#3498DB";
  if (n.includes("assassin")) return "#E8593A";
  if (n.includes("fighter")) return "#E67E22";
  if (n.includes("mage")) return "#9B59B6";
  if (n.includes("marksman")) return "#1ABC9C";
  if (n.includes("tank")) return "#F0C040";
  if (n.includes("support")) return "#2ECC71";
  return "#3498DB";
}

function getTierAccent(tier: number): string {
  if (tier === 1) return "#4AAEE8";
  if (tier === 2) return "#9B6AE0";
  if (tier === 3) return "#F0D060";
  return "#666";
}

function getTierLabel(tier: number): string {
  if (tier === 1) return "ATTRIBUTE BONUS";
  if (tier === 2) return "TRIGGERED ABILITY";
  if (tier === 3) return "CORE TALENT";
  return "T" + tier;
}

// ─── EMBLEMS CATALOG ───

function EmblemsCatalog({ emblems }: { emblems: any }) {
  const [selectedEmblem, setSelectedEmblem] = useState<string | null>(null);

  if (!emblems || (Array.isArray(emblems) && emblems.length === 0) || (!Array.isArray(emblems) && !emblems.emblems)) {
    return (
      <div className="text-center py-16 text-[#9BA0B4] text-sm">
        Loading emblems...
      </div>
    );
  }

  const emblemData = Array.isArray(emblems)
    ? { universalTalents: [], emblems: emblems }
    : emblems;

  const emblemList: any[] = emblemData.emblems || [];
  const universalTalents: any[] = emblemData.universalTalents || [];

  const tier1 = universalTalents.filter((t: any) => t.tier === 1);
  const tier2 = universalTalents.filter((t: any) => t.tier === 2);
  const tier3 = universalTalents.filter((t: any) => t.tier === 3);

  const selectedEmblemData = emblemList.find((e: any) => e.slug === selectedEmblem);
  const recommendedNames = new Set(selectedEmblemData?.recommendedTalents || []);

  return (
    <div className="flex flex-col gap-6">
      {/* ── EMBLEM SELECTION ── */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-black uppercase tracking-tight text-white" style={{ fontFamily: 'var(--font-display)' }}>
            Emblems & Talents
          </h2>
          <p className="text-[11px] text-gray-500 mt-1">
            {emblemList.length} emblems / {universalTalents.length} universal talents across 3 tiers
          </p>
          <p className="text-[10px] text-gray-600 mt-1 uppercase tracking-wider font-bold">
            Select an emblem for stat bonuses — talents are universal
          </p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {emblemList.map((e: any) => {
            const accent = getEmblemAccent(e.name);
            const isActive = selectedEmblem === e.slug;
            return (
              <button
                key={e.slug}
                onClick={() => setSelectedEmblem(isActive ? null : e.slug)}
                className={`relative flex flex-col items-center gap-2 p-3 rounded-lg border transition-all duration-200 ${
                  isActive
                    ? "border-opacity-60 bg-opacity-10"
                    : "border-gray-800/60 bg-[#0a1120] hover:bg-[#0f1a2e] hover:border-gray-700/60"
                }`}
                style={isActive ? {
                  borderColor: `${accent}60`,
                  background: `${accent}10`,
                } : {}}
              >
                <div className="relative" style={{ filter: `drop-shadow(0 0 8px ${accent}25)` }}>
                  <FallbackImage
                    src={e.iconUrl}
                    fallbackText={e.name}
                    alt={e.name}
                    className="h-12 w-12 rounded-full bg-[#0c1524] border-2 p-1 object-contain"
                    containerClassName="h-12 w-12 rounded-full text-sm bg-[#0c1524] border-2"
                    style={{ borderColor: isActive ? `${accent}80` : `${accent}40` }}
                  />
                </div>
                <span className="text-[10px] font-black uppercase tracking-tight text-white text-center leading-tight"
                  style={{ fontFamily: 'var(--font-display)' }}>
                  {e.name}
                </span>
                <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase"
                  style={{ background: `${accent}15`, color: accent, borderColor: `${accent}30` }}>
                  {e.type}
                </span>
                <span className="text-[9px] text-gray-500">
                  {e.recommendedTalents?.length || 0} rec. talents
                </span>
                {e.recommendationQuality && e.recommendationQuality !== "confirmed" && (
                  <span className="text-[7px] font-mono font-bold px-1 py-0.5 rounded border bg-orange-900/30 text-orange-400 border-orange-600/30">
                    UNVERIFIED
                  </span>
                )}
                {e.dataQuality && e.dataQuality !== "verified" && (
                  <span className="text-[7px] font-mono font-bold px-1 py-0.5 rounded border bg-yellow-900/30 text-yellow-400 border-yellow-600/30">
                    {e.dataQuality.toUpperCase()}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TALENT REFERENCE ── */}
      <div className="rounded-xl border border-gray-800/80 bg-[#0a1120] overflow-hidden shadow-lg">
        <div className="px-6 pt-5 pb-3">
          <h2 className="text-lg font-black uppercase tracking-tight text-white" style={{ fontFamily: 'var(--font-display)' }}>
            Talent Reference
          </h2>
          <p className="text-[11px] text-gray-500 mt-1">
            {universalTalents.length} universal talents across 3 tiers. Tap to preview combinations. Select an emblem above for recommendations.
          </p>
        </div>

        {/* Tier 1 */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-black text-white" style={{ fontFamily: 'var(--font-display)' }}>1</span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border"
              style={{ background: `${getTierAccent(1)}15`, color: getTierAccent(1), borderColor: `${getTierAccent(1)}30` }}>
              TIER 1
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Attribute Bonus</span>
            <span className="text-[9px] text-gray-600 font-mono">({tier1.length})</span>
          </div>
          <div className="flex flex-wrap gap-4">
            {tier1.map((t: any, i: number) => {
              const isRecommended = recommendedNames.has(t.name);
              return (
                <div key={i} className="flex flex-col items-center gap-1.5" style={{ width: 64 }}>
                  <div className="relative">
                    <FallbackImage
                      src={t.iconUrl}
                      fallbackText={t.name}
                      alt={t.name}
                      className={`w-11 h-11 rounded-lg object-contain border-2 ${isRecommended ? "ring-2" : ""}`}
                      containerClassName="w-11 h-11 rounded-lg text-[7px]"
                      style={{
                        borderColor: isRecommended ? `${getTierAccent(1)}` : "#1e293b",
                        ...(isRecommended ? { boxShadow: `0 0 10px ${getTierAccent(1)}40` } : {}),

                      }}
                    />
                  </div>
                  <span className="text-[8px] text-center text-gray-400 leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
                    {t.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mx-6 border-t border-gray-800/40" />

        {/* Tier 2 */}
        <div className="px-6 py-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-black text-white" style={{ fontFamily: 'var(--font-display)' }}>2</span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border"
              style={{ background: `${getTierAccent(2)}15`, color: getTierAccent(2), borderColor: `${getTierAccent(2)}30` }}>
              TIER 2
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Triggered Ability</span>
            <span className="text-[9px] text-gray-600 font-mono">({tier2.length})</span>
          </div>
          <div className="flex flex-wrap gap-4">
            {tier2.map((t: any, i: number) => {
              const isRecommended = recommendedNames.has(t.name);
              return (
                <div key={i} className="flex flex-col items-center gap-1.5" style={{ width: 64 }}>
                  <div className="relative">
                    <FallbackImage
                      src={t.iconUrl}
                      fallbackText={t.name}
                      alt={t.name}
                      className={`w-11 h-11 rounded-lg object-contain border-2 ${isRecommended ? "ring-2" : ""}`}
                      containerClassName="w-11 h-11 rounded-lg text-[7px]"
                      style={{
                        borderColor: isRecommended ? `${getTierAccent(2)}` : "#1e293b",
                        ...(isRecommended ? { boxShadow: `0 0 10px ${getTierAccent(2)}40` } : {}),

                      }}
                    />
                  </div>
                  <span className="text-[8px] text-center text-gray-400 leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
                    {t.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mx-6 border-t border-gray-800/40" />

        {/* Tier 3 */}
        <div className="px-6 pt-4 pb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-black text-white" style={{ fontFamily: 'var(--font-display)' }}>3</span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border"
              style={{ background: `${getTierAccent(3)}15`, color: getTierAccent(3), borderColor: `${getTierAccent(3)}30` }}>
              TIER 3
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Core Talent</span>
            <span className="text-[9px] text-gray-600 font-mono">({tier3.length})</span>
          </div>
          <div className="flex flex-wrap gap-4">
            {tier3.map((t: any, i: number) => {
              const isRecommended = recommendedNames.has(t.name);
              return (
                <div key={i} className="flex flex-col items-center gap-1.5" style={{ width: 64 }}>
                  <div className="relative">
                    <FallbackImage
                      src={t.iconUrl}
                      fallbackText={t.name}
                      alt={t.name}
                      className={`w-11 h-11 rounded-lg object-contain border-2 ${isRecommended ? "ring-2" : ""}`}
                      containerClassName="w-11 h-11 rounded-lg text-[7px]"
                      style={{
                        borderColor: isRecommended ? `${getTierAccent(3)}` : "#1e293b",
                        ...(isRecommended ? { boxShadow: `0 0 10px ${getTierAccent(3)}40` } : {}),

                      }}
                    />
                    {t.cooldown != null && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[7px] font-mono font-bold px-1 py-0 rounded bg-[#111] text-white border border-gray-700/60"
                        style={{ lineHeight: "14px" }}>
                        {t.cooldown}s
                      </span>
                    )}
                  </div>
                  <span className="text-[8px] text-center text-gray-400 leading-tight mt-0.5" style={{ fontFamily: 'var(--font-display)' }}>
                    {t.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SPELL HELPERS ───

function getSpellAccent(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("flicker")) return "#1ABC9C";
  if (n.includes("retribution")) return "#2ECC71";
  if (n.includes("execute")) return "#E8593A";
  if (n.includes("inspire")) return "#1ABC9C";
  if (n.includes("sprint")) return "#3498DB";
  if (n.includes("flameshot")) return "#E8593A";
  if (n.includes("aegis")) return "#4AAEE8";
  if (n.includes("petrify")) return "#9B6AE0";
  if (n.includes("purify")) return "#4AAEE8";
  if (n.includes("revitalize")) return "#2ECC71";
  if (n.includes("vengeance")) return "#9B6AE0";
  if (n.includes("arrival")) return "#3498DB";
  return "#C8AA6E";
}

// ─── SPELLS CATALOG ───

function SpellsCatalog({ spells }: { spells: any[] }) {
  const [selectedSpell, setSelectedSpell] = useState<any | null>(null);
  const [view, setView] = useState<"list" | "detail">("list");

  if (spells.length === 0) {
    return (
      <div className="text-center py-16 text-[#9BA0B4] text-sm">
        Loading battle spells...
      </div>
    );
  }

  return (
    <div className="w-full min-h-[700px]">
      {/* LIST VIEW */}
      {view === "list" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          {spells.map((s) => {
            const accent = getSpellAccent(s.name);
            return (
              <button
                key={s.slug}
                onClick={() => { setSelectedSpell(s); setView("detail"); }}
                className="group relative text-left transition-all duration-300 hover:-translate-y-0.5"
                style={{
                  background: "rgba(17,17,17,0.8)",
                  border: "1px solid rgba(200,170,110,0.1)",
                  clipPath: "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)",
                }}
              >
                <div className="absolute left-0 top-0 bottom-0 w-[3px] opacity-60 group-hover:opacity-100 transition-opacity"
                  style={{ background: `linear-gradient(180deg, ${accent}EE, ${accent}00)` }} />
                <div className="absolute top-0 left-0 w-2 h-2 pointer-events-none" style={{ borderTop: `2px solid ${accent}88`, borderLeft: `2px solid ${accent}88` }} />
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#C8AA6E]/30 pointer-events-none" />

                <div className="relative z-10 p-2.5 flex items-center gap-2.5">
                  <div className="relative shrink-0" style={{ filter: `drop-shadow(0 0 6px ${accent}25)` }}>
                    <FallbackImage
                      src={s.iconUrl}
                      fallbackText={s.name}
                      alt={s.name}
                      className="h-10 w-10 rounded-full object-cover"
                      containerClassName="h-10 w-10 rounded-full text-[7px]"
                      style={{ clipPath: "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)" }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-semibold truncate text-[#9BA0B4] group-hover:text-white transition-colors block">
                      {s.name}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {s.cooldown != null && (
                        <span className="text-[10px] font-bold tabular-nums text-[#F0D060]">
                          {s.cooldown}s
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* DETAIL VIEW */}
      {view === "detail" && selectedSpell && (
        <div className="flex flex-col gap-0">
          <button
            onClick={() => setView("list")}
            className="flex items-center gap-2 px-4 py-2.5 mb-3 bg-[#111111]/80 border border-[#C8AA6E]/15 text-[#9BA0B4] hover:text-white hover:border-[#C8AA6E]/40 transition-all w-fit"
            style={{ clipPath: "polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)" }}
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            <span className="text-[11px] font-bold uppercase tracking-wide">Back to Battle Spells</span>
          </button>

          {/* Header */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative px-6 pt-6 pb-5">
              <div className="flex items-start gap-5">
                <div className="relative shrink-0">
                  <FallbackImage
                    src={selectedSpell.iconUrl}
                    fallbackText={selectedSpell.name}
                    alt={selectedSpell.name}
                    className="h-24 w-24 rounded-full bg-[#0c1524] border-2 border-cyan-500/30 p-2 object-contain shadow-[0_0_30px_rgba(34,211,238,0.15)]"
                    containerClassName="h-24 w-24 rounded-full text-2xl bg-[#0c1524] border-2 border-cyan-500/30"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center rounded px-2 py-0.5 text-[9px] font-bold uppercase border border-amber-500/30 bg-amber-950/40 text-amber-400">
                      BATTLE SPELL
                    </span>
                  </div>
                  <h2 className="text-3xl font-black uppercase tracking-tight text-white leading-none mb-3" style={{ fontFamily: 'var(--font-display)' }}>
                    {selectedSpell.name}
                  </h2>
                  {selectedSpell.cooldown != null && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0c1524] border border-amber-500/30">
                      <Zap className="h-4 w-4 text-amber-400" />
                      <span className="font-mono text-lg font-black text-amber-400">{selectedSpell.cooldown}s</span>
                      <span className="text-[9px] font-bold text-amber-400/60 uppercase">Cooldown</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Effect */}
          <div className="mt-4 rounded-xl border border-gray-800/80 bg-[#0a1120] overflow-hidden shadow-lg">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-800/60 bg-gradient-to-r from-cyan-500/5 to-transparent">
              <div className="w-1 h-4 rounded-full bg-cyan-500" />
              <Zap className="h-4 w-4 text-cyan-400" />
              <h4 className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>
                Effect
              </h4>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-400 leading-relaxed">{selectedSpell.effect || "Effect belum tersedia"}</p>
            </div>
          </div>

          {/* Unlock Level */}
          {selectedSpell.unlockLevel != null && (
            <div className="mt-4 mb-6 rounded-xl border border-gray-800/80 bg-[#0a1120] overflow-hidden shadow-lg">
              <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-800/60 bg-gradient-to-r from-cyan-500/5 to-transparent">
                <div className="w-1 h-4 rounded-full bg-cyan-500" />
                <h4 className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>
                  Unlock Requirement
                </h4>
              </div>
              <div className="px-5 py-4 flex items-center gap-3">
                <span className="text-[10px] font-mono font-bold text-[#F0D060] bg-[#111] px-3 py-1.5 rounded border border-[#C8AA6E]/15">
                  UNLOCK LV. {selectedSpell.unlockLevel}
                </span>
                {selectedSpell.unlockNote && (
                  <span className="text-[10px] text-gray-500">{selectedSpell.unlockNote}</span>
                )}
              </div>
            </div>
          )}

          {selectedSpell.source && (
            <p className="text-[9px] text-gray-600 font-mono mt-2">
              Source: {selectedSpell.source} • {selectedSpell.dataQuality || "unknown"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
