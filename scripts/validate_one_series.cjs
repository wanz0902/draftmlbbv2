const fs = require("fs");
const path = require("path");

const seriesId = process.argv[2] || "mpl-id-s17-w9-d2-btr-vs-onic";
const dataPath = path.join(__dirname, "..", "data", "mpl_id_s17_regular_season.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const series = data.series.find((item) => item.seriesId === seriesId);

if (!series) {
  console.error(`Series not found: ${seriesId}`);
  process.exit(1);
}

const expected = {
  seriesId: "mpl-id-s17-w9-d2-btr-vs-onic",
  week: 9,
  day: 2,
  date: "2026-05-23",
  teamA: "BTR",
  teamB: "ONIC",
  teamAScore: 2,
  teamBScore: 1,
  winner: "BTR",
  games: [
    {
      gameNumber: 1,
      blueTeam: "BTR",
      redTeam: "ONIC",
      winner: "BTR",
      duration: "17:22",
      mapMode: "Expanding Rivers",
      bluePicks: ["Phoveus", "Fanny", "Valentina", "Claude", "Gatotkaca"],
      redPicks: ["Terizla", "Suyou", "Pharsa", "Moskov", "Hylos"],
      blueBans: ["Marcel", "Harley", "Guinevere", "Chip", "Atlas"],
      redBans: ["Freya", "Zhuxin", "Kalea", "Valir", "Gloo"],
    },
    {
      gameNumber: 2,
      blueTeam: "BTR",
      redTeam: "ONIC",
      winner: "ONIC",
      duration: "15:39",
      mapMode: "Flying Cloud",
      bluePicks: ["Gloo", "Suyou", "Zhuxin", "Claude", "Hylos"],
      redPicks: ["Paquito", "Yi Sun-shin", "Valentina", "Freya", "Khaleed"],
      blueBans: ["Marcel", "Harley", "Sora", "Chip", "Chou"],
      redBans: ["Kalea", "Phoveus", "Fanny", "Arlott", "Lapu-Lapu"],
    },
    {
      gameNumber: 3,
      blueTeam: "BTR",
      redTeam: "ONIC",
      winner: "BTR",
      duration: "20:36",
      mapMode: "Expanding Rivers",
      bluePicks: ["Uranus", "Fanny", "Valir", "Claude", "Gatotkaca"],
      redPicks: ["Paquito", "Lancelot", "Zhuxin", "Moskov", "Kalea"],
      blueBans: ["Marcel", "Harley", "Valentina", "Fredrinn", "Yi Sun-shin"],
      redBans: ["Freya", "Phoveus", "Sora", "Zetian", "Lylia"],
    },
  ],
};

function sameArray(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, index) => value === b[index]);
}

function check(label, actual, wanted) {
  const ok = Array.isArray(wanted) ? sameArray(actual, wanted) : actual === wanted;
  if (!ok) {
    failures.push({ label, actual, expected: wanted });
  }
  return ok;
}

const failures = [];
check("seriesId", series.seriesId, expected.seriesId);
check("week", series.week, expected.week);
check("day", series.day, expected.day);
check("date", series.date, expected.date);
check("teamA", series.teamA, expected.teamA);
check("teamB", series.teamB, expected.teamB);
check("teamAScore", series.teamAScore, expected.teamAScore);
check("teamBScore", series.teamBScore, expected.teamBScore);
check("winner", series.winner, expected.winner);
check("games.length", series.games.length, expected.games.length);

for (const expectedGame of expected.games) {
  const game = series.games.find((item) => item.gameNumber === expectedGame.gameNumber);
  if (!game) {
    failures.push({ label: `game ${expectedGame.gameNumber}`, actual: null, expected: expectedGame });
    continue;
  }
  for (const key of [
    "blueTeam",
    "redTeam",
    "winner",
    "duration",
    "mapMode",
    "bluePicks",
    "redPicks",
    "blueBans",
    "redBans",
  ]) {
    check(`game ${expectedGame.gameNumber}.${key}`, game[key], expectedGame[key]);
  }
}

if (failures.length) {
  console.error(`FAIL ${seriesId}`);
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}

console.log(`PASS ${seriesId}`);
console.log(
  JSON.stringify(
    {
      week: series.week,
      day: series.day,
      date: series.date,
      score: `${series.teamA} ${series.teamAScore}-${series.teamBScore} ${series.teamB}`,
      games: series.games.map((game) => ({
        game: game.gameNumber,
        winner: game.winner,
        duration: game.duration,
        mapMode: game.mapMode,
        bluePicks: game.bluePicks,
        redPicks: game.redPicks,
        blueBans: game.blueBans,
        redBans: game.redBans,
      })),
    },
    null,
    2,
  ),
);
