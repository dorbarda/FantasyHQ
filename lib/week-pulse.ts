/**
 * Home "This week" card — pure logic, no I/O.
 *
 * For each matchup: win % now, how much last night moved it, and who still
 * plays today. Win % comes from the day-by-day file (lib/week-daily.ts), so
 * it is the morning number — it does not move during live games.
 */
import type { WinProbPoint } from './week-daily';
import type { ProjectedPlayer } from './week-projections';

export interface WinPulse {
  /** Left (home) team's chance to win now, 0–1. */
  now: number;
  /**
   * Change in the left team's chance over the last finished night
   * (after-night dot minus the dot before it). Null before the first night.
   */
  lastNight: number | null;
}

/**
 * Latest win % and last night's swing from a matchup's chart points.
 * "Now" is the latest point (a roster move after the night can move it);
 * the swing compares the last day dot with the dot just before it.
 */
export function winPulse(points: WinProbPoint[]): WinPulse | null {
  if (points.length === 0) return null;
  const now = points[points.length - 1].left;
  let lastDay = -1;
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].kind === 'day' && points[i].slot > 0) { lastDay = i; break; }
  }
  const lastNight = lastDay > 0 ? round3(points[lastDay].left - points[lastDay - 1].left) : null;
  return { now, lastNight };
}

export interface TonightPlayer {
  name: string;
  nba: string;
  avg: number;
}

export interface TonightTeam {
  /** Startable games left today. */
  games: number;
  /** Highest averages among them, best first. */
  top: TonightPlayer[];
}

/** Who starts today, from a one-day projection (lib/week-projections.ts projectTeam). */
export function tonightFrom(roster: ProjectedPlayer[], limit = 2): TonightTeam {
  const playing = roster.filter(p => p.games > 0).sort((a, b) => b.avg - a.avg);
  return {
    games: playing.reduce((n, p) => n + p.games, 0),
    top: playing.slice(0, limit).map(p => ({ name: p.name, nba: p.nba, avg: p.avg })),
  };
}

/** "Jayson Tatum" → "J. Tatum" — fits a phone row. */
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;
