import React from "react";
import FallbackImage from "./FallbackImage";
import { getHeroImageUrl } from "../lib/heroUtils";

interface HeroCardProps {
  heroName: string;
  heroAssets: Record<string, string>;
  role?: string;
  tier?: string;
  winrate?: string;
  picks?: string;
  bans?: string;
  presence?: string;
  isSelected?: boolean;
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
  if (wr >= 55) return "#2ECC71";
  if (wr <= 47) return "#ff4444";
  return "#C8AA6E";
}

function getWinRateGradient(wr: number): string {
  if (wr >= 55) return "linear-gradient(90deg, #2ECC71, #27ae60)";
  if (wr <= 47) return "linear-gradient(90deg, #ff4444, #cc2222)";
  return "linear-gradient(90deg, #C8AA6E, #F0D060)";
}

function parseWinrate(wr?: string): number {
  if (!wr) return 0;
  return parseFloat(String(wr).replace("%", "")) || 0;
}

export default function HeroCard({
  heroName,
  heroAssets,
  role,
  tier,
  winrate,
  picks,
  bans,
  isSelected,
  onClick,
}: HeroCardProps) {
  const img = getHeroImageUrl(heroName, heroAssets);
  const roleColor = getRoleColor(role);
  const wr = parseWinrate(winrate);
  const cleanTier = tier ? tier.toUpperCase().replace("S_PLUS", "S+") : "";
  const tierStyle = TIER_GRADIENT[cleanTier] || null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative cursor-pointer overflow-hidden clip-angular border transition-all duration-300 hover:-translate-y-2 hover:shadow-xl
        ${isSelected
          ? "border-amber-500/50"
          : "border-white/[0.08] hover:border-white/[0.15]"
        }`}
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
          fallbackText={heroName}
          alt={heroName}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          containerClassName="w-full h-full flex items-center justify-center text-6xl font-bold bg-[#0d1225]"
          referrerPolicy="no-referrer"
        />

        {/* Bottom gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1225] via-[#0d1225]/50 to-transparent pointer-events-none" />

        {/* Top-left: Role badge */}
        {role && (
          <div className="absolute top-3 left-3 z-10">
            <div
              className="w-7 h-7 flex items-center justify-center clip-angular-sm text-[8px] font-black uppercase"
              style={{
                backgroundColor: `${roleColor}25`,
                border: `1px solid ${roleColor}80`,
                color: roleColor,
              }}
            >
              {ROLE_SHORT[role] || role.slice(0, 3)}
            </div>
          </div>
        )}

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
              {cleanTier}
            </div>
          </div>
        )}

        {/* Bottom: Hero name + stats */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          <h4
            className="font-bold text-lg text-white group-hover:text-[var(--role-color)] transition-colors drop-shadow-lg leading-tight truncate"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {heroName}
          </h4>

          {/* Stats Row: Win / Pick / Ban */}
          <div className="flex items-end gap-4 text-xs mt-1">
            {wr > 0 && (
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Win</span>
                <span className="font-bold tabular-nums" style={{ color: getWinRateColor(wr), fontFamily: "var(--font-display)" }}>
                  {winrate}
                </span>
              </div>
            )}
            {picks && (
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Pick</span>
                <span className="text-gray-300 font-bold" style={{ fontFamily: "var(--font-display)" }}>
                  {picks}
                </span>
              </div>
            )}
            {bans && (
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Ban</span>
                <span className="font-bold" style={{ color: parseInt(bans) > 20 ? "#ff4444" : "#9BA0B4", fontFamily: "var(--font-display)" }}>
                  {bans}
                </span>
              </div>
            )}
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
        </div>
      </div>

      {/* Selected glow */}
      {isSelected && (
        <>
          <div className="absolute inset-0 border-2 border-amber-500/40 clip-angular pointer-events-none z-10" />
          <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${roleColor}, transparent)` }} />
        </>
      )}

      {/* Bottom glow line on hover */}
      <div
        className="h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `linear-gradient(90deg, transparent, ${roleColor}, transparent)` }}
      />

      {/* Corner accents on hover */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-transparent group-hover:border-amber-500/50 transition-all duration-300 pointer-events-none z-10" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-transparent group-hover:border-amber-500/50 transition-all duration-300 pointer-events-none z-10" />
    </button>
  );
}
