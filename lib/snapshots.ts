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
import { CURRENT_SEASON } from './season';

export interface SnapshotFile<T> {
  generatedAt: string; // ISO timestamp written by the snapshot script
  season?: number;     // CURRENT_SEASON at write time (absent on pre-tag files)
  data: T;
}

export type SnapshotName =
  | 'stats'
  | 'records'
  | 'history'
  | 'transactions'
  | 'matchup-depth'
  | 'playoff-depth'
  | 'schedule'
  | 'highlights';

/**
 * Snapshots that hold ONE season's data. After a rollover the nightly job
 * keeps the old file until the new season has data (an empty result never
 * overwrites a good one), so without this check last season's weeks would
 * render under the new season's label. Records and history span every
 * season, so an older file is still correct for them — just one season short.
 */
const SEASON_SCOPED: ReadonlySet<SnapshotName> = new Set<SnapshotName>([
  'stats',
  'transactions',
  'matchup-depth',
  'playoff-depth',
  'schedule',
  'highlights',
]);

export function readSnapshot<T>(name: SnapshotName): SnapshotFile<T> | null {
  try {
    const file = path.join(process.cwd(), 'data', 'snapshots', `${name}.json`);
    const parsed = JSON.parse(readFileSync(file, 'utf-8')) as SnapshotFile<T>;
    if (!parsed || typeof parsed.generatedAt !== 'string' || parsed.data === undefined) {
      return null;
    }
    // Another season's file (or an untagged one) — caller falls back to live.
    if (SEASON_SCOPED.has(name) && parsed.season !== CURRENT_SEASON) {
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
