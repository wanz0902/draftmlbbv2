const fs = require('fs');
const path = require('path');

const masterPath = './src/data/heroes_master.json';
const heroesDir = path.join(__dirname, "data", "heroes");

const heroesMaster = JSON.parse(fs.readFileSync(masterPath, 'utf8'));

if (fs.existsSync(heroesDir)) {
  const files = fs.readdirSync(heroesDir);
  for (const file of files) {
    if (file.endsWith(".json")) {
      const filePath = path.join(heroesDir, file);
      const raw = fs.readFileSync(filePath, "utf-8");
      try {
        const hero = JSON.parse(raw);
        // Find in master
        const nameKey = (hero.id || file.replace(".json", "")).toLowerCase().replace(/[^a-z0-9]/g, "");
        const masterMatch = heroesMaster.find(h => h.hero_name.toLowerCase().replace(/[^a-z0-9]/g, "") === nameKey);
        
        if (masterMatch) {
            if (masterMatch.role && masterMatch.role.length > 0 && masterMatch.role[0] !== "Unknown") {
                hero.role = Array.isArray(masterMatch.role) ? masterMatch.role : [masterMatch.role];
            }
            if (masterMatch.lanes && masterMatch.lanes.length > 0) {
                // Set the primary lane to the first element
                hero.lane = masterMatch.lanes[0];
                hero.lanes = masterMatch.lanes;
            } else if (masterMatch.lane && masterMatch.lane !== "Unknown") {
                hero.lane = masterMatch.lane;
                hero.lanes = [masterMatch.lane];
            }
            
            // if we have specific flex_lanes
            if (masterMatch.flex_lanes) {
                hero.flex_lanes = masterMatch.flex_lanes;
            }

            fs.writeFileSync(filePath, JSON.stringify(hero, null, 2), "utf-8");
        }
      } catch (e) {
        console.error("Error with file: " + file);
      }
    }
  }
}
console.log("Synced data/heroes from heroes_master.json");
