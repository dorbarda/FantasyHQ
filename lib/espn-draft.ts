/* eslint-disable @typescript-eslint/no-explicit-any */
import type { DraftBoardData, DraftPick, DraftTeamSlot, DraftGrade } from './types';

const ESPN_S2   = process.env.ESPN_S2;
const SWID      = process.env.SWID;
const LEAGUE_ID = process.env.LEAGUE_ID;
const CURRENT_YEAR = parseInt(process.env.SEASON || '2026');

export const DRAFT_YEARS = [2021, 2022, 2023, 2024, 2025, CURRENT_YEAR].filter(
  (y, i, arr) => arr.indexOf(y) === i
);

const PRO_TEAMS: Record<number, string> = {
  1:'ATL', 2:'BOS', 3:'NOP', 4:'CHI', 5:'CLE', 6:'DAL', 7:'DEN', 8:'DET',
  9:'GSW', 10:'HOU', 11:'IND', 12:'LAC', 13:'LAL', 14:'MIA', 15:'MIL',
  16:'MIN', 17:'BKN', 18:'NYK', 19:'ORL', 20:'PHI', 21:'PHX', 22:'POR',
  23:'SAC', 24:'SAS', 25:'OKC', 26:'UTA', 27:'WAS', 28:'TOR', 29:'MEM',
  30:'CHA',
};

const POS_MAP: Record<number, string> = {
  1: 'PG', 2: 'SG', 3: 'SF', 4: 'PF', 5: 'C', 6: 'G', 7: 'F', 8: 'F',
};

function seasonLabel(year: number) {
  return `${year - 1}-${String(year).slice(2)}`;
}

function leagueBase(year: number) {
  return `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${year}/segments/0/leagues/${LEAGUE_ID}`;
}

async function espnGet(year: number, params: string, extraHeaders?: Record<string, string>): Promise<any> {
  const res = await fetch(`${leagueBase(year)}${params}`, {
    headers: {
      Cookie: `espn_s2=${ESPN_S2}; SWID=${SWID}`,
      Accept: 'application/json',
      ...extraHeaders,
    },
    next: { revalidate: year < CURRENT_YEAR ? 86400 : 1800 },
  });
  if (!res.ok) throw new Error(`ESPN ${res.status} year=${year} ${params}`);
  return res.json();
}

// ─── Player stats via kona endpoint ──────────────────────────────────────────

async function fetchPlayerStats(year: number, playerIds: number[]): Promise<Map<number, { fp: number; pts: number; gp: number }>> {
  const filter = JSON.stringify({
    players: {
      filterIds: { value: playerIds },
      limit: playerIds.length + 10,
    },
  });

  let data: any;
  try {
    data = await espnGet(year, '?view=kona_player_info', { 'x-fantasy-filter': filter });
  } catch {
    return new Map();
  }

  const statsMap = new Map<number, { fp: number; pts: number; gp: number }>();

  for (const p of (data.players || []) as any[]) {
    const player = p.playerPoolEntry?.player;
    if (!player) continue;

    const stats: any[] = player.stats || [];
    // Full-season actual stats: statSplitTypeId=0, statSourceId=0
    const seasonStat = stats.find(
      (s: any) => s.statSourceId === 0 && s.statSplitTypeId === 0
    );
    const s = seasonStat?.stats || {};

    const pts = Math.round((s['0']  || 0) * 10) / 10;
    const reb = Math.round((s['6']  || 0) * 10) / 10;
    const ast = Math.round((s['3']  || 0) * 10) / 10;
    const tpm = Math.round((s['17'] || 0) * 10) / 10;
    const min = Math.round(s['40'] || 0);           // total minutes
    const gp  = Math.round(min / 30);               // rough games played proxy
    const fp  = Math.round((pts + reb * 1.2 + ast * 1.5 + tpm * 3) * 10) / 10;

    statsMap.set(player.id as number, { fp, pts, gp });
  }

  return statsMap;
}

// ─── Grade ────────────────────────────────────────────────────────────────────

function computeGrade(fp: number, pts: number, delta: number): DraftGrade {
  if (pts === 0 && fp === 0) return 'INJ';
  if (delta >= 20) return 'A+';
  if (delta >= 10) return 'A';
  if (delta >= 4)  return 'B';
  if (delta >= -3) return 'C';
  if (delta >= -10) return 'D';
  return 'F';
}

// ─── Main fetch ───────────────────────────────────────────────────────────────

export async function getDraftBoard(year: number): Promise<DraftBoardData> {
  // 1. Draft picks + team/member mapping
  const data = await espnGet(year, '?view=mDraftDetail&view=mTeam');

  const memberMap: Record<string, string> = {};
  for (const m of (data.members || []) as any[]) {
    memberMap[m.id] = `${m.firstName} ${m.lastName}`.trim();
  }

  const teamInfo: Record<number, { ownerName: string; teamName: string }> = {};
  for (const t of (data.teams || []) as any[]) {
    const ownerName = (t.owners || [])
      .map((id: string) => memberMap[id] || 'Unknown')
      .join(' & ');
    teamInfo[t.id] = { ownerName, teamName: t.name || `Team ${t.id}` };
  }

  const rawPicks: any[] = data.draftDetail?.picks || [];

  if (rawPicks.length === 0) {
    return {
      year, seasonLabel: seasonLabel(year),
      teams: [], picks: [], rounds: 0, hasStats: false,
    };
  }

  // 2. Infer draft slot for each team (pick position in round 1)
  const draftSlotMap: Record<number, number> = {};
  for (const p of rawPicks) {
    if (p.roundId === 1) {
      draftSlotMap[p.teamId] = p.roundPickNumber;
    }
  }

  // 3. Fetch player stats
  const playerIds = rawPicks.map((p: any) => p.playerId as number);
  const statsMap = await fetchPlayerStats(year, playerIds);
  const hasStats = statsMap.size > 0;

  // 4. Assign season rank (among drafted players, by fp)
  //    Players with no stats get fp=0, ranked last
  const fpList = playerIds.map(id => statsMap.get(id)?.fp ?? 0);
  const sorted = [...fpList].sort((a, b) => b - a);
  const rankOf = (fp: number) => sorted.findIndex(v => v === fp) + 1;

  // 5. Build picks
  const picks: DraftPick[] = rawPicks.map((p: any) => {
    const stats = statsMap.get(p.playerId) ?? { fp: 0, pts: 0, gp: 0 };
    const overallPick: number = p.overallPickNumber || p.roundPickNumber + (p.roundId - 1) * 10;
    const seasonRank = hasStats ? rankOf(stats.fp) : 0;
    const delta = overallPick - seasonRank;
    const grade: DraftGrade = hasStats
      ? computeGrade(stats.fp, stats.pts, delta)
      : '?';

    return {
      overallPick,
      round: p.roundId,
      roundPick: p.roundPickNumber,
      draftSlot: draftSlotMap[p.teamId] ?? 0,
      teamId: p.teamId,
      ownerName: teamInfo[p.teamId]?.ownerName ?? 'Unknown',
      playerId: p.playerId,
      playerName: p.playerName || `Player ${p.playerId}`,
      position: POS_MAP[p.defaultPositionId] || '—',
      proTeam: PRO_TEAMS[p.proTeamId] || '—',
      fp: stats.fp,
      pts: stats.pts,
      gp: stats.gp,
      seasonRank,
      delta,
      grade,
    };
  });

  // 6. Build team slot list
  const teams: DraftTeamSlot[] = Object.entries(draftSlotMap)
    .map(([teamIdStr, slot]) => {
      const teamId = parseInt(teamIdStr);
      return {
        teamId,
        ownerName: teamInfo[teamId]?.ownerName ?? 'Unknown',
        teamName:  teamInfo[teamId]?.teamName  ?? `Team ${teamId}`,
        draftSlot: slot,
      };
    })
    .sort((a, b) => a.draftSlot - b.draftSlot);

  const rounds = Math.max(...rawPicks.map((p: any) => p.roundId as number));

  return {
    year,
    seasonLabel: seasonLabel(year),
    teams,
    picks,
    rounds,
    hasStats,
  };
}
