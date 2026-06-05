import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUp,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  CloudLightning,
  Database,
  GitBranch,
  ShieldAlert,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Users,
  Zap,
  ChevronRight,
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

const previewCards = [
  {
    id: "draft",
    title: "Draft Simulator",
    badge: "Realtime Coach",
    accent: "from-cyan-500/25 via-blue-500/10 to-transparent",
    icon: CloudLightning,
    points: [
      "Real-time pick/ban analysis",
      "Role & lane balance",
      "Counter warning",
    ],
    statLabel: "Draft Engine",
    statValue: "Live",
    button: "Open Draft",
  },
  {
    id: "intelligence",
    title: "Hero Intelligence",
    badge: "Micro + Macro",
    accent: "from-violet-500/25 via-fuchsia-500/10 to-transparent",
    icon: BrainCircuit,
    points: [
      "Skill data & mechanic category",
      "Counter & synergy tags",
      "Power spike reading",
    ],
    statLabel: "Hero Layer",
    statValue: "Deep",
    button: "Explore Heroes",
  },
  {
    id: "teams",
    title: "Team Analytics",
    badge: "MPL History",
    accent: "from-rose-500/25 via-red-500/10 to-transparent",
    icon: Users,
    points: [
      "MPL match history",
      "Comfort hero tracking",
      "Draft tendency profile",
    ],
    statLabel: "Team Reads",
    statValue: "Ready",
    button: "Analyze Teams",
  },
];

const featureHighlights = [
  {
    id: "counter",
    icon: Swords,
    title: "Counter Matrix",
    text: "Lihat pressure point lineup lawan sebelum mereka menutup draft.",
    badge: "Matchup Read",
    glow: "shadow-[0_24px_60px_-30px_rgba(34,211,238,0.55)]",
  },
  {
    id: "teams",
    icon: Database,
    title: "MPL Match History",
    text: "Riwayat series, game, comfort hero, dan pattern tim disusun jadi insight.",
    badge: "Historical Layer",
    glow: "shadow-[0_24px_60px_-30px_rgba(99,102,241,0.55)]",
  },
  {
    id: "heroes",
    icon: Zap,
    title: "Hero Skill Database",
    text: "Skill, role, power spike, lane, dan kecenderungan mekanik dalam satu panel.",
    badge: "Hero Intel",
    glow: "shadow-[0_24px_60px_-30px_rgba(168,85,247,0.55)]",
  },
  {
    id: "draft",
    icon: ShieldAlert,
    title: "AI Draft Analysis",
    text: "AI hanya menjelaskan evidence dari engine lokal agar keputusan tetap terukur.",
    badge: "Coach Layer",
    glow: "shadow-[0_24px_60px_-30px_rgba(244,63,94,0.45)]",
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Pilih Mode",
    text: "Masuk ke Ranked, MPL, atau custom draft flow sesuai kebutuhan scrim dan prep match.",
    icon: Target,
  },
  {
    step: "02",
    title: "Bangun Draft",
    text: "Pick/ban hero, pilih tim, lalu lihat lane balance, comfort overlap, dan warning.",
    icon: GitBranch,
  },
  {
    step: "03",
    title: "Baca Analisis",
    text: "Sistem menjelaskan counter, synergy, power spike, dan risk dengan evidence lokal.",
    icon: Sparkles,
  },
];

export default function LandingPage({ onChangeTab, heroesCount }: LandingPageProps) {
  const [matchCenter, setMatchCenter] = useState<MatchCenterResponse | null>(null);
  const [teamAssets, setTeamAssets] = useState<Record<string, string>>({});
  const [heroAssets, setHeroAssets] = useState<Record<string, string>>({});
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const [matchCenterRes, assetsRes] = await Promise.all([
          fetch("/api/mpl/match-center"),
          fetch("/api/assets"),
        ]);

        const matchCenterJson = matchCenterRes.ok ? await matchCenterRes.json() : null;
        const assetsJson = assetsRes.ok ? ((await assetsRes.json()) as AssetsResponse) : null;

        if (!active) return;

        if (matchCenterJson) {
          setMatchCenter({
            totalSeries: matchCenterJson.totalSeries || 72,
            totalGames: matchCenterJson.totalGames || 174,
            standings: Array.isArray(matchCenterJson.standings)
              ? matchCenterJson.standings.slice(0, 5)
              : [],
          });
        }

        if (assetsJson?.teams) {
          setTeamAssets(assetsJson.teams);
        }
        if (assetsJson?.heroes) {
          setHeroAssets(assetsJson.heroes);
        }
      } catch (error) {
        if (!active) return;
        setMatchCenter({
          totalSeries: 72,
          totalGames: 174,
          standings: [
            { team: "ONIC", wins: 13, losses: 3, winrate: 81 },
            { team: "TLID", wins: 10, losses: 6, winrate: 63 },
            { team: "DEWA", wins: 9, losses: 7, winrate: 56 },
            { team: "BTR", wins: 9, losses: 7, winrate: 56 },
            { team: "EVOS", wins: 8, losses: 8, winrate: 50 },
          ],
        });
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setShowScrollBtn(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const dataLayer = useMemo(
    () => [
      { label: "Heroes", value: heroesCount || 132 },
      { label: "Series", value: matchCenter?.totalSeries || 72 },
      { label: "Games", value: matchCenter?.totalGames || 174 },
      { label: "Teams", value: 9 },
      { label: "Weeks", value: "1-9" },
      { label: "Draft Logs", value: "Pick/Ban" },
    ],
    [heroesCount, matchCenter]
  );

  const topPresence = [
    { hero: "Zhuxin", presence: "Priority Mid", accent: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
    { hero: "Harith", presence: "Flexible Tempo", accent: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
    { hero: "Fanny", presence: "High Ban Pressure", accent: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
  ];

  return (
    <div className="relative overflow-x-clip overflow-y-visible pb-20 text-white page-enter">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-cyan-500/8 blur-[160px]" />
        <div className="absolute top-[18%] right-[8%] h-[24rem] w-[24rem] rounded-full bg-fuchsia-500/8 blur-[150px]" />
        <div className="absolute bottom-0 left-[4%] h-[22rem] w-[22rem] rounded-full bg-rose-500/8 blur-[150px]" />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "120px 120px",
            maskImage: "radial-gradient(circle at center, black 35%, transparent 90%)",
          }}
        />
      </div>

      <section className="relative mx-auto grid max-w-7xl gap-10 px-4 pt-8 sm:px-6 lg:grid-cols-[1.15fr_0.95fr] lg:items-center lg:gap-14 lg:px-8 lg:pt-12">
        <div className="relative z-10 max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-300 shadow-[0_0_40px_-24px_rgba(34,211,238,0.8)]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300/70" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-300" />
            </span>
            MLBB Draft Analyst Desk
          </div>

          <h1 className="max-w-4xl font-display text-5xl font-bold leading-[0.96] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Analisis Draft MPL
            <span className="block bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-400 bg-clip-text text-transparent">
              untuk MLBB yang terasa serius
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
            Website ini dibuat untuk membaca pick/ban MLBB dengan sudut pandang analyst:
            matchup, comfort hero, pressure ban, lane coverage, counter matrix, dan riwayat MPL ID
            dalam satu workspace premium.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => onChangeTab("draft")}
              className="btn-primary group"
            >
              Open Draft Master
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => onChangeTab("teams")}
              className="btn-secondary group"
            >
              Explore Team Analytics
              <Users className="h-4 w-4 text-cyan-300 transition group-hover:scale-110" />
            </button>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 backdrop-blur-sm">
              <div className="ui-caption">Focus</div>
              <div className="mt-2 text-base font-semibold text-white">Pick/ban evidence, bukan tebakan</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 backdrop-blur-sm">
              <div className="ui-caption">Coverage</div>
              <div className="mt-2 text-base font-semibold text-white">MPL team history + hero intelligence</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 backdrop-blur-sm">
              <div className="ui-caption">Output</div>
              <div className="mt-2 text-base font-semibold text-white">Recommendation, risk, final dashboard</div>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <div className="relative translate-y-2 overflow-hidden rounded-[32px] border border-cyan-400/15 bg-[#06101d]/92 p-4 shadow-[0_38px_130px_-38px_rgba(8,145,178,0.72)] transition duration-300 hover:-translate-y-1 hover:border-cyan-300/30 lg:translate-y-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(236,72,153,0.12),transparent_32%),linear-gradient(180deg,rgba(8,18,32,0.58),rgba(4,10,18,0.9))]" />
            <div className="relative">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <div>
                  <div className="ui-caption text-cyan-300">Floating Showcase</div>
                  <div className="mt-1 text-lg font-semibold text-white">Draft analyst snapshot</div>
                </div>
                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">
                  Live Engine
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-blue-400/15 bg-blue-400/5 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-blue-300">Blue Draft Board</div>
                      <div className="text-xs text-slate-400">First Pick Side</div>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {["Fanny", "Freya", "Phoveus", "Chip", "Harley"].map((hero) => (
                        <div key={hero} className="rounded-xl border border-rose-400/15 bg-rose-400/8 px-2 py-3 text-center">
                          <div className="mx-auto h-12 w-12 overflow-hidden rounded-xl border border-rose-400/20">
                            <img src={getHeroImageUrl(hero, heroAssets)} alt={hero} className="h-full w-full object-cover" />
                          </div>
                          <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-rose-300">Ban</div>
                          <div className="mt-1 text-xs font-semibold text-white">{hero}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 grid grid-cols-5 gap-2">
                      {["Mathilda", "Harith", "Fredrinn", "Zhuxin", "Flex Slot"].map((hero, index) => (
                        <div key={hero} className={`rounded-xl border px-2 py-4 text-center ${index === 4 ? "border-dashed border-cyan-400/25 bg-cyan-400/6" : "border-cyan-400/15 bg-cyan-400/8"}`}>
                          <div className="mx-auto h-12 w-12 overflow-hidden rounded-xl border border-cyan-400/20 bg-[#07111d]">
                            {index === 4 ? (
                              <div className="flex h-full w-full items-center justify-center text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300">Flex</div>
                            ) : (
                              <img src={getHeroImageUrl(hero, heroAssets)} alt={hero} className="h-full w-full object-cover" />
                            )}
                          </div>
                          <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">Pick</div>
                          <div className="mt-1 text-xs font-semibold text-white">{hero}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-400">Signal Layer</div>
                    <div className="grid gap-2 text-sm text-slate-300">
                      <div className="flex items-start gap-2 rounded-xl border border-white/8 bg-[#0b1727] px-3 py-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                        Team Pattern: RRQ often prioritizes EXP pressure after banning mobility junglers.
                      </div>
                      <div className="flex items-start gap-2 rounded-xl border border-white/8 bg-[#0b1727] px-3 py-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-300" />
                        Similar Game: MPL ID S17 Week 5 Game 1 showed pivot into scaling backline.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-400">Analyst Recommendation</div>
                      <Sparkles className="h-4 w-4 text-cyan-300" />
                    </div>
                    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/8 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Recommended Ban</div>
                      <div className="mt-3 flex items-start gap-3">
                        <div className="h-16 w-16 overflow-hidden rounded-2xl border border-cyan-400/20">
                          <img src={getHeroImageUrl("Fanny", heroAssets)} alt="Fanny" className="h-full w-full object-cover" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-white">Fanny</div>
                          <p className="mt-2 text-sm leading-7 text-slate-300">
                            Enemy jungler comfort + high snowball risk. Ban ini menutup jalur tempo cepat dan
                            memaksa lawan pindah ke setup yang lebih mudah dibaca.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2">
                      <div className="rounded-xl border border-white/8 bg-[#0b1727] px-3 py-3">
                        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Why Now</div>
                        <div className="mt-1 text-sm text-white">Comfort overlap + matchup denial sebelum pick phase.</div>
                      </div>
                      <div className="rounded-xl border border-white/8 bg-[#0b1727] px-3 py-3">
                        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Fallback</div>
                        <div className="mt-1 text-sm text-white">Jika sudah banned, pindah ke Freya atau Phoveus pressure lane.</div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-400">Quick Product Read</div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-white/8 bg-[#0b1727] p-3">
                        <div className="text-sm font-semibold text-white">Draft tempo</div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
                          <div className="h-full w-[74%] rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/8 bg-[#0b1727] p-3">
                        <div className="text-sm font-semibold text-white">Counter pressure</div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
                          <div className="h-full w-[61%] rounded-full bg-gradient-to-r from-fuchsia-400 to-rose-500" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute -bottom-8 left-4 right-4 h-10 rounded-full bg-cyan-400/10 blur-3xl" />
        </div>
      </section>

      <section className="relative mx-auto mt-20 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-cyan-300">Product Preview</div>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Lihat sistem dari sudut yang langsung terasa berguna
            </h2>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          {previewCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                className="group relative overflow-hidden rounded-[26px] border border-white/10 bg-[#081120]/90 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,1)] transition duration-300 hover:-translate-y-1 hover:border-cyan-400/30"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${card.accent} opacity-80`} />
                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="inline-flex rounded-full border border-white/10 bg-white/6 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300">
                        {card.badge}
                      </div>
                      <h3 className="mt-4 font-display text-2xl font-bold tracking-tight text-white">{card.title}</h3>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/6 p-3">
                      <Icon className="h-5 w-5 text-cyan-300" />
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-white/10 bg-[#0b1727]/90 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-sm font-semibold text-white">{card.statLabel}</div>
                      <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-300">
                        {card.statValue}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      {card.points.map((point) => (
                        <div key={point} className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-300">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-300" />
                          {point}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => onChangeTab(card.id)}
                    className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
                  >
                    {card.button}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="relative mx-auto mt-20 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-cyan-300">Feature Highlights</div>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Toolset yang terasa seperti analyst desk, bukan halaman template
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {featureHighlights.map((feature) => {
            const Icon = feature.icon;
            return (
              <button
                key={feature.id}
                onClick={() => onChangeTab(feature.id)}
                className={`group rounded-[24px] border border-white/10 bg-[#081120]/85 p-6 text-left transition duration-300 hover:-translate-y-1 hover:border-cyan-400/25 ${feature.glow}`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
                  <Icon className="h-5 w-5 text-cyan-300" />
                </div>
                <div className="mt-5 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                  {feature.badge}
                </div>
                <h3 className="mt-4 text-xl font-semibold text-white">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{feature.text}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="relative mx-auto mt-20 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[28px] border border-white/10 bg-[#07101d]/88 p-7">
            <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-cyan-300">MPL Data Intelligence Section</div>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              MPL ID S17 Data Layer
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
              Homepage ini bukan sekadar styling. Ia menjelaskan bahwa produk ditopang data hero,
              riwayat series, game count, dan standing MPL yang benar-benar dipakai sistem.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {dataLayer.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4">
                  <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</div>
                  <div className="mt-2 text-2xl font-bold text-white">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {Object.entries(teamAssets)
                .slice(0, 9)
                .map(([team, logo]) => (
                  <div key={team} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">
                    {logo ? (
                      <img src={logo} alt={team} className="h-6 w-6 rounded-full object-contain" />
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400/10 text-[10px] font-bold text-cyan-300">
                        {team.slice(0, 2)}
                      </div>
                    )}
                    <span className="text-sm text-slate-300">{team}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="grid gap-6">
            <div className="rounded-[28px] border border-white/10 bg-[#081120]/88 p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">Mini Standing</div>
                  <div className="mt-1 text-xl font-semibold text-white">Top MPL Snapshot</div>
                </div>
                <Trophy className="h-5 w-5 text-cyan-300" />
              </div>
              <div className="space-y-3">
                {(matchCenter?.standings || []).slice(0, 5).map((team, index) => (
                  <div key={team.team} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 hover:bg-white/[0.06] transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-sm font-bold text-cyan-300">
                        {index + 1}
                      </div>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#0b1727]">
                        {teamAssets[team.team] ? (
                          <img src={teamAssets[team.team]} alt={team.team} className="h-8 w-8 object-contain" />
                        ) : (
                          <div className="text-xs font-black text-cyan-300">{team.team.slice(0, 2)}</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-white truncate">{team.team}</div>
                        <div className="text-xs text-slate-500">{team.wins}W · {team.losses}L</div>
                      </div>
                    </div>
                    <div className="ml-2 text-sm font-semibold text-cyan-300 shrink-0">{team.winrate}%</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-[#081120]/88 p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">Top Presence Heroes</div>
                  <div className="mt-1 text-xl font-semibold text-white">Meta Pressure Read</div>
                </div>
                <BarChart3 className="h-5 w-5 text-cyan-300 shrink-0" />
              </div>
              <div className="space-y-3">
                {topPresence.map((hero) => (
                  <div key={hero.hero} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 hover:bg-white/[0.06] transition-colors">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#0b1727]">
                      <img src={getHeroImageUrl(hero.hero, heroAssets)} alt={hero.hero} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white truncate">{hero.hero}</div>
                      <div className="text-xs text-slate-500 truncate">{hero.presence}</div>
                    </div>
                    <div className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-mono uppercase tracking-[0.2em] ${hero.accent}`}>
                      Meta
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto mt-20 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-cyan-300">How It Works</div>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Flow yang sederhana untuk prep draft lebih cepat
          </h2>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {howItWorks.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="rounded-[26px] border border-white/10 bg-[#081120]/88 p-6">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-sm uppercase tracking-[0.24em] text-cyan-300">{item.step}</div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                    <Icon className="h-5 w-5 text-cyan-300" />
                  </div>
                </div>
                <h3 className="mt-5 text-2xl font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{item.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="relative mx-auto mt-20 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[32px] border border-cyan-400/15 bg-[linear-gradient(135deg,rgba(6,16,29,0.92),rgba(12,20,38,0.96))] p-8 shadow-[0_30px_120px_-40px_rgba(14,165,233,0.45)] sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-cyan-300">Final CTA</div>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">
                Siap membaca draft seperti analyst MPL?
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
                Masuk ke simulator, cek team analytics, lalu ubah draft dari tebakan menjadi keputusan
                yang punya konteks, data, dan arah permainan.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <button
                onClick={() => onChangeTab("draft")}
                className="btn-primary"
              >
                Mulai Draft Simulator
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => onChangeTab("teams")}
                className="btn-secondary"
              >
                Buka Team Analytics
                <Users className="h-4 w-4 text-cyan-300" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── SCROLL TO TOP BUTTON ────────────────────────────────────── */}
      {showScrollBtn && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center gap-2 rounded-full bg-cyan-500/20 px-5 py-3 text-sm font-semibold text-cyan-300 ring-1 ring-cyan-400/30 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-cyan-500/30 hover:shadow-[0_0_24px_rgba(6,182,212,0.4)] hover:ring-cyan-300/50"
        >
          <ArrowUp className="h-4 w-4 transition group-hover:-translate-y-0.5" />
          Top
        </button>
      )}
    </div>
  );
}