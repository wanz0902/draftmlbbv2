import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

interface HeroAttributes {
  durability: number;
  offense: number;
  abilityEffects: number;
  difficulty: number;
}

interface Props {
  heroAttributes: HeroAttributes;
}

interface AttrConfig {
  key: keyof HeroAttributes;
  label: string;
  shortLabel: string;
  color: string;
  glowColor: string;
  description: string;
  angle: number;
}

const ATTR_CONFIG: AttrConfig[] = [
  {
    key: "durability",
    label: "Durability",
    shortLabel: "DUR",
    color: "#2dd4bf",
    glowColor: "rgba(45,212,191,0.35)",
    description: "Survivability and frontline resistance",
    angle: -90,
  },
  {
    key: "offense",
    label: "Offense",
    shortLabel: "OFF",
    color: "#ff6b2b",
    glowColor: "rgba(255,107,43,0.35)",
    description: "Damage pressure and kill threat",
    angle: 0,
  },
  {
    key: "abilityEffects",
    label: "Ability Effects",
    shortLabel: "ABF",
    color: "#3b82f6",
    glowColor: "rgba(59,130,246,0.35)",
    description: "Crowd control, utility, skill impact",
    angle: 90,
  },
  {
    key: "difficulty",
    label: "Difficulty",
    shortLabel: "DIF",
    color: "#a78bfa",
    glowColor: "rgba(167,139,250,0.35)",
    description: "Mechanical and decision-making difficulty",
    angle: 180,
  },
];

function getRatingLabel(val: number): string {
  if (val <= 20) return "LOW";
  if (val <= 45) return "MOD";
  if (val <= 70) return "HIGH";
  return "V.HIGH";
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function buildPolygonPoints(attrs: HeroAttributes, cx: number, cy: number, maxR: number): string {
  return ATTR_CONFIG.map((cfg) => {
    const val = Math.max(0, Math.min(100, attrs[cfg.key] ?? 0));
    const r = (val / 100) * maxR;
    const pt = polarToCartesian(cx, cy, r, cfg.angle);
    return `${pt.x},${pt.y}`;
  }).join(" ");
}

export default function HeroAttributeSystem({ heroAttributes }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);

  const active = pinned || hovered;

  const safe = useMemo<HeroAttributes>(
    () => ({
      durability: heroAttributes?.durability ?? 0,
      offense: heroAttributes?.offense ?? 0,
      abilityEffects: heroAttributes?.abilityEffects ?? 0,
      difficulty: heroAttributes?.difficulty ?? 0,
    }),
    [heroAttributes]
  );

  const cx = 250;
  const cy = 250;
  const maxR = 130;
  const labelR = maxR + 48;

  const points = useMemo(() => buildPolygonPoints(safe, cx, cy, maxR), [safe]);

  const attrPoints = useMemo(
    () =>
      ATTR_CONFIG.map((cfg) => {
        const val = Math.max(0, Math.min(100, safe[cfg.key] ?? 0));
        const r = (val / 100) * maxR;
        const pt = polarToCartesian(cx, cy, r, cfg.angle);
        const labelPt = polarToCartesian(cx, cy, labelR, cfg.angle);
        return { ...cfg, val, px: pt.x, py: pt.y, lx: labelPt.x, ly: labelPt.y };
      }),
    [safe]
  );

  const handleHover = useCallback((key: string | null) => setHovered(key), []);
  const handleClick = useCallback((key: string) => setPinned((prev) => (prev === key ? null : key)), []);

  const ringR = maxR + 22;

  const activeConfig = active ? ATTR_CONFIG.find((c) => c.key === active) : null;
  const activeVal = active ? Math.max(0, Math.min(100, safe[active as keyof HeroAttributes] ?? 0)) : 0;

  return (
    <div className="w-full flex flex-col items-center gap-5">
      <style>{`
        @keyframes attr-scanline {
          0% { transform: translateY(-120%); opacity: 0; }
          8% { opacity: 1; }
          92% { opacity: 1; }
          100% { transform: translateY(120%); opacity: 0; }
        }
        @keyframes attr-pulse {
          0%, 100% { opacity: 0.12; }
          50% { opacity: 0.35; }
        }
        @keyframes attr-ring-dash {
          to { stroke-dashoffset: -40; }
        }
        @keyframes attr-sweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes attr-particle-drift {
          0% { transform: translateY(0) translateX(0); opacity: 0.25; }
          50% { opacity: 0.5; }
          100% { transform: translateY(-15px) translateX(8px); opacity: 0; }
        }
        @keyframes attr-node-pulse {
          0%, 100% { r: 10; opacity: 0.15; }
          50% { r: 16; opacity: 0.3; }
        }
        .attr-label-group { cursor: pointer; }
        .attr-label-group:hover .attr-label-name { opacity: 1; }
        @media (prefers-reduced-motion: reduce) {
          .attr-animated { animation: none !important; }
        }
      `}</style>

      {/* === RADAR CHART === */}
      <div className="relative w-full max-w-[520px] aspect-square">
        <svg viewBox="0 0 500 500" className="w-full h-full">
          <defs>
            <filter id="aGlow">
              <feGaussianBlur stdDeviation="5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="aPtGlow">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="aLblGlow">
              <feGaussianBlur stdDeviation="2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="aFill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#7b61ff" stopOpacity="0.12" />
            </linearGradient>
            <radialGradient id="aCenterGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="aScanGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
              <stop offset="30%" stopColor="#22d3ee" stopOpacity="1" />
              <stop offset="70%" stopColor="#3b82f6" stopOpacity="1" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
            <clipPath id="aClip">
              <rect x="0" y="0" width="500" height="500" />
            </clipPath>
          </defs>

          {/* Background grid rings */}
          {[1, 2, 3, 4, 5].map((i) => {
            const r = (maxR / 5) * i;
            return (
              <polygon
                key={`gr-${i}`}
                points={ATTR_CONFIG.map((cfg) => {
                  const pt = polarToCartesian(cx, cy, r, cfg.angle);
                  return `${pt.x},${pt.y}`;
                }).join(" ")}
                fill="none"
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={i === 5 ? 0.7 : 0.4}
              />
            );
          })}

          {/* Axis lines */}
          {ATTR_CONFIG.map((cfg) => {
            const outer = polarToCartesian(cx, cy, maxR, cfg.angle);
            const isAxisActive = active === cfg.key;
            return (
              <line
                key={`ax-${cfg.key}`}
                x1={cx}
                y1={cy}
                x2={outer.x}
                y2={outer.y}
                stroke={isAxisActive ? `${cfg.color}50` : "rgba(255,255,255,0.06)"}
                strokeWidth={isAxisActive ? 1.5 : 0.8}
                strokeDasharray={isAxisActive ? "none" : "3 5"}
                style={{ transition: "stroke 0.3s, stroke-width 0.3s" }}
              />
            );
          })}

          {/* Center glow */}
          <circle cx={cx} cy={cy} r={maxR * 0.5} fill="url(#aCenterGlow)" />

          {/* Rotating sweep */}
          <g
            clipPath="url(#aClip)"
            className="attr-animated"
            style={{ transformOrigin: `${cx}px ${cy}px`, animation: "attr-sweep 6s linear infinite" }}
          >
            <line
              x1={cx}
              y1={cy}
              x2={cx + maxR + 10}
              y2={cy}
              stroke="rgba(34,211,238,0.12)"
              strokeWidth="1.5"
            />
            <line
              x1={cx}
              y1={cy}
              x2={cx}
              y2={cy - maxR - 10}
              stroke="rgba(34,211,238,0.08)"
              strokeWidth="1"
            />
          </g>

          {/* Orbit rings */}
          <circle
            cx={cx}
            cy={cy}
            r={ringR}
            fill="none"
            stroke="rgba(34,211,238,0.08)"
            strokeWidth="0.5"
            strokeDasharray="6 10"
            className="attr-animated"
            style={{ transformOrigin: `${cx}px ${cy}px`, animation: "attr-ring-dash 4s linear infinite" }}
          />
          <circle
            cx={cx}
            cy={cy}
            r={ringR + 10}
            fill="none"
            stroke="rgba(123,97,255,0.05)"
            strokeWidth="0.3"
            strokeDasharray="3 14"
            className="attr-animated"
            style={{ transformOrigin: `${cx}px ${cy}px`, animation: "attr-ring-dash 6s linear infinite reverse" }}
          />

          {/* Scanline */}
          <g clipPath="url(#aClip)">
            <rect
              x={cx - maxR - 20}
              y={0}
              width={(maxR + 20) * 2}
              height={3}
              rx={1.5}
              fill="url(#aScanGrad)"
              className="attr-animated"
              style={{ animation: "attr-scanline 5s ease-in-out infinite" }}
              opacity={0.12}
            />
          </g>

          {/* Pulsing radar rings */}
          {[0, 1, 2].map((i) => (
            <polygon
              key={`pulse-${i}`}
              points={ATTR_CONFIG.map((cfg) => {
                const pt = polarToCartesian(cx, cy, maxR, cfg.angle);
                return `${pt.x},${pt.y}`;
              }).join(" ")}
              fill="none"
              stroke="rgba(34,211,238,0.12)"
              strokeWidth="0.4"
              className="attr-animated"
              style={{
                animation: `attr-pulse 3.5s ease-in-out ${i * 1.1}s infinite`,
                transformOrigin: `${cx}px ${cy}px`,
                transform: `scale(${1 + i * 0.05})`,
              }}
            />
          ))}

          {/* Data polygon */}
          <polygon
            points={points}
            fill="url(#aFill)"
            stroke={active ? (activeConfig?.color ?? "#22d3ee") : "#22d3ee"}
            strokeWidth={active ? 2.2 : 1.5}
            filter="url(#aGlow)"
            style={{ transition: "stroke 0.3s, stroke-width 0.3s" }}
          />

          {/* Highlighted axis on hover */}
          {active && activeConfig && (() => {
            const val = Math.max(0, Math.min(100, safe[activeConfig.key] ?? 0));
            const r = (val / 100) * maxR;
            const pt = polarToCartesian(cx, cy, r, activeConfig.angle);
            return (
              <line
                x1={cx}
                y1={cy}
                x2={pt.x}
                y2={pt.y}
                stroke={activeConfig.color}
                strokeWidth="2"
                strokeOpacity="0.5"
                filter="url(#aPtGlow)"
                style={{ transition: "all 0.3s" }}
              />
            );
          })()}

          {/* Connector lines from data points to label positions */}
          {attrPoints.map((p) => {
            const isAct = active === p.key;
            return (
              <line
                key={`conn-${p.key}`}
                x1={p.px}
                y1={p.py}
                x2={p.lx}
                y2={p.ly}
                stroke={isAct ? `${p.color}40` : "rgba(255,255,255,0.06)"}
                strokeWidth={isAct ? 1 : 0.5}
                strokeDasharray={isAct ? "none" : "2 3"}
                style={{ transition: "stroke 0.3s, stroke-width 0.3s" }}
              />
            );
          })}

          {/* Data points + floating labels */}
          {attrPoints.map((p) => {
            const isAct = active === p.key;
            const rating = getRatingLabel(p.val);
            const isTop = p.key === "durability";
            const isRight = p.key === "offense";
            const isBottom = p.key === "abilityEffects";
            const isLeft = p.key === "difficulty";

            const textAnchor = isRight ? "start" : isLeft ? "end" : "middle";
            const labelOffsetX = isRight ? 6 : isLeft ? -6 : 0;
            const nameY = isTop ? p.ly - 22 : isBottom ? p.ly + 12 : p.ly - 6;
            const valueY = isTop ? p.ly - 6 : isBottom ? p.ly + 28 : p.ly + 12;
            const ratingY = isTop ? p.ly + 8 : isBottom ? p.ly + 42 : p.ly + 26;

            return (
              <g key={p.key}>
                {/* Point outer glow */}
                <circle
                  cx={p.px}
                  cy={p.py}
                  r={isAct ? 14 : 9}
                  fill={p.color}
                  opacity={isAct ? 0.2 : 0.06}
                  style={{ transition: "all 0.3s" }}
                />
                {/* Animated pulse ring on active point */}
                {isAct && (
                  <circle
                    cx={p.px}
                    cy={p.py}
                    r={10}
                    fill="none"
                    stroke={p.color}
                    strokeWidth="0.8"
                    opacity={0.4}
                    className="attr-animated"
                    style={{
                      transformOrigin: `${p.px}px ${p.py}px`,
                      animation: "attr-node-pulse 2s ease-in-out infinite",
                    }}
                  />
                )}
                {/* Point dot */}
                <circle
                  cx={p.px}
                  cy={p.py}
                  r={isAct ? 5 : 3.5}
                  fill={p.color}
                  filter="url(#aPtGlow)"
                  opacity={isAct ? 1 : 0.75}
                  style={{ transition: "all 0.3s" }}
                />
                {/* Inner white dot */}
                <circle
                  cx={p.px}
                  cy={p.py}
                  r={isAct ? 2 : 1.5}
                  fill="#fff"
                  opacity={isAct ? 0.9 : 0.5}
                  style={{ transition: "all 0.3s" }}
                />

                {/* Floating label group */}
                <g
                  className="attr-label-group"
                  onMouseEnter={() => handleHover(p.key)}
                  onMouseLeave={() => handleHover(null)}
                  onClick={() => handleClick(p.key)}
                >
                  {/* Invisible hit area */}
                  <rect
                    x={p.lx - 45}
                    y={nameY - 10}
                    width={90}
                    height={56}
                    fill="transparent"
                  />
                  {/* Attribute name */}
                  <text
                    x={p.lx + labelOffsetX}
                    y={nameY}
                    fill={isAct ? p.color : "rgba(255,255,255,0.45)"}
                    fontSize="10"
                    fontWeight="800"
                    fontFamily="monospace"
                    textAnchor={textAnchor}
                    letterSpacing="0.12em"
                    className="attr-label-name"
                    style={{
                      transition: "fill 0.3s",
                      textShadow: isAct ? `0 0 8px ${p.glowColor}` : "none",
                    }}
                  >
                    {p.shortLabel}
                  </text>
                  {/* Value */}
                  <text
                    x={p.lx + labelOffsetX}
                    y={valueY}
                    fill={isAct ? p.color : "rgba(255,255,255,0.7)"}
                    fontSize={isAct ? "22" : "18"}
                    fontWeight="900"
                    fontFamily="monospace"
                    textAnchor={textAnchor}
                    style={{
                      transition: "fill 0.3s, font-size 0.3s",
                      textShadow: isAct ? `0 0 14px ${p.glowColor}` : "none",
                    }}
                  >
                    {p.val}
                  </text>
                  {/* Rating */}
                  <text
                    x={p.lx + labelOffsetX}
                    y={ratingY}
                    fill={isAct ? `${p.color}aa` : "rgba(255,255,255,0.2)"}
                    fontSize="8"
                    fontWeight="700"
                    fontFamily="monospace"
                    textAnchor={textAnchor}
                    letterSpacing="0.1em"
                    style={{ transition: "fill 0.3s" }}
                  >
                    {rating}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Floating particles */}
          {[...Array(8)].map((_, i) => {
            const angle = (i * 45 + 20) * (Math.PI / 180);
            const baseR = maxR * 0.35 + (i % 4) * 22;
            const px = cx + baseR * Math.cos(angle);
            const py = cy + baseR * Math.sin(angle);
            return (
              <circle
                key={`part-${i}`}
                cx={px}
                cy={py}
                r={0.8}
                fill="#22d3ee"
                opacity={0.2}
                className="attr-animated"
                style={{
                  animation: `attr-particle-drift ${3.5 + i * 0.4}s ease-in-out ${i * 0.35}s infinite`,
                }}
              />
            );
          })}
        </svg>
      </div>

      {/* === BOTTOM DETAIL STRIP === */}
      <div className="w-full max-w-[520px]">
        {/* Compact stat bars row */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {ATTR_CONFIG.map((cfg) => {
            const val = Math.max(0, Math.min(100, safe[cfg.key] ?? 0));
            const isAct = active === cfg.key;
            return (
              <button
                key={cfg.key}
                onMouseEnter={() => handleHover(cfg.key)}
                onMouseLeave={() => handleHover(null)}
                onClick={() => handleClick(cfg.key)}
                className="relative p-2 rounded-lg border text-left transition-all duration-200 select-none"
                style={{
                  background: isAct
                    ? `linear-gradient(135deg, ${cfg.glowColor}, rgba(255,255,255,0.02))`
                    : "rgba(255,255,255,0.02)",
                  borderColor: isAct ? `${cfg.color}35` : "rgba(255,255,255,0.04)",
                }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      background: cfg.color,
                      boxShadow: isAct ? `0 0 6px ${cfg.glowColor}` : "none",
                    }}
                  />
                  <span
                    className="text-[8px] font-mono font-bold uppercase tracking-wider"
                    style={{ color: isAct ? cfg.color : "rgba(255,255,255,0.35)" }}
                  >
                    {cfg.shortLabel}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span
                    className="text-base font-display font-black tabular-nums"
                    style={{
                      color: isAct ? cfg.color : "rgba(255,255,255,0.6)",
                      textShadow: isAct ? `0 0 10px ${cfg.glowColor}` : "none",
                    }}
                  >
                    {val}
                  </span>
                  <span
                    className="text-[7px] font-mono uppercase"
                    style={{ color: isAct ? `${cfg.color}88` : "rgba(255,255,255,0.18)" }}
                  >
                    {getRatingLabel(val)}
                  </span>
                </div>
                {/* Mini bar */}
                <div className="h-[3px] rounded-full bg-white/[0.04] overflow-hidden mt-1.5">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${val}%` }}
                    transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
                    style={{
                      background: `linear-gradient(90deg, ${cfg.color}70, ${cfg.color})`,
                      boxShadow: isAct ? `0 0 4px ${cfg.glowColor}` : "none",
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Active attribute description */}
        <AnimatePresence mode="wait">
          {active && activeConfig && (
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="p-3 rounded-xl border text-center"
              style={{
                background: `linear-gradient(135deg, ${activeConfig.glowColor}, rgba(255,255,255,0.01))`,
                borderColor: `${activeConfig.color}20`,
              }}
            >
              <span
                className="text-[10px] font-mono font-bold uppercase tracking-wider"
                style={{ color: activeConfig.color }}
              >
                {activeConfig.label}
              </span>
              <span className="text-[9px] font-mono text-white/30 mx-2">·</span>
              <span className="text-[9px] font-mono text-white/40">
                {activeConfig.description}
              </span>
              <span className="text-[9px] font-mono text-white/30 mx-2">·</span>
              <span
                className="text-[9px] font-mono font-bold"
                style={{ color: activeConfig.color }}
              >
                {activeVal} / 100
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hover hint when nothing active */}
        {!active && (
          <div className="text-center py-1.5">
            <span className="text-[8px] font-mono text-white/15 uppercase tracking-widest">
              Hover or click an attribute to inspect
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
