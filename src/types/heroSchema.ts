export interface HeroSkill {
  name: string;
  type: "PASSIVE" | "SKILL_1" | "SKILL_2" | "SKILL_3" | "ULTIMATE";
  description: string;
  cooldown: number[];
  manaCost: number[];
  damageType: "PHYSICAL" | "MAGIC" | "TRUE" | "MIXED" | "NONE";
  scaling: string;
  crowdControlType:
    | "STUN"
    | "SLOW"
    | "KNOCKUP"
    | "ROOT"
    | "SUPPRESS"
    | "PULL"
    | "SILENCE"
    | "DISARM"
    | "NONE"
    | string;
  strategicTags: string[];
  comboUsage?: string;
  strategicPurpose?: string;
  macroUsage?: string;
  teamfightValue?: string;
  weaknesses?: string;
  counterplay?: string;
}

export interface HeroBaseStats {
  hp: number;
  hpRegen: number;
  mana: number;
  manaRegen: number;
  physicalAttack: number;
  physicalDefense: number;
  magicPower: number;
  magicDefense: number;
  attackSpeed: number;
  attackSpeedRatio: number;
  movementSpeed: number;
}

export interface AdvancedHeroData {
  id: string;
  heroName: string;
  role: "TANK" | "FIGHTER" | "ASSASSIN" | "MAGE" | "MARKSMAN" | "SUPPORT";
  secondaryRole?:
    | "TANK"
    | "FIGHTER"
    | "ASSASSIN"
    | "MAGE"
    | "MARKSMAN"
    | "SUPPORT";
  specialty: string[];
  lane: "EXP" | "GOLD" | "MID" | "JUNGLE" | "ROAM" | string;
  releaseYear: number;
  difficulty?: number;
  metaTier?: "S+" | "S" | "A" | "B" | "C" | "D";

  baseStats: HeroBaseStats;
  skills: HeroSkill[];

  aiTags: {
    heroDraftIdentity?: string;
    tempo: "EARLY" | "MID" | "LATE" | string;
    powerSpikeTiming: string;
    draftSignalValue?: string;
    hiddenGameplanSynergy?: string;
    macroIdentity: string;
    objectiveControlValue?: string;
    snowballPotential?: string;
    flexibilityRating?: number; // 1-10
    deceptionValue: "LOW" | "MEDIUM" | "HIGH" | string;
    comfortPickImportance?: string;
    counterRisk?: string;
  };

  draftPhilosophyTags?: string[];

  matchupSystem?: {
    strongAgainst: string[];
    weakAgainst: string[];
    synergyHeroes: string[];
    counterHeroes: string[];
    threatLevel: number; // 1-10
    draftPairings: string[];
  };
}
