# Requirements Document

## Introduction

Rebuild the MLBB Draft Simulator into a fully data-driven Draft Coach system with two modes (MPL Mode and Ranked Mode), a lane resolution engine, multi-factor scoring system, team composition validation, step-by-step AI analysis per draft phase, and final draft analysis. The system must leverage the existing AI Knowledge Layer (mechanicCategory, draftTags, counterTags, synergyTags, macroTags, powerSpikeTags) already present in all 132 hero JSON files.

## Glossary

- **Draft Coach**: The rebuilt draft simulator that provides intelligent, data-driven recommendations
- **MPL Mode**: Draft mode using MPL team data (team history, signature heroes, team profiles)
- **Ranked Mode**: Draft mode using hero meta data (win rates, pick rates, role/lane balance)
- **Lane Resolution Engine**: System that maps heroes to MLBB lanes (Gold, EXP, Mid, Jungle, Roam) using heroes_master.json and AI metadata
- **Scoring Engine**: Multi-factor system that calculates recommendation scores based on LaneFit, RoleBalance, Counter, Synergy, Meta, DraftPhase, DenyPick, FlexValue
- **AI Knowledge Layer**: Existing enrichment fields on hero JSONs (mechanicCategory, playstyleTags, draftTags, counterTags, synergyTags, macroTags, powerSpikeTags)

## Requirements

### Requirement 1: Draft Mode Selection

**User Story:** As a user, I want to choose between MPL Mode and Ranked Mode before starting a draft, so that I get recommendations relevant to my context.

#### Acceptance Criteria

1. WHEN the Draft Coach loads, THE system SHALL display a mode selection screen with two options: "MPL Mode" and "Ranked Mode"
2. WHEN a user selects MPL Mode, THE system SHALL show team selection dropdowns for Blue and Red teams (from available MPL teams)
3. WHEN a user selects Ranked Mode, THE system SHALL proceed directly to draft with meta-based recommendations

### Requirement 2: Lane Resolution Engine

**User Story:** As a coach, I want the system to automatically determine which lane each picked hero will fill, so that I can evaluate team composition completeness.

#### Acceptance Criteria

1. WHEN a hero is picked, THE Lane Resolution Engine SHALL assign the hero to their primary lane from heroes_master.json
2. WHEN multiple heroes share the same primary lane, THE Lane Resolution Engine SHALL use flex_lanes to resolve conflicts
3. THE system SHALL display current lane composition status for each team (Gold, EXP, Mid, Jungle, Roam) with filled/empty indicators

### Requirement 3: Multi-Factor Scoring Engine

**User Story:** As a coach, I want recommendations scored on multiple factors, so that I can understand WHY a hero is recommended.

#### Acceptance Criteria

1. THE Scoring Engine SHALL calculate scores using these factors: LaneFit (does the hero fill a needed lane), RoleBalance (does the team need this role), Counter (does the hero counter enemy picks), Synergy (does the hero synergize with allied picks), Meta (current meta strength), DraftPhase (appropriate for this phase), DenyPick (deny enemy a strong pick), FlexValue (hero can play multiple lanes)
2. THE system SHALL display each recommendation with its total score and breakdown of factor contributions
3. THE system SHALL generate top 3 recommendations per draft step, ordered by total score

### Requirement 4: Availability Filter (Bug Fix)

**User Story:** As a user, I want banned and picked heroes never to appear in recommendations, so that I only see valid options.

#### Acceptance Criteria

1. WHEN generating recommendations, THE system SHALL exclude all heroes that have been banned or picked by either team
2. THE hero grid SHALL visually indicate unavailable heroes (banned/picked) with reduced opacity and disabled interaction

### Requirement 5: Server-Side Recommendation Engine

**User Story:** As a developer, I want the scoring and recommendation logic on the server, so that it can leverage the full hero database.

#### Acceptance Criteria

1. THE server SHALL expose `POST /api/draft/recommendation` that accepts current draft state and returns scored recommendations
2. THE server SHALL expose `POST /api/draft/final-analysis` that accepts complete draft and returns AI-generated strategic analysis
3. THE server SHALL expose `GET /api/draft/teams` that returns available MPL teams with their profiles

### Requirement 6: Enhanced Recommendation Cards

**User Story:** As a user, I want recommendation cards that show score breakdown, tags, and strategic reasoning, so that I understand the logic.

#### Acceptance Criteria

1. EACH recommendation card SHALL display: hero image, hero name, total score, lane assignment, role tags
2. EACH recommendation card SHALL show top 3 contributing score factors with their individual values
3. EACH recommendation card SHALL display a brief strategic reason (e.g., "Counters enemy mid laner", "Fills empty Gold Lane")

### Requirement 7: Team Composition Validation

**User Story:** As a coach, I want the system to warn about incomplete lane coverage, so that I don't end up with a bad composition.

#### Acceptance Criteria

1. THE system SHALL display lane status panels for both teams showing which lanes are filled and which are empty
2. WHEN a team has 3+ picks and still has unfilled lanes, THE system SHALL highlight those lanes as warnings
3. THE composition display SHALL update in real-time as picks are made

### Requirement 8: Final Draft Analysis

**User Story:** As a user, I want a comprehensive AI analysis when the draft is complete, so that I understand both teams' strengths, weaknesses, and win conditions.

#### Acceptance Criteria

1. WHEN the draft is completed, THE system SHALL offer an "Analisis Draft" button
2. THE analysis SHALL include: team strengths, team weaknesses, win conditions for each side, power spike timing comparison, macro strategy suggestions
3. THE analysis SHALL leverage AI Knowledge Layer data (draftTags, counterTags, synergyTags, macroTags, powerSpikeTags) to generate insights

