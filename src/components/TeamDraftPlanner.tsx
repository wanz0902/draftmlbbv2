import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Shield,
  Swords,
  Target,
  Users,
  Trophy,
  BarChart3,
  Zap,
  ChevronRight,
  Ban,
  Star,
  TrendingUp,
} from "lucide-react";
import FallbackImage from "./FallbackImage";
import { getHeroImageUrl, getHeroRole } from "../lib/heroUtils";

interface TeamDraftPlannerProps {
  heroAssets: Record<string, string>;
  onOpenHeroIntelligence?: (heroName: string) => void;
}

interface TeamInfo {
  key: string;
  name: string;
  logo: string;
}

interface ComfortHero {
  heroName: string;
  picks: number;
  wins: number;
  winRate: number;
}

interface TeamIntel {
  teamId: string;
  teamName: string;
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  blueGames: number;
  blueWins: number;
  redGames: number;
  redWins: number;
  comfortHeroes: ComfortHero[];
  topBans: Array<{ heroName: string; count: number }>;
  targetBans: Array<{ opponent: string; heroes: Array<{ heroName: string; banCount: number }> }>;
  draftTendencies: string[];
  signatureCompositions: Array<{ name: string; heroes: string[]; games: number; winRate: number }>;
  heroPairings: Array<{ heroA: string; heroB: string; games: number; winRate: number }>;
  firstPickPreference: { heroName: string; count: number; winRate: number } | null;
  secondPickPreference: { heroName: string; count: number; winRate: number } | null;
}

const colorMap: Record<string, string> = {
  cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  violet: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
};

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#080e1a]/80 p-3 text-center">
      <div className="font-display text-2xl font-black text-white">{value}</div>
      <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">{label}</div>
    </div>
  );
}

function WinBar({ wins, total }: { wins: number; total: number }) {
  const pct = total > 0 ? Math.round((wins / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-[10px] font-bold text-cyan-400 w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function TeamDraftPlanner({ heroAssets, onOpenHeroIntelligence }: TeamDraftPlannerProps) {
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [intel, setIntel] = useState<TeamIntel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"comfort" | "bans" | "pairings" | "tendencies">("comfort");

  useEffect(() => {
    fetch("/api/draft/teams")
      .then((r) => r.json())
      .then((d) => { if (d.teams) setTeams(d.teams); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedTeam) { setIntel(null); return; }
    setLoading(true);
    setError("");
    fetch(`/api/draft/team-intel/${selectedTeam}`)
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((d) => setIntel(d))
      .catch(() => setError("Gagal memuat data tim."))
      .finally(() => setLoading(false));
  }, [selectedTeam]);

  const selectedTeamInfo = teams.find((t) => t.key === selectedTeam);

  const tabs = [
    { id: "comfort" as const, label: "Comfort Pool", icon: Star },
    { id: "bans" as const, label: "Ban Tendencies", icon: Ban },
    { id: "pairings" as const, label: "Hero Pairings", icon: Swords },
    { id: "tendencies" as const, label: "Draft Style", icon: TrendingUp },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-amber-400">
          <Target className="h-3 w-3" />
          Team Draft Planner
        </div>
        <h1 className="mt-4 font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
          Analisis Tim Lawan
        </h1>
        <p className="mt-2 text-sm text-slate-400 max-w-lg mx-auto">
          Pilih tim MPL untuk melihat profil draft, comfort hero, ban tendencies, dan hero pairings.
        </p>
      </div>

      {/* Team Selector */}
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
        {teams.map((t) => (
          <button
            key={t.key}
            onClick={() => setSelectedTeam(selectedTeam === t.key ? "" : t.key)}
            className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition-all cursor-pointer ${
              selectedTeam === t.key
                ? "border-amber-500/40 bg-amber-950/20 shadow-[0_0_20px_-8px_rgba(245,158,11,0.3)]"
                : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
            }`}
          >
            <div className="h-10 w-10 overflow-hidden rounded-lg border border-white/10 bg-[#060d1a]">
              {t.logo ? (
                <img src={t.logo} alt={t.name} className="h-full w-full object-contain p-0.5" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] font-black text-amber-400">{t.key.slice(0, 2)}</div>
              )}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${selectedTeam === t.key ? "text-amber-300" : "text-slate-500"}`}>
              {t.key}
            </span>
          </button>
        ))}
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-12">
          <div className="h-5 w-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-400">Memuat profil tim...</span>
        </div>
      )}
      {error && <div className="text-center text-sm text-rose-400 py-6">{error}</div>}

      {/* Team Profile */}
      {intel && !loading && (
        <>
          {/* Team Header */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#080e1a]/90 p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-14 w-14 overflow-hidden rounded-xl border border-white/10 bg-[#060d1a]">
                {selectedTeamInfo?.logo ? (
                  <img src={selectedTeamInfo.logo} alt={intel.teamName} className="h-full w-full object-contain p-1" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-black text-amber-400">{selectedTeam}</div>
                )}
              </div>
              <div>
                <h2 className="font-display text-2xl font-black text-white">{intel.teamName}</h2>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  {intel.totalGames} games &middot; {intel.totalWins}W &middot; {intel.totalLosses}L
                </div>
              </div>
              <div className="ml-auto text-right">
                <div className="font-display text-3xl font-black text-amber-400">{intel.winRate}%</div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-slate-500">Win Rate</div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Blue Side" value={`${intel.blueWins}W ${intel.blueGames - intel.blueWins}L`} color="blue" />
              <StatCard label="Red Side" value={`${intel.redWins}W ${intel.redGames - intel.redWins}L`} color="red" />
              <StatCard label="Blue WR" value={intel.blueGames > 0 ? `${Math.round((intel.blueWins / intel.blueGames) * 100)}%` : "-"} color="blue" />
              <StatCard label="Red WR" value={intel.redGames > 0 ? `${Math.round((intel.redWins / intel.redGames) * 100)}%` : "-"} color="red" />
            </div>

            {/* Pick Preference */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {intel.firstPickPreference && (
                <div className="flex items-center gap-3 rounded-xl border border-blue-500/15 bg-blue-950/10 p-3">
                  <div className="h-10 w-10 overflow-hidden rounded-lg border border-blue-500/20 bg-[#060d1a]">
                    <FallbackImage src={getHeroImageUrl(intel.firstPickPreference.heroName, heroAssets)} fallbackText={intel.firstPickPreference.heroName} alt={intel.firstPickPreference.heroName} className="h-full w-full object-cover" containerClassName="h-full w-full text-[7px]" />
                  </div>
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-blue-400">First Pick Preference</div>
                    <div className="text-sm font-bold text-white">{intel.firstPickPreference.heroName}</div>
                    <div className="text-[10px] text-slate-500">WR: {intel.firstPickPreference.winRate}%</div>
                  </div>
                </div>
              )}
              {intel.secondPickPreference && (
                <div className="flex items-center gap-3 rounded-xl border border-red-500/15 bg-red-950/10 p-3">
                  <div className="h-10 w-10 overflow-hidden rounded-lg border border-red-500/20 bg-[#060d1a]">
                    <FallbackImage src={getHeroImageUrl(intel.secondPickPreference.heroName, heroAssets)} fallbackText={intel.secondPickPreference.heroName} alt={intel.secondPickPreference.heroName} className="h-full w-full object-cover" containerClassName="h-full w-full text-[7px]" />
                  </div>
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-red-400">Second Pick Preference</div>
                    <div className="text-sm font-bold text-white">{intel.secondPickPreference.heroName}</div>
                    <div className="text-[10px] text-slate-500">WR: {intel.secondPickPreference.winRate}%</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none border-b border-white/[0.06] pb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold shrink-0 border-b-2 -mb-px transition-colors ${
                    active ? "border-amber-400 text-amber-300" : "border-transparent text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#080e1a]/90 p-6">
            {/* Comfort Pool */}
            {activeTab === "comfort" && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Star className="h-4 w-4 text-amber-400" />
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-amber-300">Comfort Hero Pool</span>
                  <span className="ml-auto font-mono text-[10px] text-slate-500">{intel.comfortHeroes.length} heroes</span>
                </div>
                <div className="grid gap-2">
                  {intel.comfortHeroes.map((h, i) => (
                    <div key={h.heroName} className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 transition hover:bg-white/[0.04]">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-xs font-black text-amber-400">
                        {i + 1}
                      </div>
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#060d1a]">
                        <FallbackImage src={getHeroImageUrl(h.heroName, heroAssets)} fallbackText={h.heroName} alt={h.heroName} className="h-full w-full object-cover" containerClassName="h-full w-full text-[7px]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate">{h.heroName}</div>
                        <div className="text-[10px] text-slate-500">{getHeroRole(h.heroName)} &middot; {h.picks} picks</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm font-bold text-amber-400">{h.winRate}%</div>
                        <div className="text-[9px] text-slate-500">{h.wins}W {h.picks - h.wins}L</div>
                      </div>
                      <WinBar wins={h.wins} total={h.picks} />
                      {onOpenHeroIntelligence && (
                        <button onClick={() => onOpenHeroIntelligence(h.heroName)} className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 transition">
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {intel.comfortHeroes.length === 0 && (
                    <div className="text-center py-8 text-sm text-slate-500">Tidak ada data comfort hero.</div>
                  )}
                </div>
              </div>
            )}

            {/* Ban Tendencies */}
            {activeTab === "bans" && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Ban className="h-4 w-4 text-rose-400" />
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-rose-300">Top Bans by This Team</span>
                </div>
                <div className="grid gap-2">
                  {intel.topBans.map((b, i) => (
                    <div key={b.heroName} className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-xs font-black text-rose-400">
                        {i + 1}
                      </div>
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#060d1a]">
                        <FallbackImage src={getHeroImageUrl(b.heroName, heroAssets)} fallbackText={b.heroName} alt={b.heroName} className="h-full w-full object-cover" containerClassName="h-full w-full text-[7px]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate">{b.heroName}</div>
                        <div className="text-[10px] text-slate-500">{getHeroRole(b.heroName)}</div>
                      </div>
                      <div className="font-mono text-sm font-bold text-rose-400">{b.count}x</div>
                    </div>
                  ))}
                  {intel.topBans.length === 0 && (
                    <div className="text-center py-8 text-sm text-slate-500">Tidak ada data ban.</div>
                  )}
                </div>

                {/* Target Bans Against Opponents */}
                {intel.targetBans.length > 0 && (
                  <div className="mt-6">
                    <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Target Bans vs Specific Teams</div>
                    <div className="space-y-3">
                      {intel.targetBans.map((tb) => (
                        <div key={tb.opponent} className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                          <div className="text-xs font-bold text-amber-300 mb-2">vs {tb.opponent}</div>
                          <div className="flex flex-wrap gap-2">
                            {tb.heroes.map((h) => (
                              <span key={h.heroName} className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-[10px] font-bold text-rose-300">
                                {h.heroName}
                                <span className="text-rose-400/60">{h.banCount}x</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Hero Pairings */}
            {activeTab === "pairings" && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Swords className="h-4 w-4 text-violet-400" />
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-violet-300">Signature Hero Pairings</span>
                </div>
                <div className="grid gap-2">
                  {intel.heroPairings.map((p, i) => (
                    <div key={`${p.heroA}-${p.heroB}`} className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-xs font-black text-violet-400">
                        {i + 1}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 overflow-hidden rounded-lg border border-white/10 bg-[#060d1a]">
                          <FallbackImage src={getHeroImageUrl(p.heroA, heroAssets)} fallbackText={p.heroA} alt={p.heroA} className="h-full w-full object-cover" containerClassName="h-full w-full text-[6px]" />
                        </div>
                        <span className="text-[10px] text-slate-500 font-bold">+</span>
                        <div className="h-9 w-9 overflow-hidden rounded-lg border border-white/10 bg-[#060d1a]">
                          <FallbackImage src={getHeroImageUrl(p.heroB, heroAssets)} fallbackText={p.heroB} alt={p.heroB} className="h-full w-full object-cover" containerClassName="h-full w-full text-[6px]" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white">{p.heroA} + {p.heroB}</div>
                        <div className="text-[10px] text-slate-500">{p.games} games together</div>
                      </div>
                      <div className="font-mono text-sm font-bold text-violet-400">{p.winRate}%</div>
                      <WinBar wins={Math.round(p.games * p.winRate / 100)} total={p.games} />
                    </div>
                  ))}
                  {intel.heroPairings.length === 0 && (
                    <div className="text-center py-8 text-sm text-slate-500">Tidak ada data hero pairings.</div>
                  )}
                </div>

                {/* Signature Compositions */}
                {intel.signatureCompositions.length > 0 && (
                  <div className="mt-6">
                    <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Signature Compositions</div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {intel.signatureCompositions.map((comp) => (
                        <div key={comp.name} className="rounded-xl border border-violet-500/15 bg-violet-950/10 p-4">
                          <div className="text-xs font-bold text-violet-300 mb-2">{comp.name}</div>
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {comp.heroes.map((h) => (
                              <div key={h} className="h-8 w-8 overflow-hidden rounded-lg border border-white/10 bg-[#060d1a]">
                                <FallbackImage src={getHeroImageUrl(h, heroAssets)} fallbackText={h} alt={h} className="h-full w-full object-cover" containerClassName="h-full w-full text-[5px]" />
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-500">{comp.games} games</span>
                            <span className="font-bold text-violet-400">{comp.winRate}% WR</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Draft Tendencies */}
            {activeTab === "tendencies" && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-300">Draft Style &amp; Tendencies</span>
                </div>
                {intel.draftTendencies.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {intel.draftTendencies.map((t) => (
                      <span key={t} className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-300">
                        <Zap className="h-3.5 w-3.5" />
                        {t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm text-slate-500">Tidak ada data tendensi draft.</div>
                )}

                {/* Most Successful Heroes */}
                <div className="mt-6">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Paling Berhasil</div>
                  <div className="grid gap-2">
                    {intel.comfortHeroes.slice(0, 5).map((h, i) => (
                      <div key={h.heroName} className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-xs font-black text-emerald-400">
                          {i + 1}
                        </div>
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#060d1a]">
                          <FallbackImage src={getHeroImageUrl(h.heroName, heroAssets)} fallbackText={h.heroName} alt={h.heroName} className="h-full w-full object-cover" containerClassName="h-full w-full text-[6px]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-white truncate">{h.heroName}</div>
                          <div className="text-[10px] text-slate-500">{h.picks} games</div>
                        </div>
                        <div className="font-mono text-sm font-bold text-emerald-400">{h.winRate}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Empty State */}
      {!selectedTeam && !loading && (
        <div className="text-center py-16 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.01]">
          <Users className="mx-auto h-10 w-10 text-slate-600 mb-3" />
          <div className="text-sm font-bold text-slate-400">Pilih tim MPL di atas</div>
          <p className="mt-1 text-xs text-slate-600">untuk melihat profil draft dan analisis strategi.</p>
        </div>
      )}
    </div>
  );
}
