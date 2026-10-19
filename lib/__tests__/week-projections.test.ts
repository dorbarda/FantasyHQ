import { describe, it, expect } from 'vitest';
import { allFit, playerAverage, projectTeam, watchNotes } from '../week-projections';
import type { ProTeamSchedule } from '../espn-schedule';

const SEASON = 2027;

function player(name: string, avg: number, proTeamId: number, slots: number[], lineupSlotId = 0, last30 = 0) {
  return {
    lineupSlotId,
    playerPoolEntry: {
      player: {
        fullName: name,
        proTeamId,
        eligibleSlots: slots,
        injuryStatus: 'ACTIVE',
        stats: [
          { id: `10${SEASON}`, appliedAverage: avg },
          { id: `03${SEASON}`, appliedAverage: last30 },
        ],
      },
    },
  };
}

/** NBA team 1 plays days 1 and 2, team 2 only day 1. */
const schedules: ProTeamSchedule[] = [
  { proTeamId: 1, abbrev: 'AAA', games: [1, 2].map(sp => ({ scoringPeriodId: sp, opponentId: 9, isHome: true, dateMs: null })) },
  { proTeamId: 2, abbrev: 'BBB', games: [{ scoringPeriodId: 1, opponentId: 9, isHome: true, dateMs: null }] },
];

const CENTER = [4, 11, 12]; // C, UTIL, bench

describe('playerAverage', () => {
  const p = player('X', 40, 1, CENTER, 0, 50).playerPoolEntry.player;
  it('uses the ESPN projection for weeks 1–4', () => {
    expect(playerAverage(p, SEASON, 4)).toBe(40);
  });
  it('uses the last 30 days from week 5', () => {
    expect(playerAverage(p, SEASON, 5)).toBe(50);
  });
  it('falls back to the projection with no recent games', () => {
    const q = player('Y', 40, 1, CENTER).playerPoolEntry.player;
    expect(playerAverage(q, SEASON, 9)).toBe(40);
  });
});

describe('allFit', () => {
  it('fits 4 centers (C + 3 UTIL) but not 5', () => {
    const c = new Set(CENTER);
    expect(allFit([c, c, c, c])).toBe(true);
    expect(allFit([c, c, c, c, c])).toBe(false);
  });
});

describe('projectTeam', () => {
  it('leaves out IR, drops the lowest averages past the lineup limit, picks key players by average', () => {
    const team = {
      id: 7,
      name: 'Test ',
      roster: {
        entries: [
          player('C1', 50, 1, CENTER),
          player('C2', 40, 1, CENTER),
          player('C3', 30, 2, CENTER),
          player('C4', 20, 2, CENTER),
          player('C5', 10, 2, CENTER), // day 1: 5th center → lost
          player('Hurt', 60, 1, CENTER, 13),
        ],
      },
    };
    const t = projectTeam(team, [1, 2], schedules, SEASON, 1);
    expect(t.teamName).toBe('Test');
    expect(t.games).toBe(6); // day 1: 4 of 5, day 2: C1 + C2
    expect(t.gamesLostToLineupLimit).toBe(1);
    expect(t.projectedPoints).toBe(50 * 2 + 40 * 2 + 30 + 20);
    expect(t.keyPlayers.map(p => p.name)).toEqual(['C1', 'C2', 'C3']);
    expect(t.roster.find(p => p.name === 'C5')!.games).toBe(0);
  });
});

describe('watchNotes', () => {
  const base = { teamId: 1, teamName: 'A', games: 30, gamesLostToLineupLimit: 0, projectedPoints: 0, keyPlayers: [], injuries: [], roster: [] };
  const star = (name: string, games: number) => ({ name, pos: 'C', nba: 'DEN', status: 'ACTIVE', onIR: false, avg: 60, games, projected: 0 });

  it('orders games gap, short-week star, injuries, lineup limit — max 3', () => {
    const a = { ...base, teamName: 'A', games: 37, gamesLostToLineupLimit: 1, keyPlayers: [star('Jokic', 2)] };
    const b = { ...base, teamName: 'B', games: 33, injuries: [{ name: 'Curry', status: 'DAY_TO_DAY', onIR: false }, { name: 'Out Guy', status: 'OUT', onIR: true }] };
    expect(watchNotes(a, b)).toEqual([
      'A has 4 more games (37 vs 33).',
      "Jokic, A's top player, plays only 2 games.",
      'B: Curry (day-to-day).',
    ]);
  });

  it('says nothing about a 1-game gap', () => {
    expect(watchNotes({ ...base, games: 31 }, { ...base, games: 30 })).toEqual([]);
  });
});
