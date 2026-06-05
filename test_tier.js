import Database from 'better-sqlite3';
const db = new Database('./data/mlbb_master.db');
const heroes = db.prepare("SELECT tier_rating, COUNT(*) as c FROM heroes GROUP BY tier_rating").all();
console.log(heroes);
