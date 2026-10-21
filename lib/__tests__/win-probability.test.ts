import { describe, it, expect } from 'vitest';
import { gameSd, normalCdf, remainingVariance, winProbability } from '../win-probability';
import { matchupDaily, pointsThrough, startWinProb, type WeekDaily } from '../week-daily';
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
