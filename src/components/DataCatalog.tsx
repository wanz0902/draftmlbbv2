import React, { useState, useEffect } from "react";
import { ShoppingBag, Shield, Zap } from "lucide-react";
import ItemsCatalog from "./ItemsCatalog";
import FallbackImage from "./FallbackImage";
import { Item } from "../types";

interface DataCatalogProps {
  items: Item[];
}

export default function DataCatalog({ items }: DataCatalogProps) {
  const [tab, setTab] = useState<"items" | "emblems" | "spells">("items");
  const [emblems, setEmblems] = useState<any[]>([]);
  const [spells, setSpells] = useState<any[]>([]);

  useEffect(() => {
    if (tab === "emblems" && emblems.length === 0) {
      fetch("/api/emblems")
        .then((r) => r.json())
        .then((d) => setEmblems(Array.isArray(d) ? d : []))
        .catch(() => {});
    }
    if (tab === "spells" && spells.length === 0) {
      fetch("/api/battle-spells")
        .then((r) => r.json())
        .then((d) => setSpells(Array.isArray(d) ? d : []))
        .catch(() => {});
    }
  }, [tab]);

  return (
    <div className="flex flex-col gap-6">
      {/* Tab switcher */}
      <div className="flex items-center gap-1.5 bg-[#060d1a] border border-gray-800 rounded-xl p-1.5 shadow-lg">
        <button
          onClick={() => setTab("items")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${tab === "items" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 ring-1 ring-indigo-400/30" : "text-gray-400 hover:text-white hover:bg-gray-800/60"}`}
        >
          <ShoppingBag className="h-4 w-4" /> Items
        </button>
        <button
          onClick={() => setTab("emblems")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${tab === "emblems" ? "bg-purple-600 text-white shadow-lg shadow-purple-600/25 ring-1 ring-purple-400/30" : "text-gray-400 hover:text-white hover:bg-gray-800/60"}`}
        >
          <Shield className="h-4 w-4" /> Emblems
        </button>
        <button
          onClick={() => setTab("spells")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${tab === "spells" ? "bg-amber-600 text-white shadow-lg shadow-amber-600/25 ring-1 ring-amber-400/30" : "text-gray-400 hover:text-white hover:bg-gray-800/60"}`}
        >
          <Zap className="h-4 w-4" /> Battle Spells
        </button>
      </div>

      {/* Content */}
      {tab === "items" && <ItemsCatalog items={items} />}
      {tab === "emblems" && <EmblemsPanel emblems={emblems} />}
      {tab === "spells" && <SpellsPanel spells={spells} />}
    </div>
  );
}

// ─── EMBLEM HELPERS ───

function getEmblemRoleBadges(name: string): string[] {
  const n = name.toLowerCase();
  if (n.includes("assassin")) return ["ASSASSIN", "JUNGLER"];
  if (n.includes("fighter")) return ["FIGHTER", "EXP LANE"];
  if (n.includes("mage")) return ["MAGE", "MID LANE"];
  if (n.includes("marksman")) return ["MARKSMAN", "GOLD LANE"];
  if (n.includes("tank")) return ["TANK", "ROAMER"];
  if (n.includes("support")) return ["SUPPORT", "ROAMER"];
  return ["GENERAL"];
}

function getEmblemAccentColor(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("assassin")) return "bg-red-500";
  if (n.includes("fighter")) return "bg-orange-500";
  if (n.includes("mage")) return "bg-purple-500";
  if (n.includes("marksman")) return "bg-cyan-500";
  if (n.includes("tank")) return "bg-yellow-500";
  if (n.includes("support")) return "bg-emerald-500";
  return "bg-blue-500";
}

function getEmblemMonogramColor(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("assassin")) return "bg-red-950/60 text-red-400 border-red-500/30";
  if (n.includes("fighter")) return "bg-orange-950/60 text-orange-400 border-orange-500/30";
  if (n.includes("mage")) return "bg-purple-950/60 text-purple-400 border-purple-500/30";
  if (n.includes("marksman")) return "bg-cyan-950/60 text-cyan-400 border-cyan-500/30";
  if (n.includes("tank")) return "bg-yellow-950/60 text-yellow-400 border-yellow-500/30";
  if (n.includes("support")) return "bg-emerald-950/60 text-emerald-400 border-emerald-500/30";
  return "bg-blue-950/60 text-blue-400 border-blue-500/30";
}

function getEmblemRoleBadgeClass(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("assassin")) return "bg-red-950/50 text-red-400 border-red-500/25";
  if (n.includes("fighter")) return "bg-orange-950/50 text-orange-400 border-orange-500/25";
  if (n.includes("mage")) return "bg-purple-950/50 text-purple-400 border-purple-500/25";
  if (n.includes("marksman")) return "bg-cyan-950/50 text-cyan-400 border-cyan-500/25";
  if (n.includes("tank")) return "bg-yellow-950/50 text-yellow-400 border-yellow-500/25";
  if (n.includes("support")) return "bg-emerald-950/50 text-emerald-400 border-emerald-500/25";
  return "bg-blue-950/50 text-blue-400 border-blue-500/25";
}

function getTierBadgeClass(tier: number): string {
  switch (tier) {
    case 1:
      return "bg-sky-950/60 text-sky-400 border-sky-500/30";
    case 2:
      return "bg-violet-950/60 text-violet-400 border-violet-500/30";
    case 3:
      return "bg-amber-950/60 text-amber-400 border-amber-500/30";
    default:
      return "bg-gray-800/60 text-gray-400 border-gray-600/30";
  }
}

function getTierBorderColor(tier: number): string {
  switch (tier) {
    case 1:
      return "border-l-sky-500";
    case 2:
      return "border-l-violet-500";
    case 3:
      return "border-l-amber-500";
    default:
      return "border-l-gray-500";
  }
}

// ─── EMBLEMS PANEL ───

function EmblemsPanel({ emblems }: { emblems: any[] }) {
  if (emblems.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 text-sm">
        Loading emblems...
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {emblems.map((e) => {
        const roleBadges = getEmblemRoleBadges(e.name);
        const accentColor = getEmblemAccentColor(e.name);
        const monogramClass = getEmblemMonogramColor(e.name);
        const roleBadgeClass = getEmblemRoleBadgeClass(e.name);
        const talents = e.talents || [];

        return (
          <div
            key={e.slug}
            className="rounded-xl border border-gray-800 bg-[#0a1120] p-6 shadow-lg"
          >
            {/* Header: Icon + Name + Role badges */}
            <div className="flex items-start gap-4 mb-5">
              {/* Emblem icon */}
              <FallbackImage
                src={e.iconUrl}
                alt={e.name}
                fallbackText={e.name}
                className="w-12 h-12 rounded-full object-cover shrink-0 border border-gray-700/50"
                containerClassName={`w-12 h-12 rounded-full shrink-0 ${monogramClass}`}
              />

              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black uppercase tracking-tight text-white leading-tight mb-2">
                  {e.name}
                </h3>
                {/* Role badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  {roleBadges.map((badge) => (
                    <span
                      key={badge}
                      className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${roleBadgeClass}`}
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Section header: Talents */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-1 h-5 rounded-full ${accentColor}`} />
              <h4 className="text-[11px] font-bold text-gray-200 uppercase tracking-wider">
                Talents
              </h4>
              <span className="ml-auto text-[10px] font-mono font-bold text-gray-500 bg-gray-800/60 rounded-full px-2.5 py-0.5 border border-gray-700/40">
                {talents.length} TALENTS
              </span>
            </div>

            {/* Talent sub-cards */}
            <div className="flex flex-col gap-2.5">
              {talents.map((t: any, i: number) => (
                <div
                  key={i}
                  className={`rounded-lg bg-gray-900/60 p-3.5 border border-gray-800/40 border-l-[3px] ${getTierBorderColor(t.tier)}`}
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span
                      className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${getTierBadgeClass(t.tier)}`}
                    >
                      T{t.tier}
                    </span>
                    <span className="text-sm font-bold text-white">
                      {t.name}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {t.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Source footer */}
            {e.source && (
              <p className="text-[9px] text-gray-600 mt-5 font-mono border-t border-gray-800/40 pt-3">
                Source: {e.source} • {e.dataQuality || "unknown"}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── SPELL HELPERS ───

function getSpellMonogramColor(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("flicker") || n.includes("sprint")) return "bg-teal-950/60 text-teal-400 border-teal-500/30";
  if (n.includes("retribution")) return "bg-emerald-950/60 text-emerald-400 border-emerald-500/30";
  if (n.includes("execute") || n.includes("flameshot")) return "bg-red-950/60 text-red-400 border-red-500/30";
  if (n.includes("inspire")) return "bg-cyan-950/60 text-cyan-400 border-cyan-500/30";
  if (n.includes("purify") || n.includes("aegis")) return "bg-sky-950/60 text-sky-400 border-sky-500/30";
  if (n.includes("petrify") || n.includes("vengeance")) return "bg-violet-950/60 text-violet-400 border-violet-500/30";
  if (n.includes("arrival")) return "bg-indigo-950/60 text-indigo-400 border-indigo-500/30";
  if (n.includes("revitalize")) return "bg-green-950/60 text-green-400 border-green-500/30";
  return "bg-amber-950/60 text-amber-400 border-amber-500/30";
}

// ─── BATTLE SPELLS PANEL ───

function SpellsPanel({ spells }: { spells: any[] }) {
  if (spells.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 text-sm">
        Loading battle spells...
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {spells.map((s) => {
        const monogramClass = getSpellMonogramColor(s.name);

        return (
          <div
            key={s.slug}
            className="rounded-xl border border-gray-800 bg-[#0a1120] p-6 shadow-lg"
          >
            {/* Header: Icon + Name + Cooldown */}
            <div className="flex items-start gap-4 mb-4">
              {/* Spell icon */}
              <FallbackImage
                src={s.iconUrl}
                alt={s.name}
                fallbackText={s.name}
                className="w-11 h-11 rounded-full object-cover shrink-0 border border-gray-700/50"
                containerClassName={`w-11 h-11 rounded-full shrink-0 ${monogramClass}`}
              />

              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white leading-tight mb-2">
                  {s.name}
                </h3>
                {/* Cooldown badge */}
                {s.cooldown != null && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-400 bg-amber-950/50 px-2.5 py-1 rounded-md border border-amber-500/25">
                    <Zap className="h-3 w-3" />
                    {s.cooldown}s COOLDOWN
                  </span>
                )}
              </div>
            </div>

            {/* Effect description */}
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-2.5">
                <div className="w-1 h-5 rounded-full bg-blue-500" />
                <h4 className="text-[11px] font-bold text-gray-200 uppercase tracking-wider">
                  Effect
                </h4>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed pl-4">
                {s.effect || "Effect belum tersedia"}
              </p>
            </div>

            {/* Unlock level if available */}
            {s.unlockLevel != null && (
              <div className="mb-4">
                <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-800/60 px-2.5 py-1 rounded-md border border-gray-700/40">
                  UNLOCK LV. {s.unlockLevel}
                </span>
              </div>
            )}

            {/* Source footer */}
            {s.source && (
              <p className="text-[9px] text-gray-600 font-mono border-t border-gray-800/40 pt-3">
                Source: {s.source} • {s.dataQuality || "unknown"}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
