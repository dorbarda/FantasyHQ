/**
 * Reads the frozen start-of-week projections written every Sunday by
 * scripts/freeze-week-projections.mts. Server only (fs).
 */
import { readFileSync } from 'fs';
import path from 'path';
import { CURRENT_SEASON } from './season';
import type { WeekProjection } from './week-projections';

export function readWeekProjection(week: number, season = CURRENT_SEASON): WeekProjection | null {
  const file = path.join(process.cwd(), 'data', 'projections', String(season), `week-${String(week).padStart(2, '0')}.json`);
  try {
    return JSON.parse(readFileSync(file, 'utf-8')) as WeekProjection;
  } catch {
    return null; // week not frozen (yet) — the pop-up says so
  }
}
