/* eslint-disable @typescript-eslint/no-explicit-any */
import type { StandingEntry, MatchupsData, Player, HistoryEntry, RulesData } from './types';

const ESPN_S2 = process.env.ESPN_S2;
const SWID = process.env.SWID;
const LEAGUE_ID = process.env.LEAGUE_ID;
const SEASON = process.env.SEASON || '2026';

export function hasEspnCredentials() {
  return !!(ESPN_S2 && SWID && LEAGUE_ID);
}

const BASE = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${SEASON}/segments/0/leagues/${LEAGUE_ID}`;

async function espnFetch(params: string): Promise<unknown> {
  const url = `${BASE}${params}`;
  const res = await fetch(url, {
    headers: {
      Cookie: `espn_s2=${ESPN_S2}; SWID=${SWID}`,
      Accept: 'application/json',
    },
    next: { revalidate: 1800 }, // 30-min cache
  });
  if (!res.ok) {
    throw new Error(`ESPN API ${res.status} for ${url}`);
  }
  return res.json();
}

// ─── PRO TEAM ABBREVIATIONS ──────────────────────────────────────────────────

const PRO_TEAMS: Record<number, string> = {
  1:'ATL', 2:'BOS', 3:'NOP', 4:'CHI', 5:'CLE', 6:'DAL', 7:'DEN', 8:'DET',
  9:'GSW', 10:'HOU', 11:'IND', 12:'LAC', 13:'LAL', 14:'MIA', 15:'MIL',
  16:'MIN', 17:'BKN', 18:'NYK', 19:'ORL', 20:'PHI', 21:'PHX', 22:'POR',
  23:'SAC', 24:'SAS', 25:'OKC', 26:'UTA', 27:'WAS', 28:'TOR', 29:'MEM',
  30:'CHA', 33:'UTA', 34:'MEM',
};

// ─── STANDINGS ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseStandings(data: any): StandingEntry[] {
  const teams = data.teams as any[];
  const members = (data.members || []) as any[];

  const memberMap: Record<string, string> = {};
  for (const m of members) {
    memberMap[m.id] = `${m.firstName} ${m.lastName}`.trim();
  }

  const swid = (SWID || '').replace(/[{}]/g, '').toLowerCase();
  const myMember = members.find(
    (m) => m.id.replace(/[{}]/g, '').toLowerCase() === swid
  );
  const myTeamId = myMember
    ? teams.find((t) => t.owners?.includes(myMember.id))?.id
    : null;

  return teams
    .map((team) => {
      const record = team.record?.overall || {};
      const streak = team.record?.overall?.streak || {};
      const ownerName = (team.owners || [])
        .map((id: string) => memberMap[id] || 'Unknown')
        .join(' & ');

      return {
        rank: team.playoffSeed || 0,
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
      };
    })
    .sort((a, b) => a.rank - b.rank);
}

export async function getStandings(): Promise<StandingEntry[]> {
  const data = await espnFetch('?view=mTeam&view=mStandings');
  return parseStandings(data);
}

// ─── MATCHUPS ─────────────────────────────────────────────────────────────────

export async function getMatchups(): Promise<MatchupsData> {
  const data = (await espnFetch(
    '?view=mTeam&view=mMatchup&view=mMatchupScore&view=mScoreboard'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  )) as any;

  const currentMatchupPeriod: number = data.status?.currentMatchupPeriod || 1;
  const teams = data.teams as any[];
  const members = (data.members || []) as any[];

  const memberMap: Record<string, string> = {};
  for (const m of members) {
    memberMap[m.id] = `${m.firstName} ${m.lastName}`.trim();
  }

  const swid = (SWID || '').replace(/[{}]/g, '').toLowerCase();
  const myMember = members.find(
    (m: any) => m.id.replace(/[{}]/g, '').toLowerCase() === swid
  );
  const myTeamId = myMember
    ? teams.find((t: any) => t.owners?.includes(myMember.id))?.id
    : null;

  const teamMap: Record<number, { teamId: string; teamName: string; ownerName: string; isYou: boolean }> = {};
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (await espnFetch('?view=mRoster&view=mTeam')) as any;

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
      const position = posGroupMap[posId] || 'F';

      const pts = Math.round((s['0'] || 0) * 10) / 10;
      const reb = Math.round((s['6'] || 0) * 10) / 10;
      const ast = Math.round((s['3'] || 0) * 10) / 10;
      const tpm = Math.round((s['17'] || 0) * 10) / 10;
      const fp = Math.round((pts + reb * 1.2 + ast * 1.5 + tpm * 3) * 10) / 10;

      allPlayers.push({
        id: `p${p.id}`,
        name: p.fullName || 'Unknown',
        team: PRO_TEAMS[p.proTeamId] || 'NBA',
        position,
        pts,
        reb,
        ast,
        tpm,
        fp,
      });
    }
  }

  return allPlayers
    .sort((a, b) => b.fp - a.fp)
    .slice(0, 15)
    .map((p, i) => ({ ...p, id: `p${i + 1}` }));
}

// ─── STATIC DATA (no ESPN API needed) ────────────────────────────────────────

export async function getHistory(): Promise<HistoryEntry[]> {
  const { default: data } = await import('@/data/history.json');
  return data as HistoryEntry[];
}

export async function getRules(): Promise<RulesData> {
  const { default: data } = await import('@/data/rules.json');
  return data as RulesData;
}
