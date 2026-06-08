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
  {
    target: "tour-sidebar",
    title: "Sidebar & Draft Plans",
    text: "Di sini kamu mengatur folder draft. Tournament = folder besar, Draft = satu rencana draft.",
    placement: "right",
  },
  {
    target: "tour-new-tournament",
    title: "Tambah Tournament",
    text: "Klik ini untuk bikin folder baru, misalnya untuk scrim atau turnamen.",
    placement: "right",
  },
  {
    target: "tour-add-draft",
    title: "Tambah Draft",
    text: "Tambahkan draft plan baru di sini. Satu tournament bisa punya banyak draft.",
    placement: "right",
  },
  {
    target: "tour-draft-header",
    title: "Draft Header",
    text: "Draft yang sedang dibuka. Pastikan nama sudah sesuai sebelum isi plan.",
    placement: "bottom",
  },
  {
    target: "tour-side-toggle",
    title: "Side Toggle",
    text: "Pilih sisi tim kamu. Badge OURS akan pindah ke Blue atau Red.",
    placement: "bottom",
  },
  {
    target: "tour-ban-slots",
    title: "Ban Slots",
    text: "Isi 5 slot ban untuk target hero lawan.",
    placement: "bottom",
  },
  {
    target: "tour-pick-slots",
    title: "Pick Slots",
    text: "Isi 5 slot pick untuk hero utama draft.",
    placement: "bottom",
  },
  {
    target: "tour-role-lane",
    title: "Role Lane",
    text: "Blue urut EXP sampai Roam, Red dibuat mirror. Lihat posisi tiap hero.",
    placement: "bottom",
  },
  {
    target: "tour-backup-slots",
    title: "Backup Hero",
    text: "Setiap lane punya 6 cadangan kalau hero utama diban atau diambil lawan.",
    placement: "bottom",
  },
  {
    target: "tour-coach-notes",
    title: "Coach Notes",
    text: "Tulis catatan strategi: win condition, target ban, rotasi awal.",
    placement: "top",
  },
  {
    target: "tour-save-btn",
    title: "Save / Export",
    text: "Klik Save untuk download gambar draft.",
    placement: "left",
  },
];

interface TdpGuidedTourProps {
  onComplete: () => void;
  onSkip: () => void;
  initialStep?: number;
}

function findTarget(target: string): HTMLElement | null {
  return document.querySelector(`[data-tour-target="${target}"]`) as HTMLElement | null;
}

function getRect(target: string): DOMRect | null {
  const el = findTarget(target);
  if (!el) return null;
  return el.getBoundingClientRect();
}

function calcTooltip(
  targetRect: DOMRect,
  placement: string,
  vpW: number,
  vpH: number,
  tooltipH: number,
  tooltipW: number
): { top: number; left: number } {
  const gap = 12;
  const edgePad = 16;
  let top = 0;
  let left = 0;

  switch (placement) {
    case "bottom":
      top = targetRect.bottom + gap;
      left = targetRect.left + targetRect.width / 2 - tooltipW / 2;
      break;
    case "top":
      top = targetRect.top - gap - tooltipH;
      left = targetRect.left + targetRect.width / 2 - tooltipW / 2;
      break;
    case "right":
      top = targetRect.top + targetRect.height / 2 - tooltipH / 2;
      left = targetRect.right + gap;
      break;
    case "left":
      top = targetRect.top + targetRect.height / 2 - tooltipH / 2;
      left = targetRect.left - gap - tooltipW;
      break;
  }

  left = Math.max(edgePad, Math.min(left, vpW - tooltipW - edgePad));
  top = Math.max(edgePad, Math.min(top, vpH - tooltipH - edgePad));

  return { top, left };
}

export function isGuidedTourCompleted(): boolean {
  try {
    return localStorage.getItem(TOUR_STORAGE_KEY) === "true";
  } catch { return false; }
}

export function markGuidedTourCompleted() {
  try { localStorage.setItem(TOUR_STORAGE_KEY, "true"); } catch {}
}

export default function TdpGuidedTour({ onComplete, onSkip, initialStep = 0 }: TdpGuidedTourProps) {
  const [step, setStep] = useState(initialStep);
  const [hl, setHl] = useState<{ top: number; left: number; w: number; h: number } | null>(null);
  const [tip, setTip] = useState<{ top: number; left: number; w: number } | null>(null);
  const [ready, setReady] = useState(false);
  const rafRef = useRef<number>(0);
  const measuringRef = useRef(false);

  const currentStep = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  const measure = useCallback(() => {
    if (measuringRef.current) return;
    measuringRef.current = true;

    const doMeasure = () => {
      if (!currentStep) { measuringRef.current = false; return; }
      const el = findTarget(currentStep.target);
      if (!el) {
        setHl(null);
        setTip(null);
        setReady(true);
        measuringRef.current = false;
        return;
      }

      el.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });

      rafRef.current = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const vpW = window.innerWidth;
        const vpH = window.innerHeight;
        const pad = 10;

        setHl({
          top: rect.top - pad,
          left: rect.left - pad,
          w: rect.width + pad * 2,
          h: rect.height + pad * 2,
        });

        const tipW = Math.min(300, vpW - 40);
        const tipH = 140;
        const pos = calcTooltip(rect, currentStep.placement || "bottom", vpW, vpH, tipH, tipW);

        setTip({ top: pos.top, left: pos.left, w: tipW });
        setReady(true);
        measuringRef.current = false;
      });
    };

    doMeasure();
  }, [currentStep]);

  useEffect(() => {
    setReady(false);
    setHl(null);
    setTip(null);

    const raf = requestAnimationFrame(() => {
      measure();
    });

    const onResize = () => measure();
    const onScroll = () => measure();

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
    };
  }, [measure]);

  const next = () => {
    if (isLast) {
      markGuidedTourCompleted();
      onComplete();
    } else {
      setStep((s) => s + 1);
    }
  };

  const prev = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  return (
    <div className="fixed inset-0 z-[10000]" style={{ pointerEvents: "auto" }}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onSkip} />

      {/* Highlight cutout */}
      {hl && (
        <div
          className="absolute rounded-lg border-[2px] border-cyan-400/80 shadow-[0_0_16px_rgba(34,211,238,0.25)] transition-all duration-200 ease-out pointer-events-none"
          style={{
            top: hl.top,
            left: hl.left,
            width: hl.w,
            height: hl.h,
          }}
        />
      )}

      {/* Tooltip */}
      {tip && ready && currentStep && (
        <div
          className="absolute z-[10001]"
          style={{ top: tip.top, left: tip.left, width: tip.w }}
        >
          <div className="rounded-xl border border-white/15 bg-[#0e1525] shadow-2xl overflow-hidden">
            <div className="px-4 pt-3 pb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-wider">
                  {step + 1} / {TOUR_STEPS.length}
                </span>
                <button onClick={onSkip} className="text-slate-600 hover:text-white cursor-pointer">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <h3 className="text-[13px] font-black text-white font-display mb-0.5">{currentStep.title}</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">{currentStep.text}</p>
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2">
              <button
                onClick={prev}
                disabled={step === 0}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-white transition cursor-pointer disabled:opacity-30"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Kembali
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={onSkip}
                  className="text-[10px] font-bold text-slate-600 hover:text-slate-400 transition cursor-pointer"
                >
                  Lewati
                </button>
                <button
                  onClick={next}
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

      {/* No target found */}
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
