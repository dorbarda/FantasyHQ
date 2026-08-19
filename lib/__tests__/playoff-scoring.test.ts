import { describe, it, expect } from 'vitest';
import { computeOwnerScore, computeAllScores, FINALS_WINNER_POINTS } from '../playoff-scoring';
import type { OwnerPlayoffBets, PlayoffResults, SeriesResult, PlayInResult } from '../types';
import realBets from '../../data/playoffs/2026/bets.json';
import realResults from '../../data/playoffs/2026/results.json';

// ── Fixture builders ─────────────────────────────────────────────────────────

function playInResult(gameId: string, winner: string | null): PlayInResult {
  return { gameId, conference: 'west', label: gameId, teams: ['A', 'B'], winner };
}

function seriesResult(
  seriesId: string,
  round: 1 | 2 | 3 | 4,
  winner: string | null,
  score: string | null = null,
): SeriesResult {
  return { seriesId, round, conference: 'west', label: seriesId, teams: ['A', 'B'], winner, score };
}

function bets(over: Partial<OwnerPlayoffBets> = {}): OwnerPlayoffBets {
  return {
    ownerName: 'Test Owner',
    bonusBets: { westChampion: '', eastChampion: '', nbaChampion: '' },
    playIn: [],
    series: [],
    ...over,
  };
}

function results(over: Partial<PlayoffResults> = {}): PlayoffResults {
  return { playIn: [], series: [], ...over };
}

// ── Play-in ──────────────────────────────────────────────────────────────────

describe('play-in scoring', () => {
  it('awards 1 point per correct pick, 0 for wrong', () => {
    const r = computeOwnerScore(
      bets({ playIn: [
        { gameId: 'g1', pick: 'Lakers' },
        { gameId: 'g2', pick: 'Suns' },
      ] }),
      results({ playIn: [playInResult('g1', 'Lakers'), playInResult('g2', 'Warriors')] }),
    );
    expect(r.bySection.playIn).toBe(1);
    expect(r.detail).toEqual([
      { seriesId: 'g1', earned: 1, status: 'correct' },
      { seriesId: 'g2', earned: 0, status: 'wrong' },
    ]);
  });

  it('marks unfinished games pending with 0 points', () => {
    const r = computeOwnerScore(
      bets({ playIn: [{ gameId: 'g1', pick: 'Lakers' }] }),
      results({ playIn: [playInResult('g1', null)] }),
    );
    expect(r.detail[0]).toEqual({ seriesId: 'g1', earned: 0, status: 'pending' });
    expect(r.total).toBe(0);
  });
});

// ── Series rounds ────────────────────────────────────────────────────────────

describe('series scoring', () => {
  // winner-only points and winner+exact totals per round
  const table: Array<{ round: 1 | 2 | 3 | 4; winner: number; exact: number; wrong43: number }> = [
    { round: 1, winner: 2, exact: 4, wrong43: 1 },
    { round: 2, winner: 3, exact: 6, wrong43: 2 },
    { round: 3, winner: 4, exact: 8, wrong43: 3 },
    { round: 4, winner: 5, exact: 10, wrong43: 4 },
  ];

  for (const { round, winner, exact, wrong43 } of table) {
    it(`round ${round}: winner=${winner}, winner+exact=${exact}, wrong-but-4-3=${wrong43}`, () => {
      const winnerOnly = computeOwnerScore(
        bets({ series: [{ seriesId: 's', pick: 'Lakers', score: '4-0' }] }),
        results({ series: [seriesResult('s', round, 'Lakers', '4-2')] }),
      );
      expect(winnerOnly.total).toBe(winner);
      expect(winnerOnly.detail[0].status).toBe('correct');

      const exactHit = computeOwnerScore(
        bets({ series: [{ seriesId: 's', pick: 'Lakers', score: '4-2' }] }),
        results({ series: [seriesResult('s', round, 'Lakers', '4-2')] }),
      );
      expect(exactHit.total).toBe(exact);
      expect(exactHit.detail[0].status).toBe('exact');

      const consolation = computeOwnerScore(
        bets({ series: [{ seriesId: 's', pick: 'Suns', score: '4-3' }] }),
        results({ series: [seriesResult('s', round, 'Lakers', '4-3')] }),
      );
      expect(consolation.total).toBe(wrong43);
      expect(consolation.detail[0].status).toBe('wrong43');
    });
  }

  it('gives no consolation when the wrong pick did not also predict 4-3', () => {
    const r = computeOwnerScore(
      bets({ series: [{ seriesId: 's', pick: 'Suns', score: '4-0' }] }),
      results({ series: [seriesResult('s', 1, 'Lakers', '4-3')] }),
    );
    expect(r.total).toBe(0);
    expect(r.detail[0].status).toBe('wrong');
  });

  it('matches team names case-insensitively and ignores whitespace', () => {
    const r = computeOwnerScore(
      bets({ series: [{ seriesId: 's', pick: '  new york KNICKS ', score: '4-0' }] }),
      results({ series: [seriesResult('s', 1, 'New York Knicks', '4-1')] }),
    );
    expect(r.detail[0].status).toBe('correct');
  });

  it('accumulates points into the right round buckets', () => {
    const r = computeOwnerScore(
      bets({ series: [
        { seriesId: 'a', pick: 'Lakers', score: '4-0' },
        { seriesId: 'b', pick: 'Suns', score: '4-1' },
      ] }),
      results({ series: [
        seriesResult('a', 1, 'Lakers', '4-0'), // exact: 2+2
        seriesResult('b', 3, 'Suns', '4-2'),   // winner only: 4
      ] }),
    );
    expect(r.bySection.rounds).toEqual([4, 0, 4, 0]);
    expect(r.total).toBe(8);
  });
});

// ── Bonus bets ───────────────────────────────────────────────────────────────

describe('bonus scoring', () => {
  const finalsDone = results({
    series: [
      seriesResult('r3-w', 3, 'Oklahoma City Thunder', '4-2'),
      seriesResult('r3-e', 3, 'New York Knicks', '4-0'),
      seriesResult('r4', 4, 'New York Knicks', '4-1'),
    ],
  });

  it('awards 7 per correct conference champion', () => {
    const r = computeOwnerScore(
      bets({ bonusBets: { westChampion: 'Oklahoma City Thunder', eastChampion: 'Boston Celtics', nbaChampion: 'Boston Celtics' } }),
      finalsDone,
    );
    expect(r.bySection.bonus).toBe(7);
  });

  it('adds +5 for both conference champions correct', () => {
    const r = computeOwnerScore(
      bets({ bonusBets: { westChampion: 'Oklahoma City Thunder', eastChampion: 'New York Knicks', nbaChampion: 'Boston Celtics' } }),
      finalsDone,
    );
    expect(r.bySection.bonus).toBe(7 + 7 + 5);
  });

  it('champion pick pays its odds-based points, and the triple combo stacks +10', () => {
    const r = computeOwnerScore(
      bets({ bonusBets: { westChampion: 'Oklahoma City Thunder', eastChampion: 'New York Knicks', nbaChampion: 'New York Knicks' } }),
      finalsDone,
    );
    // 7 + 7 + Knicks(22) + 5 (both conferences) + 10 (all three)
    expect(r.bySection.bonus).toBe(7 + 7 + FINALS_WINNER_POINTS['New York Knicks'] + 5 + 10);
  });

  it('falls back to 15 points for a champion missing from the odds table', () => {
    const r = computeOwnerScore(
      bets({ bonusBets: { westChampion: '', eastChampion: '', nbaChampion: 'Underdog FC' } }),
      results({ series: [seriesResult('r4', 4, 'Underdog FC', '4-2')] }),
    );
    expect(r.bySection.bonus).toBe(15);
  });

  it('awards +8 for a perfect round 1 only when all 8 series are decided and correct', () => {
    const ids = ['r1-1', 'r1-2', 'r1-3', 'r1-4', 'r1-5', 'r1-6', 'r1-7', 'r1-8'];
    const allCorrect = computeOwnerScore(
      bets({ series: ids.map(id => ({ seriesId: id, pick: 'W', score: '4-0' as const })) }),
      results({ series: ids.map(id => seriesResult(id, 1, 'W', '4-1')) }),
    );
    // 8 × 2 winner points + 8 bonus
    expect(allCorrect.total).toBe(16 + 8);
    expect(allCorrect.bySection.bonus).toBe(8);

    const sevenOfEight = computeOwnerScore(
      bets({ series: ids.map((id, i) => ({ seriesId: id, pick: i === 0 ? 'L' : 'W', score: '4-0' as const })) }),
      results({ series: ids.map(id => seriesResult(id, 1, 'W', '4-1')) }),
    );
    expect(sevenOfEight.bySection.bonus).toBe(0);

    const sevenDecided = computeOwnerScore(
      bets({ series: ids.map(id => ({ seriesId: id, pick: 'W', score: '4-0' as const })) }),
      results({ series: ids.map((id, i) => seriesResult(id, 1, i === 7 ? null : 'W', '4-1')) }),
    );
    expect(sevenDecided.bySection.bonus).toBe(0);
  });

  it('awards no bonus while the finals are undecided', () => {
    const r = computeOwnerScore(
      bets({ bonusBets: { westChampion: 'A', eastChampion: 'B', nbaChampion: 'C' } }),
      results({ series: [seriesResult('r4', 4, null)] }),
    );
    expect(r.bySection.bonus).toBe(0);
  });
});

// ── computeAllScores ─────────────────────────────────────────────────────────

describe('computeAllScores', () => {
  it('scores every owner and sorts by total descending', () => {
    const rs = results({ playIn: [playInResult('g1', 'Lakers')] });
    const scores = computeAllScores(
      [
        bets({ ownerName: 'Loser', playIn: [{ gameId: 'g1', pick: 'Suns' }] }),
        bets({ ownerName: 'Winner', playIn: [{ gameId: 'g1', pick: 'Lakers' }] }),
      ],
      rs,
    );
    expect(scores.map(s => s.ownerName)).toEqual(['Winner', 'Loser']);
  });
});

// ── Golden regression: the real 2026 pool ────────────────────────────────────
//
// Recomputes the finished 2025-26 playoff pool from the committed bets and
// results. These totals are the season's official raw scores (before fines:
// Yotam Goldin's -3 late-submission fine drops him from 42 to 39, which is
// why Amir Ben Izhak finished runner-up). If a scoring change breaks any of
// these numbers, it rewrites league history — think hard before updating.

describe('2025-26 season golden results', () => {
  const scores = computeAllScores(
    realBets.owners as OwnerPlayoffBets[],
    realResults as unknown as PlayoffResults,
  );
  const byOwner = Object.fromEntries(scores.map(s => [s.ownerName, s]));

  it('reproduces every owner’s official raw total', () => {
    expect(scores.map(s => [s.ownerName, s.total])).toEqual([
      ['Dor Barda', 44],
      ['Yotam Goldin', 42],
      ['Amir Ben Izhak', 41],
      ['Dor Gelless', 39],
      ['Ilay Mendel', 39],
      ['Yuval Halevy', 35],
      ['Omer Rosenberg', 35],
      ['Yoav Coracos', 28],
      ['Barak Miller', 27],
    ]);
  });

  it('champion Dor Barda: 44 points with 4 exact scores', () => {
    const champ = byOwner['Dor Barda'];
    expect(champ.total).toBe(44);
    expect(champ.detail.filter(d => d.status === 'exact')).toHaveLength(4);
    expect(champ.bySection).toEqual({ playIn: 2, rounds: [14, 11, 12, 5], bonus: 0 });
  });

  it('nobody earned a bonus in 2026 (no owner hit a champion or combo)', () => {
    expect(scores.every(s => s.bySection.bonus === 0)).toBe(true);
  });
});
