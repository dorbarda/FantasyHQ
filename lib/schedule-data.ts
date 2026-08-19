/**
 * Loading side of the schedule grid: nightly snapshot first, then a live ESPN
 * fetch, then nothing — the same chain lib/recap-data.ts uses. Kept apart from
 * lib/espn-schedule.ts so the parsing and matrix code there stays pure.
 */
import { readSnapshot } from './snapshots';
import {
  getScheduleSeason,
  hasEspnCredentials,
  type ScheduleSeason,
} from './espn-schedule';

export async function loadScheduleSeason(): Promise<ScheduleSeason | null> {
  const snap = readSnapshot<ScheduleSeason>('schedule');
  if (snap && snap.data.schedules?.length > 0) return snap.data;

  if (hasEspnCredentials()) {
    try {
      return await getScheduleSeason();
    } catch (err) {
      console.error('Schedule fetch failed:', err);
    }
  }
  return null;
}
