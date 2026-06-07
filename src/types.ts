export interface HeroStats {
  rank: string;
  hero_name: string;
  role?: string | string[];
  lane?: string;
  lanes?: string[];
  flex_lanes?: string[];
  role_tags?: string[];
  primary_lane?: string;
  picks_total: string;
  picks_win: string;
  picks_loss: string;
  winrate: string;
  tournament_presence: string;
  blue_side_picks: string;
  blue_side_win: string;
  blue_side_loss: string;
  blue_side_wr: string;
  red_side_picks: string;
  red_side_win: string;
  red_side_loss: string;
  red_side_wr: string;
  bans_total: string;
  bans_presence: string;
  picks_bans_total: string;
  picks_bans_presence: string;
  id?: string;
  tier?: string;
  win_rate?: number;
  pick_rate?: number;
  counters?: string[];
  countered_by?: string[];
  synergies?: string[];
}

export interface TeamLogoMap {
  [teamKey: string]: string;
}

export interface TeamStats {
  name: string;
  key: string;
  logo: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  mostPickedHeroes: string[];
  mostBannedHeroes: string[];
}

export interface GameParticipantTeam {
  name: string;
  picks: string[];
  bans: string[];
}

export interface MatchGame {
  game: number;
  winner: string;
  score: string;
  duration: string;
  map: string;
  blueTeam: GameParticipantTeam;
  redTeam: GameParticipantTeam;
  mvp?: string;
}

export interface Match {
  match: string;
  blueTeam: string;
  redTeam: string;
  score: string;
  date: string;
  mvp: string;
  games: MatchGame[];
}

export interface Item {
  name: string;
  category: string;
  image: string;
  gold: number | null;
  stats: string[] | null;
  uniqueAttributes: string[] | null;
  passive: string | null;
  description: string | null;
  abilities: Array<{ type: string; name: string; description: string }> | null;
  buildFrom: string[] | null;
  buildsInto: string[] | null;
  isEnriched: boolean;
  slug?: string;
  source?: string;
  sourceUrl?: string;
  sourceUpdatedAt?: string;
  dataQuality?: string;
}

export interface DraftState {
  blueTeamBans: string[]; // 5 bans
  redTeamBans: string[]; // 5 bans
  blueTeamPicks: string[]; // 5 picks
  redTeamPicks: string[]; // 5 picks
  currentPhase: "BANS_1" | "PICKS_1" | "BANS_2" | "PICKS_2" | "COMPLETED";
  turnIndex: number; // index in the sequence of actions
}
