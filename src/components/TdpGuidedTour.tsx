import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

const TOUR_STORAGE_KEY = "tdp_guided_tour_completed";

export interface TourStep {
  target: string;
  title: string;
  text: string;
  placement?: "top" | "bottom" | "left" | "right";
}

export const TOUR_STEPS: TourStep[] = [
  { target: "tour-sidebar", title: "Sidebar", text: "Semua draft kamu ada di sini. Tournament seperti folder, Draft adalah rencana di dalamnya.", placement: "right" },
  { target: "tour-new-tournament", title: "Tambah Tournament", text: "Klik ini untuk membuat folder draft baru.", placement: "right" },
  { target: "tour-add-draft", title: "Tambah Draft", text: "Klik ini untuk menambah draft plan.", placement: "right" },
  { target: "tour-draft-header", title: "Draft Header", text: "Di sini kamu melihat draft yang sedang dibuka.", placement: "bottom" },
  { target: "tour-side-toggle", title: "Side Toggle", text: "Pilih sisi tim kamu. Badge OURS akan pindah ke Blue atau Red.", placement: "bottom" },
  { target: "tour-ban-slots", title: "Ban Slots", text: "Isi 5 ban untuk target hero lawan.", placement: "bottom" },
  { target: "tour-pick-slots", title: "Pick Slots", text: "Isi 5 pick untuk hero utama draft.", placement: "bottom" },
  { target: "tour-role-lanes", title: "Role Lanes", text: "Role lane membantu membagi hero ke EXP, Jungle, Mid, Gold, dan Roam.", placement: "bottom" },
  { target: "tour-backup-slots", title: "Backup Hero", text: "Setiap lane punya 6 cadangan kalau hero utama diban atau diambil lawan.", placement: "bottom" },
  { target: "tour-coach-notes", title: "Coach Notes", text: "Tulis win condition, target ban, matchup, atau rotasi awal.", placement: "top" },
  { target: "tour-save-btn", title: "Save / Export", text: "Klik Save untuk download gambar draft.", placement: "left" },
];

interface TdpGuidedTourProps {
  onComplete: () => void;
  onSkip: () => void;
  initialStep?: number;
}

function findTarget(target: string): HTMLElement | null {
  return document.querySelector(`[data-tour-target="${target}"]`) as HTMLElement | null;
}

export function isGuidedTourCompleted(): boolean {
  try { return localStorage.getItem(TOUR_STORAGE_KEY) === "true"; } catch { return false; }
}

export function markGuidedTourCompleted() {
  try { localStorage.setItem(TOUR_STORAGE_KEY, "true"); } catch {}
}

export default function TdpGuidedTour({ onComplete, onSkip, initialStep = 0 }: TdpGuidedTourProps) {
  const [step, setStep] = useState(initialStep);
  const [marker, setMarker] = useState<{ top: number; left: number } | null>(null);
  const [tip, setTip] = useState<{ top: number; left: number; w: number; placement: string } | null>(null);
  const [ready, setReady] = useState(false);

  const stepRef = useRef(step);
  stepRef.current = step;
  const didScrollRef = useRef(false);

  const measure = useCallback(() => {
    const s = stepRef.current;
    const cfg = TOUR_STEPS[s];
    if (!cfg) return;
    const el = findTarget(cfg.target);
    if (!el) { setMarker(null); setTip(null); setReady(true); return; }

    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    setMarker({ top: cy, left: cx });

    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const tipW = Math.min(280, vpW - 40);
    const tipH = 120;
    const gap = 16;
    const edgePad = 12;
    const placement = cfg.placement || "bottom";

    let ttop = 0, tleft = 0;
    switch (placement) {
      case "bottom": ttop = rect.bottom + gap; tleft = cx - tipW / 2; break;
      case "top": ttop = rect.top - gap - tipH; tleft = cx - tipW / 2; break;
      case "right": ttop = cy - tipH / 2; tleft = rect.right + gap; break;
      case "left": ttop = cy - tipH / 2; tleft = rect.left - gap - tipW; break;
    }
    tleft = Math.max(edgePad, Math.min(tleft, vpW - tipW - edgePad));
    ttop = Math.max(edgePad, Math.min(ttop, vpH - tipH - edgePad));

    setTip({ top: ttop, left: tleft, w: tipW, placement });
    setReady(true);
  }, []);

  const scrollToAndMeasure = useCallback(() => {
    const s = stepRef.current;
    const cfg = TOUR_STEPS[s];
    if (!cfg) return;
    const el = findTarget(cfg.target);
    if (!el) { setMarker(null); setTip(null); setReady(true); return; }

    didScrollRef.current = true;
    el.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
    requestAnimationFrame(() => { didScrollRef.current = false; measure(); });
  }, [measure]);

  useEffect(() => {
    setReady(false);
    setMarker(null);
    setTip(null);
    const raf = requestAnimationFrame(() => scrollToAndMeasure());
    return () => cancelAnimationFrame(raf);
  }, [step, scrollToAndMeasure]);

  useEffect(() => {
    const onScroll = () => { if (!didScrollRef.current) measure(); };
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
    };
  }, [measure]);

  const next = () => {
    if (stepRef.current >= TOUR_STEPS.length - 1) { markGuidedTourCompleted(); onComplete(); }
    else setStep((s) => s + 1);
  };
  const prev = () => { if (stepRef.current > 0) setStep((s) => s - 1); };

  const currentStep = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[10000]" style={{ pointerEvents: "auto" }}>
      <div className="absolute inset-0 bg-black/30" onClick={onSkip} />

      {/* Subtle highlight ring around target */}
      {marker && (
        <>
          <div
            className="absolute w-12 h-12 -ml-6 -mt-6 rounded-full border-2 border-cyan-400/70 pointer-events-none"
            style={{ top: marker.top, left: marker.left }}
          />
          <div
            className="absolute w-12 h-12 -ml-6 -mt-6 rounded-full bg-cyan-400/10 pointer-events-none"
            style={{ top: marker.top, left: marker.left }}
          />
          {/* Pulse ring */}
          <div
            className="absolute w-12 h-12 -ml-6 -mt-6 rounded-full border border-cyan-400/30 animate-ping pointer-events-none"
            style={{ top: marker.top, left: marker.left }}
          />
        </>
      )}

      {/* Tooltip */}
      {tip && ready && currentStep && (
        <div className="absolute z-[10001]" style={{ top: tip.top, left: tip.left, width: tip.w }}>
          <div className="rounded-xl border border-white/15 bg-[#0e1525] shadow-2xl overflow-hidden">
            <div className="px-4 pt-3 pb-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-[9px] font-black text-cyan-300">
                    {step + 1}
                  </span>
                  <span className="text-[9px] font-mono text-cyan-400/60 uppercase tracking-wider">
                    of {TOUR_STEPS.length}
                  </span>
                </div>
                <button onClick={onSkip} className="text-slate-600 hover:text-white cursor-pointer"><X className="h-3.5 w-3.5" /></button>
              </div>
              <h3 className="text-[13px] font-black text-white font-display mb-0.5">{currentStep.title}</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">{currentStep.text}</p>
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2">
              <button onClick={prev} disabled={step === 0} className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-white transition cursor-pointer disabled:opacity-30">
                <ChevronLeft className="h-3.5 w-3.5" /> Kembali
              </button>
              <div className="flex items-center gap-2">
                <button onClick={onSkip} className="text-[10px] font-bold text-slate-600 hover:text-slate-400 transition cursor-pointer">Lewati</button>
                <button onClick={next} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/30 transition cursor-pointer">
                  {isLast ? "Selesai" : "Selanjutnya"}
                  {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!ready && (
        <div className="absolute inset-0 z-[10001] flex items-center justify-center pointer-events-none">
          <div className="rounded-xl border border-white/10 bg-[#0e1525] shadow-2xl p-4 text-center pointer-events-auto">
            <p className="text-xs text-slate-400">Memuat...</p>
          </div>
        </div>
      )}
    </div>
  );
}
