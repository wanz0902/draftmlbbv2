import type { CompactWaferPayload } from "../../src/draft/draftTypes";
import * as waferService from "./waferService.js";
import * as tokenPlanService from "./tokenPlanService.js";

/**
 * Unified AI Provider Router
 * Routes calls between TokenPlan, Wafer, and local fallback.
 * Never exposes API keys. Never sends full hero DB.
 */

// ─── Config ────────────────────────────────────────────────────────────────────

const PRIMARY_PROVIDER = (process.env.AI_PRIMARY_PROVIDER || "tokenplan").toLowerCase();
const FALLBACK_PROVIDER = (process.env.AI_FALLBACK_PROVIDER || "wafer").toLowerCase();

export type AIProvider = "tokenplan" | "wafer" | "local";

export interface ProviderStatus {
  provider: AIProvider;
  connected: boolean;
  latencyMs: number;
  model: string;
  error?: string;
}

export interface RouterResponse {
  success: boolean;
  text: string;
  provider: AIProvider;
  model: string;
  latencyMs: number;
  cached: boolean;
  fallbackUsed?: boolean;
  error?: string;
  localFallback?: boolean;
}

// ─── Provider Tests ────────────────────────────────────────────────────────────

export async function testProvider(providerName: AIProvider): Promise<ProviderStatus> {
  const start = Date.now();
  switch (providerName) {
    case "tokenplan": {
      const res = await tokenPlanService.testConnection();
      return {
        provider: "tokenplan",
        connected: res.success,
        latencyMs: res.latencyMs,
        model: TOKENPLAN_REALTIME_MODEL_LABEL,
        error: res.error,
      };
    }
    case "wafer": {
      const res = await waferService.testConnection();
      return {
        provider: "wafer",
        connected: res.success,
        latencyMs: res.latencyMs,
        model: res.model || "unknown",
        error: res.error,
      };
    }
    case "local":
      return { provider: "local", connected: true, latencyMs: 0, model: "local-engine" };
    default:
      return {
        provider: providerName,
        connected: false,
        latencyMs: 0,
        model: "unknown",
        error: `Unknown provider: ${providerName}`,
      };
  }
}

export async function testAllProviders(): Promise<ProviderStatus[]> {
  return Promise.all([testProvider("tokenplan"), testProvider("wafer"), testProvider("local")]);
}

// ─── Local fallback (always available) ─────────────────────────────────────────

export function buildLocalExplanation(draftData: CompactWaferPayload): string {
  const lines: string[] = [];

  if (draftData.teams?.blue && draftData.teams?.red) {
    lines.push(`- Tim: ${draftData.teams.blue} vs ${draftData.teams.red}`);
  }
  if (draftData.headToHeadSummary?.summary) {
    lines.push(`- Head-to-head: ${draftData.headToHeadSummary.summary}`);
  }

  const recs = draftData.recommendationCandidatesTop5 || [];
  if (recs.length > 0) {
    lines.push(`- Kandidat utama:`);
    for (const r of recs.slice(0, 3)) {
      lines.push(`  - ${r.heroName} (${r.type}): ${r.reason}`);
    }
  }

  return lines.slice(0, 20).join("\n").slice(0, 1800) || "Data analisis tersedia dari engine lokal.";
}

function waferToRouter(res: waferService.WaferResponse, fallbackUsed?: boolean): RouterResponse {
  return {
    success: res.success,
    text: res.response,
    provider: "wafer",
    model: res.model,
    latencyMs: res.latencyMs,
    cached: res.cached,
    fallbackUsed,
    error: res.error,
  };
}

function tokenPlanToRouter(res: tokenPlanService.TokenPlanResponse, fallbackUsed?: boolean): RouterResponse {
  return {
    success: res.success,
    text: res.text,
    provider: "tokenplan",
    model: res.model,
    latencyMs: res.latencyMs,
    cached: res.cached,
    fallbackUsed,
    error: res.error,
  };
}

// ─── Router core — with fallback chain ─────────────────────────────────────────

async function tryProvider<T>(
  order: AIProvider[],
  exec: (p: AIProvider) => Promise<T | null>
): Promise<{ result: T; provider: AIProvider; fallbackUsed: boolean } | null> {
  for (let i = 0; i < order.length; i++) {
    const p = order[i];
    const result = await exec(p);
    if (result) return { result, provider: p, fallbackUsed: i > 0 };
  }
  return null;
}

function buildProviderOrder(preferred: AIProvider): AIProvider[] {
  // Primary → Fallback → Local
  const seen = new Set<AIProvider>();
  const order: AIProvider[] = [];
  for (const p of [preferred, PRIMARY_PROVIDER as AIProvider, FALLBACK_PROVIDER as AIProvider, "local" as AIProvider]) {
    if (p && !seen.has(p)) {
      seen.add(p);
      order.push(p);
    }
  }
  return order;
}

const TOKENPLAN_REALTIME_MODEL_LABEL = "mimo-v2.5";
const TOKENPLAN_ANALYSIS_MODEL_LABEL = "mimo-v2.5-pro";
const TOKENPLAN_PREMIUM_MODEL_LABEL = "mimo-v2.5-pro";

// ─── Realtime recommendation explain ──────────────────────────────────────────

export async function generateRecommendation(
  draftData: CompactWaferPayload,
  options: { provider?: AIProvider; timeoutMs?: number } = {}
): Promise<RouterResponse> {
  const preferred = options.provider || PRIMARY_PROVIDER as AIProvider;
  const order = buildProviderOrder(preferred);

  const exec = async (p: AIProvider): Promise<RouterResponse | null> => {
    switch (p) {
      case "tokenplan": {
        const res = await tokenPlanService.realtimeCoach(
          `Rekomendasi draft tambahan:\n${JSON.stringify(draftData).slice(0, 1800)}`
        );
        return res.success ? tokenPlanToRouter(res) : null;
      }
      case "wafer": {
        const res = await waferService.explainRealtimeDraft(draftData, {});
        return res.success ? waferToRouter(res) : null;
      }
      case "local":
        return {
          success: true,
          text: buildLocalExplanation(draftData),
          provider: "local",
          model: "local-engine",
          latencyMs: 0,
          cached: false,
          localFallback: true,
        };
      default:
        return null;
    }
  };

  const mainResult = await tryProvider(order, exec);
  if (mainResult) {
    return { ...mainResult.result, fallbackUsed: mainResult.fallbackUsed };
  }

  // Absolute fallback
  return {
    success: true,
    text: buildLocalExplanation(draftData),
    provider: "local",
    model: "local-engine",
    latencyMs: 0,
    cached: false,
    localFallback: true,
  };
}

// ─── Final draft analysis ─────────────────────────────────────────────────────

export async function analyzeDraft(
  draftData: CompactWaferPayload,
  options: { provider?: AIProvider; timeoutMs?: number } = {}
): Promise<RouterResponse> {
  const preferred = options.provider || PRIMARY_PROVIDER as AIProvider;
  const order = buildProviderOrder(preferred);

  const exec = async (p: AIProvider): Promise<RouterResponse | null> => {
    switch (p) {
      case "tokenplan": {
        const res = await tokenPlanService.analyzeDraft(draftData);
        return res.success ? tokenPlanToRouter(res) : null;
      }
      case "wafer": {
        const res = await waferService.analyzeDraft(draftData, {});
        return res.success ? waferToRouter(res) : null;
      }
      case "local":
        return {
          success: true,
          text: buildLocalExplanation(draftData),
          provider: "local",
          model: "local-engine",
          latencyMs: 0,
          cached: false,
          localFallback: true,
        };
      default:
        return null;
    }
  };

  const mainResult = await tryProvider(order, exec);
  if (mainResult) {
    return { ...mainResult.result, fallbackUsed: mainResult.fallbackUsed };
  }

  return {
    success: true,
    text: buildLocalExplanation(draftData),
    provider: "local",
    model: "local-engine",
    latencyMs: 0,
    cached: false,
    localFallback: true,
  };
}

// ─── Premium analysis (manual only, never auto) ────────────────────────────────

export async function deepAnalysis(
  draftData: any,
  options: { provider?: AIProvider } = {}
): Promise<RouterResponse> {
  const preferred = options.provider || PRIMARY_PROVIDER as AIProvider;

  if (preferred === "tokenplan") {
    const res = await tokenPlanService.deepAnalysis(draftData);
    return tokenPlanToRouter(res);
  }

  const res = await waferService.deepAnalysis(draftData);
  return waferToRouter(res);
}

// ─── Cache stats across all providers ────────────────────────────────────────

export function getCacheStats(): { wafer: { size: number }, tokenplan: { size: number } } {
  return {
    wafer: waferService.getCacheStats(),
    tokenplan: tokenPlanService.getCacheStats(),
  };
}

// ─── Router config info ───────────────────────────────────────────────────────

export function getRouterConfig(): {
  primary: AIProvider;
  fallback: AIProvider;
  tokenplanModels: { realtime: string; analysis: string; premium: string };
} {
  return {
    primary: PRIMARY_PROVIDER as AIProvider,
    fallback: FALLBACK_PROVIDER as AIProvider,
    tokenplanModels: {
      realtime: TOKENPLAN_REALTIME_MODEL_LABEL,
      analysis: TOKENPLAN_ANALYSIS_MODEL_LABEL,
      premium: TOKENPLAN_PREMIUM_MODEL_LABEL,
    },
  };
}
