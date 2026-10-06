import { describe, it, expect } from 'vitest';
import { managerOfTheNight, worstManagerOfTheNight, topPlayers, isGameNight } from '../nightly';
import type { NightTeam, NightPlayer } from '../nightly';

const team = (ownerName: string, points: number, playersPlayed: number): NightTeam => ({
  ownerName,
  teamName: `${ownerName} FC`,
  points,
  playersPlayed,
});

const player = (playerName: string, fantasyPoints: number): NightPlayer => ({
  playerName,
  proTeam: 'BOS',
  fantasyPoints,
  ownerName: 'A',
  teamName: 'A FC',
});

describe('managerOfTheNight', () => {
  it('picks the highest total', () => {
    const best = managerOfTheNight([team('A', 120, 6), team('B', 150.5, 8), team('C', 90, 3)]);
    expect(best?.ownerName).toBe('B');
    expect(best?.perPlayer).toBe(18.8); // 150.5 / 8 = 18.8125
  });

  it('breaks a tie on points per player', () => {
    expect(managerOfTheNight([team('A', 100, 5), team('B', 100, 4)])?.ownerName).toBe('B');
  });

  it('returns null when nobody played', () => {
    expect(managerOfTheNight([team('A', 0, 0)])).toBeNull();
  });
});

describe('worstManagerOfTheNight', () => {
  it('picks the lowest points per player, not the lowest total', () => {
    // A: 60/2 = 30, B: 80/8 = 10, C: 120/6 = 20
    const worst = worstManagerOfTheNight([team('A', 60, 2), team('B', 80, 8), team('C', 120, 6)]);
    expect(worst?.ownerName).toBe('B');
    expect(worst?.perPlayer).toBe(10);
  });

  it('leaves out managers with nobody playing', () => {
    expect(worstManagerOfTheNight([team('A', 0, 0), team('B', 50, 2)])?.ownerName).toBe('B');
  });

  it('breaks a tie on lower total', () => {
    expect(worstManagerOfTheNight([team('A', 40, 4), team('B', 20, 2)])?.ownerName).toBe('B');
  });
});

describe('topPlayers', () => {
  it('returns the top 5, highest first, ties alphabetical', () => {
    const list = [
      player('Zed', 40), player('Amy', 40), player('C', 55), player('D', 10),
      player('E', 30), player('F', 20), player('G', 5),
    ];
    expect(topPlayers(list).map(p => p.playerName)).toEqual(['C', 'Amy', 'Zed', 'E', 'F']);
  });
});

describe('isGameNight', () => {
  it('is false when no starter played', () => {
    expect(isGameNight({ teams: [team('A', 0, 0), team('B', 0, 0)] })).toBe(false);
    expect(isGameNight({ teams: [team('A', 0, 0), team('B', 12, 1)] })).toBe(true);
  });
});
