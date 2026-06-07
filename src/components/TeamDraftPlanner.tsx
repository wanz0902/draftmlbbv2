import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Ban,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Compass,
  Copy,
  Download,
  FileText,
  Layers,
  Plus,
  Save,
  Swords,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { toPng } from "html-to-image";
import FallbackImage from "./FallbackImage";
import { getHeroImageUrl } from "../lib/heroUtils";
import { HeroStats } from "../types";

const LANES = ["EXP", "Jungle", "Mid", "Gold", "Roam"] as const;
type Lane = (typeof LANES)[number];

const LANE_ORDER_BLUE: Lane[] = ["EXP", "Jungle", "Mid", "Gold", "Roam"];
const LANE_ORDER_RED: Lane[] = ["Roam", "Gold", "Mid", "Jungle", "EXP"];

const LANE_LABEL: Record<Lane, string> = {
  EXP: "EXP",
  Jungle: "JGL",
  Mid: "MID",
  Gold: "GOLD",
  Roam: "ROAM",
};

const LANE_COLORS: Record<Lane, { bg: string; text: string; border: string }> = {
  EXP: { bg: "bg-rose-500/20", text: "text-rose-300", border: "border-rose-500/30" },
  Jungle: { bg: "bg-blue-500/20", text: "text-blue-300", border: "border-blue-500/30" },
  Mid: { bg: "bg-slate-400/15", text: "text-slate-300", border: "border-slate-400/30" },
  Gold: { bg: "bg-yellow-500/20", text: "text-yellow-300", border: "border-yellow-500/30" },
  Roam: { bg: "bg-emerald-500/20", text: "text-emerald-300", border: "border-emerald-500/30" },
};

const BACKUP_COUNT = 6;

interface LanePlan {
  main: string;
  backups: string[];
}

interface DraftPlan {
  id: string;
  name: string;
  side: "BLUE" | "RED";
  createdAt: number;
  updatedAt: number;
  blueBans: string[];
  redBans: string[];
  blueLanes: Record<Lane, LanePlan>;
  redLanes: Record<Lane, LanePlan>;
  notes: string;
}

function emptyLanePlan(): LanePlan {
  return { main: "", backups: Array(BACKUP_COUNT).fill("") };
}

function emptyLanes(): Record<Lane, LanePlan> {
  const r: any = {};
  for (const lane of LANES) r[lane] = emptyLanePlan();
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
    blueLanes: emptyLanes(),
    redLanes: emptyLanes(),
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

const STORAGE_KEY = "mlbb_tdp_v3";

function migrateOldDraft(d: any): DraftPlan {
  if (d.blueLanes && d.redLanes) return d as DraftPlan;
  const blueLanes = emptyLanes();
  const redLanes = emptyLanes();
  if (d.blueRoles) {
    for (const lane of LANES) {
      const old = d.blueRoles[lane];
      if (old) {
        blueLanes[lane] = {
          main: old.main || d.bluePicks?.[LANES.indexOf(lane)] || "",
          backups: [old.backup || "", ...Array(BACKUP_COUNT - 1).fill("")],
        };
      }
    }
  }
  if (d.redRoles) {
    for (const lane of LANES) {
      const old = d.redRoles[lane];
      if (old) {
        redLanes[lane] = {
          main: old.main || d.redPicks?.[LANES.indexOf(lane)] || "",
          backups: [old.backup || "", ...Array(BACKUP_COUNT - 1).fill("")],
        };
      }
    }
  }
  return { ...d, blueLanes, redLanes, blueBans: d.blueBans || Array(5).fill(""), redBans: d.redBans || Array(5).fill(""), notes: d.notes || "" };
}

function loadData(): { tournaments: Tournament[]; selectedTourId: string | null; selectedDraftId: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.tournaments = parsed.tournaments.map((t: Tournament) => ({
        ...t,
        drafts: t.drafts.map(migrateOldDraft),
      }));
      return parsed;
    }
  } catch {}
  const t = emptyTournament();
  return { tournaments: [t], selectedTourId: t.id, selectedDraftId: t.drafts[0].id };
}

function saveData(tournaments: Tournament[], selectedTourId: string | null, selectedDraftId: string | null) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tournaments, selectedTourId, selectedDraftId }));
  } catch {}
}

interface TeamDraftPlannerProps {
  heroes: HeroStats[];
  heroAssets: Record<string, string>;
}

type PickerTarget =
  | { type: "ban"; side: "BLUE" | "RED"; index: number }
  | { type: "pick"; side: "BLUE" | "RED"; lane: Lane }
  | { type: "backup"; side: "BLUE" | "RED"; lane: Lane; backupIndex: number };

function sanitizeFilename(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
}

export default function TeamDraftPlanner({ heroes, heroAssets }: TeamDraftPlannerProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [pickerSlot, setPickerSlot] = useState<PickerTarget | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedTours, setExpandedTours] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const d = loadData();
    setTournaments(d.tournaments);
    setSelectedTourId(d.selectedTourId);
    setSelectedDraftId(d.selectedDraftId);
    if (d.selectedTourId) {
      setExpandedTours(new Set([d.selectedTourId]));
    }
  }, []);

  const persist = useCallback((tours: Tournament[], tourId: string | null, draftId: string | null) => {
    saveData(tours, tourId, draftId);
  }, []);

  const selectedTour = tournaments.find((t) => t.id === selectedTourId) || null;
  const selectedDraft = selectedTour?.drafts.find((d) => d.id === selectedDraftId) || null;

  const updateDraft = useCallback(
    (updater: (d: DraftPlan) => DraftPlan) => {
      if (!selectedTourId || !selectedDraftId) return;
      setTournaments((prev) => {
        const next = prev.map((t) =>
          t.id !== selectedTourId
            ? t
            : { ...t, drafts: t.drafts.map((d) => (d.id !== selectedDraftId ? d : { ...updater(d), updatedAt: Date.now() })) }
        );
        persist(next, selectedTourId, selectedDraftId);
        return next;
      });
    },
    [selectedTourId, selectedDraftId, persist]
  );

  const createTournament = () => {
    const t = emptyTournament(`Tournament ${tournaments.length + 1}`);
    setTournaments((prev) => {
      const next = [...prev, t];
      persist(next, t.id, t.drafts[0].id);
      return next;
    });
    setSelectedTourId(t.id);
    setSelectedDraftId(t.drafts[0].id);
    setExpandedTours((prev) => new Set([...prev, t.id]));
  };

  const createDraft = () => {
    if (!selectedTourId) return;
    const d = emptyPlan(`Draft ${(selectedTour?.drafts.length || 0) + 1}`);
    setTournaments((prev) => {
      const next = prev.map((t) => (t.id !== selectedTourId ? t : { ...t, drafts: [...t.drafts, d] }));
      persist(next, selectedTourId, d.id);
      return next;
    });
    setSelectedDraftId(d.id);
  };

  const duplicateDraft = () => {
    if (!selectedTourId || !selectedDraft) return;
    const copy: DraftPlan = {
      ...selectedDraft,
      id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: `${selectedDraft.name} (copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      blueLanes: JSON.parse(JSON.stringify(selectedDraft.blueLanes)),
      redLanes: JSON.parse(JSON.stringify(selectedDraft.redLanes)),
    };
    setTournaments((prev) => {
      const next = prev.map((t) => (t.id !== selectedTourId ? t : { ...t, drafts: [...t.drafts, copy] }));
      persist(next, selectedTourId, copy.id);
      return next;
    });
    setSelectedDraftId(copy.id);
  };

  const deleteDraft = (tourId: string, draftId: string) => {
    setTournaments((prev) => {
      const next = prev.map((t) => (t.id !== tourId ? t : { ...t, drafts: t.drafts.filter((d) => d.id !== draftId) }));
      if (selectedDraftId === draftId) {
        const tour = next.find((t) => t.id === tourId);
        setSelectedDraftId(tour?.drafts[0]?.id || null);
      }
      persist(next, tourId, selectedDraftId === draftId ? next.find((t) => t.id === tourId)?.drafts[0]?.id || null : selectedDraftId);
      return next;
    });
  };

  const deleteTournament = (tourId: string) => {
    setTournaments((prev) => {
      const next = prev.filter((t) => t.id !== tourId);
      const newTour = next[0] || null;
      const newTourId = newTour?.id || null;
      const newDraftId = newTour?.drafts[0]?.id || null;
      setSelectedTourId(newTourId);
      setSelectedDraftId(newDraftId);
      persist(next, newTourId, newDraftId);
      return next;
    });
  };

  const toggleTourExpand = (tourId: string) => {
    setExpandedTours((prev) => {
      const next = new Set(prev);
      if (next.has(tourId)) next.delete(tourId);
      else next.add(tourId);
      return next;
    });
  };

  const selectDraft = (tourId: string, draftId: string) => {
    setSelectedTourId(tourId);
    setSelectedDraftId(draftId);
    setExpandedTours((prev) => new Set([...prev, tourId]));
  };

  const setBan = (side: "BLUE" | "RED", index: number, value: string) => {
    updateDraft((d) => {
      const key = side === "BLUE" ? "blueBans" : "redBans";
      const arr = [...d[key]];
      arr[index] = value;
      return { ...d, [key]: arr };
    });
  };

  const setLaneMain = (side: "BLUE" | "RED", lane: Lane, value: string) => {
    updateDraft((d) => {
      const key = side === "BLUE" ? "blueLanes" : "redLanes";
      return { ...d, [key]: { ...d[key], [lane]: { ...d[key][lane], main: value } } };
    });
  };

  const setLaneBackup = (side: "BLUE" | "RED", lane: Lane, backupIndex: number, value: string) => {
    updateDraft((d) => {
      const key = side === "BLUE" ? "blueLanes" : "redLanes";
      const backups = [...d[key][lane].backups];
      backups[backupIndex] = value;
      return { ...d, [key]: { ...d[key], [lane]: { ...d[key][lane], backups } } };
    });
  };

  const clearSlot = (target: PickerTarget) => {
    if (target.type === "ban") setBan(target.side, target.index, "");
    else if (target.type === "pick") setLaneMain(target.side, target.lane, "");
    else setLaneBackup(target.side, target.lane, target.backupIndex, "");
  };

  const applyPick = (target: PickerTarget, heroName: string) => {
    if (target.type === "ban") setBan(target.side, target.index, heroName);
    else if (target.type === "pick") setLaneMain(target.side, target.lane, heroName);
    else setLaneBackup(target.side, target.lane, target.backupIndex, heroName);
  };

  const usedHeroes = useMemo(() => {
    if (!selectedDraft) return new Set<string>();
    const s = new Set<string>();
    [...selectedDraft.blueBans, ...selectedDraft.redBans].forEach((h) => { if (h) s.add(h); });
    for (const lanes of [selectedDraft.blueLanes, selectedDraft.redLanes]) {
      for (const lane of LANES) {
        if (lanes[lane].main) s.add(lanes[lane].main);
        for (const b of lanes[lane].backups) { if (b) s.add(b); }
      }
    }
    return s;
  }, [selectedDraft]);

  const filteredHeroes = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return heroes.filter((h) => h.hero_name.toLowerCase().includes(q));
  }, [heroes, searchQuery]);

  const progress = useMemo(() => {
    if (!selectedDraft) return { bans: 0, picks: 0, pct: 0 };
    const allBans = [...selectedDraft.blueBans, ...selectedDraft.redBans].filter(Boolean);
    const allMains = [selectedDraft.blueLanes, selectedDraft.redLanes].flatMap((l) => LANES.map((lane) => l[lane].main)).filter(Boolean);
    const total = 20;
    const filled = allBans.length + allMains.length;
    return { bans: allBans.length, picks: allMains.length, pct: Math.round((filled / total) * 100) };
  }, [selectedDraft]);

  const openPicker = (target: PickerTarget) => {
    setPickerSlot(target);
    setSearchQuery("");
  };

  const handleExportPng = async () => {
    if (!boardRef.current || !selectedDraft || exporting) return;
    setExporting(true);
    try {
      const tourName = sanitizeFilename(selectedTour?.name || "tournament");
      const draftName = sanitizeFilename(selectedDraft.name);
      const filename = `${tourName}-${draftName}.png`;

      const dataUrl = await toPng(boardRef.current, {
        backgroundColor: "#060b16",
        pixelRatio: 2,
        cacheBust: true,
        filter: (node: Element) => {
          if (node instanceof HTMLElement) {
            if (node.dataset?.noExport) return false;
          }
          return true;
        },
      });

      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-[#060b16]">
      {/* ═══ LEFT SIDEBAR ═══ */}
      <aside
        className={`${sidebarCollapsed ? "w-[52px]" : "w-[260px]"} shrink-0 flex flex-col border-r border-white/[0.06] bg-[#070c18] transition-all duration-300 overflow-hidden`}
      >
        {sidebarCollapsed ? (
          <div className="flex flex-col items-center py-3 gap-3">
            <button onClick={() => setSidebarCollapsed(false)} className="p-2 text-slate-500 hover:text-cyan-400 transition cursor-pointer" title="Expand sidebar">
              <Layers className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Team Draft Planner
              </span>
              <button onClick={() => setSidebarCollapsed(true)} className="p-1 text-slate-600 hover:text-slate-300 transition cursor-pointer">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">Tournaments</span>
                <button onClick={createTournament} className="rounded bg-amber-500/15 border border-amber-500/25 px-1.5 py-0.5 text-[8px] font-bold text-amber-400 hover:bg-amber-500/25 transition cursor-pointer">
                  + NEW
                </button>
              </div>

              {tournaments.map((t) => {
                const isExpanded = expandedTours.has(t.id);
                const isActive = t.id === selectedTourId;
                return (
                  <div key={t.id} className="group">
                    <button
                      onClick={() => toggleTourExpand(t.id)}
                      className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 transition cursor-pointer ${isActive ? "bg-white/[0.04]" : "hover:bg-white/[0.03]"}`}
                    >
                      <ChevronDown className={`h-3 w-3 text-slate-600 shrink-0 transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
                      <span className={`flex-1 truncate text-xs font-medium ${isActive ? "text-white" : "text-slate-400"}`}>{t.name}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteTournament(t.id); }}
                        className="p-0.5 text-slate-700 opacity-0 group-hover:opacity-100 hover:text-rose-400 transition cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </button>

                    {isExpanded && (
                      <div className="ml-4 space-y-0.5">
                        {t.drafts.map((d) => {
                          const isDraftActive = d.id === selectedDraftId;
                          const draftFilled = [...d.blueBans, ...d.redBans].filter(Boolean).length +
                            [d.blueLanes, d.redLanes].flatMap((l) => LANES.map((lane) => l[lane].main)).filter(Boolean).length;
                          return (
                            <button
                              key={d.id}
                              onClick={() => selectDraft(t.id, d.id)}
                              className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition cursor-pointer ${
                                isDraftActive ? "bg-cyan-500/10 text-cyan-300" : "text-slate-500 hover:bg-white/[0.03] hover:text-slate-300"
                              }`}
                            >
                              <FileText className="h-3 w-3 shrink-0" />
                              <span className="flex-1 truncate text-[11px]">{d.name}</span>
                              <span className="text-[9px] font-mono text-slate-600">{draftFilled}/20</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); duplicateDraft(); }}
                                className="p-0.5 text-slate-700 opacity-0 group-hover:opacity-100 hover:text-cyan-400 transition cursor-pointer"
                                title="Duplicate"
                              >
                                <Copy className="h-2.5 w-2.5" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteDraft(t.id, d.id); }}
                                className="p-0.5 text-slate-700 opacity-0 group-hover:opacity-100 hover:text-rose-400 transition cursor-pointer"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </button>
                          );
                        })}
                        <button
                          onClick={createDraft}
                          className="w-full flex items-center gap-2 rounded-lg border border-dashed border-white/[0.06] px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:text-cyan-400 hover:border-cyan-500/20 transition cursor-pointer"
                        >
                          <Plus className="h-2.5 w-2.5" /> ADD DRAFT
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {tournaments.length === 0 && (
                <div className="py-8 text-center">
                  <Compass className="mx-auto h-8 w-8 text-slate-800 mb-2" />
                  <div className="text-[10px] text-slate-600">No tournaments yet</div>
                </div>
              )}
            </div>
          </>
        )}
      </aside>

      {/* ═══ MAIN WORKSPACE ═══ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ─── HEADER ─── */}
        <header className="border-b border-white/[0.06] bg-[#080e1a]/80 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-4 px-5 py-3">
            {sidebarCollapsed && (
              <button onClick={() => setSidebarCollapsed(false)} className="p-1.5 text-slate-500 hover:text-cyan-400 transition cursor-pointer" title="Expand sidebar">
                <Layers className="h-4 w-4" />
              </button>
            )}

            {selectedDraft ? (
              <>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.15em] text-slate-600 mb-0.5">
                    <span>{selectedTour?.name}</span>
                    <ChevronRight className="h-2.5 w-2.5" />
                    <span>{selectedDraft.name}</span>
                  </div>
                  <input
                    value={selectedDraft.name}
                    onChange={(e) => updateDraft((d) => ({ ...d, name: e.target.value }))}
                    className="bg-transparent text-lg font-black text-white outline-none border-b border-transparent focus:border-cyan-500/30 transition w-full max-w-[240px] font-display"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-0.5">
                    {(["BLUE", "RED"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => updateDraft((d) => ({ ...d, side: s }))}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                          selectedDraft.side === s
                            ? s === "BLUE"
                              ? "bg-blue-500/20 text-blue-300 shadow-[0_0_8px_rgba(96,165,250,0.15)]"
                              : "bg-rose-500/20 text-rose-300 shadow-[0_0_8px_rgba(248,113,113,0.15)]"
                            : "text-slate-600 hover:text-slate-400"
                        }`}
                      >
                        {selectedDraft.side === s ? "Our " : ""}{s === "BLUE" ? "Blue" : "Red"}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleExportPng}
                    disabled={exporting}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 px-4 py-1.5 text-[11px] font-bold text-amber-300 hover:bg-amber-500/25 transition cursor-pointer disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {exporting ? "Exporting..." : "Save"}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3 text-slate-600">
                <Compass className="h-4 w-4" />
                <span className="text-xs">Select a draft from the sidebar or create a new one</span>
              </div>
            )}
          </div>

          {selectedDraft && (
            <div className="flex items-center justify-end gap-5 border-t border-white/[0.04] px-5 py-1.5">
              <span className="text-[10px] font-mono text-slate-500">
                Bans <span className="text-white font-bold">{progress.bans}</span>/10
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                Picks <span className="text-white font-bold">{progress.picks}</span>/10
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                Complete <span className={`font-bold ${progress.pct === 100 ? "text-emerald-400" : "text-cyan-400"}`}>{progress.pct}%</span>
              </span>
            </div>
          )}
        </header>

        {/* ─── BOARD AREA ─── */}
        {selectedDraft ? (
          <div className="flex-1 overflow-y-auto">
            <div ref={boardRef} className="flex flex-col min-h-full">
              <div className="grid grid-cols-2 flex-1 min-h-0">
                <BoardPanel side="BLUE" draft={selectedDraft} heroAssets={heroAssets} openPicker={openPicker} clearSlot={clearSlot} isOurSide={selectedDraft.side === "BLUE"} />
                <BoardPanel side="RED" draft={selectedDraft} heroAssets={heroAssets} openPicker={openPicker} clearSlot={clearSlot} isOurSide={selectedDraft.side === "RED"} />
              </div>

              <div className="border-t border-white/[0.06] bg-[#070c18]/80 px-5 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-3.5 w-3.5 text-slate-500" />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Coach Notes</span>
                </div>
                <textarea
                  value={selectedDraft.notes}
                  onChange={(e) => updateDraft((d) => ({ ...d, notes: e.target.value }))}
                  className="w-full h-20 bg-white/[0.02] rounded-lg border border-white/[0.06] px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500/30 transition resize-none placeholder:text-slate-700"
                  placeholder="Strategy notes — ban priorities, win condition, key matchups, rotations..."
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Compass className="mx-auto h-12 w-12 text-slate-800 mb-3" />
              <div className="text-sm font-bold text-slate-600">No draft selected</div>
              <p className="mt-1 text-xs text-slate-700">Create a tournament and draft from the sidebar</p>
            </div>
          </div>
        )}
      </div>

      {/* ═══ HERO PICKER MODAL ═══ */}
      {pickerSlot && selectedDraft && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] bg-black/70 backdrop-blur-sm" onClick={() => setPickerSlot(null)}>
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a1020] shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
              <Swords className="h-4 w-4 text-slate-500 shrink-0" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {pickerSlot.type === "ban"
                  ? `Ban — ${pickerSlot.side === "BLUE" ? "Blue" : "Red"}`
                  : pickerSlot.type === "pick"
                    ? `${pickerSlot.lane} Main — ${pickerSlot.side === "BLUE" ? "Blue" : "Red"}`
                    : `${pickerSlot.lane} Alt #${pickerSlot.backupIndex + 1} — ${pickerSlot.side === "BLUE" ? "Blue" : "Red"}`}
              </span>
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search hero..." className="ml-auto flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600 text-right" autoFocus />
              <button onClick={() => setPickerSlot(null)} className="p-1 text-slate-500 hover:text-white cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2 grid grid-cols-4 sm:grid-cols-5 gap-1.5">
              {filteredHeroes.map((h) => {
                const isUsed = usedHeroes.has(h.hero_name);
                return (
                  <button key={h.hero_name} onClick={() => { applyPick(pickerSlot, h.hero_name); setPickerSlot(null); setSearchQuery(""); }} className={`relative flex flex-col items-center gap-1 rounded-xl p-2 transition cursor-pointer ${isUsed ? "opacity-45 hover:opacity-70" : "hover:bg-white/[0.06]"}`}>
                    <div className={`h-10 w-10 overflow-hidden rounded-lg border bg-[#060d1a] ${isUsed ? "border-white/[0.04]" : "border-white/10"}`}>
                      <FallbackImage src={getHeroImageUrl(h.hero_name, heroAssets)} fallbackText={h.hero_name} alt={h.hero_name} className="h-full w-full object-cover" containerClassName="h-full w-full text-[6px]" />
                    </div>
                    <span className={`text-[9px] truncate w-full text-center ${isUsed ? "text-slate-600" : "text-slate-400"}`}>{h.hero_name}</span>
                    {isUsed && (
                      <span className="absolute top-1 right-1 rounded bg-slate-500/30 px-1 py-[1px] text-[6px] font-bold uppercase text-slate-400 leading-none">Used</span>
                    )}
                  </button>
                );
              })}
              {filteredHeroes.length === 0 && <div className="col-span-full py-6 text-center text-xs text-slate-500">No heroes found.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ BOARD PANEL ═══ */
function BoardPanel({ side, draft, heroAssets, openPicker, clearSlot, isOurSide }: {
  side: "BLUE" | "RED";
  draft: DraftPlan;
  heroAssets: Record<string, string>;
  openPicker: (t: PickerTarget) => void;
  clearSlot: (t: PickerTarget) => void;
  isOurSide: boolean;
}) {
  const isBlue = side === "BLUE";
  const bans = isBlue ? draft.blueBans : draft.redBans;
  const lanes = isBlue ? draft.blueLanes : draft.redLanes;
  const laneOrder = isBlue ? LANE_ORDER_BLUE : LANE_ORDER_RED;
  const banLabels = isBlue ? ["B1", "B2", "B3", "B4", "B5"] : ["B5", "B4", "B3", "B2", "B1"];
  const pickLabels = isBlue ? ["P1", "P2", "P3", "P4", "P5"] : ["P5", "P4", "P3", "P2", "P1"];

  const borderColor = isBlue ? "border-blue-500/10" : "border-rose-500/10";
  const headerBg = isBlue ? "bg-blue-950/30" : "bg-rose-950/30";
  const accentText = isBlue ? "text-blue-300" : "text-rose-300";
  const accentDot = isBlue ? "bg-blue-400" : "bg-rose-400";
  const ringColor = isBlue ? "border-blue-500/25" : "border-rose-500/25";

  return (
    <div className={`flex flex-col border-r ${borderColor} overflow-hidden`}>
      <div className={`flex items-center justify-between px-5 py-2.5 border-b border-white/[0.04] ${headerBg}`}>
        <div className="flex items-center gap-2.5">
          <div className={`h-2 w-2 rounded-full ${accentDot}`} />
          <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.2em] ${accentText}`}>
            {side === "BLUE" ? "Blue Side" : "Red Side"}
          </span>
          {isOurSide && (
            <span className={`rounded px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider ${isBlue ? "bg-blue-500/20 text-blue-300" : "bg-rose-500/20 text-rose-300"}`}>OURS</span>
          )}
        </div>
        <span className="text-[10px] font-mono text-slate-500">
          {banLabels.filter((_, i) => bans[i]).length + laneOrder.filter((l) => lanes[l].main).length}/10
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        <div>
          <div className="flex items-center gap-1.5 mb-2.5">
            <Ban className="h-3 w-3 text-rose-400/40" />
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">Bans</span>
          </div>
          <div className="flex justify-between gap-1">
            {bans.map((h, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <CircleSlot hero={h} heroAssets={heroAssets} ring={ringColor} onClick={() => openPicker({ type: "ban", side, index: i })} onClear={() => clearSlot({ type: "ban", side, index: i })} />
                <span className="text-[8px] font-mono font-bold text-slate-600 uppercase">{banLabels[i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-2.5">
            <Swords className="h-3 w-3 text-cyan-400/40" />
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">Picks</span>
          </div>
          <div className="flex justify-between gap-1">
            {laneOrder.map((lane, idx) => {
              const plan = lanes[lane];
              const lc = LANE_COLORS[lane];
              return (
                <div key={lane} className="flex flex-col items-center gap-1.5 flex-1">
                  <CircleSlot hero={plan.main} heroAssets={heroAssets} ring={ringColor} onClick={() => openPicker({ type: "pick", side, lane })} onClear={() => clearSlot({ type: "pick", side, lane })} />
                  <button onClick={() => openPicker({ type: "pick", side, lane })} className={`inline-flex items-center gap-1 rounded-full border ${lc.border} ${lc.bg} px-2 py-0.5 cursor-pointer transition hover:opacity-80`}>
                    <span className={`text-[8px] font-black uppercase tracking-wider ${lc.text}`}>{LANE_LABEL[lane]}</span>
                  </button>
                  <div className="grid grid-cols-3 gap-1 mt-0.5">
                    {plan.backups.map((b, bi) => (
                      <MiniSlot key={bi} hero={b} heroAssets={heroAssets} ring={ringColor} onClick={() => openPicker({ type: "backup", side, lane, backupIndex: bi })} onClear={() => clearSlot({ type: "backup", side, lane, backupIndex: bi })} />
                    ))}
                  </div>
                  <span className="text-[8px] font-mono font-bold text-cyan-500/60 uppercase mt-0.5">Alt</span>
                  <span className="text-[8px] font-mono font-bold text-slate-600 uppercase">{pickLabels[idx]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ CIRCLE SLOT (Ban/Pick — large) ═══ */
function CircleSlot({ hero, heroAssets, ring, onClick, onClear }: {
  hero: string; heroAssets: Record<string, string>; ring: string; onClick: () => void; onClear: () => void;
}) {
  const empty = !hero;
  return (
    <button onClick={onClick} className={`relative h-16 w-16 rounded-full border-2 ${empty ? "border-dashed border-white/[0.08] bg-white/[0.01]" : `${ring} bg-white/[0.03]`} flex items-center justify-center transition cursor-pointer hover:scale-105`}>
      {hero ? (
        <>
          <div className="h-12 w-12 overflow-hidden rounded-full border border-white/10 bg-[#060d1a]">
            <FallbackImage src={getHeroImageUrl(hero, heroAssets)} fallbackText={hero} alt={hero} className="h-full w-full object-cover" containerClassName="h-full w-full text-[5px]" />
          </div>
          <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-[#0a1020] border border-white/10 flex items-center justify-center text-slate-500 hover:text-rose-400 hover:border-rose-500/30 transition cursor-pointer">
            <X className="h-2.5 w-2.5" />
          </button>
        </>
      ) : <span className="text-xl text-slate-700">+</span>}
    </button>
  );
}

/* ═══ MINI SLOT (Backup — small) ═══ */
function MiniSlot({ hero, heroAssets, ring, onClick, onClear }: {
  hero: string; heroAssets: Record<string, string>; ring: string; onClick: () => void; onClear: () => void;
}) {
  const empty = !hero;
  return (
    <button onClick={onClick} className={`relative h-9 w-9 rounded-full border ${empty ? "border-dashed border-white/[0.06] bg-white/[0.01]" : `${ring} bg-white/[0.03]`} flex items-center justify-center transition cursor-pointer hover:scale-110`}>
      {hero ? (
        <>
          <div className="h-7 w-7 overflow-hidden rounded-full border border-white/10 bg-[#060d1a]">
            <FallbackImage src={getHeroImageUrl(hero, heroAssets)} fallbackText={hero} alt={hero} className="h-full w-full object-cover" containerClassName="h-full w-full text-[3px]" />
          </div>
          <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#0a1020] border border-white/10 flex items-center justify-center text-slate-600 hover:text-rose-400 transition cursor-pointer">
            <X className="h-2 w-2" />
          </button>
        </>
      ) : <span className="text-[11px] text-slate-700">+</span>}
    </button>
  );
}
