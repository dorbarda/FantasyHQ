import { describe, it, expect } from 'vitest';
import { computeWeeklyRecap, listRecapWeeks, latestRecapWeek, BENCH_MIN_POINTS } from '../recap';
import type { MatchupDepthRow, HistoryMatchup } from '../types';
import { canonicalOwner } from '../owners';
import week18 from './fixtures/week18-2026.json';

// ── Fixtures ─────────────────────────────────────────────────────────────────

/**
 * Depth rows arrive one per team per week, so tests build both sides of a
 * matchup. `row` fills in the derived fields the way the ESPN loader does.
 */
function row(over: Partial<MatchupDepthRow> & {
  ownerName: string;
  teamScore: number;
  opponentName: string;
  opponentScore: number;
}): MatchupDepthRow {
  const totalPlayers = over.totalPlayers ?? 40;
  return {
    matchupPeriod: 1,
    teamId: `team-${over.ownerName}`,
    teamName: `${over.ownerName} FC`,
    dailyPlayers: [],
    totalPlayers,
    won: over.teamScore > over.opponentScore,
    scorePP: over.teamScore / totalPlayers,
    efficiency: Math.round((over.teamScore / totalPlayers / totalPlayers) * 1000) / 1000,
    ...over,
  };
}

/** Both sides of one matchup. */
function pair(
  a: string, aScore: number, b: string, bScore: number,
  over: Partial<MatchupDepthRow> = {},
): MatchupDepthRow[] {
  return [
    row({ ownerName: a, teamScore: aScore, opponentName: b, opponentScore: bScore, ...over }),
    row({ ownerName: b, teamScore: bScore, opponentName: a, opponentScore: aScore, ...over }),
  ];
}

function winnersOf(recap: ReturnType<typeof computeWeeklyRecap>, id: string) {
  return recap!.awards.find(a => a.id === id)?.winners ?? [];
}

// A four-matchup week with a clear story:
//   Ann  140 beats Ben   90   → 50-point blowout
//   Cal  101 beats Dan  100   → 1-point nailbiter
//   Eve  130 loses to Fay 135 → Eve outscored 6 of 8, still lost
//   Gil   70 beats Hal   65   → Gil won with the lowest winning score
const WEEK = [
  ...pair('Ann', 140, 'Ben', 90),
  ...pair('Cal', 101, 'Dan', 100),
  ...pair('Fay', 135, 'Eve', 130),
  ...pair('Gil', 70, 'Hal', 65),
];

// ── Luck awards ──────────────────────────────────────────────────────────────

describe('לאילי אין מזל (unluckiest loss)', () => {
  it('picks the loser whose score beat the most other teams', () => {
    // Eve's 130 beats Ben 90, Cal 101, Dan 100, Gil 70, Hal 65 — five teams.
    const w = winnersOf(computeWeeklyRecap(WEEK, 1), 'noLuck');
    expect(w).toHaveLength(1);
    expect(w[0].ownerName).toBe('Eve');
    expect(w[0].value).toBe(5);
    expect(w[0].teamScore).toBe(130);
  });

  it('never goes to a winner', () => {
    const w = winnersOf(computeWeeklyRecap(WEEK, 1), 'noLuck');
    expect(w[0].ownerName).not.toBe('Ann');
  });

  it('breaks a tie on beaten-count by the higher score', () => {
    // Both losers outscore exactly one other team; Eve scored more.
    const rows = [
      ...pair('Ann', 150, 'Eve', 120),
      ...pair('Cal', 149, 'Dan', 119),
      ...pair('Gil', 100, 'Hal', 90),
    ];
    const w = winnersOf(computeWeeklyRecap(rows, 1), 'noLuck');
    expect(w).toHaveLength(1);
    expect(w[0].ownerName).toBe('Eve');
  });
});

describe('פרס הסלוצקי (luckiest win)', () => {
  it('picks the winner whose score would have lost to the most teams', () => {
    // Gil's 70 is below Ann 140, Ben 90, Cal 101, Dan 100, Fay 135, Eve 130 — six.
    const w = winnersOf(computeWeeklyRecap(WEEK, 1), 'slotzki');
    expect(w).toHaveLength(1);
    expect(w[0].ownerName).toBe('Gil');
    expect(w[0].value).toBe(6);
  });

  it('never goes to a loser', () => {
    const w = winnersOf(computeWeeklyRecap(WEEK, 1), 'slotzki');
    expect(w[0].ownerName).not.toBe('Eve');
  });
});

// ── Effort awards ────────────────────────────────────────────────────────────

// ── Edge cases ───────────────────────────────────────────────────────────────

describe('edge cases', () => {
  it('returns null for a week still in progress', () => {
    const rows = pair('Ann', 100, 'Ben', 90).map(r => ({ ...r, won: null }));
    expect(computeWeeklyRecap(rows, 1)).toBeNull();
  });

  it('returns null for a week with no rows', () => {
    expect(computeWeeklyRecap(WEEK, 99)).toBeNull();
  });

  it('excludes ghost teams from every award', () => {
    const rows = [
      ...pair('Ann', 100, 'Ben', 90),
      ...pair('Fake Team', 400, 'Cal', 80),
    ];
    const recap = computeWeeklyRecap(rows, 1)!;
    const everyone = recap.awards.flatMap(a => a.winners.map(w => w.ownerName));
    expect(everyone).not.toContain('Fake Team');
  });

  it('keeps a bye out of the luck awards and the matchup list', () => {
    const rows = [
      ...pair('Ann', 100, 'Ben', 90),
      row({ ownerName: 'Solo', teamScore: 50, opponentName: '', opponentScore: 0 }),
    ];
    const recap = computeWeeklyRecap(rows, 1)!;
    const everyone = recap.awards.flatMap(a => a.winners.map(w => w.ownerName));
    expect(everyone).not.toContain('Solo');
    expect(recap.matchups.map(m => m.home.ownerName)).not.toContain('Solo');
  });

  it('week 1 behaves like any other week', () => {
    expect(computeWeeklyRecap(WEEK, 1)).not.toBeNull();
  });
});

// ── Matchup list ─────────────────────────────────────────────────────────────

describe('matchup list', () => {
  it('lists each matchup once, winner first, ordered by margin', () => {
    const recap = computeWeeklyRecap(WEEK, 1)!;
    expect(recap.matchups).toHaveLength(4);
    expect(recap.matchups[0].home.ownerName).toBe('Ann');   // 50-point margin
    expect(recap.matchups[0].margin).toBe(50);
    expect(recap.matchups.at(-1)!.margin).toBe(1);          // the nailbiter
    for (const m of recap.matchups) {
      expect(m.home.score).toBeGreaterThanOrEqual(m.away.score);
    }
  });

  it('marks an exact tie as having no winner', () => {
    const recap = computeWeeklyRecap(pair('Ann', 100, 'Ben', 100), 1)!;
    expect(recap.matchups[0].winner).toBeNull();
  });
});

// ── Week listing ─────────────────────────────────────────────────────────────

describe('listRecapWeeks / latestRecapWeek', () => {
  const rows = [
    ...pair('Ann', 100, 'Ben', 90).map(r => ({ ...r, matchupPeriod: 1 })),
    ...pair('Ann', 110, 'Cal', 95).map(r => ({ ...r, matchupPeriod: 2 })),
    // Week 3 is still being played.
    ...pair('Ann', 50, 'Dan', 40).map(r => ({ ...r, matchupPeriod: 3, won: null })),
  ];

  it('lists only completed weeks, newest first', () => {
    expect(listRecapWeeks(rows)).toEqual([2, 1]);
  });

  it('latest week skips the one in progress', () => {
    expect(latestRecapWeek(rows)).toBe(2);
  });

  it('returns null when nothing is complete', () => {
    const inProgress = pair('Ann', 50, 'Ben', 40).map(r => ({ ...r, won: null }));
    expect(latestRecapWeek(inProgress)).toBeNull();
    expect(listRecapWeeks(inProgress)).toEqual([]);
  });
});

// ── Golden regression on a real week ─────────────────────────────────────────
//
// Week 18 of 2025-26, frozen in fixtures/ rather than read from
// data/snapshots/ — that file is regenerated nightly and replaced wholesale
// each season, so pointing a golden test at it would fail for reasons that
// have nothing to do with this code. These are the real results the league
// lived through; if a scoring change moves them, that is a decision to make
// deliberately, not a diff to wave through.

describe('week 18 of 2025-26 (golden)', () => {
  const rows = week18.rows as MatchupDepthRow[];
  const recap = computeWeeklyRecap(rows, 18)!;

  it('reads the week correctly', () => {
    expect(recap.teamCount).toBe(10);
    expect(recap.matchups).toHaveLength(5);
  });

  it('לאילי אין מזל — Yotam Goldin lost with a score that beat 7 of the field', () => {
    const [w] = winnersOf(recap, 'noLuck');
    expect(w.ownerName).toBe('Yotam Goldin');
    expect(w.value).toBe(7);
    expect(w.teamScore).toBe(1422);
  });

  it('פרס הסלוצקי — Ilay Mendel won with a score 7 others would have beaten', () => {
    const [w] = winnersOf(recap, 'slotzki');
    expect(w.ownerName).toBe('Ilay Mendel');
    expect(w.value).toBe(7);
  });

});

// ── Season highlights ────────────────────────────────────────────────────────

/** A past regular-season game. */
function past(year: number, week: number, a: string, aScore: number, b: string, bScore: number, isPlayoff = false): HistoryMatchup {
  return {
    year, seasonLabel: `${year - 1}-${String(year).slice(2)}`, week, isPlayoff,
    home: { ownerName: a, score: aScore }, away: { ownerName: b, score: bScore },
    winner: aScore >= bScore ? 'home' : 'away',
  };
}
const ids = (r: ReturnType<typeof computeWeeklyRecap>) => r!.highlights.map(h => h.id);
const wk = (w: number, rows: MatchupDepthRow[]) => rows.map(r => ({ ...r, matchupPeriod: w }));

describe('season highlights', () => {
  it('flags an all-time record and names the old one', () => {
    const pastSeasons = [past(2025, 3, 'Ann', 130, 'Ben', 100)];
    const r = computeWeeklyRecap(WEEK, 1, { pastSeasons });
    const h = r!.highlights.find(h => h.id === 'allTimeHigh')!;
    expect(h.ownerName).toBe('Ann');
    expect(h.value).toBe(140);
    expect(h.detail).toContain('130');
  });

  it('ignores playoff scores for records', () => {
    const pastSeasons = [past(2025, 20, 'Ann', 999, 'Ben', 100, true), past(2025, 3, 'Ann', 100, 'Ben', 90)];
    expect(ids(computeWeeklyRecap(WEEK, 1, { pastSeasons }))).toContain('allTimeHigh');
  });

  it('gives a season high only from week 2, when it beats earlier weeks', () => {
    const rows = [...wk(1, pair('Ann', 120, 'Ben', 90)), ...wk(2, pair('Ann', 125, 'Ben', 95))];
    expect(ids(computeWeeklyRecap(rows, 1))).not.toContain('seasonHigh');
    expect(ids(computeWeeklyRecap(rows, 2))).toContain('seasonHigh');
    const lower = [...wk(1, pair('Ann', 130, 'Ben', 90)), ...wk(2, pair('Ann', 125, 'Ben', 95))];
    expect(ids(computeWeeklyRecap(lower, 2))).not.toContain('seasonHigh');
  });

  it('flags a season low', () => {
    const rows = [...wk(1, pair('Ann', 120, 'Ben', 90)), ...wk(2, pair('Ann', 125, 'Ben', 80))];
    const h = computeWeeklyRecap(rows, 2)!.highlights.find(h => h.id === 'seasonLow')!;
    expect(h.ownerName).toBe('Ben');
  });

  it('flags a personal best only with enough history', () => {
    const many = Array.from({ length: 10 }, (_, i) => past(2025, i + 1, 'Ben', 80, 'Ann', 200));
    const rows = pair('Ann', 140, 'Ben', 90);
    expect(computeWeeklyRecap(rows, 1, { pastSeasons: many })!.highlights.find(h => h.id === 'personalBest')?.ownerName).toBe('Ben');
    expect(ids(computeWeeklyRecap(rows, 1, { pastSeasons: many.slice(0, 9) }))).not.toContain('personalBest');
  });

  it('flags a first-ever win and a broken losing streak, not an even rivalry', () => {
    const lose = (n: number, a: string, b: string) => Array.from({ length: n }, (_, i) => past(2025, i + 1, a, 80, b, 100));
    const win = (n: number, a: string, b: string) => Array.from({ length: n }, (_, i) => past(2024, i + 1, a, 100, b, 80));
    const firstEver = computeWeeklyRecap(pair('Ann', 140, 'Ben', 90), 1, { pastSeasons: lose(2, 'Ann', 'Ben') });
    expect(firstEver!.highlights.find(h => h.id === 'upset')!.detail).toContain('First win ever');
    const streak = computeWeeklyRecap(pair('Ann', 140, 'Ben', 90), 1, { pastSeasons: [...win(5, 'Ann', 'Ben'), ...lose(3, 'Ann', 'Ben')] });
    expect(streak!.highlights.find(h => h.id === 'upset')!.detail).toContain('3-game losing streak');
    const even = computeWeeklyRecap(pair('Ann', 140, 'Ben', 90), 1, { pastSeasons: [...lose(2, 'Ann', 'Ben'), ...win(2, 'Ann', 'Ben')] });
    expect(ids(even)).not.toContain('upset');
  });

  it('counts a rare win (≤25%) even without a streak', () => {
    const games = [
      past(2021, 1, 'Ann', 80, 'Ben', 100), past(2022, 1, 'Ann', 100, 'Ben', 80),
      past(2023, 1, 'Ann', 80, 'Ben', 100), past(2024, 1, 'Ann', 80, 'Ben', 100), past(2025, 1, 'Ann', 100, 'Ben', 90),
      past(2025, 2, 'Ann', 80, 'Ben', 100), past(2025, 3, 'Ann', 80, 'Ben', 100), past(2025, 4, 'Ann', 100, 'Ben', 90),
      past(2025, 5, 'Ann', 80, 'Ben', 100), past(2025, 6, 'Ann', 80, 'Ben', 100), past(2025, 7, 'Ann', 80, 'Ben', 100),
      past(2025, 8, 'Ann', 100, 'Ben', 90),
    ]; // Ann 4–8 but won the last one → only the ≤25% rule could fire, and 4/12 > 25%
    expect(ids(computeWeeklyRecap(pair('Ann', 140, 'Ben', 90), 1, { pastSeasons: games }))).not.toContain('upset');
    const worse = [...games.slice(0, 11), past(2025, 8, 'Ann', 100, 'Ben', 90)].filter((_, i) => i !== 1 && i !== 4);
    // Ann 2–8 with the last game a win → 20%, no streak
    expect(computeWeeklyRecap(pair('Ann', 140, 'Ben', 90), 1, { pastSeasons: worse })!.highlights.find(h => h.id === 'upset')!.detail).toContain('Only win #3');
  });

  it('flags a player record week from week 2', () => {
    const p = (name: string, total: number) => ({ playerId: total, playerName: name, proTeam: 'SAS', ownerNames: ['Ann'], totalPoints: total, games: 4, avgPoints: total / 4 });
    const topPlayersByWeek = [{ matchupPeriod: 1, players: [p('A', 200)] }, { matchupPeriod: 2, players: [p('B', 210)] }];
    const rows = [...wk(1, pair('Ann', 120, 'Ben', 90)), ...wk(2, pair('Ann', 110, 'Ben', 95))];
    expect(ids(computeWeeklyRecap(rows, 1, { topPlayersByWeek }))).not.toContain('playerRecord');
    expect(computeWeeklyRecap(rows, 2, { topPlayersByWeek })!.highlights.find(h => h.id === 'playerRecord')!.playerName).toBe('B');
  });

  it(`shows a bench game only at ${BENCH_MIN_POINTS}+ points`, () => {
    const g = (pts: number) => [{ matchupPeriod: 1, games: [{ playerName: 'X', proTeam: 'BOS', ownerName: 'Ann', teamName: 'Ann FC', fantasyPoints: pts, scoringPeriodId: 1 }] }];
    expect(ids(computeWeeklyRecap(WEEK, 1, { benchGamesByWeek: g(BENCH_MIN_POINTS) }))).toContain('benchBlunder');
    expect(ids(computeWeeklyRecap(WEEK, 1, { benchGamesByWeek: g(BENCH_MIN_POINTS - 1) }))).not.toContain('benchBlunder');
  });

  it('a quiet week gets no highlights and a blowout story', () => {
    const r = computeWeeklyRecap(WEEK, 1)!;
    expect(r.highlights).toEqual([]);
    expect(r.story[0]).toContain('Ann beat Ben by 50');
  });

  it('the story announces a new first place', () => {
    const rows = [
      ...wk(1, [...pair('Ann', 120, 'Ben', 90), ...pair('Cal', 100, 'Dan', 95)]),
      ...wk(2, [...pair('Ann', 120, 'Cal', 90), ...pair('Ben', 100, 'Dan', 95)]),
      ...wk(3, [...pair('Cal', 120, 'Ann', 90), ...pair('Ben', 100, 'Dan', 95)]),
    ];
    expect(computeWeeklyRecap(rows, 2)!.story[0]).toBe('Ann is alone in first place (2–0).');
    expect(computeWeeklyRecap(rows, 3)!.story.some(s => s.includes('first place'))).toBe(false); // Ann & Ben tied 2–1
  });
});

describe('canonicalOwner', () => {
  it('merges the names one owner appears under', () => {
    expect(canonicalOwner('Gelless')).toBe('Dor Gelless');
    expect(canonicalOwner('Dor Gelless & the monkey comeback')).toBe('Dor Gelless');
    expect(canonicalOwner('Barda')).toBe('Dor Barda');
    expect(canonicalOwner('Nir Zele')).toBe('Nir Zele');
  });
});
