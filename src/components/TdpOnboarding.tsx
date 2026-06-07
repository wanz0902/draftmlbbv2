import React, { useState } from "react";
import {
  Ban,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Download,
  Layers,
  Swords,
  Target,
  Users,
  X,
} from "lucide-react";

const TUTORIAL_STORAGE_KEY = "tdp_tutorial_completed";

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
  visual: React.ReactNode;
}

function StepVisual({ step }: { step: number }) {
  if (step === 0) {
    return (
      <div className="flex items-center gap-6 mt-6">
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-24 rounded-xl border-2 border-blue-500/30 bg-blue-950/40 flex flex-col items-center justify-center gap-1">
            <div className="h-5 w-5 rounded-full border-2 border-dashed border-blue-400/40" />
            <div className="h-5 w-5 rounded-full border-2 border-dashed border-blue-400/40" />
            <div className="h-5 w-5 rounded-full border-2 border-dashed border-blue-400/40" />
          </div>
          <span className="text-[9px] font-bold text-blue-300 uppercase">Blue</span>
        </div>
        <div className="text-2xl text-slate-600 font-bold">VS</div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-24 rounded-xl border-2 border-rose-500/30 bg-rose-950/40 flex flex-col items-center justify-center gap-1">
            <div className="h-5 w-5 rounded-full border-2 border-dashed border-rose-400/40" />
            <div className="h-5 w-5 rounded-full border-2 border-dashed border-rose-400/40" />
            <div className="h-5 w-5 rounded-full border-2 border-dashed border-rose-400/40" />
          </div>
          <span className="text-[9px] font-bold text-rose-300 uppercase">Red</span>
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="flex items-center gap-4 mt-6">
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[8px] font-bold text-rose-400 uppercase">Bans</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 w-8 rounded-full border-2 border-dashed border-rose-400/30 bg-rose-950/20" />
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[8px] font-bold text-cyan-400 uppercase">Picks</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 w-8 rounded-full border-2 border-dashed border-cyan-400/30 bg-cyan-950/20" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="flex items-center gap-2 mt-6">
        {["EXP", "JGL", "MID", "GOLD", "ROAM"].map((lane, i) => (
          <div key={lane} className="flex flex-col items-center gap-1">
            <div className="h-8 w-8 rounded-full border-2 border-dashed border-white/15 bg-white/[0.03]" />
            <span className={`text-[7px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${
              i === 0 ? "border-rose-500/30 text-rose-300 bg-rose-500/15" :
              i === 1 ? "border-blue-500/30 text-blue-300 bg-blue-500/15" :
              i === 2 ? "border-slate-400/30 text-slate-300 bg-slate-400/15" :
              i === 3 ? "border-yellow-500/30 text-yellow-300 bg-yellow-500/15" :
              "border-emerald-500/30 text-emerald-300 bg-emerald-500/15"
            }`}>{lane}</span>
          </div>
        ))}
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="flex items-center gap-3 mt-6">
        <div className="flex flex-col items-center gap-1">
          <div className="h-8 w-8 rounded-full border-2 border-dashed border-white/15 bg-white/[0.03]" />
          <span className="text-[7px] font-bold text-rose-300 uppercase">EXP</span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-5 w-5 rounded-full border border-dashed border-white/10 bg-white/[0.02]" />
          ))}
        </div>
        <div className="text-[8px] text-slate-500 max-w-[100px] text-center leading-tight">
          6 hero cadangan per lane
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 mt-6">
      <div className="flex-1 rounded-lg border border-white/10 bg-white/[0.02] p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <BookOpen className="h-3 w-3 text-slate-500" />
          <span className="text-[8px] font-bold text-slate-400 uppercase">Coach Notes</span>
        </div>
        <div className="h-6 rounded bg-white/[0.03] border border-white/[0.06]" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <Download className="h-5 w-5 text-amber-400" />
        <span className="text-[8px] font-bold text-amber-300 uppercase">Export</span>
      </div>
    </div>
  );
}

interface TdpOnboardingProps {
  onComplete: () => void;
}

export default function TdpOnboarding({ onComplete }: TdpOnboardingProps) {
  const [step, setStep] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [restartNotice, setRestartNotice] = useState(false);

  const steps: Step[] = [
    {
      icon: <Target className="h-6 w-6 text-cyan-400" />,
      title: "Apa itu Team Draft Planner?",
      description: "TDP adalah workspace untuk merancang ban, pick, hero utama per lane, hero cadangan, dan catatan strategi. Ini tool manual — tidak perlu AI, tidak perlu data MPL. Semua diatur sendiri.",
      visual: <StepVisual step={0} />,
    },
    {
      icon: <Ban className="h-6 w-6 text-rose-400" />,
      title: "Ban & Pick Plan",
      description: "Setiap side punya 5 slot ban dan 5 slot pick. Klik slot lingkaran untuk memilih hero. Blue Side di kiri, Red Side di kanan. Kamu bisa rencanakan draft dari sisi mana pun.",
      visual: <StepVisual step={1} />,
    },
    {
      icon: <Crosshair className="h-6 w-6 text-amber-400" />,
      title: "Role Lane Plan",
      description: "Di bawah pick, ada 5 lane: EXP, Jungle, Mid, Gold, Roam. Setiap lane punya 1 hero utama yang sudah kamu pilih di pick. Lane order berbeda untuk Blue dan Red side.",
      visual: <StepVisual step={2} />,
    },
    {
      icon: <Users className="h-6 w-6 text-emerald-400" />,
      title: "Backup Hero Plan",
      description: "Di bawah setiap lane, ada 6 slot hero cadangan. Kalau hero utama di-ban lawan, di-pick lawan, atau draft berubah, kamu sudah punya cadangan siap pakai.",
      visual: <StepVisual step={3} />,
    },
    {
      icon: <Download className="h-6 w-6 text-amber-400" />,
      title: "Coach Notes & Export",
      description: "Tulis catatan strategi: ban priority, win condition, key matchup, rotation. Tekan tombol Save untuk download gambar hasil draft sebagai PNG.",
      visual: <StepVisual step={4} />,
    },
  ];

  const currentStep = steps[step];
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  const handleComplete = () => {
    try { localStorage.setItem(TUTORIAL_STORAGE_KEY, "true"); } catch {}
    onComplete();
  };

  const handleRestartFromFinal = () => {
    setRestartNotice(true);
    setStep(0);
    setTimeout(() => setRestartNotice(false), 2000);
  };

  const handleBackClick = () => {
    if (isFirst) {
      setShowExitConfirm(true);
    } else {
      setStep((s) => s - 1);
    }
  };

  const handleExitConfirm = (action: "workspace" | "stay" | "restart") => {
    setShowExitConfirm(false);
    if (action === "workspace") {
      handleComplete();
    } else if (action === "restart") {
      setStep(0);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#040810]">
      <div className="w-full max-w-xl mx-4">
        {/* Restart notice */}
        {restartNotice && (
          <div className="mb-4 mx-auto w-fit rounded-lg bg-cyan-500/15 border border-cyan-500/25 px-4 py-2 text-[11px] font-bold text-cyan-300 animate-pulse">
            Tutorial diulang dari awal.
          </div>
        )}

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? "w-8 bg-cyan-400" : i < step ? "w-3 bg-cyan-600" : "w-3 bg-white/10"
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-[#0a1020] shadow-2xl overflow-hidden">
          <div className="px-8 pt-8 pb-6">
            <div className="flex items-center gap-3 mb-4">
              {currentStep.icon}
              <h2 className="text-lg font-black text-white font-display">{currentStep.title}</h2>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">{currentStep.description}</p>
            {currentStep.visual}
          </div>

          <div className="border-t border-white/[0.06] px-8 py-4 flex items-center justify-between">
            <button
              onClick={handleBackClick}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-white transition cursor-pointer"
            >
              {isFirst ? <><X className="h-4 w-4" /> Tutup</> : <><ChevronLeft className="h-4 w-4" /> Kembali</>}
            </button>

            {isLast ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRestartFromFinal}
                  className="px-4 py-2 rounded-lg border border-white/10 text-xs font-bold text-slate-400 hover:text-white hover:border-white/20 transition cursor-pointer"
                >
                  Ulangi Penjelasan
                </button>
                <button
                  onClick={handleComplete}
                  className="px-5 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 transition cursor-pointer"
                >
                  Ya, mulai TDP
                </button>
              </div>
            ) : (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500/15 border border-cyan-500/25 text-xs font-bold text-cyan-300 hover:bg-cyan-500/25 transition cursor-pointer"
              >
                Selanjutnya <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Skip link */}
        <div className="text-center mt-4">
          <button
            onClick={handleComplete}
            className="text-[10px] font-bold text-slate-600 hover:text-slate-400 transition cursor-pointer uppercase tracking-wider"
          >
            Lewati tutorial
          </button>
        </div>
      </div>

      {/* ═══ EXIT CONFIRMATION MODAL ═══ */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 rounded-2xl border border-white/10 bg-[#0e1525] shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-black text-white font-display mb-2">Keluar dari tutorial?</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-5">
              Kamu bisa lanjut ke workspace sekarang atau ulang tutorial dari awal kapan saja.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleExitConfirm("workspace")}
                className="w-full px-4 py-2.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 transition cursor-pointer"
              >
                Lanjut ke Workspace
              </button>
              <button
                onClick={() => handleExitConfirm("restart")}
                className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-xs font-bold text-slate-400 hover:text-white hover:border-white/20 transition cursor-pointer"
              >
                Mulai Ulang
              </button>
              <button
                onClick={() => handleExitConfirm("stay")}
                className="w-full px-4 py-2.5 rounded-lg text-[11px] font-bold text-slate-600 hover:text-slate-400 transition cursor-pointer"
              >
                Tetap di Tutorial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function isTdpTutorialCompleted(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function resetTdpTutorial(): void {
  try {
    localStorage.removeItem(TUTORIAL_STORAGE_KEY);
  } catch {}
}
