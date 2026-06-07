import React, { useState, useMemo } from "react";
import {
  ArrowLeft,
  Search,
  ShoppingBag,
  Coins,
  Zap,
  Star,
  GitBranch,
} from "lucide-react";
import { Item } from "../types";
import FallbackImage from "./FallbackImage";

interface ItemsCatalogProps {
  items: Item[];
}

// Stat color mapping for accent bars
function getStatColor(stat: string): string {
  const s = stat.toLowerCase();
  if (s.includes("physical attack") || s.includes("physical atk"))
    return "bg-orange-500";
  if (s.includes("magic power") || s.includes("magic atk"))
    return "bg-purple-500";
  if (s.includes("hp") || s.includes("health") || s.includes("hp regen"))
    return "bg-green-500";
  if (
    s.includes("defense") ||
    s.includes("armor") ||
    s.includes("magic resistance") ||
    s.includes("magic res")
  )
    return "bg-yellow-500";
  if (s.includes("attack speed")) return "bg-cyan-500";
  if (s.includes("movement speed") || s.includes("move speed"))
    return "bg-teal-500";
  if (s.includes("mana")) return "bg-blue-500";
  return "bg-gray-500";
}

// Stat text color mapping
function getStatTextColor(stat: string): string {
  const s = stat.toLowerCase();
  if (s.includes("physical attack") || s.includes("physical atk"))
    return "text-orange-400";
  if (s.includes("magic power") || s.includes("magic atk"))
    return "text-purple-400";
  if (s.includes("hp") || s.includes("health") || s.includes("hp regen"))
    return "text-green-400";
  if (
    s.includes("defense") ||
    s.includes("armor") ||
    s.includes("magic resistance") ||
    s.includes("magic res")
  )
    return "text-yellow-400";
  if (s.includes("attack speed")) return "text-cyan-400";
  if (s.includes("movement speed") || s.includes("move speed"))
    return "text-teal-400";
  if (s.includes("mana")) return "text-blue-400";
  return "text-gray-400";
}

// Stat chip color for compact display in cards
function getStatChipClass(stat: string): string {
  const s = stat.toLowerCase();
  if (s.includes("physical attack") || s.includes("physical atk"))
    return "bg-orange-950/60 text-orange-300 border-orange-500/20";
  if (s.includes("magic power") || s.includes("magic atk"))
    return "bg-purple-950/60 text-purple-300 border-purple-500/20";
  if (s.includes("hp") || s.includes("health") || s.includes("hp regen"))
    return "bg-green-950/60 text-green-300 border-green-500/20";
  if (
    s.includes("defense") ||
    s.includes("armor") ||
    s.includes("magic resistance") ||
    s.includes("magic res")
  )
    return "bg-yellow-950/60 text-yellow-300 border-yellow-500/20";
  if (s.includes("attack speed"))
    return "bg-cyan-950/60 text-cyan-300 border-cyan-500/20";
  if (s.includes("movement speed") || s.includes("move speed"))
    return "bg-teal-950/60 text-teal-300 border-teal-500/20";
  if (s.includes("mana"))
    return "bg-blue-950/60 text-blue-300 border-blue-500/20";
  return "bg-gray-900/60 text-gray-300 border-gray-600/20";
}

// Tier info based on gold cost
function getTierInfo(gold: number | null): { tier: number; label: string } {
  if (gold == null) return { tier: 0, label: "" };
  if (gold > 1500) return { tier: 3, label: "T3" };
  if (gold >= 500) return { tier: 2, label: "T2" };
  return { tier: 1, label: "T1" };
}

// Get a preview text for the card (passive or first ability)
function getPreviewText(item: Item): string | null {
  if (item.abilities && item.abilities.length > 0) {
    return `${item.abilities[0].name}: ${item.abilities[0].description}`;
  }
  if (item.passive) return item.passive;
  if (item.description) return item.description;
  return null;
}

// Ability type badge colors
function getAbilityBadgeClass(type: string): string {
  const t = type.toLowerCase();
  if (t === "active")
    return "bg-emerald-950/60 text-emerald-400 border-emerald-500/30";
  if (t.includes("unique"))
    return "bg-purple-950/60 text-purple-400 border-purple-500/30";
  return "bg-blue-950/60 text-blue-400 border-blue-500/30";
}

// Ability card left border color
function getAbilityBorderColor(type: string): string {
  const t = type.toLowerCase();
  if (t === "active") return "border-l-emerald-500";
  if (t.includes("unique")) return "border-l-purple-500";
  return "border-l-blue-500";
}

export default function ItemsCatalog({ items }: ItemsCatalogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const categories = [
    "ALL",
    "Attack",
    "Defense",
    "Magic",
    "Movement",
    "Jungling",
    "Roaming",
  ];

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = String(item.name || "")
        .toLowerCase()
        .includes(String(searchTerm || "").toLowerCase());
      const matchesCat =
        selectedCategory === "ALL" || item.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [items, searchTerm, selectedCategory]);

  // Default selected item when list changes
  React.useEffect(() => {
    if (filteredItems.length > 0 && !selectedItem) {
      setSelectedItem(filteredItems[0]);
    }
  }, [filteredItems, selectedItem]);

  const getCategoryColor = (cat: string) => {
    const c = String(cat || "").toLowerCase();
    if (c.includes("attack"))
      return "border-orange-500 bg-orange-500/10 text-orange-400";
    if (c.includes("magic"))
      return "border-purple-500 bg-purple-500/10 text-purple-400";
    if (c.includes("defense"))
      return "border-yellow-500 bg-yellow-500/10 text-yellow-400";
    if (c.includes("movement"))
      return "border-teal-500 bg-teal-500/10 text-teal-400";
    if (c.includes("jungling"))
      return "border-emerald-500 bg-emerald-500/10 text-emerald-400";
    if (c.includes("roaming"))
      return "border-sky-500 bg-sky-500/10 text-sky-400";
    return "border-gray-500 bg-gray-500/10 text-gray-400";
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Mobile back button */}
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
          Items Catalog
        </div>
      </div>

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        {/* ═══ LEFT: Item List Panel ═══ */}
        <div className="flex flex-col gap-0 rounded-xl border border-gray-800/80 bg-gray-950 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-4 pt-4 pb-3 border-b border-gray-800/60">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-indigo-400" />
                Item Catalog
              </h2>
              <span className="font-mono text-[10px] rounded-full px-2.5 py-0.5 bg-indigo-900/30 text-indigo-400 font-semibold border border-indigo-500/20">
                {filteredItems.length}
              </span>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Cari item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-800 bg-gray-900/80 py-2 pl-9 pr-4 text-xs text-white placeholder-gray-500 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
              />
            </div>

            {/* Category pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold shrink-0 transition-all ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                        : "bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-800"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Item list - horizontal cards */}
          <div className="flex-1 overflow-y-auto max-h-[600px] scrollbar-thin">
            <div className="flex flex-col gap-0.5 p-2">
              {filteredItems.map((item, index) => {
                const isSelected = selectedItem?.name === item.name;
                const tierInfo = getTierInfo(item.gold);
                const preview = getPreviewText(item);
                return (
                  <button
                    key={`${item.name}-${item.category}-${index}`}
                    onClick={() => setSelectedItem(item)}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-150 w-full ${
                      isSelected
                        ? "bg-indigo-950/40 border border-indigo-500/50 shadow-lg shadow-indigo-500/5 ring-1 ring-indigo-500/20"
                        : "border border-transparent hover:bg-gray-900/60 hover:border-gray-700/50"
                    }`}
                  >
                    {/* Image */}
                    <FallbackImage
                      src={item.image}
                      fallbackText={item.name}
                      alt={item.name}
                      className="h-12 w-12 rounded-lg bg-gray-900 p-1 border border-gray-700/40 object-contain shrink-0 group-hover:scale-105 transition duration-150"
                      containerClassName="h-12 w-12 rounded-lg text-[9px] bg-gray-900 border border-gray-700/40"
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="text-xs font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                          {item.name}
                        </h4>
                      </div>

                      {/* Badges row */}
                      <div className="flex items-center gap-1.5 mb-1">
                        {tierInfo.tier > 0 && (
                          <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-500/20">
                            {tierInfo.label}
                          </span>
                        )}
                        <span
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${getCategoryColor(item.category)}`}
                        >
                          {item.category}
                        </span>
                      </div>

                      {/* Stats chips */}
                      {item.stats && item.stats.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.stats.slice(0, 3).map((stat, i) => (
                            <span
                              key={i}
                              className={`text-[8px] font-mono font-semibold px-1.5 py-0.5 rounded border ${getStatChipClass(stat)}`}
                            >
                              {stat}
                            </span>
                          ))}
                          {item.stats.length > 3 && (
                            <span className="text-[8px] font-mono text-gray-500 px-1 py-0.5">
                              +{item.stats.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Preview text */}
                      {!item.stats?.length && preview && (
                        <p className="text-[9px] text-gray-500 truncate leading-tight">
                          {preview}
                        </p>
                      )}
                    </div>

                    {/* Gold price */}
                    <div className="shrink-0 text-right">
                      {item.gold != null ? (
                        <span className="font-mono text-[11px] font-bold text-amber-400 flex items-center gap-0.5">
                          <Coins className="h-3 w-3" />
                          {item.gold}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-600">—</span>
                      )}
                    </div>
                  </button>
                );
              })}

              {filteredItems.length === 0 && (
                <div className="text-center py-10 text-gray-600">
                  <p className="text-xs">Tidak ada item ditemukan</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ RIGHT: Detail Panel ═══ */}
        <div className="rounded-xl border border-gray-800/80 bg-gray-950 shadow-2xl overflow-hidden lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)]">
          {selectedItem ? (
            <div className="flex flex-col overflow-y-auto max-h-[calc(100vh-2rem)] scrollbar-thin">
              {/* Not enriched warning */}
              {!selectedItem.isEnriched && (
                <div className="mx-5 mt-4 rounded-lg bg-amber-950/30 border border-amber-500/20 px-3 py-2 text-[11px] text-amber-400 font-medium flex items-center gap-2">
                  <Zap className="h-3 w-3 shrink-0" />
                  Data belum lengkap — enrichment belum tersinkronisasi
                </div>
              )}

              {/* ─── HEADER ─── */}
              <div className="flex items-start gap-5 p-6 pb-5 border-b border-gray-800/60">
                <FallbackImage
                  src={selectedItem.image}
                  fallbackText={selectedItem.name}
                  alt={selectedItem.name}
                  className="h-24 w-24 rounded-2xl bg-gray-900 border border-gray-700/50 p-2.5 object-contain shadow-xl shadow-black/20"
                  containerClassName="h-24 w-24 rounded-2xl text-lg bg-gray-900 border border-gray-700/50"
                />
                <div className="flex-1 min-w-0 pt-1">
                  {/* Badges */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-[9px] font-bold uppercase border ${getCategoryColor(selectedItem.category)}`}
                    >
                      {selectedItem.category}
                    </span>
                    {(() => {
                      const tier = getTierInfo(selectedItem.gold);
                      if (tier.tier === 0) return null;
                      return (
                        <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/20">
                          TIER {tier.tier}
                        </span>
                      );
                    })()}
                    {selectedItem.buildFrom &&
                      selectedItem.buildFrom.length > 0 && (
                        <span className="text-[9px] font-mono font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
                          FINAL
                        </span>
                      )}
                    {!selectedItem.buildFrom?.length &&
                      selectedItem.gold != null &&
                      selectedItem.gold < 1000 && (
                        <span className="text-[9px] font-mono font-bold text-gray-400 bg-gray-800/60 px-2 py-0.5 rounded border border-gray-600/20">
                          COMPONENT
                        </span>
                      )}
                  </div>

                  {/* Name */}
                  <h3 className="font-sans text-2xl font-black tracking-tight text-white uppercase leading-tight">
                    {selectedItem.name}
                  </h3>

                  {/* Gold */}
                  <div className="mt-2">
                    {selectedItem.gold != null ? (
                      <span className="font-mono text-sm font-bold text-amber-400 flex items-center gap-1.5">
                        <Coins className="h-4 w-4" />
                        {selectedItem.gold} Gold
                      </span>
                    ) : (
                      <span className="text-gray-600 italic text-xs">
                        Harga belum tersedia
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ─── BASE STATS ─── */}
              <div className="px-6 py-5 border-b border-gray-800/40">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-4 rounded-full bg-indigo-500" />
                  <h4 className="font-sans text-[11px] font-bold text-gray-300 uppercase tracking-wider">
                    Base Stats
                  </h4>
                </div>
                {selectedItem.stats != null &&
                selectedItem.stats.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {selectedItem.stats.map((stat, i) => (
                      <div key={i} className="group/stat">
                        <div className="flex items-center justify-between gap-3 py-1.5">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-2.5 h-2.5 rounded-sm ${getStatColor(stat)}`}
                            />
                            <span
                              className={`text-xs font-semibold ${getStatTextColor(stat)}`}
                            >
                              {stat}
                            </span>
                          </div>
                        </div>
                        <div className="h-[2px] rounded-full bg-gray-800/60 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${getStatColor(stat)} opacity-40`}
                            style={{ width: "60%" }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-600 italic">
                    Stats belum tersedia
                  </p>
                )}
              </div>

              {/* ─── UNIQUE ATTRIBUTES ─── */}
              {selectedItem.uniqueAttributes &&
                selectedItem.uniqueAttributes.length > 0 && (
                  <div className="px-6 py-5 border-b border-gray-800/40">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1 h-4 rounded-full bg-amber-500" />
                      <h4 className="font-sans text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                        Unique Attributes
                      </h4>
                    </div>
                    <div className="flex flex-col gap-2">
                      {selectedItem.uniqueAttributes.map((attr, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2.5 rounded-lg bg-amber-950/20 px-3.5 py-2.5 border border-amber-500/15"
                        >
                          <Star className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <span className="text-xs font-medium text-amber-200/90 leading-relaxed">
                            {attr}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* ─── ABILITIES ─── */}
              <div className="px-6 py-5 border-b border-gray-800/40">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-4 rounded-full bg-blue-500" />
                  <h4 className="font-sans text-[11px] font-bold text-gray-300 uppercase tracking-wider">
                    Abilities
                  </h4>
                </div>
                {selectedItem.abilities &&
                selectedItem.abilities.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {selectedItem.abilities.map((ability, i) => (
                      <div
                        key={i}
                        className={`rounded-lg bg-gray-900/50 p-4 border border-gray-800/40 border-l-[3px] ${getAbilityBorderColor(ability.type)}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${getAbilityBadgeClass(ability.type)}`}
                          >
                            {ability.type.toUpperCase()}
                          </span>
                          <span className="text-sm font-bold text-white">
                            {ability.name}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          {ability.description}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg bg-gray-900/30 p-4 border border-gray-800/30">
                    {selectedItem.passive ? (
                      <>
                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded border bg-blue-950/60 text-blue-400 border-blue-500/30">
                          PASSIVE
                        </span>
                        <p className="text-xs text-gray-300 mt-2.5 font-medium leading-relaxed">
                          {selectedItem.passive}
                        </p>
                        {selectedItem.description && (
                          <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
                            {selectedItem.description}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-gray-600 italic">
                        Abilities belum tersedia
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* ─── BUILD PATH ─── */}
              {selectedItem.buildFrom &&
                selectedItem.buildFrom.length > 0 && (
                  <div className="px-6 py-5 border-b border-gray-800/40">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1 h-4 rounded-full bg-cyan-500" />
                      <h4 className="font-sans text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                        <GitBranch className="h-3 w-3 text-cyan-400" />
                        Build Path
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.buildFrom.map((comp, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-gray-900/70 border border-gray-700/50 px-3.5 py-1.5 text-xs text-gray-300 font-medium hover:border-cyan-500/40 hover:text-cyan-300 hover:bg-cyan-950/20 transition-all cursor-default"
                        >
                          {comp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* ─── PLACEHOLDER SECTIONS (collapsed/subtle) ─── */}
              <div className="px-6 py-4 space-y-3">
                <div className="flex items-center gap-2 py-1.5 opacity-50">
                  <div className="w-1 h-3 rounded-full bg-gray-700" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Recommended Heroes
                  </span>
                  <span className="text-[9px] text-gray-700 ml-auto italic">
                    Belum tersedia
                  </span>
                </div>
                <div className="flex items-center gap-2 py-1.5 opacity-50">
                  <div className="w-1 h-3 rounded-full bg-gray-700" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Effectiveness
                  </span>
                  <span className="text-[9px] text-gray-700 ml-auto italic">
                    Belum tersedia
                  </span>
                </div>
                <div className="flex items-center gap-2 py-1.5 opacity-50">
                  <div className="w-1 h-3 rounded-full bg-gray-700" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Tips &amp; Notes
                  </span>
                  <span className="text-[9px] text-gray-700 ml-auto italic">
                    Belum tersedia
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center py-24 text-gray-600 p-6">
              <ShoppingBag className="h-12 w-12 mb-4 opacity-15" />
              <p className="text-sm font-medium text-gray-500">
                Pilih item untuk melihat detail
              </p>
              <p className="text-[11px] text-gray-600 mt-1">
                Klik item dari daftar untuk melihat keunggulan parameter gear
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
