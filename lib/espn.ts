/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  StandingEntry, MatchupsData, Matchup, Player,
  RulesData, SeasonStats,
  CategoryStanding, LuckTableEntry, StatsData,
  BracketMatchup, BracketTeam, PlayoffBracketData,
  MatchupDepthRow, MatchupDepthData,
  TransactionPlayer, FantasyTeamActivity, TransactionsData,
  TradeEvent, TradedPlayer,
} from './types';
import { getNBAScoreboard } from './nba';

const ESPN_S2 = process.env.ESPN_S2;
const SWID = process.env.SWID;
const LEAGUE_ID = process.env.LEAGUE_ID;
const SEASON = process.env.SEASON || '2026';

export function hasEspnCredentials() {
  return !!(ESPN_S2 && SWID && LEAGUE_ID);
}

const BASE = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${SEASON}/segments/0/leagues/${LEAGUE_ID}`;

async function espnFetch(params: string, extraHeaders?: Record<string, string>): Promise<any> {
  const url = `${BASE}${params}`;
  const res = await fetch(url, {
    headers: {
      Cookie: `espn_s2=${ESPN_S2}; SWID=${SWID}`,
      Accept: 'application/json',
      ...extraHeaders,
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

export async function getMatchups(targetWeek?: number): Promise<MatchupsData> {
  const [espnResult, nbaResult] = await Promise.allSettled([
    espnFetch('?view=mTeam&view=mMatchup&view=mMatchupScore&view=mScoreboard&view=mRoster'),
    getNBAScoreboard(),
  ]);
  if (espnResult.status === 'rejected') throw espnResult.reason;
  const data = espnResult.value;

  const currentMatchupPeriod: number = data.status?.currentMatchupPeriod || 1;
  const currentScoringPeriod: number =
    data.scoringPeriodId || data.status?.latestScoringPeriod || currentMatchupPeriod;

  const week = Math.min(Math.max(1, targetWeek ?? currentMatchupPeriod), currentMatchupPeriod);

  const teams: any[] = data.teams || [];
  const members: any[] = data.members || [];
  const memberMap = buildMemberMap(members);
  const myTeamId = findMyTeamId(members, teams);

  // NBA teams with games still to play today (pre or live)
  const todayRemainingTeams = new Set<string>();
  if (nbaResult.status === 'fulfilled') {
    for (const game of nbaResult.value) {
      if (game.status !== 'final') {
        todayRemainingTeams.add(game.homeTeam.tricode);
        todayRemainingTeams.add(game.awayTeam.tricode);
      }
    }
  }

  // Build team map (W-L record, roster)
  const teamMap: Record<number, any> = {};
  const rosterMap: Record<number, any[]> = {};
  for (const t of teams) {
    const ownerName = (t.owners || [])
      .map((id: string) => memberMap[id] || 'Unknown')
      .join(' & ');
    const record = t.record?.overall || {};
    teamMap[t.id] = {
      teamId: `team${t.id}`,
      teamName: t.name || `Team ${t.id}`,
      ownerName,
      isYou: t.id === myTeamId,
      wins: record.wins || 0,
      losses: record.losses || 0,
    };
    rosterMap[t.id] = t.roster?.entries || [];
  }

  // Count active-slot players who have a game today but haven't scored yet
  function countPlayersRemaining(teamId: number): number {
    let count = 0;
    for (const entry of rosterMap[teamId] || []) {
      if ((entry.lineupSlotId ?? 9) >= 9) continue; // bench / IR
      const p = entry.playerPoolEntry?.player;
      if (!p?.proTeamId) continue;
      const proTeam = PRO_TEAMS[p.proTeamId];
      if (!proTeam || !todayRemainingTeams.has(proTeam)) continue;
      // Already played today?
      const todayStat = (p.stats || []).find(
        (s: any) => s.statSourceId === 0 && s.scoringPeriodId === currentScoringPeriod
      );
      if (todayStat && todayStat.appliedTotal > 0) continue;
      count++;
    }
    return count;
  }

  // H2H records from all completed regular-season matchups
  const h2hWins: Record<number, Record<number, number>> = {};
  const allSchedule: any[] = data.schedule || [];
  for (const m of allSchedule) {
    if (m.playoffTierType && m.playoffTierType !== 'NONE') continue;
    if (m.winner !== 'HOME' && m.winner !== 'AWAY') continue;
    const hId: number = m.home?.teamId;
    const aId: number = m.away?.teamId;
    if (!hId || !aId) continue;
    if (!h2hWins[hId]) h2hWins[hId] = {};
    if (!h2hWins[aId]) h2hWins[aId] = {};
    if (m.winner === 'HOME') h2hWins[hId][aId] = (h2hWins[hId][aId] || 0) + 1;
    else h2hWins[aId][hId] = (h2hWins[aId][hId] || 0) + 1;
  }

  // Total regular-season weeks
  const regularSchedule = allSchedule.filter(
    (m: any) => !m.playoffTierType || m.playoffTierType === 'NONE'
  );
  const totalWeeks = regularSchedule.length > 0
    ? Math.max(...regularSchedule.map((m: any) => m.matchupPeriodId as number))
    : currentMatchupPeriod;

  const isCurrentWeek = week === currentMatchupPeriod;
  const weekMatchups = allSchedule.filter(
    (m: any) =>
      m.matchupPeriodId === week &&
      (!m.playoffTierType || m.playoffTierType === 'NONE')
  );

  const blankTeam = { teamId: 'unknown', teamName: 'TBD', ownerName: 'TBD', isYou: false, wins: 0, losses: 0 };

  const matchups: Matchup[] = weekMatchups.map((m: any, idx: number) => {
    const home = m.home || {};
    const away = m.away || {};
    const homeInfo = teamMap[home.teamId] || blankTeam;
    const awayInfo = teamMap[away.teamId] || blankTeam;

    const homeActual   = Math.round((home.totalPoints || 0) * 10) / 10;
    const awayActual   = Math.round((away.totalPoints || 0) * 10) / 10;
    const homeProjected = Math.round(
      (home.totalProjectedPointsLive || home.totalPoints || 0) * 10
    ) / 10;
    const awayProjected = Math.round(
      (away.totalProjectedPointsLive || away.totalPoints || 0) * 10
    ) / 10;

    const isFinal = m.winner === 'HOME' || m.winner === 'AWAY';
    const isLive  = isCurrentWeek && !isFinal && (homeActual > 0 || awayActual > 0);

    return {
      id: `m${idx + 1}`,
      home: {
        ...homeInfo,
        projectedScore: homeProjected,
        actualScore: homeActual,
        playersRemainingToday: isCurrentWeek && !isFinal ? countPlayersRemaining(home.teamId) : 0,
      },
      away: {
        ...awayInfo,
        projectedScore: awayProjected,
        actualScore: awayActual,
        playersRemainingToday: isCurrentWeek && !isFinal ? countPlayersRemaining(away.teamId) : 0,
      },
      isLive,
      isFinal,
      isBattleOfWeek: false, // set below
      h2h: {
        homeWins: h2hWins[home.teamId]?.[away.teamId] || 0,
        awayWins: h2hWins[away.teamId]?.[home.teamId] || 0,
      },
    };
  });

  // Battle of the week: closest matchup by projected score (or actual if final)
  if (matchups.length > 0) {
    let minDiff = Infinity;
    let battleIdx = 0;
    matchups.forEach((m, i) => {
      const a = m.isFinal ? m.home.actualScore : m.home.projectedScore;
      const b = m.isFinal ? m.away.actualScore : m.away.projectedScore;
      const diff = Math.abs(a - b);
      if (diff < minDiff) { minDiff = diff; battleIdx = i; }
    });
    matchups[battleIdx].isBattleOfWeek = true;
  }

  return { week, currentWeek: currentMatchupPeriod, totalWeeks, matchups };
}

// ─── PLAYERS ──────────────────────────────────────────────────────────────────

// Percentage-component stat IDs excluded from raw FP sum
// (FGM=13, FGA=14, FTM=15, FTA=16 contribute via FG%/FT% categories)
const PCT_STAT_IDS = new Set(['13', '14', '15', '16']);

interface ScoringItem {
  statId: string;
  pointValue: number;
  isReverseItem: boolean;
}

function buildFPCalc(items: ScoringItem[]) {
  return function calcFP(stats: Record<string, number>): number {
    let fp = 0;
    for (const item of items) {
      if (PCT_STAT_IDS.has(item.statId)) continue;
      const val = stats[item.statId] || 0;
      fp += item.isReverseItem ? -val * item.pointValue : val * item.pointValue;
    }
    return Math.round(fp * 10) / 10;
  };
}

// Fallback scoring items for this 9-cat H2H league (pointValue=1 each)
const FALLBACK_SCORING_ITEMS: ScoringItem[] = [
  { statId: '0',  pointValue: 1, isReverseItem: false }, // PTS
  { statId: '1',  pointValue: 1, isReverseItem: false }, // BLK
  { statId: '2',  pointValue: 1, isReverseItem: false }, // STL
  { statId: '3',  pointValue: 1, isReverseItem: false }, // AST
  { statId: '6',  pointValue: 1, isReverseItem: false }, // REB
  { statId: '11', pointValue: 1, isReverseItem: true  }, // TO (lower is better)
  { statId: '17', pointValue: 1, isReverseItem: false }, // 3PM
];

function r1(n: number) { return Math.round(n * 10) / 10; }

// Extract per-game averages from ESPN stats array.
// Prefers statSplitTypeId=1 (per-game); falls back to totals ÷ estimated GP.
function extractPerGame(stats: any[]): Record<string, number> {
  const pg = stats.find((s: any) => s.statSourceId === 0 && s.statSplitTypeId === 1);
  if (pg?.stats) return pg.stats;
  const tot = stats.find((s: any) => s.statSourceId === 0 && s.statSplitTypeId === 0);
  if (!tot?.stats) return {};
  const s = tot.stats as Record<string, number>;
  const gp = Math.max(1, Math.round((s['40'] || 0) / 30));
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(s)) out[k] = v / gp;
  return out;
}

export async function getPlayers(): Promise<Player[]> {
  const posGroupMap: Record<number, 'G' | 'F' | 'C'> = {
    1: 'G', 2: 'G', 3: 'F', 4: 'F', 5: 'C', 6: 'G', 7: 'F', 8: 'F',
  };

  // Fetch scoring settings, roster, and last-7-days stats in parallel
  const [settingsResult, rosterData, l7Result] = await Promise.all([
    espnFetch('?view=mSettings').catch(() => null),
    espnFetch('?view=mRoster&view=mTeam'),
    espnFetch('?view=kona_player_info', {
      'x-fantasy-filter': JSON.stringify({
        players: { limit: 500, filterStatsForTopScoringPeriodIds: { value: 7 } },
      }),
    }).catch(() => null),
  ]);

  // Build scoring function from league settings (falls back to 9-cat defaults)
  const rawItems: any[] = settingsResult?.settings?.scoringSettings?.scoringItems || [];
  const scoringItems: ScoringItem[] = rawItems.length > 0
    ? rawItems.map((item: any) => ({
        statId: String(item.statId),
        pointValue: item.pointValue ?? 1,
        isReverseItem: item.isReverseItem ?? false,
      }))
    : FALLBACK_SCORING_ITEMS;
  const calcFP = buildFPCalc(scoringItems);

  // Build L7 per-game map: playerId → per-game stats
  const l7Map = new Map<number, Record<string, number>>();
  for (const entry of ((l7Result?.players || []) as any[])) {
    const player = entry.playerPoolEntry?.player;
    if (!player) continue;
    const pg = extractPerGame(player.stats || []);
    if (Object.keys(pg).length > 0) l7Map.set(player.id as number, pg);
  }

  const allPlayers: Player[] = [];
  for (const team of (rosterData.teams || []) as any[]) {
    for (const entry of (team.roster?.entries || []) as any[]) {
      const p = entry.playerPoolEntry?.player;
      if (!p) continue;

      // Season per-game averages
      const s = extractPerGame(p.stats || []);
      const pts = r1(s['0']  || 0);
      const reb = r1(s['6']  || 0);
      const ast = r1(s['3']  || 0);
      const stl = r1(s['2']  || 0);
      const blk = r1(s['1']  || 0);
      const tpm = r1(s['17'] || 0);
      const to  = r1(s['11'] || 0);
      const fp  = calcFP(s);

      if (pts === 0 && reb === 0 && ast === 0) continue;

      // Last 7 days per-game averages
      const l7 = l7Map.get(p.id as number) || {};
      const pts7 = r1(l7['0']  || 0);
      const reb7 = r1(l7['6']  || 0);
      const ast7 = r1(l7['3']  || 0);
      const stl7 = r1(l7['2']  || 0);
      const blk7 = r1(l7['1']  || 0);
      const tpm7 = r1(l7['17'] || 0);
      const to7  = r1(l7['11'] || 0);
      const fp7  = calcFP(l7);

      allPlayers.push({
        id: `p${p.id}`,
        name: p.fullName || 'Unknown',
        team: PRO_TEAMS[p.proTeamId] || 'NBA',
        position: posGroupMap[p.defaultPositionId || 5] || 'F',
        pts, reb, ast, stl, blk, tpm, to, fp,
        pts7, reb7, ast7, stl7, blk7, tpm7, to7, fp7,
      });
    }
  }

  return allPlayers
    .sort((a, b) => b.fp - a.fp)
    .slice(0, 30)
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

// ─── PLAYOFF BRACKET ──────────────────────────────────────────────────────────

export async function getPlayoffBracket(): Promise<PlayoffBracketData> {
  const data = await espnFetch(
    '?view=mTeam&view=mMatchup&view=mMatchupScore&view=mStandings'
  );

  const currentMatchupPeriod: number = data.status?.currentMatchupPeriod || 1;
  const teams: any[] = data.teams || [];
  const members: any[] = data.members || [];
  const memberMap = buildMemberMap(members);
  const myTeamId = findMyTeamId(members, teams);

  // Build team info (seed comes from playoffSeed or rank)
  const teamMap: Record<number, { name: string; owner: string; seed: number; isYou: boolean }> = {};
  for (const t of teams) {
    const owner = (t.owners || []).map((id: string) => memberMap[id] || 'Unknown').join(' & ');
    teamMap[t.id] = {
      name: t.name || `Team ${t.id}`,
      owner,
      seed: t.playoffSeed || t.rankCalculatedFinal || 0,
      isYou: t.id === myTeamId,
    };
  }

  // Filter to playoff matchups only
  const allMatchups: any[] = data.schedule || [];
  const playoffMatchups = allMatchups.filter(
    (m: any) => m.playoffTierType && m.playoffTierType !== 'NONE'
  );

  const isPlayoffs = playoffMatchups.some(
    (m: any) => m.matchupPeriodId === currentMatchupPeriod
  );

  // Determine round numbers: sort unique playoff periods, assign round 1, 2, ...
  const playoffPeriods = Array.from(
    new Set(playoffMatchups.map((m: any) => m.matchupPeriodId as number))
  ).sort((a, b) => a - b);

  function makeTeam(side: any, id: number): BracketTeam {
    const info = teamMap[id] || { name: '?', owner: '?', seed: 0, isYou: false };
    return {
      teamId: `team${id}`,
      teamName: info.name,
      ownerName: info.owner,
      score: Math.round((side?.totalPoints || 0) * 10) / 10,
      seed: info.seed,
      isYou: info.isYou,
    };
  }

  const brackets: BracketMatchup[] = playoffMatchups.map((m: any, idx: number) => {
    const round = playoffPeriods.indexOf(m.matchupPeriodId) + 1;
    const home = makeTeam(m.home, m.home?.teamId);
    const away = m.away?.teamId != null ? makeTeam(m.away, m.away.teamId) : null;

    let winner: 'home' | 'away' | null = null;
    if (m.winner === 'HOME') winner = 'home';
    else if (m.winner === 'AWAY') winner = 'away';

    const isWinners = m.playoffTierType === 'WINNERS_BRACKET';

    return {
      id: `bracket-${idx}`,
      round,
      bracketType: isWinners ? 'winners' : 'consolation',
      matchupPeriodId: m.matchupPeriodId,
      home,
      away,
      winner,
      isCurrentRound: m.matchupPeriodId === currentMatchupPeriod,
    };
  });

  const winners = brackets
    .filter(m => m.bracketType === 'winners')
    .sort((a, b) => a.round - b.round || a.home.seed - b.home.seed);

  const consolation = brackets
    .filter(m => m.bracketType === 'consolation')
    .sort((a, b) => a.round - b.round);

  // Champion = winner of the highest-round winners matchup
  const finalMatchup = winners.filter(m => m.round === playoffPeriods.length)[0] ?? null;
  let champion: BracketTeam | null = null;
  if (finalMatchup?.winner === 'home') champion = finalMatchup.home;
  else if (finalMatchup?.winner === 'away') champion = finalMatchup.away;

  return {
    isPlayoffs,
    currentMatchupPeriod,
    totalRounds: playoffPeriods.length,
    winners,
    consolation,
    champion,
  };
}

// ─── MATCHUP DEPTH ────────────────────────────────────────────────────────────

export async function getMatchupDepth(): Promise<MatchupDepthData> {
  const scheduleData = await espnFetch('?view=mMatchup&view=mMatchupScore&view=mTeam&view=mSettings');

  const currentMatchupPeriod: number = scheduleData.status?.currentMatchupPeriod || 1;
  // Daily scoring period ID — in daily-scoring leagues this is >> currentMatchupPeriod
  // (e.g. 148 days into the season vs week 18). In weekly-scoring leagues it equals it.
  const currentScoringPeriod: number =
    scheduleData.scoringPeriodId ||
    scheduleData.status?.latestScoringPeriod ||
    currentMatchupPeriod;

  const teams: any[] = scheduleData.teams || [];
  const members: any[] = scheduleData.members || [];
  const memberMap = buildMemberMap(members);
  const myTeamId = findMyTeamId(members, teams);

  const teamMeta: Record<number, { name: string; owner: string; isYou: boolean }> = {};
  for (const t of teams) {
    const owner = (t.owners || []).map((id: string) => memberMap[id] || 'Unknown').join(' & ');
    teamMeta[t.id] = { name: t.name || `Team ${t.id}`, owner, isYou: t.id === myTeamId };
  }

  const isDailyLeague = currentScoringPeriod > currentMatchupPeriod * 2;

  // Build an exact map of matchupPeriodId → sorted scoring period IDs using the
  // pointsByScoringPeriod field that mMatchupScore already returns for each matchup.
  // This tells us exactly which daily SPs belong to each matchup week with no estimation.
  const schedule: any[] = scheduleData.schedule || [];
  const matchupScoringPeriods: Record<number, number[]> = {};
  for (const m of schedule) {
    const mpId: number = m.matchupPeriodId;
    if (!mpId || matchupScoringPeriods[mpId]) continue;
    const pbsp: Record<string, number> =
      m.home?.pointsByScoringPeriod || m.away?.pointsByScoringPeriod || {};
    const sps = Object.keys(pbsp).map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
    if (sps.length > 0) matchupScoringPeriods[mpId] = sps;
  }

  function getScoringPeriods(matchupPeriodId: number): number[] {
    // Use exact SPs derived from score data when available
    const exact = matchupScoringPeriods[matchupPeriodId];
    if (exact && exact.length > 0) return exact;

    if (!isDailyLeague) {
      // Weekly scoring league: one period per matchup, no per-day breakdown available
      return [matchupPeriodId];
    }
    // Fallback: pro-rate scoring periods across matchup weeks
    const spPerWeek = currentScoringPeriod / currentMatchupPeriod;
    const start = Math.round((matchupPeriodId - 1) * spPerWeek) + 1;
    const end = matchupPeriodId < currentMatchupPeriod
      ? Math.round(matchupPeriodId * spPerWeek)
      : currentScoringPeriod;
    const days = Math.min(Math.max(1, end - start + 1), 9);
    return Array.from({ length: days }, (_, i) => start + i);
  }

  const completed = schedule.filter(
    (m: any) => m.playoffTierType === 'NONE' && m.matchupPeriodId < currentMatchupPeriod
  );

  const completedPeriods = Array.from(
    new Set(completed.map((m: any) => m.matchupPeriodId as number))
  ).sort((a, b) => a - b);

  // Fetch roster for EACH scoring period (day) individually so ESPN returns
  // accurate stats for that specific day. Fetching with a single mid-week period
  // only returns stats for ~2 adjacent days, leaving the rest as zero.
  // periodDayMap[matchupPeriod][scoringPeriodId][teamId] = entries[]
  const periodDayMap: Record<number, Record<number, Record<number, any[]>>> = {};

  // Build the full list of (period, sp) tasks across all completed weeks
  const tasks: Array<{ period: number; sp: number }> = [];
  for (const period of completedPeriods) {
    for (const sp of getScoringPeriods(period)) {
      tasks.push({ period, sp });
    }
  }

  const BATCH = 10;
  for (let i = 0; i < tasks.length; i += BATCH) {
    const batch = tasks.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(({ sp }) => espnFetch(`?view=mRoster&view=mTeam&scoringPeriodId=${sp}`))
    );
    batch.forEach(({ period, sp }, j) => {
      if (!periodDayMap[period]) periodDayMap[period] = {};
      periodDayMap[period][sp] = {};
      const r = results[j];
      if (r.status !== 'fulfilled') return;
      for (const team of (r.value.teams || []) as any[]) {
        periodDayMap[period][sp][team.id] = team.roster?.entries || [];
      }
    });
  }

  const MAX_PLAYERS_PER_DAY = 10; // a fantasy team can only start 10 players/day

  function countPlayersOnDay(entries: any[], scoringPeriodId: number): number {
    let count = 0;
    for (const entry of entries) {
      const p = entry.playerPoolEntry?.player;
      if (!p) continue;
      const stats: any[] = p.stats || [];
      const dayStat = stats.find(
        (s: any) => s.statSourceId === 0 && s.scoringPeriodId === scoringPeriodId
      );
      if (dayStat && (dayStat.appliedTotal > 0 || (dayStat.stats?.['0'] || 0) > 0 || (dayStat.stats?.['40'] || 0) > 0)) {
        count++;
      }
    }
    return Math.min(count, MAX_PLAYERS_PER_DAY);
  }

  const rows: MatchupDepthRow[] = [];

  for (const m of completed) {
    const scoringPeriods = getScoringPeriods(m.matchupPeriodId);

    for (const side of ['home', 'away'] as const) {
      const mySide = m[side];
      const oppSide = m[side === 'home' ? 'away' : 'home'];
      if (!mySide?.teamId) continue;

      const meta = teamMeta[mySide.teamId] || { name: '?', owner: '?', isYou: false };
      const oppMeta = teamMeta[oppSide?.teamId] || { name: '?', owner: '?', isYou: false };

      // Count players for each day using that day's own roster fetch
      const dailyPlayers = scoringPeriods.map(sp => {
        const entries = periodDayMap[m.matchupPeriodId]?.[sp]?.[mySide.teamId] || [];
        return countPlayersOnDay(entries, sp);
      });
      const totalPlayers = dailyPlayers.reduce((s, n) => s + n, 0);

      const teamScore = Math.round((mySide.totalPoints || 0) * 10) / 10;
      const oppScore  = Math.round((oppSide?.totalPoints || 0) * 10) / 10;

      const scorePP    = totalPlayers > 0 ? Math.round((teamScore / totalPlayers) * 10) / 10 : 0;
      const efficiency = totalPlayers > 0 ? Math.round((scorePP / totalPlayers) * 1000) / 1000 : 0;

      let won: boolean | null = null;
      if (m.winner === 'HOME') won = side === 'home';
      else if (m.winner === 'AWAY') won = side === 'away';

      rows.push({
        matchupPeriod: m.matchupPeriodId,
        teamId: `team${mySide.teamId}`,
        teamName: meta.name,
        ownerName: meta.owner,
        isYou: meta.isYou,
        dailyPlayers: dailyPlayers.slice(0, scoringPeriods.length),
        totalPlayers,
        teamScore,
        opponentName: oppMeta.owner,
        opponentScore: oppScore,
        won,
        scorePP,
        efficiency,
      });
    }
  }

  rows.sort((a, b) => a.matchupPeriod - b.matchupPeriod || a.teamName.localeCompare(b.teamName));

  // Use the max day count across all completed weeks so every week's columns align
  const daysPerMatchup = completedPeriods.length > 0
    ? Math.max(...completedPeriods.map(p => getScoringPeriods(p).length))
    : 7;

  return { rows, daysPerMatchup, currentMatchupPeriod, completedPeriods };
}

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────

export async function getTransactions(): Promise<TransactionsData> {
  // ?view=mTransactions2 returns only the given scoring period's transactions.
  // In daily-scoring leagues scoringPeriodId is a DAY number (can reach ~150+),
  // not the matchup-week number — so we must iterate up to the actual daily
  // scoring period, not just currentMatchupPeriod. Batch 20 at a time.
  const [statusData, rosterData] = await Promise.all([
    espnFetch('?view=mTeam'),
    espnFetch('?view=mRoster&view=mTeam'),
  ]);

  const currentMatchupPeriod: number = statusData.status?.currentMatchupPeriod || 1;
  // In daily leagues this is ~148; in weekly leagues it equals currentMatchupPeriod
  const currentScoringPeriod: number =
    statusData.scoringPeriodId ||
    statusData.status?.latestScoringPeriod ||
    currentMatchupPeriod;

  console.log(`[ESPN] scoringPeriodId=${currentScoringPeriod} matchupPeriod=${currentMatchupPeriod}`);

  const allTransactions: any[] = [];

  // Also fetch without a scoringPeriodId — ESPN sometimes returns trades here
  // (especially when they're associated with period 0 or no period)
  try {
    const baseTx = await espnFetch('?view=mTransactions2');
    allTransactions.push(...(baseTx.transactions || []));
  } catch { /* ignore */ }

  const BATCH = 20;
  for (let i = 1; i <= currentScoringPeriod; i += BATCH) {
    const periods = Array.from(
      { length: Math.min(BATCH, currentScoringPeriod - i + 1) },
      (_, j) => i + j
    );
    const results = await Promise.allSettled(
      periods.map(p => espnFetch(`?view=mTransactions2&scoringPeriodId=${p}`))
    );
    for (const r of results) {
      if (r.status === 'fulfilled') {
        allTransactions.push(...(r.value.transactions || []));
      }
    }
  }

  const teams: any[] = rosterData.teams || [];
  const members: any[] = rosterData.members || [];
  const memberMap = buildMemberMap(members);
  const myTeamId = findMyTeamId(members, teams);

  const teamMeta: Record<number, { name: string; owner: string; isYou: boolean }> = {};
  for (const t of teams) {
    const owner = (t.owners || []).map((id: string) => memberMap[id] || 'Unknown').join(' & ');
    teamMeta[t.id] = { name: t.name || `Team ${t.id}`, owner, isYou: t.id === myTeamId };
  }

  // Build player info from current rosters first
  const playerInfo: Record<number, { name: string; proTeam: string; position: string }> = {};
  for (const team of teams) {
    for (const entry of (team.roster?.entries || []) as any[]) {
      const p = entry.playerPoolEntry?.player;
      if (!p) continue;
      playerInfo[p.id] = {
        name: p.fullName || `Player ${p.id}`,
        proTeam: PRO_TEAMS[p.proTeamId] || 'FA',
        position: ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'F'][p.defaultPositionId - 1] || 'F',
      };
    }
  }

  // Walk all transactions, tally ADD actions only (executed, non-pending)
  // Deduplicate by transaction id in case periods overlap
  const seenTxIds = new Set<string>();
  const transactions: any[] = allTransactions.filter(tx => {
    if (seenTxIds.has(tx.id)) return false;
    seenTxIds.add(tx.id);
    return true;
  });
  const playerAddCount: Record<number, number> = {};
  // fantasyTeamPlayerAdds[teamId][playerId] = add count
  const fantasyTeamPlayerAdds: Record<number, Record<number, number>> = {};
  const unknownIds = new Set<number>();

  const rawTrades: any[] = [];

  for (const tx of transactions) {
    // Skip truly pending/failed transactions; accept any "executed" variant
    const txStatus = (tx.status as string || '').toUpperCase();
    if (txStatus === 'PENDING' || txStatus === 'FAILED' || txStatus === 'DRAFT' || txStatus === 'PROPOSED') continue;
    const isTrade = (tx.type as string || '').toUpperCase().includes('TRADE');
    if (isTrade) {
      rawTrades.push(tx);
      // Collect traded player IDs for name resolution
      for (const item of (tx.items || []) as any[]) {
        if (item.playerId && !playerInfo[item.playerId]) unknownIds.add(item.playerId);
      }
      continue;
    }
    for (const item of (tx.items || []) as any[]) {
      if (item.type !== 'ADD') continue;
      const playerId: number = item.playerId;
      const toTeamId: number = item.toTeamId;
      if (!playerId || toTeamId < 0) continue;

      playerAddCount[playerId] = (playerAddCount[playerId] || 0) + 1;
      if (!fantasyTeamPlayerAdds[toTeamId]) fantasyTeamPlayerAdds[toTeamId] = {};
      fantasyTeamPlayerAdds[toTeamId][playerId] = (fantasyTeamPlayerAdds[toTeamId][playerId] || 0) + 1;

      if (!playerInfo[playerId]) unknownIds.add(playerId);
    }
  }

  // Fetch names for players not on any current roster (dropped/waived).
  // Uses ESPN's public sports API — no league context or auth cookies needed,
  // reliable for any NBA player ID, and Next.js caches each lookup for 24 h.
  if (unknownIds.size > 0) {
    const idList = Array.from(unknownIds);
    const CONCURRENCY = 10;
    for (let i = 0; i < idList.length; i += CONCURRENCY) {
      const batch = idList.slice(i, i + CONCURRENCY);
      await Promise.allSettled(
        batch.map(async (playerId) => {
          try {
            const res = await fetch(
              `https://site.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${playerId}`,
              { next: { revalidate: 86400 } }
            );
            if (!res.ok) return;
            const d = await res.json();
            const a = d.athlete;
            if (!a) return;
            playerInfo[playerId] = {
              name: a.displayName || a.fullName || `Player ${playerId}`,
              proTeam: a.team?.abbreviation || 'FA',
              position: a.position?.abbreviation || 'F',
            };
          } catch { /* silently skip unresolvable IDs */ }
        })
      );
    }
  }

  // Top 10 most-added players
  const topAddedPlayers: TransactionPlayer[] = Object.entries(playerAddCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([idStr, count]) => {
      const id = Number(idStr);
      const info = playerInfo[id] || { name: `Player ${id}`, proTeam: 'FA', position: 'F' };
      return { playerId: id, playerName: info.name, proTeam: info.proTeam, position: info.position, addCount: count };
    });

  // Adds grouped by NBA team
  const nbaTeamCount: Record<string, number> = {};
  for (const [idStr, count] of Object.entries(playerAddCount)) {
    const proTeam = playerInfo[Number(idStr)]?.proTeam || 'FA';
    if (proTeam === 'FA') continue;
    nbaTeamCount[proTeam] = (nbaTeamCount[proTeam] || 0) + count;
  }
  const addsByNbaTeam = Object.entries(nbaTeamCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([team, count]) => ({ team, count }));

  // Per fantasy team: top targeted player + total adds
  const byFantasyTeam: FantasyTeamActivity[] = Object.entries(fantasyTeamPlayerAdds)
    .map(([teamIdStr, playerCounts]) => {
      const teamId = Number(teamIdStr);
      const meta = teamMeta[teamId] || { name: `Team ${teamId}`, owner: 'Unknown', isYou: false };
      const totalAdds = Object.values(playerCounts).reduce((s, n) => s + n, 0);
      const [topIdStr, topCount] = Object.entries(playerCounts)
        .sort(([, a], [, b]) => b - a)[0] ?? ['0', 0];
      const topId = Number(topIdStr);
      const topInfo = playerInfo[topId] || { name: `Player ${topId}`, proTeam: 'FA', position: 'F' };
      return {
        teamId: `team${teamId}`,
        teamName: meta.name,
        ownerName: meta.owner,
        isYou: meta.isYou,
        topPlayer: topInfo.name,
        topPlayerProTeam: topInfo.proTeam,
        topPlayerCount: Number(topCount),
        totalAdds,
      };
    })
    .sort((a, b) => b.totalAdds - a.totalAdds);

  const totalAdds = Object.values(playerAddCount).reduce((s, n) => s + n, 0);

  // Build trade history (two-team trades only; sort newest first)
  const trades: TradeEvent[] = [];
  for (const tx of rawTrades) {
    const seenMovements = new Set<string>();
    const movements: { playerId: number; fromTeamId: number; toTeamId: number }[] = [];

    for (const item of (tx.items || []) as any[]) {
      if (!item.playerId || item.fromTeamId == null || item.toTeamId == null) continue;
      const itype = (item.type as string || '').toUpperCase();
      // Accept TRADED_AWAY directly. For TRADED_FOR, ESPN sets fromTeamId=sender,
      // toTeamId=receiver (same direction as TRADED_AWAY), so treat it the same way
      // but deduplicate by player+from+to in case both item types appear.
      if (!itype.includes('TRAD')) continue;
      // Skip TRADED_FOR if we already have the same movement from TRADED_AWAY
      const key = `${item.playerId}-${item.fromTeamId}-${item.toTeamId}`;
      if (seenMovements.has(key)) continue;
      seenMovements.add(key);
      movements.push({ playerId: item.playerId, fromTeamId: item.fromTeamId, toTeamId: item.toTeamId });
    }
    if (movements.length === 0) continue;
    const teamIdSet = new Set(movements.flatMap(m => [m.fromTeamId, m.toTeamId]));
    if (teamIdSet.size !== 2) continue; // skip multi-team or malformed trades
    const [teamAId, teamBId] = Array.from(teamIdSet) as [number, number];

    const makePlayer = (id: number): TradedPlayer => {
      const info = playerInfo[id] || { name: `Player ${id}`, proTeam: 'FA', position: 'F' };
      return { playerId: id, playerName: info.name, proTeam: info.proTeam, position: info.position };
    };

    const metaA = teamMeta[teamAId] || { name: `Team ${teamAId}`, owner: 'Unknown', isYou: false };
    const metaB = teamMeta[teamBId] || { name: `Team ${teamBId}`, owner: 'Unknown', isYou: false };

    trades.push({
      tradeId: tx.id,
      date: tx.processDate || tx.executionDate || 0,
      teamA: { teamId: teamAId, teamName: metaA.name, ownerName: metaA.owner },
      teamB: { teamId: teamBId, teamName: metaB.name, ownerName: metaB.owner },
      teamAReceived: movements.filter(m => m.toTeamId === teamAId).map(m => makePlayer(m.playerId)),
      teamBReceived: movements.filter(m => m.toTeamId === teamBId).map(m => makePlayer(m.playerId)),
    });
  }
  trades.sort((a, b) => b.date - a.date);

  return { topAddedPlayers, addsByNbaTeam, byFantasyTeam, totalAdds, trades };
}

// ─── STATIC DATA ─────────────────────────────────────────────────────────────


export async function getRules(): Promise<RulesData> {
  const { default: data } = await import('@/data/rules.json');
  return data as RulesData;
}
