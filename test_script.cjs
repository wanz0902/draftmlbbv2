const fs = require('fs');

const regularData = JSON.parse(fs.readFileSync('data/regular_matches.json', 'utf8'));
const historyData = JSON.parse(fs.readFileSync('data/matches.json', 'utf8'));

const normalizedHistory = Array.isArray(historyData)
  ? historyData.map((hm) => {
      const picks1 = (hm.draft1 || []).slice(0, 5);
      const bans1 = (hm.draft1 || []).slice(5, 10);
      const picks2 = (hm.draft2 || []).slice(0, 5);
      const bans2 = (hm.draft2 || []).slice(5, 10);

      const gameWinner = hm.winner || hm.team1;

      return {
        match: `${hm.team1} vs ${hm.team2}`,
        blueTeam: hm.team1,
        redTeam: hm.team2,
        score: gameWinner === hm.team1 ? "1-0" : "0-1",
        date: hm.date || "Unknown Date",
        mvp: "N/A",
        games: [
          {
            game: 1,
            winner: gameWinner,
            score: gameWinner === hm.team1 ? "1-0" : "0-1",
            duration: "N/A",
            blueTeam: { name: hm.team1, picks: picks1, bans: bans1 },
            redTeam: { name: hm.team2, picks: picks2, bans: bans2 }
          }
        ]
      };
    })
  : [];

const combined = [...regularData, ...normalizedHistory];
console.log("Total Matches:", combined.length);

function normalizeTeamName(name) {
  if (!name) return "";
  const matchDetailsMatch = name.match(/^(.*?)(?:\s+\(.*\))?$/);
  const coreName = matchDetailsMatch ? matchDetailsMatch[1].trim() : name;
  const n = coreName.toUpperCase();
  
  if (n.includes("ONIC") || n.includes("FNATIC")) return "ONIC";
  if (n.includes("TLID") || n.includes("LIQUID") || n.includes("AURA")) return "TLID";
  if (n.includes("BTR") || n.includes("BIGETRON") || n.includes("VITALITY")) return "BTR";
  if (n.includes("AE") || n.includes("ALTER EGO") || n.includes("ALTEREGO")) return "AE";
  if (n.includes("GEEK") || n.includes("FAM")) return "GEEK";
  if (n.includes("EVOS") || n.includes("GLORY")) return "EVOS";
  if (n.includes("RRQ") || n.includes("HOSHI")) return "RRQ";
  if (n.includes("DEWA") || n.includes("UNITED")) return "DEWA";
  if (n.includes("NAVI") || n.includes("NATUS VINCERE")) return "NAVI";
  if (n.includes("FLCN") || n.includes("FALCON")) return "FLCN";
  if (n.includes("S2G")) return "S2G";

  return coreName;
}

const tKey = "onic";
const teamMatches = combined.filter((m) => {
  const bTeam = normalizeTeamName(m.blueTeam).toLowerCase();
  const rTeam = normalizeTeamName(m.redTeam).toLowerCase();
  return bTeam === tKey || rTeam === tKey;
});

const matchResultFilter = "Kalah";
const matchTournamentFilter = "Semua Turnamen";
const matchPatchFilter = "Semua Patch";
const matchQuery = "";

const filteredMatches = teamMatches.filter((m) => {
  if (matchResultFilter !== "Semua Hasil") {
      const scoreParts = (m.score || "0-0").split("-").map(Number);
      const bWins = scoreParts[0] || 0;
      const rWins = scoreParts[1] || 0;
      const blueIsSelected = normalizeTeamName(m.blueTeam).toLowerCase() === tKey;
      
      let ourWins = blueIsSelected ? bWins : rWins;
      let enemyWins = blueIsSelected ? rWins : bWins;
      
      if (ourWins === 0 && enemyWins === 0) {
        (m.games || []).forEach((g) => {
          if (normalizeTeamName(g.winner).toLowerCase() === tKey) {
            ourWins++;
          } else if (g.winner && g.winner !== "N/A" && g.winner.trim() !== "") {
            enemyWins++;
          }
        });
      }
      
      const isWin = ourWins > enemyWins;
      const isLoss = enemyWins > ourWins;
      if (matchResultFilter === "Menang" && !isWin) return false;
      if (matchResultFilter === "Kalah" && !isLoss) return false;
  }

  // 2. Tournament filter
  if (matchTournamentFilter !== "Semua Turnamen") {
    const tourneyLower = (m).tournament || "MPL Indonesia Season 17 (Regular Season)";
    if (matchTournamentFilter === "MPL Indonesia Season 17 (Regular Season)") {
      // If match has no explicit tournament, it is regular season
      if ((m).tournament && (m).tournament !== "MPL Indonesia Season 17 (Regular Season)") {
        return false;
      }
    } else {
      if (tourneyLower !== matchTournamentFilter) return false;
    }
  }

  // 3. Patch Filter
  if (matchPatchFilter !== "Semua Patch") {
    const patchL = (m).patch || "N/A";
    if (patchL !== matchPatchFilter) return false;
  }

  // 4. Opponent Search Query
  if (matchQuery.trim() !== "") {
    const opp = normalizeTeamName(m.blueTeam).toLowerCase() === tKey ? m.redTeam : m.blueTeam;
    const fullName = opp.toLowerCase();
    const shortName = normalizeTeamName(opp).toLowerCase();
    const sLower = matchQuery.toLowerCase();
    if (!fullName.includes(sLower) && !shortName.includes(sLower)) return false;
  }

  return true;
});

console.log("Filtered:", filteredMatches.length);

