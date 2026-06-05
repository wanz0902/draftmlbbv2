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
  
  // Legacy mappings to prevent breaks
  name?: string;
  lane?: string;
  strategicData?: any;
  aiTags?: any;
}

