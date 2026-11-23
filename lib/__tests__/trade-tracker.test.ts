import { describe, it, expect } from 'vitest';
import { gameLines, trackPlayer, periodOfDate, periodFromSchedule, easternDay } from '../trade-tracker';

const game = (period: number, pts: number, gp = 1, extra: object = {}) => ({
  statSourceId: 0, statSplitTypeId: 5, scoringPeriodId: period, appliedTotal: pts, stats: { '42': gp }, ...extra,
});

describe('gameLines', () => {
  it('keeps only actual single-game lines with a game played', () => {
    const player = { stats: [
      game(3, 40), game(1, 30),
      game(2, 0, 0),                                   // did not play
      { ...game(4, 99), statSourceId: 1 },              // projection
      { ...game(0, 500), statSplitTypeId: 0 },          // season total
      game(5, 20, 1, { seasonId: 2026 }),               // last season
      game(3, 40),                                      // duplicate
    ] };
    expect(gameLines(player, 2027)).toEqual([
      { scoringPeriodId: 1, pts: 30 },
      { scoringPeriodId: 3, pts: 40 },
    ]);
  });
});

describe('trackPlayer', () => {
  const lines = [10, 20, 30, 40, 50].map((pts, i) => ({ scoringPeriodId: i + 1, pts }));

  it('counts the trade day as before and the next day on as after', () => {
    const t = trackPlayer(lines, 2);
    expect(t.before).toEqual({ gp: 2, pts: 30, avg: 15 });
    expect(t.after).toEqual({ gp: 3, pts: 120, avg: 40 });
    expect(t.avgChange).toBe(25);
  });

  it('has no average change before any game since the trade', () => {
    const t = trackPlayer(lines, 5);
    expect(t.after).toEqual({ gp: 0, pts: 0, avg: null });
    expect(t.avgChange).toBeNull();
  });
});

describe('periodOfDate', () => {
  const now = Date.parse('2026-11-22T21:00:00Z'); // Nov 22, 4pm ET

  it('is today for a trade earlier today', () => {
    expect(periodOfDate(Date.parse('2026-11-22T15:00:00Z'), 34, now)).toBe(34);
  });

  it('uses the US Eastern day, not UTC', () => {
    // 02:00 UTC Nov 21 = 9pm ET Nov 20 → two days back
    expect(easternDay(Date.parse('2026-11-21T02:00:00Z'))).toBe('2026-11-20');
    expect(periodOfDate(Date.parse('2026-11-21T02:00:00Z'), 34, now)).toBe(32);
  });
});

describe('periodFromSchedule', () => {
  // Day 33 = Nov 21 ET, day 34 = Nov 22 ET (late tip-offs fall on the next UTC day)
  const schedules = [{ games: [
    { scoringPeriodId: 33, dateMs: Date.parse('2026-11-22T03:00:00Z') },
    { scoringPeriodId: 34, dateMs: Date.parse('2026-11-23T00:00:00Z') },
    { scoringPeriodId: 36, dateMs: Date.parse('2026-11-25T00:00:00Z') },
  ] }];

  it('maps a trade to the game day on its Eastern date', () => {
    expect(periodFromSchedule(Date.parse('2026-11-22T20:31:00Z'), schedules)).toBe(34);
    expect(periodFromSchedule(Date.parse('2026-11-22T04:00:00Z'), schedules)).toBe(33); // 11pm ET Nov 21
  });

  it('uses the last game day before a day without games', () => {
    expect(periodFromSchedule(Date.parse('2026-11-23T18:00:00Z'), schedules)).toBe(34);
  });

  it('is null without a schedule', () => {
    expect(periodFromSchedule(Date.now(), [])).toBeNull();
  });
});
