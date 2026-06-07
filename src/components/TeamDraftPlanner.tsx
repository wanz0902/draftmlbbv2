import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Ban,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Compass,
  Edit3,
  FileText,
  Layers,
  Plus,
  Save,
  Search,
  Shield,
  Star,
  Swords,
  Target,
  Trash2,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import FallbackImage from "./FallbackImage";
import { getHeroImageUrl, getHeroRole } from "../lib/heroUtils";
import { HeroStats } from "../types";

const LANES = ["EXP", "Jungle", "Mid", "Gold", "Roam"] as const;
type Lane = typeof LANES[number];

interface DraftPlan {
  id: string;
  name: string;
  side: "BLUE" | "RED";
  teamName: string;
  createdAt: number;
  updatedAt: number;
  lanes: Record<Lane, { main: string; backup: string }>;
  priorityHeroes: string[];
  plannedBans: string[];
  enemyThreats: string[];
  notes: string;
}

function emptyPlan(): DraftPlan {
  const lanes: DraftPlan["lanes"] = {} as any;
  for (const lane of LANES) lanes[lane] = { main: "", backup: "" };
  return {
    id: `plan_${Date.now()}`,
    name: "Draft Plan Baru",
    side: "BLUE",
    teamName: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lanes,
    priorityHeroes: [],
    plannedBans: [],
    enemyThreats: [],
    notes: "",
  };
}

const STORAGE_KEY = "mlbb_tdp_plans";

function loadPlans(): DraftPlan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch { return []; }
}

function savePlansToStorage(plans: DraftPlan[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(plans)); } catch {}
}

interface TeamDraftPlannerProps {
  heroes: HeroStats[];
  heroAssets: Record<string, string>;
  onOpenHeroIntelligence?: (heroName: string) => void;
}

function HeroPickerModal({
  heroes,
  heroAssets,
  exclude,
  onSelect,
  onClose,
}: {
  heroes: HeroStats[];
  heroAssets: Record<string, string>;
  exclude: Set<string>;
  onSelect: (name: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return heroes.filter(h =>
      !exclude.has(h.hero_name) &&
      h.hero_name.toLowerCase().includes(q)
    ).slice(0, 30);
  }, [heroes, search, exclude]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a1020] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
          <Search className="h-4 w-4 text-slate-500 shrink-0" />
          <input
            ref={inputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari hero..."
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
          />
          <button onClick={onClose} className="p-1 text-slate-500 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2 grid grid-cols-4 sm:grid-cols-5 gap-1.5">
          {filtered.map(h => (
            <button
              key={h.hero_name}
              onClick={() => { onSelect(h.hero_name); onClose(); }}
              className="flex flex-col items-center gap-1 rounded-xl p-2 hover:bg-white/[0.06] transition cursor-pointer"
            >
              <div className="h-10 w-10 overflow-hidden rounded-lg border border-white/10 bg-[#060d1a]">
                <FallbackImage src={getHeroImageUrl(h.hero_name, heroAssets)} fallbackText={h.hero_name} alt={h.hero_name} className="h-full w-full object-cover" containerClassName="h-full w-full text-[6px]" />
              </div>
              <span className="text-[9px] text-slate-400 truncate w-full text-center">{h.hero_name}</span>
            </button>
          ))}
          {filtered.length === 0 && <div className="col-span-full py-6 text-center text-xs text-slate-500">Tidak ditemukan.</div>}
        </div>
      </div>
    </div>
  );
}

function HeroTag({ name, heroAssets, onRemove, color = "slate" }: { name: string; heroAssets: Record<string, string>; onRemove: () => void; color?: string }) {
  const colors: Record<string, string> = {
    slate: "border-white/10 bg-white/[0.04] text-slate-300",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    rose: "border-rose-500/20 bg-rose-500/10 text-rose-300",
    cyan: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${colors[color] || colors.slate}`}>
      <div className="h-4 w-4 overflow-hidden rounded-full bg-[#060d1a]">
        <FallbackImage src={getHeroImageUrl(name, heroAssets)} fallbackText={name} alt={name} className="h-full w-full object-cover" containerClassName="h-full w-full text-[4px]" />
      </div>
      {name}
      <button onClick={onRemove} className="ml-0.5 text-slate-500 hover:text-white"><X className="h-3 w-3" /></button>
    </span>
  );
}

export default function TeamDraftPlanner({ heroes, heroAssets, onOpenHeroIntelligence }: TeamDraftPlannerProps) {
  const [mode, setMode] = useState<"plan" | "mpl">("plan");
  const [plans, setPlans] = useState<DraftPlan[]>(() => loadPlans());
  const [activePlanId, setActivePlanId] = useState<string | null>(plans[0]?.id || null);
  const [pickerTarget, setPickerTarget] = useState<{ lane?: Lane; field?: "main" | "backup"; list?: "priority" | "bans" | "threats" } | null>(null);

  const activePlan = plans.find(p => p.id === activePlanId) || null;

  const updatePlan = useCallback((id: string, updater: (p: DraftPlan) => DraftPlan) => {
    setPlans(prev => {
      const next = prev.map(p => p.id === id ? { ...updater(p), updatedAt: Date.now() } : p);
      savePlansToStorage(next);
      return next;
    });
  }, []);

  const createPlan = () => {
    const p = emptyPlan();
    setPlans(prev => { const next = [p, ...prev]; savePlansToStorage(next); return next; });
    setActivePlanId(p.id);
  };

  const deletePlan = (id: string) => {
    setPlans(prev => { const next = prev.filter(p => p.id !== id); savePlansToStorage(next); return next; });
    if (activePlanId === id) setActivePlanId(null);
  };

  const usedHeroes = useMemo(() => {
    if (!activePlan) return new Set<string>();
    const s = new Set<string>();
    for (const lane of LANES) {
      if (activePlan.lanes[lane].main) s.add(activePlan.lanes[lane].main);
      if (activePlan.lanes[lane].backup) s.add(activePlan.lanes[lane].backup);
    }
    activePlan.priorityHeroes.forEach(h => s.add(h));
    activePlan.plannedBans.forEach(h => s.add(h));
    activePlan.enemyThreats.forEach(h => s.add(h));
    return s;
  }, [activePlan]);

  const handleHeroSelect = (name: string) => {
    if (!activePlan || !pickerTarget) return;
    const { lane, field, list } = pickerTarget;
    if (lane && field) {
      updatePlan(activePlan.id, p => ({ ...p, lanes: { ...p.lanes, [lane]: { ...p.lanes[lane], [field]: name } } }));
    } else if (list === "priority") {
      updatePlan(activePlan.id, p => ({ ...p, priorityHeroes: [...p.priorityHeroes, name] }));
    } else if (list === "bans") {
      updatePlan(activePlan.id, p => ({ ...p, plannedBans: [...p.plannedBans, name] }));
    } else if (list === "threats") {
      updatePlan(activePlan.id, p => ({ ...p, enemyThreats: [...p.enemyThreats, name] }));
    }
  };

  const removeFromList = (list: "priorityHeroes" | "plannedBans" | "enemyThreats", name: string) => {
    if (!activePlan) return;
    updatePlan(activePlan.id, p => ({ ...p, [list]: p[list].filter(h => h !== name) }));
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-amber-400">
          <Compass className="h-3 w-3" />
          Team Draft Planner
        </div>
        <h1 className="mt-4 font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
          Custom Draft Workspace
        </h1>
        <p className="mt-2 text-sm text-slate-400 max-w-lg mx-auto">
          Rancang draft plan manual — pilih hero per role, set ban, catat strategi. Data MPL opsional.
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex items-center justify-center gap-1">
        {(["plan", "mpl"] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer ${mode === m ? "bg-amber-500/15 text-amber-300 border border-amber-500/30" : "text-slate-500 hover:text-slate-300 border border-transparent"}`}>
            {m === "plan" ? "Draft Plan" : "MPL Intel"}
          </button>
        ))}
      </div>

      {/* ═══ MODE: CUSTOM DRAFT PLAN ═══ */}
      {mode === "plan" && (
        <div className="space-y-4">
          {/* Plan Selector Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {plans.map(p => (
              <button key={p.id} onClick={() => setActivePlanId(p.id)}
                className={`flex items-center gap-2 shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold transition cursor-pointer ${activePlanId === p.id ? "border-amber-500/30 bg-amber-950/20 text-amber-300" : "border-white/[0.06] bg-white/[0.02] text-slate-500 hover:text-slate-300"}`}>
                <FileText className="h-3.5 w-3.5" />
                <span className="truncate max-w-[100px]">{p.name}</span>
              </button>
            ))}
            <button onClick={createPlan}
              className="flex items-center gap-1.5 shrink-0 rounded-xl border border-dashed border-white/10 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-cyan-400 hover:border-cyan-500/30 transition cursor-pointer">
              <Plus className="h-3.5 w-3.5" /> Baru
            </button>
          </div>

          {activePlan ? (
            <>
              {/* Plan Header */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#080e1a]/90 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <input
                    value={activePlan.name}
                    onChange={e => updatePlan(activePlan.id, p => ({ ...p, name: e.target.value }))}
                    className="flex-1 bg-transparent text-xl font-display font-black text-white outline-none border-b border-transparent focus:border-amber-500/30 transition"
                    placeholder="Nama plan..."
                  />
                  <div className="flex items-center gap-2">
                    {(["BLUE", "RED"] as const).map(s => (
                      <button key={s} onClick={() => updatePlan(activePlan.id, p => ({ ...p, side: s }))}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${activePlan.side === s ? (s === "BLUE" ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" : "bg-rose-500/20 text-rose-300 border border-rose-500/30") : "text-slate-600 border border-white/[0.06]"}`}>
                        {s === "BLUE" ? "Blue Side" : "Red Side"}
                      </button>
                    ))}
                    <button onClick={() => deletePlan(activePlan.id)} className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer" title="Hapus plan">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <input
                  value={activePlan.teamName}
                  onChange={e => updatePlan(activePlan.id, p => ({ ...p, teamName: e.target.value }))}
                  className="w-full bg-white/[0.03] rounded-xl border border-white/[0.06] px-4 py-2 text-sm text-white outline-none focus:border-amber-500/30 transition"
                  placeholder="Nama tim (opsional) — misal: ONIC, RRQ, atau nama tim custom..."
                />
              </div>

              {/* Role Planner */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#080e1a]/90 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="h-4 w-4 text-amber-400" />
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-amber-300">Hero Per Role</span>
                </div>

                {/* Header */}
                <div className="hidden sm:grid grid-cols-[80px_1fr_1fr_40px] gap-2 mb-2 px-2">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-600">Role</div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-600">Main Hero</div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-600">Backup Hero</div>
                  <div />
                </div>

                <div className="space-y-2">
                  {LANES.map(lane => {
                    const mainName = activePlan.lanes[lane].main;
                    const backupName = activePlan.lanes[lane].backup;
                    return (
                      <div key={lane} className="grid grid-cols-[70px_1fr] sm:grid-cols-[80px_1fr_1fr_40px] gap-2 items-center rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2.5">
                        <div className="text-xs font-bold text-slate-400 uppercase">{lane}</div>
                        {/* Main */}
                        <button onClick={() => setPickerTarget({ lane, field: "main" })}
                          className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-left hover:border-cyan-500/30 transition cursor-pointer min-h-[40px]">
                          {mainName ? (
                            <>
                              <div className="h-7 w-7 overflow-hidden rounded-md border border-white/10 bg-[#060d1a]">
                                <FallbackImage src={getHeroImageUrl(mainName, heroAssets)} fallbackText={mainName} alt={mainName} className="h-full w-full object-cover" containerClassName="h-full w-full text-[5px]" />
                              </div>
                              <span className="text-xs font-bold text-white truncate">{mainName}</span>
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-600">+ Pilih main hero</span>
                          )}
                        </button>
                        {/* Backup — hidden on mobile */}
                        <button onClick={() => setPickerTarget({ lane, field: "backup" })}
                          className="hidden sm:flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-left hover:border-violet-500/30 transition cursor-pointer min-h-[40px]">
                          {backupName ? (
                            <>
                              <div className="h-7 w-7 overflow-hidden rounded-md border border-white/10 bg-[#060d1a]">
                                <FallbackImage src={getHeroImageUrl(backupName, heroAssets)} fallbackText={backupName} alt={backupName} className="h-full w-full object-cover" containerClassName="h-full w-full text-[5px]" />
                              </div>
                              <span className="text-xs font-bold text-white truncate">{backupName}</span>
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-600">+ Backup</span>
                          )}
                        </button>
                        {/* Clear */}
                        <button onClick={() => {
                          if (!activePlan) return;
                          updatePlan(activePlan.id, p => ({ ...p, lanes: { ...p.lanes, [lane]: { main: "", backup: "" } } }));
                        }} className="hidden sm:flex p-1.5 text-slate-600 hover:text-rose-400 transition cursor-pointer justify-center">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Priority / Bans / Threats */}
              <div className="grid gap-4 sm:grid-cols-3">
                {/* Priority Heroes */}
                <div className="rounded-2xl border border-white/[0.06] bg-[#080e1a]/90 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Priority Picks</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
                    {activePlan.priorityHeroes.map(h => (
                      <HeroTag key={h} name={h} heroAssets={heroAssets} onRemove={() => removeFromList("priorityHeroes", h)} color="amber" />
                    ))}
                  </div>
                  <button onClick={() => setPickerTarget({ list: "priority" })}
                    className="text-[10px] text-amber-400/60 hover:text-amber-400 transition cursor-pointer">+ Tambah hero</button>
                </div>

                {/* Planned Bans */}
                <div className="rounded-2xl border border-white/[0.06] bg-[#080e1a]/90 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Ban className="h-3.5 w-3.5 text-rose-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300">Planned Bans</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
                    {activePlan.plannedBans.map(h => (
                      <HeroTag key={h} name={h} heroAssets={heroAssets} onRemove={() => removeFromList("plannedBans", h)} color="rose" />
                    ))}
                  </div>
                  <button onClick={() => setPickerTarget({ list: "bans" })}
                    className="text-[10px] text-rose-400/60 hover:text-rose-400 transition cursor-pointer">+ Tambah ban</button>
                </div>

                {/* Enemy Threats */}
                <div className="rounded-2xl border border-white/[0.06] bg-[#080e1a]/90 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="h-3.5 w-3.5 text-cyan-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">Enemy Threats</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
                    {activePlan.enemyThreats.map(h => (
                      <HeroTag key={h} name={h} heroAssets={heroAssets} onRemove={() => removeFromList("enemyThreats", h)} color="cyan" />
                    ))}
                  </div>
                  <button onClick={() => setPickerTarget({ list: "threats" })}
                    className="text-[10px] text-cyan-400/60 hover:text-cyan-400 transition cursor-pointer">+ Tambah threat</button>
                </div>
              </div>

              {/* Notes */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#080e1a]/90 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="h-4 w-4 text-slate-400" />
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">Catatan Strategi</span>
                </div>
                <textarea
                  value={activePlan.notes}
                  onChange={e => updatePlan(activePlan.id, p => ({ ...p, notes: e.target.value }))}
                  className="w-full h-28 bg-white/[0.03] rounded-xl border border-white/[0.06] px-4 py-3 text-sm text-white outline-none focus:border-amber-500/30 transition resize-none"
                  placeholder="Tulis catatan strategi draft di sini — misal: prioritas first pick, pivot plan, komposisi alternatif..."
                />
              </div>

              {/* Summary */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#080e1a]/90 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">Plan Summary</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 text-center">
                    <div className="font-display text-xl font-black text-white">{LANES.filter(l => activePlan.lanes[l].main).length}/5</div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">Roles Filled</div>
                  </div>
                  <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 text-center">
                    <div className="font-display text-xl font-black text-amber-400">{activePlan.priorityHeroes.length}</div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">Priority Picks</div>
                  </div>
                  <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 text-center">
                    <div className="font-display text-xl font-black text-rose-400">{activePlan.plannedBans.length}</div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">Planned Bans</div>
                  </div>
                  <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 text-center">
                    <div className="font-display text-xl font-black text-cyan-400">{activePlan.enemyThreats.length}</div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">Enemy Threats</div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-16 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.01]">
              <Compass className="mx-auto h-10 w-10 text-slate-600 mb-3" />
              <div className="text-sm font-bold text-slate-400">Buat Draft Plan Baru</div>
              <p className="mt-1 text-xs text-slate-600 mb-4">Rancang draft plan manual tanpa perlu data MPL.</p>
              <button onClick={createPlan}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white hover:brightness-110 transition cursor-pointer">
                <Plus className="h-4 w-4" /> Buat Plan Baru
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══ MODE: MPL INTEL (optional) ═══ */}
      {mode === "mpl" && (
        <MplIntelTab heroes={heroes} heroAssets={heroAssets} onOpenHeroIntelligence={onOpenHeroIntelligence} />
      )}

      {/* Hero Picker Modal */}
      {pickerTarget && (
        <HeroPickerModal
          heroes={heroes}
          heroAssets={heroAssets}
          exclude={usedHeroes}
          onSelect={handleHeroSelect}
          onClose={() => setPickerTarget(null)}
        />
      )}
    </div>
  );
}

/* ═══ MPL INTEL SUB-COMPONENT ═══ */
function MplIntelTab({ heroes, heroAssets, onOpenHeroIntelligence }: { heroes: HeroStats[]; heroAssets: Record<string, string>; onOpenHeroIntelligence?: (name: string) => void }) {
  const [teams, setTeams] = useState<Array<{ key: string; name: string; logo: string }>>([]);
  const [selected, setSelected] = useState("");
  const [intel, setIntel] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/draft/teams").then(r => r.json()).then(d => { if (d.teams) setTeams(d.teams); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) { setIntel(null); return; }
    setLoading(true);
    fetch(`/api/draft/team-intel/${selected}`).then(r => r.ok ? r.json() : null).then(setIntel).catch(() => {}).finally(() => setLoading(false));
  }, [selected]);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-xs text-slate-500">Data MPL bersifat opsional — gunakan sebagai referensi untuk draft plan kamu.</p>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
        {teams.map(t => (
          <button key={t.key} onClick={() => setSelected(selected === t.key ? "" : t.key)}
            className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition cursor-pointer ${selected === t.key ? "border-amber-500/40 bg-amber-950/20" : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"}`}>
            <div className="h-10 w-10 overflow-hidden rounded-lg border border-white/10 bg-[#060d1a]">
              {t.logo ? <img src={t.logo} alt={t.name} className="h-full w-full object-contain p-0.5" /> : <div className="flex h-full w-full items-center justify-center text-[10px] font-black text-amber-400">{t.key.slice(0, 2)}</div>}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${selected === t.key ? "text-amber-300" : "text-slate-500"}`}>{t.key}</span>
          </button>
        ))}
      </div>

      {loading && <div className="flex items-center justify-center gap-3 py-12"><div className="h-5 w-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /><span className="text-sm text-slate-400">Memuat...</span></div>}

      {intel && !loading && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#080e1a]/90 p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 overflow-hidden rounded-xl border border-white/10 bg-[#060d1a]">
              {teams.find(t => t.key === selected)?.logo ? <img src={teams.find(t => t.key === selected)!.logo} alt={selected} className="h-full w-full object-contain p-1" /> : <div className="flex h-full w-full items-center justify-center text-lg font-black text-amber-400">{selected}</div>}
            </div>
            <div>
              <h3 className="font-display text-xl font-black text-white">{selected}</h3>
              <div className="font-mono text-[10px] text-slate-500">{intel.totalGames} games &middot; {intel.totalWins}W &middot; {intel.totalLosses}L &middot; {Math.round(intel.winRate)}% WR</div>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-2">Comfort Heroes</div>
            <div className="flex flex-wrap gap-2">
              {intel.comfortHeroes?.slice(0, 8).map((h: any) => (
                <span key={h.heroName} className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-300">
                  <div className="h-4 w-4 overflow-hidden rounded-full bg-[#060d1a]"><FallbackImage src={getHeroImageUrl(h.heroName, heroAssets)} fallbackText={h.heroName} alt={h.heroName} className="h-full w-full object-cover" containerClassName="h-full w-full text-[3px]" /></div>
                  {h.heroName} <span className="text-amber-400/60">{h.winRate}%</span>
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-rose-300 mb-2">Top Bans</div>
            <div className="flex flex-wrap gap-2">
              {intel.topBans?.slice(0, 6).map((b: any) => (
                <span key={b.heroName} className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-[10px] font-bold text-rose-300">
                  {b.heroName} <span className="text-rose-400/60">{b.count}x</span>
                </span>
              ))}
            </div>
          </div>

          {intel.draftTendencies?.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 mb-2">Draft Style</div>
              <div className="flex flex-wrap gap-2">
                {intel.draftTendencies.map((t: string) => (
                  <span key={t} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold text-emerald-300">
                    <Zap className="h-3 w-3" /> {t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!selected && !loading && (
        <div className="text-center py-12 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.01]">
          <Trophy className="mx-auto h-8 w-8 text-slate-600 mb-2" />
          <div className="text-xs text-slate-500">Pilih tim MPL untuk melihat data intel (opsional)</div>
        </div>
      )}
    </div>
  );
}
