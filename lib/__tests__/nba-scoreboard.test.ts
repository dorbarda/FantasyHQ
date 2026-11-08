import { describe, expect, it } from 'vitest';
import { gameTopScorer, israelDay, israelTime, nextDate, parseScoreboard } from '../nba-scoreboard';

const team = (homeAway: string, id: string, abbr: string, score: string, winner: boolean, scorer: [string, number]) => ({
  homeAway, winner, score,
  team: { id, abbreviation: abbr },
  records: [{ summary: '3-7' }],
  leaders: [{ name: 'points', leaders: [{ value: scorer[1], displayValue: String(scorer[1]), athlete: { shortName: scorer[0] } }] }],
});

const raw = {
  events: [
    {
      id: '2', date: '2026-11-08T01:00Z',
      status: { type: { state: 'post', shortDetail: 'Final/OT' } },
      competitions: [{ notes: [], competitors: [team('home', '5', 'CLE', '97', false, ['D. Mitchell', 30]), team('away', '18', 'NY', '109', true, ['J. Brunson', 34])] }],
    },
    {
      id: '1', date: '2026-11-07T22:00Z',
      status: { type: { state: 'post', shortDetail: 'Final' } },
      competitions: [{ notes: [{ headline: 'NBA Mexico City Game' }], competitors: [team('home', '11', 'IND', '102', false, ['P. Siakam', 23]), team('away', '7', 'DEN', '114', true, ['N. Jokic', 31])] }],
    },
    { id: 'bad', date: '', status: {}, competitions: [{ competitors: [] }] },
  ],
};

describe('parseScoreboard', () => {
  const games = parseScoreboard(raw);

  it('drops broken games and sorts by tip-off', () => {
    expect(games.map(g => g.id)).toEqual(['1', '2']);
  });

  it('reads teams, scores, winner and note', () => {
    const g = games[0];
    expect(g.home).toMatchObject({ id: 11, abbrev: 'IND', score: 102, winner: false, record: '3-7' });
    expect(g.away).toMatchObject({ id: 7, abbrev: 'DEN', score: 114, winner: true });
    expect(g.note).toBe('NBA Mexico City Game');
    expect(games[1].detail).toBe('Final/OT');
  });

  it('picks the top scorer of the game', () => {
    expect(gameTopScorer(games[0])).toEqual({ name: 'N. Jokic', points: 31, abbrev: 'DEN' });
    expect(gameTopScorer(games[1])).toEqual({ name: 'J. Brunson', points: 34, abbrev: 'NY' });
  });

  it('handles an empty response', () => {
    expect(parseScoreboard({})).toEqual([]);
  });
});

describe('Israel time', () => {
  it('winter (UTC+2)', () => {
    expect(israelTime('2026-11-08T20:30Z')).toBe('22:30');
    expect(israelDay('2026-11-08T22:30Z')).toBe('Mon');
  });
  it('summer (UTC+3)', () => {
    expect(israelTime('2026-04-10T23:00Z')).toBe('02:00');
  });
});

describe('nextDate', () => {
  it('rolls over months', () => {
    expect(nextDate('2026-11-30')).toBe('2026-12-01');
  });
});
