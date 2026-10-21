/**
 * Reads the frozen start-of-week projections written every Sunday by
 * scripts/freeze-week-projections.mts. Server only (fs).
 */
import { readFileSync } from 'fs';
import path from 'path';
import { CURRENT_SEASON } from './season';
import { buildWeekProjection, type WeekProjection } from './week-projections';
import type { WeekDaily } from './week-daily';
import { loadScheduleSeason } from './schedule-data';
import { weeksOf, buildDateIndex } from './espn-schedule';
import { getLeagueRosters, hasEspnCredentials } from './espn';

export function readWeekProjection(week: number, season = CURRENT_SEASON): WeekProjection | null {
  const file = path.join(process.cwd(), 'data', 'projections', String(season), `week-${String(week).padStart(2, '0')}.json`);
  try {
    return JSON.parse(readFileSync(file, 'utf-8')) as WeekProjection;
  } catch {
    return null; // week not frozen (yet) — the pop-up says so
  }
}

/** Day-by-day record written each morning by scripts/update-week-daily.mts. */
export function readWeekDaily(week: number, season = CURRENT_SEASON): WeekDaily | null {
  const file = path.join(process.cwd(), 'data', 'projections', String(season), `week-${String(week).padStart(2, '0')}-daily.json`);
  try {
    return JSON.parse(readFileSync(file, 'utf-8')) as WeekDaily;
  } catch {
    return null; // no finished day this week yet
  }
}

/**
 * A week that hasn't been frozen yet (a future week): the same numbers,
 * computed now from today's rosters. Not saved — rosters can still change.
 */
export async function previewWeekProjection(week: number): Promise<WeekProjection | null> {
  if (!hasEspnCredentials()) return null;
  try {
    const season = await loadScheduleSeason();
    const scoringPeriods = season ? weeksOf(season)[week] : undefined;
    if (!season || !scoringPeriods?.length) return null;
    const index = buildDateIndex(season.schedules);
    const league = await getLeagueRosters();
    return buildWeekProjection(
      league, week, scoringPeriods, scoringPeriods.map(sp => index.dateFor(sp)!),
      season.schedules, CURRENT_SEASON, new Date().toISOString(),
    );
  } catch (err) {
    console.error('Week preview failed:', err);
    return null;
  }
}
