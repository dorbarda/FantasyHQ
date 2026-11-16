/**
 * Loading side of the recap: pulls depth rows from the nightly snapshot,
 * falling back to a live ESPN fetch, then to nothing. Kept apart from
 * lib/recap.ts so the computation there stays pure and testable.
 */
import { readSnapshot } from './snapshots';
import { hasEspnCredentials, getMatchupDepth } from './espn';
import type { MatchupDepthData, MatchupDepthRow, RecordsData, WeeklyTopPlayer } from './types';
import type { RecapContext } from './recap';
import { CURRENT_SEASON } from './season';

async function loadDepth(): Promise<MatchupDepthData | null> {
  const snap = readSnapshot<MatchupDepthData>('matchup-depth');
  if (snap) return snap.data;

  if (hasEspnCredentials()) {
    try {
      return await getMatchupDepth();
    } catch (err) {
      console.error('Recap depth fetch failed:', err);
    }
  }
  return null;
}

export async function loadRecapRows(): Promise<MatchupDepthRow[]> {
  return (await loadDepth())?.rows ?? [];
}

/** Top 10 players of one week ([] on snapshots built before this field existed). */
export async function loadTopPlayersForWeek(week: number): Promise<WeeklyTopPlayer[]> {
  return (await loadDepth())?.topPlayersByWeek?.find(w => w.matchupPeriod === week)?.players ?? [];
}

/**
 * Everything the season highlights need besides this season's rows: earlier
 * seasons' games (records snapshot) and this season's top players and bench
 * games (depth snapshot). Missing pieces just mean fewer highlights.
 */
export async function loadRecapContext(): Promise<RecapContext> {
  const depth = await loadDepth();
  const records = readSnapshot<RecordsData>('records');
  return {
    pastSeasons: (records?.data.matchups ?? []).filter(m => m.year < CURRENT_SEASON),
    topPlayersByWeek: depth?.topPlayersByWeek,
    benchGamesByWeek: depth?.benchGamesByWeek,
  };
}
