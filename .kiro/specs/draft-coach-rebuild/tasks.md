# Implementation Plan: MLBB Draft Coach Rebuild

## Overview

Rebuild the Draft Simulator into a data-driven Draft Coach with lane resolution, multi-factor scoring, and AI analysis. Changes are organized by dependency: types first, then engines, then server endpoints, then UI integration. Verification via `npm run build`.

## Tasks

- [x] 1. Create draft types module
  - [x] 1.1 Create `src/draft/draftTypes.ts` with all TypeScript interfaces
    - Define `DraftMode` type: `"mpl" | "ranked"`
    - Define `DraftSide` type: `"BLUE" | "RED"`
    - Define `DraftActionType` type: `"BAN" | "PICK"`
    - Define `DraftPhase` type: `"BANS_1" | "PICKS_1" | "BANS_2" | "PICKS_2" | "COMPLETED"`
    - Define `Lane` type: `"Gold" | "EXP" | "Mid" | "Jungle" | "Roam"`
    - Define `LaneStatus` interface: `{ gold: string|null, exp: string|null, mid: string|null, jungle: string|null, roam: string|null }`
    - Define `ScoreBreakdown` interface: `{ laneFit: number, roleBalance: number, counter: number, synergy: number, meta: number, draftPhase: number, denyPick: number, flexValue: number }`
    - Define `DraftRecommendation` interface: `{ heroName: string, totalScore: number, scoreBreakdown: ScoreBreakdown, lane: string, role: string, reason: string, tags: string[] }`
    - Define `DraftRequestPayload` interface: `{ bluePicks: string[], redPicks: string[], blueBans: string[], redBans: string[], currentPhase: string, currentTurnSide: string, mode: DraftMode, blueTeam?: string, redTeam?: string }`
    - Define `TeamProfile` interface: `{ key: string, name: string, logo: string, signatureHeroes: string[], preferredStyle: string[] }`
    - _Requirements: 1, 2, 3, 5_

- [x] 2. Create lane resolution engine
  - [x] 2.1 Create `src/draft/laneResolver.ts`
    - Export function `resolveLanes(picks: string[], heroesMaster: any[]): LaneStatus`
    - For each picked hero, find their entry in heroes_master.json
    - Assign to primary lane (first entry in `lanes` array)
    - If lane already taken, try `flex_lanes` alternatives
    - If no lane available, mark as "flex" or "conflict"
    - Return `LaneStatus` object showing which lane each hero fills
    - _Requirements: 2_

- [x] 3. Create scoring engine
  - [x] 3.1 Create `src/draft/draftScoringEngine.ts`
    - Export function `scoreHero(heroSlug: string, context: ScoringContext): ScoreBreakdown`
    - Define `ScoringContext` interface containing: currentPicks (ally), enemyPicks, currentBans, enemyBans, laneStatus, mode, heroDatabase (all hero JSONs with AI metadata)
    - Implement `calcLaneFit`: 20 points if hero fills an empty lane, 5 if flex lane, 0 if all lanes full
    - Implement `calcRoleBalance`: 15 points if team lacks this role type, 5 if already has it
    - Implement `calcCounter`: Compare hero's `counterTags` against enemy picks' `synergyTags` and `playstyleTags`. Higher overlap = higher score (0-18)
    - Implement `calcSynergy`: Compare hero's `synergyTags` against ally picks' `playstyleTags` and `macroTags`. Higher overlap = higher score (0-15)
    - Implement `calcMeta`: Use hero's `metaTier` field (S=12, A=9, B=6, C=3, D=0)
    - Implement `calcDraftPhase`: Early picks reward flex heroes, late picks reward specific counters (0-8)
    - Implement `calcDenyPick`: If hero has high meta tier and enemy lacks that role, score higher (0-7)
    - Implement `calcFlexValue`: Count hero's lanes array length. More lanes = higher score (0-5)
    - Return `ScoreBreakdown` with all factor values
    - Export function `calculateTotalScore(breakdown: ScoreBreakdown): number` that sums all factors
    - _Requirements: 3_

- [x] 4. Create recommendation engine
  - [x] 4.1 Create `src/draft/draftRecommendationEngine.ts`
    - Export function `generateRecommendations(payload: DraftRequestPayload, heroDatabase: any[], heroesMaster: any[]): DraftRecommendation[]`
    - Filter out all banned and picked heroes from candidates
    - For each available hero, calculate score using `scoreHero`
    - Sort by total score descending
    - Return top 3 recommendations with full score breakdowns
    - Generate `reason` string from top scoring factor (e.g., "Mengisi Gold Lane yang kosong", "Counter terhadap assassin musuh")
    - Include hero's draftTags as `tags` field
    - _Requirements: 3, 4, 6_

- [x] 5. Add server endpoints for Draft Coach
  - [x] 5.1 Add `GET /api/draft/teams` endpoint to server.ts
    - Read team data from existing TEAM_LOGOS and match history
    - Return array of `{ key, name, logo }` for available MPL teams
    - _Requirements: 5_

  - [x] 5.2 Add `POST /api/draft/recommendation` endpoint to server.ts
    - Accept `DraftRequestPayload` body
    - Load heroes_master.json and all hero JSON files (with AI metadata)
    - Run lane resolution on current picks
    - Run recommendation engine
    - Return `{ recommendations: DraftRecommendation[], laneStatus: LaneStatus }`
    - Filter: never return heroes already banned or picked
    - _Requirements: 3, 4, 5_

  - [x] 5.3 Add `POST /api/draft/final-analysis` endpoint to server.ts
    - Accept `{ bluePicks, redPicks, blueBans, redBans, mode }`
    - Build structured prompt with team compositions, hero metadata (draftTags, counterTags, synergyTags, macroTags, powerSpikeTags)
    - Call Gemini AI (gemini-2.0-flash) for strategic analysis
    - Return `{ analysis: string }` as markdown
    - Include fallback analysis if AI unavailable
    - _Requirements: 8_

- [x] 6. Update DraftSimulator UI
  - [x] 6.1 Add mode selection screen to DraftSimulator.tsx
    - Replace current simple start screen with mode selection
    - Show two cards: "MPL Mode" (with team icon) and "Ranked Mode" (with ranked icon)
    - MPL Mode: show team dropdowns for Blue and Red teams from `/api/draft/teams`
    - Ranked Mode: proceed directly to draft
    - Persist selected mode and teams in component state
    - _Requirements: 1_

  - [x] 6.2 Add lane status display to draft panels
    - Show lane composition indicators for both Blue and Red teams
    - Display 5 lane slots (Gold, EXP, Mid, Jungle, Roam) with hero icons when filled
    - Highlight unfilled lanes in yellow/warning when 3+ picks made
    - Fetch lane status from recommendation endpoint response
    - _Requirements: 2, 7_

  - [x] 6.3 Replace AI Coach button with auto-recommendation panel
    - On each draft step, automatically fetch recommendations from `POST /api/draft/recommendation`
    - Display 3 recommendation cards in the sidebar panel
    - Each card shows: hero image, name, total score (as percentage bar), lane badge, role badge
    - Each card shows top 3 score factors as small labeled bars
    - Each card shows strategic reason text
    - Clicking a recommendation card selects that hero
    - _Requirements: 3, 6_

  - [x] 6.4 Update final analysis to use new endpoint
    - Replace current `/api/draft/evaluate` call with `/api/draft/final-analysis`
    - Pass mode and team info in request
    - Display analysis with lane composition summary
    - _Requirements: 8_

- [x] 7. Build verification
  - [x] 7.1 Run `npm run build` and verify zero errors
    - Ensure all new files compile cleanly
    - Verify no TypeScript errors
    - Confirm hero count remains 132 (no data modifications)
    - _Requirements: all_

## Notes

- No property-based tests (design explicitly states PBT not applicable)
- Verification via TypeScript compilation and runtime testing
- All UI text in Indonesian to match existing codebase
- No new dependencies introduced
- Hero data files are READ-ONLY — scoring reads but never modifies hero JSONs
- Server runs on port 3001
- Uses Tailwind CSS v4 and motion/react (Framer Motion v12)
- Uses @google/genai with "gemini-2.0-flash" model
