import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { DetailedHero } from "../types/hero";
import { motion, AnimatePresence } from "motion/react";
import { cleanText, cleanArrayJoin, getHeroImageUrl } from "../lib/heroUtils";
import FallbackImage from "./FallbackImage";
import {
  X,
  ArrowLeft,
  Target,
  Sword,
  Shield,
  Zap,
  Activity,
  Crosshair,
  Swords,
  ChevronDown,
  BrainCircuit,
  BarChart4,
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";

interface Props {
  hero: DetailedHero;
  onClose: () => void;
  heroAssets: Record<string, string>;
}

type TabType = "overview" | "skills" | "draft" | "stats";

export default function HeroDetailPanel({ hero, onClose, heroAssets }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);

  useEffect(() => {
    // Lock body scroll and prevent layout shift
    const scrollBarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollBarWidth}px`;

    // ESC key support
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const heroImage = getHeroImageUrl(hero.hero_name || hero.name, heroAssets);

  const radarData = [
    { subject: "Early Game", A: hero.early_game || 6, fullMark: 10 },
    { subject: "Mid Game", A: hero.mid_game || 7, fullMark: 10 },
    { subject: "Late Game", A: hero.late_game || 6, fullMark: 10 },
    { subject: "Farming", A: hero.farming_speed || 6, fullMark: 10 },
    { subject: "Teamfight", A: hero.teamfight_value || 6, fullMark: 10 },
    { subject: "Mobility", A: hero.mobility || 6, fullMark: 10 },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl h-[90vh] bg-[#060b13] border border-blue-900/50 shadow-2xl flex flex-col rounded-xl overflow-hidden relative"
      >
        {/* TOP HEADER / ABOVE THE FOLD */}
        <div className="relative shrink-0 flex flex-col bg-gradient-to-b from-blue-950/20 to-transparent border-b border-gray-800/50">
          <button
            onClick={onClose}
            className="absolute left-4 top-4 z-20 flex items-center gap-1.5 rounded-xl border border-white/10 bg-gray-800/90 px-3 py-2 text-sm text-gray-200 transition-colors hover:bg-gray-700"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali
          </button>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-20 rounded-xl border border-gray-700 bg-black/60 p-2 text-white transition-colors hover:bg-red-500/80"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col md:flex-row gap-6 p-6 pb-4 relative z-10">
            {/* Hero Image */}
            <div className="w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 rounded-xl border-2 border-blue-500/30 overflow-hidden shadow-lg shadow-blue-900/40 shrink-0 bg-[#0a1120]">
              <FallbackImage
                src={heroImage}
                fallbackText={hero.hero_name || "Unknown"}
                alt={cleanText(hero.hero_name, "Unknown")}
                className="w-full h-full object-cover"
                containerClassName="w-full h-full flex items-center justify-center text-4xl"
              />
            </div>

            {/* Core Info */}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <h2 className="text-3xl md:text-5xl font-bold font-sans text-white uppercase tracking-tight">
                    {hero.hero_name}
                  </h2>
                  <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 font-mono text-xs px-2 py-0.5 rounded font-bold">
                    TIER {hero.tier || "A"}
                  </span>
                  <span className="bg-blue-900/40 text-blue-300 border border-blue-500/30 font-mono text-xs px-2 py-0.5 rounded">
                    {hero.damage_type}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 text-sm text-gray-400 mt-2">
                  <div className="flex items-center gap-1">
                    <Shield className="w-4 h-4 text-emerald-400" />{" "}
                    {cleanArrayJoin(hero.role)}
                  </div>
                  <span className="text-gray-600">&bull;</span>
                  <div className="flex items-center gap-1">
                    <Zap className="w-4 h-4 text-orange-400" />{" "}
                    {cleanArrayJoin(hero.specialty)}
                  </div>
                  <span className="text-gray-600">&bull;</span>
                  <div className="flex items-center gap-1 text-indigo-300">
                    <Target className="w-4 h-4" /> {cleanArrayJoin(hero.lanes)}
                  </div>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 mt-4 text-center">
                <div className="bg-[#101827] border border-gray-800 rounded p-2">
                  <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">
                    Win/Pick/Ban
                  </div>
                  <div className="text-xs font-bold font-mono text-emerald-400">
                    {(hero.win_rate || 0).toFixed(1)}% W
                  </div>
                  <div className="text-xs font-bold font-mono text-blue-400">
                    {(hero.pick_rate || 0).toFixed(1)}% P
                  </div>
                  <div className="text-xs font-bold font-mono text-red-400">
                    {(hero.ban_rate || 0).toFixed(1)}% B
                  </div>
                </div>
                <div className="bg-[#101827] border border-gray-800 rounded p-2">
                  <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">
                    Early / Mid / Late
                  </div>
                  <div className="text-xs font-bold font-mono text-gray-300">
                    {hero.early_game || 0} / {hero.mid_game || 0} /{" "}
                    {hero.late_game || 0}
                  </div>
                  <div className="text-[9px] text-gray-500 uppercase tracking-wider mt-1 border-t border-gray-800 pt-1">
                    Farming
                  </div>
                  <div className="text-xs font-bold font-mono text-yellow-300">
                    {hero.farming_speed || 0}/10
                  </div>
                </div>
                <div className="bg-[#101827] border border-gray-800 rounded p-2">
                  <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">
                    Fight / Obj / Mob
                  </div>
                  <div className="text-xs font-bold font-mono text-gray-300">
                    {hero.teamfight_value || 0} / {hero.objective_control || 0}{" "}
                    / {hero.mobility || 0}
                  </div>
                  <div className="text-[9px] text-gray-500 uppercase tracking-wider mt-1 border-t border-gray-800 pt-1">
                    Crowd Control
                  </div>
                  <div className="text-xs font-bold font-mono text-red-400">
                    {hero.crowd_control || 0}/10
                  </div>
                </div>
                <div className="bg-[#101827] border border-gray-800 rounded p-2 col-span-2">
                  <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">
                    Power Spike
                  </div>
                  <div className="text-xs md:text-sm font-bold font-sans text-yellow-300 flex items-center justify-center h-[24px]">
                    {hero.power_spike &&
                    hero.power_spike.length > 0 &&
                    hero.power_spike[0] !== "Unknown" ? (
                      cleanArrayJoin(hero.power_spike, " & ")
                    ) : (
                      <span className="text-[10px] text-gray-500 uppercase font-mono tracking-widest leading-tight">
                        Not Documented
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] text-gray-500 uppercase tracking-wider mt-1 border-t border-gray-800 pt-1">
                    Meta Status
                  </div>
                  <div className="text-xs font-bold font-mono text-purple-400">
                    {hero.tournament_presence > 20
                      ? "META PICK"
                      : hero.tournament_presence > 5
                        ? "SITUATIONAL"
                        : "NICHE PICK"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Navigation Tabs */}
          <div className="flex overflow-x-auto custom-scrollbar px-6 gap-4 border-b border-gray-800/80 bg-black/20 mt-2">
            {[
              { id: "overview", label: "Overview", icon: Activity },
              { id: "skills", label: "Skills", icon: Swords },
              { id: "draft", label: "Draft & Matchups", icon: BrainCircuit },
              { id: "stats", label: "Pro Stats", icon: BarChart4 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? "text-blue-400 border-blue-500 bg-blue-900/10"
                      : "text-gray-400 border-transparent hover:text-gray-200 hover:border-gray-600"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* SCROLLABLE CONTENT AREA */}
        <div
          className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar relative bg-[#0a1120] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed"
          style={{ backgroundBlendMode: "overlay" }}
        >
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in text-gray-200">
              <div className="lg:col-span-2 space-y-6">
                {/* Visual Indicators Summary Box */}
                <div className="bg-[#101827] p-5 rounded-xl border border-gray-800 shadow-md flex flex-col gap-4">
                  <h3 className="font-bold uppercase tracking-wider text-sm text-gray-400 flex items-center gap-2">
                    <Activity className="text-emerald-400 w-4 h-4" />
                    Quick Performance Summary
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm mt-2">
                    {[
                      { label: "Early Game", value: hero.early_game },
                      { label: "Mid Game", value: hero.mid_game },
                      { label: "Late Game", value: hero.late_game },
                      { label: "Teamfight Value", value: hero.teamfight_value },
                      {
                        label: "Objective Control",
                        value: hero.objective_control,
                      },
                      { label: "Crowd Control", value: hero.crowd_control },
                    ].map((stat, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-4"
                      >
                        <span className="w-32 text-gray-400">{stat.label}</span>
                        <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${stat.value >= 8 ? "bg-emerald-400" : stat.value >= 5 ? "bg-blue-400" : "bg-red-400"}`}
                            style={{
                              width: `${Math.min(100, ((stat.value || 0) / 10) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-mono text-gray-500 w-4 font-bold">
                          {stat.value || 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#101827] p-5 rounded-xl border border-gray-800 shadow-md">
                  <h3 className="font-bold uppercase tracking-wider text-sm text-gray-400 mb-4">
                    Base Stats (Level 1)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase">
                        HP
                      </div>
                      <div className="font-mono text-lg">
                        {hero.base_stats?.hp || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase">
                        Physical ATK
                      </div>
                      <div className="font-mono text-lg text-orange-400">
                        {hero.base_stats?.physicalAttack || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase">
                        Magic PWR
                      </div>
                      <div className="font-mono text-lg text-purple-400">
                        {hero.base_stats?.magicPower || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase">
                        Move Speed
                      </div>
                      <div className="font-mono text-lg">
                        {hero.base_stats?.movementSpeed || "-"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div className="bg-[#101827] rounded-xl border border-gray-800 p-4 h-64 flex flex-col items-center">
                  <h3 className="font-bold uppercase tracking-wider text-xs text-gray-400 w-full text-center mb-2">
                    Capability Radar
                  </h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart
                      cx="50%"
                      cy="50%"
                      outerRadius="70%"
                      data={radarData}
                    >
                      <PolarGrid stroke="#1f2937" />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{
                          fill: "#9ca3af",
                          fontSize: 10,
                          fontFamily: "monospace",
                        }}
                      />
                      <Radar
                        name="Hero"
                        dataKey="A"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.4}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-gradient-to-br from-indigo-900/30 to-transparent border border-indigo-500/20 rounded-xl p-4">
                  <h3 className="font-bold uppercase tracking-wider text-xs text-indigo-400 mb-3">
                    Macro Identity
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {hero.draft_analysis?.macro_identity?.map(
                      (id: string, i: number) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-indigo-950/50 border border-indigo-500/30 text-indigo-200 text-xs rounded shadow"
                        >
                          {id}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SKILLS TAB */}
          {activeTab === "skills" && (
            <div className="animate-fade-in max-w-4xl mx-auto space-y-4">
              {/* Skill Videos */}
              {(() => {
                const sv = (hero as any).skillVideos || (hero as any).skill_videos;
                if (!sv) return null;
                const videoSrc = expandedSkill ? (sv[expandedSkill] || null) : (sv.passive || sv.skill1 || null);
                if (!videoSrc) return null;
                return (
                  <div className="bg-[#101827] rounded-xl border border-amber-500/10 overflow-hidden shadow-sm">
                    <div className="flex items-center gap-2 p-3 border-b border-gray-800/50">
                      <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span className="text-[9px] font-mono uppercase tracking-widest text-amber-400">Skill Video — {expandedSkill || "Passive"}</span>
                      <span className="text-[9px] font-mono text-gray-600 ml-auto">Loop · Tap skill to switch</span>
                    </div>
                    <video
                      key={videoSrc}
                      src={videoSrc}
                      className="w-full max-h-[320px] object-contain bg-black"
                      autoPlay
                      loop
                      muted
                      playsInline
                      poster={heroImage}
                    />
                  </div>
                );
              })()}
              {hero.skills &&
                Object.entries(hero.skills)
                  .filter(([k]) => k !== "extra")
                  .map(([key, sk]: [string, any]) => {
                    const isExp = expandedSkill === key;
                    return (
                      <div
                        key={key}
                        className="bg-[#101827] rounded-xl border border-gray-800 overflow-hidden shadow-sm"
                      >
                        <div
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-800/30 transition-colors"
                          onClick={() => setExpandedSkill(isExp ? null : key)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-900 border border-gray-700/50 rounded flex items-center justify-center shrink-0 overflow-hidden">
                              {sk.iconUrl ? (
                                <img 
                                  src={sk.iconUrl}
                                  alt={sk.name || key}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.querySelector('span')!.classList.remove('hidden'); }}
                                />
                              ) : null}
                              <span className={`font-mono text-[9px] font-bold text-gray-400 text-center leading-tight px-0.5 ${sk.iconUrl ? 'hidden' : ''}`}>
                                {sk.iconName 
                                  ? sk.iconName.replace(/_/g, ' ').split(' ').map((w: string) => w[0]).join('').substring(0, 3).toUpperCase()
                                  : String(key).replace("skill", "S").replace("passive", "P").replace("ultimate", "ULT").replace("extra", "EX").toUpperCase()
                                }
                              </span>
                            </div>
                            <div>
                              <h4 className="font-bold text-white text-lg leading-tight flex items-baseline gap-2">
                                <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-400 bg-indigo-900/30 px-1.5 py-0.5 rounded shrink-0">
                                  {sk.displayLabel || (key === 'passive' ? 'Passive' : key === 'skill1' ? 'Skill 1' : key === 'skill2' ? 'Skill 2' : key === 'ultimate' ? 'Ultimate' : 'Extra')}
                                </span>
                                <span>{cleanText(sk.name)}</span>
                              </h4>
                              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono mt-1">
                                {sk.damageType && sk.damageType !== "Not specified in source" && sk.damageType !== "None" 
                                  ? sk.damageType 
                                  : key === "passive" ? "Passive" : "Active"}{" "}
                                /{" "}
                                {sk.cooldown && sk.cooldown !== "0"
                                  ? sk.cooldown + "s"
                                  : "Passive"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {sk.strategicTags && Array.isArray(sk.strategicTags) && sk.strategicTags.slice(0, 3).map((tag: string, i: number) => (
                              <span key={i} className="hidden sm:inline-block px-1.5 py-0.5 bg-blue-900/20 border border-blue-500/10 rounded text-[9px] text-blue-400 font-mono">{tag}</span>
                            ))}
                            {isExp ? (
                              <ChevronDown className="w-5 h-5 text-gray-500 transform rotate-180 transition-transform" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-600 transition-transform" />
                            )}
                          </div>
                        </div>
                        <AnimatePresence>
                          {isExp && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="p-4 pt-0 border-t border-gray-800/50 text-gray-300 text-sm mt-3 space-y-4">
                                {/* Description */}
                                <div>
                                  <div className="text-[9px] text-gray-500 uppercase tracking-wider font-mono mb-1.5">Description</div>
                                  <p className="leading-relaxed whitespace-pre-line break-words">
                                    {cleanText(sk.description, "Skill description unavailable.")}
                                  </p>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                  <div className="bg-black/30 p-2.5 rounded border border-gray-800/50">
                                    <div className="text-[9px] text-gray-500 uppercase mb-1 font-mono">Mana Cost</div>
                                    <div className="font-mono text-sm">
                                      {sk.manaCost && sk.manaCost !== "0" ? sk.manaCost : "Not specified in source"}
                                    </div>
                                  </div>
                                  <div className="bg-black/30 p-2.5 rounded border border-gray-800/50">
                                    <div className="text-[9px] text-gray-500 uppercase mb-1 font-mono">Damage Type</div>
                                    <div className="font-mono text-sm text-orange-300">
                                      {sk.damageType && sk.damageType !== "Not specified in source" ? sk.damageType : "Not specified in source"}
                                    </div>
                                  </div>
                                  <div className="bg-black/30 p-2.5 rounded border border-gray-800/50">
                                    <div className="text-[9px] text-gray-500 uppercase mb-1 font-mono">Cooldown</div>
                                    <div className="font-mono text-sm">
                                      {sk.cooldown && sk.cooldown !== "0" ? sk.cooldown + "s" : "Passive"}
                                    </div>
                                  </div>
                                </div>

                                {/* Damage Scaling - full width, no truncate */}
                                {sk.scaling && Array.isArray(sk.scaling) && sk.scaling.length > 0 && sk.scaling[0] !== "None" && (
                                  <div className="bg-black/30 p-2.5 rounded border border-gray-800/50">
                                    <div className="text-[9px] text-gray-500 uppercase mb-1 font-mono">Damage Scaling</div>
                                    <div className="font-mono text-sm text-yellow-400 break-words">
                                      {sk.scaling.join(" + ")}
                                    </div>
                                  </div>
                                )}

                                {/* Strategic Tags & CC */}
                                <div className="flex flex-wrap gap-2">
                                  {sk.strategicTags && Array.isArray(sk.strategicTags) && sk.strategicTags.length > 0 && sk.strategicTags.map((tag: string, i: number) => (
                                    <span key={i} className="px-2 py-0.5 bg-blue-900/30 border border-blue-500/20 rounded text-xs text-blue-300 font-mono">{tag}</span>
                                  ))}
                                  {sk.crowdControlType && Array.isArray(sk.crowdControlType) && sk.crowdControlType.length > 0 && sk.crowdControlType.map((cc: string, i: number) => (
                                    <span key={`cc-${i}`} className="px-2 py-0.5 bg-red-900/30 border border-red-500/20 rounded text-xs text-red-300 font-mono">{cc}</span>
                                  ))}
                                </div>

                                {/* Scaling Table */}
                                {sk.scalingTable && Array.isArray(sk.scalingTable) && sk.scalingTable.length > 0 && (
                                  <div className="mt-2">
                                    <div className="text-[9px] text-gray-500 uppercase tracking-wider font-mono mb-2">Scaling by Level</div>
                                    <div className="overflow-x-auto rounded border border-gray-800/50">
                                      <table className="w-full text-xs font-mono">
                                        <thead>
                                          <tr className="bg-gray-900/60 border-b border-gray-800/50">
                                            <th className="px-3 py-1.5 text-left text-gray-400 font-semibold">Stat</th>
                                            {sk.scalingTable[0].values.map((_: string, i: number) => (
                                              <th key={i} className="px-2 py-1.5 text-center text-gray-400 font-semibold">Lv.{i + 1}</th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {sk.scalingTable.map((row: {label: string; values: string[]}, rowIdx: number) => (
                                            <tr key={rowIdx} className={rowIdx % 2 === 0 ? "bg-black/20" : "bg-black/10"}>
                                              <td className="px-3 py-1.5 text-gray-300 font-semibold whitespace-nowrap">{row.label}</td>
                                              {row.values.map((val: string, colIdx: number) => (
                                                <td key={colIdx} className="px-2 py-1.5 text-center text-indigo-300">{val}</td>
                                              ))}
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
            </div>
          )}

          {/* DRAFT & MATCHUPS TAB */}
          {activeTab === "draft" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-[#101827] rounded-xl border border-green-900/30 p-5">
                  <h3 className="font-bold text-sm uppercase text-gray-400 mb-4 flex items-center gap-2 border-b border-gray-800 pb-2">
                    <Crosshair className="w-4 h-4 text-green-400" /> Strong
                    Against (Counter To)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {hero.counters &&
                    hero.counters.filter(
                      (h: string) => h && h.toLowerCase() !== "none",
                    ).length > 0 ? (
                      hero.counters
                        .filter((h: string) => h && h.toLowerCase() !== "none")
                        .map((h: string) => (
                          <span
                            key={h}
                            className="bg-green-950/40 text-green-300 border border-green-900/50 px-3 py-1 rounded text-sm font-semibold"
                          >
                            {h}
                          </span>
                        ))
                    ) : (
                      <span className="text-gray-600 text-sm italic">
                        No Competitive Data Available
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-[#101827] rounded-xl border border-red-900/30 p-5">
                  <h3 className="font-bold text-sm uppercase text-gray-400 mb-4 flex items-center gap-2 border-b border-gray-800 pb-2">
                    <Crosshair className="w-4 h-4 text-red-400" /> Weak Against
                    (Countered By)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {hero.countered_by &&
                    hero.countered_by.filter(
                      (h: string) => h && h.toLowerCase() !== "none",
                    ).length > 0 ? (
                      hero.countered_by
                        .filter((h: string) => h && h.toLowerCase() !== "none")
                        .map((h: string) => (
                          <span
                            key={h}
                            className="bg-red-950/40 text-red-300 border border-red-900/50 px-3 py-1 rounded text-sm font-semibold"
                          >
                            {h}
                          </span>
                        ))
                    ) : (
                      <span className="text-gray-600 text-sm italic">
                        No Competitive Data Available
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-[#101827] rounded-xl border border-blue-900/30 p-5">
                  <h3 className="font-bold text-sm uppercase text-gray-400 mb-4 flex items-center gap-2 border-b border-gray-800 pb-2">
                    <Crosshair className="w-4 h-4 text-blue-400" /> Best Synergy
                    / Combos
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {hero.synergies && hero.synergies.length > 0 ? (
                      hero.synergies.map((h: string) => (
                        <span
                          key={h}
                          className="bg-blue-950/40 text-blue-300 border border-blue-900/50 px-3 py-1 rounded text-sm font-semibold"
                        >
                          {h}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-600 text-sm italic">
                        No Competitive Data Available
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="bg-indigo-950/20 rounded-xl border border-indigo-900/50 p-5 h-full">
                  <h3 className="font-bold text-sm uppercase text-indigo-400 mb-4 flex items-center gap-2 border-b border-indigo-900/30 pb-2">
                    <BrainCircuit className="w-4 h-4 text-indigo-400" /> Draft
                    AI Intel
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">
                        Draft Signals
                      </div>
                      {hero.draft_analysis?.draft_signals &&
                      hero.draft_analysis.draft_signals.filter(
                        (s: string) => s && s.toLowerCase() !== "none",
                      ).length > 0 ? (
                        <ul className="text-sm text-gray-300 space-y-1">
                          {hero.draft_analysis.draft_signals
                            .filter(
                              (s: string) => s && s.toLowerCase() !== "none",
                            )
                            .map((s: string, i: number) => (
                              <li key={i} className="flex gap-2">
                                <span className="text-indigo-500">&bull;</span>
                                {s}
                              </li>
                            ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-gray-600 italic">
                          Analysis unavailable.
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="text-[10px] text-gray-500 uppercase font-bold mb-1 mt-4">
                        Hidden Gameplans
                      </div>
                      {hero.draft_analysis?.hidden_gameplans &&
                      hero.draft_analysis.hidden_gameplans.filter(
                        (s: string) => s && s.toLowerCase() !== "none",
                      ).length > 0 ? (
                        <ul className="text-sm text-gray-300 space-y-1">
                          {hero.draft_analysis.hidden_gameplans
                            .filter(
                              (s: string) => s && s.toLowerCase() !== "none",
                            )
                            .map((s: string, i: number) => (
                              <li key={i} className="flex gap-2">
                                <span className="text-emerald-500">
                                  &rsaquo;
                                </span>
                                {s}
                              </li>
                            ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-gray-600 italic">
                          Analysis unavailable.
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1 mt-4 pt-4 border-t border-indigo-900/30">
                      {hero.draft_analysis?.philosophy_tags &&
                      hero.draft_analysis.philosophy_tags.filter(
                        (t: string) => t && t.toLowerCase() !== "none",
                      ).length > 0 ? (
                        hero.draft_analysis.philosophy_tags
                          .filter(
                            (t: string) => t && t.toLowerCase() !== "none",
                          )
                          .map((t: string, i: number) => (
                            <span
                              key={i}
                              className="text-[10px] px-1.5 py-0.5 border border-indigo-900/50 bg-black/40 text-indigo-300 uppercase font-mono shadow-sm rounded"
                            >
                              #{t.replace(/\s+/g, "")}
                            </span>
                          ))
                      ) : (
                        <span className="text-[10px] text-gray-600 italic font-mono">
                          - No Tags -
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TOURNAMENT STATS TAB */}
          {activeTab === "stats" &&
            (parseFloat(String(hero.tournament_presence || 0)) > 0 ||
            parseInt(String(hero.pro_statistics?.picks_total || 0), 10) > 0 ? (
              <div className="animate-fade-in max-w-3xl flex flex-col items-center justify-center p-12 bg-[#101827] rounded-xl border border-gray-800 text-center mx-auto mt-8">
                <div className="w-16 h-16 rounded-full bg-blue-900/30 border border-blue-500/30 flex items-center justify-center mb-6">
                  <BarChart4 className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-200 mb-2">
                  Tournament Statistics
                </h3>
                <p className="text-gray-400 text-sm max-w-md mx-auto mb-8">
                  Detailed pro match telemetry processed from recent MLBB
                  leagues.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                  <div className="bg-black/40 border border-gray-800 rounded p-4">
                    <div className="text-[10px] text-gray-500 uppercase">
                      Pro Presence
                    </div>
                    <div className="text-2xl font-bold font-mono text-white">
                      {hero.tournament_presence || 0}%
                    </div>
                  </div>
                  <div className="bg-black/40 border border-gray-800 rounded p-4">
                    <div className="text-[10px] text-gray-500 uppercase">
                      Pro Win Rate
                    </div>
                    <div className="text-2xl font-bold font-mono text-emerald-400">
                      {hero.win_rate || 0}%
                    </div>
                  </div>
                  <div className="bg-black/40 border border-gray-800 rounded p-4">
                    <div className="text-[10px] text-gray-500 uppercase">
                      Pro Picks
                    </div>
                    <div className="text-2xl font-bold font-mono text-blue-400">
                      {hero.pro_statistics?.picks_total || 0}
                    </div>
                  </div>
                  <div className="bg-black/40 border border-gray-800 rounded p-4">
                    <div className="text-[10px] text-gray-500 uppercase">
                      Pro Bans
                    </div>
                    <div className="text-2xl font-bold font-mono text-red-400">
                      {hero.pro_statistics?.bans_total || 0}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="animate-fade-in max-w-3xl flex flex-col items-center justify-center p-12 bg-[#101827] rounded-xl border border-gray-800 text-center mx-auto mt-8">
                <div className="w-16 h-16 rounded-full bg-gray-900/50 border border-gray-700/50 flex items-center justify-center mb-6">
                  <BarChart4 className="w-8 h-8 text-gray-500 opacity-50" />
                </div>
                <h3 className="text-xl font-bold text-gray-300 mb-2">
                  No Competitive Data Available
                </h3>
                <p className="text-gray-500 text-sm max-w-md mx-auto">
                  This hero has not been sufficiently used in professional
                  tournaments, or Liquipedia data is not available yet.
                </p>
              </div>
            ))}
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
