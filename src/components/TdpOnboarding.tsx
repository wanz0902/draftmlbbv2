import React, { useState } from "react";
import { Ban, PlayCircle, BookOpen, Download, Target, Shield, Swords } from "lucide-react";
import FallbackImage from "./FallbackImage";
import { getHeroImageUrl } from "../lib/heroUtils";

const TUTORIAL_STORAGE_KEY = "tdp_tutorial_completed";

function HeroImg({ name, heroAssets, size }: { name: string; heroAssets: Record<string, string>; size?: "sm" | "md" | "lg" }) {
  const s = size === "lg" ? "h-12 w-12" : size === "md" ? "h-8 w-8" : "h-5 w-5";
  const r = size === "lg" ? "rounded-xl" : size === "md" ? "rounded-lg" : "rounded-full";
  const txt = size === "lg" ? "text-[7px]" : size === "md" ? "text-[5px]" : "text-[3px]";
  return (
    <div className={`${s} ${r} overflow-hidden border border-white/10 bg-[#060d1a] shrink-0`}>
      <FallbackImage src={getHeroImageUrl(name, heroAssets)} fallbackText={name} alt={name} className="h-full w-full object-cover" containerClassName={`h-full w-full ${txt}`} />
    </div>
  );
}

function EmptySlot({ size }: { size: "sm" | "md" | "lg" }) {
  const s = size === "lg" ? "h-12 w-12 rounded-xl" : size === "md" ? "h-8 w-8 rounded-lg" : "h-5 w-5 rounded-full";
  return <div className={`${s} border border-dashed border-white/10 bg-white/[0.02] shrink-0`} />;
}

interface TdpOnboardingProps {
  onComplete: () => void;
  onStartTour: () => void;
  heroAssets: Record<string, string>;
}

export default function TdpOnboarding({ onComplete, onStartTour, heroAssets }: TdpOnboardingProps) {
  const handleStartTour = () => {
    try { localStorage.setItem(TUTORIAL_STORAGE_KEY, "true"); } catch {}
    onStartTour();
  };

  const handleSkip = () => {
    try { localStorage.setItem(TUTORIAL_STORAGE_KEY, "true"); } catch {}
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#030710]">
      <div className="w-full max-w-3xl mx-4">
        <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#0a1228] to-[#060d1a] shadow-[0_0_80px_rgba(34,211,238,0.06)] overflow-hidden">

          {/* Header with glow */}
          <div className="relative px-10 pt-10 pb-6">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-cyan-500/5 blur-[60px] rounded-full" />
            <div className="relative flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Target className="h-5 w-5 text-cyan-400" />
              </div>
              <h1 className="text-2xl font-black text-white font-display tracking-tight">Team Draft Planner</h1>
            </div>
            <p className="relative text-[15px] text-slate-300 leading-relaxed mb-2 max-w-xl">
              Papan strategi untuk nyusun rencana draft sebelum match. Kamu bisa siapin ban, pick utama, role tiap lane, hero cadangan, dan catatan strategi dalam satu tempat.
            </p>
            <p className="relative text-[13px] text-slate-500 leading-relaxed max-w-xl">
              Cocok dipakai buat latihan draft, briefing tim, atau nyusun plan A dan plan B sebelum main.
            </p>
          </div>

          {/* Board preview — full width, more visual */}
          <div className="px-8 pb-5">
            <div className="rounded-2xl border border-white/[0.06] bg-[#080e1c] overflow-hidden">
              {/* Blue vs Red panels */}
              <div className="grid grid-cols-2 gap-0">
                {/* Blue Side */}
                <div className="p-4 border-r border-white/[0.04]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.5)]" />
                    <span className="text-[9px] font-bold text-blue-300 uppercase tracking-wider">Blue Side</span>
                    <span className="ml-auto rounded bg-blue-500/15 border border-blue-500/20 px-1.5 py-0.5 text-[7px] font-bold text-blue-300">OURS</span>
                  </div>
                  {/* Bans */}
                  <div className="mb-2">
                    <span className="text-[7px] font-bold text-rose-400/50 uppercase tracking-wider">Bans</span>
                    <div className="flex gap-1 mt-1">
                      {["Fanny", "Chip"].map((h) => <HeroImg key={h} name={h} heroAssets={heroAssets} size="sm" />)}
                      {[1, 2, 3].map((i) => <EmptySlot key={i} size="sm" />)}
                    </div>
                  </div>
                  {/* Picks */}
                  <div>
                    <span className="text-[7px] font-bold text-cyan-400/50 uppercase tracking-wider">Picks</span>
                    <div className="flex gap-1 mt-1">
                      {["Baxia", "Claude", "Phoveus"].map((h) => <HeroImg key={h} name={h} heroAssets={heroAssets} size="sm" />)}
                      {[1, 2].map((i) => <EmptySlot key={i} size="sm" />)}
                    </div>
                  </div>
                </div>

                {/* Red Side */}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(248,113,113,0.5)]" />
                    <span className="text-[9px] font-bold text-rose-300 uppercase tracking-wider">Red Side</span>
                  </div>
                  <div className="mb-2">
                    <span className="text-[7px] font-bold text-rose-400/50 uppercase tracking-wider">Bans</span>
                    <div className="flex gap-1 mt-1">
                      {["Arlott", "Valentina"].map((h) => <HeroImg key={h} name={h} heroAssets={heroAssets} size="sm" />)}
                      {[1, 2, 3].map((i) => <EmptySlot key={i} size="sm" />)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[7px] font-bold text-cyan-400/50 uppercase tracking-wider">Picks</span>
                    <div className="flex gap-1 mt-1">
                      {["Fredrinn"].map((h) => <HeroImg key={h} name={h} heroAssets={heroAssets} size="sm" />)}
                      {[1, 2, 3, 4].map((i) => <EmptySlot key={i} size="sm" />)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Role lanes row */}
              <div className="grid grid-cols-5 border-t border-white/[0.04]">
                {[
                  { lane: "EXP", hero: "Phoveus", color: "text-rose-400", bg: "bg-rose-500/10" },
                  { lane: "JGL", hero: "Baxia", color: "text-blue-400", bg: "bg-blue-500/10" },
                  { lane: "MID", hero: "Valentina", color: "text-slate-300", bg: "bg-slate-400/10" },
                  { lane: "GOLD", hero: "Claude", color: "text-yellow-400", bg: "bg-yellow-500/10" },
                  { lane: "ROAM", hero: "Fredrinn", color: "text-emerald-400", bg: "bg-emerald-500/10" },
                ].map((x) => (
                  <div key={x.lane} className="flex flex-col items-center gap-1.5 py-3 border-r border-white/[0.04] last:border-r-0">
                    <HeroImg name={x.hero} heroAssets={heroAssets} size="md" />
                    <span className={`text-[8px] font-black uppercase tracking-wider ${x.color}`}>{x.lane}</span>
                  </div>
                ))}
              </div>

              {/* Backup hero preview */}
              <div className="border-t border-white/[0.04] px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[8px] font-bold text-emerald-400/50 uppercase tracking-wider">Backup Heroes — EXP Lane</span>
                </div>
                <div className="flex gap-1.5">
                  {["Terizla", "Yu Zhong", "Edith", "Khaleed", "X.Borg", "Cici"].map((h) => (
                    <HeroImg key={h} name={h} heroAssets={heroAssets} size="sm" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Feature badges */}
          <div className="px-8 pb-5">
            <div className="grid grid-cols-4 gap-2.5">
              {[
                { icon: <Ban className="h-4 w-4" />, label: "5 Ban per Side", color: "text-rose-400", border: "border-rose-500/15" },
                { icon: <Swords className="h-4 w-4" />, label: "5 Pick per Side", color: "text-cyan-400", border: "border-cyan-500/15" },
                { icon: <Shield className="h-4 w-4" />, label: "6 Backup per Lane", color: "text-emerald-400", border: "border-emerald-500/15" },
                { icon: <Download className="h-4 w-4" />, label: "Export PNG", color: "text-amber-400", border: "border-amber-500/15" },
              ].map((f) => (
                <div key={f.label} className={`flex items-center justify-center gap-2 rounded-xl border ${f.border} bg-white/[0.02] py-2.5`}>
                  <span className={f.color}>{f.icon}</span>
                  <span className="text-[10px] font-bold text-slate-400">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-white/[0.06] px-8 py-5 flex items-center justify-between bg-white/[0.01]">
            <button
              onClick={handleSkip}
              className="text-[11px] font-bold text-slate-600 hover:text-slate-400 transition cursor-pointer uppercase tracking-wider"
            >
              Lewati dan Masuk TDP
            </button>
            <button
              onClick={handleStartTour}
              className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-cyan-500/10 border border-cyan-500/30 text-[13px] font-bold text-cyan-300 hover:from-cyan-500/30 hover:to-cyan-500/15 transition cursor-pointer shadow-[0_0_20px_rgba(34,211,238,0.1)]"
            >
              <PlayCircle className="h-5 w-5" />
              Mulai Tur Interface
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function isTdpTutorialCompleted(): boolean {
  try { return localStorage.getItem(TUTORIAL_STORAGE_KEY) === "true"; } catch { return false; }
}

export function resetTdpTutorial(): void {
  try { localStorage.removeItem(TUTORIAL_STORAGE_KEY); } catch {}
}
