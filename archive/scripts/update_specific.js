import fs from 'fs';

const data = {
  Aamon: { role: ["Assassin"], lane: "Jungle", flex_lanes: ["Mid"] },
  Akai: { role: ["Tank"], lane: "Roam", flex_lanes: ["Jungle", "EXP"] },
  Aldous: { role: ["Fighter"], lane: "EXP", flex_lanes: ["Jungle"] },
  Alice: { role: ["Mage"], lane: "Mid", flex_lanes: ["EXP", "Roam", "Jungle"] },
  Alpha: { role: ["Fighter"], lane: "EXP", flex_lanes: ["Jungle"] },
  Alucard: { role: ["Fighter", "Assassin"], lane: "Jungle", flex_lanes: ["EXP"] },
  Angela: { role: ["Support"], lane: "Roam", flex_lanes: ["Mid"] },
  Argus: { role: ["Fighter"], lane: "EXP", flex_lanes: ["Jungle"] },
  Arlott: { role: ["Fighter", "Assassin"], lane: "EXP", flex_lanes: ["Jungle", "Roam"] },
  Atlas: { role: ["Tank"], lane: "Roam", flex_lanes: ["EXP"] },
  Aurora: { role: ["Mage"], lane: "Mid", flex_lanes: ["Roam"] },
  Aulus: { role: ["Fighter"], lane: "Jungle", flex_lanes: ["EXP"] },
  Badang: { role: ["Fighter"], lane: "EXP", flex_lanes: ["Gold"] },
  Balmond: { role: ["Fighter"], lane: "Jungle", flex_lanes: ["EXP"] },
  Bane: { role: ["Fighter", "Mage"], lane: "EXP", flex_lanes: ["Mid", "Gold", "Jungle"] },
  Barats: { role: ["Tank", "Fighter"], lane: "Jungle", flex_lanes: ["EXP", "Roam"] },
  Baxia: { role: ["Tank"], lane: "Roam", flex_lanes: ["Jungle"] },
  Beatrix: { role: ["Marksman"], lane: "Gold", flex_lanes: ["Mid"] },
  Belerick: { role: ["Tank"], lane: "Roam", flex_lanes: ["EXP"] },
  Benedetta: { role: ["Assassin", "Fighter"], lane: "EXP", flex_lanes: ["Jungle"] },
  Brody: { role: ["Marksman"], lane: "Gold", flex_lanes: ["Mid"] },
  Bruno: { role: ["Marksman"], lane: "Gold", flex_lanes: ["Jungle"] },
  Carmilla: { role: ["Support", "Tank"], lane: "Roam", flex_lanes: ["EXP"] },
  Cecilion: { role: ["Mage"], lane: "Mid", flex_lanes: ["Gold"] },
  "Chang'e": { role: ["Mage"], lane: "Mid", flex_lanes: ["Gold"] },
  Chip: { role: ["Tank", "Support"], lane: "Roam", flex_lanes: ["EXP"] },
  Chou: { role: ["Fighter"], lane: "EXP", flex_lanes: ["Roam", "Jungle"] },
  Cici: { role: ["Fighter"], lane: "EXP", flex_lanes: ["Jungle"] },
  Claude: { role: ["Marksman"], lane: "Gold", flex_lanes: ["Jungle"] },
  Clint: { role: ["Marksman"], lane: "Gold", flex_lanes: ["Mid"] },
  Cyclops: { role: ["Mage"], lane: "Mid", flex_lanes: ["Jungle"] },
  Diggie: { role: ["Support"], lane: "Roam", flex_lanes: ["Mid"] },
  Dyrroth: { role: ["Fighter"], lane: "EXP", flex_lanes: ["Jungle"] },
  Edith: { role: ["Tank", "Marksman"], lane: "EXP", flex_lanes: ["Gold", "Roam"] },
  Esmeralda: { role: ["Mage", "Tank"], lane: "EXP", flex_lanes: ["Mid", "Jungle"] },
  Estes: { role: ["Support"], lane: "Roam", flex_lanes: ["Mid"] },
  Eudora: { role: ["Mage"], lane: "Mid", flex_lanes: ["Roam"] },
  Fanny: { role: ["Assassin"], lane: "Jungle", flex_lanes: ["EXP"] },
  Faramis: { role: ["Mage", "Support"], lane: "Mid", flex_lanes: ["Roam"] },
  Floryn: { role: ["Support"], lane: "Roam", flex_lanes: ["Mid"] },
  Franco: { role: ["Tank"], lane: "Roam", flex_lanes: ["EXP"] },
  Fredrinn: { role: ["Tank", "Fighter"], lane: "Jungle", flex_lanes: ["EXP", "Roam"] },
  Freya: { role: ["Fighter"], lane: "EXP", flex_lanes: ["Jungle"] }
};

const masterPath = './src/data/heroes_master.json';
const heroes = JSON.parse(fs.readFileSync(masterPath, 'utf8'));

for (const hero of heroes) {
  const nm = hero.hero_name;
  if (data[nm]) {
    hero.role = data[nm].role;
    hero.lane = data[nm].lane;
    hero.lanes = [data[nm].lane, ...data[nm].flex_lanes].filter((v, i, a) => a.indexOf(v) === i);
    hero.flex_lanes = data[nm].flex_lanes;
  }
}

fs.writeFileSync(masterPath, JSON.stringify(heroes, null, 2), 'utf8');
console.log('Updated heroes_master.json');
