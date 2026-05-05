import type { OwnerPlayoffBets, PlayoffResults, SeriesResult } from './types';
import { getOwnerColor } from './owner-meta';

export type PickStatus = 'exact' | 'correct' | 'wrong43' | 'wrong' | null;

const ROUND_PTS    = { 1: 2, 2: 3, 3: 4, 4: 5 } as const;
const WRONG43_PTS  = { 1: 1, 2: 2, 3: 3, 4: 4 } as const;

export interface OwnerAnalytics {
  ownerName: string;
  color: string;
  total: number;
  correct: number;
  exact: number;
  picks: number;
  streak: PickStatus[];
  trajectory: number[];
}

export function computeAnalyticsStandings(
  allBets: OwnerPlayoffBets[],
  results: PlayoffResults,
): OwnerAnalytics[] {
  const completedSeries = results.series.filter(s => s.winner !== null);

  return allBets
    .map(owner => {
      let total = 0, correct = 0, exact = 0, picks = 0;
      const streak: PickStatus[] = [];
      let cum = 0;
      const trajectory: number[] = [0];

      for (const s of completedSeries) {
        const bet = owner.series.find(b => b.seriesId === s.seriesId);
        if (!bet?.pick) {
          streak.push(null);
          trajectory.push(cum);
          continue;
        }
        picks++;
        const rnd = s.round as 1 | 2 | 3 | 4;
        const pts       = ROUND_PTS[rnd];
        const w43pts    = WRONG43_PTS[rnd];
        const isCorrect = bet.pick.trim().toLowerCase() === s.winner!.trim().toLowerCase();

        if (isCorrect) {
          correct++;
          const isExact = !!(bet.score && s.score && bet.score === s.score);
          if (isExact) {
            exact++;
            cum   += pts + pts;
            total += pts + pts;
            streak.push('exact');
          } else {
            cum   += pts;
            total += pts;
            streak.push('correct');
          }
        } else {
          if (s.score === '4-3' && bet.score === '4-3') {
            cum   += w43pts;
            total += w43pts;
            streak.push('wrong43');
          } else {
            streak.push('wrong');
          }
        }
        trajectory.push(cum);
      }

      return { ownerName: owner.ownerName, color: getOwnerColor(owner.ownerName), total, correct, exact, picks, streak, trajectory };
    })
    .sort((a, b) => b.total - a.total);
}

export function pickDistribution(
  seriesId: string,
  allBets: OwnerPlayoffBets[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const owner of allBets) {
    const bet = owner.series.find(s => s.seriesId === seriesId);
    if (bet?.pick) counts[bet.pick] = (counts[bet.pick] ?? 0) + 1;
  }
  return counts;
}

export interface UpsetInfo {
  series: SeriesResult;
  callerCount: number;
  totalCallers: number;
}

export function topUpset(
  allBets: OwnerPlayoffBets[],
  results: PlayoffResults,
): UpsetInfo | null {
  const upsets = results.series.filter(
    s => s.winner !== null && s.winner === s.teams[1],
  );
  if (upsets.length === 0) return null;

  let best: UpsetInfo | null = null;
  for (const s of upsets) {
    const dist         = pickDistribution(s.seriesId, allBets);
    const callerCount  = dist[s.winner!] ?? 0;
    const totalCallers = Object.values(dist).reduce((a, b) => a + b, 0);
    if (!best || callerCount < best.callerCount) {
      best = { series: s, callerCount, totalCallers };
    }
  }
  return best;
}

export function teamPickCounts(
  allBets: OwnerPlayoffBets[],
  results: PlayoffResults,
): [string, number][] {
  const counts: Record<string, number> = {};
  for (const s of results.series) {
    for (const owner of allBets) {
      const bet = owner.series.find(b => b.seriesId === s.seriesId);
      if (bet?.pick) counts[bet.pick] = (counts[bet.pick] ?? 0) + 1;
    }
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}
