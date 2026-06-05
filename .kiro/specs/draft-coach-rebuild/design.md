# Design Document

## Architecture Overview

The Draft Coach rebuild adds a new `src/draft/` module containing the core engines (lane resolution, scoring, recommendation), new server endpoints, and updates to the existing DraftSimulator.tsx component. The design is additive — existing draft flow mechanics (20-step sequence, timer, lock) are preserved and enhanced.

## Module Structure

```
src/draft/
├── draftTypes.ts              — All TypeScript types/interfaces
├── laneResolver.ts            — Lane assignment logic
├── draftScoringEngine.ts      — Multi-factor scoring calculations
├── draftRecommendationEngine.ts — Top-N recommendation generation
└── draftAnalysisEngine.ts     — Final analysis generation helpers
```

## Key Design Decisions

1. **Server-side scoring**: Recommendation computation runs on the server where full hero database (132 heroes with AI metadata) is accessible. Frontend sends draft state, receives scored recommendations.

2. **Lane resolution uses heroes_master.json**: The `lanes` and `flex_lanes` fields in heroes_master.json provide ground truth for lane assignment. Conflicts resolved by flex_lanes priority.

3. **Scoring weights are configurable**: Each scoring factor has a weight that can be tuned. Initial weights: LaneFit=20, Counter=18, Synergy=15, RoleBalance=15, Meta=12, DraftPhase=8, DenyPick=7, FlexValue=5 (total=100).

4. **AI Knowledge Layer as scoring input**: counterTags, synergyTags, draftTags, macroTags from hero JSONs drive Counter and Synergy scores via tag matching.

5. **No fabricated data**: If MPL team data is unavailable, show "Data belum tersedia". Never invent statistics.

6. **Hero count immutable**: The system reads from existing hero data. No hero additions or removals (must remain 132).

## Data Flow

```
User selects mode → Frontend sends POST /api/draft/recommendation
  → Server loads hero database + AI metadata
  → Server runs LaneResolver on current picks
  → Server runs ScoringEngine on available heroes
  → Server returns top 3 recommendations with scores
  → Frontend displays recommendation cards

Draft complete → Frontend sends POST /api/draft/final-analysis  
  → Server builds team composition analysis
  → Server calls Gemini AI with structured prompt + hero metadata
  → Server returns markdown analysis
  → Frontend renders analysis
```

## API Contracts

### GET /api/draft/teams
Response: `{ teams: Array<{ key: string, name: string, logo: string }> }`

### POST /api/draft/recommendation
Request: `{ draftState: DraftState, mode: "mpl"|"ranked", blueTeam?: string, redTeam?: string }`
Response: `{ recommendations: Array<DraftRecommendation>, laneStatus: LaneStatus }`

### POST /api/draft/final-analysis
Request: `{ bluePicks: string[], redPicks: string[], blueBans: string[], redBans: string[], mode: "mpl"|"ranked" }`
Response: `{ analysis: string }`

## UI Changes

The DraftSimulator.tsx component gains:
- Mode selection screen (replaces current simple start screen)
- Lane status indicators on both team panels
- Enhanced recommendation panel (replaces current AI coach button)
- Score breakdown on recommendation cards
- Auto-fetching recommendations on each draft step

## PBT Applicability

Property-based testing is not applicable for this feature. The scoring engine has well-defined inputs/outputs but the recommendation quality is subjective. Verification is via TypeScript compilation and manual testing.
