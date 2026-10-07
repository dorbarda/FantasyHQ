import { describe, it, expect } from 'vitest';
import { computePowerRankings } from '../power-rankings';
import type { MatchupDepthRow } from '../types';

function row(teamId: string, week: number, teamScore: number, totalPlayers: number, won: boolean | null = true): MatchupDepthRow {
  return {
    matchupPeriod: week, teamId, teamName: `T ${teamId}`, ownerName: `O ${teamId}`,
    dailyPlayers: [totalPlayers], totalPlayers, teamScore,
    opponentName: '', opponentScore: 0, won,
    scorePP: teamScore / totalPlayers, efficiency: 0,
  };
}

describe('computePowerRankings', () => {
  // A: steady 30/player. B: 20/player in weeks 1-3, 40/player in weeks 4-6.
  const rows: MatchupDepthRow[] = [];
  for (let w = 1; w <= 6; w++) {
    rows.push(row('a', w, 300, 10));
    rows.push(row('b', w, w <= 3 ? 200 : 400, 10));
  }

  it('ranks by the last 3 weeks and compares with the 3 before', () => {
    const { entries, recentWeeks, priorWeeks } = computePowerRankings(rows);
    expect(recentWeeks).toEqual([4, 5, 6]);
    expect(priorWeeks).toEqual([1, 2, 3]);
    const [first, second] = entries;
    expect(first.teamId).toBe('b');
    expect(first.recentScorePP).toBe(40);
    expect(first.change).toBe(20);
    expect(first.rankMove).toBe(1);
    expect(second.teamId).toBe('a');
    expect(second.change).toBe(0);
    expect(second.rankMove).toBe(-1);
    expect(first.weekly.map(w => w.week)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('weights by players, so a long week is not double counted', () => {
    const r = [row('a', 1, 100, 10), row('a', 2, 900, 30)];
    expect(computePowerRankings(r).entries[0].recentScorePP).toBe(25);
  });

  it('ignores in-progress weeks', () => {
    const { recentWeeks } = computePowerRankings([...rows, row('a', 7, 999, 1, null)]);
    expect(recentWeeks).toEqual([4, 5, 6]);
  });

  it('has no change or move before there are earlier weeks to compare', () => {
    const { entries, priorWeeks } = computePowerRankings(rows.filter(r => r.matchupPeriod <= 2));
    expect(priorWeeks).toEqual([]);
    expect(entries[0].change).toBeNull();
    expect(entries[0].rankMove).toBeNull();
  });
});
