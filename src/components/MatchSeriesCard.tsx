import React, { useState } from "react";
import { ChevronDown, Clock, Map, Star } from "lucide-react";
import type { SeriesMatch, GameData } from "../hooks/useTeamMatchHistory";
import FallbackImage from "./FallbackImage";
import { getHeroImageUrl } from "../lib/heroUtils";

interface MatchSeriesCardProps {
  series: SeriesMatch;
  selectedTeamKey: string;
  heroAssets: Record<string, string>;
  getTeamLogo?: (teamKey: string) => string;
}

function HeroIcon({
  heroName,
  heroAssets,
}: {
  heroName: string;
  heroAssets: Record<string, string>;
}) {
  const src = getHeroImageUrl(heroName, heroAssets);
  return (
    <FallbackImage
      src={src}
      alt={heroName}
      fallbackText={heroName || "?"}
      className="h-7 w-7 rounded-md border border-gray-800 object-cover"
      containerClassName="h-7 w-7 rounded-md border border-gray-800 bg-gray-950 text-[8px]"
      title={heroName}
    />
  );
}

function DraftRow({
  label,
  team,
  side,
  picks,
  bans,
  heroAssets,
}: {
  label: string;
  team: string;
  side: "blue" | "red";
  picks: string[];
  bans: string[];
  heroAssets: Record<string, string>;
}) {
  return (
    <div className="rounded-lg border border-gray-900 bg-black/20 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${side === "blue" ? "bg-blue-400" : "bg-rose-400"}`} />
        <span className={`w-10 text-[10px] font-bold uppercase ${side === "blue" ? "text-blue-400" : "text-rose-400"}`}>
          {label}
        </span>
        <span className="text-xs font-semibold text-gray-200">{team}</span>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <div>
          <div className="mb-1 text-[9px] font-mono uppercase tracking-widest text-gray-500">Picks</div>
          <div className="flex flex-wrap gap-1">
            {(picks || []).map((hero, index) => (
              <HeroIcon key={`${team}-pick-${hero}-${index}`} heroName={hero} heroAssets={heroAssets} />
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1 text-[9px] font-mono uppercase tracking-widest text-gray-500">Bans</div>
          <div className="flex flex-wrap gap-1 opacity-80">
            {(bans || []).map((hero, index) => (
              <HeroIcon key={`${team}-ban-${hero}-${index}`} heroName={hero} heroAssets={heroAssets} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GameDetail({
  game,
  heroAssets,
}: {
  game: GameData;
  heroAssets: Record<string, string>;
}) {
  return (
    <div className="border-t border-gray-900 bg-[#060b13]/70 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded bg-gray-900 px-2 py-1 text-xs font-black text-white">
            Game {game.gameNumber}
          </span>
          <span className="rounded bg-emerald-950/40 px-2 py-1 text-[10px] font-bold uppercase text-emerald-300">
            W: {game.winner}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-indigo-400" />
            {game.duration || "Data tidak tersedia"}
          </span>
          <span className="flex items-center gap-1">
            <Map className="h-3.5 w-3.5 text-cyan-400" />
            {game.mapMode || "Data tidak tersedia"}
          </span>
          {game.mvp && game.mvp !== "Data tidak tersedia" && (
            <span className="flex items-center gap-1 text-amber-300">
              <Star className="h-3.5 w-3.5" />
              MVP: {game.mvp}
            </span>
          )}
        </div>
      </div>
      <div className="grid gap-3">
        <DraftRow
          label="Blue"
          side="blue"
          team={game.blueTeam}
          picks={game.bluePicks || []}
          bans={game.blueBans || []}
          heroAssets={heroAssets}
        />
        <DraftRow
          label="Red"
          side="red"
          team={game.redTeam}
          picks={game.redPicks || []}
          bans={game.redBans || []}
          heroAssets={heroAssets}
        />
      </div>
    </div>
  );
}

export default function MatchSeriesCard({
  series,
  selectedTeamKey,
  heroAssets,
  getTeamLogo,
}: MatchSeriesCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isWin = series.winner.toLowerCase() === selectedTeamKey.toLowerCase();

  return (
    <div className="overflow-hidden rounded-xl border border-gray-900 bg-[#050914] shadow-lg shadow-black/20">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full cursor-pointer px-4 py-3 text-left transition hover:bg-indigo-950/10"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded px-2 py-1 text-xs font-black ${
                isWin ? "bg-emerald-900/60 text-emerald-200" : "bg-red-900/60 text-red-200"
              }`}
            >
              {isWin ? "W" : "L"}
            </span>
            <span className="rounded bg-indigo-950/60 px-2 py-1 font-mono text-[10px] font-bold text-indigo-200">
              W{series.week}D{series.day}
            </span>
            <span className="text-xs text-gray-500">{series.date}</span>
            <span className="rounded bg-gray-900 px-2 py-1 text-[10px] font-bold text-gray-300">
              {series.format}
            </span>
          </div>
          <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>

        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className={`flex items-center gap-2 ${series.winner === series.teamA ? "text-white" : "text-gray-500"}`}>
            {getTeamLogo && <img src={getTeamLogo(series.teamA)} alt={series.teamA} className="h-8 w-8 object-contain" />}
            <span className="truncate text-sm font-bold">{series.teamA}</span>
          </div>
          <div className="rounded-lg border border-gray-800 bg-black/30 px-4 py-1 font-mono text-xl font-black text-white">
            {series.teamAScore} : {series.teamBScore}
          </div>
          <div className={`flex items-center justify-end gap-2 ${series.winner === series.teamB ? "text-white" : "text-gray-500"}`}>
            <span className="truncate text-right text-sm font-bold">{series.teamB}</span>
            {getTeamLogo && <img src={getTeamLogo(series.teamB)} alt={series.teamB} className="h-8 w-8 object-contain" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div>
          {series.games.map((game) => (
            <GameDetail key={`${series.id}-${game.gameNumber}`} game={game} heroAssets={heroAssets} />
          ))}
          <details className="border-t border-gray-900 px-4 py-2 text-[9px] font-mono text-gray-600">
            <summary className="cursor-pointer hover:text-gray-400">Debug</summary>
            <div className="mt-1">
              ID: {series.id} | Week {series.week} Day {series.day} | {series.date} | {series.games.length} games
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
