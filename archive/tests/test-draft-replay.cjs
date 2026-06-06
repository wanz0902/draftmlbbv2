/**
 * DRAFT SEQUENCE REPLAY TEST
 * BTR vs ONIC — 23 May 2026, Game 1
 * 
 * Replays the draft through the MPL recommendation engine step-by-step.
 * For each draft action, freezes state, runs the engine, records top 10
 * recommendations, then compares against the actual next pick/ban.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ─── Normalize Team Name (mirrors matchHistoryService) ─────────────────────────
function normalizeTeamName(name) {
  if (!name) return "UNKNOWN";
  const lower = name.toLowerCase().trim();
  if (lower.includes("onic")) return "ONIC";
  if (lower.includes("team liquid id") || lower.includes("liquid") || lower.includes("tlid")) return "TLID";
  if (lower.includes("dewa united") || lower.includes("dewa")) return "DEWA";
  if (lower.includes("bigetron") || lower.includes("btr")) return "BTR";
  if (lower.includes("evos")) return "EVOS";
  if (lower.includes("geek fam") || lower.includes("geek")) return "GEEK";
  if (lower.includes("alter ego") || lower.includes("ae")) return "AE";
  if (lower.includes("natus vincere") || lower.includes("navi")) return "NAVI";
  if (lower.includes("rrq") || lower.includes("rex regum")) return "RRQ";
  return name.trim().toUpperCase();
}

function normalizeHeroKey(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// ─── Load Data ─────────────────────────────────────────────────────────────────
const dataDir = path.join(__dirname, 'data');

// Load normalized match dataset
const normalizedData = JSON.parse(fs.readFileSync(path.join(dataDir, 'mpl_id_s17_regular_season.json'), 'utf8'));
const allSeries = normalizedData.series;

// Find BTR vs ONIC 23 May 2026
const targetSeries = allSeries.find(s => 
  s.date === '2026-05-23' && 
  ((s.teamA === 'BTR' && s.teamB === 'ONIC') || (s.teamA === 'ONIC' && s.teamB === 'BTR'))
);

if (!targetSeries) {
  console.error('ERROR: BTR vs ONIC 23 May 2026 series not found!');
  process.exit(1);
}

const game1 = targetSeries.games[0];
console.log(`Found match: ${targetSeries.teamA} vs ${targetSeries.teamB}, Date: ${targetSeries.date}`);
console.log(`Game 1: Blue=${game1.blueTeam} Red=${game1.redTeam} Winner=${game1.winner}`);

// Load all hero data files for the hero database
const heroesDir = path.join(dataDir, 'heroes');
const heroFiles = fs.readdirSync(heroesDir).filter(f => f.endsWith('.json'));
const heroDatabase = heroFiles.map(f => {
  const hero = JSON.parse(fs.readFileSync(path.join(heroesDir, f), 'utf8'));
  // Ensure heroName field exists
  if (!hero.heroName) hero.heroName = hero.name;
  return hero;
});

console.log(`Loaded ${heroDatabase.length} heroes from database`);

// ─── Build Team Identity (mirrors teamIdentityEngine.ts) ───────────────────────

function buildTeamIdentity(teamId) {
  const normalizedTeamId = normalizeTeamName(teamId);
  
  // Get all series where this team participates
  const teamSeries = allSeries.filter(s => 
    s.teamA === normalizedTeamId || s.teamB === normalizedTeamId
  );
  
  // Flatten all games
  const allGames = [];
  for (const series of teamSeries) {
    for (const game of series.games) {
      allGames.push(game);
    }
  }
  
  const totalGames = allGames.length;
  const heroStatsMap = new Map();
  const pairTracker = new Map();
  
  let totalWins = 0;
  let totalLosses = 0;
  
  function getOrCreateHeroStats(heroName) {
    if (!heroStatsMap.has(heroName)) {
      heroStatsMap.set(heroName, {
        heroName,
        pickCount: 0,
        winCount: 0,
        lossCount: 0,
        winRate: 0,
        banCount: 0,
        banAgainstCount: 0,
        positions: [],
      });
    }
    return heroStatsMap.get(heroName);
  }
  
  for (const game of allGames) {
    const isBlue = normalizeTeamName(game.blueTeam) === normalizedTeamId;
    const isRed = normalizeTeamName(game.redTeam) === normalizedTeamId;
    if (!isBlue && !isRed) continue;
    
    const teamPicks = isBlue ? game.bluePicks : game.redPicks;
    const teamBans = isBlue ? game.blueBans : game.redBans;
    const opponentBans = isBlue ? game.redBans : game.blueBans;
    const isWin = normalizeTeamName(game.winner) === normalizedTeamId;
    
    if (isWin) totalWins++;
    else totalLosses++;
    
    // Track picks
    for (let i = 0; i < teamPicks.length; i++) {
      const hero = teamPicks[i];
      if (!hero) continue;
      const stats = getOrCreateHeroStats(hero);
      stats.pickCount++;
      stats.positions.push(i + 1);
      if (isWin) stats.winCount++;
      else stats.lossCount++;
    }
    
    // Track team bans
    for (const hero of teamBans) {
      if (!hero) continue;
      const stats = getOrCreateHeroStats(hero);
      stats.banCount++;
    }
    
    // Track bans against
    for (const hero of opponentBans) {
      if (!hero) continue;
      const stats = getOrCreateHeroStats(hero);
      stats.banAgainstCount++;
    }
    
    // Track pairings
    for (let i = 0; i < teamPicks.length; i++) {
      for (let j = i + 1; j < teamPicks.length; j++) {
        const heroA = teamPicks[i];
        const heroB = teamPicks[j];
        if (!heroA || !heroB) continue;
        const pairKey = [heroA, heroB].sort().join('|');
        if (!pairTracker.has(pairKey)) pairTracker.set(pairKey, { count: 0, wins: 0 });
        const pair = pairTracker.get(pairKey);
        pair.count++;
        if (isWin) pair.wins++;
      }
    }
  }
  
  // Compute winRate for each hero
  for (const [, stats] of heroStatsMap) {
    stats.winRate = stats.pickCount > 0 ? (stats.winCount / stats.pickCount) * 100 : 0;
  }
  
  // Comfort heroes: top 5, picked >= 3, WR > 50%
  const comfortHeroes = [];
  for (const [, stats] of heroStatsMap) {
    if (stats.pickCount >= 3 && stats.winRate > 50) {
      comfortHeroes.push({
        heroName: stats.heroName,
        pickCount: stats.pickCount,
        winRate: stats.winRate,
        winCount: stats.winCount,
      });
    }
  }
  comfortHeroes.sort((a, b) => b.pickCount - a.pickCount || b.winRate - a.winRate);
  const top5Comfort = comfortHeroes.slice(0, 5);
  
  // First pick preferences
  const firstPickMap = new Map();
  for (const game of allGames) {
    const isBlue = normalizeTeamName(game.blueTeam) === normalizedTeamId;
    const isRed = normalizeTeamName(game.redTeam) === normalizedTeamId;
    if (!isBlue && !isRed) continue;
    const teamPicks = isBlue ? game.bluePicks : game.redPicks;
    const isWin = normalizeTeamName(game.winner) === normalizedTeamId;
    if (teamPicks.length > 0 && teamPicks[0]) {
      const hero = teamPicks[0];
      if (!firstPickMap.has(hero)) firstPickMap.set(hero, { count: 0, wins: 0 });
      const e = firstPickMap.get(hero);
      e.count++;
      if (isWin) e.wins++;
    }
  }
  const firstPickPreferences = [];
  for (const [heroName, data] of firstPickMap) {
    firstPickPreferences.push({
      heroName,
      count: data.count,
      winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
    });
  }
  firstPickPreferences.sort((a, b) => b.count - a.count);
  
  // Most contested heroes
  const mostContestedHeroes = [];
  for (const [, stats] of heroStatsMap) {
    const totalContest = stats.pickCount + stats.banCount + stats.banAgainstCount;
    if (totalContest > 0) {
      mostContestedHeroes.push({
        heroName: stats.heroName,
        pickCount: stats.pickCount,
        banCount: stats.banCount + stats.banAgainstCount,
        totalContestRate: totalGames > 0 ? totalContest / totalGames : 0,
      });
    }
  }
  mostContestedHeroes.sort((a, b) => b.totalContestRate - a.totalContestRate);
  
  // Most successful heroes
  const mostSuccessfulHeroes = [];
  for (const [, stats] of heroStatsMap) {
    if (stats.pickCount >= 2) {
      mostSuccessfulHeroes.push({
        heroName: stats.heroName,
        winRate: stats.winRate,
        gamesPlayed: stats.pickCount,
      });
    }
  }
  mostSuccessfulHeroes.sort((a, b) => b.winRate - a.winRate || b.gamesPlayed - a.gamesPlayed);
  
  // Signature compositions
  const signatureCompositions = [];
  for (const [pairKey, data] of pairTracker) {
    if (data.count >= 3) {
      const winRate = (data.wins / data.count) * 100;
      if (winRate > 50) {
        const [heroA, heroB] = pairKey.split('|');
        signatureCompositions.push({ heroes: [heroA, heroB], gameCount: data.count, winCount: data.wins, winRate });
      }
    }
  }
  signatureCompositions.sort((a, b) => b.gameCount - a.gameCount || b.winRate - a.winRate);
  
  const winRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;
  
  return {
    teamId: normalizedTeamId,
    totalGames,
    wins: totalWins,
    losses: totalLosses,
    winRate,
    heroStats: heroStatsMap,
    comfortHeroes: top5Comfort,
    firstPickPreferences: firstPickPreferences.slice(0, 5),
    secondPickPreferences: [],
    signatureCompositions,
    heroPairings: [],
    targetBans: new Map(),
    draftTendencies: [],
    mostSuccessfulHeroes: mostSuccessfulHeroes.slice(0, 5),
    mostContestedHeroes: mostContestedHeroes.slice(0, 5),
    priorityBans: [],
    sideStats: { blue: { games: 0, wins: 0, winRate: 0 }, red: { games: 0, wins: 0, winRate: 0 } },
  };
}

// ─── Build Matchup Profile (mirrors matchupProfileEngine.ts) ───────────────────

function buildMatchupProfile(teamId, opponentId) {
  const normalizedTeamId = normalizeTeamName(teamId);
  const normalizedOpponentId = normalizeTeamName(opponentId);
  
  // Find head-to-head series
  const h2hSeries = allSeries.filter(s => 
    (s.teamA === normalizedTeamId && s.teamB === normalizedOpponentId) ||
    (s.teamA === normalizedOpponentId && s.teamB === normalizedTeamId)
  );
  
  if (h2hSeries.length === 0) {
    return {
      teamId: normalizedTeamId,
      opponentId: normalizedOpponentId,
      headToHeadGames: 0,
      teamSeriesWins: 0, opponentSeriesWins: 0,
      teamGameWins: 0, opponentGameWins: 0,
      headToHeadWinRate: 0,
      teamMatchupComfort: [],
      opponentMatchupComfort: [],
      teamMatchupBans: [],
      opponentMatchupBans: [],
      seriesRecord: [],
    };
  }
  
  let totalGames = 0;
  let teamGameWins = 0;
  let opponentGameWins = 0;
  const teamHeroStats = new Map();
  const opponentHeroStats = new Map();
  
  const teamSeriesWins = h2hSeries.filter(s => normalizeTeamName(s.winner) === normalizedTeamId).length;
  const opponentSeriesWins = h2hSeries.filter(s => normalizeTeamName(s.winner) === normalizedOpponentId).length;
  
  for (const series of h2hSeries) {
    for (const game of series.games) {
      totalGames++;
      const isBlue = normalizeTeamName(game.blueTeam) === normalizedTeamId;
      const isTeamWin = normalizeTeamName(game.winner) === normalizedTeamId;
      
      if (isTeamWin) teamGameWins++;
      else opponentGameWins++;
      
      const teamPicks = isBlue ? game.bluePicks : game.redPicks;
      const opponentPicks = isBlue ? game.redPicks : game.bluePicks;
      
      for (const hero of teamPicks) {
        if (!hero) continue;
        if (!teamHeroStats.has(hero)) teamHeroStats.set(hero, { picks: 0, wins: 0 });
        const s = teamHeroStats.get(hero);
        s.picks++;
        if (isTeamWin) s.wins++;
      }
      
      for (const hero of opponentPicks) {
        if (!hero) continue;
        if (!opponentHeroStats.has(hero)) opponentHeroStats.set(hero, { picks: 0, wins: 0 });
        const s = opponentHeroStats.get(hero);
        s.picks++;
        if (!isTeamWin) s.wins++;
      }
    }
  }
  
  function computeMatchupComfort(statsMap) {
    const result = [];
    for (const [heroName, stats] of statsMap) {
      if (stats.picks < 1) continue;
      const winRate = Math.round((stats.wins / stats.picks) * 100);
      if (winRate > 50) {
        result.push({ heroName, pickCount: stats.picks, winRate, winCount: stats.wins });
      }
    }
    result.sort((a, b) => b.pickCount - a.pickCount || b.winRate - a.winRate);
    return result.slice(0, 5);
  }
  
  const headToHeadWinRate = h2hSeries.length > 0 ? Math.round((teamSeriesWins / h2hSeries.length) * 100) : 0;
  
  return {
    teamId: normalizedTeamId,
    opponentId: normalizedOpponentId,
    headToHeadGames: totalGames,
    teamSeriesWins,
    opponentSeriesWins,
    teamGameWins,
    opponentGameWins,
    headToHeadWinRate,
    teamMatchupComfort: computeMatchupComfort(teamHeroStats),
    opponentMatchupComfort: computeMatchupComfort(opponentHeroStats),
    teamMatchupBans: [],
    opponentMatchupBans: [],
    seriesRecord: [],
  };
}

// ─── MPL Scoring Function (mirrors draftScoringEngine.ts scoreMplHero) ─────────

function scoreMplHero(heroSlug, context) {
  const heroNameLower = normalizeHeroKey(heroSlug);
  
  let teamHistory = 0;
  let headToHead = 0;
  let draftPattern = 0;
  let teamComfort = 0;
  let teamDeny = 0;
  let meta = 0;
  
  // teamHistory: ally's winRate with this hero × 0.30 (max 30 pts)
  if (context.allyIdentity) {
    for (const [name, stats] of context.allyIdentity.heroStats) {
      if (normalizeHeroKey(name) === heroNameLower && stats.pickCount >= 2) {
        teamHistory = Math.round((stats.winRate / 100) * 30);
        break;
      }
    }
  }
  
  // headToHead: matchup-specific winRate × 0.25 (max 25 pts)
  if (context.matchupProfile) {
    const h2hComfort = context.matchupProfile.teamMatchupComfort.find(
      h => normalizeHeroKey(h.heroName) === heroNameLower
    );
    if (h2hComfort) {
      headToHead = Math.round((h2hComfort.winRate / 100) * 25);
    }
  }
  
  // draftPattern: placeholder 0
  draftPattern = 0;
  
  // teamComfort: 15 if hero is in ally comfort list
  if (context.allyIdentity) {
    const isComfort = context.allyIdentity.comfortHeroes.some(
      h => normalizeHeroKey(h.heroName) === heroNameLower
    );
    if (isComfort) teamComfort = 15;
  }
  
  // teamDeny: 10 if hero is in enemy comfort list
  if (context.enemyIdentity) {
    const isEnemyComfort = context.enemyIdentity.comfortHeroes.some(
      h => normalizeHeroKey(h.heroName) === heroNameLower
    );
    if (isEnemyComfort) teamDeny = 10;
  }
  
  // meta: 0 (not available in MPL context)
  meta = 0;
  
  return { teamHistory, headToHead, draftPattern, teamComfort, teamDeny, meta };
}

function calculateMplTotalScore(breakdown) {
  return breakdown.teamHistory + breakdown.headToHead + breakdown.draftPattern + 
         breakdown.teamComfort + breakdown.teamDeny + breakdown.meta;
}

// ─── Draft Sequence Definition ─────────────────────────────────────────────────
// MLBB competitive draft order (10 bans + 10 picks = 20 actions):
// Phase 1 Bans: B1 R1 B2 R2 B3 R3 (alternating, 3 each)
// Phase 1 Picks: B1 R1 R2 B2 B3 R3
// Phase 2 Bans: R4 B4 R5 B5
// Phase 2 Picks: R4 B4 B5 R5

// From the game data:
// BTR (Blue) bans: Marcel, Harley, Guinevere, Chip, Atlas
// ONIC (Red) bans: Freya, Zhuxin, Kalea, Valir, Gloo  
// BTR (Blue) picks: Phoveus, Fanny, Valentina, Claude, Gatotkaca
// ONIC (Red) picks: Terizla, Suyou, Pharsa, Moskov, Hylos

const blueBans = game1.blueBans;  // [Marcel, Harley, Guinevere, Chip, Atlas]
const redBans = game1.redBans;    // [Freya, Zhuxin, Kalea, Valir, Gloo]
const bluePicks = game1.bluePicks; // [Phoveus, Fanny, Valentina, Claude, Gatotkaca]
const redPicks = game1.redPicks;   // [Terizla, Suyou, Pharsa, Moskov, Hylos]

// Full draft sequence (20 actions in order):
const draftSequence = [
  // Phase 1 Bans (6 actions)
  { step: 1,  type: 'BAN',  side: 'BLUE', hero: blueBans[0],  phase: 'BANS_1' },  // Marcel
  { step: 2,  type: 'BAN',  side: 'RED',  hero: redBans[0],   phase: 'BANS_1' },  // Freya
  { step: 3,  type: 'BAN',  side: 'BLUE', hero: blueBans[1],  phase: 'BANS_1' },  // Harley
  { step: 4,  type: 'BAN',  side: 'RED',  hero: redBans[1],   phase: 'BANS_1' },  // Zhuxin
  { step: 5,  type: 'BAN',  side: 'BLUE', hero: blueBans[2],  phase: 'BANS_1' },  // Guinevere
  { step: 6,  type: 'BAN',  side: 'RED',  hero: redBans[2],   phase: 'BANS_1' },  // Kalea
  // Phase 1 Picks (6 actions)
  { step: 7,  type: 'PICK', side: 'BLUE', hero: bluePicks[0], phase: 'PICKS_1' }, // Phoveus
  { step: 8,  type: 'PICK', side: 'RED',  hero: redPicks[0],  phase: 'PICKS_1' }, // Terizla
  { step: 9,  type: 'PICK', side: 'RED',  hero: redPicks[1],  phase: 'PICKS_1' }, // Suyou
  { step: 10, type: 'PICK', side: 'BLUE', hero: bluePicks[1], phase: 'PICKS_1' }, // Fanny
  { step: 11, type: 'PICK', side: 'BLUE', hero: bluePicks[2], phase: 'PICKS_1' }, // Valentina
  { step: 12, type: 'PICK', side: 'RED',  hero: redPicks[2],  phase: 'PICKS_1' }, // Pharsa
  // Phase 2 Bans (4 actions)
  { step: 13, type: 'BAN',  side: 'RED',  hero: redBans[3],   phase: 'BANS_2' }, // Valir
  { step: 14, type: 'BAN',  side: 'BLUE', hero: blueBans[3],  phase: 'BANS_2' }, // Chip
  { step: 15, type: 'BAN',  side: 'RED',  hero: redBans[4],   phase: 'BANS_2' }, // Gloo
  { step: 16, type: 'BAN',  side: 'BLUE', hero: blueBans[4],  phase: 'BANS_2' }, // Atlas
  // Phase 2 Picks (4 actions)
  { step: 17, type: 'PICK', side: 'RED',  hero: redPicks[3],  phase: 'PICKS_2' }, // Moskov
  { step: 18, type: 'PICK', side: 'BLUE', hero: bluePicks[3], phase: 'PICKS_2' }, // Claude
  { step: 19, type: 'PICK', side: 'BLUE', hero: bluePicks[4], phase: 'PICKS_2' }, // Gatotkaca
  { step: 20, type: 'PICK', side: 'RED',  hero: redPicks[4],  phase: 'PICKS_2' }, // Hylos
];

// ─── Run Replay ────────────────────────────────────────────────────────────────

// Build team identities (using ALL match data for each team)
const btrIdentity = buildTeamIdentity('BTR');
const onicIdentity = buildTeamIdentity('ONIC');

// Build matchup profile (BTR perspective)
const btrVsOnicMatchup = buildMatchupProfile('BTR', 'ONIC');
// Build matchup profile (ONIC perspective)
const onicVsBtrMatchup = buildMatchupProfile('ONIC', 'BTR');

console.log('\n=== TEAM PROFILES ===');
console.log(`BTR: ${btrIdentity.totalGames} games, ${btrIdentity.wins}W-${btrIdentity.losses}L (${btrIdentity.winRate.toFixed(0)}%)`);
console.log(`BTR Comfort Heroes: ${btrIdentity.comfortHeroes.map(h => h.heroName + '(' + h.pickCount + 'g,' + h.winRate.toFixed(0) + '%)').join(', ')}`);
console.log(`ONIC: ${onicIdentity.totalGames} games, ${onicIdentity.wins}W-${onicIdentity.losses}L (${onicIdentity.winRate.toFixed(0)}%)`);
console.log(`ONIC Comfort Heroes: ${onicIdentity.comfortHeroes.map(h => h.heroName + '(' + h.pickCount + 'g,' + h.winRate.toFixed(0) + '%)').join(', ')}`);
console.log(`H2H Games: ${btrVsOnicMatchup.headToHeadGames}, BTR series wins: ${btrVsOnicMatchup.teamSeriesWins}, ONIC series wins: ${btrVsOnicMatchup.opponentSeriesWins}`);
console.log(`BTR H2H Comfort: ${btrVsOnicMatchup.teamMatchupComfort.map(h => h.heroName + '(' + h.pickCount + 'g,' + h.winRate + '%)').join(', ')}`);
console.log(`ONIC H2H Comfort: ${btrVsOnicMatchup.opponentMatchupComfort.map(h => h.heroName + '(' + h.pickCount + 'g,' + h.winRate + '%)').join(', ')}`);

console.log('\n' + '='.repeat(70));
console.log('=== DRAFT REPLAY: BTR vs ONIC Game 1 (23 May 2026) ===');
console.log('='.repeat(70));

// Track accuracy
let top1Hits = 0;
let top3Hits = 0;
let top5Hits = 0;
let top10Hits = 0;

// Component influence tracking
const componentInfluence = {
  teamHistory: { count: 0, totalPts: 0 },
  headToHead: { count: 0, totalPts: 0 },
  draftPattern: { count: 0, totalPts: 0 },
  teamComfort: { count: 0, totalPts: 0 },
  teamDeny: { count: 0, totalPts: 0 },
  meta: { count: 0, totalPts: 0 },
};

// Track state as we replay
const currentBlueBans = [];
const currentRedBans = [];
const currentBluePicks = [];
const currentRedPicks = [];

for (const action of draftSequence) {
  const { step, type, side, hero, phase } = action;
  
  // Determine who is the "ally" for this action
  const isBlueAction = side === 'BLUE';
  const allyIdentity = isBlueAction ? btrIdentity : onicIdentity;
  const enemyIdentity = isBlueAction ? onicIdentity : btrIdentity;
  const matchupProfile = isBlueAction ? btrVsOnicMatchup : onicVsBtrMatchup;
  
  const currentPicks = isBlueAction ? [...currentBluePicks] : [...currentRedPicks];
  const enemyPicks = isBlueAction ? [...currentRedPicks] : [...currentBluePicks];
  
  // Build unavailable set (all already banned + picked)
  const unavailable = new Set(
    [...currentBlueBans, ...currentRedBans, ...currentBluePicks, ...currentRedPicks]
      .map(normalizeHeroKey)
  );
  
  // Build scoring context
  const mplContext = {
    allyIdentity,
    enemyIdentity,
    matchupProfile,
    draftPatterns: null,
    currentPicks,
    enemyPicks,
    laneStatus: { gold: null, exp: null, mid: null, jungle: null, roam: null },
    mode: 'mpl',
  };
  
  // Score all available heroes
  const scored = [];
  for (const heroData of heroDatabase) {
    const heroName = heroData.name || heroData.heroName || heroData.id || '';
    const heroId = heroData.id || '';
    
    if (unavailable.has(normalizeHeroKey(heroName)) || unavailable.has(normalizeHeroKey(heroId))) {
      continue;
    }
    
    const breakdown = scoreMplHero(heroName, mplContext);
    const total = calculateMplTotalScore(breakdown);
    scored.push({ heroName, breakdown, total });
  }
  
  // Sort by score descending
  scored.sort((a, b) => b.total - a.total);
  
  // Top 10
  const top10 = scored.slice(0, 10);
  
  // Find actual hero rank
  const actualHeroKey = normalizeHeroKey(hero);
  const actualRank = scored.findIndex(s => normalizeHeroKey(s.heroName) === actualHeroKey) + 1;
  const actualEntry = scored.find(s => normalizeHeroKey(s.heroName) === actualHeroKey);
  
  // Track accuracy
  if (actualRank === 1) top1Hits++;
  if (actualRank >= 1 && actualRank <= 3) top3Hits++;
  if (actualRank >= 1 && actualRank <= 5) top5Hits++;
  if (actualRank >= 1 && actualRank <= 10) top10Hits++;
  
  // Track component influence from top 10 recommendations
  for (const rec of top10) {
    if (rec.breakdown.teamHistory > 0) { componentInfluence.teamHistory.count++; componentInfluence.teamHistory.totalPts += rec.breakdown.teamHistory; }
    if (rec.breakdown.headToHead > 0) { componentInfluence.headToHead.count++; componentInfluence.headToHead.totalPts += rec.breakdown.headToHead; }
    if (rec.breakdown.draftPattern > 0) { componentInfluence.draftPattern.count++; componentInfluence.draftPattern.totalPts += rec.breakdown.draftPattern; }
    if (rec.breakdown.teamComfort > 0) { componentInfluence.teamComfort.count++; componentInfluence.teamComfort.totalPts += rec.breakdown.teamComfort; }
    if (rec.breakdown.teamDeny > 0) { componentInfluence.teamDeny.count++; componentInfluence.teamDeny.totalPts += rec.breakdown.teamDeny; }
    if (rec.breakdown.meta > 0) { componentInfluence.meta.count++; componentInfluence.meta.totalPts += rec.breakdown.meta; }
  }
  
  // Print step
  const teamLabel = isBlueAction ? 'BTR(BLUE)' : 'ONIC(RED)';
  console.log(`\nStep ${step}: [${side} ${type}] ${teamLabel} — Actual: ${hero}`);
  console.log(`  Top 10 Recs: ${top10.map((r, i) => `${i+1}.${r.heroName}(${r.total})`).join(' ')}`);
  
  if (actualRank >= 1 && actualRank <= 10) {
    console.log(`  ✓ Actual hero rank: #${actualRank}`);
  } else if (actualRank > 0) {
    console.log(`  ✗ Actual hero rank: #${actualRank} — NOT IN TOP 10`);
  } else {
    console.log(`  ✗ Actual hero NOT FOUND in scored list (may not be in hero database)`);
  }
  
  // Show score breakdown for actual hero
  if (actualEntry) {
    const b = actualEntry.breakdown;
    console.log(`  Score breakdown: TH=${b.teamHistory} H2H=${b.headToHead} Pattern=${b.draftPattern} Comfort=${b.teamComfort} Deny=${b.teamDeny} Meta=${b.meta} Total=${actualEntry.total}`);
  }
  
  // For misses, explain why
  if (actualRank === 0 || actualRank > 10) {
    // Check if hero is in any team's profile
    const inAllyStats = allyIdentity.heroStats.has(hero);
    const inEnemyStats = enemyIdentity.heroStats.has(hero);
    const inAllyComfort = allyIdentity.comfortHeroes.some(h => h.heroName === hero);
    const inEnemyComfort = enemyIdentity.comfortHeroes.some(h => h.heroName === hero);
    const inH2H = matchupProfile.teamMatchupComfort.some(h => h.heroName === hero);
    
    console.log(`  MISS ANALYSIS:`);
    console.log(`    In ally (${allyIdentity.teamId}) heroStats: ${inAllyStats ? 'YES' : 'NO'}`);
    if (inAllyStats) {
      const s = allyIdentity.heroStats.get(hero);
      console.log(`      → pickCount=${s.pickCount}, winRate=${s.winRate.toFixed(1)}%, meets min2? ${s.pickCount >= 2 ? 'YES' : 'NO'}`);
    }
    console.log(`    In ally comfort list: ${inAllyComfort ? 'YES' : 'NO'}`);
    console.log(`    In enemy (${enemyIdentity.teamId}) comfort list: ${inEnemyComfort ? 'YES' : 'NO'}`);
    console.log(`    In H2H comfort: ${inH2H ? 'YES' : 'NO'}`);
    console.log(`    Components that were 0 (could have pushed up):`);
    if (actualEntry) {
      const b = actualEntry.breakdown;
      const zeros = [];
      if (b.teamHistory === 0) zeros.push('teamHistory(max30)');
      if (b.headToHead === 0) zeros.push('headToHead(max25)');
      if (b.draftPattern === 0) zeros.push('draftPattern(max20)');
      if (b.teamComfort === 0) zeros.push('teamComfort(max15)');
      if (b.teamDeny === 0) zeros.push('teamDeny(max10)');
      console.log(`      ${zeros.join(', ')}`);
    }
  }
  
  // Apply this action to state
  if (type === 'BAN') {
    if (isBlueAction) currentBlueBans.push(hero);
    else currentRedBans.push(hero);
  } else {
    if (isBlueAction) currentBluePicks.push(hero);
    else currentRedPicks.push(hero);
  }
}

// ─── Accuracy Report ───────────────────────────────────────────────────────────

console.log('\n' + '='.repeat(70));
console.log('=== ACCURACY REPORT ===');
console.log('='.repeat(70));
console.log(`Top 1  Accuracy: ${top1Hits}/20 (${(top1Hits/20*100).toFixed(1)}%)`);
console.log(`Top 3  Accuracy: ${top3Hits}/20 (${(top3Hits/20*100).toFixed(1)}%)`);
console.log(`Top 5  Accuracy: ${top5Hits}/20 (${(top5Hits/20*100).toFixed(1)}%)`);
console.log(`Top 10 Accuracy: ${top10Hits}/20 (${(top10Hits/20*100).toFixed(1)}%)`);

// ─── Component Influence Analysis ──────────────────────────────────────────────

console.log('\n' + '='.repeat(70));
console.log('=== COMPONENT INFLUENCE ANALYSIS ===');
console.log('='.repeat(70));
const totalRecs = 20 * 10; // 20 steps × 10 recommendations each
console.log(`teamHistory: contributed to ${componentInfluence.teamHistory.count}/${totalRecs} recommendations (avg ${componentInfluence.teamHistory.count > 0 ? (componentInfluence.teamHistory.totalPts / componentInfluence.teamHistory.count).toFixed(1) : '0'} pts when non-zero)`);
console.log(`headToHead: contributed to ${componentInfluence.headToHead.count}/${totalRecs} recommendations (avg ${componentInfluence.headToHead.count > 0 ? (componentInfluence.headToHead.totalPts / componentInfluence.headToHead.count).toFixed(1) : '0'} pts when non-zero)`);
console.log(`draftPattern: contributed to ${componentInfluence.draftPattern.count}/${totalRecs} recommendations (ALWAYS 0 — NOT INTEGRATED)`);
console.log(`teamComfort: contributed to ${componentInfluence.teamComfort.count}/${totalRecs} recommendations (avg ${componentInfluence.teamComfort.count > 0 ? (componentInfluence.teamComfort.totalPts / componentInfluence.teamComfort.count).toFixed(1) : '0'} pts when non-zero)`);
console.log(`teamDeny: contributed to ${componentInfluence.teamDeny.count}/${totalRecs} recommendations (avg ${componentInfluence.teamDeny.count > 0 ? (componentInfluence.teamDeny.totalPts / componentInfluence.teamDeny.count).toFixed(1) : '0'} pts when non-zero)`);
console.log(`meta: contributed to ${componentInfluence.meta.count}/${totalRecs} recommendations (ALWAYS 0)`);

// ─── System Completeness ───────────────────────────────────────────────────────

console.log('\n' + '='.repeat(70));
console.log('=== SYSTEM COMPLETENESS ===');
console.log('='.repeat(70));
console.log('Draft Pattern Engine: NOT INFLUENCING (always 0)');
console.log('Pick Sequence Engine: NOT INTEGRATED');
console.log('Pivot Prediction Engine: NOT INTEGRATED INTO SCORING');
console.log('Availability Tree Engine: NOT INTEGRATED INTO SCORING');
console.log('Meta Tier Scoring: NOT USED IN MPL MODE (always 0)');
console.log('Lane Fit / Synergy / Counter: NOT USED IN MPL MODE (ranked-only factors)');

console.log('\n' + '='.repeat(70));
console.log('=== END OF REPLAY ===');
console.log('='.repeat(70));
