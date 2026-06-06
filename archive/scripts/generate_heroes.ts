import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const statsFile = path.join(DATA_DIR, 'heroes_stats.json');
const heroesDir = path.join(DATA_DIR, 'heroes');

// Read existing stats
let stats = [];
try {
  stats = JSON.parse(fs.readFileSync(statsFile, 'utf-8'));
} catch(e) {}

// A master list of all MLBB heroes roughly:
const allHeroes = [
  "Miya","Balmond","Saber","Alice","Nana","Tigreal","Alucard","Karina","Akai","Franco","Bane","Bruno","Clint","Rafaela","Eudora","Zilong","Fanny","Layla","Minotaur",
  "Lolita","Hayabusa","Freya","Gord","Natalia","Kagura","Chou","Sun","Alpha","Ruby","Yi Sun-shin","Moskov","Johnson","Cyclops","Estes","Hilda","Aurora",
  "Lapu-Lapu","Vexana","Roger","Karrie","Gatotkaca","Harley","Irithel","Grock","Argus","Odette","Lancelot","Diggie","Hylos","Zhask","Helcurt","Pharsa","Lesley","Jawhead",
  "Angela","Gusion","Valir","Martis","Uranus","Belerick","Chang'e","Kaja","Selena","Aldous","Claude","Vale","Leomord","Lunox","Hanzo","Badrang","Minsitthar",
  "Harith","Kadita","Badang","Khufra","Granger","Guinevere","Esmeralda","Terizla","X.Borg","Ling","Dyrroth","Lylia","Baxia","Masha","Carmilla","Wanwan","Silvanna",
  "Cecilion","Atlas","Popol and Kupa","Yu Zhong","Luo Yi","Benedetta","Khaleed","Barats","Brody","Yve","Mathilda","Paquito","Gloo","Beatrix","Phoveus","Natan","Aulus",
  "Aamon","Valentina","Edith","Floryn","Yin","Melissa","Xavier","Julian","Joy","Novaria","Arlott","Ixia","Nolan","Cici","Chip","Zhuxin","Suyou","Lukas", "Hanabi",
  "Belerick","Faramis", "Carmilla"
];

// Add heroes found in stats that might not be in the array
stats.forEach((h: any) => {
  if (h.hero_name && !allHeroes.includes(h.hero_name)) {
    allHeroes.push(h.hero_name);
  }
});

// Remove duplicates
const uniqueHeroes = [...new Set(allHeroes)];

if (!fs.existsSync(heroesDir)) fs.mkdirSync(heroesDir, { recursive: true });

uniqueHeroes.forEach(heroName => {
  const id = heroName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const file = path.join(heroesDir, `${id}.json`);
  if (!fs.existsSync(file)) {
    // Generate fallback data
    const heroData = {
      id: id,
      heroName: heroName,
      role: "UNKNOWN",
      secondaryRole: "",
      specialty: ["Unknown"],
      lane: "UNKNOWN",
      releaseYear: 2024,
      baseStats: {
        hp: 2500, hpRegen: 30, mana: 400, manaRegen: 15, physicalAttack: 110,
        physicalDefense: 20, magicPower: 0, magicDefense: 10, attackSpeed: 0.8,
        attackSpeedRatio: 100, movementSpeed: 250
      },
      skills: [
        {
          name: "Passive", type: "PASSIVE", description: "Intelligence data missing.",
          cooldown: [], manaCost: [], damageType: "NONE", scaling: "None", crowdControlType: [], strategicTags: []
        },
        {
          name: "Skill 1", type: "SKILL_1", description: "Intelligence data missing.",
          cooldown: [10], manaCost: [50], damageType: "PHYSICAL", scaling: "None", crowdControlType: [], strategicTags: []
        },
        {
          name: "Skill 2", type: "SKILL_2", description: "Intelligence data missing.",
          cooldown: [10], manaCost: [50], damageType: "PHYSICAL", scaling: "None", crowdControlType: [], strategicTags: []
        },
        {
          name: "Ultimate", type: "ULTIMATE", description: "Intelligence data missing.",
          cooldown: [30], manaCost: [100], damageType: "PHYSICAL", scaling: "None", crowdControlType: [], strategicTags: []
        }
      ],
      aiTags: {
        tempo: "MID",
        powerSpikeTiming: "Unknown",
        comfortProfiles: ["Data Pending"],
        macroIdentity: "Data Pending Analysis",
        draftSignals: ["Intelligence profile incomplete"],
        synergy: [], counters: [], counteredBy: [], deceptionValue: "LOW"
      },
      matchupSystem: {
        strongAgainst: [], weakAgainst: [], synergyHeroes: [], counterHeroes: []
      },
      draftPhilosophyTags: [],
      hiddenGameplans: [],
      objectiveControlValue: 5,
      snowballPotential: 5,
      flexibilityRating: 5,
      deceptionValue: 5
    };
    fs.writeFileSync(file, JSON.stringify(heroData, null, 2));
  }
});

console.log(`Generated all hero files in ${heroesDir}. Total heroes: ${uniqueHeroes.length}`);
