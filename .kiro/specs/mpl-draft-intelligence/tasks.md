# Implementation Plan: MPL Draft Intelligence Engine

## Overview

Transform the generic draft recommendation system into a team-history-driven intelligence platform. Priority: fix the core bug where MPL recommendations use global meta instead of team matchup data. Implementation uses TypeScript throughout, matching the existing codebase.

## Tasks

- [x] 1. Core Engine Foundation (CRITICAL PATH)
  - [x] 1.1 Add MPL interfaces to draftTypes.ts
    - Add `TeamIdentityProfile`, `HeroPickStats`, `ComfortHero`, `PickPreference`, `SignatureComposition`, `HeroPairing`, `TargetBanProfile`, `DraftTendency`, `HeroSuccessEntry`, `ContestedHeroEntry`, `PriorityBanEntry` interfaces
    - Add `DraftPatternProfile` interface with firstPickTendencies, banSequences, heroSequencing, draftAvoidances
    - Add `MatchupProfile` interface with head-to-head stats, matchup-specific comfort heroes and bans, series record
    - Add `MplScoreBreakdown` interface with teamHistory(30), headToHead(25), draftPattern(20), teamComfort(15), teamDeny(10), meta(≈0)
    - Add `MplDraftRecommendation` interface with pickType, banType, evidence, pivotPrediction, fallbackBranch
    - Add `PivotPrediction`, `PoolCollapseResult`, `LanePrediction`, `DraftAnalysisResult`, `GeminiValidationResult` interfaces
    - Add `MplScoringContext` interface extending ScoringContext with team identity and matchup data
    - _Requirements: 1.1–1.15, 2.1–2.6, 3.1–3.8, 9.1–9.10_

  - [x] 1.2 Create teamIdentityEngine.ts — buildTeamIdentity()
    - Create `src/draft/teamIdentityEngine.ts`
    - Implement `buildTeamIdentity(teamId: string, matchHistoryService: MatchHistoryService): TeamIdentityProfile`
    - Iterate all series/games from `matchHistoryService.getTeamMatches(teamId, {})` to compute per-hero pickCount, winCount, lossCount, winRate
    - Compute ban statistics: banCount (team's bans), banAgainstCount (opponent bans against this team)
    - Derive comfort heroes (top 5 picked ≥3 times, WR >50%)
    - Derive first/second pick preferences from pick position frequency
    - Detect signature compositions (hero pairs appearing together ≥3 games, WR >50%)
    - Detect hero pairings (pairs drafted together ≥2 games)
    - Compute target ban profiles per opponent
    - Classify draft tendencies (early_aggression, scaling, flex_first, objective_control, split_push)
    - Derive most successful heroes (top 5 by WR, min 2 games), most contested heroes (top 5 by pick+ban frequency)
    - Derive priority bans (top 5 most frequently banned by team)
    - Compute side stats (blue/red games, wins, winRate) and overall team stats (totalGames, wins, losses, winRate)
    - All data derived exclusively through MatchHistoryService
    - _Requirements: 1.1–1.15, 9.8_

  - [x] 1.3 Create matchupProfileEngine.ts — buildMatchupProfile()
    - Create `src/draft/matchupProfileEngine.ts`
    - Implement `buildMatchupProfile(teamId: string, opponentId: string, matchHistoryService: MatchHistoryService): MatchupProfile`
    - Call `matchHistoryService.getTeamMatches(teamId, { opponent: opponentId })` to filter head-to-head series
    - Compute headToHeadGames, teamSeriesWins, opponentSeriesWins, teamGameWins, opponentGameWins, headToHeadWinRate
    - Identify matchup-specific comfort heroes (picked vs this opponent with WR >50%)
    - Identify matchup-specific priority bans (most banned when facing this opponent)
    - Build seriesRecord with dates and results
    - Return empty matchup profile (headToHeadGames: 0) when no head-to-head games exist
    - _Requirements: 2.1–2.6_

  - [x] 1.4 Add scoreMplHero() to draftScoringEngine.ts
    - Add new function `scoreMplHero(heroSlug: string, context: MplScoringContext): MplScoreBreakdown`
    - Implement teamHistory factor (30 pts max): team's winRate with this hero × 30
    - Implement headToHead factor (25 pts max): H2H-specific winRate × 25
    - Implement draftPattern factor (20 pts max): sequence alignment score × 20
    - Implement teamComfort factor (15 pts): 15 if hero is in ally comfort list
    - Implement teamDeny factor (10 pts): 10 if hero is in enemy comfort list
    - Implement meta factor (≈0): only 0.01 × metaTier as tiebreaker
    - Add `calculateMplTotalScore(breakdown: MplScoreBreakdown): number`
    - Leave existing `scoreHero()` and `calculateTotalScore()` completely untouched for ranked mode
    - _Requirements: 3.1–3.8, 9.1–9.4_

  - [x] 1.5 Create generateMplRecommendations() in draftRecommendationEngine.ts
    - Add new exported function `generateMplRecommendations(payload, heroDatabase, heroesMaster, blueIdentity, redIdentity, matchupProfile, draftPatterns): MplDraftRecommendation[]`
    - Determine ally/enemy identity based on currentTurnSide
    - Filter unavailable heroes (banned + picked)
    - Score all available heroes using `scoreMplHero()` with team context
    - For ban phase: prioritize enemy comfort heroes and signature compositions, classify each ban (Comfort Ban, Target Ban, Meta Ban, Deny Ban, Noise Ban), include at least one Noise Ban
    - For pick phase: classify picks (Comfort Pick, Signature Pick, Flex Pick, Counter Pick, Deny Pick)
    - Include evidence data (pickCount, winRate, source reference) for each recommendation
    - Include fallback branch (alternative hero if primary unavailable)
    - Generate Indonesian-language reason referencing team data
    - Return top 3 recommendations sorted by MPL total score
    - Leave existing `generateRecommendations()` untouched for ranked mode
    - _Requirements: 3.1–3.8, 5.1–5.6, 6.1–6.6, 9.1–9.5_

  - [x] 1.6 Modify POST /api/draft/recommendation in server.ts for MPL routing
    - In the existing `/api/draft/recommendation` handler, detect when `mode === "mpl"` AND `blueTeam` AND `redTeam` are present in payload
    - When MPL conditions met: call `matchHistoryService.getTeamMatches()` → `buildTeamIdentity()` for both teams → `buildMatchupProfile()` → `generateMplRecommendations()`
    - Return MPL recommendations with evidence, pickType/banType, and pivot predictions
    - When conditions NOT met (ranked mode or no teams): continue using existing `generateRecommendations()` unchanged
    - Import new engine modules at top of server.ts
    - _Requirements: 3.5–3.8, 9.1–9.5_

  - [x] 1.7 Verify build — npx tsc --noEmit and npm run build
    - Run `npx tsc --noEmit` to verify no type errors
    - Run `npm run build` to verify full build passes
    - Fix any import/export issues between new modules
    - _Requirements: 9.10_

- [ ]* 1.8 Write property tests for Team Identity Engine
  - **Property 1: Hero pick statistics are mathematically consistent**
  - **Property 3: Filtered top-N lists satisfy their criteria**
  - **Property 6: Side statistics are consistent with game outcomes**
  - **Validates: Requirements 1.1, 1.3, 1.6, 1.11, 1.13, 1.14**

- [ ]* 1.9 Write property tests for MPL scoring
  - **Property 8: MPL scoring assigns zero or negligible meta weight when team data exists**
  - **Property 9: Ranked scoring contains no team-based factors**
  - **Property 10: All recommendations only include available heroes**
  - **Validates: Requirements 3.5, 3.6, 3.8, 6.6, 9.1, 9.2, 9.4**

- [ ] 2. Draft Pattern + Availability Tree
  - [x] 2.1 Create draftPatternEngine.ts
    - Create `src/draft/draftPatternEngine.ts`
    - Implement `buildDraftPatterns(teamId: string, matchHistoryService: MatchHistoryService): DraftPatternProfile`
    - Compute first pick tendencies (hero frequency at position 1 with winRate)
    - Compute ban sequencing patterns (ban1→ban2→ban3 common sequences)
    - Compute hero sequencing (after hero X, team picks hero Y — transition map with counts/frequency)
    - Identify draft avoidances (meta tier S/A heroes with 0 picks or <1% of total games)
    - Implement `getSequenceAlignment(heroCandidate: string, currentPicks: string[], patterns: DraftPatternProfile): number` returning 0-1 alignment score
    - All data derived exclusively through MatchHistoryService
    - _Requirements: 10.1–10.7_

  - [ ] 2.2 Create heroAvailabilityTree.ts
    - Create `src/draft/heroAvailabilityTree.ts`
    - Implement `computePivotPredictions(bannedHero, enemyIdentity, currentBans, matchHistoryService): PivotPrediction`
    - Find the role/lane the banned hero fills for enemy team
    - From enemy pick history, find alternative heroes for same role/lane ranked by pickCount and winRate
    - Assign confidence: high (alternatives with pickCount ≥2), medium, low (no clear alternatives)
    - Model 2 steps ahead: if pivot hero also banned, what remains for that role
    - Implement `computePoolCollapse(allBans, enemyIdentity): PoolCollapseResult`
    - Remove banned heroes from enemy's historical pool, compute remaining options per role
    - Flag roles with <2 remaining options as "collapsed" (critical severity)
    - _Requirements: 12.1–12.7_

  - [ ] 2.3 Integrate pattern and tree into MPL recommendations
    - Update `generateMplRecommendations()` to accept and use `DraftPatternProfile` for draftPattern scoring factor
    - Call `getSequenceAlignment()` to compute alignment score for each hero candidate
    - Add pivot prediction text ("Jika di-ban: musuh kemungkinan beralih ke...") to ban recommendations using `computePivotPredictions()`
    - Reference historical draft patterns in recommendation reason text
    - Update server.ts MPL route to call `buildDraftPatterns()` and pass to recommendations
    - _Requirements: 5.7, 10.5, 10.6, 12.4_

  - [ ] 2.4 Verify build after Phase 2
    - Run `npx tsc --noEmit` and `npm run build`
    - Ensure all new modules are properly imported and exported
    - _Requirements: 9.10_

- [ ]* 2.5 Write property tests for Draft Pattern Engine
  - **Property 13: Draft pattern hero sequencing counts match actual transitions**
  - **Property 14: Draft avoidances are heroes in meta pool with zero or near-zero picks**
  - **Validates: Requirements 10.3, 10.4**

- [ ] 3. UI + Pre-Draft + Analysis
  - [ ] 3.1 Create GET /api/draft/pre-draft/:blueTeam/:redTeam endpoint in server.ts
    - Add new endpoint that calls `buildTeamIdentity()` for both teams and `buildMatchupProfile()`
    - Return combined JSON: each team's comfort heroes, priority bans, signature compositions, side preference, draft tendencies, recent form (last 5 series WR), head-to-head summary with full record
    - Return fallback message "Data spesifik team belum tersedia. Menggunakan fallback meta." when no team data
    - _Requirements: 4.1–4.9_

  - [ ] 3.2 Create PreDraftPanel.tsx component
    - Create `src/components/PreDraftPanel.tsx`
    - Accept props: blueTeamId, redTeamId, blueIdentity, redIdentity, matchupProfile, heroAssets
    - Display top 5 comfort heroes per team with pickCount and winRate
    - Display top priority bans per team
    - Display head-to-head summary (total games, series wins, full record with dates)
    - Display signature compositions per team (game count, winRate)
    - Display recent form (last 5 series winRate)
    - Display side preference (blue/red winRates)
    - Display draft tendency classification per team
    - Show fallback message when no data available
    - All labels in Bahasa Indonesia
    - _Requirements: 4.1–4.9_

  - [ ] 3.3 Create pickSequenceIntelligence.ts
    - Create `src/draft/pickSequenceIntelligence.ts`
    - Implement `predictLanes(teamId, currentPicks, teamIdentity, matchHistoryService): LanePrediction[] | null`
    - Return `null` if currentPicks.length < 3
    - For each picked hero: check team's historical lane assignments, fall back to hero default lanes
    - Produce probabilistic lane predictions (e.g., "Harith → Mid 85%, Gold 15%")
    - Do NOT assume pick order = lane order
    - Update probability distributions when new picks added (composition constraint)
    - _Requirements: 11.1–11.7_

  - [ ] 3.4 Create draftAnalysisEngine.ts + POST /api/draft/analysis endpoint
    - Create `src/draft/draftAnalysisEngine.ts`
    - Implement `generateDraftAnalysis(bluePicks, redPicks, blueBans, redBans, blueIdentity, redIdentity, matchupProfile, heroDatabase, heroesMaster): DraftAnalysisResult`
    - Compute: Team Comfort Score, Draft Execution Score, Signature Pick Usage, Comfort Hero Success Rate, Head-to-Head Impact, Ban Efficiency, Draft Risk Analysis (quantified with historical WR), Power Spike Timeline, Lane Assignment, Win Condition, Evidence Source
    - All text in Bahasa Indonesia
    - Add `POST /api/draft/analysis` endpoint in server.ts that accepts full draft state + team IDs, builds identities, calls engine, returns structured JSON
    - Pass structured JSON to Gemini for language enhancement only (preserve all numbers/hero names)
    - Fall back to local structured analysis if Gemini fails
    - _Requirements: 7.1–7.13_

  - [ ] 3.5 Create geminiGuard.ts
    - Create `src/draft/geminiGuard.ts`
    - Implement `validateGeminiOutput(geminiResponse, localAnalysis, unavailableHeroes): GeminiValidationResult`
    - Validate: no references to unavailable heroes, no differing statistics, no absent hero recommendations
    - If any check fails: discard Gemini response, use local engine data
    - Only pass structured JSON to Gemini (prevent raw data access)
    - _Requirements: 8.1–8.5_

  - [ ] 3.6 Update DraftSimulator.tsx — integrate PreDraftPanel and structured analysis
    - Import and render PreDraftPanel after team selection, before first ban
    - When draft completes in MPL mode: call `/api/draft/analysis`, render structured dashboard
    - Display analysis sections with data tables and metrics instead of plain text
    - _Requirements: 4.1–4.9, 7.1–7.13_

  - [ ] 3.7 Verify build after Phase 3
    - Run `npx tsc --noEmit` and `npm run build`
    - Ensure all new components and endpoints compile cleanly
    - _Requirements: 9.10_

- [ ]* 3.8 Write property tests for analysis and recommendations
  - **Property 11: Every MPL recommendation has valid type classification and evidence**
  - **Property 12: Ban recommendations include at least one noise ban**
  - **Validates: Requirements 5.2, 5.3, 5.4, 6.2, 6.3**

- [ ] 4. Final Verification
  - [ ] 4.1 Verify Ranked mode unchanged, hero count 132, full build passes
    - Confirm existing `scoreHero()` and `generateRecommendations()` are untouched
    - Verify `heroes_master.json` still has 132 heroes
    - Verify no hero JSON files in `data/heroes/` are modified
    - Run full `npm run build` successfully
    - Test that ranked mode recommendations use only meta-based scoring (no team identity factors)
    - _Requirements: 9.2, 9.5, 9.6, 9.7, 9.10_

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Phase 1 (tasks 1.1–1.7) is the CRITICAL PATH that fixes the core bug: MPL recommendations using global meta instead of team-specific data
- Each task references specific requirements for traceability
- All user-facing text must be in Bahasa Indonesia
- Existing ranked mode scoring logic (`scoreHero`, `calculateTotalScore`, `generateRecommendations`) must remain completely untouched
- The 132-hero dataset and individual hero JSON files must never be modified
- All team statistics derived exclusively through MatchHistoryService — no fabrication

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4", "2.1"] },
    { "id": 3, "tasks": ["1.5", "2.2"] },
    { "id": 4, "tasks": ["1.6", "2.3"] },
    { "id": 5, "tasks": ["1.7", "2.4"] },
    { "id": 6, "tasks": ["1.8", "1.9", "2.5"] },
    { "id": 7, "tasks": ["3.1", "3.3", "3.5"] },
    { "id": 8, "tasks": ["3.2", "3.4"] },
    { "id": 9, "tasks": ["3.6"] },
    { "id": 10, "tasks": ["3.7", "3.8"] },
    { "id": 11, "tasks": ["4.1"] }
  ]
}
```
