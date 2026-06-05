import type { CompactWaferPayload } from "../../src/draft/draftTypes";

/**
 * TokenPlan / Mimo AI Service
 * OpenAI-compatible chat completions endpoint.
 */

const TOKENPLAN_BASE_URL = process.env.TOKENPLAN_BASE_URL || "https://token-plan-sgp.xiaomimimo.com/v1";
const TOKENPLAN_REALTIME_MODEL = process.env.TOKENPLAN_REALTIME_MODEL || "mimo-v2.5";
const TOKENPLAN_ANALYSIS_MODEL = process.env.TOKENPLAN_ANALYSIS_MODEL || "mimo-v2.5-pro";
const TOKENPLAN_PREMIUM_MODEL = process.env.TOKENPLAN_PREMIUM_MODEL || "mimo-v2.5-pro";

// Cache with TTL
type CachedEntry = { response: string; timestamp: number; model: string };
const responseCache = new Map<string, CachedEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 50;

function getCacheKey(payload: string, model: string): string {
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `tokenplan_${model}_${hash}`;
}

function getCachedResponse(key: string): { response: string; model: string } | null {
  const cached = responseCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    responseCache.delete(key);
    return null;
  }
  return { response: cached.response, model: cached.model };
}

function setCachedResponse(key: string, response: string, model: string): void {
  responseCache.set(key, { response, timestamp: Date.now(), model });
  if (responseCache.size > MAX_CACHE_SIZE) {
    const firstKey = responseCache.keys().next().value;
    if (firstKey) responseCache.delete(firstKey);
  }
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ─── Normalized response type ───────────────────────────────────────────────────
export interface TokenPlanResponse {
  success: boolean;
  provider: "tokenplan";
  model: string;
  text: string;
  latencyMs: number;
  cached: boolean;
  error?: string;
}

// ─── Core API call ──────────────────────────────────────────────────────────────
async function callTokenPlan({
  model,
  messages,
  maxTokens,
  temperature = 0.2,
  useCache = true,
}: {
  model: string;
  messages: Array<{ role: string; content: string }>;
  maxTokens: number;
  temperature?: number;
  useCache?: boolean;
}): Promise<TokenPlanResponse> {
  const apiKey = process.env.TOKENPLAN_API_KEY;
  if (!apiKey || apiKey === "YOUR_KEY") {
    return {
      success: false,
      provider: "tokenplan",
      model,
      text: "",
      latencyMs: 0,
      cached: false,
      error: "TOKENPLAN_API_KEY is not configured.",
    };
  }

  const contentKey = messages.map((m) => m.role + ":" + m.content).join("||");
  const cacheKey = getCacheKey(contentKey, model);

  if (useCache) {
    const cached = getCachedResponse(cacheKey);
    if (cached) {
      console.log(`[TokenPlan AI] Model=${model} Cached=true Latency=0ms`);
      return {
        success: true,
        provider: "tokenplan",
        model: cached.model,
        text: cached.response,
        latencyMs: 0,
        cached: true,
      };
    }
  }

  const startTime = Date.now();
  try {
    const res = await fetch(`${TOKENPLAN_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      const errorBody = await res.text();
      return {
        success: false,
        provider: "tokenplan",
        model,
        text: "",
        latencyMs,
        cached: false,
        error: `TokenPlan API error ${res.status}: ${errorBody.slice(0, 200)}`,
      };
    }

    const data: any = await res.json();
    const content = data?.choices?.[0]?.message?.content || "";

    if (useCache && content) {
      setCachedResponse(cacheKey, content, model);
    }

    console.log(`[TokenPlan AI] Model=${model} Latency=${latencyMs}ms Cached=false`);
    return {
      success: true,
      provider: "tokenplan",
      model,
      text: content,
      latencyMs,
      cached: false,
    };
  } catch (err: any) {
    return {
      success: false,
      provider: "tokenplan",
      model,
      text: "",
      latencyMs: Date.now() - startTime,
      cached: false,
      error: `TokenPlan request failed: ${err.message}`,
    };
  }
}

// ─── System prompts (identical to Wafer for consistent output) ─────────────────
const REALTIME_SYSTEM_PROMPT = `Anda adalah penjelas rekomendasi draft MLBB. Source of truth adalah local engine, bukan AI. Jawab maksimal 350 kata. Jangan ulang data mentah. Gunakan bullet pendek. Jangan membuat angka baru. Jika data tidak tersedia, tulis data tidak tersedia. Fokus pada alasan pick/ban berdasarkan evidence. Jelaskan kandidat yang sudah diberikan, jangan menentukan hero dari nol.`;

const ANALYSIS_SYSTEM_PROMPT = `Anda adalah analis draft MLBB profesional. Source of truth adalah local engine, bukan AI. Jawab maksimal 350 kata. Jangan ulang data mentah. Gunakan bullet pendek. Jangan membuat angka baru. Jika data tidak tersedia, tulis data tidak tersedia. Fokus pada alasan pick/ban berdasarkan evidence. Jangan menentukan hero dari nol; hanya jelaskan kandidat dan ringkasan yang sudah diberikan.`;

const PREMIUM_SYSTEM_PROMPT = `You are an elite MLBB esports analyst performing deep strategic analysis. Only use data provided. Never fabricate statistics. Provide comprehensive analysis covering: information warfare assessment, hidden gameplan detection, draft deception evaluation, multi-layer strategic breakdown, win condition paths, macro strategy, and actionable coaching insights. Respond in Bahasa Indonesia.`;

// ─── Public API ───────────────────────────────────────────────────────────────
export async function testConnection(): Promise<TokenPlanResponse> {
  return callTokenPlan({
    model: TOKENPLAN_REALTIME_MODEL,
    messages: [
      { role: "system", content: "Reply briefly." },
      { role: "user", content: 'Respond with "TokenPlan AI connection successful" only.' },
    ],
    maxTokens: 50,
    temperature: 0.1,
    useCache: false,
  });
}

export async function realtimeCoach(context: string): Promise<TokenPlanResponse> {
  return callTokenPlan({
    model: TOKENPLAN_REALTIME_MODEL,
    messages: [
      { role: "system", content: REALTIME_SYSTEM_PROMPT },
      { role: "user", content: context },
    ],
    maxTokens: 350,
    temperature: 0.2,
  });
}

export async function analyzeDraft(draftData: CompactWaferPayload): Promise<TokenPlanResponse> {
  const trimmed: CompactWaferPayload = {
    ...draftData,
    similarGamesTop3: (draftData.similarGamesTop3 || []).slice(0, 3),
    recommendationCandidatesTop5: (draftData.recommendationCandidatesTop5 || []).slice(0, 5),
  };
  const userContent = JSON.stringify(trimmed).slice(0, 1800);
  return callTokenPlan({
    model: TOKENPLAN_ANALYSIS_MODEL,
    messages: [
      { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
      { role: "user", content: `Analyze this MLBB draft:\n${userContent}` },
    ],
    maxTokens: 900,
    temperature: 0.2,
  });
}

export async function deepAnalysis(draftData: any): Promise<TokenPlanResponse> {
  const userContent = JSON.stringify(draftData, null, 2).slice(0, 2000);
  return callTokenPlan({
    model: TOKENPLAN_PREMIUM_MODEL,
    messages: [
      { role: "system", content: PREMIUM_SYSTEM_PROMPT },
      { role: "user", content: `Perform deep strategic analysis:\n${userContent}` },
    ],
    maxTokens: 2000,
    temperature: 0.3,
    useCache: false, // Never cache premium
  });
}

export function getCacheStats(): { size: number; maxSize: number } {
  return { size: responseCache.size, maxSize: MAX_CACHE_SIZE };
}
