import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUp,
  BarChart3,
  BrainCircuit,
  CloudLightning,
  Database,
  Shield,
  Swords,
  Target,
  Trophy,
  Users,
  Zap,
  ChevronRight,
  Eye,
  TrendingUp,
} from "lucide-react";
import { getHeroImageUrl } from "../lib/heroUtils";

interface LandingPageProps {
  onChangeTab: (tab: string) => void;
  heroesCount: number;
}

interface MatchCenterStanding {
  team: string;
  wins: number;
  losses: number;
  winrate: number;
}

interface MatchCenterResponse {
  totalSeries: number;
  totalGames: number;
  standings: MatchCenterStanding[];
}

interface AssetsResponse {
  teams?: Record<string, string>;
  heroes?: Record<string, string>;
}

function AnimatedCounter({ target, duration = 2000 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const animate = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <div ref={ref}>{count}</div>;
}

function GlowCard({ children, className = "", glow = "cyan" }: { children: React.ReactNode; className?: string; glow?: string }) {
  const glowColors: Record<string, string> = {
    cyan: "hover:shadow-[0_0_60px_-12px_rgba(34,211,238,0.3)] hover:border-cyan-500/30",
    violet: "hover:shadow-[0_0_60px_-12px_rgba(139,92,246,0.3)] hover:border-violet-500/30",
    amber: "hover:shadow-[0_0_60px_-12px_rgba(245,158,11,0.3)] hover:border-amber-500/30",
    rose: "hover:shadow-[0_0_60px_-12px_rgba(244,63,94,0.3)] hover:border-rose-500/30",
  };
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#080e1a]/90 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 ${glowColors[glow] || glowColors.cyan} ${className}`}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-400">
      {children}
    </div>
  );
}

export default function LandingPage({ onChangeTab, heroesCount }: LandingPageProps) {
  const [matchCenter, setMatchCenter] = useState<MatchCenterResponse | null>(null);
  const [teamAssets, setTeamAssets] = useState<Record<string, string>>({});
  const [heroAssets, setHeroAssets] = useState<Record<string, string>>({});
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        const [mcRes, assetsRes] = await Promise.all([
          fetch("/api/mpl/match-center"),
          fetch("/api/assets"),
        ]);
        const mc = mcRes.ok ? await mcRes.json() : null;
        const assets = assetsRes.ok ? ((await assetsRes.json()) as AssetsResponse) : null;
        if (!active) return;
        if (mc) setMatchCenter({ totalSeries: mc.totalSeries || 72, totalGames: mc.totalGames || 174, standings: Array.isArray(mc.standings) ? mc.standings.slice(0, 5) : [] });
        if (assets?.teams) setTeamAssets(assets.teams);
        if (assets?.heroes) setHeroAssets(assets.heroes);
      } catch {
        if (!active) return;
        setMatchCenter({ totalSeries: 72, totalGames: 174, standings: [
          { team: "ONIC", wins: 13, losses: 3, winrate: 81 },
          { team: "TLID", wins: 10, losses: 6, winrate: 63 },
          { team: "DEWA", wins: 9, losses: 7, winrate: 56 },
          { team: "BTR", wins: 9, losses: 7, winrate: 56 },
          { team: "EVOS", wins: 8, losses: 8, winrate: 50 },
        ]});
      }
    };
    loadData();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const onScroll = () => setShowScrollBtn(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const liveStats = useMemo(() => [
    { icon: Swords, label: "Heroes", value: heroesCount || 132, color: "text-cyan-400" },
    { icon: Database, label: "Series", value: matchCenter?.totalSeries || 72, color: "text-violet-400" },
    { icon: BarChart3, label: "Games", value: matchCenter?.totalGames || 174, color: "text-amber-400" },
    { icon: Users, label: "Teams", value: 9, color: "text-emerald-400" },
  ], [heroesCount, matchCenter]);

  const features = [
    { id: "draft", icon: CloudLightning, title: "Draft Simulator", desc: "Real-time pick/ban analysis dengan counter warning dan lane balance.", color: "cyan", badge: "LIVE ENGINE" },
    { id: "intelligence", icon: BrainCircuit, title: "Hero Intelligence", desc: "Deep dive skill, counter, synergy, power spike setiap hero.", color: "violet", badge: "DEEP DATA" },
    { id: "tier", icon: TrendingUp, title: "Tier List", desc: "Meta snapshot berdasarkan data MPL terbaru.", color: "amber", badge: "META READ" },
    { id: "heroes", icon: Eye, title: "Hero Stats", desc: "Winrate, pick rate, ban rate, presence dari semua hero.", color: "rose", badge: "ANALYTICS" },
    { id: "teams", icon: Users, title: "Team Analytics", desc: "MPL match history, comfort hero, draft tendency per tim.", color: "cyan", badge: "MPL HISTORY" },
    { id: "items", icon: Shield, title: "Data Catalog", desc: "Item, emblem, battle spell — semua data terstruktur.", color: "violet", badge: "CATALOG" },
  ];

  const topPresence = [
    { hero: "Zhuxin", tag: "Priority Mid", color: "cyan" },
    { hero: "Harith", tag: "Flexible Tempo", color: "violet" },
    { hero: "Fanny", tag: "High Ban Pressure", color: "rose" },
    { hero: "Fredrinn", tag: "Tank Core", color: "amber" },
    { hero: "Mathilda", tag: "Roam Meta", color: "emerald" },
  ];

  const colorMap: Record<string, string> = {
    cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    violet: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  };

  return (
    <div className="relative overflow-x-clip pb-20">
      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-32 left-1/2 h-[50rem] w-[50rem] -translate-x-1/2 rounded-full bg-cyan-500/[0.07] blur-[180px]" />
        <div className="absolute top-[30%] right-[5%] h-[35rem] w-[35rem] rounded-full bg-violet-500/[0.05] blur-[160px]" />
        <div className="absolute bottom-[10%] left-[10%] h-[30rem] w-[30rem] rounded-full bg-rose-500/[0.04] blur-[160px]" />
      </div>

      {/* ═══ SECTION 1: HERO ═══ */}
      <section className="relative z-10 mx-auto flex min-h-[70vh] max-w-7xl flex-col items-center justify-center px-4 pt-24 pb-16 text-center sm:px-6 lg:px-8">
        <SectionLabel>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400/70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
          </span>
          MPL ID S17 — Live Data Engine
        </SectionLabel>

        <h1 className="mt-5 max-w-5xl font-display text-5xl font-black leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-8xl">
          Draft MLBB
          <span className="block bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400 bg-clip-text text-transparent">
            Seperti Analyst Pro
          </span>
        </h1>

        <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
          Pick/ban analysis, hero intelligence, team history, dan meta snapshot —
          semua dalam satu workspace.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button onClick={() => onChangeTab("draft")} className="group inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-4 text-sm font-bold uppercase tracking-wider text-white shadow-[0_0_40px_-8px_rgba(34,211,238,0.5)] transition-all hover:shadow-[0_0_60px_-8px_rgba(34,211,238,0.7)] hover:brightness-110">
            Buka Draft Simulator
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </button>
          <button onClick={() => onChangeTab("heroes")} className="group inline-flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-8 py-4 text-sm font-bold uppercase tracking-wider text-slate-300 transition-all hover:border-white/20 hover:bg-white/[0.06] hover:text-white">
            Lihat Hero Stats
            <Eye className="h-4 w-4 text-cyan-400" />
          </button>
        </div>

        {/* Live stats bar */}
        <div className="mt-12 grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
          {liveStats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="group rounded-xl border border-white/[0.06] bg-[#080e1a]/80 px-4 py-5 text-center backdrop-blur-sm transition-all hover:border-white/10 hover:bg-white/[0.03]">
                <Icon className={`mx-auto h-5 w-5 ${s.color} mb-2 transition group-hover:scale-110`} />
                <div className="font-display text-3xl font-black text-white">
                  <AnimatedCounter target={typeof s.value === "number" ? s.value : 0} />
                </div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">{s.label}</div>
              </div>
            );
          })}
        </div>

        {/* Scroll hint */}
        <div className="mt-8 animate-bounce text-slate-600">
          <ChevronRight className="h-5 w-5 rotate-90" />
        </div>
      </section>

      {/* ═══ SECTION 2: FEATURES — Interactive grid ═══ */}
      <section className="relative z-10 mx-auto mt-10 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <SectionLabel>Fitur Utama</SectionLabel>
          <h2 className="mt-4 font-display text-4xl font-black tracking-tight text-white sm:text-5xl">
            Semua dalam Satu Tempat
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            const isHovered = hoveredFeature === f.id;
            return (
              <GlowCard key={f.id} glow={f.color}>
                <button
                  onClick={() => onChangeTab(f.id)}
                  onMouseEnter={() => setHoveredFeature(f.id)}
                  onMouseLeave={() => setHoveredFeature(null)}
                  className="w-full p-6 text-left"
                >
                  <div className="flex items-start justify-between">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-all ${colorMap[f.color]} ${isHovered ? "scale-110" : ""}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.2em] ${colorMap[f.color]}`}>
                      {f.badge}
                    </span>
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-white">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.desc}</p>
                  <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 transition group-hover:gap-2.5">
                    Buka <ArrowRight className="h-3 w-3" />
                  </div>
                </button>
              </GlowCard>
            );
          })}
        </div>
      </section>

      {/* ═══ SECTION 3: LIVE DRAFT PREVIEW ═══ */}
      <section className="relative z-10 mx-auto mt-24 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <SectionLabel>Preview</SectionLabel>
          <h2 className="mt-4 font-display text-4xl font-black tracking-tight text-white sm:text-5xl">
            Seperti Ini Draft-nya
          </h2>
        </div>

        <GlowCard className="p-6 sm:p-8" glow="cyan">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Draft board */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan-400">Blue Side Draft</span>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 font-mono text-[10px] font-bold uppercase text-emerald-400">Live Engine</span>
              </div>

              {/* Bans */}
              <div className="mb-3 font-mono text-[9px] uppercase tracking-[0.2em] text-rose-400/70">Bans</div>
              <div className="grid grid-cols-5 gap-2 mb-4">
                {["Fanny", "Freya", "Phoveus", "Chip", "Harley"].map((h) => (
                  <div key={h} className="rounded-xl border border-rose-500/15 bg-rose-500/[0.06] p-2 text-center">
                    <div className="aspect-square overflow-hidden rounded-lg border border-rose-500/20 bg-[#060d1a]">
                      <img src={getHeroImageUrl(h, heroAssets)} alt={h} className="h-full w-full object-cover opacity-70" />
                    </div>
                    <div className="mt-1 truncate text-[9px] font-semibold text-rose-300">{h}</div>
                  </div>
                ))}
              </div>

              {/* Picks */}
              <div className="mb-3 font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-400/70">Picks</div>
              <div className="grid grid-cols-5 gap-2">
                {["Mathilda", "Harith", "Fredrinn", "Zhuxin", "Moskov"].map((h) => (
                  <div key={h} className="rounded-xl border border-cyan-500/15 bg-cyan-500/[0.06] p-2 text-center transition hover:border-cyan-500/30">
                    <div className="aspect-square overflow-hidden rounded-lg border border-cyan-500/20 bg-[#060d1a]">
                      <img src={getHeroImageUrl(h, heroAssets)} alt={h} className="h-full w-full object-cover" />
                    </div>
                    <div className="mt-1 truncate text-[9px] font-semibold text-cyan-300">{h}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Analysis panel */}
            <div className="space-y-4">
              <div className="rounded-xl border border-white/[0.06] bg-[#060d1a]/80 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-cyan-400" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-400">AI Recommendation</span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] p-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-cyan-500/20 bg-[#060d1a]">
                    <img src={getHeroImageUrl("Fanny", heroAssets)} alt="Fanny" className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Recommended Ban</div>
                    <div className="text-xl font-black text-white">Fanny</div>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-400">
                  Enemy jungler comfort + snowball risk. Ban ini menutup tempo cepat dan memaksa lawan pivot.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/[0.06] bg-[#060d1a]/80 p-3">
                  <div className="text-[10px] font-mono uppercase text-slate-500">Draft Tempo</div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full w-[74%] rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />
                  </div>
                  <div className="mt-1 text-right text-xs font-bold text-cyan-400">74%</div>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-[#060d1a]/80 p-3">
                  <div className="text-[10px] font-mono uppercase text-slate-500">Counter Pressure</div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full w-[61%] rounded-full bg-gradient-to-r from-violet-400 to-rose-500" />
                  </div>
                  <div className="mt-1 text-right text-xs font-bold text-violet-400">61%</div>
                </div>
              </div>

              <button onClick={() => onChangeTab("draft")} className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:brightness-110">
                Buka Draft Simulator →
              </button>
            </div>
          </div>
        </GlowCard>
      </section>

      {/* ═══ SECTION 4: MPL STANDINGS + META ═══ */}
      <section className="relative z-10 mx-auto mt-24 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Standings */}
          <GlowCard className="p-6" glow="amber">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber-400">MPL ID S17</div>
                <div className="mt-1 text-xl font-bold text-white">Top Standings</div>
              </div>
              <Trophy className="h-5 w-5 text-amber-400" />
            </div>
            <div className="space-y-2">
              {(matchCenter?.standings || []).map((t, i) => (
                <div key={t.team} className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 transition hover:bg-white/[0.05]">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-sm font-black text-amber-400">
                    {i + 1}
                  </div>
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#060d1a]">
                    {teamAssets[t.team] ? (
                      <img src={teamAssets[t.team]} alt={t.team} className="h-full w-full object-contain p-1" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-black text-amber-400">{t.team.slice(0, 2)}</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate">{t.team}</div>
                    <div className="text-[11px] text-slate-500">{t.wins}W · {t.losses}L</div>
                  </div>
                  <div className="font-mono text-sm font-bold text-amber-400">{t.winrate}%</div>
                </div>
              ))}
            </div>
            <button onClick={() => onChangeTab("teams")} className="mt-4 w-full rounded-xl border border-amber-500/20 bg-amber-500/5 py-2.5 text-xs font-bold uppercase tracking-wider text-amber-400 transition hover:bg-amber-500/10">
              Lihat Semua Tim →
            </button>
          </GlowCard>

          {/* Meta heroes */}
          <GlowCard className="p-6" glow="rose">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-rose-400">Meta Snapshot</div>
                <div className="mt-1 text-xl font-bold text-white">Top Presence Heroes</div>
              </div>
              <Target className="h-5 w-5 text-rose-400" />
            </div>
            <div className="space-y-2">
              {topPresence.map((h) => (
                <div key={h.hero} className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 transition hover:bg-white/[0.05]">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#060d1a]">
                    <img src={getHeroImageUrl(h.hero, heroAssets)} alt={h.hero} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate">{h.hero}</div>
                    <div className="text-[11px] text-slate-500">{h.tag}</div>
                  </div>
                  <span className={`rounded-full border px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.15em] ${colorMap[h.color]}`}>
                    Meta
                  </span>
                </div>
              ))}
            </div>
            <button onClick={() => onChangeTab("heroes")} className="mt-4 w-full rounded-xl border border-rose-500/20 bg-rose-500/5 py-2.5 text-xs font-bold uppercase tracking-wider text-rose-400 transition hover:bg-rose-500/10">
              Lihat Semua Hero →
            </button>
          </GlowCard>
        </div>
      </section>

      {/* ═══ SECTION 5: CTA ═══ */}
      <section className="relative z-10 mx-auto mt-24 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-cyan-500/15 bg-gradient-to-br from-[#060d1a] to-[#0a1628] p-8 text-center shadow-[0_0_100px_-20px_rgba(34,211,238,0.3)] sm:p-12">
          <h2 className="font-display text-4xl font-black tracking-tight text-white sm:text-5xl">
            Siap Draft Seperti
            <span className="block bg-gradient-to-r from-cyan-300 to-violet-400 bg-clip-text text-transparent">Analyst MPL?</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-400">
            Masuk ke simulator, cek team analytics, lalu ubah draft dari tebakan menjadi keputusan yang punya data.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button onClick={() => onChangeTab("draft")} className="group inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-4 text-sm font-bold uppercase tracking-wider text-white shadow-[0_0_40px_-8px_rgba(34,211,238,0.5)] transition hover:shadow-[0_0_60px_-8px_rgba(34,211,238,0.7)] hover:brightness-110">
              Mulai Sekarang
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </button>
            <button onClick={() => onChangeTab("items")} className="inline-flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-8 py-4 text-sm font-bold uppercase tracking-wider text-slate-300 transition hover:border-white/20 hover:text-white">
              Jelajahi Data
              <Database className="h-4 w-4 text-cyan-400" />
            </button>
          </div>
        </div>
      </section>

      {/* Scroll to top */}
      {showScrollBtn && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-cyan-500/20 bg-[#080e1a]/90 text-cyan-400 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-cyan-400/40 hover:shadow-[0_0_24px_rgba(6,182,212,0.3)]"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
