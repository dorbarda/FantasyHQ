import { describe, it, expect } from 'vitest';
import { computeWeeklyRecap, listRecapWeeks, latestRecapWeek } from '../recap';
import type { MatchupDepthRow, TransactionPlayer } from '../types';
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

// ── Core five ────────────────────────────────────────────────────────────────

describe('עשה לו גלס (biggest blowout)', () => {
  it('picks the largest margin of victory', () => {
    const w = winnersOf(computeWeeklyRecap(WEEK, 1), 'beatdown');
    expect(w).toHaveLength(1);
    expect(w[0].ownerName).toBe('Ann');
    expect(w[0].value).toBe(50);
  });

  it('reports every team tied for the biggest margin', () => {
    const tied = [...pair('Ann', 140, 'Ben', 90), ...pair('Cal', 150, 'Dan', 100)];
    const w = winnersOf(computeWeeklyRecap(tied, 1), 'beatdown');
    expect(w.map(x => x.ownerName).sort()).toEqual(['Ann', 'Cal']);
  });
});

describe('Heart Attack (closest game)', () => {
  it('picks the smallest margin of victory', () => {
    const w = winnersOf(computeWeeklyRecap(WEEK, 1), 'heartAttack');
    expect(w).toHaveLength(1);
    expect(w[0].ownerName).toBe('Cal');
    expect(w[0].value).toBe(1);
  });
});

describe('Ceiling (highest score)', () => {
  it('picks the highest single score, winner or not', () => {
    const w = winnersOf(computeWeeklyRecap(WEEK, 1), 'ceiling');
    expect(w).toHaveLength(1);
    expect(w[0].ownerName).toBe('Ann');
    expect(w[0].value).toBe(140);
  });

  it('can go to a team that lost', () => {
    const rows = [...pair('Ann', 200, 'Ben', 210), ...pair('Cal', 100, 'Dan', 90)];
    const w = winnersOf(computeWeeklyRecap(rows, 1), 'ceiling');
    expect(w[0].ownerName).toBe('Ben');
  });
});

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

describe('עשה ברדה (most starter games)', () => {
  it('picks the highest totalPlayers', () => {
    const rows = [
      ...pair('Ann', 100, 'Ben', 90, { totalPlayers: 50 }),
      ...pair('Cal', 80, 'Dan', 70, { totalPlayers: 30 }),
    ];
    const w = winnersOf(computeWeeklyRecap(rows, 1), 'grinder');
    expect(w.map(x => x.ownerName).sort()).toEqual(['Ann', 'Ben']);
    expect(w[0].value).toBe(50);
  });
});

describe('Sniper (best points per slot)', () => {
  it('picks the highest efficiency, not the highest score', () => {
    const rows = [
      // Ann scores more in total but uses far more slots to do it.
      ...pair('Ann', 200, 'Ben', 100, { totalPlayers: 60 }),
      ...pair('Cal', 120, 'Dan', 60, { totalPlayers: 20 }),
    ];
    const w = winnersOf(computeWeeklyRecap(rows, 1), 'sniper');
    expect(w[0].ownerName).toBe('Cal');
  });
});

// ── Hot Pickup ───────────────────────────────────────────────────────────────

describe('Hot Pickup', () => {
  const adds: TransactionPlayer[] = [
    { playerId: 1, playerName: 'Waiver Wire Guy', proTeam: 'BOS', position: 'PG', addCount: 5 },
    { playerId: 2, playerName: 'Someone Else', proTeam: 'LAL', position: 'C', addCount: 2 },
  ];

  it('is absent when per-week adds are not supplied', () => {
    // The transactions snapshot only gains addsByWeek after the §4 change.
    const recap = computeWeeklyRecap(WEEK, 1);
    expect(recap!.awards.find(a => a.id === 'hotPickup')).toBeUndefined();
  });

  it('reports the most-added player when adds are supplied', () => {
    const w = winnersOf(computeWeeklyRecap(WEEK, 1, { addsThisWeek: adds }), 'hotPickup');
    expect(w).toHaveLength(1);
    expect(w[0].playerName).toBe('Waiver Wire Guy');
    expect(w[0].value).toBe(5);
  });
});

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
    // The 400 blowout is a ghost's, so Ann still takes Ceiling.
    expect(winnersOf(recap, 'ceiling')[0].ownerName).toBe('Ann');
  });

  it('keeps a bye out of matchup awards but counts it for team awards', () => {
    const rows = [
      ...pair('Ann', 100, 'Ben', 90),
      row({ ownerName: 'Solo', teamScore: 500, opponentName: '', opponentScore: 0, totalPlayers: 99 }),
    ];
    const recap = computeWeeklyRecap(rows, 1)!;
    // Team-level: the bye's huge score and slot count still win.
    expect(winnersOf(recap, 'ceiling')[0].ownerName).toBe('Solo');
    expect(winnersOf(recap, 'grinder')[0].ownerName).toBe('Solo');
    // Matchup-level: the bye is not a blowout, and produces no matchup row.
    expect(winnersOf(recap, 'beatdown')[0].ownerName).toBe('Ann');
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

  it('עשה לו גלס — Gelless beat Barak Miller by 235', () => {
    const [w] = winnersOf(recap, 'beatdown');
    expect(w.ownerName).toBe('Gelless');
    expect(w.value).toBe(235);
    expect(w.teamScore).toBe(1372);
    expect(w.opponentScore).toBe(1137);
  });

  it('Heart Attack — Nir Zele edged Omer Rosenberg by 6', () => {
    const [w] = winnersOf(recap, 'heartAttack');
    expect(w.ownerName).toBe('Nir Zele');
    expect(w.value).toBe(6);
  });

  it('Ceiling — Yuval Halevy posted the top score of 1526', () => {
    const [w] = winnersOf(recap, 'ceiling');
    expect(w.ownerName).toBe('Yuval Halevy');
    expect(w.value).toBe(1526);
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

  it('עשה ברדה — Yotam Goldin used the most starter games', () => {
    const [w] = winnersOf(recap, 'grinder');
    expect(w.ownerName).toBe('Yotam Goldin');
    expect(w.value).toBe(50);
  });

  it('Sniper — Omer Rosenberg had the best points per slot', () => {
    const [w] = winnersOf(recap, 'sniper');
    expect(w.ownerName).toBe('Omer Rosenberg');
  });

  it('Hot Pickup is absent until the transactions snapshot carries per-week adds', () => {
    expect(recap.awards.find(a => a.id === 'hotPickup')).toBeUndefined();
  });
});
