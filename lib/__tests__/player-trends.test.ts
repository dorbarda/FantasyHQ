import { describe, it, expect } from 'vitest';
import { rankByValue, rankGain, topLast30, surprises, busts, hasSeasonStarted, type TrendPlayer } from '../player-trends';

function p(name: string, rank: number, projRank: number | null, last30Pts = 0): TrendPlayer {
  return { playerId: rank * 1000 + (projRank ?? 0), name, proTeam: 'BOS', ownerName: null, seasonPts: 100, gp: 5, last30Pts, rank, projRank };
}

describe('rankByValue', () => {
  it('gives equal values the same rank (1, 2, 2, 4)', () => {
    const items = [{ v: 10 }, { v: 30 }, { v: 20 }, { v: 20 }];
    const ranks = rankByValue(items, x => x.v);
    expect(items.map(x => ranks.get(x))).toEqual([4, 1, 2, 2]);
  });
});

describe('player trends', () => {
  const players = [
    p('Star', 1, 1, 300),
    p('Sleeper', 10, 90, 250),     // +80
    p('Riser', 40, 60, 200),       // +20
    p('Deep riser', 150, 400, 50), // +250 but outside the current top 100
    p('Bust', 80, 5, 100),         // -75
    p('Slump', 30, 20, 150),       // -10
    p('Late bust', 300, 150, 10),  // projected outside top 100
    p('Rookie', 50, null, 120),
  ];

  it('rankGain = projected rank minus current rank', () => {
    expect(rankGain(players[1])).toBe(80);
    expect(rankGain(players[4])).toBe(-75);
    expect(rankGain(players[7])).toBeNull();
  });

  it('top last 30 by points', () => {
    expect(topLast30(players, 3).map(x => x.name)).toEqual(['Star', 'Sleeper', 'Riser']);
  });

  it('surprises: current top 100, biggest climb first', () => {
    expect(surprises(players).map(x => x.name)).toEqual(['Sleeper', 'Riser']);
  });

  it('busts: projected top 100, biggest drop first', () => {
    expect(busts(players).map(x => x.name)).toEqual(['Bust', 'Slump']);
  });

  it('season starts with the first point scored', () => {
    expect(hasSeasonStarted({ players })).toBe(true);
    expect(hasSeasonStarted({ players: players.map(x => ({ ...x, seasonPts: 0 })) })).toBe(false);
  });
});
