/**
 * Matchup win probability — pure logic, no I/O. Spec: docs/MATCHUP-DETAIL-SPEC.md §5.
 *
 * Expected final = points so far + player average × startable games left.
 * Every remaining game can swing by GAME_SD; the swings add up (variances add),
 * so the gap between the two teams is roughly normal. Win % = chance that gap
 * ends above zero.
 */

/**
 * Standard deviation of one player's fantasy points in one game, by his average.
 * Measured on 4,552 player-games of the 2025-26 season in this league (every
 * other day, players who played): actual points vs. ESPN's preseason projected
 * average. Spread is fairly flat — 12.9 at avg 18, 15.8 at avg 42, 18.5 at avg 58.
 * Games a player misses (injury, rest) are not in the sample, so this is a
 * little on the tight side.
 */
export const GAME_SD_BASE = 12.1;
export const GAME_SD_PER_POINT = 0.079;

export function gameSd(avg: number): number {
  return GAME_SD_BASE + GAME_SD_PER_POINT * Math.max(0, avg);
}

/** Variance of a team's remaining points: Σ games × (sd per game)². */
export function remainingVariance(players: { avg: number; games: number }[]): number {
  return players.reduce((v, p) => v + p.games * gameSd(p.avg) ** 2, 0);
}

/** Standard normal CDF (Abramowitz–Stegun 7.1.26, error < 1.5e-7). */
export function normalCdf(z: number): number {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) * Math.exp(-x * x);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

export interface TeamOutlook {
  /** Points so far + projected points for the games left. */
  expected: number;
  /** Variance of the points still to come (0 when no games are left). */
  variance: number;
}

/** Chance (0–1) that `a` finishes ahead of `b`. No games left → 1, 0, or 0.5 on a tie. */
export function winProbability(a: TeamOutlook, b: TeamOutlook): number {
  const gap = a.expected - b.expected;
  const sd = Math.sqrt(a.variance + b.variance);
  if (sd === 0) return gap > 0 ? 1 : gap < 0 ? 0 : 0.5;
  return normalCdf(gap / sd);
}
