/**
 * Day-by-day record of a matchup week: who played each day and the win
 * probability after each day. Spec: docs/MATCHUP-DETAIL-SPEC.md §5–6.
 *
 * Pure — scripts/update-week-daily.mts does the I/O every morning and writes
 * data/projections/<season>/week-NN-daily.json.
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
  matchups: { homeTeamId: number; awayTeamId: number; homeWinProb: (number | null)[] }[];
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
  /** "Start" or the weekday, e.g. "Tue". */
  label: string;
  date: string | null;
  /** Chance the left (home) team wins, 0–1. */
  left: number;
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
    winProb.push({ label: 'Start', date: null, left: start.home.teamId === leftTeamId ? p : round3(1 - p) });
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
  (daily?.days ?? []).forEach((d, i) => {
    const p = saved?.homeWinProb[i];
    if (p == null) return;
    winProb.push({ label: weekdayLabel(d.date), date: d.date, left: flip ? round3(1 - p) : p });
  });

  if (winProb.length === 0 && days.length === 0) return null;
  return { weekDays: weekDays.length > 0 ? weekDays : days.map(d => d.date), winProb, days };
}
