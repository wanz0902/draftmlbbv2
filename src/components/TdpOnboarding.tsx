import React, { useState } from "react";
import {
  Ban,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Download,
  FileText,
  Image,
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

function HeroDot({ name, color }: { name: string; color: string }) {
  return (
    <div className={`h-8 w-8 rounded-full ${color} flex items-center justify-center shrink-0`}>
      <span className="text-[8px] font-black text-white/90 leading-none text-center px-0.5">
        {name.slice(0, 3).toUpperCase()}
      </span>
    </div>
  );
}

function HeroDotSmall({ name, color }: { name: string; color: string }) {
  return (
    <div className={`h-5 w-5 rounded-full ${color} flex items-center justify-center shrink-0`}>
      <span className="text-[5px] font-black text-white/80 leading-none">{name.slice(0, 2).toUpperCase()}</span>
    </div>
  );
}

function EmptyDot() {
  return <div className="h-8 w-8 rounded-full border-2 border-dashed border-white/10 bg-white/[0.02] shrink-0" />;
}

function EmptyDotSmall() {
  return <div className="h-5 w-5 rounded-full border border-dashed border-white/[8] bg-white/[0.01] shrink-0" />;
}

const B = "bg-blue-500/40 border border-blue-400/30";
const R = "bg-rose-500/40 border border-rose-400/30";
const C = "bg-cyan-500/40 border border-cyan-400/30";
const A = "bg-amber-500/40 border border-amber-400/30";
const E = "bg-emerald-500/40 border border-emerald-400/30";
const P = "bg-purple-500/40 border border-purple-400/30";
const S = "bg-slate-400/30 border border-slate-400/30";

/* ════════════════════════════════════════════
   STEP VISUALS — ALL FILLED EXAMPLES
   ════════════════════════════════════════════ */

function IntroVisual() {
  return (
    <div className="mt-6 rounded-xl border border-white/[0.08] bg-[#0c1222] p-3">
      <div className="flex gap-3">
        <div className="flex-1 rounded-lg border border-blue-500/15 bg-blue-950/20 p-2">
          <div className="flex items-center gap-1 mb-2">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            <span className="text-[7px] font-bold text-blue-300 uppercase tracking-wider">Blue Side</span>
          </div>
          <div className="flex gap-1 mb-1.5">
            <HeroDotSmall name="Fanny" color={R} />
            <HeroDotSmall name="Alice" color={R} />
            <div className="h-5 w-5 rounded-full border border-dashed border-rose-400/15 shrink-0" />
            <div className="h-5 w-5 rounded-full border border-dashed border-rose-400/15 shrink-0" />
            <div className="h-5 w-5 rounded-full border border-dashed border-rose-400/15 shrink-0" />
          </div>
          <div className="flex gap-1">
            <HeroDotSmall name="Baxia" color={C} />
            <HeroDotSmall name="Claude" color={C} />
            <div className="h-5 w-5 rounded-full border border-dashed border-cyan-400/15 shrink-0" />
            <div className="h-5 w-5 rounded-full border border-dashed border-cyan-400/15 shrink-0" />
            <div className="h-5 w-5 rounded-full border border-dashed border-cyan-400/15 shrink-0" />
          </div>
        </div>
        <div className="flex flex-col items-center justify-center px-1">
          <span className="text-[8px] font-black text-slate-600">VS</span>
        </div>
        <div className="flex-1 rounded-lg border border-rose-500/15 bg-rose-950/20 p-2">
          <div className="flex items-center gap-1 mb-2">
            <div className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            <span className="text-[7px] font-bold text-rose-300 uppercase tracking-wider">Red Side</span>
          </div>
          <div className="flex gap-1 mb-1.5">
            <HeroDotSmall name="Arlott" color={R} />
            <HeroDotSmall name="Chip" color={R} />
            <div className="h-5 w-5 rounded-full border border-dashed border-rose-400/15 shrink-0" />
            <div className="h-5 w-5 rounded-full border border-dashed border-rose-400/15 shrink-0" />
            <div className="h-5 w-5 rounded-full border border-dashed border-rose-400/15 shrink-0" />
          </div>
          <div className="flex gap-1">
            <HeroDotSmall name="Phov" color={C} />
            <HeroDotSmall name="Valen" color={C} />
            <div className="h-5 w-5 rounded-full border border-dashed border-cyan-400/15 shrink-0" />
            <div className="h-5 w-5 rounded-full border border-dashed border-cyan-400/15 shrink-0" />
            <div className="h-5 w-5 rounded-full border border-dashed border-cyan-400/15 shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarVisual() {
  return (
    <div className="mt-5 w-52 mx-auto rounded-xl border border-white/[0.08] bg-[#0c1222] overflow-hidden">
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
            <span className="text-[7px] text-slate-600 ml-auto">5/20</span>
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
    <div className="mt-5 flex items-center justify-center gap-5">
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
  const blueBans = [
    { name: "Fanny", color: R },
    { name: "Chip", color: R },
    { name: "Arlott", color: R },
    null,
    null,
  ];
  const redBans = [
    { name: "Zhuxin", color: R },
    { name: "Kalea", color: R },
    null,
    { name: "Nolan", color: R },
    null,
  ];
  return (
    <div className="mt-5 space-y-3">
      <div className="flex gap-1.5">
        {blueBans.map((b, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            {b ? <HeroDot name={b.name} color={b.color} /> : <EmptyDot />}
            <span className="text-[6px] font-mono font-bold text-slate-600">B{i + 1}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-1.5">
        {redBans.map((b, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            {b ? <HeroDot name={b.name} color={b.color} /> : <EmptyDot />}
            <span className="text-[6px] font-mono font-bold text-slate-600">B{5 - i}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PickVisual() {
  const bluePicks = [
    { name: "Baxia", color: B },
    { name: "Claude", color: C },
    null,
    { name: "Grock", color: E },
    null,
  ];
  return (
    <div className="mt-5">
      <div className="flex gap-1.5">
        {bluePicks.map((p, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            {p ? <HeroDot name={p.name} color={p.color} /> : <EmptyDot />}
            <span className="text-[6px] font-mono font-bold text-slate-600">P{i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LaneVisual() {
  const lanes = [
    { label: "EXP", hero: "Phoveus", color: "border-rose-500/30 text-rose-300 bg-rose-500/15", dot: A },
    { label: "JGL", hero: "Fanny", color: "border-blue-500/30 text-blue-300 bg-blue-500/15", dot: R },
    { label: "MID", hero: "Valentina", color: "border-slate-400/30 text-slate-300 bg-slate-400/15", dot: P },
    { label: "GOLD", hero: "Claude", color: "border-yellow-500/30 text-yellow-300 bg-yellow-500/15", dot: C },
    { label: "ROAM", hero: "Baxia", color: "border-emerald-500/30 text-emerald-300 bg-emerald-500/15", dot: B },
  ];
  return (
    <div className="mt-5 flex items-center gap-1.5">
      {lanes.map((l) => (
        <div key={l.label} className="flex flex-col items-center gap-1 flex-1">
          <HeroDot name={l.hero} color={l.dot} />
          <span className={`text-[6px] font-bold uppercase px-1 py-0.5 rounded-full border ${l.color}`}>{l.label}</span>
          <span className="text-[6px] text-slate-600">{l.hero}</span>
        </div>
      ))}
    </div>
  );
}

function BackupVisual() {
  const backups = [
    { name: "Terizla", color: A },
    { name: "Y.Zhong", color: A },
    { name: "Edith", color: S },
    { name: "Khaleed", color: S },
    { name: "X.Borg", color: S },
    { name: "Cici", color: S },
  ];
  return (
    <div className="mt-5 flex items-center gap-3">
      <div className="flex flex-col items-center gap-1">
        <HeroDot name="Phoveus" color={A} />
        <span className="text-[6px] font-bold text-rose-300 uppercase">EXP Main</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <div className="grid grid-cols-3 gap-1">
          {backups.map((b, i) => (
            <HeroDotSmall key={i} name={b.name} color={i < 2 ? b.color : "bg-white/[0.06] border border-white/10"} />
          ))}
        </div>
        <span className="text-[6px] text-slate-500">6 cadangan</span>
      </div>
      <div className="text-[7px] text-slate-500 max-w-[100px] leading-tight">
        Kalau Phoveus diambil lawan, cadangan ini siap jadi rencana berikutnya.
      </div>
    </div>
  );
}

function FilledBoardVisual() {
  return (
    <div className="mt-5 rounded-xl border border-white/[0.08] bg-[#0c1222] p-2.5 text-[7px]">
      <div className="flex gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-1 mb-1.5">
            <div className="h-1 w-1 rounded-full bg-blue-400" />
            <span className="font-bold text-blue-300 uppercase">Blue Side</span>
          </div>
          <div className="flex gap-0.5 mb-1">
            {["Fanny", "Chip", "Arlott", "Zhuxin", "Kalea"].map((h) => (
              <HeroDotSmall key={h} name={h} color={R} />
            ))}
          </div>
          <div className="flex gap-0.5 mb-1.5">
            {["Baxia", "Claude", "Phov", "Grock", "Valen"].map((h) => (
              <HeroDotSmall key={h} name={h} color={C} />
            ))}
          </div>
          <div className="flex gap-1 text-center">
            {[
              { l: "EXP", h: "Phoveus", c: A },
              { l: "JGL", h: "Fanny", c: R },
              { l: "MID", h: "Valen", c: P },
              { l: "GOLD", h: "Claude", c: C },
              { l: "ROAM", h: "Baxia", c: B },
            ].map((x) => (
              <div key={x.l} className="flex flex-col items-center gap-0.5">
                <span className="text-[5px] font-bold text-slate-500">{x.l}</span>
                <div className="grid grid-cols-3 gap-px">
                  {[1, 2, 3, 4, 5, 6].map((j) => (
                    <div key={j} className={`h-2 w-2 rounded-full ${j <= 1 ? "bg-white/10" : "border border-dashed border-white/[0.06]"}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="w-px bg-white/[0.06]" />
        <div className="flex-1">
          <div className="flex items-center gap-1 mb-1.5">
            <div className="h-1 w-1 rounded-full bg-rose-400" />
            <span className="font-bold text-rose-300 uppercase">Red Side</span>
          </div>
          <div className="flex gap-0.5 mb-1">
            {["Nolan", "Fredrinn", "Gloo", "Mathilda", "Novaria"].map((h) => (
              <HeroDotSmall key={h} name={h} color={R} />
            ))}
          </div>
          <div className="flex gap-0.5 mb-1.5">
            {["Phov", "Valen", "Fred", "Gloo", "Nolan"].map((h) => (
              <HeroDotSmall key={h} name={h} color={C} />
            ))}
          </div>
          <div className="flex gap-1 text-center">
            {[
              { l: "ROAM", h: "Gloo", c: E },
              { l: "GOLD", h: "Nolan", c: C },
              { l: "MID", h: "Valen", c: P },
              { l: "JGL", h: "Fred", c: R },
              { l: "EXP", h: "Phov", c: A },
            ].map((x) => (
              <div key={x.l} className="flex flex-col items-center gap-0.5">
                <span className="text-[5px] font-bold text-slate-500">{x.l}</span>
                <div className="grid grid-cols-3 gap-px">
                  {[1, 2, 3, 4, 5, 6].map((j) => (
                    <div key={j} className={`h-2 w-2 rounded-full ${j <= 1 ? "bg-white/10" : "border border-dashed border-white/[0.06]"}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ExportMockVisual() {
  return (
    <div className="mt-5 flex items-start gap-3">
      <div className="flex-1 rounded-xl border border-white/[0.08] bg-[#0c1222] p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <BookOpen className="h-3 w-3 text-slate-400" />
          <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider">Coach Notes</span>
        </div>
        <div className="space-y-1 mb-2">
          <span className="text-[7px] text-slate-500 leading-relaxed block">Win condition: Late game scaling</span>
          <span className="text-[7px] text-slate-500 leading-relaxed block">Ban target: Fanny, Chip</span>
          <span className="text-[7px] text-slate-500 leading-relaxed block">Power spike: Mid game after 2 items</span>
        </div>
        <div className="border-t border-white/[0.06] pt-2">
          <FilledBoardVisual />
        </div>
      </div>
      <div className="flex flex-col items-center gap-1.5 pt-1">
        <div className="w-14 h-14 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
          <Download className="h-5 w-5 text-amber-400" />
        </div>
        <span className="text-[7px] font-bold text-amber-300 uppercase">Save</span>
        <div className="rounded border border-white/[0.06] bg-white/[0.02] px-1.5 py-0.5 flex items-center gap-1">
          <Image className="h-2.5 w-2.5 text-slate-500" />
          <span className="text-[6px] text-slate-500">.png</span>
        </div>
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
        <p className="text-[13px] text-slate-400 leading-relaxed">
          Bayangin ini papan strategi sebelum draft dimulai. Di sini kamu bisa atur ban, susun pick utama, siapin hero cadangan per lane, dan tulis catatan strategi. Kamu bisa bikin plan A, plan B, dan cadangan kalau hero incaran diambil atau diban lawan.
        </p>
      ),
      visual: <IntroVisual />,
    },
    {
      icon: <Layers className="h-5 w-5 text-cyan-400" />,
      title: "Tournament & Draft List",
      description: (
        <p className="text-[13px] text-slate-400 leading-relaxed">
          Mulai dari bikin tournament dulu sebagai folder utama, lalu tambahkan draft plan di dalamnya. Satu tournament bisa punya banyak draft untuk berbagai skenario. Klik + NEW untuk bikin tournament baru, atau ADD DRAFT untuk nambah rencana draft.
        </p>
      ),
      visual: <SidebarVisual />,
    },
    {
      icon: <ToggleLeft className="h-5 w-5 text-blue-400" />,
      title: "Pilih Side Kita",
      description: (
        <p className="text-[13px] text-slate-400 leading-relaxed">
          Pilih "Our Blue" kalau tim kamu main di blue side, atau "Our Red" kalau main di red side. Badge OURS akan pindah sesuai pilihanmu. Ini bantu kamu dan coach tahu sisi mana yang jadi fokus perencanaan draft.
        </p>
      ),
      visual: <SideToggleVisual />,
    },
    {
      icon: <Ban className="h-5 w-5 text-rose-400" />,
      title: "Ban Plan",
      description: (
        <p className="text-[13px] text-slate-400 leading-relaxed">
          Setiap side punya 5 slot ban. Isi hero yang mau kamu banned dari lawan. Bisa untuk target power pick, comfort hero musuh, atau hero yang bisa ganggu komposisi kamu. Klik slot lingkaran untuk pilih hero.
        </p>
      ),
      visual: <BanVisual />,
    },
    {
      icon: <Swords className="h-5 w-5 text-cyan-400" />,
      title: "Pick Plan",
      description: (
        <p className="text-[13px] text-slate-400 leading-relaxed">
          Isi hero utama yang akan masuk draft. Pick ini jadi rencana inti komposisi tim kamu. Kalau lawan ambil hero tertentu, pick bisa berubah, tapi setidaknya kamu sudah punya plan awal yang jelas untuk tiap lane.
        </p>
      ),
      visual: <PickVisual />,
    },
    {
      icon: <Crosshair className="h-5 w-5 text-amber-400" />,
      title: "Role Lane Plan",
      description: (
        <p className="text-[13px] text-slate-400 leading-relaxed">
          Setiap pick dikaitkan ke role lane: EXP, Jungle, Mid, Gold, Roam. Lane membantu kamu lihat apakah draft sudah lengkap atau masih kurang. Urutan lane berbeda untuk Blue dan Red side, jadi perhatikan posisinya.
        </p>
      ),
      visual: <LaneVisual />,
    },
    {
      icon: <Users className="h-5 w-5 text-emerald-400" />,
      title: "Backup Hero Per Lane",
      description: (
        <p className="text-[13px] text-slate-400 leading-relaxed">
          Setiap lane punya 6 slot hero cadangan. Ini penting banget. Kalau hero utama kamu kena ban, diambil lawan, atau draft berubah total, cadangan ini jadi rencana berikutnya. Jadi rencana kamu nggak berhenti di satu hero.
        </p>
      ),
      visual: <BackupVisual />,
    },
    {
      icon: <Shield className="h-5 w-5 text-cyan-400" />,
      title: "Contoh Board Yang Sudah Terisi",
      description: (
        <p className="text-[13px] text-slate-400 leading-relaxed">
          Ini gambaran board yang sudah terisi penuh. Ban sudah ditentukan, pick utama sudah masuk, dan backup hero per lane sudah disiapkan. Dari sini kamu bisa langsung lihat apakah draft sudah seimbang atau perlu adjustment.
        </p>
      ),
      visual: <FilledBoardVisual />,
    },
    {
      icon: <Download className="h-5 w-5 text-amber-400" />,
      title: "Coach Notes & Export",
      description: (
        <p className="text-[13px] text-slate-400 leading-relaxed">
          Tulis catatan strategi seperti win condition, target ban, power spike, matchup penting, atau rotasi awal. Kalau draft plan kamu sudah siap, tekan Save untuk menyimpan hasil board ini sebagai gambar PNG. Hasil download bisa dipakai untuk arsip, diskusi tim, atau dibagikan ke coaching staff.
        </p>
      ),
      visual: <ExportMockVisual />,
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
        {restartNotice && (
          <div className="mb-4 mx-auto w-fit rounded-lg bg-cyan-500/15 border border-cyan-500/25 px-4 py-2 text-[11px] font-bold text-cyan-300 animate-pulse">
            Tutorial diulang dari awal.
          </div>
        )}

        <div className="flex items-center justify-center gap-1.5 mb-5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-cyan-400" : i < step ? "w-2 bg-cyan-600" : "w-2 bg-white/10"
              }`}
            />
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0a1020] shadow-2xl overflow-hidden">
          <div className="px-7 pt-6 pb-5">
            <div className="flex items-center gap-2.5 mb-3">
              {currentStep.icon}
              <h2 className="text-base font-black text-white font-display">{currentStep.title}</h2>
              <span className="ml-auto text-[9px] font-mono text-slate-600">{step + 1}/{steps.length}</span>
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
              <button onClick={() => handleExitConfirm("workspace")} className="w-full px-4 py-2.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 transition cursor-pointer">Lanjut ke Workspace</button>
              <button onClick={() => handleExitConfirm("restart")} className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-xs font-bold text-slate-400 hover:text-white hover:border-white/20 transition cursor-pointer">Mulai Ulang</button>
              <button onClick={() => handleExitConfirm("stay")} className="w-full px-4 py-2.5 rounded-lg text-[11px] font-bold text-slate-600 hover:text-slate-400 transition cursor-pointer">Tetap di Tutorial</button>
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
