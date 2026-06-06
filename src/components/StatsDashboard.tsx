import React, { useState, useMemo } from "react";
import {
  ArrowLeft,
  Search,
  Swords,
  Trophy,
  Sparkles,
  Database,
  Cpu,
  History,
  Ghost,
  Shield,
  Target,
} from "lucide-react";
import { HeroStats } from "../types";
import heroesMaster from "../data/heroes_master.json";
import FallbackImage from "./FallbackImage";
import { getHeroImageUrl, getHeroRole } from "../lib/heroUtils";

interface StatsDashboardProps {
  heroes: HeroStats[];
  heroAssets: Record<string, string>;
  onOpenHeroIntelligence?: (heroName: string) => void;
}

export default function StatsDashboard({
  heroes,
  heroAssets,
  onOpenHeroIntelligence,
}: StatsDashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("ALL");
  const [sortBy, setSortBy] = useState<
    "presence" | "winrate" | "picks" | "bans" | "name"
  >("presence");
  const [selectedHero, setSelectedHero] = useState<HeroStats | null>(null);

  const roles = [
    "ALL",
    "Assassin",
    "Fighter",
    "Mage",
    "Marksman",
    "Tank",
    "Support",
  ];

  const processedHeroes = useMemo(() => {
    return heroes.map((h) => ({
      ...h,
      role: getHeroRole(h.hero_name),
      // Ensure numeric conversions for sorting
      picksNum: parseInt(h.picks_total || "0", 10),
      bansNum: parseInt(h.bans_total || "0", 10),
      presenceNum: parseFloat((h.tournament_presence || "0").replace("%", "")),
      winrateNum: parseFloat((h.winrate || "0").replace("%", "")),
    }));
  }, [heroes]);

  const filteredAndSorted = useMemo(() => {
    return processedHeroes
      .filter((hero) => {
        const matchesSearch = String(hero.hero_name || "")
          .toLowerCase()
          .includes(String(searchTerm || "").toLowerCase());
        const matchesRole =
          selectedRole === "ALL" || hero.role === selectedRole;
        return matchesSearch && matchesRole;
      })
      .sort((a, b) => {
        if (sortBy === "presence") return b.presenceNum - a.presenceNum;
        if (sortBy === "winrate") return b.winrateNum - a.winrateNum;
        if (sortBy === "picks") return b.picksNum - a.picksNum;
        if (sortBy === "bans") return b.bansNum - a.bansNum;
        return String(a.hero_name || "").localeCompare(
          String(b.hero_name || ""),
        );
      });
  }, [processedHeroes, searchTerm, selectedRole, sortBy]);

  // Set default selected hero when list changes
  React.useEffect(() => {
    if (filteredAndSorted.length > 0 && !selectedHero) {
      setSelectedHero(filteredAndSorted[0]);
    }
  }, [filteredAndSorted, selectedHero]);

  const { unpickedHeroes, unbannedHeroes, completelyIgnored } = useMemo(() => {
    const statsMap = new Map();
    processedHeroes.forEach((h) => {
      const normalName = String(h.hero_name || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "");
      statsMap.set(normalName, h);
    });

    const unpicked: any[] = [];
    const unbanned: any[] = [];
    const ignored: any[] = [];

    heroesMaster.forEach((masterHero) => {
      const normalName =
        masterHero.slug ||
        masterHero.hero_name.toLowerCase().replace(/[^a-z0-9]+/g, "");
      const stat = statsMap.get(normalName);

      const picks = stat ? stat.picksNum : 0;
      const bans = stat ? stat.bansNum : 0;

      const heroObj = {
        hero_name: masterHero.hero_name,
        slug: masterHero.slug,
        role: Array.isArray(masterHero.role)
          ? masterHero.role.join(", ")
          : masterHero.role,
        picks,
        bans,
      };

      if (picks === 0) unpicked.push(heroObj);
      if (bans === 0) unbanned.push(heroObj);
      if (picks === 0 && bans === 0) ignored.push(heroObj);
    });

    return {
      unpickedHeroes: unpicked,
      unbannedHeroes: unbanned,
      completelyIgnored: ignored,
    };
  }, [processedHeroes]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 sm:hidden">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="btn-ghost justify-start text-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </button>
        <div className="ui-badge border-white/10 bg-white/[0.04] text-slate-300">
          Hero Stats
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* List Panel */}
        <div className="lg:col-span-2 flex flex-col gap-4 rounded-xl border border-gray-900 bg-gray-950 p-4 shadow-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-900 pb-3">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <Swords className="h-5 w-5 text-indigo-400" />
                Statistik Hero MPL ID
              </h2>
              <p className="text-xs text-gray-400">
                Analisis preferensi pick, ban, dan performa win rate per side.
              </p>
            </div>

            <div className="font-mono text-[10px] rounded px-2.5 py-1 bg-indigo-900/20 text-indigo-400 font-semibold border border-indigo-500/10">
              TOTAL HERO: {filteredAndSorted.length}
            </div>
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Cari nama hero..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-800 bg-gray-900 py-1.5 pl-9 pr-4 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
              />
            </div>

            {/* Role Filter */}
            <div>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-1.5 text-sm text-gray-300 outline-none focus:border-indigo-600 transition"
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    Role: {role}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Filter */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-1.5 text-sm text-gray-300 outline-none focus:border-indigo-600 transition"
              >
                <option value="presence">Urutkan: Presensi / Kontes</option>
                <option value="winrate">Urutkan: Win Rate Tertinggi</option>
                <option value="picks">Urutkan: Sering Di-pick</option>
                <option value="bans">Urutkan: Sering Di-ban</option>
                <option value="name">Urutkan: Abjad</option>
              </select>
            </div>
          </div>

          {/* Hero Grid List */}
          <div className="max-h-[500px] overflow-y-auto pr-1 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 scrollbar-thin">
            {filteredAndSorted.map((hero) => {
              const isSelected = selectedHero?.hero_name === hero.hero_name;
              const img = getHeroImageUrl(hero.hero_name, heroAssets);
              return (
                <button
                  key={hero.hero_name}
                  onClick={() => setSelectedHero(hero)}
                  className={`group relative flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-950/20 shadow-lg shadow-indigo-500/5"
                      : "border-gray-800 bg-gray-900/40 hover:border-gray-700 hover:bg-gray-900/80"
                  }`}
                >
                  <div className="relative shrink-0">
                    <FallbackImage
                      src={img}
                      fallbackText={hero.hero_name}
                      alt={hero.hero_name}
                      className="h-10 w-10 rounded-lg object-cover bg-gray-950 p-0.5 border border-gray-800 group-hover:scale-105 transition duration-200"
                      containerClassName="h-10 w-10 rounded-lg text-xs"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute -bottom-1 -right-1 flex h-4 items-center justify-center rounded bg-gray-950 border border-gray-800 px-1 text-[8px] font-bold text-gray-400 uppercase tracking-tight">
                      {hero.role?.slice(0, 3)}
                    </div>
                  </div>

                  <div className="overflow-hidden">
                    <h4 className="truncate font-sans text-xs font-semibold text-white group-hover:text-indigo-400 transition-colors">
                      {hero.hero_name}
                    </h4>
                    <div className="flex items-center gap-1.5 font-mono text-[9px] text-gray-500">
                      <span className="text-emerald-400 font-semibold">
                        {hero.winrate} WR
                      </span>
                      <span>•</span>
                      <span>{hero.picks_total}P</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Details Panel */}
        <div className="flex flex-col gap-4 rounded-xl border border-gray-900 bg-gray-950 p-5 shadow-xl">
          {selectedHero ? (
            <>
              {/* Header Details */}
              <div className="flex items-start justify-between border-b border-gray-900 pb-4">
                <div className="flex items-center gap-4">
                  <FallbackImage
                    src={getHeroImageUrl(selectedHero.hero_name, heroAssets)}
                    fallbackText={selectedHero.hero_name}
                    alt={selectedHero.hero_name}
                    className="h-16 w-16 rounded-xl border-2 border-indigo-500/50 bg-gray-900 p-1 shadow-inner object-cover"
                    containerClassName="h-16 w-16 rounded-xl text-lg border-2 border-indigo-500/50 bg-gray-900"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <span className="inline-block rounded-md bg-indigo-900/30 border border-indigo-500/10 px-2 py-0.5 text-[9px] font-semibold text-indigo-400 uppercase tracking-wider mb-1">
                      {selectedHero.role || getHeroRole(selectedHero.hero_name)}
                    </span>
                    <h3 className="font-sans text-xl font-bold tracking-tight text-white">
                      {selectedHero.hero_name}
                    </h3>
                    <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">
                      Liquipedia S17 Analytics
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onOpenHeroIntelligence?.(selectedHero.hero_name)}
                  className="flex items-center gap-1.5 rounded bg-indigo-600/20 px-3 py-1.5 text-xs font-bold text-indigo-400 hover:bg-indigo-600/30 hover:text-indigo-300 transition-colors border border-indigo-500/30 cursor-pointer"
                  title="View in Hero Intelligence Tab"
                >
                  <Database className="h-3.5 w-3.5" />
                  Intelligence Profile
                </button>
              </div>

              {/* Core Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-gray-900/60 border border-gray-800/60 p-3 text-center">
                  <span className="font-mono text-[10px] text-gray-500 uppercase block mb-1">
                    Presensi / Kontes
                  </span>
                  <span className="font-sans text-lg font-bold text-white tracking-tight">
                    {selectedHero.tournament_presence}
                  </span>
                  <div className="font-mono text-[9px] text-gray-400 mt-1">
                    Pick+Ban {selectedHero.picks_bans_total || 0} Kali
                  </div>
                </div>

                <div className="rounded-lg bg-gray-900/60 border border-gray-800/60 p-3 text-center">
                  <span className="font-mono text-[10px] text-gray-500 uppercase block mb-1">
                    Kemenangan (WR)
                  </span>
                  <span
                    className={`font-sans text-lg font-bold tracking-tight ${
                      parseFloat(selectedHero.winrate) >= 55
                        ? "text-emerald-400"
                        : parseFloat(selectedHero.winrate) >= 47
                          ? "text-indigo-400"
                          : "text-rose-450"
                    }`}
                  >
                    {selectedHero.winrate}
                  </span>
                  <div className="font-mono text-[9px] text-gray-400 mt-1">
                    Win {selectedHero.picks_win} / Loss{" "}
                    {selectedHero.picks_loss}
                  </div>
                </div>
              </div>

              {/* Picks vs Bans Breakdown */}
              <div className="border-t border-gray-900 pt-3">
                <h4 className="font-sans text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                  Distribusi Pick & Ban
                </h4>
                <div className="flex flex-col gap-3">
                  {/* Picks Line */}
                  <div>
                    <div className="flex justify-between font-mono text-xs text-gray-400 mb-1">
                      <span>Total Pick</span>
                      <span className="font-bold text-white">
                        {selectedHero.picks_total} Kali
                      </span>
                    </div>
                    <div className="h-2 w-full bg-gray-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{
                          width: `${Math.min(100, (parseInt(selectedHero.picks_total || "0") / 110) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Bans Line */}
                  <div>
                    <div className="flex justify-between font-mono text-xs text-gray-400 mb-1">
                      <span>Total Ban</span>
                      <span className="font-bold text-white">
                        {selectedHero.bans_total} Kali
                      </span>
                    </div>
                    <div className="h-2 w-full bg-gray-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full"
                        style={{
                          width: `${Math.min(100, (parseInt(selectedHero.bans_total || "0") / 110) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Side Matchup Breakdown */}
              <div className="border-t border-gray-900 pt-3">
                <h4 className="font-sans text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                  Analisis Sisi (Blue vs Red)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {/* Blue Side */}
                  <div className="rounded-lg bg-indigo-950/20 border border-indigo-900/30 p-2.5">
                    <div className="font-mono text-[9px] text-indigo-400 font-bold uppercase tracking-wider mb-1">
                      Blue Side
                    </div>
                    <div className="font-sans text-md font-bold text-white">
                      {selectedHero.blue_side_wr || "0.0%"}{" "}
                      <span className="text-[10px] text-gray-400 font-normal">
                        WR
                      </span>
                    </div>
                    <div className="font-mono text-[9px] text-gray-500 mt-1">
                      Picks: {selectedHero.blue_side_picks || 0} (
                      {selectedHero.blue_side_win}W /{" "}
                      {selectedHero.blue_side_loss}L)
                    </div>
                  </div>

                  {/* Red Side */}
                  <div className="rounded-lg bg-rose-950/10 border border-rose-950/40 p-2.5">
                    <div className="font-mono text-[9px] text-rose-400 font-bold uppercase tracking-wider mb-1">
                      Red Side
                    </div>
                    <div className="font-sans text-md font-bold text-white">
                      {selectedHero.red_side_wr || "0.0%"}{" "}
                      <span className="text-[10px] text-gray-400 font-normal">
                        WR
                      </span>
                    </div>
                    <div className="font-mono text-[9px] text-gray-500 mt-1">
                      Picks: {selectedHero.red_side_picks || 0} (
                      {selectedHero.red_side_win}W /{" "}
                      {selectedHero.red_side_loss}
                      L)
                    </div>
                  </div>
                </div>
              </div>

              {/* Coach Insights */}
              <div className="mt-auto rounded-lg bg-indigo-900/10 border border-indigo-500/10 p-3 flex flex-col gap-1">
                <h5 className="font-sans text-[11px] font-bold text-indigo-400 flex items-center gap-1.5 uppercase tracking-wide">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                  Draft Simulator Note
                </h5>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  Hero {selectedHero.hero_name} berkontribusi{" "}
                  {selectedHero.tournament_presence} dari total kehadiran draft
                  pro. Mengamankan hero ini di sisi{" "}
                  {parseFloat(selectedHero.blue_side_wr) >=
                  parseFloat(selectedHero.red_side_wr)
                    ? "First Pick (Blue)"
                    : "Second Pick (Red)"}{" "}
                  memberikan keuntungan statistikal winrate yang lebih tinggi.
                </p>
              </div>

              {/* Advanced Profile Button */}
              <div className="mt-2 border-t border-gray-900 pt-3">
                <button
                  onClick={() => onOpenHeroIntelligence?.(selectedHero.hero_name)}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 hover:text-indigo-300 font-bold py-3 rounded-lg shadow-lg shadow-indigo-500/10 cursor-pointer border border-indigo-500/20 hover:border-indigo-500/40 transition-all"
                  title="Open Hero Intelligence Dashboard"
                >
                  <Cpu className="h-5 w-5" />
                  View Intelligence Profile
                </button>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center py-20 text-gray-600">
              <Trophy className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm font-sans">
                Pilih hero untuk melihat detail statistik performa.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Hero Pool Analysis Section */}
      <div className="rounded-xl border border-gray-900 bg-[#0a1120] p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Target className="w-48 h-48" />
        </div>
        <div className="mb-8 relative z-10">
          <h2 className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-500 uppercase flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" /> Tournament Metagame
            Voids
          </h2>
          <p className="text-sm text-gray-500 mt-2 max-w-2xl leading-relaxed">
            Analisis struktural pool hero. Mengidentifikasi kelemahan meta,
            hidden priorities, dan secret picks. Bagian ini menyoroti anomali
            turnamen: hero yang secara teknis ada di roster namun diabaikan,
            diprioritaskan, atau sepenuhnya terlupakan dalam sistem kompetitif
            tertinggi.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
          {/* Unpicked Heroes */}
          <div className="bg-[#101827] border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition">
            <div className="flex items-center justify-between mb-3 border-b border-gray-800/80 pb-3">
              <h3 className="font-sans text-sm font-bold text-gray-200 flex items-center gap-2">
                <History className="w-4 h-4 text-orange-400" />
                Unpicked Heroes
              </h3>
              <span className="bg-orange-950/30 text-orange-400 border border-orange-900/40 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                {unpickedHeroes.length} HEROES
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mb-5 leading-relaxed bg-black/20 p-3 rounded-lg border border-gray-800/50">
              Mungkin sering di-ban namun <strong>tidak pernah</strong> dipilih
              (first-pick/blind-pick). Menandakan bahwa tim menghormati potensi
              counter mereka yang spesifik, namun hero tersebut tidak cukup
              fleksibel atau stabil untuk menjadi prioritas draf utama.
            </p>
            <div className="flex flex-wrap gap-2 transition">
              {unpickedHeroes.length > 0 ? (
                unpickedHeroes.map((h) => (
                  <button
                    key={h.hero_name}
                    onClick={() => onOpenHeroIntelligence?.(h.hero_name)}
                    className="relative group/icon"
                    title={`View ${h.hero_name} Intelligence`}
                  >
                    <FallbackImage
                      src={getHeroImageUrl(h.hero_name, heroAssets)}
                      fallbackText={h.hero_name}
                      alt={h.hero_name}
                      containerClassName="w-9 h-9 rounded-lg shrink-0 text-[10px]"
                      className="w-9 h-9 rounded-lg shrink-0 object-cover border border-gray-700 opacity-60 group-hover/icon:opacity-100 group-hover/icon:border-orange-500 group-hover/icon:scale-110 transition-all duration-200"
                    />
                    <div className="absolute opacity-0 group-hover/icon:opacity-100 transition-opacity bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black text-xs text-white px-3 py-2 rounded shadow-2xl z-20 pointer-events-none border border-gray-700 flex flex-col items-center gap-1">
                      <span className="font-bold text-sm text-gray-100">
                        {h.hero_name}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono tracking-wider">
                        {h.role || "Unknown"}
                      </span>
                      <div className="flex gap-2 text-[9px] mt-1">
                        <span className="bg-gray-800 px-1 py-0.5 rounded text-orange-400">
                          Picks: {h.picks}
                        </span>
                        <span className="bg-gray-800 px-1 py-0.5 rounded text-emerald-400">
                          Bans: {h.bans}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <span className="text-xs text-gray-600 font-mono italic">
                  No unpicked heroes.
                </span>
              )}
            </div>
          </div>

          {/* Unbanned Heroes */}
          <div className="bg-[#101827] border border-emerald-900/20 rounded-xl p-5 hover:border-emerald-900/40 transition">
            <div className="flex items-center justify-between mb-3 border-b border-gray-800/80 pb-3">
              <h3 className="font-sans text-sm font-bold text-gray-200 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                Unbanned Heroes
              </h3>
              <span className="bg-emerald-950/30 text-emerald-400 border border-emerald-900/40 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                {unbannedHeroes.length} HEROES
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mb-5 leading-relaxed bg-black/20 p-3 rounded-lg border border-gray-800/50">
              Dipilih sesekali namun <strong>tidak pernah</strong> di-ban.
              Merepresentasikan pilar kestabilan draf. Mereka adalah *safe
              fallback picks* yang fungsional, adil secara mekanik, dan tidak
              ditakuti secara strategis oleh tim lawan.
            </p>
            <div className="flex flex-wrap gap-2 transition">
              {unbannedHeroes.length > 0 ? (
                unbannedHeroes.map((h) => (
                  <button
                    key={h.hero_name}
                    onClick={() => onOpenHeroIntelligence?.(h.hero_name)}
                    className="relative group/icon"
                    title={`View ${h.hero_name} Intelligence`}
                  >
                    <FallbackImage
                      src={getHeroImageUrl(h.hero_name, heroAssets)}
                      fallbackText={h.hero_name}
                      alt={h.hero_name}
                      containerClassName="w-9 h-9 rounded-lg shrink-0 text-[10px]"
                      className="w-9 h-9 rounded-lg shrink-0 object-cover border border-gray-700 opacity-60 group-hover/icon:opacity-100 group-hover/icon:border-emerald-500 group-hover/icon:scale-110 transition-all duration-200"
                    />
                    <div className="absolute opacity-0 group-hover/icon:opacity-100 transition-opacity bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black text-xs text-white px-3 py-2 rounded shadow-2xl z-20 pointer-events-none border border-gray-700 flex flex-col items-center gap-1">
                      <span className="font-bold text-sm text-gray-100">
                        {h.hero_name}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono tracking-wider">
                        {h.role || "Unknown"}
                      </span>
                      <div className="flex gap-2 text-[9px] mt-1">
                        <span className="bg-gray-800 px-1 py-0.5 rounded text-orange-400">
                          Picks: {h.picks}
                        </span>
                        <span className="bg-gray-800 px-1 py-0.5 rounded text-emerald-400">
                          Bans: {h.bans}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <span className="text-xs text-gray-600 font-mono italic">
                  All heroes have been banned.
                </span>
              )}
            </div>
          </div>

          {/* Unpicked & Unbanned Heroes */}
          <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-5 hover:border-red-900/60 transition shadow-[inset_0_0_20px_rgba(220,38,38,0.05)]">
            <div className="flex items-center justify-between mb-3 border-b border-red-900/20 pb-3">
              <h3 className="font-sans text-sm font-bold text-red-300 flex items-center gap-2">
                <Ghost className="w-4 h-4 text-red-500" />
                Completely Ignored
              </h3>
              <span className="bg-red-950/50 text-red-400 border border-red-900/50 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                {completelyIgnored.length} HEROES
              </span>
            </div>
            <p className="text-[11px] text-rose-300/80 mb-5 leading-relaxed bg-red-950/30 p-3 rounded-lg border border-red-900/30">
              <strong>0% Tournament Presence.</strong> Sama sekali tidak pernah
              dipick atau di-ban. Secara statistik pahlawan ini keluar dari
              relevansi patch. Mereka adalah korban *power creep* atau perubahan
              mikro yang menunggu buff drastis.
            </p>
            <div className="flex flex-wrap gap-2 transition">
              {completelyIgnored.length > 0 ? (
                completelyIgnored.map((h) => (
                  <button
                    key={h.hero_name}
                    onClick={() => onOpenHeroIntelligence?.(h.hero_name)}
                    className="relative group/icon"
                    title={`View ${h.hero_name} Intelligence`}
                  >
                    <FallbackImage
                      src={getHeroImageUrl(h.hero_name, heroAssets)}
                      fallbackText={h.hero_name}
                      alt={h.hero_name}
                      containerClassName="w-9 h-9 rounded-lg shrink-0 text-[10px]"
                      className="w-9 h-9 rounded-lg shrink-0 object-cover border border-gray-800 opacity-40 group-hover/icon:opacity-100 group-hover/icon:border-red-500 group-hover/icon:scale-110 transition-all duration-200 grayscale group-hover/icon:grayscale-0"
                    />
                    <div className="absolute opacity-0 group-hover/icon:opacity-100 transition-opacity bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-red-950 border border-red-800 text-xs text-white px-3 py-2 rounded shadow-2xl z-20 pointer-events-none flex flex-col items-center gap-1">
                      <span className="font-bold text-sm text-gray-100">
                        {h.hero_name}
                      </span>
                      <span className="text-[10px] text-rose-400 font-mono tracking-wider font-bold">
                        Priority: 0%
                      </span>
                      <div className="flex gap-2 text-[9px] mt-1">
                        <span className="bg-black/50 px-1 py-0.5 rounded text-gray-400 border border-gray-800">
                          Picks: 0
                        </span>
                        <span className="bg-black/50 px-1 py-0.5 rounded text-gray-400 border border-gray-800">
                          Bans: 0
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <span className="text-xs text-gray-600 font-mono italic">
                  No ignored heroes.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
