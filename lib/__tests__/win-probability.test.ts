import { describe, it, expect } from 'vitest';
import { gameSd, normalCdf, remainingVariance, winProbability } from '../win-probability';
import { countMoves, gamesInProgress, matchupDaily, pointsThrough, rosterIds, startWinProb, type WeekDaily } from '../week-daily';
import type { TeamProjection, WeekProjection } from '../week-projections';

describe('normalCdf', () => {
  it('matches known values', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(normalCdf(1)).toBeCloseTo(0.8413, 4);
    expect(normalCdf(-1.96)).toBeCloseTo(0.025, 3);
  });
});

describe('winProbability', () => {
  it('gap 55 with spread ~129 → about 66%', () => {
    expect(winProbability({ expected: 1401, variance: 129 ** 2 / 2 }, { expected: 1346, variance: 129 ** 2 / 2 }))
      .toBeCloseTo(normalCdf(55 / 129), 6);
  });
  it('no games left → the leader wins for sure; a tie is 50%', () => {
    expect(winProbability({ expected: 100, variance: 0 }, { expected: 90, variance: 0 })).toBe(1);
    expect(winProbability({ expected: 90, variance: 0 }, { expected: 100, variance: 0 })).toBe(0);
    expect(winProbability({ expected: 90, variance: 0 }, { expected: 90, variance: 0 })).toBe(0.5);
  });
  it('is symmetric', () => {
    const a = { expected: 500, variance: 3000 };
    const b = { expected: 470, variance: 2500 };
    expect(winProbability(a, b) + winProbability(b, a)).toBeCloseTo(1, 9);
  });
});

describe('remainingVariance', () => {
  it('adds games × sd²', () => {
    expect(remainingVariance([{ avg: 40, games: 3 }, { avg: 20, games: 0 }])).toBeCloseTo(3 * gameSd(40) ** 2, 9);
  });
});

const team = (teamId: number, projectedPoints: number, avg: number, games: number): TeamProjection => ({
  teamId, teamName: `T${teamId}`, games, gamesLostToLineupLimit: 0, projectedPoints, keyPlayers: [], injuries: [],
  roster: [{ name: 'P', pos: 'C', nba: 'X', status: 'ACTIVE', onIR: false, avg, games, projected: avg * games }],
});

describe('matchupDaily', () => {
  const frozen: WeekProjection = {
    season: 2027, week: 1, frozenAt: '', days: ['2026-10-20', '2026-10-21'], averageSource: '',
    matchups: [{ home: team(2, 120, 40, 3), away: team(9, 100, 40, 3), actual: null }],
  };
  const daily: WeekDaily = {
    season: 2027, week: 1, updatedAt: '',
    days: [{ date: '2026-10-20', scoringPeriodId: 1 }],
    teams: { '2': [{ played: 2, points: 62 }], '9': [{ played: 3, points: 67 }] },
    matchups: [{ homeTeamId: 2, awayTeamId: 9, homeWinProb: [0.56] }],
  };

  it('Start point + one per finished day, left = ESPN home', () => {
    const d = matchupDaily(frozen, daily, 2, 9)!;
    expect(d.winProb.map(p => p.label)).toEqual(['Start', 'Tue']);
    expect(d.winProb[0].left).toBe(startWinProb(frozen.matchups[0].home, frozen.matchups[0].away));
    expect(d.winProb[1].left).toBe(0.56);
    expect(d.days[0]).toEqual({ date: '2026-10-20', left: { played: 2, points: 62 }, right: { played: 3, points: 67 } });
    expect(d.weekDays).toEqual(frozen.days);
  });

  it('sides swapped → probabilities flip', () => {
    const d = matchupDaily(frozen, daily, 9, 2)!;
    expect(d.winProb[1].left).toBeCloseTo(0.44, 9);
    expect(d.days[0].left.points).toBe(67);
  });

  it('nothing saved → null', () => {
    expect(matchupDaily(null, null, 2, 9)).toBeNull();
  });

  it('pointsThrough sums the first N days', () => {
    expect(pointsThrough([{ played: 1, points: 10.04 }, { played: 1, points: 5 }, { played: 1, points: 7 }], 2)).toBe(15);
  });
});

describe('mid-day changes', () => {
  const frozen: WeekProjection = {
    season: 2027, week: 1, frozenAt: '', days: ['2026-10-20', '2026-10-21', '2026-10-22'], averageSource: '',
    matchups: [{ home: team(2, 120, 40, 3), away: team(9, 100, 40, 3), actual: null }],
  };
  const daily: WeekDaily = {
    season: 2027, week: 1, updatedAt: '',
    days: [{ date: '2026-10-20', scoringPeriodId: 1 }],
    teams: {},
    matchups: [{
      homeTeamId: 2, awayTeamId: 9, homeWinProb: [0.56],
      changes: [
        { at: '2026-10-20T10:00:00Z', day: 0, homeWinProb: 0.6, moves: { '9': 1 } },
        { at: '2026-10-21T12:00:00Z', day: 1, homeWinProb: 0.5, moves: { '2': 2 } },
      ],
    }],
  };

  it('small dots sit between the big dots, in order, with Israel time', () => {
    const d = matchupDaily(frozen, daily, 2, 9)!;
    expect(d.winProb.map(p => [p.label, p.kind])).toEqual([
      ['Start', 'day'], ['Tue 13:00', 'change'], ['Tue', 'day'], ['Wed 15:00', 'change'],
    ]);
    const slots = d.winProb.map(p => p.slot);
    expect(slots).toEqual([...slots].sort((a, b) => a - b));
    expect(slots[1]).toBeGreaterThan(0);
    expect(slots[1]).toBeLessThan(1);
    expect(slots[3]).toBeGreaterThan(1);
    expect(slots[3]).toBeLessThan(2);
  });

  it('moves follow the sides', () => {
    const d = matchupDaily(frozen, daily, 9, 2)!;
    expect(d.winProb[1].moves).toEqual({ left: 1, right: 0 });
    expect(d.winProb[3]).toMatchObject({ left: 0.5, moves: { left: 0, right: 2 } });
  });
});

describe('gamesInProgress', () => {
  const tip = Date.parse('2026-10-21T00:00:00Z');
  const schedules = [{ proTeamId: 1, abbrev: 'ATL', games: [{ scoringPeriodId: 2, opponentId: 2, isHome: true, dateMs: tip }] }];
  it('blocks while on, and after tip-off on a day not finished yet', () => {
    expect(gamesInProgress(schedules, new Set([2]), tip + 3600_000)).toBe(true);
    expect(gamesInProgress(schedules, new Set([1]), tip + 6 * 3600_000)).toBe(true);
  });
  it('free before tip-off and once the day is over', () => {
    expect(gamesInProgress(schedules, new Set([1]), tip - 60_000)).toBe(false);
    expect(gamesInProgress(schedules, new Set([1, 2]), tip + 5 * 3600_000)).toBe(false);
  });
});

describe('countMoves', () => {
  const roster = (...e: [number, number][]) => rosterIds({ roster: { entries: e.map(([playerId, lineupSlotId]) => ({ playerId, lineupSlotId })) } });
  it('pickup = 1, IR move = 1, lineup swap = 0', () => {
    const before = roster([1, 0], [2, 12], [3, 0]);
    expect(countMoves(before, roster([1, 0], [2, 12], [4, 0]))).toBe(1);
    expect(countMoves(before, roster([1, 0], [2, 13], [3, 0]))).toBe(1);
    expect(countMoves(before, roster([1, 12], [2, 0], [3, 0]))).toBe(0);
    expect(countMoves(undefined, before)).toBe(0);
  });
});
