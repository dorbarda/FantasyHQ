import { describe, it, expect } from 'vitest';
import { buildFantasyPeriods, buildTradeInput, gamesOn } from '../trade-input';
import type { ProTeamSchedule } from '../espn-schedule';

// ── Fixtures ─────────────────────────────────────────────────────────────────

// Day 1 = Mon 2026-10-19 (anchor). Noon UTC is still the same day in the US.
const dayMs = (sp: number) => Date.UTC(2026, 9, 18 + sp, 20);

/** One NBA team playing on the given scoring periods. */
function team(proTeamId: number, days: number[]): ProTeamSchedule {
  return {
    proTeamId,
    abbrev: `T${proTeamId}`,
    games: days.map(sp => ({ scoringPeriodId: sp, opponentId: 99, isHome: true, dateMs: dayMs(sp) })),
  };
}

// Four calendar weeks (days 1–28). Team 2 plays every day so every date is known.
const schedules = [team(1, [1, 3, 8, 15, 16, 22, 23, 24]), team(2, Array.from({ length: 28 }, (_, i) => i + 1))];

// Weeks 1–2 regular season, then a two-week first playoff round (3+4).
const matchupPeriods = { '1': [1], '2': [2], '3': [3, 4] };

function player(id: number, proTeamId: number, season: number | null, projected: number, extra: object = {}) {
  const stats: object[] = [{ id: '102027', appliedAverage: projected, stats: {} }];
  if (season !== null) stats.push({ id: '002027', appliedAverage: season, stats: { '42': 3 } });
  return {
    lineupSlotId: 0,
    playerPoolEntry: {
      player: { id, fullName: `Player ${id}`, proTeamId, eligibleSlots: [0, 5, 11], injuryStatus: 'ACTIVE', stats, ...extra },
    },
  };
}

const league = {
  settings: {
    name: 'Test League',
    scheduleSettings: { matchupPeriodCount: 2, playoffTeamCount: 2, playoffSeedingRule: 'TOTAL_POINTS_SCORED', matchupPeriods },
    tradeSettings: { deadlineDate: Date.UTC(2027, 2, 8, 10), vetoVotesRequired: 4, revisionHours: 24 },
    rosterSettings: { lineupSlotCounts: { '0': 1, '11': 3, '12': 3, '7': 0 } },
  },
  members: [
    { id: 'a', firstName: 'Ann', lastName: 'A' },
    { id: 'b', firstName: 'Bob', lastName: 'B' },
  ],
  teams: [
    {
      id: 1, name: 'Team A ', primaryOwner: 'a', playoffSeed: 2, divisionId: 0,
      record: { overall: { wins: 1, losses: 0, ties: 0, pointsFor: 500.04, pointsAgainst: 400 } },
      transactionCounter: { acquisitions: 3, drops: 2, trades: 0 },
      roster: { entries: [player(10, 1, 40, 45), { ...player(11, 2, null, 30, { injuryStatus: 'OUT' }), lineupSlotId: 13 }] },
    },
    {
      id: 2, name: 'Team B', primaryOwner: 'b', playoffSeed: 1, divisionId: 0,
      record: { overall: { wins: 0, losses: 1, ties: 0, pointsFor: 400, pointsAgainst: 500 } },
      transactionCounter: { acquisitions: 0, drops: 0, trades: 0 },
      roster: { entries: [{ ...player(20, 2, 50, 35), lineupSlotId: 12 }] },
    },
  ],
  schedule: [
    { matchupPeriodId: 1, home: { teamId: 1 }, away: { teamId: 2 } },
    { matchupPeriodId: 2, home: { teamId: 2 }, away: { teamId: 1 } },
  ],
};

const build = (today: number, week?: number) =>
  buildTradeInput(league, schedules, { season: 2027, today, week, generatedAt: 'now' });

// ── Tests ────────────────────────────────────────────────────────────────────

describe('buildFantasyPeriods', () => {
  it('joins the calendar weeks of a two-week playoff round', () => {
    const periods = buildFantasyPeriods(schedules, matchupPeriods);
    expect(periods.map(p => p.days.length)).toEqual([7, 7, 14]);
    expect(periods[2]).toMatchObject({ matchupPeriod: 3, start: '2026-11-02', end: '2026-11-15' });
  });
});

describe('gamesOn', () => {
  it('counts each NBA team’s games on the given days', () => {
    const counts = gamesOn(schedules, [1, 2, 3]);
    expect(counts.get(1)).toBe(2);
    expect(counts.get(2)).toBe(3);
  });
});

describe('buildTradeInput', () => {
  it('counts games this week from today, rest of season and per playoff round', () => {
    const input = build(3);
    expect(input.week).toBe(1);
    const p = input.teams.find(t => t.owner === 'Ann A')!.roster.find(r => r.playerId === 10)!;
    // Team 1: days 3 (this week, from day 3), 8 (week 2), playoffs 15,16,22,23,24.
    expect(p.games).toEqual({ thisWeek: 1, restOfRegularSeason: 2, playoffs: 5, playoffsByRound: [5] });
  });

  it('counts the whole target week when it starts after today', () => {
    const p = build(3, 2).teams.find(t => t.owner === 'Ann A')!.roster.find(r => r.playerId === 10)!;
    expect(p.games.thisWeek).toBe(1);
    expect(p.games.restOfRegularSeason).toBe(1);
  });

  it('defaults to the week containing today', () => {
    expect(build(9).week).toBe(2);
  });

  it('marks the two-week round as one playoff period', () => {
    const { league: l } = build(1);
    expect(l.periods.map(p => p.kind)).toEqual(['regular', 'regular', 'playoff']);
    expect(l.tradeDeadline).toBe('2027-03-08T10:00:00.000Z');
    expect(l.lineupSlots).toEqual({ PG: 1, UTIL: 3, BE: 3 });
  });

  it('reads roster slot, injury, and leaves a no-games average empty', () => {
    const ann = build(1).teams.find(t => t.owner === 'Ann A')!;
    const injured = ann.roster.find(r => r.playerId === 11)!;
    expect(injured).toMatchObject({ slot: 'IR', injuryStatus: 'OUT', leagueRank: null, positions: ['PG'] });
    expect(injured.avg.season).toBeNull();
    expect(ann.pointsFor).toBe(500);
    expect(ann.teamName).toBe('Team A');
  });

  it('ranks players across the league and sorts teams by seed', () => {
    const input = build(1);
    expect(input.teams.map(t => t.owner)).toEqual(['Bob B', 'Ann A']);
    const all = input.teams.flatMap(t => t.roster);
    expect(all.find(p => p.playerId === 20)!.leagueRank).toBe(1);
    expect(all.find(p => p.playerId === 10)!.projectedRank).toBe(1);
  });

  it('lists only regular-season opponents from the target week on', () => {
    const ann = build(1, 2).teams.find(t => t.owner === 'Ann A')!;
    expect(ann.upcomingOpponents).toEqual([{ week: 2, owner: 'Bob B' }]);
  });
});
