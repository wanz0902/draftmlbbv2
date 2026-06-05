# Requirements Document

## Introduction

The MPL Match Center is a comprehensive match viewing and analytics feature for the MLBB Draft Simulator's Team Analytics page. It provides a structured view of MPL Indonesia Season 17 regular season matches organized by week and day, with proper series deduplication, consistent date formatting, and detailed game-level draft data. The feature introduces new API endpoints and a standings system based on series record, structured for integration with the Draft Coach system.

## Glossary

- **Match_Center**: The primary UI view within Team Analytics that displays all MPL ID S17 regular season series organized by week and day
- **Series**: A best-of-3 (BO3) match between two teams consisting of 2-3 individual games
- **Game**: A single match within a series, containing draft picks, bans, winner, and duration data
- **Week**: A numbered period (1-9) in the MPL ID S17 regular season schedule containing 2-3 match days
- **Day**: A numbered match day (1-3) within a week containing 2-4 series
- **Dedup_Engine**: The deduplication logic that prevents the same series from appearing multiple times when merged from two data sources
- **ISO_Date**: A date formatted as "YYYY-MM-DD" (e.g., "2026-03-27") used as the internal canonical date format
- **Display_Date**: A human-readable date format (e.g., "27 Mar 2026") used in the UI presentation layer
- **Standings**: A ranking of teams based on series wins and losses (not individual game wins/losses)
- **Match_Center_API**: The backend endpoint at GET /api/mpl/match-center that returns all series grouped by week and day
- **Team_Matches_API**: The backend endpoint at GET /api/mpl/team/:teamId/matches that returns filtered series for a specific team
- **Source_A**: The regular_matches.json data file containing structured series with human-readable dates (e.g., "March 27, 2026")
- **Source_B**: The matches.json data file containing flat individual games with ISO dates (e.g., "2026-05-24")
- **Draft_Data**: The picks and bans for both blue and red sides in a single game
- **Week_Map**: A lookup structure that maps ISO dates to their corresponding week and day numbers based on the MPL ID S17 schedule

## Requirements

### Requirement 1: Date Normalization

**User Story:** As a developer, I want all match dates normalized to ISO format internally, so that deduplication and sorting operate on consistent date representations.

#### Acceptance Criteria

1. WHEN Source_A data is loaded, THE Dedup_Engine SHALL convert human-readable dates (e.g., "March 27, 2026") to ISO_Date format ("2026-03-27") before any comparison or storage
2. WHEN Source_B data is loaded, THE Dedup_Engine SHALL validate that dates are already in ISO_Date format and pass them through unchanged
3. THE Dedup_Engine SHALL store all SeriesMatch date fields in ISO_Date format internally
4. IF a date string cannot be parsed into a valid ISO_Date, THEN THE Dedup_Engine SHALL log a warning and assign the date "1970-01-01" as a fallback

### Requirement 2: Series Deduplication

**User Story:** As a user, I want each series to appear exactly once in the match list, so that I see accurate match counts and statistics.

#### Acceptance Criteria

1. THE Dedup_Engine SHALL generate deduplication keys using: sorted normalized team names + ISO_Date + game count
2. WHEN two series produce the same deduplication key, THE Dedup_Engine SHALL retain only the series with more complete draft data (more non-empty pick/ban arrays)
3. WHEN both series have equal draft data completeness, THE Dedup_Engine SHALL retain the Source_A entry (structured data takes priority)
4. THE Dedup_Engine SHALL produce exactly zero duplicate series in the final merged dataset
5. WHEN processing ONIC team data, THE Dedup_Engine SHALL produce exactly 25 total series (20 wins, 5 losses) as the validation target

### Requirement 3: Week and Day Assignment

**User Story:** As a user, I want matches grouped by week and day, so that I can browse the MPL schedule in a structured way.

#### Acceptance Criteria

1. THE Week_Map SHALL map each ISO_Date in the MPL ID S17 schedule to a week number (1-9) and day number (1-3)
2. WHEN a SeriesMatch date matches an entry in the Week_Map, THE Match_Center SHALL assign the corresponding week and day numbers to that series
3. IF a SeriesMatch date does not exist in the Week_Map, THEN THE Match_Center SHALL assign week 0 and day 0 to indicate an unscheduled match
4. THE Match_Center SHALL group series first by week (ascending), then by day (ascending) within each week

### Requirement 4: Match Center API Endpoint

**User Story:** As a frontend developer, I want a single API endpoint that returns all series grouped by week and day, so that I can render the Match Center view efficiently.

#### Acceptance Criteria

1. WHEN a GET request is made to /api/mpl/match-center, THE Match_Center_API SHALL respond with a JSON object containing: ok (boolean), season (string), weeks (array), standings (array), seriesCount (number), gamesCount (number)
2. THE Match_Center_API SHALL structure the weeks array as objects with week number and days sub-array, where each day contains day number, ISO date, and series array
3. THE Match_Center_API SHALL include a standings array sorted by series wins descending, with each entry containing team name, series wins, series losses, and series win rate
4. THE Match_Center_API SHALL compute standings based on series record (wins/losses of entire BO3 sets) and not individual game wins/losses
5. IF no data is available, THEN THE Match_Center_API SHALL respond with ok: true and empty weeks array with zero counts

### Requirement 5: Team Matches API Endpoint

**User Story:** As a frontend developer, I want a team-specific matches endpoint that returns filtered series with summary statistics, so that I can build team-focused match views.

#### Acceptance Criteria

1. WHEN a GET request is made to /api/mpl/team/:teamId/matches, THE Team_Matches_API SHALL respond with a JSON object containing: ok (boolean), teamId (string), summary (object), series (array)
2. THE Team_Matches_API SHALL include in the summary object: total series count, wins, losses, winrate (percentage as integer), and total games count
3. WHEN a result query parameter is provided with value "win" or "lose", THE Team_Matches_API SHALL filter series to only those where the specified team won or lost respectively
4. WHEN an opponent query parameter is provided, THE Team_Matches_API SHALL filter series to only those where the opposing team matches the normalized opponent name
5. WHEN a week query parameter is provided, THE Team_Matches_API SHALL filter series to only those in the specified week number
6. THE Team_Matches_API SHALL normalize the teamId path parameter using the same team name normalization logic (e.g., "onic" resolves to "ONIC")

### Requirement 6: Match Center UI - Week Navigation

**User Story:** As a user, I want to navigate between weeks using tabs or buttons, so that I can quickly jump to specific weeks of the MPL season.

#### Acceptance Criteria

1. THE Match_Center SHALL display a horizontal row of week selectors labeled "Week 1" through "Week 9"
2. WHEN a user selects a week tab, THE Match_Center SHALL display only the series from that selected week
3. THE Match_Center SHALL visually distinguish the currently selected week from unselected weeks
4. WHEN the Match Center first loads, THE Match_Center SHALL display the most recent week that contains completed series

### Requirement 7: Match Center UI - Day Grouping

**User Story:** As a user, I want series within each week grouped by match day with clear date headers, so that I can understand the schedule structure.

#### Acceptance Criteria

1. WHILE a week is selected, THE Match_Center SHALL display day grouping headers showing the day number and formatted Display_Date (e.g., "Day 1 — 27 Mar 2026")
2. THE Match_Center SHALL display series cards beneath their respective day grouping headers in chronological order
3. WHEN a day contains no series, THE Match_Center SHALL omit that day header entirely from the view

### Requirement 8: Series Card Display

**User Story:** As a user, I want each series card to show the essential match information at a glance, so that I can quickly identify results.

#### Acceptance Criteria

1. THE Match_Center SHALL display each series card with: team names, series score (e.g., "2-1"), format badge (BO3), Display_Date, and win/lose badge relative to the selected team context
2. WHEN a user clicks or taps a series card, THE Match_Center SHALL expand the card to reveal individual game details
3. WHEN a series card is expanded, THE Match_Center SHALL display for each game: game number, blue/red team names, pick heroes (with icons), ban heroes (with icons), winner indicator, and duration
4. THE Match_Center SHALL display hero icons using the existing hero asset resolution system (getHeroImageUrl with fallback)

### Requirement 9: Filter Bar

**User Story:** As a user, I want to filter series by result, opponent, and week, so that I can focus on specific match subsets.

#### Acceptance Criteria

1. THE Match_Center SHALL provide result filter buttons: "All", "Win", "Lose"
2. THE Match_Center SHALL provide an opponent search input that filters series where the opposing team matches the typed text
3. THE Match_Center SHALL provide a week filter dropdown or selector to filter series by a specific week
4. WHEN multiple filters are active simultaneously, THE Match_Center SHALL apply all filters using AND logic (intersection of all filter conditions)
5. WHEN filters are applied, THE Match_Center SHALL update the stats header to reflect the filtered dataset

### Requirement 10: Stats Header

**User Story:** As a user, I want to see aggregate statistics for the currently displayed matches, so that I can understand overall performance.

#### Acceptance Criteria

1. THE Match_Center SHALL display a stats header showing: total series count, wins, losses, winrate percentage, and total games count
2. WHEN filters change the displayed dataset, THE Match_Center SHALL recalculate and update the stats header to reflect only the filtered series
3. THE Match_Center SHALL compute winrate as: round((wins / total series) * 100) expressed as an integer percentage

### Requirement 11: Standings Display

**User Story:** As a user, I want to see team standings based on series record, so that I can understand the competitive rankings.

#### Acceptance Criteria

1. THE Match_Center SHALL display a standings table with columns: rank, team name, series wins, series losses, and series win rate
2. THE Match_Center SHALL sort standings by series wins descending, with series win rate as a tiebreaker
3. THE Match_Center SHALL compute standings from the complete dataset (unaffected by active filters)
4. THE Match_Center SHALL calculate series win rate as: round((series wins / total series played) * 100)

### Requirement 12: Draft Coach Integration Structure

**User Story:** As a developer, I want series and game data structured with complete draft information, so that the Draft Coach system can consume match history for recommendation logic.

#### Acceptance Criteria

1. THE Match_Center_API SHALL include for each game within a series: bluePicks (array of 5 hero names), redPicks (array of 5 hero names), blueBans (array of 5 hero names), redBans (array of 5 hero names)
2. THE Match_Center_API SHALL include the winner field for each game, normalized to the canonical team abbreviation
3. THE Match_Center_API SHALL preserve game ordering within a series as sequential gameNumber values (1, 2, 3)
4. WHEN draft data is incomplete or missing for a game, THE Match_Center_API SHALL return empty arrays for the missing pick/ban fields rather than omitting the fields

### Requirement 13: Date Display Formatting

**User Story:** As a user, I want dates displayed in a readable format in the UI while maintaining ISO format for data operations, so that the interface is user-friendly.

#### Acceptance Criteria

1. THE Match_Center SHALL store and transmit dates in ISO_Date format in all API responses and internal data structures
2. WHEN rendering dates in the UI, THE Match_Center SHALL format them as Display_Date (e.g., "27 Mar 2026")
3. THE Match_Center SHALL perform date formatting exclusively in the frontend presentation layer, not in the API response
