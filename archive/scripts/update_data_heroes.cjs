const fs = require("fs");
const path = require("path");

const data = {
  aamon: { role: ["Assassin"], lane: "Jungle", flex_lanes: ["Mid"] },
  akai: { role: ["Tank"], lane: "Roam", flex_lanes: ["Jungle", "EXP"] },
  aldous: { role: ["Fighter"], lane: "EXP", flex_lanes: ["Jungle"] },
  alice: { role: ["Mage"], lane: "Mid", flex_lanes: ["EXP", "Roam", "Jungle"] },
  alpha: { role: ["Fighter"], lane: "EXP", flex_lanes: ["Jungle"] },
  alucard: { role: ["Fighter", "Assassin"], lane: "Jungle", flex_lanes: ["EXP"] },
  angela: { role: ["Support"], lane: "Roam", flex_lanes: ["Mid"] },
  argus: { role: ["Fighter"], lane: "EXP", flex_lanes: ["Jungle"] },
  arlott: { role: ["Fighter", "Assassin"], lane: "EXP", flex_lanes: ["Jungle", "Roam"] },
  atlas: { role: ["Tank"], lane: "Roam", flex_lanes: ["EXP"] },
  aurora: { role: ["Mage"], lane: "Mid", flex_lanes: ["Roam"] },
  aulus: { role: ["Fighter"], lane: "Jungle", flex_lanes: ["EXP"] },
  badang: { role: ["Fighter"], lane: "EXP", flex_lanes: ["Gold"] },
  balmond: { role: ["Fighter"], lane: "Jungle", flex_lanes: ["EXP"] },
  bane: { role: ["Fighter", "Mage"], lane: "EXP", flex_lanes: ["Mid", "Gold", "Jungle"] },
  barats: { role: ["Tank", "Fighter"], lane: "Jungle", flex_lanes: ["EXP", "Roam"] },
  baxia: { role: ["Tank"], lane: "Roam", flex_lanes: ["Jungle"] },
  beatrix: { role: ["Marksman"], lane: "Gold", flex_lanes: ["Mid"] },
  belerick: { role: ["Tank"], lane: "Roam", flex_lanes: ["EXP"] },
  benedetta: { role: ["Assassin", "Fighter"], lane: "EXP", flex_lanes: ["Jungle"] },
  brody: { role: ["Marksman"], lane: "Gold", flex_lanes: ["Mid"] },
  bruno: { role: ["Marksman"], lane: "Gold", flex_lanes: ["Jungle"] },
  carmilla: { role: ["Support", "Tank"], lane: "Roam", flex_lanes: ["EXP"] },
  cecilion: { role: ["Mage"], lane: "Mid", flex_lanes: ["Gold"] },
  "change": { role: ["Mage"], lane: "Mid", flex_lanes: ["Gold"] },
  chip: { role: ["Tank", "Support"], lane: "Roam", flex_lanes: ["EXP"] },
  chou: { role: ["Fighter"], lane: "EXP", flex_lanes: ["Roam", "Jungle"] },
  cici: { role: ["Fighter"], lane: "EXP", flex_lanes: ["Jungle"] },
  claude: { role: ["Marksman"], lane: "Gold", flex_lanes: ["Jungle"] },
  clint: { role: ["Marksman"], lane: "Gold", flex_lanes: ["Mid"] },
  cyclops: { role: ["Mage"], lane: "Mid", flex_lanes: ["Jungle"] },
  diggie: { role: ["Support"], lane: "Roam", flex_lanes: ["Mid"] },
  dyrroth: { role: ["Fighter"], lane: "EXP", flex_lanes: ["Jungle"] },
  edith: { role: ["Tank", "Marksman"], lane: "EXP", flex_lanes: ["Gold", "Roam"] },
  esmeralda: { role: ["Mage", "Tank"], lane: "EXP", flex_lanes: ["Mid", "Jungle"] },
  estes: { role: ["Support"], lane: "Roam", flex_lanes: ["Mid"] },
  eudora: { role: ["Mage"], lane: "Mid", flex_lanes: ["Roam"] },
  fanny: { role: ["Assassin"], lane: "Jungle", flex_lanes: ["EXP"] },
  faramis: { role: ["Mage", "Support"], lane: "Mid", flex_lanes: ["Roam"] },
  floryn: { role: ["Support"], lane: "Roam", flex_lanes: ["Mid"] },
  franco: { role: ["Tank"], lane: "Roam", flex_lanes: ["EXP"] },
  fredrinn: { role: ["Tank", "Fighter"], lane: "Jungle", flex_lanes: ["EXP", "Roam"] },
  freya: { role: ["Fighter"], lane: "EXP", flex_lanes: ["Jungle"] }
};

const heroesDir = path.join(__dirname, "data", "heroes");

if (fs.existsSync(heroesDir)) {
  const files = fs.readdirSync(heroesDir);
  for (const file of files) {
    if (file.endsWith(".json")) {
      const filePath = path.join(heroesDir, file);
      const raw = fs.readFileSync(filePath, "utf-8");
      try {
        const hero = JSON.parse(raw);
        const nameKey = (hero.id || file.replace(".json", "")).toLowerCase().replace(/[^a-z0-9]/g, "");
        if (data[nameKey]) {
          hero.role = data[nameKey].role;
          hero.lane = data[nameKey].lane;
          // In some schemas they expect array for lane, but some expect string, so let's set lane to primary string and add lanes array
          hero.lanes = [data[nameKey].lane, ...data[nameKey].flex_lanes].filter((v, i, a) => a.indexOf(v) === i);
          hero.flex_lanes = data[nameKey].flex_lanes;
          fs.writeFileSync(filePath, JSON.stringify(hero, null, 2), "utf-8");
        }
      } catch (e) {
        console.error("Error with file: " + file);
      }
    }
  }
}

console.log("Updated advanced hero data");
