/**
 * Loading side of the trade suggestions: the week files the Monday skill
 * commits to data/trades/<season>/week-NN.json. Read with fs at request time
 * (the /trades pages are dynamic, behind a passcode), so next.config.mjs
 * traces data/trades into those routes only.
 */
import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import { CURRENT_SEASON } from './season';
import type { TradeWeekFile } from './trade-output';

function dir(season: number) {
  return path.join(process.cwd(), 'data', 'trades', String(season));
}

/** Weeks with a file, newest first. */
export function listTradeWeeks(season = CURRENT_SEASON): number[] {
  try {
    return readdirSync(dir(season))
      .map(f => /^week-(\d+)\.json$/.exec(f)?.[1])
      .filter((w): w is string => !!w)
      .map(Number)
      .sort((a, b) => b - a);
  } catch {
    return [];
  }
}

export function loadTradeWeek(week: number, season = CURRENT_SEASON): TradeWeekFile | null {
  try {
    const file = path.join(dir(season), `week-${String(week).padStart(2, '0')}.json`);
    const parsed = JSON.parse(readFileSync(file, 'utf-8')) as TradeWeekFile;
    return Array.isArray(parsed?.teams) ? parsed : null;
  } catch {
    return null;
  }
}

export function loadLatestTradeWeek(season = CURRENT_SEASON): TradeWeekFile | null {
  const [latest] = listTradeWeeks(season);
  return latest === undefined ? null : loadTradeWeek(latest, season);
}
