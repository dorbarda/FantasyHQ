/**
 * Start-of-week matchup projections — frozen once per week so the matchup
 * pop-up can show, after the week ends, how the result compares with what
 * the rosters looked like before it began. Spec: docs/MATCHUP-DETAIL-SPEC.md.
 *
 * Pure — the Sunday script (scripts/freeze-week-projections.mts) does the I/O.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ProTeamSchedule } from './espn-schedule';

/** ESPN lineup slots that start: PG, SG, SF, PF, C, G, F, then 3× UTIL. */
const STARTING_SLOTS: Record<number, number> = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 11: 3 };
const SLOT_INSTANCES = Object.entries(STARTING_SLOTS)
  .flatMap(([slot, count]) => Array<number>(count).fill(Number(slot)));
const IR_SLOT = 13;
const POSITION: Record<number, string> = { 0: 'PG', 1: 'SG', 2: 'SF', 3: 'PF', 4: 'C' };

/** Weeks 1–4 use ESPN's season projection; from week 5 the last 30 days. */
export const PROJECTION_WEEKS = 4;

export interface ProjectedPlayer {
  name: string;
  pos: string;
  nba: string;
  status: string;
  onIR: boolean;
  avg: number;
  /** Startable games this week. */
  games: number;
  projected: number;
}

export interface TeamProjection {
  teamId: number;
  teamName: string;
  games: number;
  gamesLostToLineupLimit: number;
  projectedPoints: number;
  /** The 3 highest averages not on IR — how many games they get matters most. */
  keyPlayers: ProjectedPlayer[];
  injuries: { name: string; status: string; onIR: boolean }[];
  /** Whole roster, kept so roster moves during the week can be compared later. */
  roster: ProjectedPlayer[];
}

export interface WeekProjection {
  season: number;
  week: number;
  frozenAt: string;
  days: string[];
  averageSource: string;
  matchups: { home: TeamProjection; away: TeamProjection; actual: null | { home: number; away: number } }[];
}

/**
 * The player's fantasy points per game used for this week.
 * Weeks 1–4: ESPN's projected average for the season (stat id `10{season}`).
 * Later: actual average over the last 30 days (`03{season}`), falling back to
 * the projection for a player with no games in that window.
 */
export function playerAverage(player: any, season: number, week: number): number {
  const stats: any[] = player?.stats || [];
  const byId = (id: string) => stats.find(s => s.id === id);
  const projection = byId(`10${season}`)?.appliedAverage ?? 0;
  if (week <= PROJECTION_WEEKS) return round1(projection);
  const last30 = byId(`03${season}`)?.appliedAverage ?? 0;
  return round1(last30 > 0 ? last30 : projection);
}

/** Can every player in the list start at once? Bipartite matching onto the slots. */
export function allFit(eligible: Set<number>[]): boolean {
  const owner = new Array<number>(SLOT_INSTANCES.length).fill(-1);
  const place = (p: number, seen: Set<number>): boolean => {
    for (let i = 0; i < SLOT_INSTANCES.length; i++) {
      if (!eligible[p].has(SLOT_INSTANCES[i]) || seen.has(i)) continue;
      seen.add(i);
      if (owner[i] === -1 || place(owner[i], seen)) { owner[i] = p; return true; }
    }
    return false;
  };
  return eligible.every((_, p) => place(p, new Set()));
}

/**
 * Project one fantasy team for the week. On each day the players with a game
 * start in order of average, as long as they still fit a slot; the rest are
 * games lost to the lineup limit. (Greedy is optimal here: which sets of
 * players can start together forms a matroid.)
 */
export function projectTeam(
  team: any,
  scoringPeriods: number[],
  schedules: ProTeamSchedule[],
  season: number,
  week: number,
): TeamProjection {
  const playsOn = new Map<number, Set<number>>();
  const abbrev = new Map<number, string>();
  for (const s of schedules) {
    playsOn.set(s.proTeamId, new Set(s.games.map(g => g.scoringPeriodId)));
    abbrev.set(s.proTeamId, s.abbrev);
  }

  const players = (team.roster?.entries || []).map((entry: any) => {
    const p = entry.playerPoolEntry?.player || {};
    const slots: number[] = p.eligibleSlots || [];
    return {
      name: p.fullName || 'Unknown',
      pos: POSITION[slots.find(s => s in POSITION) ?? -1] ?? '',
      nba: abbrev.get(p.proTeamId) ?? '',
      status: p.injuryStatus || 'ACTIVE',
      onIR: entry.lineupSlotId === IR_SLOT,
      avg: playerAverage(p, season, week),
      games: 0,
      projected: 0,
      eligible: new Set(slots),
      proTeamId: p.proTeamId as number,
    };
  });

  let lost = 0;
  for (const sp of scoringPeriods) {
    const playing = players
      .filter((p: any) => !p.onIR && playsOn.get(p.proTeamId)?.has(sp))
      .sort((a: any, b: any) => b.avg - a.avg);
    const starting: typeof players = [];
    for (const p of playing) {
      if (allFit([...starting, p].map((x: any) => x.eligible))) starting.push(p);
      else lost++;
    }
    for (const p of starting) p.games++;
  }

  const roster: ProjectedPlayer[] = players.map((p: any) => ({
    name: p.name, pos: p.pos, nba: p.nba, status: p.status, onIR: p.onIR,
    avg: p.avg, games: p.games, projected: round1(p.avg * p.games),
  }));

  return {
    teamId: team.id,
    teamName: (team.name || `Team ${team.id}`).trim(),
    games: roster.reduce((n, p) => n + p.games, 0),
    gamesLostToLineupLimit: lost,
    projectedPoints: round1(roster.reduce((n, p) => n + p.avg * p.games, 0)),
    keyPlayers: roster.filter(p => !p.onIR).sort((a, b) => b.avg - a.avg).slice(0, 3),
    injuries: roster
      .filter(p => p.status !== 'ACTIVE')
      .map(({ name, status, onIR }) => ({ name, status, onIR })),
    roster,
  };
}

/** All of one week's head-to-head matchups from an ESPN mTeam+mRoster+mMatchup response. */
export function buildWeekProjection(
  league: any,
  week: number,
  scoringPeriods: number[],
  days: string[],
  schedules: ProTeamSchedule[],
  season: number,
  frozenAt: string,
): WeekProjection {
  const teams = new Map<number, TeamProjection>();
  for (const t of league.teams || []) {
    teams.set(t.id, projectTeam(t, scoringPeriods, schedules, season, week));
  }
  const matchups = (league.schedule || [])
    .filter((m: any) => m.matchupPeriodId === week && teams.has(m.home?.teamId) && teams.has(m.away?.teamId))
    .map((m: any) => ({ home: teams.get(m.home.teamId)!, away: teams.get(m.away.teamId)!, actual: null }));

  return {
    season,
    week,
    frozenAt,
    days,
    averageSource: week <= PROJECTION_WEEKS
      ? `ESPN ${season - 1}-${String(season).slice(2)} projected average`
      : 'Average over the last 30 days (ESPN projection if no games in that window)',
    matchups,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

const STATUS_LABEL: Record<string, string> = { DAY_TO_DAY: 'day-to-day', OUT: 'out', SUSPENSION: 'suspended' };

/**
 * Up to 3 short notes for the matchup pop-up, most telling first: a games
 * gap, a team's best player with few games, injuries outside IR, and games
 * lost to the lineup limit.
 */
export function watchNotes(a: TeamProjection, b: TeamProjection): string[] {
  const notes: string[] = [];

  const gap = a.games - b.games;
  if (Math.abs(gap) >= 2) {
    const [more, less] = gap > 0 ? [a, b] : [b, a];
    notes.push(`${more.teamName} has ${Math.abs(gap)} more games (${more.games} vs ${less.games}).`);
  }
  for (const t of [a, b]) {
    const star = t.keyPlayers[0];
    if (star && star.games <= 2) {
      notes.push(`${star.name}, ${t.teamName}'s top player, plays only ${star.games} game${star.games === 1 ? '' : 's'}.`);
    }
  }
  for (const t of [a, b]) {
    const hurt = t.injuries.filter(i => !i.onIR);
    if (hurt.length > 0) {
      notes.push(`${t.teamName}: ${hurt.map(i => `${i.name} (${STATUS_LABEL[i.status] ?? i.status.toLowerCase()})`).join(', ')}.`);
    }
  }
  for (const t of [a, b]) {
    if (t.gamesLostToLineupLimit > 0) {
      const n = t.gamesLostToLineupLimit;
      notes.push(`${t.teamName} loses ${n} game${n === 1 ? '' : 's'} to the 10-player lineup limit.`);
    }
  }
  return notes.slice(0, 3);
}

/** The frozen projection for a head-to-head pair, sides swapped to match. */
export function findMatchupProjection(
  projection: WeekProjection | null,
  homeTeamId: number,
  awayTeamId: number,
): { home: TeamProjection; away: TeamProjection } | null {
  for (const m of projection?.matchups ?? []) {
    if (m.home.teamId === homeTeamId && m.away.teamId === awayTeamId) return { home: m.home, away: m.away };
    if (m.home.teamId === awayTeamId && m.away.teamId === homeTeamId) return { home: m.away, away: m.home };
  }
  return null;
}
