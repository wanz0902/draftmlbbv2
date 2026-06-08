import React from "react";
import FallbackImage from "./FallbackImage";
import { getHeroImageUrl } from "../lib/heroUtils";
import { DetailedHero } from "../types/hero";

interface HeroIntelCardProps {
  hero: DetailedHero;
  heroAssets: Record<string, string>;
  onClick?: () => void;
}

const ROLE_COLORS: Record<string, string> = {
  Assassin: "#00AAFF",
  Fighter: "#FF8C00",
  Mage: "#9B59B6",
  Marksman: "#E74C3C",
  Tank: "#3498DB",
  Support: "#2ECC71",
};

const ROLE_SHORT: Record<string, string> = {
  Assassin: "ASN",
  Fighter: "FHT",
  Mage: "MAG",
  Marksman: "MKS",
  Tank: "TNK",
  Support: "SUP",
};

const TIER_GRADIENT: Record<string, { bg: string; text: string; shadow: string }> = {
  "S":  { bg: "linear-gradient(135deg, #FFD700, #FFA500)", text: "#1a0a00", shadow: "0 0 12px rgba(255,215,0,0.4)" },
  "S+": { bg: "linear-gradient(135deg, #FFD700, #FFA500)", text: "#1a0a00", shadow: "0 0 12px rgba(255,215,0,0.4)" },
  "A":  { bg: "linear-gradient(135deg, #C8AA6E, #A08040)", text: "#1a1000", shadow: "0 0 12px rgba(200,170,110,0.3)" },
  "B":  { bg: "linear-gradient(135deg, #00AAFF, #0077CC)", text: "#001a33", shadow: "0 0 12px rgba(0,170,255,0.3)" },
  "C":  { bg: "linear-gradient(135deg, #9BA0B4, #606478)", text: "#1a1a20", shadow: "none" },
  "D":  { bg: "linear-gradient(135deg, #ff4444, #cc2222)", text: "#1a0000", shadow: "none" },
};

function getRoleColor(role?: string): string {
  if (!role) return "#FF8C00";
  return ROLE_COLORS[role] || "#FF8C00";
}

function getWinRateColor(wr: number): string {
  if (wr >= 52) return "#2ECC71";
  if (wr <= 48) return "#ff4444";
  return "#C8AA6E";
}

function getWinRateGradient(wr: number): string {
  if (wr >= 52) return "linear-gradient(90deg, #2ECC71, #27ae60)";
  if (wr <= 48) return "linear-gradient(90deg, #ff4444, #cc2222)";
  return "linear-gradient(90deg, #C8AA6E, #F0D060)";
}

export default function HeroIntelCard({ hero, heroAssets, onClick }: HeroIntelCardProps) {
  const heroName = hero.hero_name || (hero as any).name || "";
  const img = getHeroImageUrl(heroName, heroAssets);
  const roles = Array.isArray(hero.role) ? hero.role.filter(Boolean) : hero.role ? [hero.role] : [];
  const primaryRole = roles[0] || "";
  const roleColor = getRoleColor(primaryRole);
  const specialty = Array.isArray(hero.specialty) ? hero.specialty.filter(Boolean) : hero.specialty ? [String(hero.specialty)] : [];
  const tier = hero.tier ? String(hero.tier).toUpperCase().replace("S_PLUS", "S+") : "";
  const wr = typeof hero.win_rate === "number" ? hero.win_rate : 0;
  const lanes = Array.isArray(hero.lanes) ? hero.lanes.filter(Boolean) : [];
  const difficulty = hero.difficulty ? String(hero.difficulty) : "";
  const tierStyle = TIER_GRADIENT[tier] || null;

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden clip-angular border border-white/[0.08] transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
      style={{
        background: "linear-gradient(180deg, #1a1a2a, #0d1225)",
        ["--role-color" as string]: roleColor,
      }}
    >
      {/* Hover glow: role-colored radial gradient */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-[1]"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${roleColor}18 0%, transparent 70%)`,
        }}
      />

      {/* Image Area */}
      <div className="relative h-56 md:h-64 overflow-hidden bg-gradient-to-b from-[#1a1a2a] to-[#0d1225]">
        <FallbackImage
          src={img}
          fallbackText={heroName || "Unknown"}
          alt={heroName}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          containerClassName="w-full h-full flex items-center justify-center text-6xl font-bold bg-[#0d1225]"
          referrerPolicy="no-referrer"
        />

        {/* Bottom gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1225] via-[#0d1225]/50 to-transparent pointer-events-none" />

        {/* Top-left: Role badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          <div className="flex gap-1.5">
            {roles.slice(0, 2).map((rol) => (
              <div
                key={rol}
                className="w-7 h-7 flex items-center justify-center clip-angular-sm text-[8px] font-black uppercase"
                style={{
                  backgroundColor: `${getRoleColor(rol)}25`,
                  border: `1px solid ${getRoleColor(rol)}80`,
                  color: getRoleColor(rol),
                }}
              >
                {ROLE_SHORT[rol] || String(rol).slice(0, 3)}
              </div>
            ))}
          </div>
          {lanes.length > 0 && (
            <div className="flex gap-1">
              {lanes.slice(0, 2).map((lane) => (
                <div
                  key={lane}
                  className="w-5 h-5 flex items-center justify-center clip-angular-sm text-[7px] font-bold uppercase"
                  style={{
                    backgroundColor: "rgba(0,0,0,0.7)",
                    border: `1px solid ${roleColor}55`,
                    color: roleColor,
                  }}
                >
                  {String(lane).slice(0, 2)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top-right: Tier badge */}
        {tierStyle && (
          <div className="absolute top-3 right-3 z-10">
            <div
              className="w-8 h-8 flex items-center justify-center clip-angular-sm text-xs font-black"
              style={{
                background: tierStyle.bg,
                color: tierStyle.text,
                boxShadow: tierStyle.shadow,
              }}
            >
              {tier}
            </div>
          </div>
        )}

        {/* Bottom: Hero name + title + stats */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          <h2
            className="font-bold text-lg text-white group-hover:text-[var(--role-color)] transition-colors drop-shadow-lg leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {heroName}
          </h2>
          {specialty.length > 0 && (
            <p className="text-[11px] text-gray-400 leading-tight mb-3 truncate">
              {specialty.slice(0, 2).join(" / ")}
            </p>
          )}

          {/* Stats Row: Win / Pick / Ban + Win Rate Bar */}
          <div className="flex items-end gap-4 text-xs">
            {wr > 0 && (
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Win</span>
                <span className="font-bold tabular-nums" style={{ color: getWinRateColor(wr), fontFamily: "var(--font-display)" }}>
                  {wr}%
                </span>
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Difficulty</span>
              <span className="text-gray-300 font-bold" style={{ fontFamily: "var(--font-display)" }}>
                {difficulty || "—"}
              </span>
            </div>
            {/* Win rate bar */}
            <div className="flex-1 flex flex-col items-end">
              <div className="w-full max-w-[60px] h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: wr > 0 ? `${Math.min(100, wr)}%` : "0%",
                    background: getWinRateGradient(wr),
                  }}
                />
              </div>
            </div>
          </div>

          {/* View Intel CTA */}
          <div className="flex items-center gap-1.5 mt-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors group-hover:text-[var(--role-color)]" style={{ color: roleColor }}>
            <span>View Intel</span>
            <svg className="h-3 w-3 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Bottom glow line on hover */}
      <div
        className="h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `linear-gradient(90deg, transparent, ${roleColor}, transparent)` }}
      />

      {/* Corner accents on hover */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-transparent group-hover:border-amber-500/50 transition-all duration-300 pointer-events-none z-10" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-transparent group-hover:border-amber-500/50 transition-all duration-300 pointer-events-none z-10" />

      {/* Hover box-shadow with role color */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none clip-angular"
        style={{ boxShadow: `0 8px 32px ${roleColor}30, 0 0 24px ${roleColor}15` }}
      />
    </div>
  );
}
