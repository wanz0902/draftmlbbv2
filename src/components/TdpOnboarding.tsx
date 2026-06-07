import React, { useState } from "react";
import {
  Ban,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Download,
  FileText,
  Layers,
  Plus,
  Shield,
  Swords,
  Target,
  ToggleLeft,
  Users,
  X,
} from "lucide-react";

const TUTORIAL_STORAGE_KEY = "tdp_tutorial_completed";

interface Step {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  visual: React.ReactNode;
}

/* ════════════════════════════════════════════
   STEP VISUALS
   ════════════════════════════════════════════ */

function IntroVisual() {
  return (
    <div className="flex items-center gap-5 mt-6">
      <div className="flex flex-col items-center gap-1.5">
        <div className="w-24 h-28 rounded-xl border-2 border-blue-500/25 bg-blue-950/30 flex flex-col items-center justify-center gap-1.5 p-2">
          <div className="h-4 w-4 rounded-full border-2 border-dashed border-blue-400/30" />
          <div className="h-4 w-4 rounded-full border-2 border-dashed border-blue-400/30" />
          <div className="h-4 w-4 rounded-full border-2 border-dashed border-blue-400/30" />
          <div className="w-full border-t border-white/5 pt-1 mt-0.5">
            <div className="h-2.5 w-full rounded bg-white/[0.04]" />
          </div>
        </div>
        <span className="text-[8px] font-bold text-blue-300 uppercase tracking-wider">Blue Side</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-xl text-slate-600 font-black">VS</span>
        <span className="text-[7px] text-slate-600">Draft</span>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <div className="w-24 h-28 rounded-xl border-2 border-rose-500/25 bg-rose-950/30 flex flex-col items-center justify-center gap-1.5 p-2">
          <div className="h-4 w-4 rounded-full border-2 border-dashed border-rose-400/30" />
          <div className="h-4 w-4 rounded-full border-2 border-dashed border-rose-400/30" />
          <div className="h-4 w-4 rounded-full border-2 border-dashed border-rose-400/30" />
          <div className="w-full border-t border-white/5 pt-1 mt-0.5">
            <div className="h-2.5 w-full rounded bg-white/[0.04]" />
          </div>
        </div>
        <span className="text-[8px] font-bold text-rose-300 uppercase tracking-wider">Red Side</span>
      </div>
    </div>
  );
}

function SidebarVisual() {
  return (
    <div className="mt-6 w-56 mx-auto rounded-xl border border-white/10 bg-[#0c1222] overflow-hidden">
      <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Tournaments</span>
        <span className="text-[7px] font-bold bg-amber-500/15 border border-amber-500/25 text-amber-400 px-1.5 py-0.5 rounded">+ NEW</span>
      </div>
      <div className="p-2">
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-white/[0.03]">
          <Layers className="h-2.5 w-2.5 text-cyan-400" />
          <span className="text-[9px] font-bold text-white">Tournament 1</span>
        </div>
        <div className="ml-4 mt-1 space-y-0.5">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/20">
            <FileText className="h-2 w-2 text-cyan-400" />
            <span className="text-[8px] font-bold text-cyan-300">Draft 1</span>
            <span className="text-[7px] text-slate-600 ml-auto">0/20</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded text-slate-500">
            <FileText className="h-2 w-2" />
            <span className="text-[8px]">Draft 2</span>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded border border-dashed border-white/[0.06]">
          <Plus className="h-2 w-2 text-slate-600" />
          <span className="text-[7px] font-bold text-slate-600">ADD DRAFT</span>
        </div>
      </div>
    </div>
  );
}

function SideToggleVisual() {
  return (
    <div className="mt-6 flex items-center justify-center gap-4">
      <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.02] p-0.5">
        <span className="px-3 py-1.5 rounded-md text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">Our Blue</span>
        <span className="px-3 py-1.5 rounded-md text-[9px] font-bold text-slate-600">Red</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Shield className="h-4 w-4 text-blue-400" />
        <span className="text-[9px] font-bold text-blue-300 bg-blue-500/15 border border-blue-500/25 px-2 py-0.5 rounded">OURS</span>
      </div>
    </div>
  );
}

function BanVisual() {
  const filled = [false, true, false, true, false];
  const colors = ["border-rose-400/30 bg-rose-950/20", "border-rose-500/40 bg-rose-500/15", "border-rose-400/30 bg-rose-950/20", "border-rose-500/40 bg-rose-500/15", "border-rose-400/30 bg-rose-950/20"];
  return (
    <div className="mt-6 flex items-center gap-3">
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-[7px] font-bold text-rose-400 uppercase tracking-wider">Bans</span>
        <div className="flex gap-1.5">
          {filled.map((f, i) => (
            <div key={i} className={`h-9 w-9 rounded-full border-2 ${f ? "border-rose-500/40 bg-rose-500/15" : "border-dashed border-rose-400/20 bg-rose-950/10"} flex items-center justify-center`}>
              {f && <span className="text-[7px] font-bold text-rose-300">●</span>}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-[7px] font-bold text-cyan-400 uppercase tracking-wider">Picks</span>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-9 w-9 rounded-full border-2 border-dashed border-cyan-400/20 bg-cyan-950/10" />
          ))}
        </div>
      </div>
    </div>
  );
}

function PickVisual() {
  return (
    <div className="mt-6 flex items-center gap-3">
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-[7px] font-bold text-rose-400 uppercase tracking-wider">Bans</span>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-9 w-9 rounded-full border-2 border-dashed border-rose-400/20 bg-rose-950/10" />
          ))}
        </div>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-[7px] font-bold text-cyan-400 uppercase tracking-wider">Picks</span>
        <div className="flex gap-1.5">
          {[true, true, false, true, false].map((f, i) => (
            <div key={i} className={`h-9 w-9 rounded-full border-2 ${f ? "border-cyan-500/40 bg-cyan-500/15" : "border-dashed border-cyan-400/20 bg-cyan-950/10"} flex items-center justify-center`}>
              {f && <span className="text-[7px] font-bold text-cyan-300">●</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LaneVisual() {
  const lanes = [
    { label: "EXP", color: "border-rose-500/30 text-rose-300 bg-rose-500/15" },
    { label: "JGL", color: "border-blue-500/30 text-blue-300 bg-blue-500/15" },
    { label: "MID", color: "border-slate-400/30 text-slate-300 bg-slate-400/15" },
    { label: "GOLD", color: "border-yellow-500/30 text-yellow-300 bg-yellow-500/15" },
    { label: "ROAM", color: "border-emerald-500/30 text-emerald-300 bg-emerald-500/15" },
  ];
  return (
    <div className="mt-6 flex items-center gap-2">
      {lanes.map((l) => (
        <div key={l.label} className="flex flex-col items-center gap-1.5">
          <div className="h-8 w-8 rounded-full border-2 border-dashed border-white/15 bg-white/[0.03]" />
          <span className={`text-[7px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${l.color}`}>{l.label}</span>
        </div>
      ))}
    </div>
  );
}

function BackupVisual() {
  return (
    <div className="mt-6 flex items-center gap-4">
      <div className="flex flex-col items-center gap-1">
        <div className="h-9 w-9 rounded-full border-2 border-dashed border-white/15 bg-white/[0.03]" />
        <span className="text-[7px] font-bold text-rose-300 uppercase">EXP</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <div className="grid grid-cols-3 gap-1">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={`h-5 w-5 rounded-full border ${i <= 2 ? "border-white/15 bg-white/[0.04]" : "border-dashed border-white/[0.08] bg-white/[0.01]"}`} />
          ))}
        </div>
        <span className="text-[7px] text-slate-500">6 cadangan</span>
      </div>
      <div className="text-[8px] text-slate-500 max-w-[110px] leading-tight">
        Kalau hero utama diambil lawan, cadangan ini siap dipakai.
      </div>
    </div>
  );
}

function FilledExampleVisual() {
  return (
    <div className="mt-6 rounded-xl border border-white/10 bg-[#0c1222] p-3 mx-auto max-w-md">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
        <span className="text-[8px] font-bold text-blue-300 uppercase tracking-wider">Blue Side</span>
        <span className="text-[7px] font-bold bg-blue-500/15 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/25">OURS</span>
      </div>
      <div className="flex gap-1 mb-2">
        {["B1", "B2", "B3", "B4", "B5"].map((b, i) => (
          <div key={b} className={`h-7 w-7 rounded-full border-2 ${i === 1 || i === 3 ? "border-rose-500/40 bg-rose-500/15" : "border-dashed border-rose-400/15 bg-rose-950/5"} flex items-center justify-center`}>
            <span className="text-[6px] text-slate-600">{b}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-1 mb-2">
        {[true, true, true, false, false].map((f, i) => (
          <div key={i} className={`h-7 w-7 rounded-full border-2 ${f ? "border-cyan-500/40 bg-cyan-500/15" : "border-dashed border-cyan-400/15 bg-cyan-950/5"} flex items-center justify-center`}>
            {f && <span className="text-[6px] font-bold text-cyan-300">●</span>}
          </div>
        ))}
      </div>
      <div className="flex gap-1.5">
        {["EXP", "JGL", "MID"].map((l, i) => (
          <div key={l} className="flex flex-col items-center gap-0.5">
            <span className={`text-[6px] font-bold px-1 py-0.5 rounded border ${
              i === 0 ? "border-rose-500/30 text-rose-300 bg-rose-500/10" :
              i === 1 ? "border-blue-500/30 text-blue-300 bg-blue-500/10" :
              "border-slate-400/30 text-slate-300 bg-slate-400/10"
            }`}>{l}</span>
            <div className="grid grid-cols-3 gap-0.5">
              {[1, 2, 3, 4, 5, 6].map((j) => (
                <div key={j} className={`h-3 w-3 rounded-full border ${(i === 0 && j <= 2) || (i === 1 && j === 1) ? "border-white/15 bg-white/[0.05]" : "border-dashed border-white/[0.06] bg-white/[0.01]"}`} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotesExportVisual() {
  return (
    <div className="mt-6 flex items-start gap-3">
      <div className="flex-1 rounded-lg border border-white/10 bg-[#0c1222] p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <BookOpen className="h-3 w-3 text-slate-400" />
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Coach Notes</span>
        </div>
        <div className="space-y-1">
          <div className="h-2 w-full rounded bg-white/[0.04]" />
          <div className="h-2 w-3/4 rounded bg-white/[0.03]" />
          <div className="h-2 w-5/6 rounded bg-white/[0.04]" />
        </div>
        <div className="mt-2 text-[7px] text-slate-600 leading-relaxed">
          Win condition: Late game scaling. Ban Fanny, pick Grock roam...
        </div>
      </div>
      <div className="flex flex-col items-center gap-1.5 pt-2">
        <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
          <Download className="h-4 w-4 text-amber-400" />
        </div>
        <span className="text-[7px] font-bold text-amber-300 uppercase">Save</span>
        <span className="text-[6px] text-slate-600">PNG</span>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════ */

interface TdpOnboardingProps {
  onComplete: () => void;
}

export default function TdpOnboarding({ onComplete }: TdpOnboardingProps) {
  const [step, setStep] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [restartNotice, setRestartNotice] = useState(false);

  const steps: Step[] = [
    {
      icon: <Target className="h-5 w-5 text-cyan-400" />,
      title: "Apa itu Team Draft Planner?",
      description: (
        <p className="text-sm text-slate-400 leading-relaxed">
          Team Draft Planner adalah papan kerja untuk nyusun rencana draft sebelum match. Di sini kamu bisa atur ban, susun pick utama, siapin hero cadangan per lane, dan tulis catatan strategi biar draft kamu nggak asal jalan.
        </p>
      ),
      visual: <IntroVisual />,
    },
    {
      icon: <Layers className="h-5 w-5 text-cyan-400" />,
      title: "Tournament & Draft List",
      description: (
        <p className="text-sm text-slate-400 leading-relaxed">
          Mulai dari bikin tournament dulu, lalu tambahkan draft plan di dalamnya. Tournament itu folder besar, dan draft itu satu rencana draft. Klik + NEW untuk bikin tournament, atau + ADD DRAFT untuk nambah rencana baru.
        </p>
      ),
      visual: <SidebarVisual />,
    },
    {
      icon: <ToggleLeft className="h-5 w-5 text-blue-400" />,
      title: "Pilih Side Kita",
      description: (
        <p className="text-sm text-slate-400 leading-relaxed">
          Pilih "Our Blue" kalau tim kamu main di blue side, atau "Our Red" kalau main di red side. Badge OURS akan pindah sesuai pilihanmu. Ini membantu coach dan pemain tahu sisi mana yang jadi fokus perencanaan.
        </p>
      ),
      visual: <SideToggleVisual />,
    },
    {
      icon: <Ban className="h-5 w-5 text-rose-400" />,
      title: "Ban Plan",
      description: (
        <p className="text-sm text-slate-400 leading-relaxed">
          Setiap side punya 5 slot ban. Isi hero yang mau kamu banned dari lawan. Bisa untuk target power pick, comfort hero lawan, atau hero yang mengganggu komposisi kamu. Klik slot lingkaran untuk pilih hero.
        </p>
      ),
      visual: <BanVisual />,
    },
    {
      icon: <Swords className="h-5 w-5 text-cyan-400" />,
      title: "Pick Plan",
      description: (
        <p className="text-sm text-slate-400 leading-relaxed">
          Isi hero utama yang akan masuk draft. Pick ini jadi rencana inti komposisi tim kamu. Kalau lawan ambil hero tertentu, pick bisa berubah — tapi setidaknya kamu sudah punya plan awal yang jelas.
        </p>
      ),
      visual: <PickVisual />,
    },
    {
      icon: <Crosshair className="h-5 w-5 text-amber-400" />,
      title: "Role Lane Plan",
      description: (
        <p className="text-sm text-slate-400 leading-relaxed">
          Setiap pick dikaitkan dengan role lane: EXP, Jungle, Mid, Gold, Roam. Lane membantu kamu lihat apakah draft sudah lengkap atau masih kurang. Urutan lane berbeda untuk Blue dan Red side.
        </p>
      ),
      visual: <LaneVisual />,
    },
    {
      icon: <Users className="h-5 w-5 text-emerald-400" />,
      title: "Backup Hero Per Lane",
      description: (
        <p className="text-sm text-slate-400 leading-relaxed">
          Setiap lane punya 6 slot hero cadangan. Ini dipakai kalau hero utama kamu kena ban, diambil lawan, atau draft berubah total. Dengan backup, rencana kamu nggak berhenti di satu hero saja.
        </p>
      ),
      visual: <BackupVisual />,
    },
    {
      icon: <Download className="h-5 w-5 text-amber-400" />,
      title: "Coach Notes & Export",
      description: (
        <p className="text-sm text-slate-400 leading-relaxed">
          Tulis catatan strategi: win condition, target ban, power spike, matchup penting, atau rotasi awal. Setelah selesai, tekan tombol Save untuk download gambar draft sebagai PNG dan bagikan ke tim.
        </p>
      ),
      visual: <NotesExportVisual />,
    },
  ];

  const filledExampleStep = {
    icon: <Shield className="h-5 w-5 text-cyan-400" />,
    title: "Contoh Draft Yang Sudah Terisi",
    description: (
      <p className="text-sm text-slate-400 leading-relaxed">
        Ini contoh tampilan draft yang sudah terisi. Ban sudah ditentukan, pick utama sudah masuk, dan backup hero per lane sudah disiapkan. Kamu bisa lihat gambaran akhirnya sebelum mulai.
      </p>
    ),
    visual: <FilledExampleVisual />,
  };

  const allSteps = [...steps.slice(0, 7), filledExampleStep, steps[7]];

  const currentStep = allSteps[step];
  const isLast = step === allSteps.length - 1;
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
        {restartNotice && (
          <div className="mb-4 mx-auto w-fit rounded-lg bg-cyan-500/15 border border-cyan-500/25 px-4 py-2 text-[11px] font-bold text-cyan-300 animate-pulse">
            Tutorial diulang dari awal.
          </div>
        )}

        <div className="flex items-center justify-center gap-1.5 mb-6">
          {allSteps.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-cyan-400" : i < step ? "w-2 bg-cyan-600" : "w-2 bg-white/10"
              }`}
            />
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0a1020] shadow-2xl overflow-hidden">
          <div className="px-7 pt-7 pb-5">
            <div className="flex items-center gap-3 mb-3">
              {currentStep.icon}
              <h2 className="text-base font-black text-white font-display">{currentStep.title}</h2>
            </div>
            {currentStep.description}
            {currentStep.visual}
          </div>

          <div className="border-t border-white/[0.06] px-7 py-3.5 flex items-center justify-between">
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

        <div className="text-center mt-4">
          <button
            onClick={handleComplete}
            className="text-[10px] font-bold text-slate-600 hover:text-slate-400 transition cursor-pointer uppercase tracking-wider"
          >
            Lewati tutorial
          </button>
        </div>
      </div>

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
