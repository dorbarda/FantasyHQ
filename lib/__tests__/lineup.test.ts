import { describe, it, expect } from 'vitest';
import { countStartersOnDay } from '../lineup';

const SP = 30;

/** One roster entry; `day` is that player's stat line for SP, if he played. */
function entry(lineupSlotId: number, day?: { appliedTotal?: number; pts?: number; min?: number }) {
  const stats = day
    ? [{ statSourceId: 0, scoringPeriodId: SP, appliedTotal: day.appliedTotal ?? 0, stats: { '0': day.pts ?? 0, '40': day.min ?? 0 } }]
    : [];
  return { lineupSlotId, playerPoolEntry: { player: { fullName: 'P', stats } } };
}

describe('countStartersOnDay', () => {
  it('counts starters who played and skips bench (12) and IR (13)', () => {
    const entries = [
      entry(0, { appliedTotal: 30, min: 34 }),
      entry(5, { appliedTotal: 12, min: 20 }),
      entry(12, { appliedTotal: 40, min: 36 }), // bench — played, doesn't count
      entry(13, { appliedTotal: 5, min: 10 }),  // IR
    ];
    expect(countStartersOnDay(entries, SP)).toBe(2);
  });

  it('counts a starter who played with zero or negative points', () => {
    expect(countStartersOnDay([entry(1, { appliedTotal: -2, min: 8 })], SP)).toBe(1);
  });

  it('skips starters with no game that day', () => {
    const noGame = entry(2);
    const otherDay = { lineupSlotId: 3, playerPoolEntry: { player: { stats: [{ statSourceId: 0, scoringPeriodId: SP - 1, appliedTotal: 25 }] } } };
    const projection = { lineupSlotId: 4, playerPoolEntry: { player: { stats: [{ statSourceId: 1, scoringPeriodId: SP, appliedTotal: 25 }] } } };
    expect(countStartersOnDay([noGame, otherDay, projection], SP)).toBe(0);
  });

  it('is not capped — every starter who played counts', () => {
    const entries = Array.from({ length: 11 }, (_, i) => entry(i, { appliedTotal: 10, min: 20 }));
    expect(countStartersOnDay(entries, SP)).toBe(11);
  });
});
