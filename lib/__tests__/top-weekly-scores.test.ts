import { describe, it, expect } from 'vitest';
import { topWeeklyScores } from '../recap';
import type { WeeklyTopPlayer } from '../types';

const p = (playerId: number, totalPoints: number, games = 4): WeeklyTopPlayer => ({
  playerId, playerName: `P${playerId}`, proTeam: 'BOS', ownerNames: ['A'],
  totalPoints, games, avgPoints: totalPoints / games,
});

describe('topWeeklyScores', () => {
  it('merges all weeks, sorts by total, keeps 10, and allows the same player twice', () => {
    const weeks = [
      { matchupPeriod: 1, players: Array.from({ length: 10 }, (_, i) => p(i + 1, 100 + i)) },
      { matchupPeriod: 2, players: [p(1, 250), p(50, 90)] },
    ];
    const top = topWeeklyScores(weeks);
    expect(top).toHaveLength(10);
    expect(top[0]).toMatchObject({ playerId: 1, totalPoints: 250, matchupPeriod: 2 });
    expect(top.some(t => t.playerId === 1 && t.matchupPeriod === 1)).toBe(false); // 100 is 11th
    expect(top.some(t => t.playerId === 50)).toBe(false);
  });

  it('breaks ties by fewer games, then earlier week', () => {
    const top = topWeeklyScores([
      { matchupPeriod: 2, players: [p(1, 200, 4)] },
      { matchupPeriod: 1, players: [p(2, 200, 4), p(3, 200, 3)] },
    ]);
    expect(top.map(t => t.playerId)).toEqual([3, 2, 1]);
  });

  it('returns [] when there is no data', () => {
    expect(topWeeklyScores(undefined)).toEqual([]);
  });
});
