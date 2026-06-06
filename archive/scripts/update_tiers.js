import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data/mlbb_master.db');
const jsonPath = path.join(process.cwd(), 'data/heroes_stats.json');
const db = new Database(dbPath);

let statsData = [];
try {
  statsData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
} catch (e) {
  console.log("Could not read mlbb_hero_stats.json", e);
}

const updateStmt = db.prepare('UPDATE heroes SET tier_rating = ?, tier_score = ?, win_rate_overall = ?, pick_rate_overall = ?, ban_rate_overall = ? WHERE hero_id = ?');

db.transaction(() => {
  for (const stat of statsData) {
    const rawName = stat.hero_name.toLowerCase().replace(/[^a-z0-9]/g, "");
    
    // Find the hero ID
    const row = db.prepare("SELECT hero_id FROM heroes WHERE LOWER(REPLACE(hero_name, ' ', '')) = ? OR LOWER(REPLACE(hero_name, '-', '')) = ?").get(rawName, rawName);
    
    if (row) {
      const wr = parseFloat((stat.winrate || "50%").replace("%", ""));
      const pr = parseFloat(stat.picks_total || "0");
      const br = parseFloat(stat.bans_total || "0");
      
      const score = (pr * 1.5) + (br * 2.0) + ((wr - 50) * 2.5);
      
      let tier = 'C';
      if (score > 120) tier = 'S+';
      else if (score > 80) tier = 'S';
      else if (score > 40) tier = 'A';
      else if (score > 15) tier = 'B';
      else if (score > -10) tier = 'C';
      else tier = 'D';

      updateStmt.run(tier, score, wr, pr, br, row.hero_id);
    }
  }
})();

console.log('Tiers and stats updated from JSON.');
