# Requirements Document

## Introduction

A comprehensive audit, bug fix, and UI polish pass for the MLBB Draft Simulator project. This project (React + Vite + Express + Firebase + SQLite) was exported from Google AI Studio and contains exposed API keys, dead code, broken imports, UI inconsistencies, and missing CSS animations. The goal is to bring the codebase to a clean, secure, production-ready state without altering business logic or scraping algorithms.

## Glossary

- **System**: The MLBB Draft Simulator application (frontend React SPA + backend Express server)
- **Credential_Store**: Files containing API keys or Firebase credentials (.env, firebase-applet-config.json)
- **Server**: The Express.js backend (server.ts)
- **Navbar**: The application's primary navigation component (src/components/Navbar.tsx)
- **DraftSimulator**: The main draft pick/ban simulator component (src/components/DraftSimulator.tsx)
- **FallbackImage**: The image component with text fallback (src/components/FallbackImage.tsx)
- **LiquipediaScraper**: The Liquipedia data update panel (src/components/LiquipediaScraper.tsx)
- **Hero_Asset_Resolver**: The function `getHeroAssets()` in server.ts that maps hero names to image paths
- **LandingPage**: The home/landing page component (src/components/LandingPage.tsx)

## Requirements

### Requirement 1: Clear Exposed API Keys from Environment

**User Story:** As a developer, I want all exposed API keys replaced with placeholder template values, so that credentials are never committed to version control.

#### Acceptance Criteria

1. WHEN the .env file is inspected, THE Credential_Store SHALL contain only placeholder template values (e.g., `your_openai_api_key_here`) for all API key entries
2. WHEN the firebase-applet-config.json file is inspected, THE Credential_Store SHALL contain only placeholder strings (e.g., `YOUR_API_KEY`, `YOUR_PROJECT_ID`) for all credential fields
3. THE System SHALL include `firebase-applet-config.json` in the .gitignore file to prevent future credential commits

### Requirement 2: Fix Invalid AI Model Configuration

**User Story:** As a developer, I want the Gemini AI integration to reference a valid model name, so that the AI coaching features function correctly when an API key is provided.

#### Acceptance Criteria

1. WHEN the Server uses the Gemini AI client, THE Server SHALL reference the model name "gemini-2.0-flash" instead of the non-existent "gemini-3.5-flash"
2. WHEN the Server initializes AI clients, THE Server SHALL declare the `ai` variable exactly once per endpoint scope to avoid double-declaration errors

### Requirement 3: Remove Dead Code

**User Story:** As a developer, I want unreachable and unused code removed, so that the codebase is clean and maintainable.

#### Acceptance Criteria

1. THE System SHALL NOT contain the file `src/components/HeroIntelligencePanel.tsx` since it is never imported or rendered
2. THE Server SHALL NOT contain the function `old_cleanText` since it is never called
3. THE System SHALL NOT import the `Info` icon from lucide-react in App.tsx since it is never used

### Requirement 4: Fix Import Coupling Between Components

**User Story:** As a developer, I want utility functions in dedicated library files rather than UI components, so that components are properly decoupled.

#### Acceptance Criteria

1. THE System SHALL define the `getHeroRole` function in `src/lib/heroUtils.ts` instead of in StatsDashboard.tsx
2. WHEN DraftSimulator.tsx uses `getHeroRole`, THE DraftSimulator SHALL import it from `src/lib/heroUtils.ts`
3. WHEN StatsDashboard.tsx uses `getHeroRole`, THE StatsDashboard SHALL import it from `src/lib/heroUtils.ts`

### Requirement 5: Add Missing Navigation Elements

**User Story:** As a user, I want to navigate back to the home/landing page from any tab, so that I am never stuck without a way to return.

#### Acceptance Criteria

1. THE Navbar SHALL include a "Home" link in its navigation links list that sets the current tab to "home"
2. WHEN a user clicks the Navbar logo/brand area, THE Navbar SHALL navigate to the "home" tab
3. THE Navbar mobile navigation bar SHALL also include the "Home" link

### Requirement 6: Fix Hero Image Normalization

**User Story:** As a user, I want all hero images to display correctly including heroes with special characters in their names, so that the visual experience is consistent.

#### Acceptance Criteria

1. WHEN the Hero_Asset_Resolver processes hero names with hyphens (e.g., "Yi Sun-shin", "X.Borg"), THE Hero_Asset_Resolver SHALL map them to the correct image files via an alias mapping
2. WHEN the Hero_Asset_Resolver processes hero names with dots or periods, THE Hero_Asset_Resolver SHALL normalize them correctly to match file system paths

### Requirement 7: Improve FallbackImage Component

**User Story:** As a user, I want fallback image placeholders to always be visible, so that I can identify heroes even when images fail to load.

#### Acceptance Criteria

1. THE FallbackImage SHALL enforce a minimum size of 24px width and 24px height on the fallback container to prevent invisible 0px rendering

### Requirement 8: Improve LiquipediaScraper Error Handling

**User Story:** As a user, I want clear feedback when scraping fails due to rate limiting, so that I understand why the operation failed and when to retry.

#### Acceptance Criteria

1. WHEN the LiquipediaScraper receives a 429 HTTP status, THE LiquipediaScraper SHALL display a specific rate-limit message indicating the user should wait before retrying
2. THE LiquipediaScraper SHALL display a retry button with a 30-second cooldown period after a rate-limit error
3. THE LiquipediaScraper SHALL display a status badge indicating current state (idle, running, success, error, rate-limited)

### Requirement 9: Fix Hardcoded History Count

**User Story:** As a developer, I want the history count passed to LiquipediaScraper to reflect actual data, so that the displayed metric is accurate.

#### Acceptance Criteria

1. WHEN App.tsx renders LiquipediaScraper, THE System SHALL calculate the historyCount from the actual loaded match history data rather than using a hardcoded value of 84

### Requirement 10: Define Missing CSS Animations

**User Story:** As a user, I want all referenced animations to work visually, so that the landing page displays with proper entrance effects and gradient animations.

#### Acceptance Criteria

1. THE System SHALL define the `animate-fade-in-up` CSS animation in src/index.css using @keyframes with opacity and translateY transition
2. THE System SHALL define the `animate-gradient-x` CSS animation in src/index.css using @keyframes with background-position cycling for gradient text effects
3. THE System SHALL implement these animations using Tailwind CSS v4 conventions (plain @keyframes + utility class in CSS, not tailwind.config.js)

### Requirement 11: Replace Browser Confirm Dialog

**User Story:** As a user, I want confirmation dialogs that match the application's dark theme, so that the experience is visually consistent.

#### Acceptance Criteria

1. WHEN the user attempts to leave the draft tab while a draft is in progress, THE System SHALL display a custom modal dialog styled to match the dark theme instead of using `window.confirm()`
2. THE custom modal SHALL provide "Lanjut Keluar" (confirm) and "Batal" (cancel) buttons
3. THE custom modal SHALL be implemented using React useState without any external library

### Requirement 12: Improve Mobile Navigation

**User Story:** As a user on mobile, I want to clearly see which navigation tab is active and have it scrolled into view, so that navigation state is always obvious.

#### Acceptance Criteria

1. WHEN a navigation tab is active on mobile, THE Navbar SHALL display a stronger visual indicator (e.g., a bottom border accent or stronger background contrast)
2. WHEN the active tab changes on mobile, THE Navbar SHALL auto-scroll the active tab button into the visible viewport of the horizontal scroll container

### Requirement 13: Fix Misleading Footer Text

**User Story:** As a user, I want accurate and neutral status text in the footer, so that I am not confused by misleading claims.

#### Acceptance Criteria

1. THE System SHALL replace the footer text "SECURE OFFLINE DESKTOP STATE DEPLOYED" with neutral text such as "MLBB Draft Analytics Engine v1.0"

### Requirement 14: Add Back Navigation to Detail Panels

**User Story:** As a user, I want explicit back buttons on detail/intelligence panels, so that I can navigate away without relying solely on the top navbar.

#### Acceptance Criteria

1. WHEN the HeroIntelligenceDashboard displays a hero detail view, THE System SHALL provide a visible "Back" button that returns the user to the previous list view
