/**
 * Day-by-day record of a matchup week: who played each day, the win
 * probability after each day, and the changes in between (roster moves).
 * Spec: docs/MATCHUP-DETAIL-SPEC.md §5–6.
 *
 * Pure — scripts/update-week-daily.mts does the I/O on every snapshot run and
 * writes data/projections/<season>/week-NN-daily.json.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ProTeamSchedule } from './espn-schedule';
import { projectTeam, type TeamProjection, type WeekProjection } from './week-projections';
import { remainingVariance, winProbability } from './win-probability';

export interface DayLine {
  /** Starters who played that day. */
  played: number;
  /** Sum of their fantasy points, 1 decimal. */
  points: number;
}

export interface WeekDaily {
  season: number;
  week: number;
  updatedAt: string;
  /** Finished days of the week so far, in order. */
  days: { date: string; scoringPeriodId: number }[];
  /** teamId → one line per entry of `days`. */
  teams: Record<string, DayLine[]>;
  /** Home team's win probability (0–1) after each entry of `days`. */
  matchups: {
    homeTeamId: number;
    awayTeamId: number;
    homeWinProb: (number | null)[];
    /** Moves by team (teamId → count) since the dot before, per entry of `days`. */
    dayMoves?: (Record<string, number> | null)[];
    /** Changes between day dots, in time order. */
    changes?: WinProbChange[];
  }[];
  /** teamId → roster at that matchup's latest dot (player ids, "id:ir" on IR). */
  rosters?: Record<string, string[]>;
}

export interface WinProbChange {
  /** ISO time of the run that saw it. */
  at: string;
  /** Finished days at that time: 0 = between Start and day 1. */
  day: number;
  homeWinProb: number;
  /** teamId → moves since the dot before. */
  moves?: Record<string, number>;
}

/** A new dot only when the win % moved at least this much (1 point). */
export const CHANGE_THRESHOLD = 0.01;
/** A game counts as live from tip-off until this long after (OT, stat lag). */
const LIVE_WINDOW_MS = 4 * 3600_000;

/**
 * True while win % can't be trusted: a game is on, or a game has started on a
 * day that isn't finished yet (its points aren't counted, its players are
 * still projected). Then the run saves no new dot.
 */
export function gamesInProgress(schedules: ProTeamSchedule[], finished: Set<number>, nowMs: number): boolean {
  return schedules.some(s => s.games.some(g =>
    g.dateMs !== null && g.dateMs <= nowMs &&
    (nowMs < g.dateMs + LIVE_WINDOW_MS || !finished.has(g.scoringPeriodId))));
}

/** A team's roster as stable ids — what a move changes. */
export function rosterIds(team: any): string[] {
  return ((team?.roster?.entries || []) as any[])
    .map(e => `${e.playerId ?? e.playerPoolEntry?.player?.id}${e.lineupSlotId === 13 ? ':ir' : ''}`)
    .sort();
}

/**
 * Moves between two rosters: a pickup (in + out) is one move, a player in or
 * out alone is one, and so is a move to or from IR.
 */
export function countMoves(before: string[] | undefined, after: string[]): number {
  if (!before) return 0;
  const id = (k: string) => k.replace(/:ir$/, '');
  const beforeIds = new Set(before.map(id));
  const afterIds = new Set(after.map(id));
  const added = [...afterIds].filter(k => !beforeIds.has(k)).length;
  const dropped = [...beforeIds].filter(k => !afterIds.has(k)).length;
  const was = new Set(before);
  const irChanges = after.filter(k => beforeIds.has(id(k)) && !was.has(k)).length;
  return Math.max(added, dropped) + irChanges;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Points so far for a team: its first `dayCount` days. */
export function pointsThrough(lines: DayLine[] | undefined, dayCount: number): number {
  return round1((lines ?? []).slice(0, dayCount).reduce((s, d) => s + d.points, 0));
}

/**
 * Home win probability after `dayCount` finished days: actual points so far
 * plus a projection of the days still to come, from today's rosters.
 */
export function winProbAfter(
  home: any,
  away: any,
  teams: Record<string, DayLine[]>,
  dayCount: number,
  remainingDays: number[],
  schedules: ProTeamSchedule[],
  season: number,
  week: number,
): number {
  const outlook = (team: any) => {
    const rest = remainingDays.length > 0
      ? projectTeam(team, remainingDays, schedules, season, week)
      : { projectedPoints: 0, roster: [] };
    return {
      expected: pointsThrough(teams[String(team.id)], dayCount) + rest.projectedPoints,
      variance: remainingVariance(rest.roster),
    };
  };
  return round3(winProbability(outlook(home), outlook(away)));
}

/** Start-of-week win probability from the frozen Sunday projection. */
export function startWinProb(home: TeamProjection, away: TeamProjection): number {
  return round3(winProbability(
    { expected: home.projectedPoints, variance: remainingVariance(home.roster.filter(p => !p.onIR)) },
    { expected: away.projectedPoints, variance: remainingVariance(away.roster.filter(p => !p.onIR)) },
  ));
}

export interface WinProbPoint {
  /** "Start", the weekday ("Tue") or, for a change, weekday + Israel time ("Tue 15:00"). */
  label: string;
  date: string | null;
  /** Chance the left (home) team wins, 0–1. */
  left: number;
  /** Position on the x axis: 0 = Start, n = after day n; changes sit in between. */
  slot: number;
  /** Big dot (Start / end of a day) or small dot (a change during the day). */
  kind: 'day' | 'change';
  /** Moves by each side since the dot before. */
  moves?: { left: number; right: number };
}

export interface MatchupDaily {
  /** Every day of the week, for the chart's x axis (Start + one per day). */
  weekDays: string[];
  winProb: WinProbPoint[];
  /** Finished days only. */
  days: { date: string; left: DayLine; right: DayLine }[];
}

/** "2026-10-21" → "Wed" */
export function weekdayLabel(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
}

/** "Tue 15:00", Israel time — where the league lives. */
function changeLabel(at: string): string {
  const d = new Date(at);
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Asia/Jerusalem' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jerusalem' });
  return `${weekday} ${time}`;
}

/**
 * Where a change sits between dot `day` and dot `day + 1`: by time of day
 * (UTC 04:00 → 24:00, when no game is on), kept off the big dots.
 */
function changeSlot(c: WinProbChange, weekDays: string[]): number {
  const date = weekDays[c.day];
  if (!date) return c.day + 0.5;
  const from = Date.parse(`${date}T04:00:00Z`);
  const frac = (Date.parse(c.at) - from) / (20 * 3600_000);
  return c.day + Math.min(0.85, Math.max(0.15, frac));
}

/**
 * One matchup's chart points and daily table, sides matching the card
 * (left = ESPN home). Null when there's nothing to show yet.
 */
export function matchupDaily(
  frozen: WeekProjection | null,
  daily: WeekDaily | null,
  leftTeamId: number,
  rightTeamId: number,
): MatchupDaily | null {
  const weekDays = frozen?.days ?? [];
  const winProb: WinProbPoint[] = [];

  const start = frozen?.matchups.find(m =>
    (m.home.teamId === leftTeamId && m.away.teamId === rightTeamId) ||
    (m.home.teamId === rightTeamId && m.away.teamId === leftTeamId));
  if (start) {
    const p = startWinProb(start.home, start.away);
    winProb.push({ label: 'Start', date: null, left: start.home.teamId === leftTeamId ? p : round3(1 - p), slot: 0, kind: 'day' });
  }

  const saved = daily?.matchups.find(m =>
    (m.homeTeamId === leftTeamId && m.awayTeamId === rightTeamId) ||
    (m.homeTeamId === rightTeamId && m.awayTeamId === leftTeamId));
  const flip = saved ? saved.homeTeamId !== leftTeamId : false;
  const days = (daily?.days ?? []).map((d, i) => ({
    date: d.date,
    left: daily!.teams[String(leftTeamId)]?.[i] ?? { played: 0, points: 0 },
    right: daily!.teams[String(rightTeamId)]?.[i] ?? { played: 0, points: 0 },
  }));
  const side = (p: number) => (flip ? round3(1 - p) : p);
  const moves = (m: Record<string, number> | null | undefined) => {
    const left = m?.[String(leftTeamId)] ?? 0;
    const right = m?.[String(rightTeamId)] ?? 0;
    return left || right ? { left, right } : undefined;
  };
  const axis = weekDays.length > 0 ? weekDays : days.map(d => d.date);
  const changes = saved?.changes ?? [];

  const pushChanges = (day: number) => {
    for (const c of changes.filter(c => c.day === day)) {
      winProb.push({
        label: changeLabel(c.at), date: null, left: side(c.homeWinProb),
        slot: changeSlot(c, axis), kind: 'change', moves: moves(c.moves),
      });
    }
  };
  pushChanges(0);
  (daily?.days ?? []).forEach((d, i) => {
    const p = saved?.homeWinProb[i];
    if (p != null) {
      winProb.push({
        label: weekdayLabel(d.date), date: d.date, left: side(p),
        slot: i + 1, kind: 'day', moves: moves(saved?.dayMoves?.[i]),
      });
    }
    pushChanges(i + 1);
  });

  if (winProb.length === 0 && days.length === 0) return null;
  return { weekDays: axis, winProb, days };
}
