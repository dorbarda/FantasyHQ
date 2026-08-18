import { describe, it, expect } from 'vitest';
import { SCORING, computeFP, getGP, extractSeasonStats, extractPerGameStats } from '../scoring';

describe('computeFP', () => {
  it('applies the league multipliers per stat', () => {
    expect(computeFP({ '0': 10 })).toBe(10);      // PTS ×1
    expect(computeFP({ '1': 2 })).toBe(8);        // BLK ×4
    expect(computeFP({ '2': 3 })).toBe(12);       // STL ×4
    expect(computeFP({ '3': 5 })).toBe(10);       // AST ×2
    expect(computeFP({ '11': 4 })).toBe(-8);      // TO ×-2
    expect(computeFP({ '39': 1 })).toBe(100);     // QD ×100
    expect(computeFP({ '42': 1 })).toBe(-5);      // EJ ×-5
  });

  it('nets shooting efficiency: FGM×2 − FGA, FTM − FTA', () => {
    // 10/20 from the field, 5/8 from the line
    expect(computeFP({ '13': 10, '14': 20, '15': 5, '16': 8 })).toBe(
      10 * 2 - 20 + 5 - 8
    );
  });

  it('sums a realistic stat line', () => {
    // 25 PTS, 10 REB, 7 AST, 2 STL, 1 BLK, 3 TO, 9/18 FG, 4/5 FT, 3 3PM
    const line = {
      '0': 25, '6': 10, '3': 7, '2': 2, '1': 1, '11': 3,
      '13': 9, '14': 18, '15': 4, '16': 5, '17': 3,
    };
    expect(computeFP(line)).toBe(25 + 10 + 14 + 8 + 4 - 6 + 18 - 18 + 4 - 5 + 3);
  });

  it('ignores stat IDs outside the scoring table (e.g. GP encoding)', () => {
    expect(computeFP({ '40': 300, '99': 50 })).toBe(0);
  });

  it('rounds to one decimal', () => {
    expect(computeFP({ '0': 10.55 })).toBe(10.6);
  });

  it('returns 0 for an empty stat map', () => {
    expect(computeFP({})).toBe(0);
  });

  it('GP encoding stat (40) is not part of the scoring table', () => {
    expect(SCORING['40']).toBeUndefined();
  });
});

describe('getGP', () => {
  it('decodes GP from the GP×30 encoding', () => {
    expect(getGP({ '40': 2460 })).toBe(82);
    expect(getGP({ '40': 30 })).toBe(1);
  });

  it('returns 0 when the stat is missing', () => {
    expect(getGP({})).toBe(0);
  });
});

describe('extractSeasonStats', () => {
  const row = (over: Record<string, unknown>) => ({
    statSourceId: 0,
    statSplitTypeId: 0,
    scoringPeriodId: 0,
    stats: { '0': 100 },
    ...over,
  });

  it('picks the actual full-season totals row', () => {
    const stats = extractSeasonStats([
      row({ statSourceId: 1, stats: { '0': 999 } }), // projection — skip
      row({ stats: { '0': 1500, '6': 500 } }),
    ]);
    expect(stats).toEqual({ '0': 1500, '6': 500 });
  });

  it('prefers the higher-PTS row when multiple seasons contaminate the array', () => {
    const stats = extractSeasonStats([
      row({ stats: { '0': 800 } }),   // stale season
      row({ stats: { '0': 1600 } }),  // current season
    ]);
    expect(stats['0']).toBe(1600);
  });

  it('returns {} when there is no usable row', () => {
    expect(extractSeasonStats([])).toEqual({});
    expect(extractSeasonStats([{ statSourceId: 1, stats: { '0': 5 } }])).toEqual({});
  });
});

describe('extractPerGameStats', () => {
  it('uses the per-game split row when present', () => {
    const stats = extractPerGameStats([
      { statSourceId: 0, statSplitTypeId: 1, stats: { '0': 24.5 } },
      { statSourceId: 0, statSplitTypeId: 0, stats: { '0': 2000 } },
    ]);
    expect(stats['0']).toBe(24.5);
  });

  it('falls back to season totals divided by GP', () => {
    const stats = extractPerGameStats([
      { statSourceId: 0, statSplitTypeId: 0, scoringPeriodId: 0, stats: { '0': 820, '40': 1230 } }, // 41 GP
    ]);
    expect(stats['0']).toBe(20);
  });

  it('divides by at least 1 GP so it never divides by zero', () => {
    const stats = extractPerGameStats([
      { statSourceId: 0, statSplitTypeId: 0, scoringPeriodId: 0, stats: { '0': 30 } },
    ]);
    expect(stats['0']).toBe(30);
  });
});
