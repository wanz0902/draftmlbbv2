const fs = require('fs');
const path = require('path');

const statsPath = path.join(__dirname, '../data/heroes_stats.json');
const heroesDir = path.join(__dirname, '../data/heroes');

const statsData = JSON.parse(fs.readFileSync(statsPath, 'utf8'));

// Hardcoded comprehensive list of heroes (around 120+)
const allHeroes = [
  // Tanks
  "Tigreal", "Akai", "Franco", "Minotaur", "Johnson", "Gatotkaca", "Grock", "Hylos", "Uranus", "Belerick", "Khufra", "Baxia", "Gloo", "Edith", "Fredrinn", "Chip",
  // Fighters
  "Balmond", "Alucard", "Bane", "Zilong", "Freya", "Chou", "Sun", "Alpha", "Ruby", "Hilda", "Lapu-Lapu", "Roger", "Argus", "Jawhead", "Martis", "Kaja", "Aldous", "Leomord", "Thamuz", "Minsitthar", "Badang", "Guinevere", "Terizla", "X.Borg", "Dyrroth", "Silvanna", "Yu Zhong", "Khaleed", "Paquito", "Phoveus", "Aulus", "Yin", "Julian", "Arlott", "Cici", "Suyou", "Masha", "Barats",
  // Assassins
  "Saber", "Karina", "Fanny", "Hayabusa", "Natalia", "Lancelot", "Helcurt", "Gusion", "Selena", "Hanzo", "Ling", "Benedetta", "Aamon", "Joy", "Nolan",
  // Mages
  "Alice", "Nana", "Eudora", "Gord", "Kagura", "Cyclops", "Aurora", "Vexana", "Harley", "Odette", "Zhask", "Pharsa", "Valir", "Chang'e", "Vale", "Lunox", "Harith", "Esmeralda", "Lylia", "Cecilion", "Luo Yi", "Yve", "Valentina", "Xavier", "Novaria", "Zhuxin", "Kadita", "Faramis",
  // Marksmen
  "Miya", "Bruno", "Clint", "Layla", "Yi Sun-shin", "Moskov", "Karrie", "Irithel", "Lesley", "Hanabi", "Claude", "Kimmy", "Granger", "Wanwan", "Popol and Kupa", "Brody", "Beatrix", "Natan", "Melissa", "Ixia",
  // Supports
  "Rafaela", "Lolita", "Estes", "Diggie", "Angela", "Carmilla", "Mathilda", "Floryn"
];

// Combine unique heroes
const heroSet = new Set(allHeroes);
statsData.forEach(h => heroSet.add(h.hero_name));

const getRole = (name) => {
  const n = name.toLowerCase();
  if (["tigreal", "akai", "franco", "minotaur", "johnson", "gatotkaca", "grock", "hylos", "uranus", "belerick", "khufra", "baxia", "gloo", "edith", "fredrinn", "chip"].includes(n)) return "TANK";
  if (["balmond", "alucard", "bane", "zilong", "freya", "chou", "sun", "alpha", "ruby", "hilda", "lapu-lapu", "roger", "argus", "jawhead", "martis", "kaja", "aldous", "leomord", "thamuz", "minsitthar", "badang", "guinevere", "terizla", "x.borg", "dyrroth", "silvanna", "yu zhong", "khaleed", "paquito", "phoveus", "aulus", "yin", "julian", "arlott", "cici", "suyou", "masha", "barats"].includes(n)) return "FIGHTER";
  if (["saber", "karina", "fanny", "hayabusa", "natalia", "lancelot", "helcurt", "gusion", "selena", "hanzo", "ling", "benedetta", "aamon", "joy", "nolan"].includes(n)) return "ASSASSIN";
  if (["alice", "nana", "eudora", "gord", "kagura", "cyclops", "aurora", "vexana", "harley", "odette", "zhask", "pharsa", "valir", "chang'e", "vale", "lunox", "harith", "esmeralda", "lylia", "cecilion", "luo yi", "yve", "valentina", "xavier", "novaria", "zhuxin", "kadita", "faramis"].includes(n)) return "MAGE";
  if (["miya", "bruno", "clint", "layla", "yi sun-shin", "moskov", "karrie", "irithel", "lesley", "hanabi", "claude", "kimmy", "granger", "wanwan", "popol and kupa", "brody", "beatrix", "natan", "melissa", "ixia"].includes(n)) return "MARKSMAN";
  if (["rafaela", "lolita", "estes", "diggie", "angela", "carmilla", "mathilda", "floryn"].includes(n)) return "SUPPORT";
  return "FIGHTER";
};

const getLane = (role) => {
  switch(role) {
    case "TANK": case "SUPPORT": return "ROAM";
    case "ASSASSIN": return "JUNGLE";
    case "MAGE": return "MID";
    case "MARKSMAN": return "GOLD";
    case "FIGHTER": return "EXP";
    default: return "EXP";
  }
}

heroSet.forEach(heroName => {
  const safeId = heroName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const heroPath = path.join(heroesDir, `${safeId}.json`);
  
  if (!fs.existsSync(heroPath)) {
    const role = getRole(heroName);
    const lane = getLane(role);

    const baseData = {
      id: safeId,
      heroName: heroName,
      role: role,
      specialty: ["General"],
      lane: lane,
      releaseYear: 2020,
      baseStats: {
        hp: 2500,
        hpRegen: 35,
        mana: 400,
        manaRegen: 15,
        physicalAttack: 110,
        physicalDefense: 20,
        magicPower: 0,
        magicDefense: 15,
        attackSpeed: 0.8,
        attackSpeedRatio: 0,
        movementSpeed: 250
      },
      skills: [
        {
          name: "Passive Skill",
          type: "PASSIVE",
          description: "Hero passive description.",
          cooldown: [],
          manaCost: [],
          damageType: "NONE",
          scaling: "None",
          crowdControlType: "NONE",
          strategicTags: ["Utility"]
        },
        {
          name: "First Skill",
          type: "SKILL_1",
          description: "Deals damage to enemies.",
          cooldown: [7, 6.5, 6, 5.5, 5, 4.5],
          manaCost: [50, 55, 60, 65, 70, 75],
          damageType: role === "MAGE" ? "MAGIC" : "PHYSICAL",
          scaling: role === "MAGE" ? "50% Magic Power" : "50% Physical Attack",
          crowdControlType: "NONE",
          strategicTags: ["Damage"]
        },
        {
          name: "Second Skill",
          type: "SKILL_2",
          description: "Provides mobility or crowd control.",
          cooldown: [10, 9.5, 9, 8.5, 8, 7.5],
          manaCost: [60, 65, 70, 75, 80, 85],
          damageType: role === "MAGE" ? "MAGIC" : "PHYSICAL",
          scaling: role === "MAGE" ? "40% Magic Power" : "40% Physical Attack",
          crowdControlType: "SLOW",
          strategicTags: ["Mobility"]
        },
        {
          name: "Ultimate Skill",
          type: "ULTIMATE",
          description: "Unleashes a powerful attack.",
          cooldown: [40, 35, 30],
          manaCost: [100, 120, 140],
          damageType: role === "MAGE" ? "MAGIC" : "PHYSICAL",
          scaling: role === "MAGE" ? "100% Magic Power" : "100% Physical Attack",
          crowdControlType: "STUN",
          strategicTags: ["Burst", "CC"]
        }
      ],
      aiTags: {
        tempo: "MID",
        powerSpikeTiming: "Level 4",
        comfortProfiles: ["Standard " + role],
        macroIdentity: "Standard " + role,
        draftSignals: ["Versatile Pick"],
        synergy: [],
        counters: [],
        counteredBy: [],
        deceptionValue: "MEDIUM"
      }
    };

    fs.writeFileSync(heroPath, JSON.stringify(baseData, null, 2), 'utf8');
    console.log(`Generated ${heroName}`);
  }
});
