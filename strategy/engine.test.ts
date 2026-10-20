import { describe, it, expect } from 'vitest';
import {
  type AgentPlayer, buildCalendar, buildDefense, formAverage, NEUTRAL_DEFENSE, normalCdf,
  parsePlayer, rankPickups, simulateWeek, trending, verdictFor, winChance,
} from './engine';

const SEASON = 2027;
const C = [4, 11];          // C, UTIL
const G = [0, 1, 5, 11];    // PG, SG, G, UTIL

function player(id: number, form: number, proTeamId: number, eligible: number[], over: Partial<AgentPlayer> = {}): AgentPlayer {
  return {
    id, name: `P${id}`, pos: 'C', group: 'C', proTeamId, eligible, status: 'ACTIVE', onIR: false,
    lineupSlotId: 0, gp: 10, seasonAvg: form, l7: form, l15: form, l30: form, proj: form, lastSeasonAvg: form,
    form, owned: 50, ownedChange: 0, playedSps: [], ...over,
  };
}

/** NBA team 1 plays days 1–3, team 2 only day 1, team 3 days 2–3. All vs team 9. */
const cal = buildCalendar([
  { proTeamId: 1, abbrev: 'AAA', games: [1, 2, 3].map(sp => ({ scoringPeriodId: sp, opponentId: 9 })) },
  { proTeamId: 2, abbrev: 'BBB', games: [{ scoringPeriodId: 1, opponentId: 9 }] },
  { proTeamId: 3, abbrev: 'CCC', games: [2, 3].map(sp => ({ scoringPeriodId: sp, opponentId: 9 })) },
  { proTeamId: 9, abbrev: 'ZZZ', games: [1, 2, 3].map(sp => ({ scoringPeriodId: sp, opponentId: 1 })) },
], sp => `2026-10-${19 + sp}`);

describe('formAverage', () => {
  const base = { seasonAvg: 30, l15: 40, proj: 20, lastSeasonAvg: 25 };
  it('uses the projection before any games', () => {
    expect(formAverage({ ...base, gp: 0 })).toBe(20);
  });
  it('falls back to last season when ESPN has no projection', () => {
    expect(formAverage({ ...base, gp: 0, proj: 0 })).toBe(25);
  });
  it('is all real form from 10 games: 60% last 15 + 40% season', () => {
    expect(formAverage({ ...base, gp: 12 })).toBe(36);
  });
  it('blends halfway at 5 games', () => {
    expect(formAverage({ ...base, gp: 5 })).toBe(28);
  });
});

describe('parsePlayer', () => {
  it('reads ESPN stat ids, slots and IR', () => {
    const p = parsePlayer({
      id: 7, fullName: 'X', defaultPositionId: 5, proTeamId: 1, eligibleSlots: [4, 11, 12, 13],
      stats: [
        { id: '002027', appliedAverage: 30, stats: { 42: 3 } },
        { id: '102027', appliedAverage: 33 },
        { id: '05123', statSourceId: 0, statSplitTypeId: 5, scoringPeriodId: 4, appliedTotal: 40 },
      ],
    }, SEASON, { lineupSlotId: 13 });
    expect(p).toMatchObject({ pos: 'C', group: 'C', eligible: [4, 11], onIR: true, gp: 3, seasonAvg: 30, proj: 33, playedSps: [4] });
  });
});

describe('simulateWeek', () => {
  it('counts games per day and finds empty spots', () => {
    const sim = simulateWeek([player(1, 40, 1, C), player(2, 30, 2, G)], [1, 2, 3], cal, NEUTRAL_DEFENSE);
    expect(sim.games).toBe(4);
    expect(sim.points).toBe(150);
    expect(sim.days[0].emptySlots).toHaveLength(8);
    expect(sim.days[1].emptySlots).toContain('PG');
  });

  it('benches the lower average when two centers fight for C + UTIL… and a third has no spot', () => {
    const onlyC = [4];
    const sim = simulateWeek([player(1, 40, 1, onlyC), player(2, 30, 1, onlyC)], [1], cal, NEUTRAL_DEFENSE);
    expect(sim.games).toBe(1);
    expect(sim.lost).toBe(1);
    expect(sim.days[0].benched).toEqual(['P2']);
  });

  it('gives no games to IR, OUT, or a waiver claim before it clears', () => {
    const sim = simulateWeek([
      player(1, 40, 1, C, { onIR: true }),
      player(2, 40, 1, C, { status: 'OUT' }),
      player(3, 40, 1, C, { availableFromSp: 3 }),
    ], [1, 2, 3], cal, NEUTRAL_DEFENSE);
    expect(sim.games).toBe(1);
  });

  it('leaves games already played today to the actual score', () => {
    const sim = simulateWeek([player(1, 40, 1, C, { playedSps: [1] })], [1, 2], cal, NEUTRAL_DEFENSE, 1);
    expect(sim.games).toBe(1);
    expect(sim.days[0].alreadyPlayed).toBe(1);
  });
});

describe('buildDefense', () => {
  it('scales by opponent, shrinks small samples, clamps', () => {
    // 20 C-games vs team 9 at 1.5× their average → shrunk to 1.25 → clamped to 1.15.
    const logs = Array.from({ length: 20 }, () => ({ proTeamId: 1, group: 'C' as const, sp: 1, fp: 45, baseline: 30 }));
    const d = buildDefense(logs, cal);
    expect(d.factor(9, 'C')).toBeCloseTo(1.15);
    expect(d.factor(9, 'G')).toBe(1);
    expect(d.sample).toBe(20);
  });
  it('ignores low-average players', () => {
    const d = buildDefense([{ proTeamId: 1, group: 'C', sp: 1, fp: 30, baseline: 10 }], cal);
    expect(d.sample).toBe(0);
  });
});

describe('winChance + verdict', () => {
  it('is 50% for equal projections and rises with the lead', () => {
    expect(winChance(1000, 1000, 100, 100)).toBeCloseTo(0.5);
    expect(winChance(1100, 1000, 50, 50)).toBeGreaterThan(0.9);
    expect(winChance(1100, 1000, 0, 0)).toBe(1);
  });
  it('normalCdf matches known values', () => {
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(normalCdf(-1)).toBeCloseTo(0.1587, 3);
  });
  it('maps chance to a verdict', () => {
    expect(verdictFor(0.7).key).toBe('favored');
    expect(verdictFor(0.5).key).toBe('tossup');
    expect(verdictFor(0.2).key).toBe('underdog');
    expect(verdictFor(0.05).key).toBe('longshot');
  });
});

describe('rankPickups', () => {
  const roster = [
    player(1, 50, 2, G),
    player(2, 40, 2, C),
    player(3, 10, 2, [2, 6, 11]),
  ];
  it('values a free agent by the games he adds, and drops the weakest', () => {
    const fa = player(10, 30, 1, C, { lineupSlotId: undefined, freeStatus: 'FREEAGENT' });
    const [top] = rankPickups(roster, [fa], [1, 2, 3], cal, NEUTRAL_DEFENSE);
    // FA adds 3 games × 30; dropping P3 loses his 1 game × 10.
    expect(top.gain).toBe(80);
    expect(top.drop?.id).toBe(3);
    expect(top.opponents).toEqual(['ZZZ', 'ZZZ', 'ZZZ']);
  });
  it('never suggests dropping a star for a one-week gain', () => {
    const fa = player(10, 45, 1, C);
    const [top] = rankPickups([player(1, 60, 2, C), ...Array.from({ length: 4 }, (_, i) => player(20 + i, 20, 3, C))],
      [fa], [1, 2, 3], cal, NEUTRAL_DEFENSE);
    expect(top.drop?.id).not.toBe(1);
  });
});

describe('trending', () => {
  it('uses ownership change before any games are played', () => {
    const fas = [player(1, 0, 1, C, { l7: 0, ownedChange: 5 }), player(2, 0, 1, C, { l7: 0, ownedChange: -2 })];
    expect(trending(fas).map(p => p.id)).toEqual([1]);
  });
});
