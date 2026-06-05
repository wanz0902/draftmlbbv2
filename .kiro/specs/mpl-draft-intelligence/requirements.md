# Requirements Document

## Introduction

The MPL Draft Intelligence Engine transforms the existing generic draft recommendation system into a team-history-driven intelligence platform. When users select MPL teams (e.g., Geek Fam vs ONIC), the engine leverages actual match history data from the normalized dataset (`data/mpl_id_s17_regular_season.json`) and fallback sources (`data/regular_matches.json`, `data/matches.json`) to produce contextual recommendations grounded in real team tendencies, comfort picks, priority bans, draft patterns, signature compositions, and head-to-head statistics.

The system implements two completely separate logic engines: MPL Mode (team identity → head-to-head → draft pattern → comfort → meta fallback) and Ranked Mode (meta → role balance → lane balance → counter picks). The engines do NOT share scoring logic when team data is available. Meta data serves ONLY as a fallback when team-specific data is empty.

The system preserves existing Ranked mode behavior and the complete 132-hero dataset without modification.

## Glossary

- **Team_Identity_Engine**: Module that builds comprehensive identity profiles from ALL match history per team, including first/second pick preferences, signature compositions, hero pairings, draft tendencies, target bans, side winrates, most successful heroes, and most contested heroes
- **Team_Profile_Engine**: Module that processes raw match history data into structured per-team statistical profiles including hero pick/ban rates, win rates, comfort heroes, and side preferences
- **Draft_Pattern_Engine**: Module that learns and models draft sequencing patterns per team, including first pick tendencies, ban patterns, hero sequencing, and draft avoidances
- **Pick_Sequence_Intelligence**: Module that provides probabilistic lane prediction based on draft context, rejecting fixed lane-filling assumptions and only producing lane predictions after 3+ heroes are picked
- **Hero_Availability_Tree**: Module that computes downstream consequences of each ban/pick action, modeling enemy pivot paths and hero pool collapse across multiple steps
- **Matchup_Profile_Engine**: Module that builds head-to-head statistical profiles when two specific teams are selected for a draft
- **MPL_Recommendation_Engine**: Enhanced recommendation scoring system that incorporates team identity, draft patterns, and matchup data into hero scoring when mode is MPL and teams are selected
- **Pre_Draft_Panel**: UI component displayed after team selection and before the first ban, showing team intelligence summaries including signature compositions, recent form, side preference, and draft tendencies
- **Draft_Analysis_Engine**: Module that produces structured data-driven analysis for the final draft evaluation, including team comfort scores, draft execution scores, signature pick usage, ban efficiency, and evidence sources
- **Comfort_Hero**: A hero that a team has picked 3 or more times with a win rate above 50%
- **Signature_Composition**: A combination of 2 or more heroes that appear together in the same team's draft across multiple games with above-average win rate
- **Hero_Pairing**: Two heroes that a team consistently drafts together across match history
- **Priority_Pick**: A hero that a team selects during first phase (first 3 picks of PICKS_1)
- **Priority_Ban**: A hero that a team bans most frequently across their match history
- **Target_Ban**: A ban specifically directed at a known opponent's comfort hero or signature pick based on head-to-head history
- **Draft_Tendency**: A team's observable pattern in draft ordering such as favoring early aggression picks, scaling picks, or flex-first strategies
- **Draft_Avoidance**: A hero that exists in the meta pool but a specific team never or very rarely picks
- **Noise_Ban**: A ban recommendation that appears meta-relevant but redirects enemy interpretation toward false conclusions
- **Gemini_Guard**: Validation layer ensuring the Gemini AI language model only beautifies local engine data without fabricating statistics or recommending unavailable heroes
- **Match_History_Data**: Game records from `data/mpl_id_s17_regular_season.json` (primary) and `data/regular_matches.json` (fallback) containing pick/ban/win data per team per game
- **Draft_Mode**: Application state indicating either "mpl" (team-based) or "ranked" (solo meta-based) drafting context
- **MatchHistoryService**: The single source of truth for all match data; all engines derive statistics exclusively through this service
- **Most_Successful_Hero**: A hero with the highest win rate for a team (minimum 2 games played)
- **Most_Contested_Hero**: A hero that is frequently either picked or banned in a team's games (high combined pick+ban rate)

## Requirements

### Requirement 1: Team Identity Engine

**User Story:** As a draft coach, I want the system to build comprehensive identity profiles from each MPL team's complete match history, so that recommendations reflect the team's full strategic DNA rather than surface-level pick rates.

#### Acceptance Criteria

1. WHEN match history data is loaded, THE Team_Identity_Engine SHALL compute per-team hero pick statistics including pickCount, winCount, lossCount, and winRate for each hero picked by the team
2. WHEN match history data is loaded, THE Team_Identity_Engine SHALL compute per-team hero ban statistics including banCount (bans made by the team) and banAgainstCount (bans made against the team) for each hero
3. WHEN hero pick statistics are computed, THE Team_Identity_Engine SHALL identify comfort heroes as the top 5 most-picked heroes with a win rate above 50% and a minimum of 3 picks
4. WHEN hero pick statistics are computed, THE Team_Identity_Engine SHALL identify first pick preferences as heroes most often selected in the first pick position across the team's match history
5. WHEN hero pick statistics are computed, THE Team_Identity_Engine SHALL identify second pick preferences as heroes most often selected in the second pick position across the team's match history
6. WHEN match history data is loaded, THE Team_Identity_Engine SHALL compute side-specific statistics including games played, wins, and winrate for both blue side and red side
7. WHEN hero pick statistics are computed, THE Team_Identity_Engine SHALL identify signature compositions as combinations of 2 or more heroes that appear together in the same draft across 3 or more games with a combined win rate above 50%
8. WHEN hero pick statistics are computed, THE Team_Identity_Engine SHALL identify hero pairings as pairs of heroes that the team drafts together in at least 2 separate games
9. WHEN match history data is loaded against specific opponents, THE Team_Identity_Engine SHALL compute target ban profiles recording which heroes a team specifically bans against each opponent
10. WHEN hero pick statistics are computed, THE Team_Identity_Engine SHALL classify team draft tendencies as one or more of: early_aggression, scaling, flex_first, objective_control, or split_push based on the composition of heroes in first-phase picks
11. WHEN hero pick statistics are computed, THE Team_Identity_Engine SHALL identify the top 5 most successful heroes ranked by win rate with a minimum of 2 games played
12. WHEN hero pick and ban statistics are combined, THE Team_Identity_Engine SHALL identify the top 5 most contested heroes ranked by combined pick-plus-ban frequency in the team's games
13. WHEN match history data is loaded, THE Team_Identity_Engine SHALL compute overall team statistics including totalGames, wins, losses, and winrate
14. WHEN hero ban statistics are computed, THE Team_Identity_Engine SHALL identify priority bans as the top 5 heroes most frequently banned by the team
15. THE Team_Identity_Engine SHALL derive statistics exclusively through MatchHistoryService without fabricating or interpolating values

### Requirement 2: Matchup Profile Generation

**User Story:** As a draft coach, I want to see head-to-head intelligence when two specific teams are selected, so that I can understand historical tendencies in that particular matchup.

#### Acceptance Criteria

1. WHEN a blue team and red team are both selected in MPL mode, THE Matchup_Profile_Engine SHALL build a matchup profile from all head-to-head games between those two teams in the match history
2. WHEN a matchup profile is built, THE Matchup_Profile_Engine SHALL include the total number of head-to-head games, series wins per team, and overall head-to-head win rate
3. WHEN a matchup profile is built, THE Matchup_Profile_Engine SHALL include each team's comfort heroes specific to that matchup (heroes picked against the opponent with win rate above 50%)
4. WHEN a matchup profile is built, THE Matchup_Profile_Engine SHALL include each team's priority bans specific to that matchup (heroes most frequently banned when facing the opponent)
5. WHEN a matchup profile is built, THE Matchup_Profile_Engine SHALL include the full head-to-head record with dates and results of each series
6. IF no head-to-head games exist between the selected teams, THEN THE Matchup_Profile_Engine SHALL return an empty matchup profile with headToHeadGames set to 0

### Requirement 3: MPL-Aware Recommendation Scoring

**User Story:** As a draft coach, I want the recommendation engine to prioritize team-specific data over generic meta, so that suggestions are relevant to the selected teams' actual playstyles.

#### Acceptance Criteria

1. WHILE mode is "mpl" and both teams are selected, THE MPL_Recommendation_Engine SHALL incorporate a teamComfort scoring factor that adds points when a hero candidate is in the ally team's comfort hero list
2. WHILE mode is "mpl" and both teams are selected, THE MPL_Recommendation_Engine SHALL incorporate a teamDeny scoring factor that adds points when a hero candidate is in the enemy team's comfort hero list (deny pick value)
3. WHILE mode is "mpl" and both teams are selected, THE MPL_Recommendation_Engine SHALL incorporate a teamHistory scoring factor that adds points proportional to the ally team's win rate with that hero
4. WHILE mode is "mpl" and both teams are selected, THE MPL_Recommendation_Engine SHALL incorporate a draftPattern scoring factor that adds points when a hero candidate aligns with the ally team's historical draft sequencing patterns
5. WHILE mode is "mpl" and both teams are selected and team data IS available, THE MPL_Recommendation_Engine SHALL apply the priority hierarchy: Team History (highest weight) → Head-to-Head History → Comfort Heroes → Draft Pattern → Meta Data (lowest weight, effectively 0 when team data exists)
6. WHILE mode is "mpl" and team data IS available, THE MPL_Recommendation_Engine SHALL reduce meta scoring weight to effectively zero, using meta ONLY as a tiebreaker when team-specific scores are equal
7. IF mode is "mpl" and team history data is empty or unavailable for the selected team, THEN THE MPL_Recommendation_Engine SHALL fall back to the existing meta-based scoring without team-specific factors
8. WHILE mode is "ranked", THE MPL_Recommendation_Engine SHALL use the existing scoring factors without any team-specific modifications

### Requirement 4: Pre-Draft Intelligence Panel

**User Story:** As a draft coach, I want to see a comprehensive pre-draft intelligence panel after selecting teams and before the first ban, so that I have full strategic context for the entire draft.

#### Acceptance Criteria

1. WHEN both teams are selected in MPL mode and before the first ban action, THE Pre_Draft_Panel SHALL display each team's top 5 comfort heroes with pick count and win rate
2. WHEN both teams are selected in MPL mode and before the first ban action, THE Pre_Draft_Panel SHALL display each team's top priority bans
3. WHEN both teams are selected in MPL mode and before the first ban action, THE Pre_Draft_Panel SHALL display the head-to-head summary including total games, series wins per team, and full record with dates
4. WHEN both teams are selected in MPL mode and before the first ban action, THE Pre_Draft_Panel SHALL display each team's signature compositions with game count and win rate
5. WHEN both teams are selected in MPL mode and before the first ban action, THE Pre_Draft_Panel SHALL display each team's recent form as win rate over their last 5 series
6. WHEN both teams are selected in MPL mode and before the first ban action, THE Pre_Draft_Panel SHALL display each team's side preference showing blue side and red side winrates
7. WHEN both teams are selected in MPL mode and before the first ban action, THE Pre_Draft_Panel SHALL display each team's draft tendency summary (early_aggression, scaling, flex_first, or other classified tendency)
8. IF no team-specific data is available for one or both selected teams, THEN THE Pre_Draft_Panel SHALL display the message "Data spesifik team belum tersedia. Menggunakan fallback meta."
9. THE Pre_Draft_Panel SHALL render all text labels and descriptions in Bahasa Indonesia

### Requirement 5: MPL Ban Recommendations

**User Story:** As a draft coach, I want ban recommendations grounded in enemy team data and draft patterns, so that I can target the opponent's actual strengths with strategic intent and information warfare.

#### Acceptance Criteria

1. WHILE mode is "mpl" and both teams are selected, THE MPL_Recommendation_Engine SHALL generate ban recommendations prioritizing heroes from the enemy team's comfort hero list and signature compositions
2. WHEN generating ban recommendations, THE MPL_Recommendation_Engine SHALL classify each ban recommendation with a ban type: Comfort Ban, Target Ban, Meta Ban, Deny Ban, or Noise Ban
3. WHEN generating ban recommendations, THE MPL_Recommendation_Engine SHALL include evidence data for each recommendation containing pickCount, winRate, and source reference from the enemy team's profile
4. WHEN generating ban recommendations, THE MPL_Recommendation_Engine SHALL include at least one recommendation that functions as strategic noise — appearing meta-relevant while redirecting enemy interpretation toward false conclusions
5. WHEN generating ban recommendations, THE MPL_Recommendation_Engine SHALL verify that the ban sequence does not telegraph an obvious protection pattern that reveals the hidden gameplan
6. WHEN generating ban recommendations, THE MPL_Recommendation_Engine SHALL reference enemy draft patterns including their historical first pick tendencies and hero sequencing
7. WHEN generating ban recommendations, THE MPL_Recommendation_Engine SHALL show a "If banned: enemy likely pivots to..." prediction for each ban, derived from the Hero_Availability_Tree
8. IF no enemy team profile data is available, THEN THE MPL_Recommendation_Engine SHALL fall back to meta-based ban recommendations

### Requirement 6: MPL Pick Recommendations

**User Story:** As a draft coach, I want pick recommendations that consider my team's identity, draft patterns, and the opponent's vulnerabilities, so that I can build a composition based on proven performance and strategic concealment.

#### Acceptance Criteria

1. WHILE mode is "mpl" and both teams are selected, THE MPL_Recommendation_Engine SHALL generate pick recommendations incorporating the ally team's comfort heroes, signature compositions, and win rate history
2. WHEN generating pick recommendations, THE MPL_Recommendation_Engine SHALL classify each pick recommendation with a pick type: Comfort Pick, Signature Pick, Flex Pick, Counter Pick, or Deny Pick
3. WHEN generating pick recommendations, THE MPL_Recommendation_Engine SHALL include evidence data for each recommendation containing source statistics (pickCount, winRate, pairingData from ally or enemy profile)
4. WHEN generating pick recommendations, THE MPL_Recommendation_Engine SHALL consider draft pattern alignment, lane need, counter matchups, synergy with existing picks, signature composition completion, and deny value from the enemy team
5. WHEN generating pick recommendations, THE MPL_Recommendation_Engine SHALL include a fallback branch explaining an alternative pick if the primary recommendation is banned or picked by the enemy
6. THE MPL_Recommendation_Engine SHALL only recommend heroes that are currently available (not banned or already picked by either team)

### Requirement 7: Structured Draft Analysis Output

**User Story:** As a draft coach, I want the final draft analysis presented as a data-driven dashboard with quantified metrics, so that I can evaluate draft execution quality with evidence-based insights.

#### Acceptance Criteria

1. WHEN a draft is completed, THE Draft_Analysis_Engine SHALL produce a structured JSON object containing sections: Team Comfort Score, Draft Execution Score, Signature Pick Usage, Comfort Hero Success Rate, Head-to-Head Impact, Ban Efficiency, Draft Risk Analysis, Power Spike Timeline, Lane Assignment, Win Condition, and Evidence Source
2. WHEN producing draft analysis, THE Draft_Analysis_Engine SHALL compute Team Comfort Score as the percentage of each team's picks that are comfort heroes from their identity profile
3. WHEN producing draft analysis, THE Draft_Analysis_Engine SHALL compute Draft Execution Score measuring whether each team followed their historical draft patterns (pick order alignment, tendency match)
4. WHEN producing draft analysis, THE Draft_Analysis_Engine SHALL compute Signature Pick Usage indicating whether teams secured heroes from their signature compositions
5. WHEN producing draft analysis, THE Draft_Analysis_Engine SHALL compute Comfort Hero Success Rate showing the historical win rate of each secured comfort hero
6. WHEN producing draft analysis, THE Draft_Analysis_Engine SHALL include Head-to-Head Impact section with the historical series record between the two teams for context
7. WHEN producing draft analysis, THE Draft_Analysis_Engine SHALL compute Ban Efficiency measuring whether bans targeted the enemy's actual highest-value heroes based on their identity profile
8. WHEN producing draft analysis, THE Draft_Analysis_Engine SHALL produce Draft Risk Analysis with specific quantified risks (e.g., "Tim biru hanya memiliki 1 hero frontline — historical winrate dengan 1 frontline: 35%") rather than generic statements
9. WHEN producing draft analysis, THE Draft_Analysis_Engine SHALL include Evidence Source section listing which data files and game records the analysis draws from
10. WHEN producing draft analysis, THE Draft_Analysis_Engine SHALL compute Lane Assignment by resolving each picked hero to a lane using the existing lane resolver
11. WHEN producing draft analysis, THE Draft_Analysis_Engine SHALL compute Power Spike Timeline by categorizing each hero's power spike phase (early, mid, late) from hero powerSpikeTags data
12. WHILE mode is "mpl" and Gemini AI is available, THE Draft_Analysis_Engine SHALL pass the structured JSON data to Gemini for language enhancement only, preserving all numerical data and hero names
13. IF Gemini AI fails or is unavailable, THEN THE Draft_Analysis_Engine SHALL render the complete structured analysis from local engine data without language enhancement

### Requirement 8: Gemini AI Guardrails

**User Story:** As a draft coach, I want Gemini AI to only enhance the language of local engine analysis without altering data, so that I can trust the statistics and hero recommendations are accurate.

#### Acceptance Criteria

1. THE Gemini_Guard SHALL validate that Gemini output does not reference heroes that are banned or already picked (unavailable heroes)
2. THE Gemini_Guard SHALL validate that Gemini output does not contain win rate, pick rate, or statistical values that differ from the local engine's computed data
3. THE Gemini_Guard SHALL validate that Gemini output does not recommend heroes absent from the local engine's recommendation list
4. IF Gemini output fails any validation check, THEN THE Gemini_Guard SHALL discard the Gemini response and use the local engine's structured analysis as the final output
5. THE Gemini_Guard SHALL pass to Gemini only the structured JSON from the local Draft_Analysis_Engine, preventing Gemini from accessing raw match data or generating independent statistics

### Requirement 9: MPL Mode vs Ranked Mode Separation

**User Story:** As a developer, I want MPL mode and Ranked mode to operate as completely separate logic engines, so that team-based intelligence does not contaminate solo queue recommendations and vice versa.

#### Acceptance Criteria

1. WHILE mode is "mpl" and team data IS available, THE MPL_Recommendation_Engine SHALL use exclusively team-based logic: Team Identity → Head-to-Head → Draft Pattern → Comfort Heroes → Meta (fallback only when all team data is exhausted)
2. WHILE mode is "ranked", THE MPL_Recommendation_Engine SHALL use exclusively solo-queue logic: Meta → Role Balance → Lane Balance → Counter Picks without any team identity, head-to-head, or draft pattern factors
3. THE MPL_Recommendation_Engine SHALL NOT share scoring weight constants between MPL mode and Ranked mode when team data is available
4. WHILE mode is "mpl" and team data IS available, THE MPL_Recommendation_Engine SHALL reduce meta scoring contribution to effectively zero, applying meta ONLY as a final tiebreaker
5. WHILE mode is "ranked", THE MPL_Recommendation_Engine SHALL NOT access or reference Team_Identity_Engine data, Draft_Pattern_Engine data, or Matchup_Profile_Engine data
6. THE MPL_Recommendation_Engine SHALL preserve all 132 heroes in `src/data/heroes_master.json` without modification
7. THE MPL_Recommendation_Engine SHALL preserve all individual hero JSON files in `data/heroes/*.json` without modification
8. THE Team_Identity_Engine SHALL derive statistics exclusively through MatchHistoryService without fabricating or interpolating values
9. THE Draft_Analysis_Engine SHALL render all user-facing text in Bahasa Indonesia
10. WHEN the full codebase is compiled, THE system SHALL pass `npm run build` without errors

### Requirement 10: Draft Pattern Engine

**User Story:** As a draft coach, I want the system to learn and model each team's draft sequencing patterns, so that recommendations reference historical draft behavior rather than only comfort heroes.

#### Acceptance Criteria

1. WHEN match history data is loaded, THE Draft_Pattern_Engine SHALL compute per-team first pick tendencies recording which heroes are most frequently selected as first pick with frequency and win rate
2. WHEN match history data is loaded, THE Draft_Pattern_Engine SHALL compute per-team ban sequencing patterns recording the order in which heroes are banned across draft phases (ban 1, ban 2, ban 3 sequences)
3. WHEN match history data is loaded, THE Draft_Pattern_Engine SHALL compute hero sequencing patterns per team recording which heroes are picked following a specific hero (e.g., after picking Hero X, team follows with Hero Y in N games)
4. WHEN match history data is loaded, THE Draft_Pattern_Engine SHALL identify draft avoidances as heroes that exist in the current meta pool but the team has picked zero times or fewer than 1% of their total games
5. WHILE mode is "mpl" and both teams are selected, THE Draft_Pattern_Engine SHALL provide pattern data to the MPL_Recommendation_Engine for scoring alignment with historical draft sequences
6. WHEN generating recommendations, THE MPL_Recommendation_Engine SHALL reference historical draft patterns in the recommendation reason text (e.g., "ONIC historically follows Lancelot pick with Chou 60% of the time")
7. THE Draft_Pattern_Engine SHALL derive all pattern data exclusively through MatchHistoryService without fabricating sequences

### Requirement 11: Pick Sequence Intelligence

**User Story:** As a draft coach, I want the system to treat draft as an information game rather than a lane-filling exercise, so that lane predictions are probabilistic and context-aware rather than fixed assignments.

#### Acceptance Criteria

1. THE Pick_Sequence_Intelligence SHALL NOT assume that pick order equals lane order
2. THE Pick_Sequence_Intelligence SHALL NOT display a fixed Gold-EXP-Mid-Jungle-Roam sequence as mandatory lane assignment during MPL mode drafting
3. WHEN fewer than 3 heroes are picked for a team, THE Pick_Sequence_Intelligence SHALL NOT produce lane predictions for that team
4. WHEN 3 or more heroes are picked for a team, THE Pick_Sequence_Intelligence SHALL produce probabilistic lane predictions for each hero showing lane assignment with percentage confidence (e.g., "Harith → Mid 85%, Gold 15%")
5. WHEN producing lane predictions, THE Pick_Sequence_Intelligence SHALL derive lane probabilities from the team's historical lane assignments for each hero using match history data
6. WHEN no historical lane data is available for a hero-team combination, THE Pick_Sequence_Intelligence SHALL fall back to the hero's default lane data from hero master data
7. THE Pick_Sequence_Intelligence SHALL update lane probability distributions after each new pick is added, incorporating composition context

### Requirement 12: Hero Availability Tree

**User Story:** As a draft coach, I want the system to compute downstream consequences of each ban or pick action, so that I can think multiple steps ahead about how the enemy's hero pool collapses.

#### Acceptance Criteria

1. WHEN a ban recommendation is generated, THE Hero_Availability_Tree SHALL compute the enemy team's likely pivot heroes if that ban is executed, based on the enemy's historical alternatives for the banned hero
2. WHEN multiple bans are executed against an enemy team, THE Hero_Availability_Tree SHALL compute the compounded hero pool collapse showing which hero options remain available to the enemy given their historical hero pool
3. WHEN computing pivot predictions, THE Hero_Availability_Tree SHALL reference the enemy team's actual match history to determine which heroes they have used as substitutes for specific roles or compositions
4. WHEN displaying ban recommendations, THE Hero_Availability_Tree SHALL show a "Jika di-ban: musuh kemungkinan beralih ke..." (If banned: enemy likely pivots to...) prediction for each recommended ban
5. IF the enemy team's historical data does not contain clear alternative heroes for a banned hero, THEN THE Hero_Availability_Tree SHALL indicate low confidence in pivot prediction rather than fabricating alternatives
6. THE Hero_Availability_Tree SHALL model at least 2 steps ahead (if X banned → enemy picks Y → then what remains for role Z)
7. THE Hero_Availability_Tree SHALL derive all pivot and collapse data exclusively through MatchHistoryService without fabricating hero relationships

