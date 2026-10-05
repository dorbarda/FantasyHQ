/* eslint-disable @typescript-eslint/no-explicit-any */
import type { DraftBoardData, DraftPick, DraftTeamSlot, DraftGrade } from './types';
import { ALL_SEASONS, CURRENT_SEASON } from './season';

const ESPN_S2   = process.env.ESPN_S2;
const SWID      = process.env.SWID;
const LEAGUE_ID = process.env.LEAGUE_ID;
export const DRAFT_YEARS = ALL_SEASONS;

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
    next: { revalidate: year < CURRENT_SEASON ? 86400 : 1800 },
  });
  if (!res.ok) throw new Error(`ESPN ${res.status} year=${year} ${params}`);
  return res.json();
}

// ─── Player data ──────────────────────────────────────────────────────────────

// ESPN stat-row ids: 00YYYY = actual season totals, 10YYYY = preseason projection.
// Both carry `appliedTotal` (fantasy points under THIS league's scoring) and
// stat 42 = games played — so we use ESPN's own total, never recompute it.
interface PlayerRow {
  id: number;
  name: string;
  position: string;
  proTeam: string;
  fp: number;
  gp: number;
  projFp: number;
  projGp: number;
}

/** Players ranked beyond this count are shown as "outside" (e.g. >200). */
const POOL_SIZE = 200;
/** Extra players fetched so re-sorting (per-game) still fills POOL_SIZE. */
const POOL_FETCH = 250;

function playerRow(p: any, year: number): PlayerRow {
  const byId = (id: string) => (p.stats || []).find((s: any) => s.id === id);
  const actual = byId(`00${year}`);
  const proj = byId(`10${year}`);
  const round1 = (n: number) => Math.round(n * 10) / 10;
  return {
    id:       p.id as number,
    name:     p.fullName || `Player ${p.id}`,
    position: POS_MAP[p.defaultPositionId || 5] || '—',
    proTeam:  PRO_TEAMS[p.proTeamId] || '—',
    fp:       round1(actual?.appliedTotal ?? 0),
    gp:       actual?.stats?.['42'] ?? 0,
    projFp:   round1(proj?.appliedTotal ?? 0),
    projGp:   proj?.stats?.['42'] ?? 0,
  };
}

function playerFilter(year: number, players: Record<string, unknown>) {
  return JSON.stringify({
    players: {
      ...players,
      filterStatsForTopScoringPeriodIds: { value: 5, additionalValue: [`00${year}`, `10${year}`] },
    },
  });
}

async function fetchPlayers(year: number, players: Record<string, unknown>): Promise<PlayerRow[]> {
  try {
    const data = await espnGet(year, '?view=kona_player_info', {
      'x-fantasy-filter': playerFilter(year, players),
    });
    return ((data.players || []) as any[])
      .map(e => e.player)
      .filter(Boolean)
      .map(p => playerRow(p, year));
  } catch (e) {
    console.error(`[draft] player fetch failed year=${year}:`, e);
    return [];
  }
}

/** Top players league-wide (drafted or not), sorted by actual or projected total. */
function fetchPool(year: number, source: 'actual' | 'proj') {
  return fetchPlayers(year, {
    limit: POOL_FETCH,
    sortAppliedStatTotal: {
      sortAsc: false,
      sortPriority: 1,
      value: `${source === 'actual' ? '00' : '10'}${year}`,
    },
  });
}

/** Exactly the drafted players, so every pick has stats even if they rank outside the pool. */
function fetchDrafted(year: number, ids: number[]) {
  return fetchPlayers(year, { filterIds: { value: ids } });
}

interface SeasonStatus {
  started: boolean;
  complete: boolean;
}

async function getSeasonStatus(year: number): Promise<SeasonStatus> {
  try {
    const data = await espnGet(year, '?view=mStatus');
    const latest = data.status?.latestScoringPeriod ?? 0;
    const final = data.status?.finalScoringPeriod ?? 0;
    return { started: latest > 0, complete: latest > 0 && latest >= final };
  } catch (e) {
    console.error(`[draft] mStatus failed year=${year}:`, e);
    return { started: false, complete: false };
  }
}

// ─── Ranking & grades ─────────────────────────────────────────────────────────

/** Rank players 1..POOL_SIZE by `value` (highest first). Players with no value are left out. */
function rankPlayers(rows: PlayerRow[], value: (r: PlayerRow) => number | null): Map<number, number> {
  const ranked = rows
    .map(r => ({ id: r.id, v: value(r) }))
    .filter((x): x is { id: number; v: number } => x.v != null && x.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, POOL_SIZE);
  return new Map(ranked.map((x, i) => [x.id, i + 1]));
}

// Positive delta = better than expected. Same bands for decision and result.
function gradeDelta(delta: number): DraftGrade {
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

  // Before the draft ESPN already lists every slot, with playerId -1. Keep
  // only real picks, so an upcoming draft reads as "not yet held" instead of
  // a board full of "Player -1".
  const rawPicks: any[] = (data.draftDetail?.picks || []).filter((p: any) => p.playerId > 0);

  if (rawPicks.length === 0) {
    return {
      year, seasonLabel: seasonLabel(year),
      teams: [], picks: [], rounds: 0,
      hasStats: false, hasProjections: false, inProgress: false,
      gamesPlayed: 0, rankBasis: 'total', poolSize: POOL_SIZE,
    };
  }

  // 2. Infer draft slot for each team (pick position in round 1)
  const draftSlotMap: Record<number, number> = {};
  for (const p of rawPicks) {
    if (p.roundId === 1) {
      draftSlotMap[p.teamId] = p.roundPickNumber;
    }
  }

  // 3. Season status + player data (actual & projected) in parallel
  const playerIds = Array.from(new Set(rawPicks.map((p: any) => p.playerId as number)));
  const [status, actualPool, projPool, drafted] = await Promise.all([
    getSeasonStatus(year),
    fetchPool(year, 'actual'),
    fetchPool(year, 'proj'),
    fetchDrafted(year, playerIds),
  ]);

  const draftedById = new Map(drafted.map(r => [r.id, r]));
  // Fall back to the pools if the filterIds query came back short.
  for (const r of [...actualPool, ...projPool]) {
    if (playerIds.includes(r.id) && !draftedById.has(r.id)) draftedById.set(r.id, r);
  }

  const hasStats = actualPool.some(r => r.fp > 0);
  const hasProjections = projPool.some(r => r.projFp > 0);
  const inProgress = hasStats && !status.complete;
  const rankBasis: 'total' | 'perGame' = inProgress ? 'perGame' : 'total';

  // "Through N games": the most games any top player has played so far.
  const gamesPlayed = actualPool.reduce((m, r) => Math.max(m, r.gp), 0);
  // In-season, ignore tiny samples so one 60-point game can't rank #1 per game.
  const minGP = inProgress ? Math.max(1, Math.round(gamesPlayed * 0.25)) : 1;

  // 4. Ranks among ALL players (drafted or not)
  const actualValue = (r: PlayerRow) =>
    r.gp < minGP ? null : rankBasis === 'perGame' ? r.fp / r.gp : r.fp;
  const projValue = (r: PlayerRow) =>
    rankBasis === 'perGame' ? (r.projGp > 0 ? r.projFp / r.projGp : null) : r.projFp;
  const actualRanks = hasStats ? rankPlayers(actualPool, actualValue) : new Map<number, number>();
  const projRanks = hasProjections ? rankPlayers(projPool, projValue) : new Map<number, number>();
  const outside = POOL_SIZE + 1; // anything not in the top POOL_SIZE

  const numTeams = Object.keys(draftSlotMap).length;

  // 5. Build picks
  const picks: DraftPick[] = rawPicks.map((p: any) => {
    const pd = draftedById.get(p.playerId);
    const overallPick: number = p.overallPickNumber || (p.roundId - 1) * numTeams + p.roundPickNumber;

    const projRank = hasProjections && (pd?.projFp ?? 0) > 0
      ? (projRanks.get(p.playerId) ?? outside) : null;
    const didNotPlay = hasStats && (pd?.gp ?? 0) === 0;
    const actualRank = hasStats && !didNotPlay
      ? (actualRanks.get(p.playerId) ?? outside) : null;

    const decision = projRank != null ? projRank - overallPick : null;
    const result = actualRank != null ? overallPick - actualRank : null;

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
      fp:      pd?.fp ?? 0,
      gp:      pd?.gp ?? 0,
      projFp:  pd?.projFp ?? 0,
      projGp:  pd?.projGp ?? 0,
      projRank,
      actualRank,
      decision,
      result,
      decisionGrade: decision != null ? gradeDelta(decision) : '?',
      grade: !hasStats ? '?' : didNotPlay ? 'INJ' : gradeDelta(result as number),
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
    hasProjections,
    inProgress,
    gamesPlayed,
    rankBasis,
    poolSize: POOL_SIZE,
  };
}

// ─── Favourite player aggregation ─────────────────────────────────────────────

export interface FavouritePlayer {
  playerName: string;
  position: string;
  proTeam: string;
  draftCount: number;
  years: number[];
}

/**
 * Returns the most-drafted players per owner across all seasons.
 * Sorted by draftCount desc for each owner.
 */
export async function getDraftCountsByOwner(): Promise<Record<string, FavouritePlayer[]>> {
  const results = await Promise.allSettled(DRAFT_YEARS.map(getDraftBoard));

  // ownerName → playerName → accumulated data
  const raw: Record<string, Record<string, { playerName: string; position: string; proTeam: string; years: number[] }>> = {};

  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    const { year, picks } = r.value;
    for (const pick of picks) {
      raw[pick.ownerName] ??= {};
      const entry = raw[pick.ownerName][pick.playerName];
      if (entry) {
        entry.years.push(year);
      } else {
        raw[pick.ownerName][pick.playerName] = {
          playerName: pick.playerName,
          position:   pick.position,
          proTeam:    pick.proTeam,
          years:      [year],
        };
      }
    }
  }

  const out: Record<string, FavouritePlayer[]> = {};
  for (const [owner, players] of Object.entries(raw)) {
    out[owner] = Object.values(players)
      .map(p => ({ ...p, draftCount: p.years.length }))
      .sort((a, b) => b.draftCount - a.draftCount || a.playerName.localeCompare(b.playerName));
  }
  return out;
}
