/**
 * Loading side of the recap: pulls depth rows from the nightly snapshot,
 * falling back to a live ESPN fetch, then to nothing. Kept apart from
 * lib/recap.ts so the computation there stays pure and testable.
 */
import { readSnapshot } from './snapshots';
import { hasEspnCredentials, getMatchupDepth } from './espn';
import type { MatchupDepthData, MatchupDepthRow, TransactionsData } from './types';

export async function loadRecapRows(): Promise<MatchupDepthRow[]> {
  const snap = readSnapshot<MatchupDepthData>('matchup-depth');
  if (snap) return snap.data.rows;

  if (hasEspnCredentials()) {
    try {
      return (await getMatchupDepth()).rows;
    } catch (err) {
      console.error('Recap depth fetch failed:', err);
    }
  }
  return [];
}

/**
 * Per-week adds for Hot Pickup. The transactions snapshot only carries these
 * once getTransactions() keeps the scoring period it already fetches
 * (docs/RECAP-SPEC.md §4); until then this returns undefined and the award
 * is simply not shown.
 */
export function loadAddsForWeek(week: number) {
  const snap = readSnapshot<TransactionsData & {
    addsByWeek?: { week: number; players: { playerId: number; playerName: string; proTeam: string; position: string; addCount: number }[] }[];
  }>('transactions');
  return snap?.data.addsByWeek?.find(w => w.week === week)?.players;
}
