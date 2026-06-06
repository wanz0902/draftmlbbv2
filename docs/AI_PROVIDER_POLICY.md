# AI Provider Policy — MLBB Draft Analytics

> **Read this before changing AI endpoints, provider routing, prompts, or model tiers.**
> This document exists to prevent AI hallucination, uncontrolled cost, and accidental
> production exposure of expensive/untested models.

---

## 1. AI Architecture Summary

**Core principle: Local engine is the brain. AI is the mouth.**

- The **local draft engine** (`draftRecommendationEngine`, `teamIdentityEngine`,
  `matchupProfileEngine`, `draftScoringEngine`) is the **sole source of truth** for all
  numeric data: win rates, pick rates, team history, match outcomes, hero scoring.
- AI providers (Wafer, TokenPlan/MiMo) exist **only to narrate/explain** the structured
  payload that the local engine has already computed.
- AI must **never** invent win rate, pick rate, match stats, matchup stats, confidence
  numbers, or hero recommendations from its own "meta knowledge."
- The website must remain **100% functional** if all AI providers fail or are disabled.
  Local engine results + template fallback must always be available.

---

## 2. Endpoint Policy Table

| Endpoint | Purpose | User-Facing? | Provider/Model | Should Log? | Should Cache? | Hallucination Risk | Cost Risk | Production Status |
|----------|---------|-------------|---------------|-------------|--------------|-------------------|-----------|-------------------|
| `POST /api/draft/recommendation` | MPL + Ranked draft hero recommendation | ✅ User | **Local engine only** (no AI) | N/A | N/A (instant) | None (pure local) | None | ✅ Production |
| `POST /api/ai/draft-analysis` | Post-draft narrative analysis | ✅ User | Router: Wafer → TokenPlan → Local | ✅ Logged | ✅ 5min TTL | Low (validated) | Low (analysis tier) | ✅ Production |
| `POST /api/ai/deep-analysis` | Premium deep strategic analysis | ⚠️ Manual only | Router: Premium model (expensive) | ✅ Logged | ❌ No cache | Medium (less constrained) | ⚠️ HIGH | ✅ Gated (DEEP_ANALYSIS_ENABLED + token) |
| `POST /api/ai/recommendation-explain` | Realtime recommendation narration | ✅ User | Router: Realtime model (cheap) | ❌ **NOT logged** | ✅ Provider cache | Low (short output) | Low | ✅ Production |
| `GET /api/ai/test` | Wafer connection test | ⚠️ Internal | Wafer realtime | No | No | None | Minimal | ✅ Gated (AI_DIAGNOSTICS_ENABLED) |
| `GET /api/ai/providers/test` | Test all providers | ⚠️ Internal | Both | No | No | None | Minimal | ✅ Gated (AI_DIAGNOSTICS_ENABLED) |
| `GET /api/ai/providers/benchmark` | Benchmark model latencies | ⚠️ Internal | Both (4 calls) | No | No | None | ⚠️ HIGH | ✅ Gated (AI_DIAGNOSTICS_ENABLED + token) |
| `GET /api/ai/cache-stats` | Show cache status | ⚠️ Internal | N/A | N/A | N/A | None | None | ✅ Gated (AI_DIAGNOSTICS_ENABLED) |
| `POST /api/draft/ai-recommend` | **Legacy** Gemini AI coach | ✅ User (Ranked) | Gemini/OpenAI | ❌ Not logged | No | ⚠️ Medium | Medium | ⚠️ Legacy — review/deprecate |
| `POST /api/draft/final-analysis` | **Legacy** Gemini final analysis | ✅ User (fallback) | Gemini | ❌ Not logged | No | ⚠️ Medium | Medium | ⚠️ Legacy — review/deprecate |
| `POST /api/draft/evaluate` | ~~Legacy Gemini evaluation~~ **DEPRECATED (Step 5C)** | ❌ Dead code | ~~Gemini~~ → 410 Gone | N/A | N/A | ~~High (fabricated win %)~~ Removed | None | 🚫 Deprecated — returns 410 |

---

## 3. Provider Policy

### Production Provider: Wafer AI
- **Role:** Primary provider for all user-facing AI requests in production.
- **Why:** Reliable SLA, pay-per-use billing, clear ToS for serving end users.
- **Config:** `AI_PRIMARY_PROVIDER=wafer` in `.env`

### Fallback/Dev Provider: TokenPlan / MiMo
- **Role:** Fallback provider if Wafer fails. Primary for development/internal use.
- **Why:** MiMo ToS is labeled "AI programming tools / coding workflow." Until
  written confirmation from MiMo support that production backend serving is allowed,
  do NOT route primary production user traffic to MiMo.
- **Config:** `AI_FALLBACK_PROVIDER=tokenplan` in `.env`
- **Safety:** If Wafer is down, TokenPlan handles overflow temporarily. Monitor and
  switch back to Wafer when recovered.

### Other Providers (Fireworks, Portkey, etc.)
- Not currently configured for production routing.
- Do NOT route production traffic to a provider just because its key exists in `.env`.
- Any new provider must be explicitly tested, documented, and approved before production.

### Environment Flag
- `AI_ENV=production` → routes user requests through primary provider (Wafer).
- `AI_ENV=development` → skips all AI providers, returns local engine analysis only.
  Use this for local development to avoid burning credits.

---

## 4. Model Tier Policy

| Tier | Models | max_tokens | Purpose | Auto-called? | Cost/Request (est.) |
|------|--------|-----------|---------|-------------|-------------------|
| **Realtime** | deepseek-v4-flash, mimo-v2.5 | 300 | Quick recommendation explanation (2-3 sentences) | ✅ Yes (per draft step if user clicks AI Coach) | ~$0.0002 |
| **Analysis** | Qwen3.6-35B-A3B, mimo-v2.5 | 800 | Post-draft summary narrative | ✅ Yes (after draft completes) | ~$0.002 |
| **Premium** | Qwen3.5-397B-A17B, mimo-v2.5-pro | 2000 | Deep strategic analysis, export reports | ❌ **NEVER auto-called** | ~$0.005–$0.01 |

### Premium/Deep Model Rules
- Premium model must **never** be triggered automatically by draft completion or UI buttons
  without explicit user action on a dedicated "Deep Analysis" button.
- Before exposing premium model publicly: add `logAIRequest()`, add auth/rate-limit gate.
- If a future paid subscription tier is introduced, premium model access should be gated
  behind that tier.

---

## 5. Cost-Control Rules

1. **All AI endpoints that call external providers MUST log** to `ai_request_logs`:
   provider, model, latency, input_tokens, output_tokens, estimated_cost, cache_hit,
   fallback_used, error_code.
2. **Repeated identical draft states** should serve from cache (5-minute TTL, in-memory).
   Do not call providers for the same payload within the TTL window.
3. **Premium/deep analysis** must have explicit user trigger only — never auto-fire.
4. **Add rate limiting** before public traffic grows:
   - ✅ Implemented: in-memory rate limiter per session/IP on `/api/ai/draft-analysis`
     (default: 10 requests/minute) and `/api/ai/recommendation-explain` (default: 30/min).
   - Rate limit returns HTTP 429 **before** calling AI provider — zero token spend.
   - Configurable via `AI_RATE_LIMIT_WINDOW_MS`, `AI_DRAFT_ANALYSIS_LIMIT`,
     `AI_RECOMMENDATION_EXPLAIN_LIMIT` in `.env`.
   - Local-only `/api/draft/recommendation` is NOT rate-limited (no AI spend).
5. **max_tokens limits must remain strict** — do not increase without cost review.
6. **Monitor `ai_request_logs`** weekly: check for cost spikes, unexpected models, abuse.

---

## 6. Anti-Hallucination Rules

1. **Numeric claims must come from local engine payload only.**
   If AI outputs "winrate 75%", that number must exist verbatim in the `CompactWaferPayload`
   sent to the provider. AI cannot compute or infer numbers.
2. **If data is missing, AI must say "data tidak tersedia."** Never fabricate.
3. **Recommendation source labels** (e.g., "Team History", "Matchup History", "Meta
   Fallback") come from the local engine's `recommendationSource` field — not AI guesses.
4. **Output validation** (`validateDraftAnalysisOutput()`) rejects any AI response that
   mentions hero names not in the current draft's allowed set. If validation fails, the
   system falls back to local structured analysis.
5. **System prompts** in both providers explicitly state:
   - "Source of truth adalah local engine, bukan AI"
   - "Jangan membuat angka baru"
   - "Jika data tidak tersedia, tulis data tidak tersedia"
   - "Jangan menentukan hero dari nol"
6. **AI must never recommend heroes.** It only explains why the local engine already
   recommended them. The scoring, ranking, and availability filtering is entirely local.

---

## 7. Known Risks & Follow-Up Tasks

| Priority | Task | Risk If Not Done |
|----------|------|-----------------|
| 🔴 High | Add `logAIRequest()` to `/api/ai/deep-analysis` | ~~Expensive calls untracked~~ ✅ Done (Step 4C) |
| 🔴 High | Add `logAIRequest()` to `/api/ai/recommendation-explain` | ~~Realtime calls untracked~~ ✅ Done (Step 4C) |
| 🟡 Medium | Add auth/rate-limit gate on `/api/ai/deep-analysis` | ~~Anyone can burn premium credits~~ ✅ Done (Step 4D — DEEP_ANALYSIS_ENABLED + token gate) |
| 🟡 Medium | Review/deprecate legacy Gemini endpoints | Weaker hallucination controls — but now logged and rate-limited (Step 5B) |
| 🟡 Medium | Add rate limiting before public traffic grows | ~~Abuse risk~~ ✅ Done (Steps 4E + 5B — all user-facing AI endpoints rate-limited) |
| 🟢 Low | Clarify MiMo ToS for production fallback use | Low risk if fallback only |
| 🟢 Low | Define real subscription/paywall system if product will sell plans | No urgency — "premium" is model tier only today |

---

## 8. Quick Reference for AI Coding Tools

**DO:**
- Always run local engine first, AI second.
- Send only the compact pre-computed payload to AI.
- Validate AI output before rendering.
- Use `AI_ENV=development` when testing locally.
- Log every production AI call.
- Run `npm run validate:data` after data changes.

**DO NOT:**
- Let AI invent numbers, stats, or hero recommendations.
- Auto-call premium/expensive models.
- Route production traffic to MiMo without ToS confirmation.
- Expose real API keys in docs, logs, or frontend.
- Remove or weaken anti-hallucination prompt instructions.
- Skip output validation for any AI response rendered to users.

---

*Last updated: Step 4B AI provider policy documentation. Based on read-only audit of
current endpoints, prompts, and provider configuration.*
