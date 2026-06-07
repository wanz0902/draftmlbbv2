import type { CompactWaferPayload } from "../../src/draft/draftTypes";

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

function estimateCost(tier: WaferTier, inputTokens: number, outputTokens: number): number {
  const costPerInputToken = tier === 'premium' ? 0.000003 : tier === 'analysis' ? 0.0000008 : 0.0000002;
  const costPerOutputToken = tier === 'premium' ? 0.000012 : tier === 'analysis' ? 0.0000032 : 0.0000008;
  return (inputTokens * costPerInputToken) + (outputTokens * costPerOutputToken);
}

interface WaferCallMetadata {
  endpoint?: string;
  payloadSize?: number;
  selectedTeams?: string[];
  similarGamesCount?: number;
  recommendationSource?: string;
}

function logAICall(
  tier: WaferTier,
  model: string,
  inputTokens: number,
  outputTokens: number,
  latencyMs: number,
  cached: boolean,
  metadata: WaferCallMetadata = {}
): number {
  const estimatedCost = estimateCost(tier, inputTokens, outputTokens);
  const endpoint = metadata.endpoint || 'unknown';
  const payloadSize = metadata.payloadSize ?? 0;
  const teams = metadata.selectedTeams?.join(' vs ') || 'n/a';
  const similarGamesCount = metadata.similarGamesCount ?? 0;
  const recommendationSource = metadata.recommendationSource || 'unknown';

  console.log(`[Wafer AI] Endpoint=${endpoint} Tier=${tier} Model=${model} Input≈${inputTokens}tok Output≈${outputTokens}tok Latency=${latencyMs}ms Cost≈$${estimatedCost.toFixed(6)} Cached=${cached} PayloadBytes=${payloadSize} Teams=${teams} SimilarGames=${similarGamesCount} RecommendationSource=${recommendationSource}`);
  return estimatedCost;
}

// ─── Core Call Function ─────────────────────────────────────────────────────────

interface WaferChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface WaferResponse {
  success: boolean;
  response: string;
  model: string;
  latencyMs: number;
  tier: WaferTier;
  cached: boolean;
  tokenEstimate?: { input: number; output: number };
  estimatedCost?: number;
  payloadSize?: number;
  error?: string;
}

// ─── Multi-key rotation ───────────────────────────────────────────────────────
let _waferKeyIndex = 0;

function getWaferApiKey(): string | undefined {
  const key1 = process.env.WAFER_API_KEY_1;
  const key2 = process.env.WAFER_API_KEY_2;
  const legacyKey = process.env.WAFER_API_KEY;

  const keys = [key1, key2, legacyKey].filter(
    (k): k is string => !!k && k !== 'YOUR_WAFER_API_KEY' && k !== 'YOUR_KEY' && k !== 'YOUR_WAFER_API_KEY_1' && k !== 'YOUR_WAFER_API_KEY_2'
  );

  if (keys.length === 0) return undefined;
  const key = keys[_waferKeyIndex % keys.length];
  _waferKeyIndex = (_waferKeyIndex + 1) % keys.length;
  return key;
}

async function callWafer(
  tier: WaferTier,
  messages: WaferChatMessage[],
  useCache: boolean = true,
  metadata: WaferCallMetadata = {}
): Promise<WaferResponse> {
  const apiKey = getWaferApiKey();
  const model = getModelForTier(tier);
  const maxTokens = getMaxTokensForTier(tier);

  if (!apiKey) {
    return { success: false, response: '', model, latencyMs: 0, tier, cached: false, error: 'WAFER_API_KEY is not configured.' };
  }

  // Check cache
  const cacheKey = getCacheKey(tier, messages);
  if (useCache) {
    const cached = getCachedResponse(cacheKey);
    if (cached) {
      const inputTokens = estimateTokens(messages.map(m => m.content).join(''));
      const outputTokens = estimateTokens(cached.response);
      const estimatedCost = logAICall(tier, cached.model, inputTokens, outputTokens, 0, true, metadata);
      return {
        success: true,
        response: cached.response,
        model: cached.model,
        latencyMs: 0,
        tier,
        cached: true,
        tokenEstimate: { input: inputTokens, output: outputTokens },
        estimatedCost,
        payloadSize: metadata.payloadSize,
      };
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

    const estimatedCost = logAICall(tier, model, actualInputTokens, outputTokens, latencyMs, false, metadata);

    // Cache the response
    if (useCache && content) {
      setCachedResponse(cacheKey, content, model);
    }

    return {
      success: true, response: content, model, latencyMs, tier, cached: false,
      tokenEstimate: { input: actualInputTokens, output: outputTokens },
      estimatedCost,
      payloadSize: metadata.payloadSize,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      response: '',
      model,
      latencyMs,
      tier,
      cached: false,
      payloadSize: metadata.payloadSize,
      error: `Wafer request failed: ${err.message}`,
    };
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────────

const REALTIME_SYSTEM_PROMPT = `Anda adalah penjelas rekomendasi draft MLBB. Source of truth adalah local engine, bukan AI. Jawab maksimal 350 kata. Jangan ulang data mentah. Gunakan bullet pendek. Jangan membuat angka baru. Jika data tidak tersedia, tulis data tidak tersedia. Fokus pada alasan pick/ban berdasarkan evidence. Jelaskan kandidat yang sudah diberikan, jangan menentukan hero dari nol.`;

const ANALYSIS_SYSTEM_PROMPT = `Anda adalah analis draft MLBB profesional. Source of truth adalah local engine, bukan AI. Jawab maksimal 350 kata. Jangan ulang data mentah. Gunakan bullet pendek. Jangan membuat angka baru. Jika data tidak tersedia, tulis data tidak tersedia. Fokus pada alasan pick/ban berdasarkan evidence. Jangan menentukan hero dari nol; hanya jelaskan kandidat dan ringkasan yang sudah diberikan.`;

const PREMIUM_SYSTEM_PROMPT = `You are an elite MLBB esports analyst performing deep strategic analysis. Only use data provided. Never fabricate statistics. Provide comprehensive analysis covering: information warfare assessment, hidden gameplan detection, draft deception evaluation, multi-layer strategic breakdown, win condition paths, macro strategy, and actionable coaching insights. Respond in Bahasa Indonesia.`;

/** Tier 1: Realtime recommendation coaching (cheap, fast) */
export async function realtimeCoach(context: string): Promise<WaferResponse> {
  return callWafer('realtime', [
    { role: 'system', content: REALTIME_SYSTEM_PROMPT },
    { role: 'user', content: context },
  ]);
}

/** Tier 2: Standard draft analysis (medium cost) */
export async function analyzeDraft(
  draftData: CompactWaferPayload,
  options: { endpoint?: string; selectedTeams?: string[]; similarGamesCount?: number; recommendationSource?: string } = {}
): Promise<WaferResponse> {
  const trimmedPayload: CompactWaferPayload = {
    ...draftData,
    similarGamesTop3: (draftData.similarGamesTop3 || []).slice(0, 3),
    recommendationCandidatesTop5: (draftData.recommendationCandidatesTop5 || []).slice(0, 5),
  };
  const userContent = JSON.stringify(trimmedPayload);
  const payloadSize = Buffer.byteLength(userContent, 'utf8');
  return callWafer('analysis', [
    { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
    { role: 'user', content: `Analyze this MLBB draft:\n${userContent}` },
  ], true, {
    endpoint: options.endpoint || '/api/ai/draft-analysis',
    payloadSize,
    selectedTeams: options.selectedTeams,
    similarGamesCount: trimmedPayload.similarGamesTop3.length,
    recommendationSource: options.recommendationSource,
  });
}

export async function explainRealtimeDraft(
  draftData: CompactWaferPayload,
  options: { endpoint?: string; selectedTeams?: string[]; similarGamesCount?: number; recommendationSource?: string } = {}
): Promise<WaferResponse> {
  const trimmedPayload: CompactWaferPayload = {
    ...draftData,
    similarGamesTop3: (draftData.similarGamesTop3 || []).slice(0, 3),
    recommendationCandidatesTop5: (draftData.recommendationCandidatesTop5 || []).slice(0, 5),
  };
  const userContent = JSON.stringify(trimmedPayload);
  const payloadSize = Buffer.byteLength(userContent, 'utf8');
  return callWafer('realtime', [
    { role: 'system', content: REALTIME_SYSTEM_PROMPT },
    { role: 'user', content: `Jelaskan rekomendasi draft berikut berdasarkan evidence lokal:\n${userContent}` },
  ], true, {
    endpoint: options.endpoint || '/api/draft/recommendation',
    payloadSize,
    selectedTeams: options.selectedTeams,
    similarGamesCount: trimmedPayload.similarGamesTop3.length,
    recommendationSource: options.recommendationSource,
  });
}

export function buildLocalDraftAnalysis(payload: CompactWaferPayload): string {
  const lines: string[] = [];
  lines.push(`- Tim: ${payload.teams.blue} vs ${payload.teams.red}.`);
  lines.push(`- Head-to-head: ${payload.headToHeadSummary.summary || 'data tidak tersedia'}`);

  if (payload.similarGamesTop3.length > 0) {
    const similar = payload.similarGamesTop3[0];
    lines.push(`- Similar game: ${similar.sourceLabel}. Signal: ${similar.matchingSignals.join(', ') || 'data tidak tersedia'}.`);
  } else {
    lines.push(`- Similar game: data tidak tersedia.`);
  }

  if (payload.recommendationCandidatesTop5.length > 0) {
    lines.push(`- Kandidat utama:`);
    for (const candidate of payload.recommendationCandidatesTop5.slice(0, 3)) {
      lines.push(`  - ${candidate.heroName} (${candidate.type}): ${candidate.reason}. Evidence: ${candidate.evidence.join('; ') || 'data tidak tersedia'}.`);
    }
  } else {
    lines.push(`- Kandidat utama: data tidak tersedia.`);
  }

  if (payload.constraints.missingData.length > 0) {
    lines.push(`- Gap data: ${payload.constraints.missingData.join(', ')}.`);
  }

  return lines.join('\n').slice(0, 1800);
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
