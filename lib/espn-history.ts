/* eslint-disable @typescript-eslint/no-explicit-any */
import type { HistoricalSeason, HistoricalTeam, CategoryPercentiles } from './types';
import { extractSeasonStats } from './scoring';
import { ALL_SEASONS, CURRENT_SEASON, seasonLabel } from './season';

const ESPN_S2 = process.env.ESPN_S2;
const SWID = process.env.SWID;
const LEAGUE_ID = process.env.LEAGUE_ID;

const HISTORY_YEARS = [...ALL_SEASONS].reverse(); // newest first

async function espnFetchYear(year: number, params: string, noCache = false): Promise<any> {
  const base = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${year}/segments/0/leagues/${LEAGUE_ID}`;
  const cacheOpt: RequestInit = noCache
    ? { cache: 'no-store' }
    : { next: { revalidate: 86400 } } as RequestInit;
  const res = await fetch(`${base}${params}`, {
    headers: {
      Cookie: `espn_s2=${ESPN_S2}; SWID=${SWID}`,
      Accept: 'application/json',
    },
    ...cacheOpt,
  });
  if (!res.ok) throw new Error(`ESPN ${res.status} for year=${year}`);
  return res.json();
}

function buildMemberMap(members: any[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const m of members) {
    map[m.id] = `${m.firstName} ${m.lastName}`.trim();
  }
  return map;
}

async function fetchOneSeason(year: number): Promise<HistoricalSeason> {
  // Fetch teams/standings + full schedule in parallel
  const [standingsData, scheduleData] = await Promise.all([
    espnFetchYear(year, '?view=mTeam&view=mStandings'),
    espnFetchYear(year, '?view=mMatchup&view=mMatchupScore', true),
  ]);

  const members: any[] = standingsData.members || [];
  const memberMap = buildMemberMap(members);

  // ── Build team lookup ───────────────────────────────────────────────────────
  const teamMap: Record<number, { name: string; owner: string }> = {};
  for (const t of standingsData.teams as any[]) {
    const ownerName = (t.owners || [])
      .map((id: string) => memberMap[id] || 'Unknown')
      .join(' & ');
    teamMap[t.id] = { name: t.name || `Team ${t.id}`, owner: ownerName };
  }

  // ── Final standings ────────────────────────────────────────────────────────
  // rankCalculatedFinal = ESPN's post-playoff final position (1=champion, 2=runner-up, …)
  // playoffSeed         = regular-season seeding — used only as fallback for older seasons
  const finalStandings: HistoricalTeam[] = (standingsData.teams as any[])
    .map((t: any) => {
      const record = t.record?.overall || {};
      return {
        rank: t.rankCalculatedFinal || t.playoffSeed || 99,
        teamName: teamMap[t.id]?.name ?? `Team ${t.id}`,
        ownerName: teamMap[t.id]?.owner ?? 'Unknown',
        wins: record.wins || 0,
        losses: record.losses || 0,
        pf: Math.round((record.pointsFor || 0) * 10) / 10,
        pa: Math.round((record.pointsAgainst || 0) * 10) / 10,
      };
    })
    .sort((a, b) => a.rank - b.rank);

  // ── Find champion from playoff schedule ────────────────────────────────────
  const schedule: any[] = scheduleData.schedule || [];

  // Championship game = highest-period WINNERS_BRACKET matchup
  const playoffGames = schedule.filter(
    (m: any) =>
      m.playoffTierType === 'WINNERS_BRACKET' ||
      m.playoffTierType === 'CHAMPIONSHIP'
  );

  let champion: HistoricalTeam | null = null;
  let runnerUp: HistoricalTeam | null = null;

  if (playoffGames.length > 0) {
    const finalGame = playoffGames.reduce((latest: any, m: any) =>
      m.matchupPeriodId > latest.matchupPeriodId ? m : latest
    );

    const home = finalGame.home || {};
    const away = finalGame.away || {};
    const homeScore = home.totalPoints || 0;
    const awayScore = away.totalPoints || 0;

    const winnerId: number = homeScore >= awayScore ? home.teamId : away.teamId;
    const loserId: number  = homeScore >= awayScore ? away.teamId : home.teamId;

    champion  = finalStandings.find(t => t.teamName === teamMap[winnerId]?.name) ??
      buildTeamFromId(winnerId, teamMap);
    runnerUp  = finalStandings.find(t => t.teamName === teamMap[loserId]?.name) ??
      buildTeamFromId(loserId, teamMap);
  } else {
    // Fallback: rank 1 team is champion (regular season winner)
    champion = finalStandings[0] ?? null;
    runnerUp = finalStandings[1] ?? null;
  }

  const lastPlace =
    finalStandings.length > 0
      ? finalStandings[finalStandings.length - 1]
      : null;

  return {
    year,
    seasonLabel: seasonLabel(year),
    champion,
    runnerUp,
    lastPlace,
    finalStandings,
    mvpPlayer: '',
    notes: '',
  };
}

function buildTeamFromId(
  teamId: number,
  teamMap: Record<number, { name: string; owner: string }>
): HistoricalTeam {
  return {
    rank: 0,
    teamName: teamMap[teamId]?.name ?? `Team ${teamId}`,
    ownerName: teamMap[teamId]?.owner ?? 'Unknown',
    wins: 0,
    losses: 0,
    pf: 0,
    pa: 0,
  };
}

// Public: fetch all historical seasons in parallel, silently skip failures
export async function getAllHistoricalSeasons(): Promise<HistoricalSeason[]> {
  const results = await Promise.allSettled(
    HISTORY_YEARS.map(year => fetchOneSeason(year))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<HistoricalSeason> => r.status === 'fulfilled')
    .map(r => r.value);
}

export { HISTORY_YEARS };

// ─── Category percentile history ─────────────────────────────────────────────


const ALL_CAT_YEARS = [...HISTORY_YEARS, CURRENT_SEASON].filter(
  (y, i, arr) => arr.indexOf(y) === i
);

const STAT_IDS = {
  pts: '0', blk: '1', stl: '2', ast: '3', reb: '6',
  to: '11', fgm: '13', fga: '14', ftm: '15', fta: '16', tpm: '17',
} as const;

const CAT_KEYS = ['fgPct', 'ftPct', 'tpm', 'reb', 'ast', 'stl', 'blk', 'to', 'pts'] as const;
type CatKey = typeof CAT_KEYS[number];

function rankArray(values: number[], lowerIsBetter: boolean): number[] {
  const indexed = values.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => lowerIsBetter ? a.v - b.v : b.v - a.v);
  const ranks = new Array(values.length).fill(0);
  indexed.forEach((item, rank) => { ranks[item.i] = rank + 1; });
  return ranks;
}

async function fetchYearCategoryPercentiles(
  year: number
): Promise<Array<{ ownerName: string; percs: Record<CatKey, number> }>> {
  const revalidate = year < CURRENT_SEASON ? 86400 : 1800;
  const base = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${year}/segments/0/leagues/${LEAGUE_ID}`;
  const res = await fetch(`${base}?view=mTeam&view=mRoster`, {
    headers: { Cookie: `espn_s2=${ESPN_S2}; SWID=${SWID}`, Accept: 'application/json' },
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`ESPN ${res.status} for year=${year} category`);
  const data = await res.json();

  const memberMap: Record<string, string> = {};
  for (const m of (data.members || []) as any[]) {
    memberMap[m.id] = `${m.firstName} ${m.lastName}`.trim();
  }

  const teamRows = (data.teams || []) as any[];
  const teamStats = teamRows.map(team => {
    const ownerName = (team.owners || [])
      .map((id: string) => memberMap[id] || 'Unknown')
      .join(' & ');
    const totals: Record<string, number> = {};
    for (const id of Object.values(STAT_IDS)) totals[id] = 0;
    for (const entry of (team.roster?.entries || []) as any[]) {
      const p = entry.playerPoolEntry?.player;
      if (!p) continue;
      const s = extractSeasonStats(p.stats || []);
      for (const id of Object.values(STAT_IDS)) totals[id] += s[id] || 0;
    }
    return {
      ownerName,
      fgPctVal: totals[STAT_IDS.fga] > 0 ? totals[STAT_IDS.fgm] / totals[STAT_IDS.fga] : 0,
      ftPctVal: totals[STAT_IDS.fta] > 0 ? totals[STAT_IDS.ftm] / totals[STAT_IDS.fta] : 0,
      tpmVal: totals[STAT_IDS.tpm],
      rebVal: totals[STAT_IDS.reb],
      astVal: totals[STAT_IDS.ast],
      stlVal: totals[STAT_IDS.stl],
      blkVal: totals[STAT_IDS.blk],
      toVal:  totals[STAT_IDS.to],
      ptsVal: totals[STAT_IDS.pts],
    };
  });

  const n = teamStats.length;
  if (n === 0) return [];

  type ValKey = 'fgPctVal' | 'ftPctVal' | 'tpmVal' | 'rebVal' | 'astVal' | 'stlVal' | 'blkVal' | 'toVal' | 'ptsVal';
  const valKeys: ValKey[] = ['fgPctVal', 'ftPctVal', 'tpmVal', 'rebVal', 'astVal', 'stlVal', 'blkVal', 'toVal', 'ptsVal'];
  const lowerIsBetter =                [false,     false,     false,    false,    false,    false,    false,    true,     false];

  const allRanks = valKeys.map((key, i) =>
    rankArray(teamStats.map(t => t[key]), lowerIsBetter[i])
  );

  return teamStats.map((t, ti) => {
    const percs = {} as Record<CatKey, number>;
    CAT_KEYS.forEach((cat, ci) => {
      percs[cat] = Math.round(((n + 1 - allRanks[ci][ti]) / n) * 100);
    });
    return { ownerName: t.ownerName, percs };
  });
}

export async function getOwnerCategoryPercentiles(
  ownerName: string
): Promise<CategoryPercentiles | null> {
  const settled = await Promise.allSettled(
    ALL_CAT_YEARS.map(year => fetchYearCategoryPercentiles(year))
  );

  const sums = {} as Record<CatKey, number>;
  for (const cat of CAT_KEYS) sums[cat] = 0;
  let count = 0;

  for (const result of settled) {
    if (result.status !== 'fulfilled') continue;
    const match =
      result.value.find(d => d.ownerName === ownerName) ??
      result.value.find(d =>
        d.ownerName.includes(ownerName) || ownerName.includes(d.ownerName)
      );
    if (!match) continue;
    count++;
    for (const cat of CAT_KEYS) sums[cat] += match.percs[cat];
  }

  if (count === 0) return null;

  return {
    ownerName,
    fgPct: Math.round(sums.fgPct / count),
    ftPct: Math.round(sums.ftPct / count),
    tpm:   Math.round(sums.tpm   / count),
    reb:   Math.round(sums.reb   / count),
    ast:   Math.round(sums.ast   / count),
    stl:   Math.round(sums.stl   / count),
    blk:   Math.round(sums.blk   / count),
    to:    Math.round(sums.to    / count),
    pts:   Math.round(sums.pts   / count),
    seasonsCount: count,
  };
}
