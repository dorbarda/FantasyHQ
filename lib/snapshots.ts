/**
 * Snapshot layer — reads pre-computed ESPN data from data/snapshots/*.json.
 *
 * The nightly GitHub Action (espn-snapshot.yml) runs scripts/build-snapshots.mts,
 * which calls the heavy ESPN loaders and commits their output here. Analytical
 * pages (records, history, transactions, depth, analysis) prefer these
 * snapshots over live ESPN calls: they render fast, keep working when the
 * ESPN cookies expire, and are at most a day stale — fine for pages that
 * analyze completed weeks.
 *
 * Live pages (home, matchups, standings, playoff bracket) keep fetching ESPN
 * directly and are unaffected by this layer.
 */
import { readFileSync } from 'fs';
import path from 'path';

export interface SnapshotFile<T> {
  generatedAt: string; // ISO timestamp written by the snapshot script
  data: T;
}

export type SnapshotName =
  | 'stats'
  | 'records'
  | 'history'
  | 'transactions'
  | 'matchup-depth'
  | 'playoff-depth';

export function readSnapshot<T>(name: SnapshotName): SnapshotFile<T> | null {
  try {
    const file = path.join(process.cwd(), 'data', 'snapshots', `${name}.json`);
    const parsed = JSON.parse(readFileSync(file, 'utf-8')) as SnapshotFile<T>;
    if (!parsed || typeof parsed.generatedAt !== 'string' || parsed.data === undefined) {
      return null;
    }
    return parsed;
  } catch {
    return null; // missing or unreadable snapshot — caller falls back to live
  }
}

/** "2026-08-18T09:00:00.000Z" → "Aug 18, 2026" for display */
export function formatSnapshotDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
