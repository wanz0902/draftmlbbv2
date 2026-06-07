import React, { useState, useMemo } from "react";
import {
  Search,
  Coins,
  Zap,
  Star,
  GitBranch,
  Shield,
  Swords,
  Sparkles,
  Users,
  Target,
  Lightbulb,
  ChevronRight,
} from "lucide-react";
import { Item } from "../types";
import FallbackImage from "./FallbackImage";

interface ItemsCatalogProps {
  items: Item[];
}

// ─── UTILITY FUNCTIONS ───

function getStatColor(stat: string): string {
  const s = stat.toLowerCase();
  if (s.includes("physical attack") || s.includes("physical atk")) return "text-orange-400";
  if (s.includes("magic power") || s.includes("magic atk")) return "text-purple-400";
  if (s.includes("hp") || s.includes("health")) return "text-green-400";
  if (s.includes("hp regen")) return "text-emerald-400";
  if (s.includes("defense") || s.includes("armor") || s.includes("magic resistance") || s.includes("magic res")) return "text-yellow-400";
  if (s.includes("attack speed")) return "text-cyan-400";
  if (s.includes("movement speed") || s.includes("move speed")) return "text-teal-400";
  if (s.includes("mana")) return "text-blue-400";
  if (s.includes("lifesteal") || s.includes("spell vamp")) return "text-rose-400";
  if (s.includes("cooldown") || s.includes("cd")) return "text-sky-400";
  if (s.includes("crit")) return "text-red-400";
  if (s.includes("penetration") || s.includes("pen")) return "text-pink-400";
  return "text-gray-300";
}

function getStatBarColor(stat: string): string {
  const s = stat.toLowerCase();
  if (s.includes("physical attack") || s.includes("physical atk")) return "bg-orange-500";
  if (s.includes("magic power") || s.includes("magic atk")) return "bg-purple-500";
  if (s.includes("hp") || s.includes("health")) return "bg-green-500";
  if (s.includes("hp regen")) return "bg-emerald-500";
  if (s.includes("defense") || s.includes("armor") || s.includes("magic resistance") || s.includes("magic res")) return "bg-yellow-500";
  if (s.includes("attack speed")) return "bg-cyan-500";
  if (s.includes("movement speed") || s.includes("move speed")) return "bg-teal-500";
  if (s.includes("mana")) return "bg-blue-500";
  return "bg-gray-500";
}

function getTierInfo(gold: number | null): { tier: number; label: string; isFinal: boolean } {
  if (gold == null) return { tier: 0, label: "", isFinal: false };
  if (gold > 1500) return { tier: 3, label: "TIER 3", isFinal: true };
  if (gold >= 500) return { tier: 2, label: "TIER 2", isFinal: false };
  return { tier: 1, label: "TIER 1", isFinal: false };
}

function getAbilityBorderColor(type: string): string {
  const t = type.toLowerCase();
  if (t === "active") return "border-l-emerald-500";
  if (t.includes("unique")) return "border-l-purple-500";
  return "border-l-blue-500";
}

function getAbilityBadgeClass(type: string): string {
  const t = type.toLowerCase();
  if (t === "active") return "bg-emerald-950/60 text-emerald-400 border-emerald-500/30";
  if (t.includes("unique")) return "bg-purple-950/60 text-purple-400 border-purple-500/30";
  return "bg-blue-950/60 text-blue-400 border-blue-500/30";
}

function getCategoryColor(cat: string) {
  const c = String(cat || "").toLowerCase();
  if (c.includes("attack")) return "border-orange-500/40 bg-orange-500/10 text-orange-400";
  if (c.includes("magic")) return "border-purple-500/40 bg-purple-500/10 text-purple-400";
  if (c.includes("defense")) return "border-yellow-500/40 bg-yellow-500/10 text-yellow-400";
  if (c.includes("movement")) return "border-teal-500/40 bg-teal-500/10 text-teal-400";
  if (c.includes("jungling")) return "border-emerald-500/40 bg-emerald-500/10 text-emerald-400";
  if (c.includes("roaming")) return "border-sky-500/40 bg-sky-500/10 text-sky-400";
  return "border-gray-500/40 bg-gray-500/10 text-gray-400";
}

// ─── SECTION HEADER COMPONENT ───

function SectionHeader({ icon, title, accent, badge }: { icon: React.ReactNode; title: string; accent: string; badge?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={`w-1 h-5 rounded-full ${accent}`} />
      <span className="text-gray-400">{icon}</span>
      <h4 className="text-[11px] font-bold text-gray-200 uppercase tracking-wider">{title}</h4>
      {badge && (
        <span className="ml-auto text-[10px] font-mono font-bold text-gray-500 bg-gray-800/60 rounded-full px-2.5 py-0.5 border border-gray-700/40">
          {badge}
        </span>
      )}
    </div>
  );
}

// ─── DETAIL CARD WRAPPER ───

function DetailCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-gray-800 bg-[#0a1120] p-5 shadow-lg ${className}`}>
      {children}
    </div>
  );
}

// ─── MAIN COMPONENT ───

export default function ItemsCatalog({ items }: ItemsCatalogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const categories = ["ALL", "Attack", "Defense", "Magic", "Movement", "Jungling", "Roaming"];

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = String(item.name || "")
        .toLowerCase()
        .includes(String(searchTerm || "").toLowerCase());
      const matchesCat = selectedCategory === "ALL" || item.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [items, searchTerm, selectedCategory]);

  // Auto-select first item
  React.useEffect(() => {
    if (filteredItems.length > 0 && !selectedItem) {
      setSelectedItem(filteredItems[0]);
    }
  }, [filteredItems, selectedItem]);

  const tierInfo = selectedItem ? getTierInfo(selectedItem.gold) : null;
  const hasBuildFrom = selectedItem?.buildFrom && selectedItem.buildFrom.length > 0;

  return (
    <div className="flex flex-col gap-0 w-full">
      {/* ═══════════════════════════════════════════════════════
          TOP SECTION: Search + Filters + Item Browser
      ═══════════════════════════════════════════════════════ */}
      <div className="rounded-xl border border-gray-800 bg-[#060d1a] shadow-2xl overflow-hidden">
        {/* Search bar + Category filters */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-800/60">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Cari item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-700/60 bg-gray-900/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition"
              />
            </div>

            {/* Category pills */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
              {categories.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-lg px-3.5 py-2 text-[11px] font-bold uppercase tracking-wide shrink-0 transition-all duration-150 ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 ring-1 ring-indigo-400/30"
                        : "bg-gray-900/80 text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-700/50"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}

              {/* Count badge */}
              <span className="ml-2 shrink-0 text-[11px] font-mono font-bold text-indigo-400 bg-indigo-950/40 rounded-full px-3 py-1.5 border border-indigo-500/20">
                {filteredItems.length} items
              </span>
            </div>
          </div>
        </div>

        {/* Item browser grid (compact icon grid, scrollable) */}
        <div className="px-4 py-4 max-h-[160px] overflow-y-auto scrollbar-thin">
          <div className="flex flex-wrap gap-2">
            {filteredItems.map((item, index) => {
              const isSelected = selectedItem?.name === item.name && selectedItem?.category === item.category;
              return (
                <button
                  key={`${item.name}-${item.category}-${index}`}
                  onClick={() => setSelectedItem(item)}
                  title={`${item.name} — ${item.gold ?? "?"} gold`}
                  className={`group relative flex flex-col items-center gap-1 rounded-lg p-1.5 w-[68px] transition-all duration-150 ${
                    isSelected
                      ? "bg-indigo-950/50 ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/20 scale-105"
                      : "bg-gray-900/40 border border-gray-800/60 hover:bg-gray-800/60 hover:border-gray-600/60 hover:scale-105"
                  }`}
                >
                  <FallbackImage
                    src={item.image}
                    fallbackText={item.name}
                    alt={item.name}
                    className="h-11 w-11 rounded-md bg-gray-900 p-0.5 object-contain border border-gray-700/30"
                    containerClassName="h-11 w-11 rounded-md text-[8px] bg-gray-900 border border-gray-700/30"
                  />
                  <span className="text-[9px] text-gray-400 font-medium truncate w-full text-center leading-tight group-hover:text-white transition-colors">
                    {item.name}
                  </span>
                  {/* Gold corner badge */}
                  {item.gold != null && (
                    <span className="absolute -top-1 -right-1 text-[8px] font-mono font-bold text-amber-400 bg-gray-900 rounded px-1 py-0.5 border border-amber-500/30 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.gold}
                    </span>
                  )}
                </button>
              );
            })}

            {filteredItems.length === 0 && (
              <div className="w-full text-center py-8 text-gray-600">
                <p className="text-sm">Tidak ada item ditemukan</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          DETAIL CANVAS: Full-width item detail below
      ═══════════════════════════════════════════════════════ */}
      {selectedItem ? (
        <div className="mt-5 flex flex-col gap-5">
          {/* Not enriched warning */}
          {!selectedItem.isEnriched && (
            <div className="rounded-lg bg-amber-950/30 border border-amber-500/20 px-4 py-3 text-xs text-amber-400 font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 shrink-0" />
              Data belum lengkap — enrichment belum tersinkronisasi untuk item ini
            </div>
          )}

          {/* ─── A. HERO PANEL ─── */}
          <DetailCard className="bg-gradient-to-r from-[#0a1120] via-[#0d1528] to-[#0a1120] border-gray-700/60">
            <div className="flex items-center gap-6">
              {/* Large image */}
              <FallbackImage
                src={selectedItem.image}
                fallbackText={selectedItem.name}
                alt={selectedItem.name}
                className="h-24 w-24 rounded-2xl bg-gray-900 border border-gray-600/40 p-2 object-contain shadow-2xl shadow-black/30 shrink-0"
                containerClassName="h-24 w-24 rounded-2xl text-xl bg-gray-900 border border-gray-600/40"
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                {/* Name */}
                <h2 className="text-2xl font-black uppercase tracking-tight text-white leading-tight mb-2">
                  {selectedItem.name}
                </h2>

                {/* Badges row */}
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span className={`inline-block rounded-md px-2.5 py-1 text-[10px] font-bold uppercase border ${getCategoryColor(selectedItem.category)}`}>
                    ● {selectedItem.category}
                  </span>
                  {tierInfo && tierInfo.tier > 0 && (
                    <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-500/20">
                      {"●".repeat(tierInfo.tier)} {tierInfo.label}
                    </span>
                  )}
                  {hasBuildFrom && (
                    <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/40 px-2.5 py-1 rounded-md border border-cyan-500/20">
                      FINAL
                    </span>
                  )}
                  {!hasBuildFrom && selectedItem.gold != null && selectedItem.gold < 1000 && (
                    <span className="text-[10px] font-mono font-bold text-gray-400 bg-gray-800/60 px-2.5 py-1 rounded-md border border-gray-600/20">
                      COMPONENT
                    </span>
                  )}
                </div>

                {/* Gold */}
                {selectedItem.gold != null ? (
                  <span className="inline-flex items-center gap-1.5 font-mono text-base font-bold text-amber-400">
                    <Coins className="h-4 w-4" />
                    {selectedItem.gold.toLocaleString()} Gold
                  </span>
                ) : (
                  <span className="text-gray-600 italic text-xs">Harga belum tersedia</span>
                )}

                {/* Passive preview */}
                {selectedItem.passive && !selectedItem.abilities?.length && (
                  <p className="text-xs text-gray-500 italic mt-2 line-clamp-1">
                    {selectedItem.passive}
                  </p>
                )}
              </div>
            </div>
          </DetailCard>

          {/* ─── B. STATS + UNIQUE ATTRIBUTES (2-col) ─── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Base Stats */}
            <DetailCard>
              <SectionHeader
                icon={<Shield className="h-4 w-4" />}
                title="Base Stats"
                accent="bg-blue-500"
                badge={selectedItem.stats?.length ? `${selectedItem.stats.length}` : undefined}
              />
              {selectedItem.stats && selectedItem.stats.length > 0 ? (
                <div className="flex flex-col gap-0">
                  {selectedItem.stats.map((stat, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-800/40 last:border-b-0">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-sm ${getStatBarColor(stat)}`} />
                        <span className="text-xs text-gray-400 font-medium">{stat.replace(/\+[\d.]+/, "").trim() || stat}</span>
                      </div>
                      <span className={`text-sm font-bold font-mono ${getStatColor(stat)}`}>
                        {stat.match(/[+\-][\d.]+/)?.[0] || stat}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-600 italic py-3">Stats belum tersedia</p>
              )}
            </DetailCard>

            {/* Unique Attributes */}
            <DetailCard>
              <SectionHeader
                icon={<Star className="h-4 w-4 text-amber-400" />}
                title="Unique Attributes"
                accent="bg-amber-500"
              />
              {selectedItem.uniqueAttributes && selectedItem.uniqueAttributes.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  {selectedItem.uniqueAttributes.map((attr, i) => (
                    <div key={i} className="flex items-start gap-2.5 rounded-lg bg-amber-950/20 px-3.5 py-3 border border-amber-500/15">
                      <Star className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span className="text-xs font-medium text-amber-200/90 leading-relaxed">{attr}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-600 italic py-3">—</p>
              )}
            </DetailCard>
          </div>

          {/* ─── C. ABILITIES (full width) ─── */}
          <DetailCard>
            <SectionHeader
              icon={<Zap className="h-4 w-4 text-blue-400" />}
              title="Abilities"
              accent="bg-blue-500"
              badge={selectedItem.abilities?.length ? `${selectedItem.abilities.length}` : undefined}
            />
            {selectedItem.abilities && selectedItem.abilities.length > 0 ? (
              <div className="flex flex-col gap-3">
                {selectedItem.abilities.map((ability, i) => (
                  <div
                    key={i}
                    className={`rounded-lg bg-gray-900/60 p-4 border border-gray-800/40 border-l-[3px] ${getAbilityBorderColor(ability.type)}`}
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${getAbilityBadgeClass(ability.type)}`}>
                        {ability.type.toUpperCase()}
                      </span>
                      <span className="text-sm font-bold text-white">{ability.name}</span>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">{ability.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-gray-900/30 p-4 border border-gray-800/30">
                {selectedItem.passive ? (
                  <>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded border bg-blue-950/60 text-blue-400 border-blue-500/30">
                        PASSIVE
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 font-medium leading-relaxed">{selectedItem.passive}</p>
                    {selectedItem.description && (
                      <p className="text-xs text-gray-500 mt-2 leading-relaxed">{selectedItem.description}</p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-gray-600 italic">Passive/ability belum tersedia</p>
                )}
              </div>
            )}
          </DetailCard>

          {/* ─── D. BUILD PATH (full width) ─── */}
          <DetailCard>
            <SectionHeader
              icon={<GitBranch className="h-4 w-4 text-cyan-400" />}
              title="Recipe / Build Path"
              accent="bg-cyan-500"
            />
            {hasBuildFrom ? (
              <div className="flex items-center flex-wrap gap-2">
                {selectedItem.buildFrom!.map((comp, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="text-gray-600 font-bold text-lg">+</span>}
                    <span className="rounded-lg bg-cyan-950/20 border border-cyan-500/20 px-4 py-2 text-sm text-cyan-300 font-semibold hover:bg-cyan-950/40 transition-colors cursor-default">
                      {comp}
                    </span>
                  </React.Fragment>
                ))}
                <ChevronRight className="h-5 w-5 text-gray-600 mx-1" />
                <span className="rounded-lg bg-indigo-950/40 border border-indigo-500/30 px-4 py-2 text-sm text-indigo-300 font-bold ring-1 ring-indigo-500/20 shadow-lg shadow-indigo-500/5">
                  {selectedItem.name}
                </span>
              </div>
            ) : (
              <p className="text-xs text-gray-600 italic py-2">Recipe belum tersedia</p>
            )}
          </DetailCard>

          {/* ─── E + F. RECOMMENDED HEROES + EFFECTIVENESS (2-col) ─── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <DetailCard>
              <SectionHeader
                icon={<Users className="h-4 w-4 text-gray-400" />}
                title="Recommended Heroes"
                accent="bg-gray-600"
              />
              <p className="text-xs text-gray-500 leading-relaxed py-2">
                Data rekomendasi hero belum tersedia dari source lokal
              </p>
            </DetailCard>

            <DetailCard>
              <SectionHeader
                icon={<Target className="h-4 w-4 text-gray-400" />}
                title="Effectiveness"
                accent="bg-gray-600"
              />
              <p className="text-xs text-gray-500 leading-relaxed py-2">
                Data effectiveness belum tersedia dari source lokal
              </p>
            </DetailCard>
          </div>

          {/* ─── G. TIPS & NOTES (full width) ─── */}
          <DetailCard>
            <SectionHeader
              icon={<Lightbulb className="h-4 w-4 text-gray-400" />}
              title="Tips & Notes"
              accent="bg-gray-600"
            />
            <p className="text-xs text-gray-500 leading-relaxed py-2">
              Belum tersedia dari source lokal
            </p>
          </DetailCard>
        </div>
      ) : (
        /* Empty state */
        <div className="mt-5 rounded-xl border border-gray-800 bg-[#0a1120] shadow-lg flex flex-col items-center justify-center py-20 text-center">
          <Swords className="h-14 w-14 text-gray-800 mb-4" />
          <p className="text-sm font-medium text-gray-500">Pilih item untuk melihat detail</p>
          <p className="text-[11px] text-gray-600 mt-1">Klik item dari browser di atas untuk melihat keunggulan parameter gear</p>
        </div>
      )}
    </div>
  );
}
