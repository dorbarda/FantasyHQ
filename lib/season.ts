/**
 * Season configuration — single source of truth.
 *
 * A season is identified by its ENDING year, matching ESPN's convention:
 * the 2025-26 season is 2026. To start a new season, set the SEASON env
 * var (Vercel project env + GitHub Actions `SEASON` variable) — no code
 * changes needed. Every year-dependent module derives from this file.
 */

/** First season the league played on ESPN. */
export const FIRST_SEASON = 2021;

/** The active season (ESPN season id = ending year). */
export const CURRENT_SEASON = parseInt(process.env.SEASON || '2026', 10);

/** "2026" → "2025-26" */
export function seasonLabel(year: number): string {
  return `${year - 1}-${String(year).slice(2)}`;
}

export const CURRENT_SEASON_LABEL = seasonLabel(CURRENT_SEASON);

/** Every season from the league's first to the current one, ascending. */
export const ALL_SEASONS: number[] = Array.from(
  { length: Math.max(1, CURRENT_SEASON - FIRST_SEASON + 1) },
  (_, i) => FIRST_SEASON + i,
);
