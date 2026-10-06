/**
 * Lineup helpers shared by every loader that reads a day's ESPN roster.
 * Pure — no I/O — so the "who counts" rule is tested in one place.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

/** ESPN lineup slots that don't score for their owner: 12 = bench, 13 = IR. */
export const NON_SCORING_SLOTS = new Set([12, 13]);

export function isStarter(entry: any): boolean {
  return !NON_SCORING_SLOTS.has(entry?.lineupSlotId);
}

/** The player's actual stat line for one day, if ESPN has one. */
export function dayStatLine(entry: any, scoringPeriodId: number): any | undefined {
  const stats: any[] = entry?.playerPoolEntry?.player?.stats || [];
  return stats.find(s => s.statSourceId === 0 && s.scoringPeriodId === scoringPeriodId);
}

/**
 * Starters who played that day — "starter-games" in the depth stats and the
 * recap. Bench and IR players are left out even when they played: their
 * points don't count, so neither do their games.
 * Played = positive fantasy points, points scored (stat 0) or minutes (stat 40).
 */
export function countStartersOnDay(entries: any[], scoringPeriodId: number): number {
  let count = 0;
  for (const entry of entries) {
    if (!entry?.playerPoolEntry?.player || !isStarter(entry)) continue;
    const day = dayStatLine(entry, scoringPeriodId);
    if (day && (day.appliedTotal > 0 || (day.stats?.['0'] || 0) > 0 || (day.stats?.['40'] || 0) > 0)) {
      count++;
    }
  }
  return count;
}
