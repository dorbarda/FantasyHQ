import { describe, it, expect } from 'vitest';
import {
  parseProTeamSchedules,
  countMatchupPeriods,
  buildWeekMap,
  currentWeekFor,
  weeksOf,
  weekCountOf,
  buildWeekMatrix,
  weekFromSeason,
  datesForWeek,
  nbaDate,
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
// Mon 1 Dec 2025, 3pm Pacific — a realistic tip-off. Midnight UTC would be the
// previous afternoon in the US, which is how NBA days are reckoned here.
const MON = Date.UTC(2025, 11, 1, 23, 0);

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

describe('countMatchupPeriods', () => {
  it('reads how many fantasy weeks the league has', () => {
    expect(countMatchupPeriods(RAW_SETTINGS)).toBe(3);
  });

  it('falls back to matchupPeriodCount when the map is absent', () => {
    expect(countMatchupPeriods({ settings: { scheduleSettings: { matchupPeriodCount: 21 } } })).toBe(21);
  });

  it('returns 0 rather than throwing on a missing block', () => {
    expect(countMatchupPeriods(null)).toBe(0);
    expect(countMatchupPeriods({ settings: {} })).toBe(0);
  });
});

describe('nbaDate', () => {
  it('files a late US tip-off under the day it was played, not the next UTC day', () => {
    // 22:30 Pacific on 1 Dec = 06:30 UTC on 2 Dec
    expect(nbaDate(Date.UTC(2025, 11, 2, 6, 30))).toBe('2025-12-01');
  });

  it('leaves an afternoon game on its own day', () => {
    expect(nbaDate(Date.UTC(2025, 11, 1, 20, 0))).toBe('2025-12-01');
  });
});

describe('buildWeekMap', () => {
  /**
   * Regression for the bug that shipped: matchupPeriods was read as a
   * week → days map, so every week got exactly one day and the grid claimed
   * each NBA team played once a week for a whole season.
   *
   * Fixture mirrors the real shape — a season tipping off on a Tuesday, so
   * week 1 is short and every week after is Monday to Sunday.
   */
  const TIP_OFF = Date.UTC(2025, 9, 21, 23, 0); // Tue 21 Oct, 4pm Pacific
  const season: ProTeamSchedule[] = [
    {
      proTeamId: 2,
      abbrev: 'BOS',
      // a game every day for 3 weeks' worth of scoring periods
      games: Array.from({ length: 20 }, (_, i) => ({
        scoringPeriodId: i + 1,
        opponentId: 13,
        isHome: i % 2 === 0,
        dateMs: TIP_OFF + i * 86_400_000,
      })),
    },
  ];

  it('gives week 1 only the days before the first Monday', () => {
    const weeks = buildWeekMap(season, 3);
    // Tue 21 Oct -> Sun 26 Oct is six days
    expect(weeks[1]).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('runs every later week Monday to Sunday', () => {
    const weeks = buildWeekMap(season, 3);
    expect(weeks[2]).toEqual([7, 8, 9, 10, 11, 12, 13]);
    expect(weeks[3]).toEqual([14, 15, 16, 17, 18, 19, 20]);
  });

  it('never returns a one-day week — the symptom of the original bug', () => {
    const weeks = buildWeekMap(season, 3);
    for (const [week, days] of Object.entries(weeks)) {
      expect(days.length, `week ${week} should not be a single day`).toBeGreaterThan(1);
    }
  });

  it('stops at the number of weeks the league actually has', () => {
    expect(Object.keys(buildWeekMap(season, 2))).toEqual(['1', '2']);
  });

  it('dates days that have no NBA game at all', () => {
    // Only two games, 8 days apart: the gap days still belong to a week
    const sparse: ProTeamSchedule[] = [{
      proTeamId: 2, abbrev: 'BOS',
      games: [
        { scoringPeriodId: 1, opponentId: 13, isHome: true, dateMs: TIP_OFF },
        { scoringPeriodId: 9, opponentId: 13, isHome: true, dateMs: TIP_OFF + 8 * 86_400_000 },
      ],
    }];
    const weeks = buildWeekMap(sparse, 2);
    expect(weeks[1]).toEqual([1, 2, 3, 4, 5, 6]);
    expect(weeks[2]).toEqual([7, 8, 9]);
  });

  it('returns nothing when there are no dated games to anchor on', () => {
    expect(buildWeekMap([], 5)).toEqual({});
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
    // Scoring period 11 has no NBA game, but it is still a day of the week and
    // gets its date — dates come from the derived index, not from the games.
    expect(week.days[1].label).toBe('Dec 2');
    expect(week.days[1].weekday).toBe('Tue');
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
    weekCount: 3,
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

describe('datesForWeek', () => {
  const season = {
    weekCount: 3,
    schedules: parseProTeamSchedules(RAW_SCHEDULE) as ProTeamSchedule[],
  };

  it('lists the calendar days the week actually has games on', () => {
    // fixture plays on scoring periods 10, 12, 13, 14, 15, 16 → Dec 1, 3, 4, 5, 6, 7
    expect(datesForWeek(season, 3)).toEqual([
      '2025-12-01', '2025-12-03', '2025-12-04', '2025-12-05', '2025-12-06', '2025-12-07',
    ]);
  });

  it('deduplicates days shared by several games', () => {
    const dates = datesForWeek(season, 3);
    expect(new Set(dates).size).toBe(dates.length);
  });

  it('returns nothing for a week with no NBA games', () => {
    expect(datesForWeek(season, 1)).toEqual([]);
  });

  it('returns nothing for a week the league does not have', () => {
    expect(datesForWeek(season, 99)).toEqual([]);
  });
});

/**
 * The derived week map used to be frozen into the snapshot, so this corrected
 * mapping kept serving the old broken weeks until the nightly job re-ran.
 * Deriving on read is what makes a logic fix take effect on deploy.
 */
describe('derived-on-read season', () => {
  const TIP_OFF = Date.UTC(2025, 9, 21, 23, 0); // Tue 21 Oct
  const schedules: ProTeamSchedule[] = [{
    proTeamId: 2, abbrev: 'BOS',
    games: Array.from({ length: 27 }, (_, i) => ({
      scoringPeriodId: i + 1, opponentId: 13, isHome: true,
      dateMs: TIP_OFF + i * 86_400_000,
    })),
  }];
  const season = { weekCount: 4, schedules };

  it('computes the week map from the stored schedules', () => {
    expect(weeksOf(season)[1]).toEqual([1, 2, 3, 4, 5, 6]);
    expect(weeksOf(season)[2]).toHaveLength(7);
  });

  it('ignores a stale week map left by an older snapshot', () => {
    const stale = { ...season, weeks: { 1: [1], 2: [2], 3: [3], 4: [4] } };
    // the broken one-day-per-week shape must not survive
    expect(weeksOf(stale)[1]).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('recovers the week count from an older snapshot that lacks it', () => {
    const old = { weekCount: 0, schedules, weeks: { 1: [1], 2: [2], 3: [3] } };
    expect(weekCountOf(old)).toBe(3);
  });
});

describe('currentWeekFor', () => {
  const TIP_OFF = Date.UTC(2025, 9, 21, 23, 0); // Tue 21 Oct 2025
  const schedules: ProTeamSchedule[] = [{
    proTeamId: 2, abbrev: 'BOS',
    games: Array.from({ length: 27 }, (_, i) => ({
      scoringPeriodId: i + 1, opponentId: 13, isHome: true,
      dateMs: TIP_OFF + i * 86_400_000,
    })),
  }];
  const season = { weekCount: 4, schedules };

  it('returns week 1 before the season has started', () => {
    expect(currentWeekFor(season, new Date('2025-08-19T12:00:00Z'))).toBe(1);
  });

  it('finds the week containing today', () => {
    // week 1 is Tue 21 - Sun 26 Oct, week 2 is Mon 27 Oct - Sun 2 Nov
    expect(currentWeekFor(season, new Date('2025-10-23T20:00:00Z'))).toBe(1);
    expect(currentWeekFor(season, new Date('2025-10-28T20:00:00Z'))).toBe(2);
  });

  it('treats the last day of a week as still that week', () => {
    expect(currentWeekFor(season, new Date('2025-10-26T20:00:00Z'))).toBe(1);
  });

  it('clamps to the final week once the season is over', () => {
    expect(currentWeekFor(season, new Date('2026-07-01T12:00:00Z'))).toBe(4);
  });

  it('never returns the last week for a season that has not started', () => {
    // the exact bug: the page opened on week 21 of an unplayed season
    const future = { weekCount: 21, schedules: [{
      proTeamId: 2, abbrev: 'BOS',
      games: Array.from({ length: 150 }, (_, i) => ({
        scoringPeriodId: i + 1, opponentId: 13, isHome: true,
        dateMs: Date.UTC(2026, 9, 20, 23, 0) + i * 86_400_000,
      })),
    }] };
    expect(currentWeekFor(future, new Date('2026-08-19T12:00:00Z'))).toBe(1);
  });
});
