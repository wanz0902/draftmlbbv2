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

// Stat color mapping
function getStatColor(stat: string): string {
  const s = stat.toLowerCase();
  if (s.includes("physical attack") || s.includes("physical atk"))
    return "bg-orange-500";
  if (s.includes("magic power") || s.includes("magic atk"))
    return "bg-purple-500";
  if (s.includes("hp") || s.includes("health")) return "bg-green-500";
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
  if (s.includes("hp") || s.includes("health")) return "text-green-400";
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

// Tier dots based on gold cost
function getTierDots(gold: number | null): { dots: number; label: string } {
  if (gold == null) return { dots: 0, label: "" };
  if (gold > 1500) return { dots: 3, label: "Tier 3" };
  if (gold >= 500) return { dots: 2, label: "Tier 2" };
  return { dots: 1, label: "Tier 1" };
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
  if (t === "active") return "bg-emerald-950/60 text-emerald-400 border-emerald-500/30";
  if (t.includes("unique")) return "bg-purple-950/60 text-purple-400 border-purple-500/30";
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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Mobile back button */}
      <div className="flex items-center justify-between gap-3 lg:col-span-3 sm:hidden">
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

      {/* Items List Grid */}
      <div className="lg:col-span-2 flex flex-col gap-4 rounded-xl border border-gray-900 bg-gray-950 p-4 shadow-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-900 pb-3">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-indigo-400" />
              Katalog Item Mobile Legends
            </h2>
            <p className="text-xs text-gray-400">
              Analisis gear pertarungan untuk draf simulator dan analisis draf AI.
            </p>
          </div>
          <div className="font-mono text-[10px] rounded px-2.5 py-1 bg-indigo-900/20 text-indigo-400 font-semibold border border-indigo-500/10">
            TOTAL ITEM: {filteredItems.length}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Cari nama item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-800 bg-gray-900 py-1.5 pl-9 pr-4 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
            />
          </div>

          {/* Category selector */}
          <div className="flex gap-1.5 overflow-x-auto py-1 scrollbar-none">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold shrink-0 transition ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                      : "bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid List */}
        <div className="max-h-[520px] overflow-y-auto pr-1 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 scrollbar-thin">
          {filteredItems.map((item, index) => {
            const isSelected = selectedItem?.name === item.name;
            const preview = getPreviewText(item);
            return (
              <button
                key={`${item.name}-${item.category}-${index}`}
                onClick={() => setSelectedItem(item)}
                className={`group flex flex-col gap-2.5 rounded-xl border p-3 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-950/30 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/30"
                    : "border-gray-800 bg-gray-900/40 hover:border-indigo-500/40 hover:bg-gray-900/80 hover:scale-[1.02]"
                }`}
              >
                <div className="flex justify-between items-start">
                  <FallbackImage
                    src={item.image}
                    fallbackText={item.name}
                    alt={item.name}
                    className="h-12 w-12 rounded-lg bg-gray-950 p-1 border border-gray-800 object-contain group-hover:scale-110 transition duration-200"
                    containerClassName="h-12 w-12 rounded-lg text-[9px] bg-gray-950 border border-gray-800"
                  />
                  <span className="font-mono text-[10px] font-bold flex items-center gap-0.5">
                    {item.gold != null ? (
                      <span className="text-amber-400 flex items-center gap-0.5">
                        <Coins className="h-3 w-3 inline text-amber-400" />
                        {item.gold}
                      </span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <h4 className="font-sans text-xs font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
                    {item.name}
                  </h4>
                  {preview && (
                    <p className="text-[9px] text-gray-500 line-clamp-1 leading-tight">
                      {preview}
                    </p>
                  )}
                  <span
                    className={`inline-block w-fit rounded px-1.5 py-0.5 text-[8px] font-bold uppercase mt-0.5 border ${getCategoryColor(item.category)}`}
                  >
                    {item.category}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Item Details Panel */}
      <div className="flex flex-col gap-0 rounded-xl border border-gray-900 bg-gray-950 shadow-xl overflow-hidden">
        {selectedItem ? (
          <div className="flex flex-col gap-0 overflow-y-auto max-h-[680px] scrollbar-thin">
            {/* Not enriched warning */}
            {!selectedItem.isEnriched && (
              <div className="mx-4 mt-4 rounded-lg bg-amber-950/30 border border-amber-500/20 px-3 py-1.5 text-[11px] text-amber-400 font-medium">
                ⚠ Data belum lengkap — enrichment belum tersinkronisasi
              </div>
            )}

            {/* ─── HEADER ─── */}
            <div className="flex items-center gap-4 p-5 border-b border-gray-800/60">
              <FallbackImage
                src={selectedItem.image}
                fallbackText={selectedItem.name}
                alt={selectedItem.name}
                className="h-20 w-20 rounded-xl bg-gray-900 border border-gray-700/50 p-2 object-contain shadow-lg"
                containerClassName="h-20 w-20 rounded-xl text-sm bg-gray-900 border border-gray-700/50"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase border ${getCategoryColor(selectedItem.category)}`}
                  >
                    {selectedItem.category}
                  </span>
                  {(() => {
                    const tier = getTierDots(selectedItem.gold);
                    if (tier.dots === 0) return null;
                    return (
                      <span className="text-[10px] text-gray-500 flex items-center gap-0.5" title={tier.label}>
                        {Array.from({ length: tier.dots }).map((_, i) => (
                          <span key={i} className="text-amber-500">●</span>
                        ))}
                        {Array.from({ length: 3 - tier.dots }).map((_, i) => (
                          <span key={i} className="text-gray-700">●</span>
                        ))}
                      </span>
                    );
                  })()}
                </div>
                <h3 className="font-sans text-xl font-bold tracking-tight text-white line-clamp-1">
                  {selectedItem.name}
                </h3>
                <div className="font-mono text-xs font-bold flex items-center gap-1.5 mt-1">
                  {selectedItem.gold != null ? (
                    <span className="text-amber-400 flex items-center gap-1">
                      <Coins className="h-3.5 w-3.5" />
                      {selectedItem.gold} Gold
                    </span>
                  ) : (
                    <span className="text-gray-600 italic text-[11px]">Harga belum tersedia</span>
                  )}
                </div>
              </div>
            </div>

            {/* ─── BASE STATS ─── */}
            <div className="px-5 py-4 border-b border-gray-800/40">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 rounded-full bg-indigo-500" />
                <h4 className="font-sans text-[11px] font-bold text-gray-300 uppercase tracking-wider">
                  Base Stats
                </h4>
              </div>
              {selectedItem.stats != null && selectedItem.stats.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {selectedItem.stats.map((stat, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 rounded-lg bg-gray-900/50 px-3 py-2 border border-gray-800/30"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStatColor(stat)}`} />
                        <span className={`text-xs font-medium ${getStatTextColor(stat)}`}>
                          {stat}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-600 italic">Stats belum tersedia</p>
              )}
            </div>

            {/* ─── UNIQUE ATTRIBUTES ─── */}
            {selectedItem.uniqueAttributes && selectedItem.uniqueAttributes.length > 0 && (
              <div className="px-5 py-4 border-b border-gray-800/40">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full bg-amber-500" />
                  <h4 className="font-sans text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                    Unique Attributes
                  </h4>
                </div>
                <div className="flex flex-col gap-1.5">
                  {selectedItem.uniqueAttributes.map((attr, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-lg bg-amber-950/20 px-3 py-2 border border-amber-500/10"
                    >
                      <Star className="h-3 w-3 text-amber-500 shrink-0" />
                      <span className="text-xs font-medium text-amber-300">
                        {attr}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── ABILITIES ─── */}
            <div className="px-5 py-4 border-b border-gray-800/40">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 rounded-full bg-blue-500" />
                <h4 className="font-sans text-[11px] font-bold text-gray-300 uppercase tracking-wider">
                  Abilities
                </h4>
              </div>
              {selectedItem.abilities && selectedItem.abilities.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  {selectedItem.abilities.map((ability, i) => (
                    <div
                      key={i}
                      className={`rounded-lg bg-gray-900/40 p-3 border border-gray-800/40 border-l-[3px] ${getAbilityBorderColor(ability.type)}`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${getAbilityBadgeClass(ability.type)}`}
                        >
                          {ability.type.toUpperCase()}
                        </span>
                        <span className="text-xs font-bold text-white">
                          {ability.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        {ability.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg bg-gray-900/30 p-3 border border-gray-800/30">
                  {selectedItem.passive ? (
                    <>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border bg-blue-950/60 text-blue-400 border-blue-500/30">
                        PASSIVE
                      </span>
                      <p className="text-xs text-gray-300 mt-2 font-medium">{selectedItem.passive}</p>
                      {selectedItem.description && (
                        <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{selectedItem.description}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-gray-600 italic">Abilities belum tersedia</p>
                  )}
                </div>
              )}
            </div>

            {/* ─── BUILD PATH ─── */}
            {selectedItem.buildFrom && selectedItem.buildFrom.length > 0 && (
              <div className="px-5 py-4 border-b border-gray-800/40">
                <div className="flex items-center gap-2 mb-3">
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
                      className="rounded-full bg-gray-900/60 border border-gray-700/50 px-3 py-1 text-[11px] text-gray-300 font-medium hover:border-cyan-500/30 hover:text-cyan-300 transition"
                    >
                      {comp}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ─── RECOMMENDED HEROES (placeholder) ─── */}
            <div className="px-5 py-3 border-b border-gray-800/40">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-1 h-3 rounded-full bg-gray-700" />
                <h4 className="font-sans text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Recommended Heroes
                </h4>
              </div>
              <p className="text-[11px] text-gray-600 italic">Belum tersedia</p>
              <p className="text-[9px] text-gray-700 mt-0.5">
                Data rekomendasi hero belum disinkronkan
              </p>
            </div>

            {/* ─── EFFECTIVENESS (placeholder) ─── */}
            <div className="px-5 py-3 border-b border-gray-800/40">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-1 h-3 rounded-full bg-gray-700" />
                <h4 className="font-sans text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Effectiveness
                </h4>
              </div>
              <p className="text-[11px] text-gray-600 italic">Belum tersedia</p>
            </div>

            {/* ─── TIPS & NOTES (placeholder) ─── */}
            <div className="px-5 py-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-1 h-3 rounded-full bg-gray-700" />
                <h4 className="font-sans text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Tips &amp; Notes
                </h4>
              </div>
              <p className="text-[11px] text-gray-600 italic">Belum tersedia</p>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center py-20 text-gray-600 p-5">
            <ShoppingBag className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm font-sans text-gray-500">
              Pilih item untuk melihat detail keunggulan parameter gear.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
