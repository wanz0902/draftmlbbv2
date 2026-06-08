import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

const TOUR_STORAGE_KEY = "tdp_guided_tour_completed";

export interface TourStep {
  target: string;
  title: string;
  text: string;
  placement?: "top" | "bottom" | "left" | "right";
  padding?: number;
}

export const TOUR_STEPS: TourStep[] = [
  { target: "tour-sidebar", title: "Sidebar", text: "Semua draft kamu ada di sini. Tournament seperti folder, Draft adalah rencana di dalamnya.", placement: "right", padding: 8 },
  { target: "tour-new-tournament", title: "Tambah Tournament", text: "Klik ini untuk membuat folder draft baru.", placement: "right", padding: 6 },
  { target: "tour-add-draft", title: "Tambah Draft", text: "Klik ini untuk menambah draft plan.", placement: "right", padding: 6 },
  { target: "tour-draft-header", title: "Draft Header", text: "Di sini kamu melihat draft yang sedang dibuka.", placement: "bottom", padding: 8 },
  { target: "tour-side-toggle", title: "Side Toggle", text: "Pilih sisi tim kamu. Badge OURS akan pindah ke Blue atau Red.", placement: "bottom", padding: 6 },
  { target: "tour-ban-slots", title: "Ban Slots", text: "Isi 5 ban untuk target hero lawan.", placement: "bottom", padding: 6 },
  { target: "tour-pick-slots", title: "Pick Slots", text: "Isi 5 pick untuk hero utama draft.", placement: "bottom", padding: 6 },
  { target: "tour-role-lanes", title: "Role Lanes", text: "Role lane membantu membagi hero ke EXP, Jungle, Mid, Gold, dan Roam.", placement: "bottom", padding: 6 },
  { target: "tour-backup-slots", title: "Backup Hero", text: "Setiap lane punya 6 cadangan kalau hero utama diban atau diambil lawan.", placement: "bottom", padding: 6 },
  { target: "tour-coach-notes", title: "Coach Notes", text: "Tulis win condition, target ban, matchup, atau rotasi awal.", placement: "top", padding: 8 },
  { target: "tour-save-btn", title: "Save / Export", text: "Klik Save untuk download gambar draft.", placement: "left", padding: 6 },
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

function TourOverlay({ step, onNext, onPrev, onSkip, hl, tip, ready, isLast, total }: {
  step: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  hl: { top: number; left: number; w: number; h: number } | null;
  tip: { top: number; left: number; w: number } | null;
  ready: boolean;
  isLast: boolean;
  total: number;
}) {
  const currentStep = TOUR_STEPS[step];

  return createPortal(
    <>
      {/* Dim background */}
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.4)", pointerEvents: "none" }} />

      {/* Highlight */}
      {hl && (
        <div
          style={{
            position: "fixed",
            top: hl.top,
            left: hl.left,
            width: hl.w,
            height: hl.h,
            borderRadius: 10,
            border: "2px solid #22d3ee",
            boxShadow: "0 0 24px rgba(0,220,255,0.35)",
            zIndex: 10000,
            pointerEvents: "none",
            transition: "all 0.15s ease-out",
          }}
        />
      )}

      {/* Tooltip */}
      {tip && ready && currentStep && (
        <div
          style={{
            position: "fixed",
            top: tip.top,
            left: tip.left,
            width: tip.w,
            zIndex: 10001,
          }}
        >
          <div className="rounded-xl border border-white/15 bg-[#0e1525] shadow-2xl overflow-hidden">
            <div className="px-4 pt-3 pb-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-[9px] font-black text-cyan-300">
                    {step + 1}
                  </span>
                  <span className="text-[9px] font-mono text-cyan-400/60 uppercase tracking-wider">
                    of {total}
                  </span>
                </div>
                <button onClick={onSkip} className="text-slate-600 hover:text-white cursor-pointer">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <h3 className="text-[13px] font-black text-white font-display mb-0.5">{currentStep.title}</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">{currentStep.text}</p>
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2">
              <button
                onClick={onPrev}
                disabled={step === 0}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-white transition cursor-pointer disabled:opacity-30"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Kembali
              </button>
              <div className="flex items-center gap-2">
                <button onClick={onSkip} className="text-[10px] font-bold text-slate-600 hover:text-slate-400 transition cursor-pointer">
                  Lewati
                </button>
                <button
                  onClick={onNext}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/30 transition cursor-pointer"
                >
                  {isLast ? "Selesai" : "Selanjutnya"}
                  {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}

export default function TdpGuidedTour({ onComplete, onSkip, initialStep = 0 }: TdpGuidedTourProps) {
  const [step, setStep] = useState(initialStep);
  const [hl, setHl] = useState<{ top: number; left: number; w: number; h: number } | null>(null);
  const [tip, setTip] = useState<{ top: number; left: number; w: number } | null>(null);
  const [ready, setReady] = useState(false);

  const stepRef = useRef(step);
  stepRef.current = step;
  const didScrollRef = useRef(false);

  const measure = useCallback(() => {
    const s = stepRef.current;
    const cfg = TOUR_STEPS[s];
    if (!cfg) return;

    const el = findTarget(cfg.target);
    if (!el) {
      setHl(null);
      setTip(null);
      setReady(true);
      return;
    }

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      setHl(null);
      setTip(null);
      setReady(true);
      return;
    }

    const pad = cfg.padding ?? 8;
    setHl({
      top: rect.top - pad,
      left: rect.left - pad,
      w: rect.width + pad * 2,
      h: rect.height + pad * 2,
    });

    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const tipW = Math.min(280, vpW - 40);
    const tipH = 120;
    const gap = 12;
    const edgePad = 16;
    const placement = cfg.placement || "bottom";
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    let ttop = 0, tleft = 0;
    switch (placement) {
      case "bottom": ttop = rect.bottom + pad + gap; tleft = cx - tipW / 2; break;
      case "top": ttop = rect.top - pad - gap - tipH; tleft = cx - tipW / 2; break;
      case "right": ttop = cy - tipH / 2; tleft = rect.right + pad + gap; break;
      case "left": ttop = cy - tipH / 2; tleft = rect.left - pad - gap - tipW; break;
    }

    tleft = Math.max(edgePad, Math.min(tleft, vpW - tipW - edgePad));
    ttop = Math.max(edgePad, Math.min(ttop, vpH - tipH - edgePad));

    setTip({ top: ttop, left: tleft, w: tipW });
    setReady(true);
  }, []);

  const scrollToAndMeasure = useCallback(() => {
    const s = stepRef.current;
    const cfg = TOUR_STEPS[s];
    if (!cfg) return;
    const el = findTarget(cfg.target);
    if (!el) { setHl(null); setTip(null); setReady(true); return; }

    didScrollRef.current = true;
    el.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      didScrollRef.current = false;
      measure();
    }));
  }, [measure]);

  useEffect(() => {
    setReady(false);
    setHl(null);
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

  return (
    <TourOverlay
      step={step}
      onNext={next}
      onPrev={prev}
      onSkip={onSkip}
      hl={hl}
      tip={tip}
      ready={ready}
      isLast={step >= TOUR_STEPS.length - 1}
      total={TOUR_STEPS.length}
    />
  );
}
