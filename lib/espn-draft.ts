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

// ─── Player data ──────────────────────────────────────────────────────────────

interface PlayerData {
  name: string;
  position: string;
  proTeam: string;
  fp: number;
  pts: number;
  gp: number;
}

function extractStats(player: any): { fp: number; pts: number; gp: number } {
  const stats: any[] = player.stats || [];
  // Full-season actual: statSplitTypeId=0 + statSourceId=0
  const seasonStat =
    stats.find((s: any) => s.statSourceId === 0 && s.statSplitTypeId === 0) ||
    stats.find((s: any) => s.statSourceId === 0 && s.scoringPeriodId === 0)  ||
    // Fallback: highest-pts actual stat row = season cumulative
    stats
      .filter((s: any) => s.statSourceId === 0)
      .sort((a: any, b: any) => (b.stats?.['0'] || 0) - (a.stats?.['0'] || 0))[0];

  const s = seasonStat?.stats || {};
  const pts = Math.round((s['0']  || 0) * 10) / 10;
  const reb = Math.round((s['6']  || 0) * 10) / 10;
  const ast = Math.round((s['3']  || 0) * 10) / 10;
  const tpm = Math.round((s['17'] || 0) * 10) / 10;
  const fp  = Math.round((pts + reb * 1.2 + ast * 1.5 + tpm * 3) * 10) / 10;
  const gp  = Math.round((s['40'] || 0) / 30);
  return { fp, pts, gp };
}

function playerMeta(p: any): PlayerData {
  return {
    name:     p.fullName || `Player ${p.id}`,
    position: POS_MAP[p.defaultPositionId || 5] || '—',
    proTeam:  PRO_TEAMS[p.proTeamId] || '—',
    ...extractStats(p),
  };
}

async function fetchPlayerData(year: number, draftedIds: number[]): Promise<Map<number, PlayerData>> {
  const map = new Map<number, PlayerData>();

  // ── Strategy 1: mRoster — proven endpoint, same one used by getPlayers/getStatsData ──
  try {
    const data = await espnGet(year, '?view=mRoster&view=mTeam');
    for (const team of (data.teams || []) as any[]) {
      for (const entry of (team.roster?.entries || []) as any[]) {
        const p = entry.playerPoolEntry?.player;
        if (!p) continue;
        map.set(p.id as number, playerMeta(p));
      }
    }
  } catch (e) {
    console.error(`[draft] mRoster failed year=${year}:`, e);
  }

  // ── Strategy 2: broad kona fetch — top 300 by season stats, covers dropped players ──
  const missingIds = draftedIds.filter(id => !map.has(id));
  if (missingIds.length > 0) {
    try {
      const filter = JSON.stringify({
        players: {
          limit: 300,
          sortAppliedStatTotal: { sortAsc: false, sortPriority: 1, value: `00${year}` },
          filterStatsForTopScoringPeriodIds: { value: 17, additionalValue: [`00${year}`] },
        },
      });
      const data = await espnGet(year, '?view=kona_player_info', { 'x-fantasy-filter': filter });
      const missing = new Set(missingIds);
      for (const entry of (data.players || []) as any[]) {
        const player = entry.playerPoolEntry?.player;
        if (!player || !missing.has(player.id as number)) continue;
        map.set(player.id as number, playerMeta(player));
      }
    } catch (e) {
      console.error(`[draft] kona fallback failed year=${year}:`, e);
    }
  }

  // ── Strategy 3: ESPN public athlete API — no auth needed, resolves retired/cut players ──
  const stillMissing = draftedIds.filter(id => !map.has(id));
  if (stillMissing.length > 0) {
    const CONCURRENCY = 10;
    for (let i = 0; i < stillMissing.length; i += CONCURRENCY) {
      const batch = stillMissing.slice(i, i + CONCURRENCY);
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
            map.set(playerId, {
              name:     a.displayName || a.fullName || `Player ${playerId}`,
              position: a.position?.abbreviation || '—',
              proTeam:  a.team?.abbreviation || '—',
              fp: 0, pts: 0, gp: 0,
            });
          } catch { /* silently skip unresolvable IDs */ }
        })
      );
    }
  }

  return map;
}

// ─── Top players across whole league (including undrafted) ────────────────────

export interface AllPlayerFP {
  playerId: number;
  name: string;
  position: string;
  proTeam: string;
  fp: number;
}

export async function getTopPlayersFP(year: number, limit = 130): Promise<AllPlayerFP[]> {
  try {
    // Fetch extra to account for players with fp=0 in the result set
    const fetchLimit = Math.ceil(limit * 1.5);
    const filter = JSON.stringify({
      players: {
        limit: fetchLimit,
        sortAppliedStatTotal: { sortAsc: false, sortPriority: 1, value: `00${year}` },
        filterStatsForTopScoringPeriodIds: { value: 17, additionalValue: [`00${year}`] },
      },
    });
    const data = await espnGet(year, '?view=kona_player_info', { 'x-fantasy-filter': filter });
    const results: AllPlayerFP[] = [];
    for (const entry of (data.players || []) as any[]) {
      const p = entry.playerPoolEntry?.player;
      if (!p) continue;
      const meta = playerMeta(p);
      if (meta.fp <= 0) continue;
      results.push({ playerId: p.id as number, name: meta.name, position: meta.position, proTeam: meta.proTeam, fp: meta.fp });
      if (results.length >= limit) break;
    }
    return results; // already sorted fp desc by kona
  } catch (e) {
    console.error(`[draft] getTopPlayersFP failed year=${year}:`, e);
    return [];
  }
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

  // 3. Fetch player names + season stats
  const playerIds = Array.from(new Set(rawPicks.map((p: any) => p.playerId as number)));
  const playerData = await fetchPlayerData(year, playerIds);
  const hasStats = playerData.size > 0 &&
    Array.from(playerData.values()).some(pd => pd.fp > 0);

  // 4. Rank drafted players by fp (stable: players with same fp get same rank)
  const fpByPlayer: [number, number][] = playerIds.map(id => [id, playerData.get(id)?.fp ?? 0]);
  fpByPlayer.sort((a, b) => b[1] - a[1]);
  const rankMap = new Map<number, number>();
  fpByPlayer.forEach(([id], i) => rankMap.set(id, i + 1));

  const numTeams = Object.keys(draftSlotMap).length;

  // 5. Build picks
  const picks: DraftPick[] = rawPicks.map((p: any) => {
    const pd = playerData.get(p.playerId);
    const overallPick: number = p.overallPickNumber || (p.roundId - 1) * numTeams + p.roundPickNumber;
    const seasonRank = hasStats ? (rankMap.get(p.playerId) ?? playerIds.length) : 0;
    const delta = overallPick - seasonRank;
    const grade: DraftGrade = hasStats
      ? computeGrade(pd?.fp ?? 0, pd?.pts ?? 0, delta)
      : '?';

    return {
      overallPick,
      round: p.roundId,
      roundPick: p.roundPickNumber,
      draftSlot: draftSlotMap[p.teamId] ?? 0,
      teamId: p.teamId,
      ownerName: teamInfo[p.teamId]?.ownerName ?? 'Unknown',
      playerId: p.playerId,
      playerName: pd?.name ?? `Player ${p.playerId}`,
      position:   pd?.position ?? '—',
      proTeam:    pd?.proTeam ?? '—',
      fp:  pd?.fp  ?? 0,
      pts: pd?.pts ?? 0,
      gp:  pd?.gp  ?? 0,
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
