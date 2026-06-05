import fs from "fs";
import path from "path";

type Game = {
  gameId?: string;
  seriesId?: string;
  gameNumber: number;
  blueTeam: string;
  redTeam: string;
  winner: string;
  duration?: string;
  mapMode?: string;
  bluePicks?: string[];
  redPicks?: string[];
  blueBans?: string[];
  redBans?: string[];
};

type Series = {
  seriesId: string;
  week: number;
  day: number;
  date: string;
  teamA: string;
  teamB: string;
  teamAScore: number;
  teamBScore: number;
  winner: string;
  loser: string;
  games: Game[];
};

const EXPECTED_SERIES = 72;
const EXPECTED_GAMES = 174;
const EXPECTED: Record<string, { series: [number, number]; games: [number, number] }> = {
  ONIC: { series: [13, 3], games: [29, 8] },
  TLID: { series: [10, 6], games: [21, 16] },
  DEWA: { series: [9, 7], games: [22, 17] },
  BTR: { series: [9, 7], games: [20, 21] },
  EVOS: { series: [8, 8], games: [18, 17] },
  GEEK: { series: [8, 8], games: [19, 19] },
  AE: { series: [7, 9], games: [19, 25] },
  NAVI: { series: [6, 10], games: [18, 22] },
  RRQ: { series: [2, 14], games: [8, 29] },
};

const dataPath = path.join(process.cwd(), "data", "mpl_id_s17_regular_season.json");
const dataset = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const series: Series[] = dataset.series || [];
const failures: string[] = [];

function fail(message: string) {
  failures.push(message);
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

function sameScoreAsGames(item: Series) {
  const scoreA = item.games.filter((game) => game.winner === item.teamA).length;
  const scoreB = item.games.filter((game) => game.winner === item.teamB).length;
  return scoreA === item.teamAScore && scoreB === item.teamBScore;
}

if (series.length !== EXPECTED_SERIES) {
  fail(`Total series mismatch: got ${series.length}, expected ${EXPECTED_SERIES}`);
}

const totalGames = series.reduce((sum, item) => sum + item.games.length, 0);
if (totalGames !== EXPECTED_GAMES) {
  fail(`Total games mismatch: got ${totalGames}, expected ${EXPECTED_GAMES}`);
}

const seriesIds = new Set<string>();
const gameIds = new Set<string>();
const records = Object.fromEntries(
  Object.keys(EXPECTED).map((team) => [team, { sw: 0, sl: 0, gw: 0, gl: 0, all: 0, win: 0, lose: 0 }]),
);

for (const item of series) {
  if (!item.seriesId) fail("Series missing seriesId");
  if (seriesIds.has(item.seriesId)) fail(`Duplicate seriesId: ${item.seriesId}`);
  seriesIds.add(item.seriesId);

  if (!item.week || item.week < 1 || item.week > 9) fail(`${item.seriesId}: invalid/missing week`);
  if (!item.day || item.day < 1 || item.day > 3) fail(`${item.seriesId}: invalid/missing day`);
  if (!isIsoDate(item.date)) fail(`${item.seriesId}: invalid date ${item.date}`);
  if (!item.teamA || !item.teamB) fail(`${item.seriesId}: missing teamA/teamB`);
  if (!item.winner || !item.loser) fail(`${item.seriesId}: missing winner/loser`);

  const expectedGameCount = item.teamAScore === 2 && item.teamBScore === 0 ? 2 : item.teamAScore === 0 && item.teamBScore === 2 ? 2 : 3;
  if (item.games.length !== expectedGameCount) {
    fail(`${item.seriesId}: game count ${item.games.length} does not match score ${item.teamAScore}-${item.teamBScore}`);
  }
  if (!sameScoreAsGames(item)) {
    fail(`${item.seriesId}: game winners do not match series score`);
  }

  if (records[item.winner]) records[item.winner].sw++;
  if (records[item.loser]) records[item.loser].sl++;
  if (records[item.teamA]) records[item.teamA].all++;
  if (records[item.teamB]) records[item.teamB].all++;
  if (records[item.winner]) records[item.winner].win++;
  if (records[item.loser]) records[item.loser].lose++;

  const gameNumbers = new Set<number>();
  for (const game of item.games) {
    const gameKey = game.gameId || `${item.seriesId}-g${game.gameNumber}`;
    if (gameIds.has(gameKey)) fail(`Duplicate game: ${gameKey}`);
    gameIds.add(gameKey);
    if (gameNumbers.has(game.gameNumber)) fail(`${item.seriesId}: duplicate Game ${game.gameNumber}`);
    gameNumbers.add(game.gameNumber);

    if (game.seriesId && game.seriesId !== item.seriesId) fail(`${item.seriesId}: game ${game.gameNumber} has mismatched seriesId ${game.seriesId}`);
    if (!game.duration) fail(`${item.seriesId} game ${game.gameNumber}: missing duration`);
    if (!game.mapMode) fail(`${item.seriesId} game ${game.gameNumber}: missing mapMode`);
    if (!game.blueTeam || !game.redTeam) fail(`${item.seriesId} game ${game.gameNumber}: missing blue/red team`);
    if (!game.winner) fail(`${item.seriesId} game ${game.gameNumber}: missing winner`);
    if (!Array.isArray(game.bluePicks) || game.bluePicks.length !== 5) fail(`${item.seriesId} game ${game.gameNumber}: invalid blue picks`);
    if (!Array.isArray(game.redPicks) || game.redPicks.length !== 5) fail(`${item.seriesId} game ${game.gameNumber}: invalid red picks`);
    if (!Array.isArray(game.blueBans) || game.blueBans.length !== 5) fail(`${item.seriesId} game ${game.gameNumber}: invalid blue bans`);
    if (!Array.isArray(game.redBans) || game.redBans.length !== 5) fail(`${item.seriesId} game ${game.gameNumber}: invalid red bans`);

    for (const team of [game.blueTeam, game.redTeam]) {
      if (!records[team]) continue;
      if (game.winner === team) records[team].gw++;
      else records[team].gl++;
    }
  }
}

for (const [team, expected] of Object.entries(EXPECTED)) {
  const actual = records[team];
  const [seriesWins, seriesLosses] = expected.series;
  const [gameWins, gameLosses] = expected.games;
  if (actual.sw !== seriesWins || actual.sl !== seriesLosses) {
    fail(`${team}: series record ${actual.sw}-${actual.sl}, expected ${seriesWins}-${seriesLosses}`);
  }
  if (actual.gw !== gameWins || actual.gl !== gameLosses) {
    fail(`${team}: game record ${actual.gw}-${actual.gl}, expected ${gameWins}-${gameLosses}`);
  }
  if (actual.all !== 16) fail(`${team}: all filter count ${actual.all}, expected 16`);
  if (actual.win !== seriesWins) fail(`${team}: win filter count ${actual.win}, expected ${seriesWins}`);
  if (actual.lose !== seriesLosses) fail(`${team}: lose filter count ${actual.lose}, expected ${seriesLosses}`);
}

if (failures.length > 0) {
  console.error("MPL S17 audit FAILED");
  console.error(failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("MPL S17 audit PASSED");
console.log(`Series: ${series.length}`);
console.log(`Games: ${totalGames}`);
for (const team of Object.keys(EXPECTED)) {
  const actual = records[team];
  console.log(`${team}: series ${actual.sw}-${actual.sl}, games ${actual.gw}-${actual.gl}, filters all/win/lose ${actual.all}/${actual.win}/${actual.lose}`);
}
