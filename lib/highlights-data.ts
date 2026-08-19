/**
 * Loading side of the highlights spike.
 *
 * The nightly job fetches the last few days of clips once and commits them to
 * data/snapshots/highlights.json; pages only ever read that file. Two reasons:
 * the free tier is 100 requests a day, and a page must never wait on a
 * third-party video API to render.
 */
import { readSnapshot } from './snapshots';
import { datesForWeek, type ScheduleSeason } from './espn-schedule';
import {
  getHighlightsForDates,
  hasHighlightlyKey,
  type Highlight,
  type HighlightsByDate,
} from './highlightly';

/** Days back to cover — comfortably more than one fantasy week. */
const SNAPSHOT_DAYS = 10;

function recentDates(days: number, now = new Date()): string[] {
  const out: string[] = [];
  for (let i = 1; i <= days; i++) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out.reverse();
}

/** Built nightly. Returns {} when no key is configured — never throws. */
export async function buildHighlightsSnapshot(): Promise<HighlightsByDate> {
  if (!hasHighlightlyKey()) return {};
  return getHighlightsForDates(recentDates(SNAPSHOT_DAYS));
}

/**
 * Clips for the given days, newest day first. Reads only the snapshot, so a
 * page render costs nothing and works with no key configured.
 */
export function loadHighlightsForDates(dates: string[]): Highlight[] {
  const snap = readSnapshot<HighlightsByDate>('highlights');
  if (!snap) return [];

  const wanted = new Set(dates);
  return Object.entries(snap.data)
    .filter(([date]) => wanted.has(date))
    .sort(([a], [b]) => b.localeCompare(a))
    .flatMap(([, clips]) => clips);
}

/**
 * Clips belonging to one fantasy week. Snapshot-only and synchronous on
 * purpose: rendering a recap must not make a network call, and a missing
 * schedule or highlights snapshot simply means no video that week.
 */
export function loadHighlightsForWeek(week: number): Highlight[] {
  const schedule = readSnapshot<ScheduleSeason>('schedule');
  if (!schedule) return [];
  return loadHighlightsForDates(datesForWeek(schedule.data, week));
}
