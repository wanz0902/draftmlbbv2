/**
 * MatchHistoryService — Groups flat game entries into series, merges with
 * structured data, deduplicates, and provides filtered team match history.
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Normalize a team name to a canonical uppercase key */
function normalizeTeamName(name: string): string {
  if (!name) return "UNKNOWN";
  const lower = name.toLowerCase().trim();
  if (lower.includes("onic")) return "ONIC";
  if (lower.includes("team liquid id") || lower.includes("liquid") || lower.includes("tlid")) return "TLID";
  if (lower.includes("dewa united") || lower.includes("dewa")) return "DEWA";
  if (lower.includes("bigetron") || lower.includes("btr")) return "BTR";
  if (lower.includes("evos")) return "EVOS";
  if (lower.includes("geek fam") || lower.includes("geek")) return "GEEK";
  if (lower.includes("alter ego") || lower.includes("ae")) return "AE";
  if (lower.includes("natus vincere") || lower.includes("navi")) return "NAVI";
  if (lower.includes("rrq") || lower.includes("rex regum")) return "RRQ";
  return name.trim().toUpperCase();
}

export { normalizeTeamName };

// ─── Interfaces ────────────────────────────────────────────────────────────────

/** A single game within a series */
export interface Game {
  gameId?: string;
  seriesId?: string;
  gameNumber: number;
  week?: number;
  day?: number;
  blueTeam: string;
  redTeam: string;
  winner: string;
  loser: string;
  duration: string;
  patch: string;
  mvp?: string;
  mapMode: string;
  bluePicks: string[];
  redPicks: string[];
  blueBans: string[];
  redBans: string[];
}

/** A complete series (BO3/BO5) between two teams */
export interface SeriesMatch {
  id: string;
  tournament: string;
  date: string;
  patch: string;
  week: number;
  day: number;
  teamA: string;
  teamB: string;
  teamAScore: number;
  teamBScore: number;
  winner: string;
  loser: string;
  format: "BO3" | "BO5";
  games: Game[];
}

/** Response shape returned by the API endpoint */
export interface MatchHistoryResponse {
  totalMatches: number;
  filteredMatches: number;
  wins: number;
  losses: number;
  winrate: number;
  series: SeriesMatch[];
  gamesCount: number;
  gameWins: number;
  gameLosses: number;
  gameRecord: string;
}

/** Filter parameters accepted by getTeamMatches */
export interface MatchHistoryFilters {
  result?: "all" | "win" | "lose";
  tournament?: string;
  patch?: string;
  opponent?: string;
  week?: number;
}

/** Raw entry from matches.json (Source Format B) — flat individual game */
export interface SourceFormatBEntry {
  date: string;
  tournament: string;
  team1: string;
  draft1: string[]; // 10 heroes: first 5 picks, last 5 bans
  team2: string;
  draft2: string[]; // 10 heroes: first 5 picks, last 5 bans
  winner: string;
  length: string;
  patch: string;
}

/** Raw entry from regular_matches.json (Source Format A) — structured series */
export interface SourceFormatAEntry {
  match: string;
  blueTeam: string;
  redTeam: string;
  score: string;
  date: string;
  mvp: string;
  games: {
    game: number;
    winner: string;
    score: string;
    duration: string;
    map: string;
    blueTeam: { name: string; picks: string[]; bans: string[] };
    redTeam: { name: string; picks: string[]; bans: string[] };
  }[];
}

// ─── Service Class ─────────────────────────────────────────────────────────────

export class MatchHistoryService {
  private allSeries: SeriesMatch[] = [];

  constructor() {
    // Initialization — data loaded via loadData()
  }

  /** Safely read and parse a JSON file, returning fallback on error */
  private safeJson(filePath: string, fallback: any): any {
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
      }
    } catch (error) {
      console.error(`[MatchHistoryService] Error reading file ${filePath}:`, error);
    }
    return fallback;
  }

  /** Load normalized MPL dataset (single source of truth) */
  loadData(): void {
    // Primary source: normalized dataset (72 series, validated standings)
    const normalizedPath = path.join(process.cwd(), "data", "mpl_id_s17_regular_season.json");
    const normalized = this.safeJson(normalizedPath, null);

    if (normalized && normalized.series && normalized.series.length > 0) {
      // Use normalized dataset directly
      this.allSeries = normalized.series.map((s: any): SeriesMatch => ({
        id: s.seriesId || "",
        tournament: s.tournament || "MPL Indonesia",
        date: s.date || "",
        patch: s.patch || "",
        week: s.week || 0,
        day: s.day || 0,
        teamA: s.teamA,
        teamB: s.teamB,
        teamAScore: s.teamAScore,
        teamBScore: s.teamBScore,
        winner: s.winner,
        loser: s.loser,
        format: s.format || "BO3",
        games: (s.games || []).map((g: any): Game => ({
          gameId: g.gameId,
          seriesId: g.seriesId || s.seriesId || "",
          gameNumber: g.gameNumber,
          week: s.week || 0,
          day: s.day || 0,
          blueTeam: g.blueTeam,
          redTeam: g.redTeam,
          winner: g.winner,
          loser: g.loser,
          duration: g.duration || "Data tidak tersedia",
          patch: g.patch || "",
          mvp: g.mvp || "Data tidak tersedia",
          mapMode: g.mapMode || "Data tidak tersedia",
          bluePicks: g.bluePicks || [],
          redPicks: g.redPicks || [],
          blueBans: g.blueBans || [],
          redBans: g.redBans || [],
        })),
      }));
      const gamesCount = this.allSeries.reduce((sum, s) => sum + s.games.length, 0);
      console.log(`[MatchHistoryService] Loaded ${this.allSeries.length} series (${gamesCount} games) from normalized dataset`);
      return;
    }

    // Fallback: build from regular_matches.json only (Source A)
    const regularMatchesPath = path.join(process.cwd(), "data", "regular_matches.json");
    const sourceAData: SourceFormatAEntry[] = this.safeJson(regularMatchesPath, []);
    this.allSeries = this.convertSourceA(sourceAData);
    const gamesCount = this.allSeries.reduce((sum, s) => sum + s.games.length, 0);
    console.log(`[MatchHistoryService] Loaded ${this.allSeries.length} series (${gamesCount} games) from regular_matches.json fallback`);
  }

  /**
   * Group flat games (Source Format B) into series.
   * Uses date + sorted normalized team names as a grouping key.
   */
  groupGamesIntoSeries(flatGames: SourceFormatBEntry[]): SeriesMatch[] {
    // Step 1 & 2: Group entries by key (sorted normalized team names + date)
    const groups = new Map<string, SourceFormatBEntry[]>();

    for (const entry of flatGames) {
      const normTeam1 = normalizeTeamName(entry.team1);
      const normTeam2 = normalizeTeamName(entry.team2);
      const sortedTeams = [normTeam1, normTeam2].sort();
      const key = `${sortedTeams[0]}|${sortedTeams[1]}|${entry.date}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(entry);
    }

    // Step 3 & 4: Process each group into one or more series
    const result: SeriesMatch[] = [];

    for (const [, entries] of groups) {
      // Split into chunks of max 5 if overflow
      const chunks: SourceFormatBEntry[][] = [];
      if (entries.length <= 5) {
        chunks.push(entries);
      } else {
        for (let i = 0; i < entries.length; i += 5) {
          chunks.push(entries.slice(i, i + 5));
        }
      }

      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];
        const firstEntry = chunk[0];

        // Normalize team names for the series
        const teamA = normalizeTeamName(firstEntry.team1);
        const teamB = normalizeTeamName(firstEntry.team2);

        // Build Game objects with sequential game numbers
        const games: Game[] = chunk.map((entry, idx) => {
          const draft1 = this.splitDraft(entry.draft1 || []);
          const draft2 = this.splitDraft(entry.draft2 || []);

          const blueTeam = normalizeTeamName(entry.team1);
          const redTeam = normalizeTeamName(entry.team2);
          const winner = normalizeTeamName(entry.winner);
          const loser = winner === blueTeam ? redTeam : blueTeam;

          return {
            seriesId: "",
            gameNumber: idx + 1,
            week: 0,
            day: 0,
            blueTeam,
            redTeam,
            winner,
            loser,
            duration: entry.length || "Data tidak tersedia",
            patch: entry.patch || "",
            mvp: "Data tidak tersedia",
            mapMode: "Data tidak tersedia",
            bluePicks: draft1.picks,
            redPicks: draft2.picks,
            blueBans: draft1.bans,
            redBans: draft2.bans,
          };
        });

        // Determine series winner, scores, and format
        const { winner, loser, teamAScore, teamBScore } =
          this.determineSeriesWinner(games, teamA, teamB);
        const format = this.determineFormat(games.length);

        // Generate unique series ID
        const hashInput = `${firstEntry.date}${teamA}${teamB}${chunkIndex}`;
        const id = crypto
          .createHash("md5")
          .update(hashInput)
          .digest("hex")
          .slice(0, 12);

        result.push({
          id,
          tournament: firstEntry.tournament || "",
          date: firstEntry.date || "",
          patch: firstEntry.patch || "",
          week: 0,
          day: 0,
          teamA,
          teamB,
          teamAScore,
          teamBScore,
          winner,
          loser,
          format,
          games,
        });
      }
    }

    return result;
  }

  /** Convert Source Format A entries to SeriesMatch[] */
  convertSourceA(entries: SourceFormatAEntry[]): SeriesMatch[] {
    const result: SeriesMatch[] = [];

    for (const entry of entries) {
      const teamA = normalizeTeamName(entry.blueTeam);
      const teamB = normalizeTeamName(entry.redTeam);

      // Parse score string "2-1" → left = blueTeam (teamA) score, right = redTeam (teamB) score
      const scoreParts = (entry.score || "0-0").split("-");
      const teamAScore = parseInt(scoreParts[0], 10) || 0;
      const teamBScore = parseInt(scoreParts[1], 10) || 0;

      // Determine winner/loser from scores
      const winner = teamAScore >= teamBScore ? teamA : teamB;
      const loser = winner === teamA ? teamB : teamA;

      // Convert each game entry to a Game object
      const games: Game[] = (entry.games || []).map((g) => {
        const blueTeam = normalizeTeamName(g.blueTeam?.name || "");
        const redTeam = normalizeTeamName(g.redTeam?.name || "");
        const gameWinner = normalizeTeamName(g.winner || "");
        const gameLoser = gameWinner === blueTeam ? redTeam : blueTeam;

        return {
          seriesId: "",
          gameNumber: g.game,
          week: 0,
          day: 0,
          blueTeam,
          redTeam,
          winner: gameWinner,
          loser: gameLoser,
          duration: g.duration || "Data tidak tersedia",
          patch: "",
          mvp: "Data tidak tersedia",
          mapMode: g.map || "Data tidak tersedia",
          bluePicks: g.blueTeam?.picks || [],
          redPicks: g.redTeam?.picks || [],
          blueBans: g.blueTeam?.bans || [],
          redBans: g.redTeam?.bans || [],
        };
      });

      // Determine format from game count
      const format = this.determineFormat(games.length);

      // Generate unique ID: md5(date + teamA + teamB) sliced to 12 chars
      const id = crypto
        .createHash("md5")
        .update(`${entry.date}${teamA}${teamB}`)
        .digest("hex")
        .slice(0, 12);

      result.push({
        id,
        tournament: "MPL Indonesia Season 17",
        date: entry.date || "",
        patch: "",
        week: 0,
        day: 0,
        teamA,
        teamB,
        teamAScore,
        teamBScore,
        winner,
        loser,
        format,
        games,
      });
    }

    return result;
  }

  /** Merge and deduplicate series from both sources */
  mergeAndDeduplicate(seriesA: SeriesMatch[], seriesB: SeriesMatch[]): SeriesMatch[] {
    // Step 1: Concatenate both source arrays
    const combined = [...seriesA, ...seriesB];

    // Step 2: Deduplicate using a key based on sorted normalized team names + date + game count
    const seen = new Map<string, SeriesMatch>();

    for (const series of combined) {
      const normA = normalizeTeamName(series.teamA);
      const normB = normalizeTeamName(series.teamB);
      const sortedTeams = [normA, normB].sort();
      const dedupKey = `${sortedTeams[0]}|${sortedTeams[1]}|${series.date}|${series.games.length}`;

      // Keep first occurrence only
      if (!seen.has(dedupKey)) {
        seen.set(dedupKey, series);
      }
    }

    // Step 3: Sort by date descending (most recent first)
    const deduplicated = Array.from(seen.values());

    deduplicated.sort((a, b) => {
      const dateA = this.parseDate(a.date);
      const dateB = this.parseDate(b.date);

      if (dateA && dateB) {
        return dateB.getTime() - dateA.getTime();
      }
      // If one or both fail to parse, fall back to string comparison (descending)
      if (dateA && !dateB) return -1;
      if (!dateA && dateB) return 1;
      return b.date.localeCompare(a.date);
    });

    return deduplicated;
  }

  /** Parse a date string in either ISO format or human-readable format */
  private parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    // Try ISO format first (e.g., "2026-05-24")
    const isoDate = new Date(dateStr);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }

    // Try human-readable format (e.g., "March 27, 2026")
    const parsed = Date.parse(dateStr);
    if (!isNaN(parsed)) {
      return new Date(parsed);
    }

    return null;
  }

  /** Get filtered match history for a specific team */
  getTeamMatches(teamId: string, filters: MatchHistoryFilters): MatchHistoryResponse {
    // Step 1: Normalize the incoming teamId
    const normalizedTeamId = normalizeTeamName(teamId);

    // Step 2: Get all series where this team is involved (teamA or teamB)
    const allTeamMatches = this.allSeries.filter(
      (s) => s.teamA === normalizedTeamId || s.teamB === normalizedTeamId
    );
    const totalMatches = allTeamMatches.length;

    // Step 3: Apply filters in sequence
    let filtered = allTeamMatches;

    // 3a. Result filter — operates at SERIES level
    const resultFilter = filters.result || "all";
    if (resultFilter === "win") {
      filtered = filtered.filter((s) => s.winner === normalizedTeamId);
    } else if (resultFilter === "lose") {
      filtered = filtered.filter((s) => s.loser === normalizedTeamId);
    }
    // "all" → no additional filtering

    // 3b. Tournament filter (case-insensitive includes)
    if (filters.tournament) {
      const tournamentLower = filters.tournament.toLowerCase();
      filtered = filtered.filter((s) =>
        s.tournament.toLowerCase().includes(tournamentLower)
      );
    }

    // 3c. Patch filter (exact match)
    if (filters.patch) {
      filtered = filtered.filter((s) => s.patch === filters.patch);
    }

    if (filters.week && Number.isFinite(filters.week)) {
      filtered = filtered.filter((s) => s.week === filters.week);
    }

    // 3d. Opponent filter — the OTHER team in the series must match
    if (filters.opponent) {
      const normalizedOpponent = normalizeTeamName(filters.opponent);
      filtered = filtered.filter((s) => {
        const otherTeam =
          s.teamA === normalizedTeamId ? s.teamB : s.teamA;
        return otherTeam === normalizedOpponent;
      });
    }

    filtered = [...filtered].sort((a, b) => {
      const dateDiff =
        new Date(b.date || "1970-01-01").getTime() -
        new Date(a.date || "1970-01-01").getTime();
      if (dateDiff !== 0) return dateDiff;
      if (b.week !== a.week) return b.week - a.week;
      return b.day - a.day;
    });

    // Step 4: Compute stats from the filtered results
    const filteredMatches = filtered.length;
    const wins = filtered.filter((s) => s.winner === normalizedTeamId).length;
    const losses = filtered.filter((s) => s.loser === normalizedTeamId).length;
    const winrate =
      filteredMatches > 0 ? Math.round((wins / filteredMatches) * 100) : 0;
    const gamesCount = filtered.reduce((sum, s) => sum + s.games.length, 0);
    let gameWins = 0;
    let gameLosses = 0;
    for (const series of filtered) {
      for (const game of series.games) {
        if (game.winner === normalizedTeamId) gameWins++;
        else if (game.blueTeam === normalizedTeamId || game.redTeam === normalizedTeamId) gameLosses++;
      }
    }

    // Step 5: Return MatchHistoryResponse
    return {
      totalMatches,
      filteredMatches,
      wins,
      losses,
      winrate,
      series: filtered,
      gamesCount,
      gameWins,
      gameLosses,
      gameRecord: `${gameWins}-${gameLosses}`,
    };
  }

  getAllSeries(): SeriesMatch[] {
    return [...this.allSeries].sort((a, b) => {
      const dateDiff =
        new Date(b.date || "1970-01-01").getTime() -
        new Date(a.date || "1970-01-01").getTime();
      if (dateDiff !== 0) return dateDiff;
      if (b.week !== a.week) return b.week - a.week;
      return b.day - a.day;
    });
  }

  getStandings() {
    const records = new Map<string, {
      team: string;
      wins: number;
      losses: number;
      gameWins: number;
      gameLosses: number;
    }>();

    const ensure = (team: string) => {
      if (!records.has(team)) {
        records.set(team, { team, wins: 0, losses: 0, gameWins: 0, gameLosses: 0 });
      }
      return records.get(team)!;
    };

    for (const series of this.allSeries) {
      ensure(series.winner).wins++;
      ensure(series.loser).losses++;
      for (const game of series.games) {
        const blue = ensure(game.blueTeam);
        const red = ensure(game.redTeam);
        if (game.winner === game.blueTeam) {
          blue.gameWins++;
          red.gameLosses++;
        } else if (game.winner === game.redTeam) {
          red.gameWins++;
          blue.gameLosses++;
        }
      }
    }

    return [...records.values()]
      .map((record) => {
        const total = record.wins + record.losses;
        const gameDiff = record.gameWins - record.gameLosses;
        return {
          ...record,
          total,
          record: `${record.wins}-${record.losses}`,
          gameRecord: `${record.gameWins}-${record.gameLosses}`,
          gameDiff,
          winrate: total > 0 ? Math.round((record.wins / total) * 100) : 0,
        };
      })
      .sort((a, b) => b.wins - a.wins || a.losses - b.losses || b.gameDiff - a.gameDiff || a.team.localeCompare(b.team))
      .map((record, index) => ({ rank: index + 1, ...record }));
  }

  getMatchCenter() {
    const series = this.getAllSeries();
    const weeks = Array.from({ length: 9 }, (_, index) => {
      const week = index + 1;
      const weekSeries = series
        .filter((item) => item.week === week)
        .sort((a, b) => a.day - b.day || a.date.localeCompare(b.date));

      return {
        week,
        days: [1, 2, 3]
          .map((day) => ({
            day,
            series: weekSeries.filter((item) => item.day === day),
          }))
          .filter((group) => group.series.length > 0),
      };
    });

    return {
      ok: true,
      source: "data/mpl_id_s17_regular_season.json",
      totalSeries: this.allSeries.length,
      totalGames: this.allSeries.reduce((sum, item) => sum + item.games.length, 0),
      standings: this.getStandings(),
      weeks,
    };
  }

  /** Split a draft array of 10 heroes into picks (first 5) and bans (last 5) */
  splitDraft(draft: string[]): { picks: string[]; bans: string[] } {
    // Pad with empty strings if fewer than 10 elements
    const padded = [...draft];
    while (padded.length < 10) {
      padded.push("");
    }
    return {
      picks: padded.slice(0, 5),
      bans: padded.slice(5, 10),
    };
  }

  /** Determine series format based on game count */
  determineFormat(gameCount: number): "BO3" | "BO5" {
    if (gameCount >= 4) {
      return "BO5";
    }
    return "BO3";
  }

  /** Determine series winner from game results */
  determineSeriesWinner(
    games: { winner: string }[],
    teamA: string,
    teamB: string
  ): { winner: string; loser: string; teamAScore: number; teamBScore: number } {
    const normalizedA = teamA.trim().toLowerCase();
    const normalizedB = teamB.trim().toLowerCase();

    let teamAScore = 0;
    let teamBScore = 0;

    for (const game of games) {
      const normalizedWinner = game.winner.trim().toLowerCase();
      if (normalizedWinner === normalizedA) {
        teamAScore++;
      } else if (normalizedWinner === normalizedB) {
        teamBScore++;
      }
    }

    const winner = teamAScore >= teamBScore ? teamA : teamB;
    const loser = winner === teamA ? teamB : teamA;

    return { winner, loser, teamAScore, teamBScore };
  }
}
