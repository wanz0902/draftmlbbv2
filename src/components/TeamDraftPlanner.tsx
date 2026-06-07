import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  BookOpen,
  ChevronRight,
  Compass,
  FileText,
  Layers,
  Plus,
  Save,
  Swords,
  Target,
  Trash2,
  X,
} from "lucide-react";
import FallbackImage from "./FallbackImage";
import { getHeroImageUrl } from "../lib/heroUtils";
import { HeroStats } from "../types";

const LANES = ["EXP", "Jungle", "Mid", "Gold", "Roam"] as const;
type Lane = typeof LANES[number];

interface DraftPlan {
  id: string;
  name: string;
  side: "BLUE" | "RED";
  createdAt: number;
  updatedAt: number;
  blueBans: string[];
  redBans: string[];
  bluePicks: string[];
  redPicks: string[];
  blueRoles: Record<Lane, { main: string; backup: string }>;
  redRoles: Record<Lane, { main: string; backup: string }>;
  notes: string;
}

function emptyRoles(): Record<Lane, { main: string; backup: string }> {
  const r: any = {};
  for (const lane of LANES) r[lane] = { main: "", backup: "" };
  return r;
}

function emptyPlan(name?: string): DraftPlan {
  return {
    id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: name || "Draft 1",
    side: "BLUE",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    blueBans: Array(5).fill(""),
    redBans: Array(5).fill(""),
    bluePicks: Array(5).fill(""),
    redPicks: Array(5).fill(""),
    blueRoles: emptyRoles(),
    redRoles: emptyRoles(),
    notes: "",
  };
}

interface Tournament {
  id: string;
  name: string;
  drafts: DraftPlan[];
}

function emptyTournament(name?: string): Tournament {
  return {
    id: `tour_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: name || "Tournament 1",
    drafts: [emptyPlan("Draft 1")],
  };
}

const STORAGE_KEY = "mlbb_tdp_v2";

function loadData(): { tournaments: Tournament[]; selectedTourId: string | null; selectedDraftId: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const t = emptyTournament();
  return { tournaments: [t], selectedTourId: t.id, selectedDraftId: t.drafts[0].id };
}

function saveData(tournaments: Tournament[], selectedTourId: string | null, selectedDraftId: string | null) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ tournaments, selectedTourId, selectedDraftId })); } catch {}
}

interface TeamDraftPlannerProps {
  heroes: HeroStats[];
  heroAssets: Record<string, string>;
}

export default function TeamDraftPlanner({ heroes, heroAssets }: TeamDraftPlannerProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pickerSlot, setPickerSlot] = useState<{ type: "ban" | "pick" | "role"; side: "BLUE" | "RED"; index?: number; lane?: Lane; field?: "main" | "backup" } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const d = loadData();
    setTournaments(d.tournaments);
    setSelectedTourId(d.selectedTourId);
    setSelectedDraftId(d.selectedDraftId);
  }, []);

  const persist = useCallback((tours: Tournament[], tourId: string | null, draftId: string | null) => {
    saveData(tours, tourId, draftId);
  }, []);

  const selectedTour = tournaments.find(t => t.id === selectedTourId) || null;
  const selectedDraft = selectedTour?.drafts.find(d => d.id === selectedDraftId) || null;

  const updateDraft = useCallback((updater: (d: DraftPlan) => DraftPlan) => {
    if (!selectedTourId || !selectedDraftId) return;
    setTournaments(prev => {
      const next = prev.map(t => t.id !== selectedTourId ? t : ({
        ...t,
        drafts: t.drafts.map(d => d.id !== selectedDraftId ? d : { ...updater(d), updatedAt: Date.now() }),
      }));
      persist(next, selectedTourId, selectedDraftId);
      return next;
    });
  }, [selectedTourId, selectedDraftId, persist]);

  const createTournament = () => {
    const t = emptyTournament(`Tournament ${tournaments.length + 1}`);
    setTournaments(prev => { const next = [...prev, t]; persist(next, t.id, t.drafts[0].id); return next; });
    setSelectedTourId(t.id);
    setSelectedDraftId(t.drafts[0].id);
  };

  const createDraft = () => {
    if (!selectedTourId) return;
    const d = emptyPlan(`Draft ${(selectedTour?.drafts.length || 0) + 1}`);
    setTournaments(prev => {
      const next = prev.map(t => t.id !== selectedTourId ? t : { ...t, drafts: [...t.drafts, d] });
      persist(next, selectedTourId, d.id);
      return next;
    });
    setSelectedDraftId(d.id);
  };

  const deleteDraft = (tourId: string, draftId: string) => {
    setTournaments(prev => {
      const next = prev.map(t => t.id !== tourId ? t : { ...t, drafts: t.drafts.filter(d => d.id !== draftId) });
      if (selectedDraftId === draftId) {
        const tour = next.find(t => t.id === tourId);
        setSelectedDraftId(tour?.drafts[0]?.id || null);
      }
      persist(next, selectedTourId, selectedDraftId === draftId ? (next.find(t => t.id === tourId)?.drafts[0]?.id || null) : selectedDraftId);
      return next;
    });
  };

  const deleteTournament = (tourId: string) => {
    setTournaments(prev => {
      const next = prev.filter(t => t.id !== tourId);
      const newTour = next[0] || null;
      setSelectedTourId(newTour?.id || null);
      setSelectedDraftId(newTour?.drafts[0]?.id || null);
      persist(next, newTour?.id || null, newTour?.drafts[0]?.id || null);
      return next;
    });
  };

  const setSlot = (type: "ban" | "pick" | "role", side: "BLUE" | "RED", value: string, index?: number, lane?: Lane, field?: "main" | "backup") => {
    updateDraft(d => {
      const nd = { ...d };
      if (type === "ban" && index !== undefined) {
        const key = side === "BLUE" ? "blueBans" : "redBans";
        nd[key] = [...(nd as any)[key]]; (nd as any)[key][index] = value;
      } else if (type === "pick" && index !== undefined) {
        const key = side === "BLUE" ? "bluePicks" : "redPicks";
        nd[key] = [...(nd as any)[key]]; (nd as any)[key][index] = value;
      } else if (type === "role" && lane && field) {
        const key = side === "BLUE" ? "blueRoles" : "redRoles";
        nd[key] = { ...nd[key], [lane]: { ...nd[key][lane], [field]: value } };
      }
      return nd;
    });
  };

  const clearSlot = (type: "ban" | "pick" | "role", side: "BLUE" | "RED", index?: number, lane?: Lane, field?: "main" | "backup") => {
    setSlot(type, side, "", index, lane, field);
  };

  const usedHeroes = useMemo(() => {
    if (!selectedDraft) return new Set<string>();
    const s = new Set<string>();
    [...selectedDraft.blueBans, ...selectedDraft.redBans, ...selectedDraft.bluePicks, ...selectedDraft.redPicks].forEach(h => { if (h) s.add(h); });
    for (const roles of [selectedDraft.blueRoles, selectedDraft.redRoles]) {
      for (const lane of LANES) {
        if (roles[lane].main) s.add(roles[lane].main);
        if (roles[lane].backup) s.add(roles[lane].backup);
      }
    }
    return s;
  }, [selectedDraft]);

  const filteredHeroes = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return heroes.filter(h => !usedHeroes.has(h.hero_name) && h.hero_name.toLowerCase().includes(q)).slice(0, 40);
  }, [heroes, searchQuery, usedHeroes]);

  const progress = useMemo(() => {
    if (!selectedDraft) return { bans: 0, picks: 0, pct: 0 };
    const allBans = [...selectedDraft.blueBans, ...selectedDraft.redBans].filter(Boolean);
    const allPicks = [...selectedDraft.bluePicks, ...selectedDraft.redPicks].filter(Boolean);
    const allRoles = [selectedDraft.blueRoles, selectedDraft.redRoles].flatMap(r => LANES.flatMap(l => [r[l].main, r[l].backup])).filter(Boolean);
    const total = 30; // 10 bans + 10 picks + 10 roles
    const filled = allBans.length + allPicks.length + allRoles.length;
    return { bans: allBans.length, picks: allPicks.length, pct: Math.round((filled / total) * 100) };
  }, [selectedDraft]);

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden rounded-2xl border border-white/[0.06] bg-[#060b16]">
      {/* ═══ LEFT SIDEBAR ═══ */}
      <div className={`${sidebarOpen ? "w-64" : "w-0"} shrink-0 overflow-hidden border-r border-white/[0.06] bg-[#080e1a] transition-all duration-300`}>
        <div className="flex h-full w-64 flex-col">
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
            <Compass className="h-4 w-4 text-amber-400" />
            <span className="font-display text-sm font-bold text-white">Draft Plans</span>
            <button onClick={createTournament} className="ml-auto p-1 text-slate-500 hover:text-amber-400 transition cursor-pointer" title="New Tournament">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {tournaments.map(t => (
              <div key={t.id}>
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <Layers className="h-3 w-3" />
                  <span className="flex-1 truncate">{t.name}</span>
                  <button onClick={() => deleteTournament(t.id)} className="p-0.5 text-slate-600 hover:text-rose-400 transition cursor-pointer"><Trash2 className="h-3 w-3" /></button>
                </div>
                {t.drafts.map(d => (
                  <button key={d.id} onClick={() => { setSelectedTourId(t.id); setSelectedDraftId(d.id); }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition cursor-pointer ${selectedDraftId === d.id ? "bg-amber-500/10 text-amber-300 border border-amber-500/20" : "text-slate-400 hover:bg-white/[0.04] border border-transparent"}`}>
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 truncate">{d.name}</span>
                    <button onClick={e => { e.stopPropagation(); deleteDraft(t.id, d.id); }} className="p-0.5 text-slate-600 hover:text-rose-400 transition cursor-pointer"><X className="h-3 w-3" /></button>
                  </button>
                ))}
              </div>
            ))}
            {tournaments.length === 0 && (
              <div className="py-8 text-center text-[10px] text-slate-600">Belum ada tournament.</div>
            )}
          </div>
          <div className="border-t border-white/[0.06] p-2">
            <button onClick={createDraft} disabled={!selectedTourId}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/10 px-3 py-2 text-[10px] font-bold text-slate-500 hover:text-amber-400 hover:border-amber-500/30 transition cursor-pointer disabled:opacity-30">
              <Plus className="h-3 w-3" /> New Draft
            </button>
          </div>
        </div>
      </div>

      {/* ═══ MAIN WORKSPACE ═══ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3 bg-[#080e1a]/60">
          <button onClick={() => setSidebarOpen(v => !v)} className="p-1.5 text-slate-500 hover:text-white transition cursor-pointer lg:hidden">
            <Layers className="h-4 w-4" />
          </button>
          <button onClick={() => setSidebarOpen(v => !v)} className="hidden lg:block p-1.5 text-slate-500 hover:text-white transition cursor-pointer">
            <Layers className="h-4 w-4" />
          </button>

          {selectedDraft ? (
            <>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span>{selectedTour?.name}</span>
                <ChevronRight className="h-3 w-3" />
              </div>
              <input
                value={selectedDraft.name}
                onChange={e => updateDraft(d => ({ ...d, name: e.target.value }))}
                className="bg-transparent text-sm font-bold text-white outline-none border-b border-transparent focus:border-amber-500/30 transition min-w-0 max-w-[160px]"
              />

              <div className="ml-auto flex items-center gap-2">
                {(["BLUE", "RED"] as const).map(s => (
                  <button key={s} onClick={() => updateDraft(d => ({ ...d, side: s }))}
                    className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition cursor-pointer ${selectedDraft.side === s ? (s === "BLUE" ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" : "bg-rose-500/20 text-rose-300 border border-rose-500/30") : "text-slate-600 border border-white/[0.06] hover:text-slate-400"}`}>
                    {s === "BLUE" ? "Blue" : "Red"}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
                <span>Bans <span className="text-white font-bold">{progress.bans}</span>/10</span>
                <span>Picks <span className="text-white font-bold">{progress.picks}</span>/10</span>
                <span className="text-amber-400 font-bold">{progress.pct}%</span>
              </div>

              <button onClick={() => {}} className="flex items-center gap-1.5 rounded-lg bg-amber-500/15 border border-amber-500/25 px-3 py-1.5 text-[10px] font-bold text-amber-300 hover:bg-amber-500/25 transition cursor-pointer">
                <Save className="h-3 w-3" /> Save
              </button>
            </>
          ) : (
            <span className="text-xs text-slate-500">Pilih atau buat draft plan di sidebar.</span>
          )}
        </div>

        {/* Workspace Body */}
        {selectedDraft ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* BLUE SIDE */}
              <SidePanel side="BLUE" draft={selectedDraft} heroAssets={heroAssets} usedHeroes={usedHeroes}
                heroes={heroes} setSlot={setSlot} clearSlot={clearSlot}
                pickerSlot={pickerSlot} setPickerSlot={setPickerSlot} searchQuery={searchQuery} setSearchQuery={setSearchQuery} filteredHeroes={filteredHeroes} />
              {/* RED SIDE */}
              <SidePanel side="RED" draft={selectedDraft} heroAssets={heroAssets} usedHeroes={usedHeroes}
                heroes={heroes} setSlot={setSlot} clearSlot={clearSlot}
                pickerSlot={pickerSlot} setPickerSlot={setPickerSlot} searchQuery={searchQuery} setSearchQuery={setSearchQuery} filteredHeroes={filteredHeroes} />
            </div>

            {/* Coach Notes */}
            <div className="rounded-xl border border-white/[0.06] bg-[#080e1a]/90 p-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">Coach Notes</span>
              </div>
              <textarea
                value={selectedDraft.notes}
                onChange={e => updateDraft(d => ({ ...d, notes: e.target.value }))}
                className="w-full h-24 bg-white/[0.03] rounded-lg border border-white/[0.06] px-3 py-2 text-sm text-white outline-none focus:border-amber-500/30 transition resize-none"
                placeholder="Strategy notes — ban priorities, win condition, key matchups, rotations..."
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Compass className="mx-auto h-10 w-10 text-slate-700 mb-3" />
              <div className="text-sm font-bold text-slate-500">Pilih draft plan dari sidebar</div>
              <p className="mt-1 text-xs text-slate-600">atau buat baru dengan tombol + New Draft</p>
            </div>
          </div>
        )}
      </div>

      {/* Hero Picker Modal */}
      {pickerSlot && selectedDraft && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[8vh] bg-black/70 backdrop-blur-sm" onClick={() => setPickerSlot(null)}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a1020] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
              <Swords className="h-4 w-4 text-slate-500 shrink-0" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari hero..."
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                autoFocus
              />
              <button onClick={() => setPickerSlot(null)} className="p-1 text-slate-500 hover:text-white cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2 grid grid-cols-4 sm:grid-cols-5 gap-1.5">
              {filteredHeroes.map(h => (
                <button key={h.hero_name} onClick={() => {
                  setSlot(pickerSlot.type, pickerSlot.side, h.hero_name, pickerSlot.index, pickerSlot.lane, pickerSlot.field);
                  setPickerSlot(null);
                  setSearchQuery("");
                }} className="flex flex-col items-center gap-1 rounded-xl p-2 hover:bg-white/[0.06] transition cursor-pointer">
                  <div className="h-10 w-10 overflow-hidden rounded-lg border border-white/10 bg-[#060d1a]">
                    <FallbackImage src={getHeroImageUrl(h.hero_name, heroAssets)} fallbackText={h.hero_name} alt={h.hero_name} className="h-full w-full object-cover" containerClassName="h-full w-full text-[6px]" />
                  </div>
                  <span className="text-[9px] text-slate-400 truncate w-full text-center">{h.hero_name}</span>
                </button>
              ))}
              {filteredHeroes.length === 0 && <div className="col-span-full py-6 text-center text-xs text-slate-500">Tidak ditemukan.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ SIDE PANEL COMPONENT ═══ */
function SidePanel({ side, draft, heroAssets, usedHeroes, heroes, setSlot, clearSlot, pickerSlot, setPickerSlot, searchQuery, setSearchQuery, filteredHeroes }: {
  side: "BLUE" | "RED";
  draft: DraftPlan;
  heroAssets: Record<string, string>;
  usedHeroes: Set<string>;
  heroes: HeroStats[];
  setSlot: (type: "ban" | "pick" | "role", side: "BLUE" | "RED", value: string, index?: number, lane?: Lane, field?: "main" | "backup") => void;
  clearSlot: (type: "ban" | "pick" | "role", side: "BLUE" | "RED", index?: number, lane?: Lane, field?: "main" | "backup") => void;
  pickerSlot: any;
  setPickerSlot: (s: any) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filteredHeroes: HeroStats[];
}) {
  const isBlue = side === "BLUE";
  const bans = isBlue ? draft.blueBans : draft.redBans;
  const picks = isBlue ? draft.bluePicks : draft.redPicks;
  const roles = isBlue ? draft.blueRoles : draft.redRoles;
  const accent = isBlue ? "blue" : "rose";
  const accentBorder = isBlue ? "border-blue-500/20" : "border-rose-500/20";
  const accentBg = isBlue ? "bg-blue-950/20" : "bg-rose-950/20";
  const accentText = isBlue ? "text-blue-300" : "text-rose-300";
  const accentDot = isBlue ? "bg-blue-400" : "bg-rose-400";
  const accentSlotBorder = isBlue ? "border-blue-500/15 hover:border-blue-500/30" : "border-rose-500/15 hover:border-rose-500/30";

  return (
    <div className={`rounded-xl border ${accentBorder} ${accentBg} p-4 space-y-4`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className={`h-2.5 w-2.5 rounded-full ${accentDot} shadow-[0_0_6px_${isBlue ? 'rgba(96,165,250,0.6)' : 'rgba(248,113,113,0.6)'}]`} />
        <span className={`font-mono text-[11px] font-bold uppercase tracking-[0.2em] ${accentText}`}>{side === "BLUE" ? "Blue Side" : "Red Side"}</span>
      </div>

      {/* Bans */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Ban className="h-3 w-3 text-rose-400/60" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Bans</span>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {bans.map((h, i) => (
            <SlotButton key={i} hero={h} heroAssets={heroAssets} index={i} type="ban" side={side}
              accentSlotBorder={accentSlotBorder} isEmpty={!h}
              onClick={() => { setPickerSlot({ type: "ban", side, index: i }); setSearchQuery(""); }}
              onClear={() => clearSlot("ban", side, i)} />
          ))}
        </div>
      </div>

      {/* Picks */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Swords className="h-3 w-3 text-cyan-400/60" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Picks</span>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {picks.map((h, i) => (
            <SlotButton key={i} hero={h} heroAssets={heroAssets} index={i} type="pick" side={side}
              accentSlotBorder={accentSlotBorder} isEmpty={!h}
              onClick={() => { setPickerSlot({ type: "pick", side, index: i }); setSearchQuery(""); }}
              onClear={() => clearSlot("pick", side, i)} />
          ))}
        </div>
      </div>

      {/* Roles */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Target className="h-3 w-3 text-amber-400/60" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Role Lanes</span>
        </div>
        <div className="space-y-1.5">
          {LANES.map(lane => {
            const main = roles[lane].main;
            const backup = roles[lane].backup;
            return (
              <div key={lane} className="grid grid-cols-[52px_1fr_1fr] gap-1.5 items-center">
                <span className="text-[9px] font-bold text-slate-500 uppercase text-right pr-1">{lane}</span>
                {/* Main */}
                <button onClick={() => { setPickerSlot({ type: "role", side, lane, field: "main" }); setSearchQuery(""); }}
                  className={`flex items-center gap-1.5 rounded-lg border ${accentSlotBorder} bg-white/[0.02] px-2 py-1.5 text-left transition cursor-pointer min-h-[32px]`}>
                  {main ? (
                    <>
                      <div className="h-5 w-5 overflow-hidden rounded border border-white/10 bg-[#060d1a]">
                        <FallbackImage src={getHeroImageUrl(main, heroAssets)} fallbackText={main} alt={main} className="h-full w-full object-cover" containerClassName="h-full w-full text-[4px]" />
                      </div>
                      <span className="text-[10px] font-bold text-white truncate">{main}</span>
                      <button onClick={e => { e.stopPropagation(); clearSlot("role", side, undefined, lane, "main"); }} className="ml-auto p-0.5 text-slate-600 hover:text-rose-400 cursor-pointer"><X className="h-2.5 w-2.5" /></button>
                    </>
                  ) : (
                    <span className="text-[9px] text-slate-600">+ main</span>
                  )}
                </button>
                {/* Backup */}
                <button onClick={() => { setPickerSlot({ type: "role", side, lane, field: "backup" }); setSearchQuery(""); }}
                  className={`flex items-center gap-1.5 rounded-lg border border-white/[0.04] bg-white/[0.01] px-2 py-1.5 text-left transition cursor-pointer min-h-[32px] hover:border-white/[0.1]`}>
                  {backup ? (
                    <>
                      <div className="h-5 w-5 overflow-hidden rounded border border-white/10 bg-[#060d1a]">
                        <FallbackImage src={getHeroImageUrl(backup, heroAssets)} fallbackText={backup} alt={backup} className="h-full w-full object-cover" containerClassName="h-full w-full text-[4px]" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 truncate">{backup}</span>
                      <button onClick={e => { e.stopPropagation(); clearSlot("role", side, undefined, lane, "backup"); }} className="ml-auto p-0.5 text-slate-600 hover:text-rose-400 cursor-pointer"><X className="h-2.5 w-2.5" /></button>
                    </>
                  ) : (
                    <span className="text-[9px] text-slate-600">+ alt</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══ SLOT BUTTON ═══ */
function SlotButton({ hero, heroAssets, index, type, side, accentSlotBorder, isEmpty, onClick, onClear }: {
  hero: string; heroAssets: Record<string, string>; index: number; type: "ban" | "pick"; side: string;
  accentSlotBorder: string; isEmpty: boolean; onClick: () => void; onClear: () => void;
}) {
  return (
    <button onClick={onClick}
      className={`relative flex flex-col items-center justify-center rounded-lg border ${isEmpty ? "border-dashed border-white/[0.06] bg-white/[0.01]" : accentSlotBorder + " bg-white/[0.03]"} p-1.5 transition cursor-pointer min-h-[52px]`}>
      {hero ? (
        <>
          <div className="h-8 w-8 overflow-hidden rounded-md border border-white/10 bg-[#060d1a]">
            <FallbackImage src={getHeroImageUrl(hero, heroAssets)} fallbackText={hero} alt={hero} className="h-full w-full object-cover" containerClassName="h-full w-full text-[5px]" />
          </div>
          <span className="mt-0.5 text-[8px] text-slate-400 truncate w-full text-center">{hero}</span>
          <button onClick={e => { e.stopPropagation(); onClear(); }}
            className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#0a1020] border border-white/10 flex items-center justify-center text-slate-500 hover:text-rose-400 hover:border-rose-500/30 transition cursor-pointer">
            <X className="h-2.5 w-2.5" />
          </button>
        </>
      ) : (
        <span className="text-[18px] text-slate-700">+</span>
      )}
    </button>
  );
}
