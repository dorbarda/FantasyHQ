import { describe, it, expect } from 'vitest';
import {
  parseProTeamSchedules,
  parseMatchupPeriods,
  buildWeekMatrix,
  weekFromSeason,
  type ProTeamSchedule,
} from '../espn-schedule';

/**
 * A miniature proTeamSchedules_wl response in the shape ESPN documents:
 * settings.proTeams[] with proGamesByScoringPeriod keyed by scoring period.
 *
 * Scoring periods 10-16 stand in for one fantasy week (Mon-Sun).
 * BOS(2) plays 4 games including a back-to-back on 12/13.
 * LAL(13) plays 2 games, no back-to-back.
 * GSW(9)  plays 3 games with two back-to-backs in a row (14/15/16).
 */
const DAY = 86_400_000;
const MON = Date.UTC(2025, 11, 1); // Mon Dec 1 2025 → scoring period 10

function gameDate(offsetDays: number) {
  return MON + offsetDays * DAY;
}

const RAW_SCHEDULE = {
  settings: {
    proTeams: [
      { id: 0, abbrev: 'FA' }, // free-agent pseudo-team ESPN includes
      {
        id: 2,
        abbrev: 'BOS',
        proGamesByScoringPeriod: {
          '10': [{ homeProTeamId: 2, awayProTeamId: 13, date: gameDate(0) }],
          '12': [{ homeProTeamId: 9, awayProTeamId: 2, date: gameDate(2) }],
          '13': [{ homeProTeamId: 2, awayProTeamId: 9, date: gameDate(3) }],
          '16': [{ homeProTeamId: 13, awayProTeamId: 2, date: gameDate(6) }],
        },
      },
      {
        id: 13,
        abbrev: 'LAL',
        proGamesByScoringPeriod: {
          '10': [{ homeProTeamId: 2, awayProTeamId: 13, date: gameDate(0) }],
          '16': [{ homeProTeamId: 13, awayProTeamId: 2, date: gameDate(6) }],
        },
      },
      {
        id: 9,
        abbrev: 'GSW',
        proGamesByScoringPeriod: {
          '12': [{ homeProTeamId: 9, awayProTeamId: 2, date: gameDate(2) }],
          '14': [{ homeProTeamId: 9, awayProTeamId: 13, date: gameDate(4) }],
          '15': [{ homeProTeamId: 13, awayProTeamId: 9, date: gameDate(5) }],
        },
      },
    ],
  },
};

const RAW_SETTINGS = {
  status: { currentMatchupPeriod: 3 },
  settings: {
    scheduleSettings: {
      matchupPeriods: {
        '1': [1, 2, 3],
        '2': [4, 5, 6, 7, 8, 9],
        '3': [10, 11, 12, 13, 14, 15, 16],
      },
    },
  },
};

const WEEK_3 = [10, 11, 12, 13, 14, 15, 16];
const META = { week: 3, currentWeek: 3, maxWeek: 3 };

describe('parseProTeamSchedules', () => {
  it('flattens each team\'s games and drops the free-agent pseudo-team', () => {
    const schedules = parseProTeamSchedules(RAW_SCHEDULE);
    expect(schedules.map(s => s.abbrev).sort()).toEqual(['BOS', 'GSW', 'LAL']);
  });

  it('resolves opponent and home/away from the two team ids', () => {
    const bos = parseProTeamSchedules(RAW_SCHEDULE).find(s => s.abbrev === 'BOS')!;
    const opener = bos.games.find(g => g.scoringPeriodId === 10)!;
    expect(opener.opponentId).toBe(13);
    expect(opener.isHome).toBe(true);

    const away = bos.games.find(g => g.scoringPeriodId === 12)!;
    expect(away.opponentId).toBe(9);
    expect(away.isHome).toBe(false);
  });

  it('returns games sorted by day', () => {
    const bos = parseProTeamSchedules(RAW_SCHEDULE).find(s => s.abbrev === 'BOS')!;
    expect(bos.games.map(g => g.scoringPeriodId)).toEqual([10, 12, 13, 16]);
  });

  it('survives a shape surprise instead of throwing', () => {
    expect(parseProTeamSchedules(null)).toEqual([]);
    expect(parseProTeamSchedules({})).toEqual([]);
    expect(parseProTeamSchedules({ settings: { proTeams: 'nope' } })).toEqual([]);
    // a team with no schedule block still appears, just with no games
    const noGames = parseProTeamSchedules({ settings: { proTeams: [{ id: 2, abbrev: 'BOS' }] } });
    expect(noGames).toEqual([{ proTeamId: 2, abbrev: 'BOS', games: [] }]);
  });

  it('falls back to the built-in abbreviation map when ESPN omits abbrev', () => {
    const parsed = parseProTeamSchedules({ settings: { proTeams: [{ id: 25 }] } });
    expect(parsed[0].abbrev).toBe('OKC');
  });
});

describe('parseMatchupPeriods', () => {
  it('maps each fantasy week to its scoring periods', () => {
    expect(parseMatchupPeriods(RAW_SETTINGS)).toEqual({
      1: [1, 2, 3],
      2: [4, 5, 6, 7, 8, 9],
      3: WEEK_3,
    });
  });

  it('returns an empty map rather than throwing on a missing block', () => {
    expect(parseMatchupPeriods(null)).toEqual({});
    expect(parseMatchupPeriods({ settings: {} })).toEqual({});
  });
});

describe('buildWeekMatrix', () => {
  const schedules = parseProTeamSchedules(RAW_SCHEDULE);
  const week = buildWeekMatrix(schedules, WEEK_3, META);

  it('counts games per team for the week', () => {
    const byTeam = Object.fromEntries(week.rows.map(r => [r.abbrev, r.gameCount]));
    expect(byTeam).toEqual({ BOS: 4, GSW: 3, LAL: 2 });
  });

  it('sorts the heaviest schedule first', () => {
    expect(week.rows.map(r => r.abbrev)).toEqual(['BOS', 'GSW', 'LAL']);
  });

  it('aligns cells to the day columns, leaving rest days null', () => {
    const bos = week.rows.find(r => r.abbrev === 'BOS')!;
    // days are [10, 11, 12, 13, 14, 15, 16]
    expect(bos.cells.map(c => c?.opponent ?? null)).toEqual([
      'LAL', null, 'GSW', 'GSW', null, null, 'LAL',
    ]);
    expect(bos.cells[0]!.isHome).toBe(true);
    expect(bos.cells[2]!.isHome).toBe(false);
  });

  it('counts a back-to-back and flags its second game only', () => {
    const bos = week.rows.find(r => r.abbrev === 'BOS')!;
    expect(bos.backToBacks).toBe(1);
    expect(bos.cells[2]!.isBackToBack).toBe(false); // day 12, first of the pair
    expect(bos.cells[3]!.isBackToBack).toBe(true);  // day 13, second of the pair
  });

  it('counts three straight days as two back-to-backs', () => {
    const gsw = week.rows.find(r => r.abbrev === 'GSW')!;
    // plays 12, 14, 15 → only 14/15 are consecutive
    expect(gsw.backToBacks).toBe(1);
  });

  it('does not flag a rest day between games as a back-to-back', () => {
    const lal = week.rows.find(r => r.abbrev === 'LAL')!;
    expect(lal.backToBacks).toBe(0);
  });

  it('labels day columns from the games actually scheduled', () => {
    expect(week.days[0].label).toBe('Dec 1');
    expect(week.days[0].weekday).toBe('Mon');
    // scoring period 11 has no games in this fixture
    expect(week.days[1].label).toBe('');
  });

  it('reports the busiest and quietest schedules for the legend', () => {
    expect(week.maxGames).toBe(4);
    expect(week.minGames).toBe(2);
  });

  it('handles a week where nobody plays', () => {
    const empty = buildWeekMatrix(schedules, [99, 100], META);
    expect(empty.maxGames).toBe(0);
    expect(empty.rows.every(r => r.gameCount === 0)).toBe(true);
  });
});

describe('weekFromSeason', () => {
  const season = {
    currentWeek: 3,
    maxWeek: 3,
    weeks: parseMatchupPeriods(RAW_SETTINGS),
    schedules: parseProTeamSchedules(RAW_SCHEDULE) as ProTeamSchedule[],
  };

  it('slices a week out of the loaded season', () => {
    const week = weekFromSeason(season, 3)!;
    expect(week.week).toBe(3);
    expect(week.days).toHaveLength(7);
    expect(week.rows.find(r => r.abbrev === 'BOS')!.gameCount).toBe(4);
  });

  it('returns a week with no games for a week outside the NBA fixture', () => {
    const week = weekFromSeason(season, 1)!;
    expect(week.rows.every(r => r.gameCount === 0)).toBe(true);
  });

  it('returns null for a week the league does not have', () => {
    expect(weekFromSeason(season, 99)).toBeNull();
  });
});
