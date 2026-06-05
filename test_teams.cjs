const fs = require('fs');
const regularData = JSON.parse(fs.readFileSync('data/regular_matches.json', 'utf8'));

regularData.forEach((m, idx) => {
  if (!m.blueTeam || !m.redTeam) {
    console.log(`Missing blueTeam/redTeam at index ${idx}`);
  }
});

const historyData = JSON.parse(fs.readFileSync('data/matches.json', 'utf8'));
historyData.forEach((m, idx) => {
  if (!m.team1 || !m.team2) {
    console.log(`Missing team1/team2 in history at index ${idx}`);
  }
});
