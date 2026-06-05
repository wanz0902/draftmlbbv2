# Implementation Plan: MLBB Audit Fix

## Overview

A comprehensive audit, bug fix, and UI polish pass for the MLBB Draft Simulator. Changes are organized by dependency order: security/credential cleanup first (no dependencies), then server fixes, then shared utility refactoring, then downstream import updates, then independent UI improvements. Verification is via TypeScript compilation (`npm run build`) at the end.

## Tasks

- [x] 1. Security and credential cleanup
  - [x] 1.1 Clear exposed API keys from .env and firebase config
    - In `.env`: replace the real OpenAI key value with `your_openai_api_key_here`
    - In `firebase-applet-config.json`: replace all credential values with placeholder strings (`YOUR_PROJECT_ID`, `YOUR_APP_ID`, `YOUR_API_KEY`, `YOUR_AUTH_DOMAIN`, `YOUR_FIRESTORE_DB_ID`, `YOUR_STORAGE_BUCKET`, `YOUR_MESSAGING_SENDER_ID`, empty `measurementId`)
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 Update .gitignore to prevent future credential commits
    - Add `firebase-applet-config.json` entry to `.gitignore`
    - _Requirements: 1.3_

- [x] 2. Server fixes (server.ts)
  - [x] 2.1 Fix invalid AI model name
    - Replace all occurrences of `"gemini-3.5-flash"` with `"gemini-2.0-flash"` in server.ts (2 occurrences: `/api/draft/ai-recommend` and `/api/draft/evaluate`)
    - Remove duplicate `const ai = getGeminiClient();` and `const openAI = getOpenAIClient();` declarations inside the try block that shadow outer declarations
    - _Requirements: 2.1, 2.2_

  - [x] 2.2 Remove dead `old_cleanText` function from server.ts
    - Delete the entire `old_cleanText` function definition (never called anywhere)
    - _Requirements: 3.2_

  - [x] 2.3 Add hero name alias mappings in server.ts `getHeroAssets()`
    - Add alias record mapping for special-character hero names (Yi Sun-shin, X.Borg, Chang'e, Popol and Kupa)
    - Ensure bidirectional normalization so both alias forms resolve to the same image
    - _Requirements: 6.1, 6.2_

- [x] 3. Move getHeroRole to heroUtils.ts
  - [x] 3.1 Add getHeroRole function to `src/lib/heroUtils.ts`
    - Copy the `getHeroRole` function from StatsDashboard.tsx into heroUtils.ts as a named export
    - Ensure the function references the existing `heroesMaster` data from heroUtils
    - _Requirements: 4.1_

  - [x] 3.2 Update imports in StatsDashboard.tsx
    - Remove the `getHeroRole` function definition from StatsDashboard.tsx
    - Update import to: `import { getHeroImageUrl, getHeroRole } from "../lib/heroUtils";`
    - _Requirements: 4.3_

  - [x] 3.3 Update imports in DraftSimulator.tsx
    - Change `import { getHeroRole } from "./StatsDashboard";` to `import { getHeroRole } from "../lib/heroUtils";`
    - _Requirements: 4.2_

- [x] 4. Checkpoint - Verify core refactoring compiles
  - Ensure `npx tsc --noEmit` passes with no errors after the import changes. Ask the user if questions arise.

- [x] 5. Navbar improvements
  - [x] 5.1 Add Home tab to Navbar links
    - Import `Home` icon from lucide-react
    - Add `{ id: "home", label: "Home", icon: Home }` as the first entry in the `links` array
    - _Requirements: 5.1, 5.3_

  - [x] 5.2 Make Navbar logo/brand clickable
    - Wrap the brand/logo area in a clickable element that calls `onChangeTab("home")`
    - _Requirements: 5.2_

  - [x] 5.3 Improve mobile navigation active state and auto-scroll
    - Add stronger visual indicator for active tab on mobile (bottom border accent, stronger background)
    - Add `useRef` for mobile nav container and `useEffect` to auto-scroll active button into view when `currentTab` changes
    - Add `data-active` attribute to mobile nav buttons for scroll targeting
    - _Requirements: 12.1, 12.2_

- [x] 6. App.tsx cleanup and fixes
  - [x] 6.1 Remove unused `Info` import from lucide-react
    - Change `import { CloudLightning, Info, ShieldCheck }` to `import { CloudLightning, ShieldCheck }`
    - _Requirements: 3.3_

  - [x] 6.2 Fix hardcoded historyCount
    - Add `historyData` state via useState
    - Fetch `/api/history` in `loadAllData` and store result in `historyData`
    - Replace `historyCount={84}` with `historyCount={historyData.length}`
    - _Requirements: 9.1_

  - [x] 6.3 Replace footer text
    - Replace `"SECURE OFFLINE DESKTOP STATE DEPLOYED"` with `"MLBB Draft Analytics Engine v1.0"`
    - _Requirements: 13.1_

  - [x] 6.4 Implement custom confirm modal for draft exit
    - Add `showExitModal` and `pendingTab` state variables
    - Replace `window.confirm(...)` in `handleTabChange` with setting modal state
    - Add inline modal JSX (dark theme, "Keluar dari Draft?" title, "Batal" and "Lanjut Keluar" buttons)
    - On confirm: clear draft state and navigate to pending tab
    - On cancel: close modal and stay on current tab
    - _Requirements: 11.1, 11.2, 11.3_

- [x] 7. Delete HeroIntelligencePanel.tsx
  - Delete the file `src/components/HeroIntelligencePanel.tsx` entirely (never imported or rendered)
  - _Requirements: 3.1_

- [x] 8. FallbackImage minimum size fix
  - In `src/components/FallbackImage.tsx`, add `style={{ minWidth: '24px', minHeight: '24px' }}` to the fallback `<div>` element
  - _Requirements: 7.1_

- [x] 9. LiquipediaScraper error handling improvements
  - Add `rateLimited` boolean state and `cooldown` number state
  - In the fetch catch/response handler, detect HTTP 429 and set rate-limited state
  - Add `useEffect` cooldown timer that counts down from 30 when rate-limited
  - Disable retry/scrape button during cooldown period
  - Add status badge element showing: "idle" | "running" | "success" | "error" | "rate-limited"
  - Display Indonesian-language rate-limit message: "Server sedang membatasi akses (rate limit). Silakan tunggu 30 detik sebelum mencoba lagi."
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 10. CSS animations in index.css
  - Add `@keyframes fadeInUp` (opacity 0→1, translateY 16px→0) and `.animate-fade-in-up` utility class
  - Add `@keyframes gradientX` (background-position left→right cycling) and `.animate-gradient-x` utility class
  - Place after existing `animate-fade-in` block, using plain CSS (Tailwind v4 convention)
  - _Requirements: 10.1, 10.2, 10.3_

- [x] 11. Back button on HeroDetailPanel
  - In `src/components/HeroDetailPanel.tsx`, add a "← Kembali" button near the close (X) button that calls `onClose`
  - Import `ArrowLeft` from lucide-react
  - Style to match dark theme (gray-800 bg, gray-300 text, hover:gray-700)
  - _Requirements: 14.1_

- [x] 12. Final checkpoint - Verify full build compiles
  - Run `npm run build` (which runs `tsc` and Vite build) and ensure zero errors
  - Grep for `"gemini-3.5-flash"` — should return 0 results
  - Grep for `old_cleanText` — should return 0 results
  - Confirm `src/components/HeroIntelligencePanel.tsx` does not exist
  - Ask the user if questions arise.

## Notes

- No property-based tests are included (design explicitly states PBT is not applicable for this audit/fix pass)
- Verification is via TypeScript compilation and manual smoke testing
- All UI text remains in Indonesian to match existing codebase conventions
- No new dependencies are introduced
- Tasks 1–3 have no cross-dependencies and can be done in any order among themselves
- Task 3 must complete before Task 4 checkpoint and before tasks referencing the moved imports
