# Implementation Plan: Team Analytics Match History

## Overview

Fix the broken Match History tab by implementing a server-side `MatchHistoryService` that groups flat game entries into proper series, merges with existing structured data, deduplicates, and exposes a filtered API endpoint. Update the frontend to consume the new endpoint and render expandable series cards.

## Tasks

- [x] 1. Create data models and service foundation
  - [x] 1.1 Create `src/services/matchHistoryService.ts` with SeriesMatch, Game, MatchHistoryResponse, MatchHistoryFilters, SourceFormatBEntry, and SourceFormatAEntry interfaces
    - Define all TypeScript interfaces as specified in the design document
    - Export the MatchHistoryService class skeleton with method signatures
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 3.7, 3.8_

  - [x] 1.2 Implement the `splitDraft` method
    - Takes a 10-element string array, returns `{ picks: string[], bans: string[] }` where picks = first 5, bans = last 5
    - Handle edge case: if array has fewer than 10 elements, pad with empty strings
    - _Requirements: 1.5, 1.6_

  - [x]* 1.3 Write property test for draft splitting (Property 5)
    - **Property 5: Draft splitting produces correct picks and bans**
    - **Validates: Requirements 1.5, 1.6**

  - [x] 1.4 Implement the `determineFormat` method
    - 2-3 games → "BO3", 4-5 games → "BO5"
    - Handle edge: 1 game → "BO3" (single game treated as BO3 minimum)
    - _Requirements: 6.1_

  - [x]* 1.5 Write property test for format assignment (Property 12)
    - **Property 12: Format assignment matches game count**
    - **Validates: Requirements 6.1**

  - [x] 1.6 Implement the `determineSeriesWinner` method
    - Count wins for each team across games array
    - Return winner (majority), loser, teamAScore, teamBScore
    - _Requirements: 1.3, 1.4_

  - [x]* 1.7 Write property tests for series winner and score (Properties 3, 4)
    - **Property 3: Series winner has majority of game wins**
    - **Property 4: Series score matches game win counts**
    - **Validates: Requirements 1.3, 1.4**

- [x] 2. Implement grouping algorithm
  - [x] 2.1 Implement `groupGamesIntoSeries` method
    - Normalize team names using existing `normalizeTeamName`
    - Create grouping key from sorted normalized team names + date
    - Group entries preserving source order
    - For each group: assign sequential game numbers, determine winner, compute score, assign format
    - Handle overflow: groups > 5 games split into multiple series
    - Generate unique series ID using crypto hash of date+teams+gameIndex
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.1, 6.2, 6.3_

  - [x]* 2.2 Write property tests for grouping (Properties 1, 2, 13)
    - **Property 1: Grouping preserves all games**
    - **Property 2: Game numbers are sequential within each series**
    - **Property 13: Overflow groups are split into valid series**
    - **Validates: Requirements 1.1, 1.2, 6.2, 6.3**

  - [x] 2.3 Implement `convertSourceA` method
    - Convert regular_matches.json entries to SeriesMatch format
    - Map blueTeam/redTeam to teamA/teamB, parse score, extract game data
    - Normalize team names
    - _Requirements: 2.1_

- [x] 3. Implement merging, deduplication, and filtering
  - [x] 3.1 Implement `mergeAndDeduplicate` method
    - Combine series from both sources into one list
    - Compute dedup key: sorted normalized teams + date + game count
    - Remove duplicates (keep first occurrence)
    - Sort by date descending
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x]* 3.2 Write property tests for merge/dedup (Properties 6, 7, 8)
    - **Property 6: Deduplication removes exact duplicates only**
    - **Property 7: Team name normalization is idempotent**
    - **Property 8: Output is sorted by date descending**
    - **Validates: Requirements 2.2, 2.3, 2.4**

  - [x] 3.3 Implement `getTeamMatches` method with filter logic
    - Filter unified series list by teamId (teamA or teamB matches)
    - Apply result filter: "win" → winner == teamId, "lose" → loser == teamId, "all" → no filter
    - Apply optional tournament, patch, opponent filters
    - Compute response stats: totalMatches, filteredMatches, wins, losses, winrate, gamesCount
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3_

  - [x]* 3.4 Write property tests for filtering (Properties 9, 10, 11)
    - **Property 9: Win filter returns only series where team is winner**
    - **Property 10: Lose filter returns only series where team is loser**
    - **Property 11: All filter returns all series involving the team**
    - **Validates: Requirements 3.3, 3.4, 3.5, 4.1, 4.2**

  - [x] 3.5 Implement `loadData` method
    - Read both JSON files using safeJson pattern from server.ts
    - Call groupGamesIntoSeries for Source B
    - Call convertSourceA for Source A
    - Call mergeAndDeduplicate to produce final allSeries
    - _Requirements: 2.1, 2.2_

- [x] 4. Checkpoint - Verify service logic
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Create API endpoint
  - [x] 5.1 Register the new Express route in server.ts
    - Instantiate MatchHistoryService on server startup (singleton, data loaded once)
    - Add `GET /api/team-analytics/:teamId/matches` route
    - Parse query params (result, tournament, patch, opponent)
    - Call `service.getTeamMatches(teamId, filters)` and return JSON response
    - _Requirements: 3.1, 3.2, 3.6_

  - [x]* 5.2 Write integration test for API endpoint
    - Test endpoint returns correct shape with real data files
    - Test each filter parameter
    - Test invalid teamId returns empty response
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 6. Update frontend TeamAnalytics component
  - [x] 6.1 Create a new hook `useTeamMatchHistory` in `src/hooks/useTeamMatchHistory.ts`
    - Accept teamId and filters as parameters
    - Fetch from `/api/team-analytics/${teamId}/matches` with query params
    - Return loading state, error state, and MatchHistoryResponse data
    - _Requirements: 5.1_

  - [x] 6.2 Create `MatchSeriesCard` component in `src/components/MatchSeriesCard.tsx`
    - Render series header: teams, score, date, tournament, win/lose badge
    - Expandable section with game details (Game 1, Game 2, Game 3)
    - Each game shows: game number, winner, duration, picks/bans for both teams with hero images
    - Use existing `FallbackImage` and `getHeroImageUrl` utilities
    - _Requirements: 5.2, 5.3_

  - [x] 6.3 Update Match History tab in TeamAnalytics.tsx
    - Remove old dual-fetch logic (`/api/matches` + `/api/history`)
    - Remove client-side merging and grouping code
    - Use `useTeamMatchHistory` hook with selected team and filter state
    - Render filter controls (All/Win/Lose buttons) that update query params
    - Render list of `MatchSeriesCard` components from API response
    - Show loading skeleton during fetch, empty state when no results
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 6.4 Move debug information to dev-only collapsible panel
    - Wrap debug text (match counts, filter counts) in a panel that only renders when `import.meta.env.DEV` is true
    - Add collapse/expand toggle for the debug panel
    - Remove debug text from the main match history display area
    - _Requirements: 7.1, 7.2_

- [x] 7. Checkpoint - Full integration verification
  - Ensure all tests pass, ask the user if questions arise.
  - Verify: `npm run lint` passes (tsc --noEmit)
  - Verify: `npm run build` passes (vite build + esbuild server.ts)

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": ["1"],
      "description": "Create data models, interfaces, and core utility methods (splitDraft, determineFormat, determineSeriesWinner)"
    },
    {
      "wave": 2,
      "tasks": ["2"],
      "description": "Implement grouping algorithm and Source A conversion"
    },
    {
      "wave": 3,
      "tasks": ["3"],
      "description": "Implement merging, deduplication, filtering, and data loading"
    },
    {
      "wave": 4,
      "tasks": ["4"],
      "description": "Checkpoint - verify service logic and all property tests pass"
    },
    {
      "wave": 5,
      "tasks": ["5"],
      "description": "Create API endpoint in server.ts"
    },
    {
      "wave": 6,
      "tasks": ["6"],
      "description": "Update frontend TeamAnalytics component and create MatchSeriesCard"
    },
    {
      "wave": 7,
      "tasks": ["7"],
      "description": "Final checkpoint - full integration verification, lint, build"
    }
  ]
}
```

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The `MatchHistoryService` is instantiated once at server startup and caches all series in memory for fast filtering
- The existing `normalizeTeamName` function in server.ts should be extracted to a shared utility so both server and service can use it
- Property tests use `fast-check` library with minimum 100 iterations each
- The frontend uses the same hero image utilities already in the project
