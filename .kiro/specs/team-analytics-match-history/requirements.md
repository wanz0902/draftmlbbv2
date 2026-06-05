# Requirements Document

## Introduction

The Team Analytics Match History feature is broken in the MLBB Draft Simulator. The current implementation fails to properly group individual games from `matches.json` into series (BO3/BO5), uses incorrect filter logic for Win/Lose at the series level, and the frontend displays loading skeletons without resolving data. This spec defines the requirements to fix the data pipeline, create a proper API endpoint, correct filter logic, and update the frontend to display grouped series with expandable game details.

## Glossary

- **Match_History_Service**: The server-side service responsible for reading, grouping, merging, and deduplicating match data from multiple JSON sources into a unified series-based format.
- **Series**: A competitive match between two teams consisting of multiple games (BO3 = best of 3, BO5 = best of 5). A series has a winner determined by which team wins the majority of games.
- **Game**: A single individual game within a series. Each game has its own draft (picks/bans), winner, duration, and game number.
- **Team_Analytics_API**: The Express.js endpoint `GET /api/team-analytics/:teamId/matches` that serves filtered, grouped series data for a specific team.
- **Team_Analytics_UI**: The React frontend component (`TeamAnalytics.tsx`) that displays match history as expandable series cards with game details inside.
- **Series_Grouping_Key**: The combination of normalized team names + date used to identify which individual games belong to the same series.
- **Source_Format_A**: The `regular_matches.json` format with proper series structure containing a `games[]` array, `score`, `blueTeam`, `redTeam` fields.
- **Source_Format_B**: The `matches.json` format with flat individual game entries containing `team1`, `team2`, `draft1[10]`, `draft2[10]`, `winner`, `length`, `patch`, `date` fields.

## Requirements

### Requirement 1: Series Grouping from Flat Game Data

**User Story:** As a user viewing team analytics, I want individual games from matches.json to be grouped into proper series, so that I see complete BO3/BO5 match results instead of separate unrelated games.

#### Acceptance Criteria

1. WHEN the Match_History_Service processes Source_Format_B entries, THE Match_History_Service SHALL group consecutive games with the same date and same two teams (regardless of team1/team2 order) into a single series.
2. WHEN a series is formed from grouped games, THE Match_History_Service SHALL assign sequential game numbers (1, 2, 3, ...) based on the order the games appear in the source data.
3. WHEN a series is formed, THE Match_History_Service SHALL determine the series winner as the team that won the majority of games within that series.
4. WHEN a series is formed, THE Match_History_Service SHALL compute the series score as "X-Y" where X is the winner's game wins and Y is the loser's game wins.
5. WHEN a Source_Format_B entry contains a `draft1` array of 10 heroes, THE Match_History_Service SHALL split the first 5 elements as picks and the last 5 elements as bans for team1.
6. WHEN a Source_Format_B entry contains a `draft2` array of 10 heroes, THE Match_History_Service SHALL split the first 5 elements as picks and the last 5 elements as bans for team2.

### Requirement 2: Data Source Merging and Deduplication

**User Story:** As a user viewing team analytics, I want match data from both data sources to be merged without duplicates, so that I see a complete and accurate match history.

#### Acceptance Criteria

1. THE Match_History_Service SHALL merge series from Source_Format_A and grouped series from Source_Format_B into a unified list.
2. WHEN two series from different sources have the same date, same two teams, and same game count, THE Match_History_Service SHALL treat them as duplicates and retain only one entry.
3. THE Match_History_Service SHALL normalize all team names using the existing `normalizeTeamName` function before performing grouping or deduplication.
4. THE Match_History_Service SHALL sort the final merged series list by date in descending order (most recent first).

### Requirement 3: Team-Specific Match History API Endpoint

**User Story:** As a frontend developer, I want a dedicated API endpoint that returns filtered match history for a specific team, so that the Team Analytics UI can reliably fetch and display series data.

#### Acceptance Criteria

1. THE Team_Analytics_API SHALL expose a `GET /api/team-analytics/:teamId/matches` endpoint that accepts `teamId` as a URL parameter.
2. THE Team_Analytics_API SHALL accept optional query parameters: `result` (values: "all", "win", "lose"), `tournament`, `patch`, `opponent`.
3. WHEN the `result` parameter is "win", THE Team_Analytics_API SHALL return only series where the specified team is the series winner.
4. WHEN the `result` parameter is "lose", THE Team_Analytics_API SHALL return only series where the specified team is the series loser.
5. WHEN the `result` parameter is "all" or absent, THE Team_Analytics_API SHALL return all series involving the specified team.
6. THE Team_Analytics_API SHALL return a JSON response containing: `totalMatches` (number), `filteredMatches` (number), `wins` (number), `losses` (number), `winrate` (number), `series` (array), and `gamesCount` (number).
7. WHEN a series is returned, each series object SHALL contain: `id`, `tournament`, `date`, `patch`, `teamA`, `teamB`, `teamAScore`, `teamBScore`, `winner`, `loser`, `format` (BO3 or BO5), and `games` array.
8. WHEN a game is returned within a series, each game object SHALL contain: `gameNumber`, `blueTeam`, `redTeam`, `winner`, `duration`, `bluePicks`, `redPicks`, `blueBans`, `redBans`.

### Requirement 4: Series-Level Filter Accuracy

**User Story:** As a user filtering match history, I want Win/Lose filters to operate at the series level, so that filtering by "Win" shows all series my team won (even if they lost individual games within the series).

#### Acceptance Criteria

1. WHEN filtering by "Win" for a team, THE Team_Analytics_API SHALL include a series if and only if the specified team is the series winner, regardless of individual game results.
2. WHEN filtering by "Lose" for a team, THE Team_Analytics_API SHALL include a series if and only if the specified team is the series loser, regardless of individual game results.
3. IF a series score is "2-1" and the specified team won 2 games, THEN THE Team_Analytics_API SHALL classify this series as a "Win" for that team.

### Requirement 5: Frontend Series Display

**User Story:** As a user viewing match history, I want series displayed as expandable cards showing all games within them, so that I can see the full draft and result details for each game in a series.

#### Acceptance Criteria

1. WHEN the Team_Analytics_UI loads, THE Team_Analytics_UI SHALL fetch data from the Team_Analytics_API endpoint instead of the legacy `/api/matches` and `/api/history` endpoints.
2. WHEN series data is returned, THE Team_Analytics_UI SHALL render each series as a card showing: teams, series score, date, tournament, and win/lose indicator.
3. WHEN a user expands a series card, THE Team_Analytics_UI SHALL display each game within the series with its game number label (Game 1, Game 2, Game 3), winner, duration, and draft details (picks and bans for both teams).
4. WHEN data is loading, THE Team_Analytics_UI SHALL display a loading skeleton.
5. WHEN data has loaded and the series list is empty, THE Team_Analytics_UI SHALL display an empty state message indicating no matches found.
6. WHEN data has loaded and the series list is non-empty, THE Team_Analytics_UI SHALL render all series cards without remaining in a loading state.

### Requirement 6: Series Format Validation

**User Story:** As a user, I want grouped series to have valid game counts for their format, so that BO3 series have 2-3 games and BO5 series have 3-5 games with no duplicates.

#### Acceptance Criteria

1. THE Match_History_Service SHALL assign format "BO3" to series with 2 or 3 games and "BO5" to series with 4 or 5 games.
2. THE Match_History_Service SHALL assign sequential game numbers within a series with no duplicate game numbers.
3. IF a group of games with the same Series_Grouping_Key contains more than 5 games, THEN THE Match_History_Service SHALL split them into multiple series of appropriate size.

### Requirement 7: Debug Information Cleanup

**User Story:** As a user in production, I want debug information hidden from the main UI, so that the interface remains clean and professional.

#### Acceptance Criteria

1. WHEN the application runs in production mode, THE Team_Analytics_UI SHALL hide debug information (match counts, filter counts, raw data dumps) from the main display.
2. WHEN the application runs in development mode, THE Team_Analytics_UI SHALL display debug information in a collapsible developer panel separate from the main match history content.
