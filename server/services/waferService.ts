/**
 * Wafer AI Service — 3-Tier Architecture
 * 
 * Tier 1 (Realtime): deepseek-v4-flash — ban/pick recommendations, coach panel
 * Tier 2 (Analysis): Qwen3.6-35B-A3B — post-draft analysis, matchup analysis
 * Tier 3 (Premium):  Qwen3.5-397B-A17B — deep analysis, export reports (never auto-called)
 */

const WAFER_ENDPOINT = 'https://pass.wafer.ai/v1/chat/completions';

// ─── Config ─────────────────────────────────────────────────────────────────────

type WaferTier = 'realtime' | 'analysis' | 'premium';

function getModelForTier(tier: WaferTier): string {
  switch (tier) {
    case 'realtime': return process.env.WAFER_REALTIME_MODEL || 'deepseek-v4-flash';
    case 'analysis': return process.env.WAFER_ANALYSIS_MODEL || 'Qwen3.6-35B-A3B';
    case 'premium': return process.env.WAFER_PREMIUM_MODEL || 'Qwen3.5-397B-A17B';
  }
}

function getMaxTokensForTier(tier: WaferTier): number {
  switch (tier) {
    case 'realtime': return 300;
    case 'analysis': return 800;
    case 'premium': return 2000;
  }
}

// ─── Cache ──────────────────────────────────────────────────────────────────────

const responseCache = new Map<string, { response: string; timestamp: number; model: string }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCacheKey(tier: WaferTier, messages: WaferChatMessage[]): string {
  // Hash based on tier + message content
  const content = tier + '|' + messages.map(m => m.role + ':' + m.content).join('||');
  // Simple hash
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `wafer_${tier}_${hash}`;
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
  // Limit cache size
  if (responseCache.size > 50) {
    const firstKey = responseCache.keys().next().value;
    if (firstKey) responseCache.delete(firstKey);
  }
}

// ─── Logging ────────────────────────────────────────────────────────────────────

function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 chars for English/Indonesian
  return Math.ceil(text.length / 4);
}

function logAICall(tier: WaferTier, model: string, inputTokens: number, outputTokens: number, latencyMs: number, cached: boolean): void {
  const costPerInputToken = tier === 'premium' ? 0.000003 : tier === 'analysis' ? 0.0000008 : 0.0000002;
  const costPerOutputToken = tier === 'premium' ? 0.000012 : tier === 'analysis' ? 0.0000032 : 0.0000008;
  const estimatedCost = (inputTokens * costPerInputToken) + (outputTokens * costPerOutputToken);

  console.log(`[Wafer AI] Tier=${tier} Model=${model} Input≈${inputTokens}tok Output≈${outputTokens}tok Latency=${latencyMs}ms Cost≈$${estimatedCost.toFixed(6)} Cached=${cached}`);
}

// ─── Core Call Function ─────────────────────────────────────────────────────────

interface WaferChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface WaferResponse {
  success: boolean;
  response: string;
  model: string;
  latencyMs: number;
  tier: WaferTier;
  cached: boolean;
  tokenEstimate?: { input: number; output: number };
  error?: string;
}

async function callWafer(tier: WaferTier, messages: WaferChatMessage[], useCache: boolean = true): Promise<WaferResponse> {
  const apiKey = process.env.WAFER_API_KEY;
  const model = getModelForTier(tier);
  const maxTokens = getMaxTokensForTier(tier);

  if (!apiKey || apiKey === 'YOUR_KEY') {
    return { success: false, response: '', model, latencyMs: 0, tier, cached: false, error: 'WAFER_API_KEY is not configured.' };
  }

  // Check cache
  const cacheKey = getCacheKey(tier, messages);
  if (useCache) {
    const cached = getCachedResponse(cacheKey);
    if (cached) {
      const inputTokens = estimateTokens(messages.map(m => m.content).join(''));
      const outputTokens = estimateTokens(cached.response);
      logAICall(tier, cached.model, inputTokens, outputTokens, 0, true);
      return { success: true, response: cached.response, model: cached.model, latencyMs: 0, tier, cached: true, tokenEstimate: { input: inputTokens, output: outputTokens } };
    }
  }

  const startTime = Date.now();
  const inputText = messages.map(m => m.content).join('');
  const inputTokens = estimateTokens(inputText);

  try {
    const res = await fetch(WAFER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
    });

    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      const errorBody = await res.text();
      return { success: false, response: '', model, latencyMs, tier, cached: false, error: `Wafer API error ${res.status}: ${errorBody}` };
    }

    const data: any = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';
    const outputTokens = data?.usage?.completion_tokens || estimateTokens(content);
    const actualInputTokens = data?.usage?.prompt_tokens || inputTokens;

    logAICall(tier, model, actualInputTokens, outputTokens, latencyMs, false);

    // Cache the response
    if (useCache && content) {
      setCachedResponse(cacheKey, content, model);
    }

    return {
      success: true, response: content, model, latencyMs, tier, cached: false,
      tokenEstimate: { input: actualInputTokens, output: outputTokens }
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return { success: false, response: '', model, latencyMs, tier, cached: false, error: `Wafer request failed: ${err.message}` };
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────────

const REALTIME_SYSTEM_PROMPT = `You are an MLBB draft coach. Be extremely concise (max 2-3 sentences per hero). Only use provided data. Do not fabricate stats. Respond in Bahasa Indonesia.`;

const ANALYSIS_SYSTEM_PROMPT = `You are an MLBB professional draft analyst. Only use data provided in the JSON. Do not fabricate winrates, pick rates, or team history. If data is missing, say data is unavailable. Provide: Draft strengths, weaknesses, win conditions, teamfight analysis, objective control, power spikes, recommendations. Respond in Bahasa Indonesia.`;

const PREMIUM_SYSTEM_PROMPT = `You are an elite MLBB esports analyst performing deep strategic analysis. Only use data provided. Never fabricate statistics. Provide comprehensive analysis covering: information warfare assessment, hidden gameplan detection, draft deception evaluation, multi-layer strategic breakdown, win condition paths, macro strategy, and actionable coaching insights. Respond in Bahasa Indonesia.`;

/** Tier 1: Realtime recommendation coaching (cheap, fast) */
export async function realtimeCoach(context: string): Promise<WaferResponse> {
  return callWafer('realtime', [
    { role: 'system', content: REALTIME_SYSTEM_PROMPT },
    { role: 'user', content: context },
  ]);
}

/** Tier 2: Standard draft analysis (medium cost) */
export async function analyzeDraft(draftData: any): Promise<WaferResponse> {
  const userContent = JSON.stringify(draftData, null, 2);
  return callWafer('analysis', [
    { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
    { role: 'user', content: `Analyze this MLBB draft:\n${userContent}` },
  ]);
}

/** Tier 3: Premium deep analysis (expensive, never auto-called) */
export async function deepAnalysis(draftData: any): Promise<WaferResponse> {
  const userContent = JSON.stringify(draftData, null, 2);
  return callWafer('premium', [
    { role: 'system', content: PREMIUM_SYSTEM_PROMPT },
    { role: 'user', content: `Perform deep strategic analysis:\n${userContent}` },
  ], false); // No cache for premium (user explicitly requests fresh analysis)
}

/** Test connection (uses realtime tier) */
export async function testConnection(): Promise<WaferResponse> {
  return callWafer('realtime', [
    { role: 'system', content: 'Reply briefly.' },
    { role: 'user', content: 'Respond with "Wafer AI connection successful" only.' },
  ], false);
}

/** Get cache stats */
export function getCacheStats(): { size: number; maxSize: number } {
  return { size: responseCache.size, maxSize: 50 };
}
