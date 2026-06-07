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
    text: "Di sini kamu mengatur folder draft. Tournament berfungsi seperti folder besar, sedangkan Draft adalah satu rencana draft di dalamnya.",
    placement: "right",
  },
  {
    target: "tour-new-tournament",
    title: "Tambah Tournament",
    text: "Klik ini kalau kamu mau bikin folder baru, misalnya untuk scrim, turnamen, atau latihan tertentu.",
    placement: "right",
  },
  {
    target: "tour-add-draft",
    title: "Tambah Draft",
    text: "Setelah punya tournament, tambahkan draft plan baru di sini. Satu tournament bisa punya banyak draft plan.",
    placement: "right",
  },
  {
    target: "tour-draft-header",
    title: "Draft Header",
    text: "Bagian ini menunjukkan draft yang sedang kamu buka. Pastikan nama tournament dan draft sudah sesuai sebelum mulai isi plan.",
    placement: "bottom",
  },
  {
    target: "tour-side-toggle",
    title: "Side Toggle",
    text: "Pilih sisi tim kamu di sini. Kalau kamu pilih Our Blue, badge OURS akan pindah ke Blue Side. Kalau Our Red, badge pindah ke Red Side.",
    placement: "bottom",
  },
  {
    target: "tour-ban-slots",
    title: "Ban Slots",
    text: "Isi 5 slot ban untuk menyusun target ban. Kamu bisa pakai ini untuk hero power pick, hero comfort lawan, atau hero yang mengganggu komposisi.",
    placement: "bottom",
  },
  {
    target: "tour-pick-slots",
    title: "Pick Slots",
    text: "Isi 5 slot pick untuk rencana hero utama. Ini jadi inti draft yang ingin kamu bangun.",
    placement: "bottom",
  },
  {
    target: "tour-role-lane",
    title: "Role Lane",
    text: "Role lane membantu kamu melihat pembagian posisi. Blue Side urut dari EXP sampai Roam, Red Side dibuat mirror supaya mudah dibaca.",
    placement: "bottom",
  },
  {
    target: "tour-backup-slots",
    title: "Backup Hero",
    text: "Setiap lane punya 6 hero cadangan. Kalau hero utama diban, diambil lawan, atau draft berubah, kamu sudah punya plan pengganti.",
    placement: "bottom",
  },
  {
    target: "tour-coach-notes",
    title: "Coach Notes",
    text: "Gunakan catatan ini untuk menulis win condition, target ban, power spike, matchup penting, atau rotasi awal.",
    placement: "top",
  },
  {
    target: "tour-save-btn",
    title: "Save / Export",
    text: "Kalau draft plan sudah siap, klik Save untuk download gambar hasil draft. File PNG ini bisa dibagikan ke tim atau disimpan sebagai arsip.",
    placement: "left",
  },
];

interface TdpGuidedTourProps {
  onComplete: () => void;
  onSkip: () => void;
  initialStep?: number;
}

function getRect(target: string): DOMRect | null {
  const el = document.querySelector(`[data-tour-target="${target}"]`);
  if (!el) return null;
  return el.getBoundingClientRect();
}

function getPlacement(targetRect: DOMRect, placement: string, viewportW: number, viewportH: number) {
  const pad = 12;
  const boxW = Math.min(320, viewportW - 40);
  let top = 0, left = 0;

  switch (placement) {
    case "bottom":
      top = targetRect.bottom + pad;
      left = Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - boxW / 2, viewportW - boxW - 16));
      break;
    case "top":
      top = targetRect.top - pad;
      left = Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - boxW / 2, viewportW - boxW - 16));
      top -= 120;
      break;
    case "right":
      top = Math.max(16, Math.min(targetRect.top + targetRect.height / 2 - 60, viewportH - 140));
      left = targetRect.right + pad;
      break;
    case "left":
      top = Math.max(16, Math.min(targetRect.top + targetRect.height / 2 - 60, viewportH - 140));
      left = targetRect.left - boxW - pad;
      break;
  }

  return { top: Math.max(8, top), left: Math.max(8, left), boxW };
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
  const [highlight, setHighlight] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [tooltip, setTooltip] = useState<{ top: number; left: number; boxW: number; placement: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentStep = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  const measure = useCallback(() => {
    if (!currentStep) return;
    const rect = getRect(currentStep.target);
    if (!rect) {
      setHighlight(null);
      setTooltip(null);
      return;
    }
    setHighlight({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const pos = getPlacement(rect, currentStep.placement || "bottom", vpW, vpH);
    setTooltip({ top: pos.top, left: pos.left, boxW: pos.boxW, placement: currentStep.placement || "bottom" });
  }, [currentStep]);

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(measure, 150);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(timerRef.current);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
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
      <div className="absolute inset-0 bg-black/50" onClick={onSkip} />

      {/* Highlight cutout */}
      {highlight && (
        <div
          className="absolute rounded-xl border-2 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all duration-300"
          style={{
            top: highlight.top - 4,
            left: highlight.left - 4,
            width: highlight.width + 8,
            height: highlight.height + 8,
          }}
        />
      )}

      {/* Tooltip */}
      {tooltip && currentStep && (
        <div
          className="absolute z-[10001] animate-in fade-in"
          style={{ top: tooltip.top, left: tooltip.left, width: tooltip.boxW }}
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
              <h3 className="text-sm font-black text-white font-display mb-1">{currentStep.title}</h3>
              <p className="text-[12px] text-slate-400 leading-relaxed">{currentStep.text}</p>
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2.5">
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

      {/* No target found fallback */}
      {!highlight && (
        <div className="absolute inset-0 z-[10001] flex items-center justify-center">
          <div className="rounded-xl border border-white/10 bg-[#0e1525] shadow-2xl p-6 text-center max-w-sm">
            <p className="text-sm text-slate-400 mb-3">Mencari elemen interface...</p>
            <button onClick={next} className="px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-xs font-bold text-cyan-300 cursor-pointer">
              Lanjut
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
