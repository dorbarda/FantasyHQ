/**
 * Per-year playoff pool data — data/playoffs/<year>/{bets,results,fines}.json.
 *
 * Each season's pool lives in its own folder so history accumulates instead
 * of being overwritten. The main playoffs page loads the CURRENT_SEASON
 * year (empty until that season's folder is created), and the archive route
 * /nba-playoffs/[year] renders any past year from the same files.
 */
import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import { CURRENT_SEASON } from './season';
import type { OwnerPlayoffBets, PlayoffResults, PlayoffFine } from './types';

export interface PlayoffYearData {
  year: number;
  bets: OwnerPlayoffBets[];
  results: PlayoffResults;
  fines: PlayoffFine[];
}

const PLAYOFFS_DIR = path.join(process.cwd(), 'data', 'playoffs');

function readJson<T>(year: number, file: string): T | null {
  try {
    return JSON.parse(readFileSync(path.join(PLAYOFFS_DIR, String(year), file), 'utf-8')) as T;
  } catch {
    return null;
  }
}

/** Load one year's pool, or null if that year has no data folder. */
export function loadPlayoffYear(year: number): PlayoffYearData | null {
  const betsFile = readJson<{ owners: OwnerPlayoffBets[] }>(year, 'bets.json');
  const results = readJson<PlayoffResults>(year, 'results.json');
  if (!betsFile || !results) return null;
  return {
    year,
    bets: betsFile.owners,
    results,
    fines: readJson<PlayoffFine[]>(year, 'fines.json') ?? [],
  };
}

/** The active season's pool; empty structures until its folder exists. */
export function loadCurrentPlayoffs(): PlayoffYearData {
  return (
    loadPlayoffYear(CURRENT_SEASON) ?? {
      year: CURRENT_SEASON,
      bets: [],
      results: { playIn: [], series: [] },
      fines: [],
    }
  );
}

/** Years that have pool data, newest first. */
export function listPlayoffYears(): number[] {
  try {
    return readdirSync(PLAYOFFS_DIR)
      .map(Number)
      .filter(y => Number.isInteger(y) && loadPlayoffYear(y) !== null)
      .sort((a, b) => b - a);
  } catch {
    return [];
  }
}
