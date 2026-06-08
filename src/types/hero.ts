export interface HeroSkill {
  type?: string;
  name: string;
  description: string;
  cooldown: number[] | string;
  manaCost: number[] | string;
  damageType: "Physical" | "Magic" | "True" | "Mixed" | "None" | string;
  scaling: string[];
  crowdControlType: string[];
  strategicTags: string[];
  comboUsage?: string;
  strategicPurpose?: string;
  macroUsage?: string;
  teamfightValue?: string;
  weaknesses?: string;
  counterplay?: string;
}

export interface MatchupEntry {
  name: string;
  advantage: number;
}

export interface SynergyEntry {
  name: string;
  synergy: number;
}

export interface MatchupSystem {
  strongAgainst: MatchupEntry[];
  weakAgainst: MatchupEntry[];
  synergyHeroes: SynergyEntry[];
  counterHeroes: any[];
  strongAgainstReason?: string;
  weakAgainstReason?: string;
  synergyReason?: string;
}

export interface PowerCurve {
  early: number;
  mid: number;
  late: number;
  spikeLevels: string[];
  coreItems: string[];
  dominantPhase: string;
  description: string;
}

export interface HeroAttributes {
  durability: number;
  offense: number;
  abilityEffects: number;
  difficulty: number;
}

export interface ProBuild {
  player: string;
  games: number;
  items: string[];
}

export interface Combo {
  name: string;
  sequence: string[];
  description: string;
}

export interface Connection {
  name: string;
  relationship: string;
}

export interface BestTeammate {
  name: string;
  winrateDelta: number;
}

export interface SkillVideos {
  passive: string | null;
  skill1: string | null;
  skill2: string | null;
  ultimate: string | null;
}

export interface DetailedHero {
  id: string;
  hero_name: string;
  role: string[];
  specialty: string[];
  lanes: string[];
  damage_type: string;
  tier: string;
  difficulty: "Easy" | "Medium" | "Hard" | string | number;
  pick_rate: number;
  ban_rate: number;
  win_rate: number;
  tournament_presence: number;
  gold_per_min: number;
  
  power_spike: string[];
  early_game: number;
  mid_game: number;
  late_game: number;
  farming_speed: number;
  teamfight_value: number;
  objective_control: number;
  mobility: number;
  crowd_control: number;
  
  counters: string[];
  synergies: string[];
  countered_by: string[];
  
  items: any[];
  emblems: any[];
  
  skills: any;
  draft_analysis: any;
  base_stats: any;
  pro_statistics: any;

  power_curve?: PowerCurve;
  hero_attributes?: HeroAttributes;
  pro_builds?: ProBuild[];
  combos?: Combo[];
  connections?: Connection[];
  best_teammates?: BestTeammate[];
  worst_teammates?: BestTeammate[];
  meta_score?: number;
  meta_rank?: number;
  matchup_system?: MatchupSystem;
  skill_videos?: SkillVideos;
  region?: string;
  race?: string;
  difficulty_label?: string;
  mechanicNote?: string;
  winRate?: number;
  pickRate?: number;
  banRate?: number;
  community_builds?: any[];
  mlbhub_builds?: any[];
  
  // Legacy mappings to prevent breaks
  name?: string;
  lane?: string;
  strategicData?: any;
  aiTags?: any;

  // camelCase aliases (API returns these from JSON files)
  heroName?: string;
  baseStats?: any;
  powerCurve?: PowerCurve;
  heroAttributes?: HeroAttributes;
  proBuilds?: ProBuild[];
  matchupSystem?: MatchupSystem;
  skillVideos?: SkillVideos;
  metaScore?: number;
  metaRank?: number;
  bestTeammates?: BestTeammate[];
  worstTeammates?: BestTeammate[];
  difficultyLabel?: string;
  communityBuilds?: any[];
  mlbhubBuilds?: any[];

  // Tactical profile tags
  playstyleTags?: string[];
  counterTags?: string[];
  synergyTags?: string[];
  draftTags?: string[];
  powerSpikeTags?: string[];
}

