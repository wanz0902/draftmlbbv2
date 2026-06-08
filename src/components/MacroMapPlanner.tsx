import React, { useCallback, useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import {
  ArrowUpRight, Download, Eye, EyeOff, Layers, Map, Pencil,
  RotateCcw, Target, Trash2, Undo2, Copy,
} from "lucide-react";

type Phase = "early" | "mid" | "late";
type Tool = "move" | "draw" | "arrow" | "lasso" | "lasso-eraser" | "eraser" | "coords";

interface Point { x: number; y: number; }
interface Drawing { id: string; points: Point[]; color: string; }
interface ArrowObj { id: string; start: Point; end: Point; color: string; }
interface Zone { id: string; points: Point[]; color: string; fill: string; }

interface PhaseData { drawings: Drawing[]; arrows: ArrowObj[]; zones: Zone[]; notes: string; }

interface MacroPlan {
  version: number;
  activePhase: Phase;
  phases: Record<Phase, PhaseData>;
  settings: {
    showTrail: boolean;
    layers: { brokenWalls: boolean; dangerousGrass: boolean; flyingCloud: boolean; objectives: boolean };
  };
}

const STORAGE_KEY = "macro_map_planner_v1";
const COLORS = { ally: "#38bdf8", enemy: "#f43f5e" };
const PHASES: Phase[] = ["early", "mid", "late"];
const PHASE_LABELS: Record<Phase, string> = { early: "Early Game", mid: "Mid Game", late: "Late Game" };
const ROLE_ROWS = ["Roam", "Mid", "Jungle", "Exp", "Gold"] as const;

function defaultPhaseData(): PhaseData { return { drawings: [], arrows: [], zones: [], notes: "" }; }
function defaultPlan(): MacroPlan {
  return {
    version: 1, activePhase: "early",
    phases: { early: defaultPhaseData(), mid: defaultPhaseData(), late: defaultPhaseData() },
    settings: { showTrail: true, layers: { brokenWalls: false, dangerousGrass: false, flyingCloud: false, objectives: false } },
  };
}
function loadPlan(): MacroPlan {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p.version === 1) {
        if (!p.settings) p.settings = {};
        if (!p.settings.layers) p.settings.layers = { brokenWalls: false, dangerousGrass: false, flyingCloud: false, objectives: false };
        if (p.settings.showHpBar !== undefined) delete p.settings.showHpBar;
        if (p.phases) {
          for (const ph of PHASES) {
            if (p.phases[ph] && !p.phases[ph].drawings) p.phases[ph].drawings = [];
            if (p.phases[ph] && !p.phases[ph].arrows) p.phases[ph].arrows = [];
            if (p.phases[ph] && !p.phases[ph].zones) p.phases[ph].zones = [];
            if (p.phases[ph] && p.phases[ph].markers) delete p.phases[ph].markers;
            if (p.phases[ph] && p.phases[ph].notes === undefined) p.phases[ph].notes = "";
          }
        }
        return p as MacroPlan;
      }
    }
  } catch {}
  return defaultPlan();
}
function savePlan(plan: MacroPlan) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(plan)); } catch {} }

export default function MacroMapPlanner() {
  const [plan, setPlan] = useState<MacroPlan>(loadPlan);
  const [tool, setTool] = useState<Tool>("move");
  const [drawing, setDrawing] = useState<Point[]>([]);
  const [arrowStart, setArrowStart] = useState<Point | null>(null);
  const [coordPopup, setCoordPopup] = useState<{ px: Point } | null>(null);
  const [undoStacks, setUndoStacks] = useState<Record<Phase, MacroPlan[]>>({ early: [], mid: [], late: [] });
  const [toolColor, setToolColor] = useState(COLORS.ally);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);

  const phase = plan.activePhase;
  const phaseData = plan.phases[phase];

  const pushUndo = useCallback(() => {
    setUndoStacks((prev) => ({
      ...prev,
      [phase]: [...prev[phase].slice(-99), JSON.parse(JSON.stringify(plan))],
    }));
  }, [phase, plan]);

  const updatePhase = useCallback((updater: (d: PhaseData) => PhaseData) => {
    pushUndo();
    setPlan((prev) => ({ ...prev, phases: { ...prev.phases, [phase]: updater(prev.phases[phase]) } }));
  }, [phase, pushUndo]);

  const undo = useCallback(() => {
    setUndoStacks((prev) => {
      const stack = prev[phase];
      if (!stack || stack.length === 0) return prev;
      const last = stack[stack.length - 1];
      setPlan(last);
      return { ...prev, [phase]: stack.slice(0, -1) };
    });
  }, [phase]);

  const getSvgPoint = useCallback((e: React.MouseEvent | MouseEvent): Point | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)) };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pt = getSvgPoint(e);
    if (!pt) return;
    if (tool === "draw" || tool === "lasso") { isDrawing.current = true; setDrawing([pt]); }
    else if (tool === "arrow") { setArrowStart(pt); isDrawing.current = true; }
    else if (tool === "coords") { setCoordPopup({ px: pt }); }
    else if (tool === "lasso-eraser") {
      const hit = phaseData.zones.find((z) => pointInPolygon(pt, z.points));
      if (hit) updatePhase((d) => ({ ...d, zones: d.zones.filter((z) => z.id !== hit.id) }));
    } else if (tool === "eraser") {
      const drawHit = phaseData.drawings.find((d) => nearestDist(pt, d.points) < 0.02);
      if (drawHit) { updatePhase((d) => ({ ...d, drawings: d.drawings.filter((x) => x.id !== drawHit.id) })); return; }
      const arrowHit = phaseData.arrows.find((a) => distToSegment(pt, a.start, a.end) < 0.02);
      if (arrowHit) { updatePhase((d) => ({ ...d, arrows: d.arrows.filter((x) => x.id !== arrowHit.id) })); }
    }
  }, [tool, getSvgPoint, phaseData, updatePhase]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing.current) return;
    const pt = getSvgPoint(e);
    if (!pt) return;
    if (tool === "draw" || tool === "lasso") setDrawing((p) => [...p, pt]);
    else if (tool === "arrow") setDrawing([pt]);
  }, [tool, getSvgPoint]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    if (tool === "draw" && drawing.length > 1) {
      updatePhase((d) => ({ ...d, drawings: [...d.drawings, { id: `d_${Date.now()}`, points: drawing, color: toolColor }] }));
      setDrawing([]);
    } else if (tool === "lasso" && drawing.length > 2) {
      updatePhase((d) => ({ ...d, zones: [...d.zones, { id: `z_${Date.now()}`, points: drawing, color: toolColor, fill: toolColor === COLORS.ally ? "rgba(56,189,248,0.12)" : "rgba(244,63,94,0.12)" }] }));
      setDrawing([]);
    } else if (tool === "arrow" && arrowStart && drawing.length === 1) {
      updatePhase((d) => ({ ...d, arrows: [...d.arrows, { id: `a_${Date.now()}`, start: arrowStart, end: drawing[0], color: toolColor }] }));
      setArrowStart(null); setDrawing([]);
    }
  }, [tool, drawing, arrowStart, toolColor, updatePhase]);

  const clearPhase = useCallback(() => {
    if (phaseData.drawings.length + phaseData.arrows.length + phaseData.zones.length === 0) return;
    pushUndo();
    setPlan((prev) => ({ ...prev, phases: { ...prev.phases, [phase]: defaultPhaseData() } }));
  }, [phaseData, phase, pushUndo]);

  const exportPng = async () => {
    if (!exportRef.current) return;
    try {
      const url = await toPng(exportRef.current, { backgroundColor: "#0a0f1c", pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `macro-plan-${phase}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = url; link.click();
    } catch (err) { console.error("Export failed:", err); }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `macro-plan-${new Date().toISOString().slice(0, 10)}.json`;
    link.href = url; link.click(); URL.revokeObjectURL(url);
  };

  const toggleLayer = (layer: keyof MacroPlan["settings"]["layers"]) => {
    setPlan((prev) => ({
      ...prev,
      settings: { ...prev.settings, layers: { ...prev.settings.layers, [layer]: !prev.settings.layers[layer] } },
    }));
  };

  useEffect(() => { savePlan(plan); }, [plan]);

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-[#0a0f1c]">
      {/* Left tool rail */}
      <div className="w-[52px] shrink-0 flex flex-col items-center py-2 gap-1 border-r border-white/[0.06] bg-[#070c18]">
        {([
          { id: "move" as Tool, icon: "⊕", label: "Move" },
          { id: "draw" as Tool, icon: "✎", label: "Draw" },
          { id: "arrow" as Tool, icon: "→", label: "Arrow" },
          { id: "lasso" as Tool, icon: "◎", label: "Lasso" },
          { id: "lasso-eraser" as Tool, icon: "⊘", label: "Zone Eraser" },
          { id: "eraser" as Tool, icon: "✕", label: "Eraser" },
          { id: "coords" as Tool, icon: "⊙", label: "Coordinates" },
        ]).map((t) => (
          <button key={t.id} onClick={() => setTool(t.id)} title={t.label}
            className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm transition cursor-pointer ${tool === t.id ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-500 hover:text-white hover:bg-white/[0.05]"}`}
          >{t.icon}</button>
        ))}
        <div className="w-6 h-px bg-white/[0.06] my-1" />
        <button onClick={undo} title="Undo" className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.05] transition cursor-pointer"><Undo2 className="h-4 w-4" /></button>
        <button onClick={clearPhase} title="Clear Phase" className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"><RotateCcw className="h-4 w-4" /></button>
        <div className="w-6 h-px bg-white/[0.06] my-1" />
        <div className="flex flex-col gap-1">
          <button onClick={() => setToolColor(COLORS.ally)} className={`w-6 h-6 rounded-full border-2 ${toolColor === COLORS.ally ? "border-white" : "border-transparent"} bg-cyan-400 transition cursor-pointer`} title="Ally" />
          <button onClick={() => setToolColor(COLORS.enemy)} className={`w-6 h-6 rounded-full border-2 ${toolColor === COLORS.enemy ? "border-white" : "border-transparent"} bg-rose-400 transition cursor-pointer`} title="Enemy" />
        </div>
      </div>

      {/* Center */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-white/[0.06] bg-[#080e1a]/80 shrink-0">
          <Map className="h-4 w-4 text-cyan-400" />
          <span className="text-xs font-bold text-white font-display">Macro Map Planner</span>
          <div className="flex-1" />
          {/* Layer toggles */}
          <div className="flex gap-1">
            {([
              { key: "brokenWalls" as const, label: "Walls", icon: "🧱" },
              { key: "dangerousGrass" as const, label: "Grass", icon: "🌿" },
              { key: "flyingCloud" as const, label: "Cloud", icon: "☁" },
              { key: "objectives" as const, label: "Objectives", icon: "⚔" },
            ]).map((l) => (
              <button key={l.key} onClick={() => toggleLayer(l.key)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-bold transition cursor-pointer ${plan.settings.layers[l.key] ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/20" : "text-slate-600 border border-transparent hover:text-slate-400"}`}
              >{l.icon} {l.label}</button>
            ))}
          </div>
          <div className="w-px h-4 bg-white/[0.06]" />
          {/* Phase tabs */}
          <div className="flex gap-1 bg-white/[0.03] rounded-lg p-0.5">
            {PHASES.map((p) => (
              <button key={p} onClick={() => setPlan((prev) => ({ ...prev, activePhase: p }))}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${phase === p ? (p === "early" ? "bg-emerald-500/20 text-emerald-300" : p === "mid" ? "bg-amber-500/20 text-amber-300" : "bg-rose-500/20 text-rose-300") : "text-slate-500 hover:text-slate-300"}`}
              >{PHASE_LABELS[p]}</button>
            ))}
          </div>
          <button onClick={() => setPlan((prev) => ({ ...prev, settings: { ...prev.settings, showTrail: !prev.settings.showTrail } }))}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.06] text-[10px] font-bold text-slate-400 hover:text-white transition cursor-pointer"
          >{plan.settings.showTrail ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />} Trail</button>
          <div className="relative">
            <button onClick={() => setShowExportMenu(!showExportMenu)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[10px] font-bold text-amber-300 hover:bg-amber-500/25 transition cursor-pointer"><Download className="h-3 w-3" /> Export</button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 w-40 rounded-xl border border-white/10 bg-[#0e1525] shadow-2xl z-50 p-1">
                <button onClick={() => { exportPng(); setShowExportMenu(false); }} className="w-full text-left px-3 py-2 rounded-lg text-[11px] text-slate-300 hover:bg-white/[0.05] transition cursor-pointer">Export PNG</button>
                <button onClick={() => { exportJson(); setShowExportMenu(false); }} className="w-full text-left px-3 py-2 rounded-lg text-[11px] text-slate-300 hover:bg-white/[0.05] transition cursor-pointer">Export JSON</button>
              </div>
            )}
          </div>
        </div>

        {/* Map */}
        <div ref={exportRef} className="flex-1 relative overflow-hidden">
          <svg ref={svgRef} className="w-full h-full" style={{ cursor: tool === "move" ? "grab" : tool === "coords" ? "crosshair" : "crosshair" }}
            onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            <defs>
              <pattern id="grid" width="5%" height="5%" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
              </pattern>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
              </marker>
            </defs>
            <rect width="100%" height="100%" fill="#080e1a" />
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Map image */}
            <image href="/macro-map/mlbb-map.webp" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" opacity={mapLoaded ? 1 : 0} onLoad={() => setMapLoaded(true)} />
            {!mapLoaded && (
              <>
                <text x="50%" y="44%" textAnchor="middle" className="fill-slate-700" style={{ fontSize: "14px", fontFamily: "monospace" }}>MLBB Map Area</text>
                <text x="50%" y="52%" textAnchor="middle" className="fill-slate-800" style={{ fontSize: "11px", fontFamily: "monospace" }}>Map image belum tersedia. Tambahkan file ke public/macro-map/mlbb-map.webp</text>
              </>
            )}

            {/* Layer overlays */}
            {plan.settings.layers.objectives && (
              <>
                <circle cx="50%" cy="30%" r="1.5%" fill="rgba(251,191,36,0.3)" stroke="#fbbf24" strokeWidth="1" strokeDasharray="4 2" />
                <text x="50%" y="30%" textAnchor="middle" dy="-2%" className="fill-yellow-400" style={{ fontSize: "8px" }}>Turtle</text>
                <circle cx="50%" cy="65%" r="1.5%" fill="rgba(251,191,36,0.3)" stroke="#fbbf24" strokeWidth="1" strokeDasharray="4 2" />
                <text x="50%" y="65%" textAnchor="middle" dy="-2%" className="fill-yellow-400" style={{ fontSize: "8px" }}>Lord</text>
              </>
            )}
            {plan.settings.layers.brokenWalls && (
              <>
                <line x1="30%" y1="45%" x2="35%" y2="45%" stroke="rgba(234,179,8,0.4)" strokeWidth="3" strokeDasharray="2 2" />
                <line x1="65%" y1="55%" x2="70%" y2="55%" stroke="rgba(234,179,8,0.4)" strokeWidth="3" strokeDasharray="2 2" />
              </>
            )}
            {plan.settings.layers.dangerousGrass && (
              <>
                <rect x="20%" y="35%" width="8%" height="6%" rx="4" fill="rgba(34,197,94,0.1)" stroke="#22c55e" strokeWidth="0.5" strokeDasharray="3 2" />
                <rect x="70%" y="60%" width="8%" height="6%" rx="4" fill="rgba(34,197,94,0.1)" stroke="#22c55e" strokeWidth="0.5" strokeDasharray="3 2" />
              </>
            )}
            {plan.settings.layers.flyingCloud && (
              <text x="50%" y="50%" textAnchor="middle" className="fill-sky-400/30" style={{ fontSize: "24px" }}>☁</text>
            )}

            {/* Zones */}
            {plan.settings.showTrail && phaseData.zones.map((z) => (
              <polygon key={z.id} points={z.points.map((p) => `${p.x * 100}% ${p.y * 100}%`).join(", ")} fill={z.fill} stroke={z.color} strokeWidth="1.5" strokeOpacity="0.5" className="pointer-events-none" />
            ))}
            {/* Drawings */}
            {plan.settings.showTrail && phaseData.drawings.map((d) => (
              <polyline key={d.id} points={d.points.map((p) => `${p.x * 100}%,${p.y * 100}%`).join(" ")} fill="none" stroke={d.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none" />
            ))}
            {/* Arrows */}
            {plan.settings.showTrail && phaseData.arrows.map((a) => (
              <line key={a.id} x1={`${a.start.x * 100}%`} y1={`${a.start.y * 100}%`} x2={`${a.end.x * 100}%`} y2={`${a.end.y * 100}%`} stroke={a.color} strokeWidth="2.5" markerEnd="url(#arrowhead)" style={{ color: a.color }} className="pointer-events-none" />
            ))}
            {/* Active drawing */}
            {drawing.length > 0 && (tool === "draw" || tool === "lasso") && (
              <polyline points={drawing.map((p) => `${p.x * 100}%,${p.y * 100}%`).join(" ")} fill={tool === "lasso" ? (toolColor === COLORS.ally ? "rgba(56,189,248,0.08)" : "rgba(244,63,94,0.08)") : "none"} stroke={toolColor} strokeWidth="2" strokeLinecap="round" strokeDasharray={tool === "lasso" ? "6 3" : "none"} className="pointer-events-none" />
            )}
            {arrowStart && drawing.length === 1 && (
              <line x1={`${arrowStart.x * 100}%`} y1={`${arrowStart.y * 100}%`} x2={`${drawing[0].x * 100}%`} y2={`${drawing[0].y * 100}%`} stroke={toolColor} strokeWidth="2" strokeDasharray="4 4" className="pointer-events-none" />
            )}
            {/* Coord popup */}
            {coordPopup && (
              <g>
                <circle cx={`${coordPopup.px.x * 100}%`} cy={`${coordPopup.px.y * 100}%`} r="4" fill="#22d3ee" stroke="#0e1525" strokeWidth="2" />
                <rect x={`${coordPopup.px.x * 100 + 1.5}%`} y={`${coordPopup.px.y * 100 - 6}%`} width="14%" height="10%" rx="4" fill="#0e1525" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                <text x={`${coordPopup.px.x * 100 + 2.5}%`} y={`${coordPopup.px.y * 100 - 1}%`} className="fill-cyan-300" style={{ fontSize: "10px", fontFamily: "monospace" }}>
                  {Math.round(coordPopup.px.x * 1000) / 10}%, {Math.round(coordPopup.px.y * 1000) / 10}%
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* Notes */}
        <div className="px-4 py-2 border-t border-white/[0.06] bg-[#080e1a]/80 shrink-0">
          <input value={phaseData.notes} onChange={(e) => updatePhase((d) => ({ ...d, notes: e.target.value }))} placeholder={`${PHASE_LABELS[phase]} strategy notes...`} className="w-full bg-transparent text-[11px] text-slate-400 outline-none placeholder:text-slate-600" />
        </div>
      </div>

      {/* Right panel */}
      <div className="w-[220px] shrink-0 flex flex-col border-l border-white/[0.06] bg-[#070c18] overflow-y-auto">
        <div className="px-3 py-2.5 border-b border-white/[0.04]">
          <div className="flex items-center gap-1.5 mb-2"><div className="h-1.5 w-1.5 rounded-full bg-cyan-400" /><span className="text-[9px] font-bold text-cyan-300 uppercase tracking-wider">Allies</span></div>
          <div className="space-y-1.5">
            {ROLE_ROWS.map((r) => (
              <div key={r} className="flex items-center gap-1.5 rounded-lg border border-cyan-500/10 bg-cyan-500/[0.03] px-2 py-1.5">
                <span className="text-[9px] font-bold text-cyan-400/70 w-10">{r}</span>
                <div className="flex-1 h-5 rounded bg-white/[0.03] border border-white/[0.04] flex items-center px-1.5"><span className="text-[8px] text-slate-600">Hero</span></div>
              </div>
            ))}
          </div>
        </div>
        <div className="px-3 py-2.5 border-b border-white/[0.04]">
          <div className="flex items-center gap-1.5 mb-2"><div className="h-1.5 w-1.5 rounded-full bg-rose-400" /><span className="text-[9px] font-bold text-rose-300 uppercase tracking-wider">Enemies</span></div>
          <div className="space-y-1.5">
            {ROLE_ROWS.map((r) => (
              <div key={r} className="flex items-center gap-1.5 rounded-lg border border-rose-500/10 bg-rose-500/[0.03] px-2 py-1.5">
                <span className="text-[9px] font-bold text-rose-400/70 w-10">{r}</span>
                <div className="flex-1 h-5 rounded bg-white/[0.03] border border-white/[0.04] flex items-center px-1.5"><span className="text-[8px] text-slate-600">Hero</span></div>
              </div>
            ))}
          </div>
        </div>
        <div className="px-3 py-2.5 space-y-1.5">
          {PHASES.map((p) => (
            <button key={p} onClick={() => { pushUndo(); setPlan((prev) => ({ ...prev, phases: { ...prev.phases, [p]: defaultPhaseData() } })); }}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] py-1.5 text-[9px] font-bold text-slate-500 hover:text-white hover:border-white/[0.12] transition cursor-pointer"
            ><RotateCcw className="h-2.5 w-2.5" /> Reset {PHASE_LABELS[p]}</button>
          ))}
        </div>
        {coordPopup && (
          <div className="px-3 py-2.5 border-t border-white/[0.04]">
            <span className="text-[9px] font-bold text-cyan-400/60 uppercase tracking-wider">Coordinates</span>
            <div className="mt-1 text-[10px] font-mono text-slate-400">
              X: {Math.round(coordPopup.px.x * 1000) / 10}% Y: {Math.round(coordPopup.px.y * 1000) / 10}%
            </div>
            <button onClick={() => navigator.clipboard?.writeText(`{ x: ${coordPopup.px.x.toFixed(4)}, y: ${coordPopup.px.y.toFixed(4)} }`)} className="mt-1 flex items-center gap-1 text-[9px] text-cyan-400/60 hover:text-cyan-300 cursor-pointer">
              <Copy className="h-2.5 w-2.5" /> Copy JSON
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function dist(a: Point, b: Point): number { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2); }
function distToSegment(p: Point, a: Point, b: Point): number {
  const len2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (len2 === 0) return dist(p, a);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / len2;
  t = Math.max(0, Math.min(1, t));
  return dist(p, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
}
function nearestDist(p: Point, points: Point[]): number { return Math.min(...points.map((q) => dist(p, q))); }
function pointInPolygon(p: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    if ((poly[i].y > p.y) !== (poly[j].y > p.y) && p.x < ((poly[j].x - poly[i].x) * (p.y - poly[i].y)) / (poly[j].y - poly[i].y) + poly[i].x) inside = !inside;
  }
  return inside;
}
