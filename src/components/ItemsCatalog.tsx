import React, { useState, useMemo } from "react";
import {
  Search,
  Coins,
  Zap,
  Star,
  GitBranch,
  Shield,
  Swords,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { Item, HeroStats } from "../types";
import FallbackImage from "./FallbackImage";
import { getHeroImageUrl, getHeroRole } from "../lib/heroUtils";

interface ItemsCatalogProps {
  items: Item[];
  heroAssets: Record<string, string>;
  heroes: HeroStats[];
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

function getCategoryAccent(cat: string): string {
  const c = String(cat || "").toLowerCase();
  if (c.includes("attack")) return "#E8593A";
  if (c.includes("magic")) return "#9B59B6";
  if (c.includes("defense")) return "#F0C040";
  if (c.includes("movement")) return "#2ECC71";
  if (c.includes("jungling")) return "#1ABC9C";
  if (c.includes("roaming")) return "#3498DB";
  return "#C8AA6E";
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

function getHeroRoles(hero: HeroStats): string[] {
  const r = hero.role;
  if (Array.isArray(r)) return r.map((x) => x.toLowerCase());
  if (typeof r === "string") return [r.toLowerCase()];
  return [];
}

const MAGIC_FIGHTERS: Record<string, string> = {
  "guinevere": "magic",
  "silvanna": "magic",
  "bane": "magic",
  "gatotkaca": "magic",
  "phoveus": "magic",
};

const MAGIC_TANKS: Record<string, string> = {
  "gatotkaca": "magic",
  "esmeralda": "magic",
  "obsidia": "magic",
  "belerick": "magic",
};

const PHYSICAL_MAGES: Record<string, string> = {
  "roger": "physical",
};

function getHeroDamageType(hero: HeroStats): "physical" | "magic" {
  const name = hero.hero_name.toLowerCase().trim();
  const roles = getHeroRoles(hero);

  if (MAGIC_FIGHTERS[name]) return "magic";
  if (MAGIC_TANKS[name]) return "magic";

  if (roles.includes("marksman")) return "physical";
  if (roles.includes("assassin") && !roles.includes("mage")) return "physical";
  if (roles.includes("fighter") && !roles.includes("mage")) return "physical";
  if (roles.includes("tank") && !roles.includes("mage") && !MAGIC_TANKS[name]) return "physical";

  if (roles.includes("mage")) return "magic";

  return "physical";
}

function getHeroDisplayTag(hero: HeroStats): string {
  const name = hero.hero_name.toLowerCase().trim();
  const dtype = getHeroDamageType(hero);
  const roles = getHeroRoles(hero);

  if (dtype === "magic" && roles.includes("fighter")) return "Magic Fighter";
  if (dtype === "magic" && roles.includes("tank")) return "Magic Tank";
  if (dtype === "magic" && roles.includes("assassin")) return "Magic Assassin";
  if (roles.includes("marksman")) return "Marksman";
  if (roles.includes("tank") && roles.includes("support")) return "Roamer";
  if (roles.includes("tank")) return "Tank";
  if (roles.includes("assassin")) return "Assassin";
  if (roles.includes("fighter")) return "Fighter";
  if (roles.includes("support")) return "Support";
  if (roles.includes("mage")) return "Mage";

  return hero.role?.toString() || "Unknown";
}

function getItemDamageType(item: Item): "physical" | "magic" | "defense" | "utility" {
  const cat = String(item.category || "").toLowerCase();
  if (cat === "defense") return "defense";
  if (cat === "movement") return "utility";
  if (cat === "jungling") return "utility";
  if (cat === "roaming") return "utility";

  const stats = (item.stats || []).join(" ").toLowerCase();
  const passives = (item.abilities || []).map(a => `${a.name} ${a.description}`).join(" ").toLowerCase();
  const unique = (item.uniqueAttributes || []).join(" ").toLowerCase();
  const all = `${stats} ${passives} ${unique}`;

  if (cat === "magic" || all.includes("magic power") || all.includes("magic damage")) return "magic";
  if (cat === "attack" || all.includes("physical attack") || all.includes("critical") || all.includes("physical damage") || all.includes("lifesteal") || all.includes("attack speed")) return "physical";

  return "physical";
}

function getItemSubType(item: Item): string {
  const stats = (item.stats || []).join(" ").toLowerCase();
  const passives = (item.abilities || []).map(a => `${a.name} ${a.description}`).join(" ").toLowerCase();
  const unique = (item.uniqueAttributes || []).join(" ").toLowerCase();
  const all = `${stats} ${passives} ${unique}`;

  if (all.includes("critical chance") || all.includes("critical damage") || all.includes("crit")) return "crit";
  if (all.includes("attack speed")) return "atkspd";
  if (all.includes("lifesteal") || all.includes("spell vamp")) return "lifesteal";
  if (all.includes("penetration") || all.includes("armor") || all.includes("magic pen")) return "pen";
  if (all.includes("hp") && !all.includes("hp regen")) return "hp";
  if (all.includes("physical defense") || all.includes("magic defense") || all.includes("defense")) return "defense";
  if (all.includes("cooldown reduction")) return "cdr";
  if (all.includes("mana")) return "mana";
  if (all.includes("movement speed")) return "boots";
  if (all.includes("jungle") || all.includes("retribution")) return "jungle";
  if (all.includes("roam")) return "roam";

  return "generic";
}

function heroCanUseItem(hero: HeroStats, item: Item): boolean {
  const heroDtype = getHeroDamageType(hero);
  const itemDtype = getItemDamageType(item);
  const itemSub = getItemSubType(item);
  const roles = getHeroRoles(hero);
  const cat = String(item.category || "").toLowerCase();

  if (cat === "movement") {
    if (itemSub === "boots") return true;
    return true;
  }

  if (cat === "jungling") {
    return roles.includes("fighter") || roles.includes("assassin") || roles.includes("marksman");
  }

  if (cat === "roaming") {
    return roles.includes("tank") || roles.includes("support");
  }

  if (cat === "defense") {
    if (itemSub === "defense" || itemSub === "hp") {
      return roles.includes("tank") || roles.includes("fighter") || roles.includes("support") ||
             (roles.includes("mage") && heroDtype === "magic") ||
             (roles.includes("assassin"));
    }
    return true;
  }

  if (itemDtype === "magic") {
    return heroDtype === "magic";
  }

  if (itemDtype === "physical") {
    if (heroDtype === "magic") return false;

    if (itemSub === "crit") {
      return roles.includes("marksman") || roles.includes("assassin") ||
             (roles.includes("fighter") && heroDtype === "physical");
    }

    if (itemSub === "atkspd") {
      return roles.includes("marksman");
    }

    if (itemSub === "lifesteal") {
      return roles.includes("marksman") || roles.includes("fighter") || roles.includes("assassin");
    }

    if (itemSub === "pen") {
      return roles.includes("assassin") || roles.includes("fighter");
    }

    return roles.includes("fighter") || roles.includes("assassin") || roles.includes("marksman");
  }

  return true;
}

function filterHeroesForItem(item: Item, heroes: HeroStats[]): HeroStats[] {
  return heroes.filter((hero) => heroCanUseItem(hero, item));
}

export default function ItemsCatalog({ items, heroAssets, heroes }: ItemsCatalogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [view, setView] = useState<"list" | "detail">("list");

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
    <div className="w-full min-h-[700px]">
      {/* ═══ LIST VIEW ═══ */}
      {view === "list" && (
        <div className="flex flex-col gap-0">
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9BA0B4]" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0a0e1a]/90 border border-[#C8AA6E]/15 py-3 pl-11 pr-4 text-sm text-white placeholder-[#9BA0B4] outline-none focus:border-[#C8AA6E]/40 transition rounded-xl"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap mb-4">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              const catAccent = cat === "ALL" ? "#C8AA6E" : getCategoryAccent(cat);
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider transition-all duration-150 rounded-lg ${
                    isActive ? "text-black" : "text-[#9BA0B4] hover:text-white border border-white/[0.06] hover:border-white/15 bg-white/[0.02]"
                  }`}
                  style={isActive ? { background: catAccent, boxShadow: `0 0 20px ${catAccent}30` } : {}}
                >
                  {cat}
                </button>
              );
            })}
            <span className="ml-auto text-[11px] font-bold tabular-nums text-[#F0D060]">
              {filteredItems.length} items
            </span>
          </div>

          {/* Premium card grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredItems.map((item, index) => {
              const accent = getCategoryAccent(item.category);
              const tier = getTierInfo(item.gold);
              const passive = getShortPassive(item);
              const comp = isComponent(item);
              const topStats = (item.stats || []).slice(0, 3);
              return (
                <button
                  key={`${item.name}-${index}`}
                  onClick={() => { setSelectedItem(item); setView("detail"); }}
                  className="group relative text-left transition-all duration-300 hover:-translate-y-1 rounded-xl overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, rgba(10,14,26,0.95), rgba(15,20,35,0.95))",
                    border: `1px solid ${accent}20`,
                    boxShadow: `0 0 0 0px ${accent}00`,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${accent}50`; e.currentTarget.style.boxShadow = `0 0 30px ${accent}15, 0 8px 32px rgba(0,0,0,0.4)`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = `${accent}20`; e.currentTarget.style.boxShadow = `0 0 0 0px ${accent}00`; }}
                >
                  {/* Top accent line */}
                  <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${accent}00, ${accent}, ${accent}00)` }} />
                  {/* Corner accents */}
                  <div className="absolute top-0 left-0 w-3 h-3 pointer-events-none" style={{ borderTop: `2px solid ${accent}60`, borderLeft: `2px solid ${accent}60` }} />
                  <div className="absolute bottom-0 right-0 w-3 h-3 pointer-events-none" style={{ borderBottom: `2px solid ${accent}30`, borderRight: `2px solid ${accent}30` }} />

                  <div className="relative z-10 p-3 flex gap-3">
                    {/* Item image */}
                    <div className="relative shrink-0" style={{ filter: `drop-shadow(0 0 12px ${accent}25)` }}>
                      <FallbackImage
                        src={item.image}
                        fallbackText={item.name}
                        alt={item.name}
                        className="h-16 w-16 rounded-xl object-contain bg-black/30 border p-1"
                        containerClassName="h-16 w-16 rounded-xl text-sm bg-black/30 border"
                        style={{ borderColor: `${accent}30` }}
                      />
                      {tier.tier > 0 && (
                        <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded text-[7px] font-bold border"
                          style={{ background: `${accent}20`, color: accent, borderColor: `${accent}40` }}>
                          T{tier.tier}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[11px] font-bold text-white uppercase tracking-wide truncate" style={{ fontFamily: 'var(--font-display)' }}>
                          {item.name}
                        </span>
                        {comp && <span className="text-[7px] font-bold text-[#9BA0B4]/50 bg-white/5 px-1 py-0.5 rounded shrink-0">CMP</span>}
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded"
                          style={{ background: `${accent}15`, color: accent }}>
                          {item.category}
                        </span>
                        {item.gold != null && (
                          <span className="text-[10px] font-bold tabular-nums text-[#F0D060] flex items-center gap-0.5">
                            <Coins className="h-3 w-3" />
                            {item.gold.toLocaleString()}
                          </span>
                        )}
                      </div>

                      {/* Passive preview */}
                      {passive && (
                        <div className="flex items-center gap-1 mb-1.5">
                          <Zap className="h-3 w-3 text-cyan-400 shrink-0" />
                          <span className="text-[9px] text-cyan-400 font-semibold truncate">{passive}</span>
                        </div>
                      )}

                      {/* Mini stats */}
                      {topStats.length > 0 && (
                        <div className="flex flex-col gap-0.5">
                          {topStats.map((stat, si) => {
                            const label = stat.replace(/[+\-][\d.]+%?/, "").trim();
                            const val = stat.match(/[+\-][\d.]+%?/)?.[0] || "";
                            const raw = parseFloat(stat.match(/[\d.]+/)?.[0] || "0");
                            const isPct = stat.includes("%");
                            const max = isPct ? 100 : 200;
                            const w = Math.min((raw / max) * 100, 100);
                            return (
                              <div key={si} className="flex items-center gap-1.5">
                                <span className="text-[8px] text-gray-500 w-14 truncate">{label}</span>
                                <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                                  <div className="h-full rounded-full transition-all" style={{ width: `${w}%`, background: accent, opacity: 0.5 }} />
                                </div>
                                <span className={`text-[8px] font-bold font-mono ${getStatColor(stat)} w-8 text-right`}>{val}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="py-20 text-center">
              <Swords className="h-14 w-14 text-[#C8AA6E]/15 mx-auto mb-4" />
              <p className="text-sm text-[#9BA0B4]">No items found</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ DETAIL VIEW ═══ */}
      {view === "detail" && selectedItem && (
        <div className="flex flex-col gap-0">
          <button
            onClick={() => setView("list")}
            className="flex items-center gap-2 px-4 py-2.5 mb-4 bg-white/[0.03] border border-white/[0.06] text-[#9BA0B4] hover:text-white hover:border-white/15 transition-all w-fit rounded-lg"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            <span className="text-[11px] font-bold uppercase tracking-wide">Back to Items</span>
          </button>

          {/* Detail hero header */}
          <div className="relative overflow-hidden rounded-xl mb-4"
            style={{
              background: `linear-gradient(135deg, rgba(10,14,26,0.98), rgba(15,20,35,0.95))`,
              border: `1px solid ${getCategoryAccent(selectedItem.category)}25`,
            }}>
            <div className="absolute top-0 left-0 right-0 h-[3px]"
              style={{ background: `linear-gradient(90deg, transparent, ${getCategoryAccent(selectedItem.category)}, transparent)` }} />
            <div className="absolute inset-0 opacity-20 pointer-events-none"
              style={{ background: `radial-gradient(ellipse at 20% 50%, ${getCategoryAccent(selectedItem.category)}20, transparent 70%)` }} />

            <div className="relative z-10 p-6 flex items-start gap-6">
              <div className="relative shrink-0" style={{ filter: `drop-shadow(0 0 20px ${getCategoryAccent(selectedItem.category)}30)` }}>
                <FallbackImage
                  src={selectedItem.image}
                  fallbackText={selectedItem.name}
                  alt={selectedItem.name}
                  className="h-28 w-28 rounded-2xl object-contain bg-black/40 border-2 p-2"
                  containerClassName="h-28 w-28 rounded-2xl text-2xl bg-black/40 border-2"
                  style={{ borderColor: `${getCategoryAccent(selectedItem.category)}40` }}
                />
                {tierInfo && tierInfo.tier > 0 && (
                  <div className="absolute -top-2 -right-2 px-2 py-1 rounded-lg text-[9px] font-bold border shadow-lg"
                    style={{ background: `${getCategoryAccent(selectedItem.category)}20`, color: getCategoryAccent(selectedItem.category), borderColor: `${getCategoryAccent(selectedItem.category)}50` }}>
                    {tierInfo.label}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded"
                    style={{ background: `${getCategoryAccent(selectedItem.category)}15`, color: getCategoryAccent(selectedItem.category) }}>
                    {selectedItem.category}
                  </span>
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
                    Regular
                  </span>
                </div>

                <h2 className="text-3xl font-black uppercase tracking-tight text-white leading-none mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                  {selectedItem.name}
                </h2>

                {selectedItem.description && (
                  <p className="text-xs text-gray-400 leading-relaxed mb-3 max-w-lg">{selectedItem.description}</p>
                )}

                {selectedItem.gold != null && (
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F0D060]/10 border border-[#F0D060]/25">
                    <Coins className="h-5 w-5 text-[#F0D060]" />
                    <span className="font-mono text-xl font-black text-[#F0D060]">{selectedItem.gold.toLocaleString()}</span>
                    <span className="text-[10px] font-bold text-[#F0D060]/60 uppercase">Gold</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats + Abilities side by side */}
          <div className="grid gap-4 lg:grid-cols-2 mb-4">
            {/* Stats */}
            {(selectedItem.stats && selectedItem.stats.length > 0) && (
              <div className="rounded-xl border border-white/[0.06] bg-[#0a0e1a]/90 overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.04]">
                  <Shield className="h-4 w-4 text-cyan-400" />
                  <h4 className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>Stats</h4>
                </div>
                <div className="px-5 py-3 space-y-3">
                  {selectedItem.stats.map((stat, i) => {
                    const label = stat.replace(/[+\-][\d.]+%?/, "").trim() || stat;
                    const val = stat.match(/[+\-][\d.]+%?/)?.[0] || stat;
                    const raw = parseFloat(stat.match(/[\d.]+/)?.[0] || "0");
                    const isPct = stat.includes("%");
                    const max = isPct ? 100 : 200;
                    const w = Math.min((raw / max) * 100, 100);
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-300 font-medium">{label}</span>
                          <span className={`text-sm font-bold font-mono ${getStatColor(stat)}`}>{val}</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${w}%`, background: `linear-gradient(90deg, ${getCategoryAccent(selectedItem.category)}80, ${getCategoryAccent(selectedItem.category)})` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Abilities */}
            {(selectedItem.abilities && selectedItem.abilities.length > 0) ? (
              <div className="rounded-xl border border-white/[0.06] bg-[#0a0e1a]/90 overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.04]">
                  <Zap className="h-4 w-4 text-cyan-400" />
                  <h4 className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>Abilities</h4>
                </div>
                <div className="px-5 py-3 space-y-3">
                  {selectedItem.abilities.map((ability, i) => (
                    <div key={i} className="rounded-lg bg-white/[0.02] p-3 border border-white/[0.04] border-l-[3px] border-l-cyan-500">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">PASSIVE</span>
                        <span className="text-xs font-bold text-white uppercase" style={{ fontFamily: 'var(--font-display)' }}>{ability.name}</span>
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed">{ability.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-white/[0.06] bg-[#0a0e1a]/90 flex items-center justify-center p-8">
                <p className="text-xs text-gray-600 italic">No abilities data available</p>
              </div>
            )}
          </div>

          {/* Recipe visual */}
          {hasBuildFrom && (
            <div className="mb-4 rounded-xl border border-white/[0.06] bg-[#0a0e1a]/90 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.04]">
                <GitBranch className="h-4 w-4 text-cyan-400" />
                <h4 className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>Recipe</h4>
              </div>
              <div className="px-5 py-5 flex items-center justify-center flex-wrap gap-3">
                {selectedItem.buildFrom!.map((name, i) => {
                  const comp = itemMap.get(name);
                  if (!comp) return null;
                  return (
                    <React.Fragment key={name}>
                      {i > 0 && <span className="text-gray-600 font-bold text-xl">+</span>}
                      <div className="flex flex-col items-center gap-2 rounded-xl bg-white/[0.02] border border-white/[0.06] px-4 py-3 min-w-[100px] hover:border-cyan-500/30 transition-colors">
                        <FallbackImage src={comp.image} fallbackText={comp.name} alt={comp.name} className="h-14 w-14 rounded-xl object-contain bg-black/30 border border-white/[0.06] p-1" containerClassName="h-14 w-14 rounded-xl text-xs bg-black/30 border border-white/[0.06]" />
                        <span className="text-[10px] font-semibold text-gray-300 text-center">{comp.name}</span>
                        {comp.gold != null && <span className="text-[10px] font-bold text-[#F0D060]">{comp.gold.toLocaleString()}g</span>}
                      </div>
                    </React.Fragment>
                  );
                })}
                <div className="flex flex-col items-center gap-1 mx-2">
                  <div className="w-8 h-[2px] bg-gradient-to-r from-cyan-500/30 to-cyan-500/70 rounded-full" />
                  <ChevronRight className="h-4 w-4 text-cyan-500/60" />
                </div>
                <div className="flex flex-col items-center gap-2 rounded-xl bg-cyan-500/[0.06] border border-cyan-500/20 px-4 py-3 min-w-[100px] ring-1 ring-cyan-500/10">
                  <FallbackImage src={selectedItem.image} fallbackText={selectedItem.name} alt={selectedItem.name} className="h-14 w-14 rounded-xl object-contain bg-black/30 border border-cyan-500/30 p-1" containerClassName="h-14 w-14 rounded-xl text-xs bg-black/30 border border-cyan-500/30" />
                  <span className="text-[10px] font-bold text-cyan-300 text-center">{selectedItem.name}</span>
                  {selectedItem.gold != null && <span className="text-[10px] font-bold text-[#F0D060]">{selectedItem.gold.toLocaleString()}g</span>}
                </div>
              </div>
            </div>
          )}

          {/* Unique Attributes */}
          {selectedItem.uniqueAttributes && selectedItem.uniqueAttributes.length > 0 && (
            <div className="mb-4 rounded-xl border border-white/[0.06] bg-[#0a0e1a]/90 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.04]">
                <Star className="h-4 w-4 text-amber-400" />
                <h4 className="text-[11px] font-bold text-amber-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>Unique Attributes</h4>
              </div>
              <div className="px-5 py-3 space-y-2">
                {selectedItem.uniqueAttributes.map((attr, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg bg-amber-500/[0.04] px-3 py-2 border border-amber-500/10">
                    <Star className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                    <span className="text-[11px] text-amber-200/80 leading-relaxed">{attr}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Heroes Who Core */}
            <div className="mb-4 rounded-xl border border-white/[0.06] bg-[#0a0e1a]/90 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.04]">
                <h4 className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>
                  Heroes Who Core {selectedItem.name}
                </h4>
                <span className="ml-auto text-[10px] font-bold text-cyan-400/50 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/15">
                  {filterHeroesForItem(selectedItem, heroes).length}
                </span>
              </div>
              <div className="px-5 py-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {filterHeroesForItem(selectedItem, heroes).slice(0, 5).map((hero) => {
                    const heroImg = getHeroImageUrl(hero.hero_name, heroAssets);
                    const heroRole = Array.isArray(hero.role) ? hero.role[0] : (hero.role || getHeroRole(hero.hero_name));
                    const tag = getHeroDisplayTag(hero);
                    return (
                      <div key={hero.hero_name} className="flex items-center gap-2 rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2 hover:border-cyan-500/20 transition-colors">
                        <FallbackImage src={heroImg} fallbackText={hero.hero_name} alt={hero.hero_name} className="w-8 h-8 rounded-lg object-cover shrink-0 border border-white/[0.06]" containerClassName="w-8 h-8 rounded-lg shrink-0 text-[8px] bg-black/30 border border-white/[0.06]" />
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold text-gray-200 truncate block">{hero.hero_name}</span>
                          <span className="text-[8px] font-bold text-cyan-400/60 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/10 inline-block">{tag}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
        </div>
      )}
    </div>
  );
}
