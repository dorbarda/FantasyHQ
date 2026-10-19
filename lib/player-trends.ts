/**
 * Home page side column — player trends. Pure logic, no I/O.
 * Data comes from the `player-trends` snapshot (lib/player-trends-data.ts).
 *
 * Ranks are by total fantasy points among every NBA player ESPN returns, so
 * they match ESPN's own "sort by total points" order. Equal points share a
 * rank (1, 2, 2, 4).
 */

export interface TrendPlayer {
  playerId: number;
  name: string;
  proTeam: string;
  /** Owner in our league, null for a free agent. */
  ownerName: string | null;
  seasonPts: number;
  gp: number;
  last30Pts: number;
  /** Rank by season total points. */
  rank: number;
  /** Rank by ESPN's preseason projected total, null when not projected. */
  projRank: number | null;
}

export interface PlayerTrendsData {
  players: TrendPlayer[];
}

/** One frozen row of ESPN's preseason projection, written once per season. */
export interface PreseasonRank {
  playerId: number;
  name: string;
  projPts: number;
  rank: number;
}

/** Surprises must be in the current top N; busts in the projected top N. */
export const RELEVANT_TOP = 100;

/** Competition ranking (1, 2, 2, 4) by value, highest first. */
export function rankByValue<T>(items: T[], value: (t: T) => number): Map<T, number> {
  const sorted = [...items].sort((a, b) => value(b) - value(a));
  const ranks = new Map<T, number>();
  sorted.forEach((item, i) => {
    const prev = sorted[i - 1];
    ranks.set(item, prev !== undefined && value(prev) === value(item) ? ranks.get(prev)! : i + 1);
  });
  return ranks;
}

/** Projected rank minus current rank: positive = better than projected. */
export function rankGain(p: TrendPlayer): number | null {
  return p.projRank === null ? null : p.projRank - p.rank;
}

const byName = (a: TrendPlayer, b: TrendPlayer) => a.name.localeCompare(b.name);

/** True once at least one game has been scored this season. */
export function hasSeasonStarted(data: PlayerTrendsData): boolean {
  return data.players.some(p => p.seasonPts !== 0);
}

export function topLast30(players: TrendPlayer[], n = 5): TrendPlayer[] {
  return players
    .filter(p => p.last30Pts > 0)
    .sort((a, b) => b.last30Pts - a.last30Pts || byName(a, b))
    .slice(0, n);
}

/** Biggest climb vs. the preseason projection, among the current top 100. */
export function surprises(players: TrendPlayer[], n = 3): TrendPlayer[] {
  return players
    .filter(p => p.rank <= RELEVANT_TOP && (rankGain(p) ?? 0) > 0)
    .sort((a, b) => rankGain(b)! - rankGain(a)! || a.rank - b.rank || byName(a, b))
    .slice(0, n);
}

/** Biggest drop vs. the preseason projection, among the projected top 100. */
export function busts(players: TrendPlayer[], n = 3): TrendPlayer[] {
  return players
    .filter(p => p.projRank !== null && p.projRank <= RELEVANT_TOP && rankGain(p)! < 0)
    .sort((a, b) => rankGain(a)! - rankGain(b)! || a.projRank! - b.projRank! || byName(a, b))
    .slice(0, n);
}
