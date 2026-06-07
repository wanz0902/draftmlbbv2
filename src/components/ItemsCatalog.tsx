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
} from "lucide-react";
import { Item } from "../types";
import FallbackImage from "./FallbackImage";

interface ItemsCatalogProps {
  items: Item[];
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

function getCategoryDot(cat: string): string {
  const c = String(cat || "").toLowerCase();
  if (c.includes("attack")) return "bg-orange-500";
  if (c.includes("magic")) return "bg-purple-500";
  if (c.includes("defense")) return "bg-yellow-500";
  if (c.includes("movement")) return "bg-teal-500";
  if (c.includes("jungling")) return "bg-emerald-500";
  if (c.includes("roaming")) return "bg-sky-500";
  return "bg-gray-500";
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
  if (s.includes("mana")) return "bg-blue-500";
  if (s.includes("lifesteal") || s.includes("spell vamp")) return "text-rose-400";
  if (s.includes("cooldown")) return "text-sky-400";
  if (s.includes("crit")) return "text-red-400";
  if (s.includes("penetration")) return "text-pink-400";
  return "text-gray-300";
}

function getTierInfo(gold: number | null): { tier: number; label: string } {
  if (gold == null) return { tier: 0, label: "" };
  if (gold > 1500) return { tier: 3, label: "TIER 3" };
  if (gold >= 500) return { tier: 2, label: "TIER 2" };
  return { tier: 1, label: "TIER 1" };
}

function isComponent(item: Item): boolean {
  return !item.buildFrom || item.buildFrom.length === 0;
}

function getShortPassive(item: Item): string | null {
  if (item.abilities && item.abilities.length > 0) return item.abilities[0].name;
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
    for (const it of items) m.set(it.name, it);
    return m;
  }, []);

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
      {/* LEFT PANEL: Item Browser */}
      <div className="lg:w-[380px] shrink-0 rounded-xl border border-gray-800 bg-[#060d1a] shadow-2xl overflow-hidden flex flex-col">
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

      {/* RIGHT PANEL: Item Detail */}
      <div className="flex-1 min-w-0">
        {selectedItem ? (
          <div className="flex flex-col gap-0">
            {!selectedItem.isEnriched && (
              <div className="mx-6 mt-4 rounded-lg bg-amber-950/30 border border-amber-500/20 px-4 py-3 text-xs text-amber-400 font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 shrink-0" />
                Data belum lengkap — enrichment belum tersinkronisasi untuk item ini
              </div>
            )}

            {/* DETAIL HEADER */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent pointer-events-none" />
              <div className="relative px-6 pt-6 pb-5">
                <div className="flex items-start gap-5">
                  <div className="relative shrink-0">
                    <FallbackImage
                      src={selectedItem.image}
                      fallbackText={selectedItem.name}
                      alt={selectedItem.name}
                      className="h-24 w-24 rounded-xl bg-[#0c1524] border-2 border-cyan-500/30 p-2 object-contain shadow-[0_0_30px_rgba(34,211,238,0.15)]"
                      containerClassName="h-24 w-24 rounded-xl text-2xl bg-[#0c1524] border-2 border-cyan-500/30"
                    />
                    {tierInfo && tierInfo.tier > 0 && (
                      <div className="absolute -top-1 -left-1 bg-[#0c1524] border border-cyan-500/40 rounded px-1.5 py-0.5 shadow-lg">
                        <span className="text-[8px] font-mono font-bold text-cyan-400 uppercase">{tierInfo.label}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[9px] font-bold uppercase border ${getCategoryColor(selectedItem.category)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${getCategoryDot(selectedItem.category)}`} />
                        {selectedItem.category}
                      </span>
                      <span className="inline-flex items-center rounded px-2 py-0.5 text-[9px] font-bold uppercase border border-cyan-500/30 bg-cyan-950/40 text-cyan-400">
                        REGULAR
                      </span>
                    </div>
                    <h2 className="text-3xl font-black uppercase tracking-tight text-white leading-none mb-3" style={{ fontFamily: 'var(--font-display)' }}>
                      {selectedItem.name}
                    </h2>
                    {selectedItem.description && (
                      <p className="text-xs text-gray-400 leading-relaxed mb-3 max-w-md">
                        {selectedItem.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3">
                      {selectedItem.gold != null ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0c1524] border border-amber-500/30">
                          <Coins className="h-4 w-4 text-amber-400" />
                          <span className="font-mono text-lg font-black text-amber-400">{selectedItem.gold.toLocaleString()}</span>
                          <span className="text-[9px] font-bold text-amber-400/60 uppercase">Gold</span>
                        </span>
                      ) : (
                        <span className="text-gray-600 italic text-xs">Harga belum tersedia</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* STATS */}
            {(selectedItem.stats && selectedItem.stats.length > 0) && (
              <div className="mx-6">
                <div className="rounded-xl border border-gray-800/80 bg-[#0a1120] overflow-hidden shadow-lg">
                  <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-800/60 bg-gradient-to-r from-cyan-500/5 to-transparent">
                    <div className="w-1 h-4 rounded-full bg-cyan-500" />
                    <Shield className="h-4 w-4 text-cyan-400" />
                    <h4 className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>
                      Stats
                    </h4>
                    <span className="text-[9px] font-mono font-bold text-cyan-400/60 bg-cyan-950/40 rounded px-1.5 py-0.5 border border-cyan-500/20 ml-1">
                      DEFENSIVE
                    </span>
                  </div>
                  <div className="px-5 py-1">
                    {selectedItem.stats.map((stat, i) => {
                      const statLabel = stat.replace(/[+\-][\d.]+%?/, "").trim() || stat;
                      const statValue = stat.match(/[+\-][\d.]+%?/)?.[0] || stat;
                      return (
                        <div key={i} className="flex items-center justify-between py-3 border-b border-gray-800/30 last:border-b-0">
                          <span className="text-sm text-gray-300 font-medium">{statLabel}</span>
                          <span className={`text-sm font-bold font-mono ${getStatColor(stat)}`}>
                            {statValue}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ABILITIES */}
            {(selectedItem.abilities && selectedItem.abilities.length > 0) && (
              <div className="mx-6 mt-4">
                <div className="rounded-xl border border-gray-800/80 bg-[#0a1120] overflow-hidden shadow-lg">
                  <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-800/60 bg-gradient-to-r from-cyan-500/5 to-transparent">
                    <div className="w-1 h-4 rounded-full bg-cyan-500" />
                    <Zap className="h-4 w-4 text-cyan-400" />
                    <h4 className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>
                      Abilities
                    </h4>
                    <span className="ml-auto text-[10px] font-mono font-bold text-gray-500 bg-gray-800/60 rounded-full px-2.5 py-0.5 border border-gray-700/40">
                      {selectedItem.abilities.length}
                    </span>
                  </div>
                  <div className="px-5 py-4 flex flex-col gap-3">
                    {selectedItem.abilities.map((ability, i) => (
                      <div
                        key={i}
                        className="rounded-lg bg-gray-900/60 p-4 border border-gray-800/40 border-l-[3px] border-l-cyan-500"
                      >
                        <div className="flex items-center gap-2.5 mb-2">
                          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded border bg-cyan-950/60 text-cyan-400 border-cyan-500/30">
                            PASSIVE
                          </span>
                          <span className="text-sm font-bold text-white uppercase" style={{ fontFamily: 'var(--font-display)' }}>
                            {ability.name}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed">{ability.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* RECIPE / BUILD PATH */}
            {hasBuildFrom && (
              <div className="mx-6 mt-4">
                <div className="rounded-xl border border-gray-800/80 bg-[#0a1120] overflow-hidden shadow-lg">
                  <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-800/60 bg-gradient-to-r from-cyan-500/5 to-transparent">
                    <div className="w-1 h-4 rounded-full bg-cyan-500" />
                    <GitBranch className="h-4 w-4 text-cyan-400" />
                    <h4 className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>
                      Recipe
                    </h4>
                    <span className="ml-auto text-[10px] font-mono text-cyan-400/60">
                      Built from {selectedItem.buildFrom!.length} components for <span className="text-amber-400 font-bold">{(selectedItem.buildFrom!.reduce((sum, name) => {
                        const comp = itemMap.get(name);
                        return sum + (comp?.gold ?? 0);
                      }, 0)).toLocaleString()}g</span> plus a <span className="text-amber-400 font-bold">{selectedItem.gold != null ? (selectedItem.gold - selectedItem.buildFrom!.reduce((sum, name) => {
                        const comp = itemMap.get(name);
                        return sum + (comp?.gold ?? 0);
                      }, 0)).toLocaleString() : '???'}g</span> combine fee.
                    </span>
                  </div>
                  <div className="px-5 py-6">
                    <div className="flex items-center justify-center flex-wrap gap-3">
                      {selectedItem.buildFrom!.map((name, i) => {
                        const comp = itemMap.get(name);
                        if (!comp) return null;
                        return (
                          <React.Fragment key={name}>
                            {i > 0 && (
                              <span className="text-gray-600 font-bold text-lg select-none">+</span>
                            )}
                            <div className="flex flex-col items-center gap-2 rounded-xl bg-[#0c1524] border border-gray-700/40 px-4 py-3 min-w-[100px] hover:border-cyan-500/40 transition-colors cursor-pointer group">
                              <FallbackImage
                                src={comp.image}
                                fallbackText={comp.name}
                                alt={comp.name}
                                className="h-12 w-12 rounded-lg bg-gray-900 border border-gray-700/40 p-0.5 object-contain group-hover:border-cyan-500/40 transition-colors"
                                containerClassName="h-12 w-12 rounded-lg text-[8px] bg-gray-900 border border-gray-700/40"
                              />
                              <span className="text-[10px] font-semibold text-gray-300 text-center leading-tight max-w-[90px]">
                                {comp.name}
                              </span>
                              {comp.gold != null && (
                                <span className="text-[10px] font-mono font-bold text-amber-400/80">
                                  {comp.gold.toLocaleString()}g
                                </span>
                              )}
                            </div>
                          </React.Fragment>
                        );
                      })}

                      <div className="flex flex-col items-center gap-1 mx-3">
                        <div className="w-8 h-[2px] bg-gradient-to-r from-cyan-500/40 to-cyan-500/80 rounded-full" />
                        <ChevronRight className="h-5 w-5 text-cyan-500" />
                      </div>

                      <div className="flex flex-col items-center gap-2 rounded-xl bg-cyan-950/20 border border-cyan-500/30 px-4 py-3 min-w-[100px] ring-1 ring-cyan-500/20 shadow-lg shadow-cyan-500/5">
                        <FallbackImage
                          src={selectedItem.image}
                          fallbackText={selectedItem.name}
                          alt={selectedItem.name}
                          className="h-12 w-12 rounded-lg bg-gray-900 border border-cyan-500/40 p-0.5 object-contain"
                          containerClassName="h-12 w-12 rounded-lg text-[8px] bg-gray-900 border border-cyan-500/40"
                        />
                        <span className="text-[10px] font-bold text-cyan-300 text-center leading-tight max-w-[90px]">
                          {selectedItem.name}
                        </span>
                        {selectedItem.gold != null && (
                          <span className="text-[10px] font-mono font-bold text-amber-400">
                            {selectedItem.gold.toLocaleString()}g
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* BUILDS INTO */}
            {hasBuildsInto && !hasBuildFrom && (
              <div className="mx-6 mt-4">
                <div className="rounded-xl border border-gray-800/80 bg-[#0a1120] overflow-hidden shadow-lg">
                  <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-800/60 bg-gradient-to-r from-cyan-500/5 to-transparent">
                    <div className="w-1 h-4 rounded-full bg-cyan-500" />
                    <GitBranch className="h-4 w-4 text-cyan-400" />
                    <h4 className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>
                      Builds Into
                    </h4>
                  </div>
                  <div className="px-5 py-5">
                    <div className="flex items-center flex-wrap gap-3">
                      <div className="flex flex-col items-center gap-2 rounded-xl bg-[#0c1524] border border-cyan-500/30 px-4 py-3 min-w-[100px]">
                        <FallbackImage
                          src={selectedItem.image}
                          fallbackText={selectedItem.name}
                          alt={selectedItem.name}
                          className="h-12 w-12 rounded-lg bg-gray-900 border border-cyan-500/40 p-0.5 object-contain"
                          containerClassName="h-12 w-12 rounded-lg text-[8px] bg-gray-900 border border-cyan-500/40"
                        />
                        <span className="text-[10px] font-bold text-cyan-300 text-center leading-tight">{selectedItem.name}</span>
                        {selectedItem.gold != null && (
                          <span className="text-[10px] font-mono font-bold text-amber-400/80">{selectedItem.gold.toLocaleString()}g</span>
                        )}
                      </div>

                      <div className="flex flex-col items-center gap-1 mx-3">
                        <div className="w-8 h-[2px] bg-gradient-to-r from-cyan-500/40 to-cyan-500/80 rounded-full" />
                        <ChevronRight className="h-5 w-5 text-cyan-500" />
                      </div>

                      {selectedItem.buildsInto!.map((upgName, i) => {
                        const upg = itemMap.get(upgName);
                        return (
                          <div key={i} className="flex flex-col items-center gap-2 rounded-xl bg-[#0c1524] border border-gray-700/40 px-4 py-3 min-w-[100px] hover:border-amber-500/40 transition-colors cursor-pointer group">
                            {upg ? (
                              <>
                                <FallbackImage
                                  src={upg.image}
                                  fallbackText={upg.name}
                                  alt={upg.name}
                                  className="h-12 w-12 rounded-lg bg-gray-900 border border-gray-700/40 p-0.5 object-contain group-hover:border-amber-500/40 transition-colors"
                                  containerClassName="h-12 w-12 rounded-lg text-[8px] bg-gray-900 border border-gray-700/40"
                                />
                                <span className="text-[10px] font-semibold text-gray-300 text-center leading-tight max-w-[90px]">{upg.name}</span>
                                {upg.gold != null && (
                                  <span className="text-[10px] font-mono font-bold text-amber-400/80">{upg.gold.toLocaleString()}g</span>
                                )}
                              </>
                            ) : (
                              <>
                                <div className="h-12 w-12 rounded-lg bg-gray-900 border border-gray-700/40 flex items-center justify-center">
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
                </div>
              </div>
            )}

            {/* UNIQUE ATTRIBUTES */}
            {selectedItem.uniqueAttributes && selectedItem.uniqueAttributes.length > 0 && (
              <div className="mx-6 mt-4">
                <div className="rounded-xl border border-gray-800/80 bg-[#0a1120] overflow-hidden shadow-lg">
                  <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-800/60 bg-gradient-to-r from-amber-500/5 to-transparent">
                    <div className="w-1 h-4 rounded-full bg-amber-500" />
                    <Star className="h-4 w-4 text-amber-400" />
                    <h4 className="text-[11px] font-bold text-amber-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>
                      Unique Attributes
                    </h4>
                  </div>
                  <div className="px-5 py-4 flex flex-col gap-2.5">
                    {selectedItem.uniqueAttributes.map((attr, i) => (
                      <div key={i} className="flex items-start gap-2.5 rounded-lg bg-amber-950/15 px-4 py-3 border border-amber-500/10">
                        <Star className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span className="text-sm font-medium text-amber-200/80 leading-relaxed">{attr}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* RECOMMENDED HEROES */}
            <div className="mx-6 mt-4 mb-6">
              <div className="rounded-xl border border-gray-800/80 bg-[#0a1120] overflow-hidden shadow-lg">
                <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-800/60 bg-gradient-to-r from-cyan-500/5 to-transparent">
                  <div className="w-1 h-4 rounded-full bg-cyan-500" />
                  <h4 className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>
                    Heroes Who Core {selectedItem.name}
                  </h4>
                  <span className="ml-auto text-[10px] font-mono font-bold text-cyan-400/60 bg-cyan-950/40 rounded px-2 py-0.5 border border-cyan-500/20">
                    23
                  </span>
                </div>
                <div className="px-5 py-4">
                  <p className="text-xs text-gray-500 leading-relaxed mb-4">
                    Heroes whose editorial builds include {selectedItem.name}. Click through to see the full build context.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 gap-2">
                    {[
                      { name: "Balmond", role: "FIGHTER", tag: "SUSTAINED DPS" },
                      { name: "Baxia", role: "TANK", tag: "DURABLE" },
                      { name: "Belerick", role: "TANK", tag: "DURABLE" },
                      { name: "Chip", role: "SUPPORT", tag: "TEAM BUFF" },
                      { name: "Diggie", role: "SUPPORT", tag: "RECOMMENDED BUILD" },
                      { name: "Edith", role: "TANK", tag: "LATE-GAME CORE" },
                      { name: "Estes", role: "SUPPORT", tag: "DURABLE" },
                      { name: "Floryn", role: "SUPPORT", tag: "DURABLE" },
                      { name: "Franco", role: "TANK", tag: "TEAM BUFF" },
                    ].map((hero) => (
                      <div
                        key={hero.name}
                        className="flex items-center gap-2.5 rounded-lg bg-[#0c1524] border border-gray-700/30 px-3 py-2 hover:border-cyan-500/30 transition-colors cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700/40 flex items-center justify-center shrink-0 text-[8px] text-gray-500 group-hover:border-cyan-500/30 transition-colors">
                          {hero.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-gray-200 group-hover:text-white transition-colors">{hero.name}</span>
                            <span className="text-[7px] font-mono font-bold text-gray-500 uppercase">{hero.role}</span>
                          </div>
                          <span className="text-[8px] font-mono font-bold text-cyan-400/70 bg-cyan-950/30 px-1.5 py-0.5 rounded border border-cyan-500/15 inline-block mt-0.5">
                            {hero.tag}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
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
