/**
 * Fantasy HQ — ESPN Data Fetcher
 * Run with: node scripts/fetch-espn-data.mjs
 *
 * Fetches live league data from ESPN and writes it to /data/*.json
 * Requires: ESPN_S2, SWID, and LEAGUE_ID set in .env.local
 */

import { writeFileSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Load env from .env.local
function loadEnv() {
  try {
    const env = readFileSync(resolve(ROOT, '.env.local'), 'utf-8');
    for (const line of env.split('\n')) {
      const [key, ...rest] = line.split('=');
      if (key && rest.length) {
        process.env[key.trim()] = rest.join('=').trim();
      }
    }
  } catch {
    // env already set, or file missing
  }
}

loadEnv();

const ESPN_S2 = process.env.ESPN_S2;
const SWID = process.env.SWID;
const LEAGUE_ID = process.env.LEAGUE_ID;
const SEASON = process.env.SEASON || '2026';

if (!ESPN_S2 || !SWID || !LEAGUE_ID) {
  console.error('❌ Missing required env vars. Add ESPN_S2, SWID, LEAGUE_ID to .env.local');
  process.exit(1);
}

const HEADERS = {
  'Cookie': `espn_s2=${ESPN_S2}; SWID=${SWID}`,
  'Accept': 'application/json',
};

const BASE = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${SEASON}/segments/0/leagues/${LEAGUE_ID}`;

async function espnFetch(params = '') {
  const url = `${BASE}${params}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`ESPN API error ${res.status} for ${url}`);
  return res.json();
}

// ─── STANDINGS ───────────────────────────────────────────────────────────────

async function fetchStandings() {
  console.log('📊 Fetching standings...');
  const data = await espnFetch('?view=mTeam&view=mStandings');

  const teams = data.teams;
  const members = data.members || [];

  const memberMap = {};
  for (const m of members) {
    memberMap[m.id] = `${m.firstName} ${m.lastName}`.trim();
  }

  // Find current user's team (matches SWID)
  const swid = SWID.replace(/[{}]/g, '').toLowerCase();
  const myMember = members.find(m => m.id.replace(/[{}]/g, '').toLowerCase() === swid);
  const myTeamId = myMember ? teams.find(t => t.owners?.includes(myMember.id))?.id : null;

  const standings = teams
    .map(team => {
      const record = team.record?.overall || {};
      const streak = team.record?.overall?.streak || {};
      const ownerIds = team.owners || [];
      const ownerName = ownerIds.map(id => memberMap[id] || 'Unknown').join(' & ');

      return {
        rank: team.playoffSeed || 0,
        teamId: `team${team.id}`,
        teamName: team.name || `Team ${team.id}`,
        ownerName,
        wins: record.wins || 0,
        losses: record.losses || 0,
        points: Math.round((record.pointsFor || 0) * 10) / 10,
        streak: {
          type: streak.type === 'WIN' ? 'W' : 'L',
          count: streak.length || 0,
        },
        isYou: team.id === myTeamId,
      };
    })
    .sort((a, b) => a.rank - b.rank);

  writeFileSync(resolve(ROOT, 'data/standings.json'), JSON.stringify(standings, null, 2));
  console.log(`  ✓ ${standings.length} teams written`);
  return { teams, members, memberMap, myTeamId };
}

// ─── MATCHUPS ─────────────────────────────────────────────────────────────────

async function fetchMatchups(teams, memberMap, myTeamId) {
  console.log('🏀 Fetching matchups...');
  const data = await espnFetch('?view=mMatchup&view=mMatchupScore&view=mScoreboard');

  const currentPeriod = data.scoringPeriodId || 1;
  const currentMatchupPeriod = data.status?.currentMatchupPeriod || 1;

  const teamMap = {};
  for (const t of teams) {
    const ownerIds = t.owners || [];
    teamMap[t.id] = {
      teamId: `team${t.id}`,
      teamName: t.name,
      ownerName: ownerIds.map(id => memberMap[id] || 'Unknown').join(' & '),
      isYou: t.id === myTeamId,
    };
  }

  const weekMatchups = (data.schedule || []).filter(
    m => m.matchupPeriodId === currentMatchupPeriod
  );

  const matchups = weekMatchups.map((m, idx) => {
    const home = m.home;
    const away = m.away;

    const homeInfo = teamMap[home?.teamId] || { teamId: 'unknown', teamName: 'TBD', ownerName: 'TBD', isYou: false };
    const awayInfo = teamMap[away?.teamId] || { teamId: 'unknown', teamName: 'TBD', ownerName: 'TBD', isYou: false };

    const homeActual = Math.round((home?.totalPoints || 0) * 10) / 10;
    const awayActual = Math.round((away?.totalPoints || 0) * 10) / 10;
    const homeProjected = Math.round((home?.totalProjectedPointsLive || home?.totalPoints || 0) * 10) / 10;
    const awayProjected = Math.round((away?.totalProjectedPointsLive || away?.totalPoints || 0) * 10) / 10;

    const isLive = homeActual > 0 || awayActual > 0;

    return {
      id: `m${idx + 1}`,
      home: { ...homeInfo, projectedScore: homeProjected, actualScore: homeActual },
      away: { ...awayInfo, projectedScore: awayProjected, actualScore: awayActual },
      isLive,
    };
  });

  const result = { week: currentMatchupPeriod, matchups };
  writeFileSync(resolve(ROOT, 'data/matchups.json'), JSON.stringify(result, null, 2));
  console.log(`  ✓ ${matchups.length} matchups written (Week ${currentMatchupPeriod})`);
}

// ─── PLAYERS ──────────────────────────────────────────────────────────────────

async function fetchPlayers() {
  console.log('⭐ Fetching top players...');
  const data = await espnFetch(
    `?view=kona_player_info&scoringPeriodId=1&limit=30`
  );

  // ESPN player stats endpoint is complex; use the free agents + rostered players view
  const playersData = await espnFetch(
    `?view=mRoster&view=mTeam`
  );

  const posMap = { 1: 'PG', 2: 'SG', 3: 'SF', 4: 'PF', 5: 'C', 6: 'G', 7: 'F', 8: 'UTIL' };
  const posGroupMap = { 1: 'G', 2: 'G', 3: 'F', 4: 'F', 5: 'C', 6: 'G', 7: 'F', 8: 'F' };

  const allPlayers = [];
  for (const team of (playersData.teams || [])) {
    for (const entry of (team.roster?.entries || [])) {
      const p = entry.playerPoolEntry?.player;
      const stats = entry.playerPoolEntry?.player?.stats || [];
      const weekStats = stats.find(s => s.statSourceId === 0 && s.scoringPeriodId === playersData.scoringPeriodId);
      const s = weekStats?.stats || {};

      const posId = p?.defaultPositionId || 5;
      const posGroup = posGroupMap[posId] || 'F';

      // ESPN stat IDs: 0=PTS, 6=REB, 3=AST, 17=3PM
      allPlayers.push({
        id: `p${p?.id}`,
        name: p?.fullName || 'Unknown',
        team: getTeamAbbr(p?.proTeamId),
        position: posGroup,
        pts: Math.round((s['0'] || 0) * 10) / 10,
        reb: Math.round((s['6'] || 0) * 10) / 10,
        ast: Math.round((s['3'] || 0) * 10) / 10,
        tpm: Math.round((s['17'] || 0) * 10) / 10,
        fp: Math.round(((s['0'] || 0) + (s['6'] || 0) * 1.2 + (s['3'] || 0) * 1.5 + (s['17'] || 0) * 3) * 10) / 10,
      });
    }
  }

  const top15 = allPlayers
    .sort((a, b) => b.fp - a.fp)
    .slice(0, 15)
    .map((p, i) => ({ ...p, id: `p${i + 1}` }));

  writeFileSync(resolve(ROOT, 'data/players.json'), JSON.stringify(top15, null, 2));
  console.log(`  ✓ ${top15.length} players written`);
}

function getTeamAbbr(proTeamId) {
  const teams = {
    1:'ATL',2:'BOS',3:'NOP',4:'CHI',5:'CLE',6:'DAL',7:'DEN',8:'DET',
    9:'GSW',10:'HOU',11:'IND',12:'LAC',13:'LAL',14:'MIA',15:'MIL',
    16:'MIN',17:'BKN',18:'NYK',19:'ORL',20:'PHI',21:'PHX',22:'POR',
    23:'SAC',24:'SAS',25:'OKC',26:'UTA',27:'WAS',28:'TOR',29:'MEM',
    30:'CHA',33:'UTA',34:'MEM',
  };
  return teams[proTeamId] || 'NBA';
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🏆 Fantasy HQ — ESPN Data Fetcher`);
  console.log(`   League: ${LEAGUE_ID} | Season: ${SEASON}\n`);

  try {
    const { teams, memberMap, myTeamId } = await fetchStandings();
    await fetchMatchups(teams, memberMap, myTeamId);
    await fetchPlayers();
    console.log('\n✅ All data updated successfully! Run `npm run dev` to see changes.\n');
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    if (err.message.includes('401') || err.message.includes('403')) {
      console.error('   Your ESPN_S2 or SWID may be expired. Refresh them from the ESPN website.');
    }
    process.exit(1);
  }
}

main();
