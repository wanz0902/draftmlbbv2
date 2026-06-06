# Data Architecture — MLBB Draft Analytics

> **Read this before changing anything related to data, the database, or draft analytics.**
> This document exists to prevent accidental rewrites or premature migrations by future
> developers and AI coding tools.

---

## 1. Current Architecture Summary

This project is **JSON-first** for all match/draft analytics.

- All draft recommendation, team profiling, matchup analysis, and post-draft analysis
  is computed from **local JSON data files** — NOT from SQLite.
- A SQLite database (`data/mlbb_master.db`) exists, but its `matches`, `draft_events`,
  `teams`, and `tournaments` tables are **currently EMPTY** and are **NOT** the source of
  truth for draft analytics.
- The SQLite `heroes` table IS populated (132 rows) and supports the Liquipedia scraper
  pipeline + hero seeding, but the draft engine reads hero data from JSON, not SQLite.

**Do NOT treat SQLite as the live data source for match/game/draft analytics.**

### Latest validation snapshot (`npm run validate:data`)
```
Hero count:      132
data/heroes files: 132
Series count:    72
Game count:      174
Team IDs:        AE, BTR, DEWA, EVOS, GEEK, NAVI, ONIC, RRQ, TLID
Errors:          0
Warnings:        0
```

---

## 2. Source of Truth Table

| File / Folder | Role | Source of Truth? | Notes |
|---------------|------|------------------|-------|
| `data/mpl_id_s17_regular_season.json` | **Primary** normalized match dataset | ✅ YES | 72 series, 174 games. Fully normalized: seriesId, gameId, blue/red teams, picks, bans, winners. This is the canonical match source. |
| `data/regular_matches.json` | Raw scraped series (Liquipedia format) | ⚠️ Secondary | Same 72 series in original format. Merged by `MatchHistoryService`. |
| `data/matches.json` | Raw scraped flat games (alt format) | ⚠️ Secondary | 100 flat game entries; draft stored as 10-element arrays (5 picks + 5 bans). Merged + deduped by `MatchHistoryService`. |
| `data/heroes/` (132 files) | Per-hero AI metadata | ✅ YES (hero metadata) | One JSON per hero: draftTags, counterTags, synergyTags, macroTags, powerSpikeTags, mechanicCategory, etc. Used by scoring engines. |
| `data/heroes_advanced.json` | Advanced hero metadata | ✅ YES (supporting) | Aggregate hero attributes. |
| `data/heroes_stats.json` | Scraped tournament hero stats | ⚠️ Reference | Liquipedia stats; informational. |
| `src/data/heroes_master.json` | Canonical hero roster | ✅ YES (roster) | 132 heroes. The authoritative roster list (hero_name, role, lanes). |
| `data/mlbb_master.db` | SQLite database | ❌ NOT for match/draft | `heroes` table seeded (132). `ai_request_logs` active. Match/draft/team/tournament tables EMPTY. |
| `scripts/validate-data.ts` | Read-only data health check | n/a (tooling) | Run via `npm run validate:data`. Never writes. |

---

## 3. Data Flow

```
┌─────────────────────────────────────────────────────────┐
│  JSON MATCH DATA                                          │
│  data/mpl_id_s17_regular_season.json (primary)           │
│  data/regular_matches.json + data/matches.json (merged)  │
└───────────────────────────┬─────────────────────────────┘
                            │ read + merge + dedupe
                            ▼
┌─────────────────────────────────────────────────────────┐
│  MatchHistoryService                                     │
│  - loads + normalizes match data                         │
│  - getTeamMatches(teamId, filters)                       │
│  - single access point for all match queries             │
└───────────────────────────┬─────────────────────────────┘
                            │
        ┌───────────────────┼────────────────────┐
        ▼                   ▼                    ▼
┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ TeamIdentity │  │ MatchupProfile   │  │ DraftPattern     │
│ Engine       │  │ Engine           │  │ Engine           │
│ (comfort,    │  │ (head-to-head)   │  │ (sequencing)     │
│  priority)   │  │                  │  │                  │
└──────┬───────┘  └────────┬─────────┘  └────────┬─────────┘
       └───────────────────┼─────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Draft Recommendation / Analysis Endpoints (server.ts)   │
│  - POST /api/draft/recommendation  (local engine)        │
│  - POST /api/ai/draft-analysis     (local + AI narration)│
│  LOCAL ENGINE = SOURCE OF TRUTH for all numbers          │
└───────────────────────────┬─────────────────────────────┘
                            │ structured local data only
                            ▼
┌─────────────────────────────────────────────────────────┐
│  AI Narration Layer (aiProviderRouter)                   │
│  - Wafer (primary, production)                           │
│  - TokenPlan/Mimo (fallback)                             │
│  - Local template (final fallback)                       │
│  AI ONLY explains data — never invents numbers           │
└─────────────────────────────────────────────────────────┘
```

**Key principle:** The local engine is the brain (source of truth). AI is the mouth
(explanation only). AI never decides hero recommendations or fabricates statistics.

---

## 4. Important Rules for Future Development

1. **Do NOT migrate match/draft analytics to SQLite** unless a migration plan is
   explicitly requested and approved. The JSON-first architecture is intentional and stable.
2. **Do NOT let AI invent win rate, pick rate, or match stats.** Every number shown to a
   user must originate from the local engine payload or validated JSON data.
3. **Any numeric stat shown by AI must come from the local engine payload** or validated
   data — never from the AI model's own "knowledge."
4. **Keep match-level and game-level data separate.** A series (match) contains multiple
   games. Do not flatten them into a single record.
5. **BO3/BO5 series must contain multiple games.** Series-level winner and game-level
   winner are distinct and must be stored separately.
6. **Picks/bans must always be linked to a specific game** (not just a series). Each game
   has its own bluePicks, redPicks, blueBans, redBans, and blue/red side assignment.
7. **Run `npm run validate:data`** after adding or changing any data.
8. **If validation fails (exit code 1), do NOT deploy.** Fix the data first.

---

## 5. Current Known Limitations

1. **SQLite match/draft/team/tournament tables are EMPTY.** The schema exists but is not
   populated. Code that reads draft analytics does NOT use these tables. Do not assume
   they contain data.
2. **Hero names in match data are string-based**, not relational hero IDs. Matching is
   done case-insensitively by name. A future normalization to hero IDs is possible but
   must be carefully planned to avoid breaking name-based lookups.
3. **Multiple overlapping match JSON formats exist** (`mpl_id_s17_regular_season.json`,
   `regular_matches.json`, `matches.json`). `MatchHistoryService` merges and deduplicates
   them. Future cleanup should consolidate carefully without losing data.
4. **No user billing / paywall / subscription system is confirmed.** In this codebase,
   "premium" refers to an **AI model tier** (e.g., Qwen3.5-397B / mimo-v2.5-pro used only
   for manual deep analysis) — NOT a paid user tier. Do not assume payment logic exists
   unless proven by a future audit.

---

## 6. Safe Next Steps

- Add **schema documentation** for the SQLite tables if/when they get populated.
- Add a **data importer** later — only after an explicit migration plan is approved.
- Add **more validation checks** before adding more tournaments or seasons.
- **Keep the JSON-first architecture stable** for now. It works, it's validated, and the
  draft engine depends on it.

---

*Last updated: Step 3C data architecture documentation. Validation passing with 0 errors,
0 warnings (132 heroes, 72 series, 174 games, 9 teams).*
