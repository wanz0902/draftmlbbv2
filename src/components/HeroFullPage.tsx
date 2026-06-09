import React, { useState, useEffect, useRef, useCallback } from "react";
import { DetailedHero } from "../types/hero";
import { motion, AnimatePresence } from "motion/react";
import { cleanText, getHeroImageUrl, formatCooldown } from "../lib/heroUtils";
import FallbackImage from "./FallbackImage";
import {
  ArrowLeft,
  ChevronRight,
  Play,
  Shield,
  Zap,
  Target,
  Swords,
  ChevronDown,
  Trophy,
  TrendingUp,
  TrendingDown,
  Users,
  MapPin,
  Sparkles,
  Clock,
  Crosshair,
} from "lucide-react";

interface Props {
  heroName: string;
  heroAssets: Record<string, string>;
  onBack: () => void;
}

const STAT_MAX: Record<string, number> = {
  hp: 4000,
  hpRegen: 30,
  mana: 800,
  manaRegen: 20,
  physicalAttack: 200,
  physicalDefense: 60,
  magicPower: 100,
  magicDefense: 50,
  attackSpeed: 1.5,
  movementSpeed: 350,
};

const STAT_COLORS: Record<string, { bar: string; text: string }> = {
  hp: { bar: "bg-emerald-500", text: "text-emerald-400" },
  hpRegen: { bar: "bg-teal-400", text: "text-teal-400" },
  mana: { bar: "bg-sky-500", text: "text-sky-400" },
  manaRegen: { bar: "bg-blue-400", text: "text-blue-400" },
  physicalAttack: { bar: "bg-orange-500", text: "text-orange-400" },
  physicalDefense: { bar: "bg-amber-600", text: "text-amber-400" },
  magicPower: { bar: "bg-violet-500", text: "text-violet-400" },
  magicDefense: { bar: "bg-purple-400", text: "text-purple-400" },
  attackSpeed: { bar: "bg-yellow-500", text: "text-yellow-400" },
  movementSpeed: { bar: "bg-cyan-500", text: "text-cyan-400" },
};

const SKILL_KEYS = ["passive", "skill1", "skill2", "ultimate"] as const;
const SKILL_LABELS: Record<string, string> = {
  passive: "Passive",
  skill1: "Skill 1",
  skill2: "Skill 2",
  ultimate: "Ultimate",
};

const ROLE_COLORS: Record<string, { hex: string; tw: string; glow: string }> = {
  Tank: { hex: "#2dd4bf", tw: "teal", glow: "rgba(45,212,191," },
  Fighter: { hex: "#ff6b2b", tw: "orange", glow: "rgba(255,107,43," },
  Assassin: { hex: "#ff4d6d", tw: "rose", glow: "rgba(255,77,109," },
  Mage: { hex: "#7b61ff", tw: "violet", glow: "rgba(123,97,255," },
  Marksman: { hex: "#00d4ff", tw: "cyan", glow: "rgba(0,212,255," },
  Support: { hex: "#4ade80", tw: "green", glow: "rgba(74,222,128," },
};

const ROLE_BADGE_STYLES: Record<string, string> = {
  Tank: "bg-teal-500/15 text-teal-400 border-teal-500/30",
  Fighter: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  Assassin: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  Mage: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  Marksman: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  Support: "bg-green-500/15 text-green-400 border-green-500/30",
};

const SECTIONS = [
  { id: "abilities", label: "Abilities" },
  { id: "power-curve", label: "Power Curve" },
  { id: "attributes", label: "Attributes" },
  { id: "builds", label: "Builds" },
  { id: "combos", label: "Combos" },
  { id: "profile", label: "Profile" },
] as const;

function getItemIconUrl(itemName: string): string {
  // Keep apostrophes (Haas's, Berserker's, etc.) — match actual filenames
  const slug = itemName
    .replace(/[^a-zA-Z0-9\s']/g, "")
    .replace(/\s+/g, "_");
  return `/raw-assets/aset_item/Item_${slug}_ML.png`;
}

// Precompute a broader set of search paths for item fallback
const ITEM_SUBDIRS = ["attack", "magic", "defense", "movement", "roaming", "jungling"];

function getItemIconFallbackPaths(itemName: string): string[] {
  const slug = itemName
    .replace(/[^a-zA-Z0-9\s']/g, "")
    .replace(/\s+/g, "_");
  return ITEM_SUBDIRS.map(dir => `/raw-assets/aset_item/${dir}/Item_${slug}_ML.png`);
}

function getPrimaryRole(roles: string[]): string {
  return roles[0] || "Fighter";
}

function getRoleColor(role: string): { hex: string; glow: string } {
  const r = ROLE_COLORS[role] || ROLE_COLORS.Fighter;
  return { hex: r.hex, glow: r.glow };
}

export default function HeroFullPage({ heroName, heroAssets, onBack }: Props) {
  const [hero, setHero] = useState<DetailedHero | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState<string>("passive");
  const [activeSection, setActiveSection] = useState<string>("abilities");

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const navRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoKey, setVideoKey] = useState(0);

  useEffect(() => {
    const slug = heroName.toLowerCase().replace(/[^a-z0-9]/g, "");
    fetch(`/api/heroes/${slug}`)
      .then((res) => res.json())
      .then((data) => {
        setHero(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [heroName]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Video control: when selectedSkill changes, restart video from beginning
  useEffect(() => {
    const vid = videoRef.current;
    if (vid) {
      vid.pause();
      vid.currentTime = 0;
      vid.load();
      vid.play().catch(() => {});
    }
  }, [selectedSkill, videoKey]);

  const handleSkillChange = useCallback((skill: string) => {
    setSelectedSkill(skill);
    setVideoKey((k) => k + 1);
  }, []);

  const scrollToSection = useCallback((id: string) => {
    const el = sectionRefs.current[id];
    if (el) {
      const offset = 64;
      const y = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY + 120;
      for (let i = SECTIONS.length - 1; i >= 0; i--) {
        const el = sectionRefs.current[SECTIONS[i].id];
        if (el && el.offsetTop <= scrollY) {
          setActiveSection(SECTIONS[i].id);
          return;
        }
      }
      if (SECTIONS.length > 0) setActiveSection(SECTIONS[0].id);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hero]);

  if (loading)
    return (
      <div className="min-h-screen bg-[#060d18] flex items-center justify-center">
        <div className="text-center animate-pulse">
          <div className="w-16 h-16 rounded-full bg-cyan-900/20 border border-cyan-500/20 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7 text-cyan-400" />
          </div>
          <p className="text-gray-500 text-xs font-mono uppercase tracking-widest">
            Loading hero intelligence...
          </p>
        </div>
      </div>
    );

  if (!hero)
    return (
      <div className="min-h-screen bg-[#060d18] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-sm">Hero not found.</p>
          <button
            onClick={onBack}
            className="mt-3 text-cyan-400 hover:text-cyan-300 text-xs font-mono uppercase tracking-wider"
          >
            Back
          </button>
        </div>
      </div>
    );

  const heroImage = getHeroImageUrl(
    hero.hero_name || hero.name || heroName,
    heroAssets
  );
  const roles = Array.isArray(hero.role)
    ? hero.role.filter(Boolean)
    : hero.role
    ? [hero.role]
    : [];
  const specialty = Array.isArray(hero.specialty)
    ? hero.specialty.filter(Boolean)
    : [];
  const lanes = Array.isArray(hero.lanes) ? hero.lanes.filter(Boolean) : [];
  const baseStats = hero.baseStats || hero.base_stats || {};
  const powerCurve = hero.powerCurve || hero.power_curve;
  const heroAttributes = hero.heroAttributes || hero.hero_attributes;
  const proBuilds = hero.proBuilds || hero.pro_builds || [];
  const combos = hero.combos || [];
  const matchupSystem = hero.matchupSystem || hero.matchup_system;
  const skills = hero.skills || {};
  const skillVideos = hero.skillVideos || hero.skill_videos;
  const selectedSkillData = skills[selectedSkill];

  const primaryRole = getPrimaryRole(roles);
  const roleColor = getRoleColor(primaryRole);
  const roleGlowStyle = `${roleColor.glow}0.4)`;

  const getStatPercent = (key: string, val: number) =>
    Math.min(100, (val / (STAT_MAX[key] || 100)) * 100);

  const getSkillVideo = (skillKey: string): string | null => {
    if (!skillVideos) return null;
    if (skillVideos[skillKey]) return skillVideos[skillKey];
    return null;
  };

  const activeVideo = getSkillVideo(selectedSkill);

  return (
    <div className="min-h-screen bg-[#060d18] text-gray-100">
      {/* ===== HERO CINEMATIC HEADER ===== */}
      <div
        className="relative w-full overflow-hidden"
        style={{ minHeight: "420px" }}
      >
        {/* Background gradient from role color */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${roleColor.glow}0.15) 0%, #060d18 40%, #060d18 60%, ${roleColor.glow}0.08) 100%)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#060d18]" />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
          {/* Back button */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.15em] text-gray-500 hover:text-cyan-400 transition-colors group mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            All Heroes
          </button>

          <div className="flex flex-col lg:flex-row items-start gap-8">
            {/* Portrait */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="relative shrink-0"
            >
              <div
                className="absolute -inset-3 rounded-2xl blur-xl opacity-40"
                style={{ background: `radial-gradient(circle, ${roleColor.glow}0.5), transparent)` }}
              />
              <div
                className="relative w-[200px] h-[200px] sm:w-[280px] sm:h-[280px] rounded-2xl overflow-hidden border-2"
                style={{ borderColor: `${roleColor.glow}0.4)` }}
              >
                <FallbackImage
                  src={heroImage}
                  fallbackText={hero.hero_name || "?"}
                  alt={hero.hero_name || ""}
                  className="w-full h-full object-cover"
                  containerClassName="w-full h-full flex items-center justify-center text-6xl"
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `linear-gradient(180deg, transparent 50%, ${roleColor.glow}0.3) 100%)`,
                  }}
                />
              </div>
            </motion.div>

            {/* Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="flex-1 min-w-0"
            >
              <h1
                className="text-4xl sm:text-6xl font-display font-black uppercase tracking-[0.06em] mb-3"
                style={{
                  background: `linear-gradient(135deg, #fff 0%, ${roleColor.hex} 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {hero.hero_name || hero.name}
              </h1>

              {/* Role + Lane badges */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {roles.map((r) => (
                  <span
                    key={r}
                    className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-widest border ${
                      ROLE_BADGE_STYLES[r] || "bg-gray-500/15 text-gray-400 border-gray-500/30"
                    }`}
                  >
                    {r}
                  </span>
                ))}
                {lanes.map((l) => (
                  <span
                    key={l}
                    className="px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-widest bg-white/[0.03] border border-white/[0.08] text-gray-400"
                  >
                    {l}
                  </span>
                ))}
              </div>

              {/* Difficulty + Specialty */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {hero.difficulty_label || hero.difficulty || "Medium"}
                </span>
                {specialty.map((s) => (
                  <span
                    key={s}
                    className="px-2.5 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider bg-white/[0.04] border border-white/[0.08] text-gray-400"
                  >
                    {s}
                  </span>
                ))}
              </div>

              {/* Region + Race */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {hero.region && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/15">
                    <MapPin className="w-2.5 h-2.5" /> {hero.region}
                  </span>
                )}
                {hero.race && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/15">
                    <Shield className="w-2.5 h-2.5" /> {hero.race}
                  </span>
                )}
              </div>

              {/* Short Summary */}
              {hero.mechanicNote && (
                <p className="text-gray-400 text-[11px] leading-relaxed mb-4 max-w-lg border-l-2 pl-3" style={{ borderColor: `${roleColor.glow}0.4)` }}>
                  {hero.mechanicNote.length > 200 ? hero.mechanicNote.substring(0, 200) + "..." : hero.mechanicNote}
                </p>
              )}

              {/* Power Spike Tags */}
              {hero.powerSpikeTags && hero.powerSpikeTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {hero.powerSpikeTags.slice(0, 3).map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded-md text-[9px] font-mono uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Floating stat chips */}
              <div className="flex flex-wrap items-center gap-3">
                <StatChip
                  label="Win Rate"
                  value={`${hero.winRate || hero.win_rate || 0}%`}
                  color={
                    (hero.winRate || hero.win_rate || 0) >= 50
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }
                />
                <StatChip
                  label="Pick Rate"
                  value={`${hero.pickRate || hero.pick_rate || 0}%`}
                  color="text-cyan-400"
                />
                <StatChip
                  label="Ban Rate"
                  value={`${hero.banRate || hero.ban_rate || 0}%`}
                  color="text-rose-400"
                />
                {(hero.meta_score || hero.metaScore) && (hero.meta_score || hero.metaScore)! > 0 && (
                  <div
                    className="px-4 py-2 rounded-xl border"
                    style={{
                      borderColor: `${roleColor.glow}0.3)`,
                      background: `${roleColor.glow}0.06)`,
                    }}
                  >
                    <div className="text-[8px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-0.5">
                      Meta Score
                    </div>
                    <div
                      className="text-lg font-display font-black"
                      style={{ color: roleColor.hex }}
                    >
                      {hero.meta_score || hero.metaScore}
                    </div>
                  </div>
                )}
                {(hero.meta_rank || hero.metaRank) && (hero.meta_rank || hero.metaRank)! > 0 && (
                  <div className="px-4 py-2 rounded-xl border border-white/[0.06] bg-white/[0.03]">
                    <div className="text-[8px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-0.5">
                      Rank
                    </div>
                    <div className="text-lg font-display font-black text-gray-300">
                      #{hero.meta_rank || hero.metaRank}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ===== SECTION NAV (sticky) ===== */}
      <div
        ref={navRef}
        className="sticky top-0 z-50 bg-[#060d18]/90 backdrop-blur-xl border-b border-white/[0.04]"
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto scrollbar-none py-2">
            {SECTIONS.map((sec) => {
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => scrollToSection(sec.id)}
                  className={`relative px-4 py-2 text-[11px] font-mono font-bold uppercase tracking-wider whitespace-nowrap transition-colors rounded-lg ${
                    isActive
                      ? "text-cyan-400 bg-cyan-500/10"
                      : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]"
                  }`}
                >
                  {sec.label}
                  {isActive && (
                    <motion.div
                      layoutId="sectionUnderline"
                      className="absolute bottom-0 left-2 right-2 h-[2px] bg-cyan-400 rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-5">
          {/* LEFT COLUMN (60%) */}
          <div className="flex-1 lg:w-[60%] space-y-6 min-w-0">
            {/* SECTION 1: ABILITIES */}
            <div
              ref={(el) => { sectionRefs.current["abilities"] = el; }}
              id="section-abilities"
            >
              <SectionHeader icon={<Swords className="w-3.5 h-3.5 text-violet-400" />} label="Abilities" color="violet" />
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4 }}
                className="glass-card rounded-2xl p-5"
              >
                {/* Video preview INSIDE abilities card */}
                {activeVideo && (
                  <div className="mb-4 rounded-xl overflow-hidden border border-white/[0.04] bg-black relative">
                    <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/70 backdrop-blur-sm border border-white/[0.06]">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="text-[9px] font-mono uppercase tracking-wider text-cyan-400">
                        {SKILL_LABELS[selectedSkill]} — Click tabs below to switch
                      </span>
                    </div>
                    <video
                      key={`ability-${videoKey}`}
                      ref={videoRef}
                      src={activeVideo}
                      className="w-full object-contain"
                      style={{ maxHeight: "360px" }}
                      autoPlay
                      muted
                      playsInline
                      preload="auto"
                      poster={heroImage}
                      onEnded={(e) => { e.currentTarget.pause(); }}
                    />
                  </div>
                )}

                <div className="flex gap-4">
                  {/* Vertical skill selector */}
                  <div className="flex flex-col gap-2 shrink-0">
                    {SKILL_KEYS.map((key) => {
                      const sk = skills[key];
                      const active = selectedSkill === key;
                      return (
                        <button
                          key={key}
                          onClick={() => handleSkillChange(key)}
                          className={`group relative w-16 h-16 rounded-xl border overflow-hidden transition-all duration-200 ${
                            active
                              ? "border-cyan-500/40 bg-cyan-500/10 shadow-lg shadow-cyan-500/10"
                              : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12]"
                          }`}
                        >
                          {sk?.iconUrl ? (
                            <img
                              src={sk.iconUrl}
                              alt={sk.name || key}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <span className="w-full h-full flex items-center justify-center font-mono text-[9px] font-bold text-gray-600">
                              {key === "passive" ? "P" : key === "skill1" ? "S1" : key === "skill2" ? "S2" : "ULT"}
                            </span>
                          )}
                          {active && (
                            <div className="absolute inset-0 border-2 border-cyan-400/50 rounded-xl pointer-events-none" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Detail panel */}
                  <div className="flex-1 min-w-0">
                    <AnimatePresence mode="wait">
                      {selectedSkillData && (
                        <motion.div
                          key={selectedSkill}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-3"
                        >
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded-md text-[9px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
                              {SKILL_LABELS[selectedSkill]}
                            </span>
                            <h3 className="text-sm font-display font-bold text-white">
                              {cleanText(selectedSkillData.name)}
                            </h3>
                          </div>

                          <p className="text-gray-400 text-xs leading-relaxed">
                            {cleanText(selectedSkillData.description, "No description.")}
                          </p>

                          {/* Tags row */}
                          <div className="flex flex-wrap gap-1.5">
                            {selectedSkillData.damageType &&
                              selectedSkillData.damageType !== "None" &&
                              selectedSkillData.damageType !== "NONE" && (
                                <span className="px-2 py-0.5 bg-orange-500/10 border border-orange-500/15 rounded-md text-[9px] font-mono text-orange-400">
                                  {selectedSkillData.damageType}
                                </span>
                              )}
                            {selectedSkillData.cooldown &&
                              String(
                                Array.isArray(selectedSkillData.cooldown)
                                  ? selectedSkillData.cooldown.join("")
                                  : selectedSkillData.cooldown
                              ) !== "0" &&
                              String(
                                Array.isArray(selectedSkillData.cooldown)
                                  ? selectedSkillData.cooldown.join("")
                                  : selectedSkillData.cooldown
                              ) !== "" && (
                                <span className="px-2 py-0.5 bg-sky-500/10 border border-sky-500/15 rounded-md text-[9px] font-mono text-sky-400">
                                  CD:{" "}
                                  {Array.isArray(selectedSkillData.cooldown)
                                    ? selectedSkillData.cooldown.filter(Boolean).join("s / ") + "s"
                                    : selectedSkillData.cooldown + "s"}
                                </span>
                              )}
                            {selectedSkillData.manaCost &&
                              String(
                                Array.isArray(selectedSkillData.manaCost)
                                  ? selectedSkillData.manaCost.join("")
                                  : selectedSkillData.manaCost
                              ) !== "0" &&
                              String(
                                Array.isArray(selectedSkillData.manaCost)
                                  ? selectedSkillData.manaCost.join("")
                                  : selectedSkillData.manaCost
                              ) !== "" && (
                                <span className="px-2 py-0.5 bg-violet-500/10 border border-violet-500/15 rounded-md text-[9px] font-mono text-violet-400">
                                  Mana:{" "}
                                  {Array.isArray(selectedSkillData.manaCost)
                                    ? selectedSkillData.manaCost.filter(Boolean).join(" / ")
                                    : selectedSkillData.manaCost}
                                </span>
                              )}
                            {selectedSkillData.scaling?.filter(
                              (s: string) => s && s !== "None"
                            ).length > 0 &&
                              selectedSkillData.scaling
                                .filter((s: string) => s && s !== "None")
                                .map((s: string, i: number) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/15 rounded-md text-[9px] font-mono text-amber-400"
                                  >
                                    {s}
                                  </span>
                                ))}
                          </div>

                          {/* Scaling table */}
                          {selectedSkillData.scaling?.filter(
                            (s: string) => s && s !== "None"
                          ).length > 0 && (
                            <div className="mt-2 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                              <div className="text-[9px] font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                                Scaling
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {selectedSkillData.scaling
                                  .filter((s: string) => s && s !== "None")
                                  .map((s: string, i: number) => (
                                    <span
                                      key={i}
                                      className="text-[10px] font-mono text-gray-300"
                                    >
                                      {s}
                                    </span>
                                  ))}
                              </div>
                            </div>
                          )}

                          {/* Tips */}
                          {selectedSkillData.tips && (
                            <div className="p-3 rounded-lg bg-amber-500/[0.04] border border-amber-500/10">
                              <div className="text-[9px] font-mono uppercase tracking-wider text-amber-400/70 mb-1">
                                Tips
                              </div>
                              <p className="text-gray-400 text-[11px] leading-relaxed italic">
                                {selectedSkillData.tips}
                              </p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* SECTION 2: POWER CURVE */}
            {powerCurve && (
              <div
                ref={(el) => { sectionRefs.current["power-curve"] = el; }}
                id="section-power-curve"
              >
                <SectionHeader icon={<TrendingUp className="w-3.5 h-3.5 text-emerald-400" />} label="Power Curve" color="emerald" />
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4 }}
                  className="glass-card rounded-2xl p-5"
                >
                  {/* Segmented bar chart */}
                  <div className="space-y-4 mb-4">
                    {([
                      { phase: "EARLY", val: powerCurve.early, color: "from-cyan-500 to-cyan-300" },
                      { phase: "MID", val: powerCurve.mid, color: "from-amber-500 to-amber-300" },
                      { phase: "LATE", val: powerCurve.late, color: "from-violet-500 to-violet-300" },
                    ] as const).map((p) => {
                      const isDominant =
                        p.phase.toLowerCase().includes(
                          powerCurve.dominantPhase?.toLowerCase().split(" ")[0] || ""
                        );
                      return (
                        <div key={p.phase}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400">
                              {p.phase}
                            </span>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-mono font-bold ${
                                  isDominant ? "text-amber-400" : "text-gray-300"
                                }`}
                              >
                                {p.val}%
                              </span>
                              {isDominant && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/25 text-[8px] font-mono font-bold text-amber-400 uppercase">
                                  Peak
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="h-4 rounded-lg bg-white/[0.04] overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              whileInView={{ width: `${p.val}%` }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className={`h-full rounded-lg bg-gradient-to-r ${p.color} ${
                                isDominant ? "shadow-lg shadow-amber-500/20" : ""
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Spike levels */}
                  {powerCurve.spikeLevels?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {powerCurve.spikeLevels.map((spike, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-mono font-bold text-cyan-400"
                        >
                          <Zap className="w-2.5 h-2.5 inline mr-1" />
                          {spike}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Core items */}
                  {powerCurve.coreItems?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {powerCurve.coreItems.map((item, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono text-gray-400"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Description */}
                  {powerCurve.description && (
                    <p className="text-gray-500 text-[11px] leading-relaxed italic">
                      {powerCurve.description}
                    </p>
                  )}
                </motion.div>
              </div>
            )}

            {/* SECTION 3: HERO ATTRIBUTES (Radar Chart) */}
            {heroAttributes && (
              <div
                ref={(el) => { sectionRefs.current["attributes"] = el; }}
                id="section-attributes"
              >
                <SectionHeader icon={<Target className="w-3.5 h-3.5 text-cyan-400" />} label="Hero Attributes" color="cyan" />
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4 }}
                  className="glass-card rounded-2xl p-5"
                >
                  <div className="flex justify-center">
                    <svg viewBox="0 0 320 320" className="w-full max-w-[340px]">
                      <defs>
                        <filter id="radarGlow">
                          <feGaussianBlur stdDeviation="4" result="blur" />
                          <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                        <linearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#7b61ff" stopOpacity="0.1" />
                        </linearGradient>
                      </defs>

                      {/* Grid rings */}
                      {[120, 90, 60, 30].map((r) => (
                        <polygon
                          key={r}
                          points={`160,${160 - r} ${160 + r},160 160,${160 + r} ${160 - r},160`}
                          fill="none"
                          stroke="rgba(255,255,255,0.04)"
                          strokeWidth="0.5"
                        />
                      ))}

                      {/* Axis lines */}
                      <line x1="160" y1="40" x2="160" y2="280" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                      <line x1="40" y1="160" x2="280" y2="160" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

                      {/* Data polygon */}
                      <motion.polygon
                        initial={{ opacity: 0, scale: 0.3 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                        style={{ transformOrigin: "160px 160px" }}
                        points={`160,${160 - (heroAttributes.durability / 100) * 120} ${
                          160 + (heroAttributes.offense / 100) * 120
                        },160 160,${
                          160 + (heroAttributes.abilityEffects / 100) * 120
                        } ${160 - (heroAttributes.difficulty / 100) * 120},160`}
                        fill="url(#radarFill)"
                        stroke="#22d3ee"
                        strokeWidth="2"
                        filter="url(#radarGlow)"
                      />

                      {/* Data points */}
                      {[
                        {
                          x: 160,
                          y: 160 - (heroAttributes.durability / 100) * 120,
                          label: "Durability",
                          val: heroAttributes.durability,
                          color: "#2dd4bf",
                          anchor: "middle" as const,
                          dx: 0,
                          dy: -12,
                        },
                        {
                          x: 160 + (heroAttributes.offense / 100) * 120,
                          y: 160,
                          label: "Offense",
                          val: heroAttributes.offense,
                          color: "#ff6b2b",
                          anchor: "start" as const,
                          dx: 10,
                          dy: 4,
                        },
                        {
                          x: 160,
                          y: 160 + (heroAttributes.abilityEffects / 100) * 120,
                          label: "Ability Effects",
                          val: heroAttributes.abilityEffects,
                          color: "#3b82f6",
                          anchor: "middle" as const,
                          dx: 0,
                          dy: 20,
                        },
                        {
                          x: 160 - (heroAttributes.difficulty / 100) * 120,
                          y: 160,
                          label: "Difficulty",
                          val: heroAttributes.difficulty,
                          color: "#a78bfa",
                          anchor: "end" as const,
                          dx: -10,
                          dy: 4,
                        },
                      ].map((p) => (
                        <g key={p.label}>
                          <circle cx={p.x} cy={p.y} r="10" fill={p.color} opacity="0.12" />
                          <motion.circle
                            initial={{ r: 0 }}
                            animate={{ r: 5 }}
                            transition={{ duration: 0.4, delay: 0.8 }}
                            cx={p.x}
                            cy={p.y}
                            fill={p.color}
                            filter="url(#radarGlow)"
                          />
                          <text
                            x={p.x + p.dx}
                            y={p.y + p.dy}
                            fill="#94a3b8"
                            fontSize="9"
                            textAnchor={p.anchor}
                            fontFamily="monospace"
                            fontWeight="700"
                          >
                            {p.label}
                          </text>
                          <text
                            x={p.x + p.dx}
                            y={p.y + p.dy + 14}
                            fill={p.color}
                            fontSize="13"
                            textAnchor={p.anchor}
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            {p.val}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                </motion.div>
              </div>
            )}

            {/* SECTION 4: PRO BUILDS */}
            {proBuilds.length > 0 && (
              <div
                ref={(el) => { sectionRefs.current["builds"] = el; }}
                id="section-builds"
              >
                <SectionHeader icon={<Trophy className="w-3.5 h-3.5 text-amber-400" />} label="Pro Builds" color="amber" />
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4 }}
                  className="glass-card rounded-2xl p-5"
                >
                  <div className="space-y-3">
                    {proBuilds.slice(0, 5).map((build, idx) => (
                      <div
                        key={idx}
                        className="group p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-amber-500/20 hover:bg-amber-500/[0.02] transition-all duration-300"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold shrink-0 transition-transform group-hover:scale-110 ${
                              idx === 0
                                ? "bg-amber-500/20 border border-amber-500/30 text-amber-400"
                                : "bg-white/[0.04] border border-white/[0.06] text-gray-500"
                            }`}
                          >
                            {idx === 0 ? (
                              <Trophy className="w-3.5 h-3.5" />
                            ) : (
                              idx + 1
                            )}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-gray-200 block truncate">
                              {build.player}
                            </span>
                            <span className="text-[9px] font-mono text-gray-600">
                              {build.games} games
                            </span>
                          </div>
                        </div>
                        {/* Item strip */}
                        <div className="flex gap-2 flex-wrap">
                          {build.items.map((item, i) => (
                            <div
                              key={i}
                              className="relative group/item flex flex-col items-center gap-1 p-1.5 rounded-xl bg-[#0a0f1a] border border-white/[0.05] hover:border-amber-500/30 hover:bg-amber-500/5 transition-all duration-200 cursor-default hover:scale-105 hover:shadow-lg hover:shadow-amber-500/10"
                            >
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/[0.03] border border-white/[0.06] group-hover/item:border-amber-500/20 transition-colors">
                                <img
                                  src={getItemIconUrl(item)}
                                  alt={item}
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    const img = e.target as HTMLImageElement;
                                    // Try subdirectory fallback paths
                                    const fallbacks = getItemIconFallbackPaths(item);
                                    const currentSrc = img.getAttribute("data-attempt") || "";
                                    const currentIdx = fallbacks.indexOf(currentSrc);
                                    if (currentIdx >= 0 && currentIdx < fallbacks.length - 1) {
                                      const nextPath = fallbacks[currentIdx + 1];
                                      img.setAttribute("data-attempt", nextPath);
                                      img.src = nextPath;
                                    } else if (fallbacks.length > 0 && !currentSrc) {
                                      img.setAttribute("data-attempt", fallbacks[0]);
                                      img.src = fallbacks[0];
                                    } else {
                                      // All attempts failed — show text fallback
                                      img.style.display = "none";
                                      const parent = img.parentElement;
                                      if (parent && !parent.querySelector(".fallback-icon")) {
                                        const fb = document.createElement("div");
                                        fb.className = "fallback-icon w-full h-full flex items-center justify-center text-[8px] font-mono font-bold text-amber-400/60";
                                        fb.textContent = item.substring(0, 2);
                                        parent.appendChild(fb);
                                      }
                                    }
                                  }}
                                />
                              </div>
                              <span className="text-[7px] font-mono text-gray-500 group-hover/item:text-gray-300 transition-colors text-center leading-tight max-w-[60px] truncate">
                                {item}
                              </span>
                              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500/90 text-[7px] font-mono font-bold text-black flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity">
                                {i + 1}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            )}

            {/* SECTION 5: COMBOS */}
            {combos.length > 0 && (
              <div
                ref={(el) => { sectionRefs.current["combos"] = el; }}
                id="section-combos"
              >
                <SectionHeader icon={<Swords className="w-3.5 h-3.5 text-rose-400" />} label="Combos" color="rose" />
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4 }}
                  className="glass-card rounded-2xl p-5"
                >
                  <div className="space-y-4">
                    {combos.map((combo, idx) => {
                      const isTeamfight =
                        combo.name?.toLowerCase().includes("teamfight");
                      return (
                        <div
                          key={idx}
                          className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                        >
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider border mb-3 ${
                              isTeamfight
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                            }`}
                          >
                            {combo.name}
                          </span>

                          {/* Skill chain with arrow connectors */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {combo.sequence.map((step, i) => {
                              const stepLower = step.toLowerCase().trim();
                              let skillKey = "";
                              if (stepLower.includes("passive")) skillKey = "passive";
                              else if (
                                stepLower.includes("skill 1") ||
                                stepLower.includes("1st")
                              )
                                skillKey = "skill1";
                              else if (
                                stepLower.includes("skill 2") ||
                                stepLower.includes("2nd")
                              )
                                skillKey = "skill2";
                              else if (
                                stepLower.includes("skill 3") ||
                                stepLower.includes("ultimate") ||
                                stepLower.includes("3rd")
                              )
                                skillKey = "ultimate";
                              const skillData = skills[skillKey];
                              const iconSrc = skillData?.iconUrl || "";
                              return (
                                <React.Fragment key={i}>
                                  <div className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg hover:border-cyan-500/20 hover:bg-cyan-500/5 transition-all cursor-default group">
                                    {iconSrc && (
                                      <img
                                        src={iconSrc}
                                        alt={step}
                                        className="w-7 h-7 rounded object-cover border border-white/[0.08] group-hover:border-cyan-500/20 transition-colors"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display =
                                            "none";
                                        }}
                                      />
                                    )}
                                    <span className="text-[10px] font-mono text-gray-300 group-hover:text-white transition-colors">
                                      {step}
                                    </span>
                                  </div>
                                  {i < combo.sequence.length - 1 && (
                                    <div className="flex items-center">
                                      <div className="w-4 h-[1px] bg-cyan-500/30" />
                                      <ChevronRight className="w-3 h-3 text-cyan-500/40 -ml-0.5" />
                                    </div>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>

                          {combo.description && (
                            <p className="text-gray-500 text-[11px] leading-relaxed mt-3">
                              {combo.description}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN (40%) */}
          <div className="lg:w-[40%] space-y-5 min-w-0">
            {/* SECTION 6: META STATS */}
            <div ref={(el) => { sectionRefs.current["profile"] = el; }}>
              <SectionHeader icon={<Crosshair className="w-3.5 h-3.5 text-cyan-400" />} label="Meta Stats" color="cyan" />
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4 }}
                className="glass-card rounded-2xl p-5"
              >
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      label: "Win Rate",
                      value: hero.winRate || hero.win_rate || 0,
                      color:
                        (hero.winRate || hero.win_rate || 0) >= 50
                          ? "text-emerald-400"
                          : "text-rose-400",
                      bg:
                        (hero.winRate || hero.win_rate || 0) >= 50
                          ? "bg-emerald-500/10"
                          : "bg-rose-500/10",
                    },
                    {
                      label: "Pick Rate",
                      value: hero.pickRate || hero.pick_rate || 0,
                      color: "text-cyan-400",
                      bg: "bg-cyan-500/10",
                    },
                    {
                      label: "Ban Rate",
                      value: hero.banRate || hero.ban_rate || 0,
                      color: "text-rose-400",
                      bg: "bg-rose-500/10",
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className={`text-center p-3 rounded-xl ${s.bg} border border-white/[0.03]`}
                    >
                      <div className="text-[8px] font-mono uppercase tracking-[0.15em] text-gray-500 mb-1">
                        {s.label}
                      </div>
                      <div className={`text-xl font-display font-black ${s.color}`}>
                        {s.value}%
                      </div>
                    </div>
                  ))}
                </div>

                {/* Meta Score + Rank inline */}
                {((hero.meta_score || hero.metaScore) ||
                  (hero.meta_rank || hero.metaRank)) && (
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/[0.04]">
                    {(hero.meta_score || hero.metaScore) &&
                      (hero.meta_score || hero.metaScore)! > 0 && (
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <div>
                            <div className="text-[8px] font-mono uppercase tracking-wider text-gray-600">
                              Meta Score
                            </div>
                            <div className="text-sm font-display font-bold text-amber-400">
                              {hero.meta_score || hero.metaScore}
                            </div>
                          </div>
                        </div>
                      )}
                    {(hero.meta_rank || hero.metaRank) &&
                      (hero.meta_rank || hero.metaRank)! > 0 && (
                        <div className="flex items-center gap-2">
                          <Trophy className="w-3.5 h-3.5 text-gray-500" />
                          <div>
                            <div className="text-[8px] font-mono uppercase tracking-wider text-gray-600">
                              Rank
                            </div>
                            <div className="text-sm font-display font-bold text-gray-300">
                              #{hero.meta_rank || hero.metaRank}
                            </div>
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </motion.div>
            </div>

            {/* SECTION 7: MATCHUPS */}
            {matchupSystem && (
              <div>
                <SectionHeader icon={<Target className="w-3.5 h-3.5 text-amber-400" />} label="Matchups" color="amber" />
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4 }}
                  className="glass-card rounded-2xl p-5 space-y-5"
                >
                  {/* Strong Against */}
                  {matchupSystem.strongAgainst?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <TrendingUp className="w-3 h-3 text-emerald-400" />
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                          Strong Against
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {matchupSystem.strongAgainst.slice(0, 5).map((e) => (
                          <div
                            key={e.name}
                            className="flex items-center gap-2.5 p-2 rounded-lg bg-white/[0.02] border border-emerald-500/[0.06]"
                          >
                            <FallbackImage
                              src={getHeroImageUrl(e.name, heroAssets)}
                              fallbackText={e.name}
                              alt={e.name}
                              className="w-7 h-7 rounded-lg object-cover"
                              containerClassName="w-7 h-7 rounded-lg shrink-0"
                            />
                            <span className="text-[11px] text-gray-300 flex-1 font-medium">
                              {e.name}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-emerald-400">
                              +{e.advantage}%
                            </span>
                          </div>
                        ))}
                      </div>
                      {matchupSystem.strongAgainstReason && (
                        <p className="text-[10px] text-gray-600 leading-relaxed mt-2 italic">
                          {matchupSystem.strongAgainstReason}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Weak Against */}
                  {matchupSystem.weakAgainst?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <TrendingDown className="w-3 h-3 text-rose-400" />
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-rose-400">
                          Weak Against
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {matchupSystem.weakAgainst.slice(0, 5).map((e) => (
                          <div
                            key={e.name}
                            className="flex items-center gap-2.5 p-2 rounded-lg bg-white/[0.02] border border-rose-500/[0.06]"
                          >
                            <FallbackImage
                              src={getHeroImageUrl(e.name, heroAssets)}
                              fallbackText={e.name}
                              alt={e.name}
                              className="w-7 h-7 rounded-lg object-cover"
                              containerClassName="w-7 h-7 rounded-lg shrink-0"
                            />
                            <span className="text-[11px] text-gray-300 flex-1 font-medium">
                              {e.name}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-rose-400">
                              +{e.advantage}%
                            </span>
                          </div>
                        ))}
                      </div>
                      {matchupSystem.weakAgainstReason && (
                        <p className="text-[10px] text-gray-600 leading-relaxed mt-2 italic">
                          {matchupSystem.weakAgainstReason}
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              </div>
            )}

            {/* SECTION 8: BEST WITH (Synergy) */}
            {matchupSystem && matchupSystem.synergyHeroes?.length > 0 && (
              <div>
                <SectionHeader icon={<Users className="w-3.5 h-3.5 text-sky-400" />} label="Best With" color="sky" />
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4 }}
                  className="glass-card rounded-2xl p-5"
                >
                  <div className="space-y-1.5">
                    {matchupSystem.synergyHeroes.slice(0, 5).map((e) => (
                      <div
                        key={e.name}
                        className="flex items-center gap-2.5 p-2 rounded-lg bg-white/[0.02] border border-sky-500/[0.06]"
                      >
                        <FallbackImage
                          src={getHeroImageUrl(e.name, heroAssets)}
                          fallbackText={e.name}
                          alt={e.name}
                          className="w-7 h-7 rounded-lg object-cover"
                          containerClassName="w-7 h-7 rounded-lg shrink-0"
                        />
                        <span className="text-[11px] text-gray-300 flex-1 font-medium">
                          {e.name}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-sky-400">
                          +{e.synergy}%
                        </span>
                      </div>
                    ))}
                  </div>
                  {matchupSystem.synergyReason && (
                    <p className="text-[10px] text-gray-600 leading-relaxed mt-3 italic">
                      {matchupSystem.synergyReason}
                    </p>
                  )}
                </motion.div>
              </div>
            )}

            {/* SECTION 9: BASE STATS */}
            <div>
              <SectionHeader icon={<Zap className="w-3.5 h-3.5 text-amber-400" />} label="Base Stats" color="amber" />
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4 }}
                className="glass-card rounded-2xl p-5"
              >
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {[
                    { key: "hp", label: "HP", value: baseStats.hp },
                    { key: "hpRegen", label: "HP Regen", value: baseStats.hpRegen },
                    { key: "mana", label: "Mana", value: baseStats.mana },
                    { key: "manaRegen", label: "Mana Regen", value: baseStats.manaRegen },
                    { key: "physicalAttack", label: "Phys ATK", value: baseStats.physicalAttack },
                    { key: "physicalDefense", label: "Phys DEF", value: baseStats.physicalDefense },
                    { key: "magicPower", label: "Magic PWR", value: baseStats.magicPower },
                    { key: "magicDefense", label: "Magic DEF", value: baseStats.magicDefense },
                    { key: "attackSpeed", label: "ATK Spd", value: baseStats.attackSpeed },
                    { key: "movementSpeed", label: "Move Spd", value: baseStats.movementSpeed },
                  ].map((s) => {
                    const colors = STAT_COLORS[s.key] || {
                      bar: "bg-gray-500",
                      text: "text-gray-400",
                    };
                    return (
                      <div key={s.key} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-mono uppercase tracking-wider text-gray-600">
                            {s.label}
                          </span>
                          <span
                            className={`text-[11px] font-mono font-bold ${colors.text}`}
                          >
                            {s.value ?? "–"}
                          </span>
                        </div>
                        <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{
                              width: `${getStatPercent(s.key, s.value || 0)}%`,
                            }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className={`h-full rounded-full ${colors.bar}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </div>

            {/* SECTION 10: TACTICAL PROFILE */}
            <div>
              <SectionHeader icon={<Shield className="w-3.5 h-3.5 text-purple-400" />} label="Tactical Profile" color="purple" />
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4 }}
                className="glass-card rounded-2xl p-5 space-y-4"
              >
                {/* Playstyle tags */}
                {hero.playstyleTags?.length > 0 && (
                  <div>
                    <div className="text-[9px] font-mono uppercase tracking-wider text-emerald-400/70 mb-2">
                      When to Pick
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {hero.playstyleTags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/15 text-[10px] font-mono text-emerald-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Counter tags */}
                {hero.counterTags?.length > 0 && (
                  <div>
                    <div className="text-[9px] font-mono uppercase tracking-wider text-rose-400/70 mb-2">
                      Avoid Picking When
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {hero.counterTags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/15 text-[10px] font-mono text-rose-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Synergy tags */}
                {hero.synergyTags?.length > 0 && (
                  <div>
                    <div className="text-[9px] font-mono uppercase tracking-wider text-sky-400/70 mb-2">
                      Pairs Well With
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {hero.synergyTags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/15 text-[10px] font-mono text-sky-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Draft tags */}
                {hero.draftTags?.length > 0 && (
                  <div>
                    <div className="text-[9px] font-mono uppercase tracking-wider text-violet-400/70 mb-2">
                      Draft Role
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {hero.draftTags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/15 text-[10px] font-mono text-violet-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Power spike tags */}
                {hero.powerSpikeTags?.length > 0 && (
                  <div>
                    <div className="text-[9px] font-mono uppercase tracking-wider text-amber-400/70 mb-2">
                      Power Spike
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {hero.powerSpikeTags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/15 text-[10px] font-mono text-amber-400"
                        >
                          <Zap className="w-2.5 h-2.5 inline mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Macro note */}
                {hero.mechanicNote && (
                  <div>
                    <div className="text-[9px] font-mono uppercase tracking-wider text-gray-500 mb-2">
                      Macro Notes
                    </div>
                    <p className="text-gray-400 text-[11px] leading-relaxed p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      {hero.mechanicNote}
                    </p>
                  </div>
                )}

                {/* Strategic Data strengths/weaknesses */}
                {hero.strategicData && (
                  <>
                    {hero.strategicData.macroIdentity?.length > 0 && (
                      <div>
                        <div className="text-[9px] font-mono uppercase tracking-wider text-gray-500 mb-2">
                          Macro Identity
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {hero.strategicData.macroIdentity.map(
                            (tag: string, i: number) => (
                              <span
                                key={i}
                                className="px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[10px] font-mono text-gray-400"
                              >
                                {tag}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}
                    {hero.strategicData.powerSpikeTiming?.length > 0 && (
                      <div>
                        <div className="text-[9px] font-mono uppercase tracking-wider text-gray-500 mb-2">
                          Timing
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {hero.strategicData.powerSpikeTiming.map(
                            (t: string, i: number) => (
                              <span
                                key={i}
                                className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/15 text-[10px] font-mono text-cyan-400"
                              >
                                <Clock className="w-2.5 h-2.5 inline mr-1" />
                                {t}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}
                    {hero.strategicData.tempoClassification && (
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-gray-500">
                          Tempo:
                        </span>
                        <span className="text-[10px] font-mono font-bold text-cyan-400">
                          {hero.strategicData.tempoClassification}
                        </span>
                      </div>
                    )}
                  </>
                )}

                {/* Connections */}
                {hero.connections && hero.connections.length > 0 && (
                  <div>
                    <div className="text-[9px] font-mono uppercase tracking-wider text-gray-500 mb-2">
                      Connections
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {hero.connections.map((conn, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                        >
                          <FallbackImage
                            src={getHeroImageUrl(conn.name, heroAssets)}
                            fallbackText={conn.name}
                            alt={conn.name}
                            className="w-6 h-6 rounded object-cover"
                            containerClassName="w-6 h-6 rounded shrink-0"
                          />
                          <div>
                            <div className="text-[10px] font-bold text-gray-300">
                              {conn.name}
                            </div>
                            <div className="text-[8px] font-mono uppercase tracking-wider text-cyan-400/60">
                              {conn.relationship}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== SUB COMPONENTS ===== */

function SectionHeader({
  icon,
  label,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
}) {
  return (
    <h2 className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-gray-500 mb-3 flex items-center gap-2">
      {icon}
      {label}
    </h2>
  );
}

function StatChip({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="px-4 py-2 rounded-xl border border-white/[0.06] bg-white/[0.03]">
      <div className="text-[8px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-0.5">
        {label}
      </div>
      <div className={`text-base font-display font-black ${color}`}>{value}</div>
    </div>
  );
}
