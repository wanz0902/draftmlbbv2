import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  BookOpen,
  Compass,
  Copy,
  Layers,
  Plus,
  Save,
  Swords,
  Target,
  Trash2,
  X,
  ChevronDown,
} from "lucide-react";
import FallbackImage from "./FallbackImage";
import { getHeroImageUrl } from "../lib/heroUtils";
import { HeroStats } from "../types";

const LANES = ["EXP", "Jungle", "Mid", "Gold", "Roam"] as const;
type Lane = (typeof LANES)[number];

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

function loadData(): {
  tournaments: Tournament[];
  selectedTourId: string | null;
  selectedDraftId: string | null;
} {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const t = emptyTournament();
  return {
    tournaments: [t],
    selectedTourId: t.id,
    selectedDraftId: t.drafts[0].id,
  };
}

function saveData(
  tournaments: Tournament[],
  selectedTourId: string | null,
  selectedDraftId: string | null
) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ tournaments, selectedTourId, selectedDraftId })
    );
  } catch {}
}

interface TeamDraftPlannerProps {
  heroes: HeroStats[];
  heroAssets: Record<string, string>;
}

type PickerTarget = {
  type: "ban" | "pick" | "role";
  side: "BLUE" | "RED";
  index?: number;
  lane?: Lane;
  field?: "main" | "backup";
};

export default function TeamDraftPlanner({
  heroes,
  heroAssets,
}: TeamDraftPlannerProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [pickerSlot, setPickerSlot] = useState<PickerTarget | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [tourDropdownOpen, setTourDropdownOpen] = useState(false);
  const [draftDropdownOpen, setDraftDropdownOpen] = useState(false);

  useEffect(() => {
    const d = loadData();
    setTournaments(d.tournaments);
    setSelectedTourId(d.selectedTourId);
    setSelectedDraftId(d.selectedDraftId);
  }, []);

  const persist = useCallback(
    (
      tours: Tournament[],
      tourId: string | null,
      draftId: string | null
    ) => {
      saveData(tours, tourId, draftId);
    },
    []
  );

  const selectedTour =
    tournaments.find((t) => t.id === selectedTourId) || null;
  const selectedDraft =
    selectedTour?.drafts.find((d) => d.id === selectedDraftId) || null;

  const updateDraft = useCallback(
    (updater: (d: DraftPlan) => DraftPlan) => {
      if (!selectedTourId || !selectedDraftId) return;
      setTournaments((prev) => {
        const next = prev.map((t) =>
          t.id !== selectedTourId
            ? t
            : {
                ...t,
                drafts: t.drafts.map((d) =>
                  d.id !== selectedDraftId
                    ? d
                    : { ...updater(d), updatedAt: Date.now() }
                ),
              }
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
    setTourDropdownOpen(false);
  };

  const createDraft = () => {
    if (!selectedTourId) return;
    const d = emptyPlan(`Draft ${(selectedTour?.drafts.length || 0) + 1}`);
    setTournaments((prev) => {
      const next = prev.map((t) =>
        t.id !== selectedTourId ? t : { ...t, drafts: [...t.drafts, d] }
      );
      persist(next, selectedTourId, d.id);
      return next;
    });
    setSelectedDraftId(d.id);
    setDraftDropdownOpen(false);
  };

  const duplicateDraft = () => {
    if (!selectedTourId || !selectedDraft) return;
    const copy = {
      ...selectedDraft,
      id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: `${selectedDraft.name} (copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setTournaments((prev) => {
      const next = prev.map((t) =>
        t.id !== selectedTourId ? t : { ...t, drafts: [...t.drafts, copy] }
      );
      persist(next, selectedTourId, copy.id);
      return next;
    });
    setSelectedDraftId(copy.id);
  };

  const deleteDraft = (tourId: string, draftId: string) => {
    setTournaments((prev) => {
      const next = prev.map((t) =>
        t.id !== tourId
          ? t
          : { ...t, drafts: t.drafts.filter((d) => d.id !== draftId) }
      );
      if (selectedDraftId === draftId) {
        const tour = next.find((t) => t.id === tourId);
        setSelectedDraftId(tour?.drafts[0]?.id || null);
      }
      persist(
        next,
        tourId,
        selectedDraftId === draftId
          ? next.find((t) => t.id === tourId)?.drafts[0]?.id || null
          : selectedDraftId
      );
      return next;
    });
  };

  const deleteTournament = (tourId: string) => {
    setTournaments((prev) => {
      const next = prev.filter((t) => t.id !== tourId);
      const newTour = next[0] || null;
      setSelectedTourId(newTour?.id || null);
      setSelectedDraftId(newTour?.drafts[0]?.id || null);
      persist(
        next,
        newTour?.id || null,
        newTour?.drafts[0]?.id || null
      );
      return next;
    });
  };

  const setSlot = (
    type: "ban" | "pick" | "role",
    side: "BLUE" | "RED",
    value: string,
    index?: number,
    lane?: Lane,
    field?: "main" | "backup"
  ) => {
    updateDraft((d) => {
      const nd = { ...d };
      if (type === "ban" && index !== undefined) {
        const key = side === "BLUE" ? "blueBans" : "redBans";
        nd[key] = [...(nd as any)[key]];
        (nd as any)[key][index] = value;
      } else if (type === "pick" && index !== undefined) {
        const key = side === "BLUE" ? "bluePicks" : "redPicks";
        nd[key] = [...(nd as any)[key]];
        (nd as any)[key][index] = value;
      } else if (type === "role" && lane && field) {
        const key = side === "BLUE" ? "blueRoles" : "redRoles";
        nd[key] = {
          ...nd[key],
          [lane]: { ...nd[key][lane], [field]: value },
        };
      }
      return nd;
    });
  };

  const clearSlot = (
    type: "ban" | "pick" | "role",
    side: "BLUE" | "RED",
    index?: number,
    lane?: Lane,
    field?: "main" | "backup"
  ) => {
    setSlot(type, side, "", index, lane, field);
  };

  const usedHeroes = useMemo(() => {
    if (!selectedDraft) return new Set<string>();
    const s = new Set<string>();
    [
      ...selectedDraft.blueBans,
      ...selectedDraft.redBans,
      ...selectedDraft.bluePicks,
      ...selectedDraft.redPicks,
    ].forEach((h) => {
      if (h) s.add(h);
    });
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
    return heroes
      .filter(
        (h) =>
          !usedHeroes.has(h.hero_name) &&
          h.hero_name.toLowerCase().includes(q)
      )
      .slice(0, 40);
  }, [heroes, searchQuery, usedHeroes]);

  const progress = useMemo(() => {
    if (!selectedDraft) return { bans: 0, picks: 0, roles: 0, pct: 0 };
    const allBans = [
      ...selectedDraft.blueBans,
      ...selectedDraft.redBans,
    ].filter(Boolean);
    const allPicks = [
      ...selectedDraft.bluePicks,
      ...selectedDraft.redPicks,
    ].filter(Boolean);
    const allRoles = [selectedDraft.blueRoles, selectedDraft.redRoles].flatMap(
      (r) => LANES.flatMap((l) => [r[l].main, r[l].backup])
    ).filter(Boolean);
    const total = 30;
    const filled = allBans.length + allPicks.length + allRoles.length;
    return {
      bans: allBans.length,
      picks: allPicks.length,
      roles: allRoles.length,
      pct: Math.round((filled / total) * 100),
    };
  }, [selectedDraft]);

  const openPicker = (target: PickerTarget) => {
    setPickerSlot(target);
    setSearchQuery("");
  };

  return (
    <div className="flex h-[calc(100vh-80px)] flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-[#060b16]">
      {/* ═══ TOP TOOLBAR ═══ */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] bg-[#080e1a]/80 px-4 py-2.5 backdrop-blur-sm">
        {/* Tournament Selector */}
        <div className="relative">
          <button
            onClick={() => {
              setTourDropdownOpen((v) => !v);
              setDraftDropdownOpen(false);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-cyan-500/20 hover:text-white cursor-pointer"
          >
            <Layers className="h-3 w-3 text-cyan-400/70" />
            <span className="max-w-[120px] truncate">
              {selectedTour?.name || "Tournament"}
            </span>
            <ChevronDown className="h-3 w-3 text-slate-500" />
          </button>
          {tourDropdownOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#0a1020] shadow-2xl">
              <div className="max-h-48 overflow-y-auto p-1">
                {tournaments.map((t) => (
                  <div key={t.id} className="group">
                    <div className="flex items-center gap-2 px-2 py-1">
                      <span
                        className={`flex-1 truncate text-xs ${
                          t.id === selectedTourId
                            ? "font-bold text-cyan-300"
                            : "text-slate-400"
                        }`}
                      >
                        {t.name}
                      </span>
                      <button
                        onClick={() => deleteTournament(t.id)}
                        className="p-0.5 text-slate-600 opacity-0 group-hover:opacity-100 hover:text-rose-400 transition cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/[0.06] p-1">
                <button
                  onClick={createTournament}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:bg-white/[0.05] hover:text-cyan-300 transition cursor-pointer"
                >
                  <Plus className="h-3 w-3" /> New Tournament
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Draft Selector */}
        <div className="relative">
          <button
            onClick={() => {
              setDraftDropdownOpen((v) => !v);
              setTourDropdownOpen(false);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-cyan-500/20 hover:text-white cursor-pointer"
          >
            <span className="max-w-[100px] truncate">
              {selectedDraft?.name || "Draft"}
            </span>
            <ChevronDown className="h-3 w-3 text-slate-500" />
          </button>
          {draftDropdownOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#0a1020] shadow-2xl">
              <div className="max-h-48 overflow-y-auto p-1">
                {selectedTour?.drafts.map((d) => (
                  <div key={d.id} className="group flex items-center gap-1">
                    <button
                      onClick={() => {
                        setSelectedDraftId(d.id);
                        setDraftDropdownOpen(false);
                      }}
                      className={`flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition cursor-pointer ${
                        d.id === selectedDraftId
                          ? "bg-cyan-500/10 font-bold text-cyan-300"
                          : "text-slate-400 hover:bg-white/[0.05]"
                      }`}
                    >
                      <span className="truncate">{d.name}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDraft(selectedTourId!, d.id);
                      }}
                      className="p-0.5 text-slate-600 opacity-0 group-hover:opacity-100 hover:text-rose-400 transition cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/[0.06] p-1">
                <button
                  onClick={createDraft}
                  disabled={!selectedTourId}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:bg-white/[0.05] hover:text-cyan-300 transition cursor-pointer disabled:opacity-30"
                >
                  <Plus className="h-3 w-3" /> New Draft
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Draft Name */}
        {selectedDraft && (
          <input
            value={selectedDraft.name}
            onChange={(e) =>
              updateDraft((d) => ({ ...d, name: e.target.value }))
            }
            className="bg-transparent text-sm font-bold text-white outline-none border-b border-transparent focus:border-cyan-500/30 transition min-w-0 max-w-[140px]"
          />
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Side Toggle */}
        {selectedDraft && (
          <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-0.5">
            {(["BLUE", "RED"] as const).map((s) => (
              <button
                key={s}
                onClick={() => updateDraft((d) => ({ ...d, side: s }))}
                className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition cursor-pointer ${
                  selectedDraft.side === s
                    ? s === "BLUE"
                      ? "bg-blue-500/20 text-blue-300"
                      : "bg-rose-500/20 text-rose-300"
                    : "text-slate-600 hover:text-slate-400"
                }`}
              >
                {s === "BLUE" ? "Blue" : "Red"}
              </button>
            ))}
          </div>
        )}

        {/* Progress */}
        {selectedDraft && (
          <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
            <span>
              Bans{" "}
              <span className="text-white font-bold">{progress.bans}</span>/10
            </span>
            <span>
              Picks{" "}
              <span className="text-white font-bold">{progress.picks}</span>/10
            </span>
            <span className="text-cyan-400 font-bold">{progress.pct}%</span>
          </div>
        )}

        {/* Actions */}
        {selectedDraft && (
          <div className="flex items-center gap-1">
            <button
              onClick={duplicateDraft}
              className="p-1.5 text-slate-500 hover:text-cyan-400 transition cursor-pointer"
              title="Duplicate Draft"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => {}}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/25 px-3 py-1.5 text-[10px] font-bold text-cyan-300 hover:bg-cyan-500/25 transition cursor-pointer"
            >
              <Save className="h-3 w-3" /> Save
            </button>
          </div>
        )}
      </div>

      {/* ═══ BOARD WORKSPACE ═══ */}
      {selectedDraft ? (
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid h-full gap-3 lg:grid-cols-2">
            {/* BLUE SIDE */}
            <BoardColumn
              side="BLUE"
              draft={selectedDraft}
              heroAssets={heroAssets}
              usedHeroes={usedHeroes}
              heroes={heroes}
              setSlot={setSlot}
              clearSlot={clearSlot}
              openPicker={openPicker}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filteredHeroes={filteredHeroes}
            />
            {/* RED SIDE */}
            <BoardColumn
              side="RED"
              draft={selectedDraft}
              heroAssets={heroAssets}
              usedHeroes={usedHeroes}
              heroes={heroes}
              setSlot={setSlot}
              clearSlot={clearSlot}
              openPicker={openPicker}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filteredHeroes={filteredHeroes}
            />
          </div>

          {/* Coach Notes */}
          <div className="mt-3 rounded-xl border border-white/[0.06] bg-[#080e1a]/90 p-3">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Coach Notes
              </span>
            </div>
            <textarea
              value={selectedDraft.notes}
              onChange={(e) =>
                updateDraft((d) => ({ ...d, notes: e.target.value }))
              }
              className="w-full h-20 bg-white/[0.03] rounded-lg border border-white/[0.06] px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/30 transition resize-none"
              placeholder="Strategy notes — ban priorities, win condition, key matchups, rotations..."
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Compass className="mx-auto h-10 w-10 text-slate-700 mb-3" />
            <div className="text-sm font-bold text-slate-500">
              Select or create a draft plan
            </div>
            <p className="mt-1 text-xs text-slate-600">
              Use the dropdowns above to get started
            </p>
          </div>
        </div>
      )}

      {/* ═══ HERO PICKER MODAL ═══ */}
      {pickerSlot && selectedDraft && (
        <div
          className="fixed inset-0 z-[9999] flex items-start justify-center pt-[8vh] bg-black/70 backdrop-blur-sm"
          onClick={() => setPickerSlot(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a1020] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
              <Swords className="h-4 w-4 text-slate-500 shrink-0" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {pickerSlot.type === "ban"
                  ? "Ban"
                  : pickerSlot.type === "pick"
                    ? "Pick"
                    : `${pickerSlot.lane} ${pickerSlot.field}`}
                {" — "}
                {pickerSlot.side === "BLUE" ? "Blue" : "Red"}
              </span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search hero..."
                className="ml-auto flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600 text-right"
                autoFocus
              />
              <button
                onClick={() => setPickerSlot(null)}
                className="p-1 text-slate-500 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2 grid grid-cols-4 sm:grid-cols-5 gap-1.5">
              {filteredHeroes.map((h) => (
                <button
                  key={h.hero_name}
                  onClick={() => {
                    setSlot(
                      pickerSlot.type,
                      pickerSlot.side,
                      h.hero_name,
                      pickerSlot.index,
                      pickerSlot.lane,
                      pickerSlot.field
                    );
                    setPickerSlot(null);
                    setSearchQuery("");
                  }}
                  className="flex flex-col items-center gap-1 rounded-xl p-2 hover:bg-white/[0.06] transition cursor-pointer"
                >
                  <div className="h-10 w-10 overflow-hidden rounded-lg border border-white/10 bg-[#060d1a]">
                    <FallbackImage
                      src={getHeroImageUrl(h.hero_name, heroAssets)}
                      fallbackText={h.hero_name}
                      alt={h.hero_name}
                      className="h-full w-full object-cover"
                      containerClassName="h-full w-full text-[6px]"
                    />
                  </div>
                  <span className="text-[9px] text-slate-400 truncate w-full text-center">
                    {h.hero_name}
                  </span>
                </button>
              ))}
              {filteredHeroes.length === 0 && (
                <div className="col-span-full py-6 text-center text-xs text-slate-500">
                  No heroes found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ BOARD COLUMN ═══ */
function BoardColumn({
  side,
  draft,
  heroAssets,
  usedHeroes,
  heroes,
  setSlot,
  clearSlot,
  openPicker,
  searchQuery,
  setSearchQuery,
  filteredHeroes,
}: {
  side: "BLUE" | "RED";
  draft: DraftPlan;
  heroAssets: Record<string, string>;
  usedHeroes: Set<string>;
  heroes: HeroStats[];
  setSlot: (
    type: "ban" | "pick" | "role",
    side: "BLUE" | "RED",
    value: string,
    index?: number,
    lane?: Lane,
    field?: "main" | "backup"
  ) => void;
  clearSlot: (
    type: "ban" | "pick" | "role",
    side: "BLUE" | "RED",
    index?: number,
    lane?: Lane,
    field?: "main" | "backup"
  ) => void;
  openPicker: (target: PickerTarget) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filteredHeroes: HeroStats[];
}) {
  const isBlue = side === "BLUE";
  const bans = isBlue ? draft.blueBans : draft.redBans;
  const picks = isBlue ? draft.bluePicks : draft.redPicks;
  const roles = isBlue ? draft.blueRoles : draft.redRoles;

  const accentBorder = isBlue
    ? "border-blue-500/15"
    : "border-rose-500/15";
  const accentBg = isBlue ? "bg-blue-950/15" : "bg-rose-950/15";
  const accentText = isBlue ? "text-blue-300" : "text-rose-300";
  const accentDot = isBlue ? "bg-blue-400" : "bg-rose-400";
  const slotBorder = isBlue
    ? "border-blue-500/12 hover:border-blue-500/30"
    : "border-rose-500/12 hover:border-rose-500/30";

  return (
    <div
      className={`flex flex-col rounded-xl border ${accentBorder} ${accentBg} overflow-hidden`}
    >
      {/* Column Header */}
      <div className="flex items-center gap-2 border-b border-white/[0.04] px-4 py-2.5">
        <div
          className={`h-2 w-2 rounded-full ${accentDot}`}
        />
        <span
          className={`font-mono text-[10px] font-bold uppercase tracking-[0.2em] ${accentText}`}
        >
          {side === "BLUE" ? "Blue Side" : "Red Side"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Bans Row */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Ban className="h-3 w-3 text-rose-400/60" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
              Bans
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {bans.map((h, i) => (
              <BoardSlot
                key={i}
                hero={h}
                heroAssets={heroAssets}
                accent={slotBorder}
                onClick={() =>
                  openPicker({ type: "ban", side, index: i })
                }
                onClear={() => clearSlot("ban", side, i)}
              />
            ))}
          </div>
        </div>

        {/* Picks Row */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Swords className="h-3 w-3 text-cyan-400/60" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
              Picks
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {picks.map((h, i) => (
              <BoardSlot
                key={i}
                hero={h}
                heroAssets={heroAssets}
                accent={slotBorder}
                onClick={() =>
                  openPicker({ type: "pick", side, index: i })
                }
                onClear={() => clearSlot("pick", side, i)}
              />
            ))}
          </div>
        </div>

        {/* Role Lanes */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Target className="h-3 w-3 text-amber-400/60" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
              Role Lanes
            </span>
          </div>
          <div className="space-y-1.5">
            {LANES.map((lane) => {
              const main = roles[lane].main;
              const backup = roles[lane].backup;
              return (
                <div
                  key={lane}
                  className="grid grid-cols-[48px_1fr_1fr] gap-1.5 items-center"
                >
                  <span className="text-[9px] font-bold text-slate-500 uppercase text-right pr-1">
                    {lane}
                  </span>
                  <button
                    onClick={() =>
                      openPicker({ type: "role", side, lane, field: "main" })
                    }
                    className={`flex items-center gap-1.5 rounded-lg border ${slotBorder} bg-white/[0.02] px-2 py-1.5 text-left transition cursor-pointer min-h-[30px]`}
                  >
                    {main ? (
                      <>
                        <div className="h-5 w-5 overflow-hidden rounded border border-white/10 bg-[#060d1a]">
                          <FallbackImage
                            src={getHeroImageUrl(main, heroAssets)}
                            fallbackText={main}
                            alt={main}
                            className="h-full w-full object-cover"
                            containerClassName="h-full w-full text-[4px]"
                          />
                        </div>
                        <span className="text-[10px] font-bold text-white truncate">
                          {main}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            clearSlot("role", side, undefined, lane, "main");
                          }}
                          className="ml-auto p-0.5 text-slate-600 hover:text-rose-400 cursor-pointer"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </>
                    ) : (
                      <span className="text-[9px] text-slate-600">+ main</span>
                    )}
                  </button>
                  <button
                    onClick={() =>
                      openPicker({
                        type: "role",
                        side,
                        lane,
                        field: "backup",
                      })
                    }
                    className="flex items-center gap-1.5 rounded-lg border border-white/[0.04] bg-white/[0.01] px-2 py-1.5 text-left transition cursor-pointer min-h-[30px] hover:border-white/[0.1]"
                  >
                    {backup ? (
                      <>
                        <div className="h-5 w-5 overflow-hidden rounded border border-white/10 bg-[#060d1a]">
                          <FallbackImage
                            src={getHeroImageUrl(backup, heroAssets)}
                            fallbackText={backup}
                            alt={backup}
                            className="h-full w-full object-cover"
                            containerClassName="h-full w-full text-[4px]"
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 truncate">
                          {backup}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            clearSlot(
                              "role",
                              side,
                              undefined,
                              lane,
                              "backup"
                            );
                          }}
                          className="ml-auto p-0.5 text-slate-600 hover:text-rose-400 cursor-pointer"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
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
    </div>
  );
}

/* ═══ BOARD SLOT ═══ */
function BoardSlot({
  hero,
  heroAssets,
  accent,
  onClick,
  onClear,
}: {
  hero: string;
  heroAssets: Record<string, string>;
  accent: string;
  onClick: () => void;
  onClear: () => void;
}) {
  const empty = !hero;
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center rounded-lg border ${
        empty
          ? "border-dashed border-white/[0.06] bg-white/[0.01]"
          : accent + " bg-white/[0.03]"
      } p-1.5 transition cursor-pointer min-h-[50px]`}
    >
      {hero ? (
        <>
          <div className="h-8 w-8 overflow-hidden rounded-md border border-white/10 bg-[#060d1a]">
            <FallbackImage
              src={getHeroImageUrl(hero, heroAssets)}
              fallbackText={hero}
              alt={hero}
              className="h-full w-full object-cover"
              containerClassName="h-full w-full text-[5px]"
            />
          </div>
          <span className="mt-0.5 text-[8px] text-slate-400 truncate w-full text-center">
            {hero}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#0a1020] border border-white/10 flex items-center justify-center text-slate-500 hover:text-rose-400 hover:border-rose-500/30 transition cursor-pointer"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </>
      ) : (
        <span className="text-[16px] text-slate-700">+</span>
      )}
    </button>
  );
}
