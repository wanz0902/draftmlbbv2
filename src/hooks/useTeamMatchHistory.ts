import { useState, useEffect } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface GameData {
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
  games: GameData[];
}

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

export interface MatchHistoryFilters {
  result: "all" | "win" | "lose";
  tournament?: string;
  patch?: string;
  opponent?: string;
  week?: number;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

function useTeamMatchHistory(
  teamId: string | null,
  filters: MatchHistoryFilters
) {
  const [data, setData] = useState<MatchHistoryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("result", filters.result);
        if (filters.tournament) params.set("tournament", filters.tournament);
        if (filters.patch) params.set("patch", filters.patch);
        if (filters.opponent) params.set("opponent", filters.opponent);
        if (filters.week) params.set("week", String(filters.week));

        const url = `/api/team-analytics/${teamId}/matches?${params.toString()}`;
        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) {
          throw new Error(`Failed to fetch match history: ${response.status}`);
        }

        const json: MatchHistoryResponse = await response.json();
        setData(json);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";
        setError(message);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      controller.abort();
    };
  }, [teamId, filters.result, filters.tournament, filters.patch, filters.opponent, filters.week]);

  return { data, loading, error };
}

export default useTeamMatchHistory;
