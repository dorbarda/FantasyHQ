/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  StandingEntry, MatchupsData, Player,
  HistoryEntry, RulesData, SeasonStats,
  CategoryStanding, LuckTableEntry, StatsData,
} from './types';

const ESPN_S2 = process.env.ESPN_S2;
const SWID = process.env.SWID;
const LEAGUE_ID = process.env.LEAGUE_ID;
const SEASON = process.env.SEASON || '2026';

export function hasEspnCredentials() {
  return !!(ESPN_S2 && SWID && LEAGUE_ID);
}

const BASE = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${SEASON}/segments/0/leagues/${LEAGUE_ID}`;

async function espnFetch(params: string): Promise<any> {
  const url = `${BASE}${params}`;
  const res = await fetch(url, {
    headers: {
      Cookie: `espn_s2=${ESPN_S2}; SWID=${SWID}`,
      Accept: 'application/json',
    },
    next: { revalidate: 1800 },
  });
  if (!res.ok) throw new Error(`ESPN API ${res.status} for ${url}`);
  return res.json();
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const PRO_TEAMS: Record<number, string> = {
  1:'ATL', 2:'BOS', 3:'NOP', 4:'CHI', 5:'CLE', 6:'DAL', 7:'DEN', 8:'DET',
  9:'GSW', 10:'HOU', 11:'IND', 12:'LAC', 13:'LAL', 14:'MIA', 15:'MIL',
  16:'MIN', 17:'BKN', 18:'NYK', 19:'ORL', 20:'PHI', 21:'PHX', 22:'POR',
  23:'SAC', 24:'SAS', 25:'OKC', 26:'UTA', 27:'WAS', 28:'TOR', 29:'MEM',
  30:'CHA',
};

function buildMemberMap(members: any[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const m of members) {
    map[m.id] = `${m.firstName} ${m.lastName}`.trim();
  }
  return map;
}

function findMyTeamId(members: any[], teams: any[]): number | null {
  const swid = (SWID || '').replace(/[{}]/g, '').toLowerCase();
  const myMember = members.find(
    (m: any) => m.id.replace(/[{}]/g, '').toLowerCase() === swid
  );
  if (!myMember) return null;
  return teams.find((t: any) => t.owners?.includes(myMember.id))?.id ?? null;
}

function rankValues<T>(
  items: T[],
  getValue: (item: T) => number,
  lowerIsBetter = false
): Map<T, number> {
  const sorted = [...items].sort((a, b) =>
    lowerIsBetter
      ? getValue(a) - getValue(b)
      : getValue(b) - getValue(a)
  );
  const rankMap = new Map<T, number>();
  sorted.forEach((item, i) => rankMap.set(item, i + 1));
  return rankMap;
}

// ─── STANDINGS ───────────────────────────────────────────────────────────────

export async function getStandings(): Promise<StandingEntry[]> {
  const data = await espnFetch('?view=mTeam&view=mStandings&view=mNav');
  const teams: any[] = data.teams;
  const members: any[] = data.members || [];
  const memberMap = buildMemberMap(members);
  const myTeamId = findMyTeamId(members, teams);

  return teams
    .map((team: any) => {
      const record = team.record?.overall || {};
      const streak = record.streak || {};
      const ownerName = (team.owners || [])
        .map((id: string) => memberMap[id] || 'Unknown')
        .join(' & ');
      const moves =
        team.transactionCounter?.acquisitionTotal ??
        team.transactionCounter?.acquisitions ??
        0;

      // ESPN power rank: try several known field names
      const powerRank =
        team.rankCalculatedFinal ??
        team.currentProjectedRank ??
        team.playoffSeed ??
        0;

      return {
        rank: team.playoffSeed || 0,
        powerRank,
        teamId: `team${team.id}`,
        teamName: team.name || `Team ${team.id}`,
        ownerName,
        wins: record.wins || 0,
        losses: record.losses || 0,
        points: Math.round((record.pointsFor || 0) * 10) / 10,
        streak: {
          type: (streak.type === 'WIN' ? 'W' : 'L') as 'W' | 'L',
          count: streak.length || 0,
        },
        isYou: team.id === myTeamId,
        moves,
      };
    })
    .sort((a, b) => a.rank - b.rank);
}

// ─── MATCHUPS ─────────────────────────────────────────────────────────────────

export async function getMatchups(): Promise<MatchupsData> {
  const data = await espnFetch(
    '?view=mTeam&view=mMatchup&view=mMatchupScore&view=mScoreboard'
  );
  const currentMatchupPeriod: number = data.status?.currentMatchupPeriod || 1;
  const teams: any[] = data.teams;
  const members: any[] = data.members || [];
  const memberMap = buildMemberMap(members);
  const myTeamId = findMyTeamId(members, teams);

  const teamMap: Record<number, any> = {};
  for (const t of teams) {
    const ownerName = (t.owners || [])
      .map((id: string) => memberMap[id] || 'Unknown')
      .join(' & ');
    teamMap[t.id] = {
      teamId: `team${t.id}`,
      teamName: t.name || `Team ${t.id}`,
      ownerName,
      isYou: t.id === myTeamId,
    };
  }

  const weekMatchups = ((data.schedule || []) as any[]).filter(
    (m: any) => m.matchupPeriodId === currentMatchupPeriod
  );

  const matchups = weekMatchups.map((m: any, idx: number) => {
    const home = m.home || {};
    const away = m.away || {};
    const homeInfo = teamMap[home.teamId] || { teamId: 'unknown', teamName: 'TBD', ownerName: 'TBD', isYou: false };
    const awayInfo = teamMap[away.teamId] || { teamId: 'unknown', teamName: 'TBD', ownerName: 'TBD', isYou: false };
    const homeActual = Math.round((home.totalPoints || 0) * 10) / 10;
    const awayActual = Math.round((away.totalPoints || 0) * 10) / 10;
    const homeProjected = Math.round((home.totalProjectedPointsLive || home.totalPoints || 0) * 10) / 10;
    const awayProjected = Math.round((away.totalProjectedPointsLive || away.totalPoints || 0) * 10) / 10;
    return {
      id: `m${idx + 1}`,
      home: { ...homeInfo, projectedScore: homeProjected, actualScore: homeActual },
      away: { ...awayInfo, projectedScore: awayProjected, actualScore: awayActual },
      isLive: homeActual > 0 || awayActual > 0,
    };
  });

  return { week: currentMatchupPeriod, matchups };
}

// ─── PLAYERS ──────────────────────────────────────────────────────────────────

export async function getPlayers(): Promise<Player[]> {
  const data = await espnFetch('?view=mRoster&view=mTeam');
  const scoringPeriodId: number = data.scoringPeriodId || 1;
  const posGroupMap: Record<number, 'G' | 'F' | 'C'> = {
    1: 'G', 2: 'G', 3: 'F', 4: 'F', 5: 'C', 6: 'G', 7: 'F', 8: 'F',
  };

  const allPlayers: Player[] = [];
  for (const team of (data.teams || []) as any[]) {
    for (const entry of (team.roster?.entries || []) as any[]) {
      const p = entry.playerPoolEntry?.player;
      if (!p) continue;
      const stats = (p.stats || []) as any[];
      const weekStats = stats.find(
        (s: any) => s.statSourceId === 0 && s.scoringPeriodId === scoringPeriodId
      );
      const s = weekStats?.stats || {};
      const posId: number = p.defaultPositionId || 5;
      const pts = Math.round((s['0'] || 0) * 10) / 10;
      const reb = Math.round((s['6'] || 0) * 10) / 10;
      const ast = Math.round((s['3'] || 0) * 10) / 10;
      const tpm = Math.round((s['17'] || 0) * 10) / 10;
      const fp = Math.round((pts + reb * 1.2 + ast * 1.5 + tpm * 3) * 10) / 10;
      allPlayers.push({
        id: `p${p.id}`,
        name: p.fullName || 'Unknown',
        team: PRO_TEAMS[p.proTeamId] || 'NBA',
        position: posGroupMap[posId] || 'F',
        pts, reb, ast, tpm, fp,
      });
    }
  }
  return allPlayers
    .sort((a, b) => b.fp - a.fp)
    .slice(0, 15)
    .map((p, i) => ({ ...p, id: `p${i + 1}` }));
}

// ─── STATS PAGE DATA ──────────────────────────────────────────────────────────

export async function getStatsData(): Promise<StatsData> {
  // Fetch roster stats (season totals) + matchup history for categories
  const [rosterData, scheduleData] = await Promise.all([
    espnFetch('?view=mTeam&view=mRoster'),
    espnFetch('?view=mTeam&view=mMatchup&view=mMatchupScore&view=mStandings'),
  ]);

  const teams: any[] = rosterData.teams;
  const members: any[] = rosterData.members || [];
  const memberMap = buildMemberMap(members);

  const currentMatchupPeriod: number = scheduleData.status?.currentMatchupPeriod || 1;
  // Count played matchups (all before current period)
  const matchesPlayed = currentMatchupPeriod - 1;

  // ESPN stat IDs
  // 0=PTS, 1=BLK, 2=STL, 3=AST, 6=REB, 11=TO, 13=FGM, 14=FGA, 15=FTM, 16=FTA, 17=3PM, 40=MIN, 41=TD
  const statIds = { pts: '0', blk: '1', stl: '2', ast: '3', reb: '6', to: '11',
    fgm: '13', fga: '14', ftm: '15', fta: '16', tpm: '17', td: '41' };

  // ── Season stats per team (sum current roster season stats) ──
  const seasonStats: SeasonStats[] = teams.map((team: any) => {
    const ownerName = (team.owners || [])
      .map((id: string) => memberMap[id] || 'Unknown')
      .join(' & ');

    const totals: Record<string, number> = {};
    Object.values(statIds).forEach(id => { totals[id] = 0; });

    for (const entry of (team.roster?.entries || []) as any[]) {
      const p = entry.playerPoolEntry?.player;
      if (!p) continue;
      // Get season total stats (statSplitTypeId=0 = full season, statSourceId=0 = actual)
      const seasonStat = (p.stats || []).find(
        (s: any) => s.statSourceId === 0 && s.statSplitTypeId === 0
      );
      const s = seasonStat?.stats || {};
      Object.entries(statIds).forEach(([, id]) => {
        totals[id] += s[id] || 0;
      });
    }

    const fgm = Math.round(totals[statIds.fgm]);
    const fga = Math.round(totals[statIds.fga]);
    const ftm = Math.round(totals[statIds.ftm]);
    const fta = Math.round(totals[statIds.fta]);

    return {
      teamId: `team${team.id}`,
      teamName: team.name || `Team ${team.id}`,
      ownerName,
      fgm, fga, ftm, fta,
      tpm: Math.round(totals[statIds.tpm]),
      reb: Math.round(totals[statIds.reb]),
      ast: Math.round(totals[statIds.ast]),
      stl: Math.round(totals[statIds.stl]),
      blk: Math.round(totals[statIds.blk]),
      to: Math.round(totals[statIds.to]),
      td: Math.round(totals[statIds.td]),
      pts: Math.round(totals[statIds.pts]),
    };
  });

  // ── Category standings ──
  // Calculate FG% and FT% then rank all categories
  const catData = seasonStats.map(t => ({
    teamId: t.teamId,
    teamName: t.teamName,
    ownerName: t.ownerName,
    fgPctVal: t.fga > 0 ? t.fgm / t.fga : 0,
    ftPctVal: t.fta > 0 ? t.ftm / t.fta : 0,
    tpmVal: t.tpm,
    rebVal: t.reb,
    astVal: t.ast,
    stlVal: t.stl,
    blkVal: t.blk,
    toVal: t.to,
    ptsVal: t.pts,
  }));

  const fgRanks  = rankValues(catData, d => d.fgPctVal);
  const ftRanks  = rankValues(catData, d => d.ftPctVal);
  const tpmRanks = rankValues(catData, d => d.tpmVal);
  const rebRanks = rankValues(catData, d => d.rebVal);
  const astRanks = rankValues(catData, d => d.astVal);
  const stlRanks = rankValues(catData, d => d.stlVal);
  const blkRanks = rankValues(catData, d => d.blkVal);
  const toRanks  = rankValues(catData, d => d.toVal, true); // lower = better
  const ptsRanks = rankValues(catData, d => d.ptsVal);

  const categoryStandings: CategoryStanding[] = catData.map(d => ({
    teamId: d.teamId,
    teamName: d.teamName,
    ownerName: d.ownerName,
    fgPct: { value: d.fgPctVal, rank: fgRanks.get(d)! },
    ftPct: { value: d.ftPctVal, rank: ftRanks.get(d)! },
    tpm:   { value: d.tpmVal,   rank: tpmRanks.get(d)! },
    reb:   { value: d.rebVal,   rank: rebRanks.get(d)! },
    ast:   { value: d.astVal,   rank: astRanks.get(d)! },
    stl:   { value: d.stlVal,   rank: stlRanks.get(d)! },
    blk:   { value: d.blkVal,   rank: blkRanks.get(d)! },
    to:    { value: d.toVal,    rank: toRanks.get(d)! },
    pts:   { value: d.ptsVal,   rank: ptsRanks.get(d)! },
  })).sort((a, b) => {
    // Sort by total category rank score (lower = better)
    const scoreA = a.fgPct.rank + a.ftPct.rank + a.tpm.rank + a.reb.rank +
      a.ast.rank + a.stl.rank + a.blk.rank + a.to.rank + a.pts.rank;
    const scoreB = b.fgPct.rank + b.ftPct.rank + b.tpm.rank + b.reb.rank +
      b.ast.rank + b.stl.rank + b.blk.rank + b.to.rank + b.pts.rank;
    return scoreA - scoreB;
  });

  // ── Luck table ──
  const schedTeams: any[] = scheduleData.teams;
  const luckTable: LuckTableEntry[] = schedTeams.map((team: any) => {
    const ownerName = (team.owners || [])
      .map((id: string) => memberMap[id] || 'Unknown')
      .join(' & ');
    const record = team.record?.overall || {};
    const pf = Math.round((record.pointsFor || 0) * 10) / 10;
    const pa = Math.round((record.pointsAgainst || 0) * 10) / 10;
    const moves = team.transactionCounter?.acquisitionTotal ??
      team.transactionCounter?.acquisitions ?? 0;
    const weeks = matchesPlayed || 1;
    return {
      teamId: `team${team.id}`,
      teamName: team.name || `Team ${team.id}`,
      ownerName,
      pf,
      pa,
      diff: Math.round((pf - pa) * 10) / 10,
      pfPerMatch: Math.round((pf / weeks) * 10) / 10,
      paPerMatch: Math.round((pa / weeks) * 10) / 10,
      movesPerMatch: Math.round((moves / weeks) * 100) / 100,
    };
  }).sort((a, b) => b.pf - a.pf);

  return { matchesPlayed, seasonStats, categoryStandings, luckTable };
}

// ─── STATIC DATA ─────────────────────────────────────────────────────────────

export async function getHistory(): Promise<HistoryEntry[]> {
  const { default: data } = await import('@/data/history.json');
  return data as HistoryEntry[];
}

export async function getRules(): Promise<RulesData> {
  const { default: data } = await import('@/data/rules.json');
  return data as RulesData;
}
