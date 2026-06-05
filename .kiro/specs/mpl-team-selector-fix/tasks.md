# Implementation Plan: MPL Team Selector & Draft Coach Bugfix

## Overview

Perbaikan tiga area bug utama: MPL Team Selector dropdown kosong (fallback data lokal), post-draft analysis fallback terlalu pendek (comprehensive local analysis), dan lane display mode differentiation (MPL predicted vs Ranked tracker). Semua perubahan di `DraftSimulator.tsx` saja — backend sudah benar.

## Task Dependency Graph

```json
{
  "waves": [
    { "tasks": ["1", "2"] },
    { "tasks": ["3"] },
    { "tasks": ["4"] },
    { "tasks": ["5"] },
    { "tasks": ["6"] }
  ]
}
```

## Tasks

- [x] 1. Add FALLBACK_MPL_TEAMS constant to DraftSimulator.tsx
  - Add a static constant `FALLBACK_MPL_TEAMS` array with 9 MPL teams (RRQ, EVOS, ONIC, TLID, GEEK, BTR, AE, DEWA, NAVI) outside the component, each with key, name, and empty logo string
  - Place it after the `DRAFT_SEQUENCE` constant and before the component function
  - _Requirements: 2.1_

- [x] 2. Fix MPL teams fetch useEffect with fallback and retry
  - Add `teamsError` string state and `retryCount` number state
  - Modify the existing `useEffect` for team fetching: add `!res.ok` check, validate response is non-empty array, on any failure set `teamsError` message and call `setMplTeams(FALLBACK_MPL_TEAMS)`
  - Change useEffect dependency from `[draftMode, mplTeams.length]` to `[draftMode, retryCount]` so retry can re-trigger
  - Add `handleRetryTeams` function that resets `mplTeams` to `[]` and increments `retryCount`
  - In the MPL team selection UI section: show `teamsError` message with a retry button when error is non-empty
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 3. Add same-team validation and warning
  - Update the "Mulai Simulasi Draf" button disabled condition to also check `selectedBlueTeam === selectedRedTeam`
  - Add conditional warning text below the dropdowns: "⚠️ Blue Team dan Red Team tidak boleh sama." when both are selected and equal
  - _Requirements: 2.3, 2.5_

- [x] 4. Improve post-draft analysis fallback (generateLocalFallbackAnalysis)
  - Add a `generateLocalFallbackAnalysis` function inside the component that uses `heroes` prop, `bluePicks`, `redPicks`, `blueBans`, `redBans`, and `getHeroRole` to produce comprehensive markdown analysis
  - The function must output sections: Predicted Lane Assignment, Kekuatan Tim Biru, Kelemahan Tim Biru, Kekuatan Tim Merah, Kelemahan Tim Merah, Win Condition, Draft Score, Bans Impact
  - Replace the short fallback in `evaluateDraftGame` catch block with `setEvaluationResult(generateLocalFallbackAnalysis())`
  - _Requirements: 2.6_

- [x] 5. Lane display mode differentiation (MPL vs Ranked)
  - In the "Lane Status Display" section of the draft board JSX, add a conditional subtitle when `draftMode === "mpl"`: a small italic text "Prediksi lane assignment — bukan urutan pick wajib"
  - Change the lane section label from "BLUE LANES" to "PREDICTED" when mode is MPL
  - Keep existing labels for Ranked mode unchanged
  - _Requirements: 2.7, 2.8_

- [x] 6. Final verification - build and lint
  - Run `npx tsc --noEmit` and verify zero errors
  - Run `npm run build` and verify success
  - Verify hero count in heroes_master.json is still 132
  - Verify no changes to server.ts, hero data files, or Hero Intelligence
  - _Requirements: 3.7, 3.8, 3.9, 3.10_

## Notes

- Backend endpoints (`GET /api/draft/teams`, `POST /api/draft/final-analysis`, `POST /api/draft/recommendation`) sudah benar dan TIDAK diubah
- Hero count wajib tetap 132 — JANGAN ubah data hero
- Hero Intelligence JANGAN dihapus
- Recommendation engine sudah filter hero banned/picked — tidak perlu diubah
- PBT tidak applicable (UI bugfix)
- Semua text UI dalam Bahasa Indonesia sesuai existing codebase
