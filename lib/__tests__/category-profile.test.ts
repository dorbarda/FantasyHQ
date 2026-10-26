import { describe, it, expect } from 'vitest';
import { computeCategoryProfile, formatProfileValue } from '../category-profile';
import type { SeasonStats } from '../types';

function team(id: string, s: Partial<SeasonStats>): SeasonStats {
  return {
    teamId: id, teamName: `T ${id}`, ownerName: `O ${id}`,
    fgm: 0, fga: 0, ftm: 0, fta: 0, tpm: 0, reb: 0, ast: 0,
    stl: 0, blk: 0, to: 0, td: 0, pts: 0,
    ...s,
  };
}

describe('computeCategoryProfile', () => {
  const stats = [
    team('a', { fgm: 50, fga: 100, ftm: 80, fta: 100, reb: 300, ast: 100, stl: 30, blk: 10, pts: 1000, to: 50 }),
    team('b', { fgm: 45, fga: 100, ftm: 90, fta: 100, reb: 200, ast: 200, stl: 10, blk: 40, pts: 900, to: 40 }),
    team('c', { fgm: 40, fga: 100, ftm: 70, fta: 100, reb: 300, ast: 150, stl: 20, blk: 10, pts: 800, to: 60 }),
  ];
  const { teams, leaders } = computeCategoryProfile(stats);

  it('computes percentages from made / attempted and STOCKS = STL + BLK', () => {
    expect(teams[0].stats.fgPct.value).toBe(0.5);
    expect(teams[1].stats.ftPct.value).toBe(0.9);
    expect(teams[1].stats.stocks.value).toBe(50);
  });

  it('ranks TO with lower as better', () => {
    expect(teams[1].stats.to.rank).toBe(1);
    expect(teams[2].stats.to.rank).toBe(3);
    expect(teams[1].stats.to.score).toBe(100);
  });

  it('gives tied teams the same rank and lists both as leaders', () => {
    expect(teams[0].stats.reb.rank).toBe(1);
    expect(teams[2].stats.reb.rank).toBe(1);
    expect(teams[1].stats.reb.rank).toBe(3);
    const reb = leaders.find(l => l.key === 'reb')!;
    expect(reb.ownerNames).toEqual(['O a', 'O c']);
    expect(reb.value).toBe(300);
  });

  it('names one leader per category', () => {
    expect(leaders.map(l => l.label)).toEqual(['FG%', 'FT%', 'REB', 'AST', 'STOCKS', 'PTS', 'TO']);
    expect(leaders.find(l => l.key === 'stocks')!.ownerNames).toEqual(['O b']);
  });

  it('treats zero attempts as 0%', () => {
    expect(computeCategoryProfile([team('z', {})]).teams[0].stats.fgPct.value).toBe(0);
  });
});

describe('formatProfileValue', () => {
  it('formats percentages and totals', () => {
    expect(formatProfileValue('fgPct', 0.48102)).toBe('48.1%');
    expect(formatProfileValue('pts', 12947)).toBe('12,947');
  });
});
