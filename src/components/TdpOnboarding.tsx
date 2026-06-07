import React, { useState } from "react";
import { PlayCircle, BookOpen, Download, Target, X } from "lucide-react";
import FallbackImage from "./FallbackImage";
import { getHeroImageUrl } from "../lib/heroUtils";
import { HeroStats } from "../types";

const TUTORIAL_STORAGE_KEY = "tdp_tutorial_completed";

function HeroPreview({ name, heroAssets }: { name: string; heroAssets: Record<string, string> }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="h-9 w-9 overflow-hidden rounded-lg border border-white/10 bg-[#060d1a]">
        <FallbackImage
          src={getHeroImageUrl(name, heroAssets)}
          fallbackText={name}
          alt={name}
          className="h-full w-full object-cover"
          containerClassName="h-full w-full text-[5px]"
        />
      </div>
      <span className="text-[7px] text-slate-500 truncate w-9 text-center">{name}</span>
    </div>
  );
}

function SmallDot({ name, heroAssets }: { name: string; heroAssets: Record<string, string> }) {
  return (
    <div className="h-5 w-5 overflow-hidden rounded-full border border-white/10 bg-[#060d1a]">
      <FallbackImage
        src={getHeroImageUrl(name, heroAssets)}
        fallbackText={name}
        alt={name}
        className="h-full w-full object-cover"
        containerClassName="h-full w-full text-[3px]"
      />
    </div>
  );
}

function EmptyDot({ size = "normal" }: { size?: "normal" | "small" }) {
  return size === "small"
    ? <div className="h-5 w-5 rounded-full border border-dashed border-white/10 bg-white/[0.02]" />
    : <div className="h-9 w-9 rounded-full border-2 border-dashed border-white/10 bg-white/[0.02]" />;
}

interface TdpOnboardingProps {
  onComplete: () => void;
  onStartTour: () => void;
  heroAssets: Record<string, string>;
}

export default function TdpOnboarding({ onComplete, onStartTour, heroAssets }: TdpOnboardingProps) {
  const [hovered, setHovered] = useState(false);

  const handleStartTour = () => {
    try { localStorage.setItem(TUTORIAL_STORAGE_KEY, "true"); } catch {}
    onStartTour();
  };

  const handleSkip = () => {
    try { localStorage.setItem(TUTORIAL_STORAGE_KEY, "true"); } catch {}
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#040810]">
      <div className="w-full max-w-2xl mx-4">
        <div className="rounded-2xl border border-white/10 bg-[#0a1020] shadow-2xl overflow-hidden">
          <div className="px-8 pt-8 pb-4">
            <div className="flex items-center gap-3 mb-4">
              <Target className="h-6 w-6 text-cyan-400" />
              <h1 className="text-xl font-black text-white font-display">Team Draft Planner</h1>
            </div>
            <p className="text-[14px] text-slate-400 leading-relaxed mb-1">
              Papan strategi untuk nyusun rencana draft sebelum match. Kamu bisa siapin ban, pick utama, role tiap lane, hero cadangan, dan catatan strategi dalam satu tempat.
            </p>
            <p className="text-[12px] text-slate-500 leading-relaxed">
              Cocok dipakai buat latihan draft, briefing tim, atau nyusun plan A dan plan B sebelum main.
            </p>
          </div>

          {/* Mini board preview with real hero images */}
          <div className="px-8 pb-4">
            <div className="rounded-xl border border-white/[0.08] bg-[#0c1222] p-3">
              <div className="flex gap-3">
                <div className="flex-1 rounded-lg border border-blue-500/15 bg-blue-950/20 p-2">
                  <div className="flex items-center gap-1 mb-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                    <span className="text-[8px] font-bold text-blue-300 uppercase tracking-wider">Blue Side</span>
                  </div>
                  <div className="flex gap-1 mb-1.5">
                    {["Fanny", "Chip"].map((h) => <SmallDot key={h} name={h} heroAssets={heroAssets} />)}
                    {[1, 2, 3].map((i) => <EmptyDot key={i} size="small" />)}
                  </div>
                  <div className="flex gap-1">
                    {["Baxia", "Claude", "Phoveus"].map((h) => <SmallDot key={h} name={h} heroAssets={heroAssets} />)}
                    {[1, 2].map((i) => <EmptyDot key={i} size="small" />)}
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center px-1">
                  <span className="text-[10px] font-black text-slate-600">VS</span>
                </div>
                <div className="flex-1 rounded-lg border border-rose-500/15 bg-rose-950/20 p-2">
                  <div className="flex items-center gap-1 mb-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                    <span className="text-[8px] font-bold text-rose-300 uppercase tracking-wider">Red Side</span>
                  </div>
                  <div className="flex gap-1 mb-1.5">
                    {["Arlott", "Valentina"].map((h) => <SmallDot key={h} name={h} heroAssets={heroAssets} />)}
                    {[1, 2, 3].map((i) => <EmptyDot key={i} size="small" />)}
                  </div>
                  <div className="flex gap-1">
                    {["Fredrinn"].map((h) => <SmallDot key={h} name={h} heroAssets={heroAssets} />)}
                    {[1, 2, 3, 4].map((i) => <EmptyDot key={i} size="small" />)}
                  </div>
                </div>
              </div>

              {/* Role lanes with real heroes */}
              <div className="flex gap-2 mt-3 pt-2 border-t border-white/[0.04]">
                {[
                  { lane: "EXP", hero: "Phoveus" },
                  { lane: "JGL", hero: "Baxia" },
                  { lane: "MID", hero: "Valentina" },
                  { lane: "GOLD", hero: "Claude" },
                  { lane: "ROAM", hero: "Fredrinn" },
                ].map((x) => (
                  <div key={x.lane} className="flex flex-col items-center gap-0.5 flex-1">
                    <SmallDot name={x.hero} heroAssets={heroAssets} />
                    <span className="text-[6px] font-bold text-slate-600 uppercase">{x.lane}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Features list */}
          <div className="px-8 pb-4">
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: <Target className="h-3.5 w-3.5 text-rose-400" />, label: "5 Ban per Side" },
                { icon: <PlayCircle className="h-3.5 w-3.5 text-cyan-400" />, label: "5 Pick per Side" },
                { icon: <BookOpen className="h-3.5 w-3.5 text-amber-400" />, label: "6 Backup per Lane" },
                { icon: <Download className="h-3.5 w-3.5 text-emerald-400" />, label: "Export PNG" },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] px-2 py-1.5">
                  {f.icon}
                  <span className="text-[9px] font-bold text-slate-400">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="border-t border-white/[0.06] px-8 py-4 flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-[11px] font-bold text-slate-600 hover:text-slate-400 transition cursor-pointer uppercase tracking-wider"
            >
              Lewati dan Masuk TDP
            </button>
            <button
              onClick={handleStartTour}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-[12px] font-bold text-cyan-300 hover:bg-cyan-500/30 transition cursor-pointer"
            >
              <PlayCircle className="h-4 w-4" />
              Mulai Tur Interface
            </button>
          </div>
        </div>
      </div>
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
