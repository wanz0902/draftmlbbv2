import React, { useState, useMemo } from "react";
import {
  Search,
  Coins,
  Zap,
  Star,
  GitBranch,
  Shield,
  Swords,
  CheckCircle2,
  Package,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Item } from "../types";
import FallbackImage from "./FallbackImage";

interface ItemsCatalogProps {
  items: Item[];
}

function getStatColor(stat: string): string {
  const s = stat.toLowerCase();
  if (s.includes("physical attack")) return "text-orange-400";
  if (s.includes("magic power")) return "text-purple-400";
  if (s.includes("hp") && !s.includes("regen")) return "text-green-400";
  if (s.includes("hp regen")) return "text-emerald-400";
  if (s.includes("defense")) return "text-yellow-400";
  if (s.includes("attack speed")) return "text-cyan-400";
  if (s.includes("movement speed")) return "text-teal-400";
  if (s.includes("mana regen")) return "text-sky-400";
  if (s.includes("mana")) return "text-blue-400";
  if (s.includes("lifesteal") || s.includes("spell vamp")) return "text-rose-400";
  if (s.includes("cooldown")) return "text-sky-400";
  if (s.includes("crit")) return "text-red-400";
  if (s.includes("penetration")) return "text-pink-400";
  return "text-gray-300";
}

function getStatDot(stat: string): string {
  const s = stat.toLowerCase();
  if (s.includes("physical attack")) return "bg-orange-500";
  if (s.includes("magic power")) return "bg-purple-500";
  if (s.includes("hp") && !s.includes("regen")) return "bg-green-500";
  if (s.includes("hp regen")) return "bg-emerald-500";
  if (s.includes("defense")) return "bg-yellow-500";
  if (s.includes("attack speed")) return "bg-cyan-500";
  if (s.includes("movement speed")) return "bg-teal-500";
  if (s.includes("mana")) return "bg-blue-500";
  if (s.includes("lifesteal") || s.includes("spell vamp")) return "bg-rose-500";
  if (s.includes("cooldown")) return "bg-sky-500";
  if (s.includes("crit")) return "bg-red-500";
  if (s.includes("penetration")) return "bg-pink-500";
  return "bg-gray-500";
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

function getCategoryDot(cat: string) {
  const c = String(cat || "").toLowerCase();
  if (c.includes("attack")) return "bg-orange-500";
  if (c.includes("magic")) return "bg-purple-500";
  if (c.includes("defense")) return "bg-yellow-500";
  if (c.includes("movement")) return "bg-teal-500";
  if (c.includes("jungling")) return "bg-emerald-500";
  if (c.includes("roaming")) return "bg-sky-500";
  return "bg-gray-500";
}

function getTierInfo(gold: number | null): { tier: number; label: string } {
  if (gold == null) return { tier: 0, label: "" };
  if (gold > 1500) return { tier: 3, label: "TIER 3" };
  if (gold >= 500) return { tier: 2, label: "TIER 2" };
  return { tier: 1, label: "TIER 1" };
}

function getAbilityBadgeClass(type: string): string {
  const t = type.toLowerCase();
  if (t === "active") return "bg-emerald-950/60 text-emerald-400 border-emerald-500/30";
  if (t.includes("unique")) return "bg-purple-950/60 text-purple-400 border-purple-500/30";
  return "bg-blue-950/60 text-blue-400 border-blue-500/30";
}

function getAbilityBorder(type: string): string {
  const t = type.toLowerCase();
  if (t === "active") return "border-l-emerald-500";
  if (t.includes("unique")) return "border-l-purple-500";
  return "border-l-blue-500";
}

function isComponent(item: Item): boolean {
  return !item.buildFrom || item.buildFrom.length === 0;
}

function getShortPassive(item: Item): string | null {
  if (item.abilities && item.abilities.length > 0) {
    return item.abilities[0].name;
  }
  if (item.passive) return item.passive;
  return null;
}

export default function ItemsCatalog({ items }: ItemsCatalogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const categories = ["ALL", "Attack", "Defense", "Magic", "Movement", "Jungling", "Roaming"];

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = String(item.name || "").toLowerCase().includes(String(searchTerm || "").toLowerCase());
      const matchesCat = selectedCategory === "ALL" || item.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [items, searchTerm, selectedCategory]);

  const itemMap = useMemo(() => {
    const m = new Map<string, Item>();
    for (const it of items) {
      m.set(it.name, it);
    }
    return m;
  }, [items]);

  React.useEffect(() => {
    if (filteredItems.length > 0 && (!selectedItem || !filteredItems.find(i => i.name === selectedItem.name))) {
      setSelectedItem(filteredItems[0]);
    }
  }, [filteredItems, selectedItem]);

  const tierInfo = selectedItem ? getTierInfo(selectedItem.gold) : null;
  const hasBuildFrom = selectedItem?.buildFrom && selectedItem.buildFrom.length > 0;
  const hasBuildsInto = selectedItem?.buildsInto && selectedItem.buildsInto.length > 0;
  const componentItem = selectedItem ? isComponent(selectedItem) : false;

  return (
    <div className="flex flex-col lg:flex-row gap-0 w-full min-h-[700px]">
      {/* ═══ LEFT PANEL: Item Browser ═══ */}
      <div className="lg:w-[380px] shrink-0 rounded-xl border border-gray-800 bg-[#060d1a] shadow-2xl overflow-hidden flex flex-col">
        {/* Search */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-800/60">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Cari item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-700/60 bg-gray-900/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition"
            />
          </div>
        </div>

        {/* Category filters */}
        <div className="px-4 py-3 border-b border-gray-800/60">
          <div className="flex items-center gap-1.5 flex-wrap">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-md px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-all duration-150 ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 ring-1 ring-indigo-400/30"
                      : "bg-gray-900/80 text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-700/50"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] font-mono text-gray-600">
              {filteredItems.length} items
            </span>
          </div>
        </div>

        {/* Item list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3">
          <div className="flex flex-col gap-1">
            {filteredItems.map((item, index) => {
              const isSelected = selectedItem?.name === item.name;
              const passive = getShortPassive(item);
              const comp = isComponent(item);
              return (
                <button
                  key={`${item.name}-${index}`}
                  onClick={() => setSelectedItem(item)}
                  className={`group w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-150 ${
                    isSelected
                      ? "bg-indigo-950/50 ring-1 ring-indigo-500/60 shadow-lg shadow-indigo-500/10"
                      : "bg-gray-900/20 hover:bg-gray-800/40 border border-transparent hover:border-gray-700/40"
                  }`}
                >
                  <FallbackImage
                    src={item.image}
                    fallbackText={item.name}
                    alt={item.name}
                    className={`h-11 w-11 rounded-lg object-contain border p-0.5 shrink-0 ${
                      isSelected ? "border-indigo-500/50 bg-gray-900" : "border-gray-700/30 bg-gray-900/60"
                    }`}
                    containerClassName={`h-11 w-11 rounded-lg shrink-0 text-[8px] bg-gray-900 border ${
                      isSelected ? "border-indigo-500/50" : "border-gray-700/30"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold truncate ${isSelected ? "text-white" : "text-gray-300 group-hover:text-white"}`}>
                        {item.name}
                      </span>
                      {comp && (
                        <span className="text-[8px] font-mono font-bold text-gray-600 bg-gray-800/60 rounded px-1.5 py-0.5 border border-gray-700/30 shrink-0">
                          CMP
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.gold != null && (
                        <span className="text-[10px] font-mono font-bold text-amber-400/80">
                          {item.gold.toLocaleString()}
                        </span>
                      )}
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getCategoryDot(item.category)}`} />
                      {passive && (
                        <span className="text-[10px] text-gray-600 truncate">{passive}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            {filteredItems.length === 0 && (
              <div className="py-12 text-center">
                <Swords className="h-10 w-10 text-gray-800 mx-auto mb-3" />
                <p className="text-xs text-gray-600">Tidak ada item ditemukan</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ RIGHT PANEL: Item Detail ═══ */}
      <div className="flex-1 min-w-0">
        {selectedItem ? (
          <div className="flex flex-col gap-4 p-6">
            {/* Not enriched warning */}
            {!selectedItem.isEnriched && (
              <div className="rounded-lg bg-amber-950/30 border border-amber-500/20 px-4 py-3 text-xs text-amber-400 font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 shrink-0" />
                Data belum lengkap — enrichment belum tersinkronisasi untuk item ini
              </div>
            )}

            {/* ─── A. DETAIL HEADER ─── */}
            <div className="rounded-xl border border-gray-800 bg-[#0a1120] p-6 shadow-lg">
              <div className="flex items-start gap-6">
                <div className="relative shrink-0">
                  <FallbackImage
                    src={selectedItem.image}
                    fallbackText={selectedItem.name}
                    alt={selectedItem.name}
                    className="h-28 w-28 rounded-2xl bg-gray-900 border border-gray-600/40 p-2 object-contain shadow-2xl shadow-black/40"
                    containerClassName="h-28 w-28 rounded-2xl text-2xl bg-gray-900 border border-gray-600/40"
                  />
                  {tierInfo && tierInfo.tier > 0 && (
                    <div className="absolute -bottom-2 -right-2 bg-gray-900 border border-amber-500/30 rounded-md px-2 py-0.5">
                      <span className="text-[9px] font-mono font-bold text-amber-400">{tierInfo.label}</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-black uppercase tracking-tight text-white leading-tight mb-3">
                    {selectedItem.name}
                  </h2>

                  <div className="flex items-center gap-2 flex-wrap mb-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-bold uppercase border ${getCategoryColor(selectedItem.category)}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${getCategoryDot(selectedItem.category)}`} />
                      {selectedItem.category}
                    </span>
                    {hasBuildFrom && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/40 px-2.5 py-1 rounded-md border border-cyan-500/20">
                        <Package className="h-3 w-3" />
                        FINAL
                      </span>
                    )}
                    {componentItem && selectedItem.gold != null && selectedItem.gold < 1000 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-gray-400 bg-gray-800/60 px-2.5 py-1 rounded-md border border-gray-600/20">
                        COMPONENT
                      </span>
                    )}
                    {selectedItem.dataQuality === "complete" && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3" />
                        VERIFIED
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    {selectedItem.gold != null ? (
                      <span className="inline-flex items-center gap-1.5 font-mono text-lg font-bold text-amber-400">
                        <Coins className="h-5 w-5" />
                        {selectedItem.gold.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-gray-600 italic text-xs">Harga belum tersedia</span>
                    )}
                    {selectedItem.source && (
                      <span className="text-[10px] font-mono text-gray-600">
                        via {selectedItem.source}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ─── B. STATS + UNIQUE ATTRIBUTES ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Base Stats */}
              <div className="rounded-xl border border-gray-800 bg-[#0a1120] p-5 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-1 h-5 rounded-full bg-blue-500" />
                  <Shield className="h-4 w-4 text-blue-400" />
                  <h4 className="text-[11px] font-bold text-gray-200 uppercase tracking-wider">Base Stats</h4>
                  {selectedItem.stats && (
                    <span className="ml-auto text-[10px] font-mono font-bold text-gray-500 bg-gray-800/60 rounded-full px-2.5 py-0.5 border border-gray-700/40">
                      {selectedItem.stats.length}
                    </span>
                  )}
                </div>
                {selectedItem.stats && selectedItem.stats.length > 0 ? (
                  <div className="flex flex-col gap-0">
                    {selectedItem.stats.map((stat, i) => (
                      <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-800/40 last:border-b-0">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-2 h-2 rounded-sm ${getStatDot(stat)}`} />
                          <span className="text-xs text-gray-400 font-medium">{stat.replace(/[+\-][\d.]+%?/, "").trim() || stat}</span>
                        </div>
                        <span className={`text-sm font-bold font-mono ${getStatColor(stat)}`}>
                          {stat.match(/[+\-][\d.]+%?/)?.[0] || stat}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-600 italic py-3">Stats belum tersedia</p>
                )}
              </div>

              {/* Unique Attributes */}
              <div className="rounded-xl border border-gray-800 bg-[#0a1120] p-5 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-1 h-5 rounded-full bg-amber-500" />
                  <Star className="h-4 w-4 text-amber-400" />
                  <h4 className="text-[11px] font-bold text-gray-200 uppercase tracking-wider">Unique Attributes</h4>
                </div>
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
                  <div className="rounded-lg bg-gray-900/30 border border-gray-800/30 px-4 py-5 text-center">
                    <p className="text-xs text-gray-600">
                      {componentItem
                        ? "Item komponen — tidak memiliki unique attribute."
                        : "Tidak ada unique attribute untuk item ini."}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ─── C. ABILITIES ─── */}
            <div className="rounded-xl border border-gray-800 bg-[#0a1120] p-5 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-5 rounded-full bg-blue-500" />
                <Zap className="h-4 w-4 text-blue-400" />
                <h4 className="text-[11px] font-bold text-gray-200 uppercase tracking-wider">Abilities</h4>
                {selectedItem.abilities && selectedItem.abilities.length > 0 && (
                  <span className="ml-auto text-[10px] font-mono font-bold text-gray-500 bg-gray-800/60 rounded-full px-2.5 py-0.5 border border-gray-700/40">
                    {selectedItem.abilities.length}
                  </span>
                )}
              </div>
              {selectedItem.abilities && selectedItem.abilities.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {selectedItem.abilities.map((ability, i) => (
                    <div
                      key={i}
                      className={`rounded-lg bg-gray-900/60 p-4 border border-gray-800/40 border-l-[3px] ${getAbilityBorder(ability.type)}`}
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
                <div className="rounded-lg bg-gray-900/30 p-4 border border-gray-800/30 text-center">
                  {componentItem ? (
                    <p className="text-xs text-gray-600">Item komponen — tidak memiliki passive/ability.</p>
                  ) : (
                    <p className="text-xs text-gray-600">Passive/ability belum tersedia dari source lokal.</p>
                  )}
                </div>
              )}
            </div>

            {/* ─── D. RECIPE / BUILD PATH ─── */}
            <div className="rounded-xl border border-gray-800 bg-[#0a1120] p-5 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-5 rounded-full bg-cyan-500" />
                <GitBranch className="h-4 w-4 text-cyan-400" />
                <h4 className="text-[11px] font-bold text-gray-200 uppercase tracking-wider">Recipe / Build Path</h4>
                {hasBuildFrom && (
                  <span className="ml-auto text-[10px] font-mono text-gray-600">
                    {selectedItem.buildFrom!.length} komponen
                  </span>
                )}
              </div>
              {hasBuildFrom ? (() => {
                const components = selectedItem.buildFrom!.map(name => itemMap.get(name)).filter(Boolean) as Item[];
                const allGoldKnown = selectedItem.gold != null && components.every(c => c.gold != null);
                const componentCost = components.reduce((sum, c) => sum + (c.gold ?? 0), 0);
                const combineFee = allGoldKnown && selectedItem.gold! > componentCost ? selectedItem.gold! - componentCost : null;

                return (
                  <div className="flex flex-col gap-4">
                    {/* Component cards row */}
                    <div className="flex items-center justify-center flex-wrap gap-3">
                      {components.map((comp, i) => (
                        <React.Fragment key={comp.name}>
                          {i > 0 && (
                            <span className="text-gray-600 font-bold text-lg select-none">+</span>
                          )}
                          <div className="flex flex-col items-center gap-1.5 rounded-lg bg-gray-900/60 border border-cyan-500/15 px-3 py-2.5 min-w-[90px] hover:border-cyan-500/40 transition-colors">
                            <FallbackImage
                              src={comp.image}
                              fallbackText={comp.name}
                              alt={comp.name}
                              className="h-10 w-10 rounded-md bg-gray-900 border border-gray-700/40 p-0.5 object-contain"
                              containerClassName="h-10 w-10 rounded-md text-[8px] bg-gray-900 border border-gray-700/40"
                            />
                            <span className="text-[10px] font-semibold text-gray-300 text-center leading-tight max-w-[80px] truncate">
                              {comp.name}
                            </span>
                            {comp.gold != null && (
                              <span className="text-[10px] font-mono font-bold text-amber-400/80">
                                {comp.gold.toLocaleString()}g
                              </span>
                            )}
                          </div>
                        </React.Fragment>
                      ))}

                      {/* Arrow connector */}
                      <div className="flex flex-col items-center gap-1 mx-2">
                        <ChevronRight className="h-5 w-5 text-gray-600" />
                      </div>

                      {/* Final item card */}
                      <div className="flex flex-col items-center gap-1.5 rounded-lg bg-indigo-950/30 border border-indigo-500/30 px-3 py-2.5 min-w-[90px] ring-1 ring-indigo-500/20 shadow-lg shadow-indigo-500/5">
                        <FallbackImage
                          src={selectedItem.image}
                          fallbackText={selectedItem.name}
                          alt={selectedItem.name}
                          className="h-10 w-10 rounded-md bg-gray-900 border border-indigo-500/40 p-0.5 object-contain"
                          containerClassName="h-10 w-10 rounded-md text-[8px] bg-gray-900 border border-indigo-500/40"
                        />
                        <span className="text-[10px] font-bold text-indigo-300 text-center leading-tight max-w-[80px] truncate">
                          {selectedItem.name}
                        </span>
                        {selectedItem.gold != null && (
                          <span className="text-[10px] font-mono font-bold text-amber-400">
                            {selectedItem.gold.toLocaleString()}g
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Combine fee / summary */}
                    {combineFee != null && (
                      <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-gray-600">
                        <span className="text-gray-700">|</span>
                        <span>Biaya combine:</span>
                        <span className="text-amber-400 font-bold">{combineFee.toLocaleString()}g</span>
                      </div>
                    )}
                  </div>
                );
              })() : hasBuildsInto ? (
                <div>
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider font-bold mb-3">Dapat diupgrade ke:</p>
                  <div className="flex items-center flex-wrap gap-3">
                    <div className="flex flex-col items-center gap-1.5 rounded-lg bg-indigo-950/30 border border-indigo-500/30 px-3 py-2.5 min-w-[90px]">
                      <FallbackImage
                        src={selectedItem.image}
                        fallbackText={selectedItem.name}
                        alt={selectedItem.name}
                        className="h-10 w-10 rounded-md bg-gray-900 border border-indigo-500/40 p-0.5 object-contain"
                        containerClassName="h-10 w-10 rounded-md text-[8px] bg-gray-900 border border-indigo-500/40"
                      />
                      <span className="text-[10px] font-bold text-indigo-300 text-center leading-tight">{selectedItem.name}</span>
                      {selectedItem.gold != null && (
                        <span className="text-[10px] font-mono font-bold text-amber-400/80">{selectedItem.gold.toLocaleString()}g</span>
                      )}
                    </div>

                    <ChevronRight className="h-5 w-5 text-gray-600" />

                    {selectedItem.buildsInto!.map((upgName, i) => {
                      const upg = itemMap.get(upgName);
                      return (
                        <div key={i} className="flex flex-col items-center gap-1.5 rounded-lg bg-gray-900/60 border border-amber-500/15 px-3 py-2.5 min-w-[90px] hover:border-amber-500/40 transition-colors">
                          {upg ? (
                            <>
                              <FallbackImage
                                src={upg.image}
                                fallbackText={upg.name}
                                alt={upg.name}
                                className="h-10 w-10 rounded-md bg-gray-900 border border-gray-700/40 p-0.5 object-contain"
                                containerClassName="h-10 w-10 rounded-md text-[8px] bg-gray-900 border border-gray-700/40"
                              />
                              <span className="text-[10px] font-semibold text-gray-300 text-center leading-tight max-w-[80px] truncate">{upg.name}</span>
                              {upg.gold != null && (
                                <span className="text-[10px] font-mono font-bold text-amber-400/80">{upg.gold.toLocaleString()}g</span>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="h-10 w-10 rounded-md bg-gray-900 border border-gray-700/40 flex items-center justify-center">
                                <span className="text-[8px] text-gray-600">?</span>
                              </div>
                              <span className="text-[10px] font-semibold text-gray-500 text-center leading-tight">{upgName}</span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-gray-900/30 border border-gray-800/30 px-4 py-5 text-center">
                  <p className="text-xs text-gray-600">Recipe belum tersedia</p>
                  <p className="text-[10px] text-gray-700 mt-1">Data recipe belum tersedia dari source lokal.</p>
                </div>
              )}
            </div>

            {/* ─── E + F. RECOMMENDED HEROES + EFFECTIVENESS ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-gray-800 bg-[#0a1120] p-5 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-1 h-5 rounded-full bg-gray-600" />
                  <h4 className="text-[11px] font-bold text-gray-200 uppercase tracking-wider">Recommended Heroes</h4>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed py-2">
                  Data rekomendasi hero belum tersedia dari source lokal.
                </p>
              </div>

              <div className="rounded-xl border border-gray-800 bg-[#0a1120] p-5 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-1 h-5 rounded-full bg-gray-600" />
                  <h4 className="text-[11px] font-bold text-gray-200 uppercase tracking-wider">Effectiveness</h4>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed py-2">
                  Data effectiveness belum tersedia dari source lokal.
                </p>
              </div>
            </div>

            {/* ─── G. TIPS & NOTES ─── */}
            <div className="rounded-xl border border-gray-800 bg-[#0a1120] p-5 shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-1 h-5 rounded-full bg-gray-600" />
                <h4 className="text-[11px] font-bold text-gray-200 uppercase tracking-wider">Tips & Notes</h4>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed py-2">
                Belum tersedia dari source lokal.
              </p>
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="rounded-xl border border-gray-800 bg-[#0a1120] shadow-lg flex flex-col items-center justify-center h-full min-h-[600px] text-center mx-6">
            <Swords className="h-16 w-16 text-gray-800 mb-4" />
            <p className="text-sm font-medium text-gray-500">Pilih item dari panel kiri</p>
            <p className="text-[11px] text-gray-600 mt-1">Klik item untuk melihat detail database</p>
          </div>
        )}
      </div>
    </div>
  );
}
