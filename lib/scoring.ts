/**
 * League scoring rules — single source of truth.
 *
 * All fantasy-point calculations across the site must go through computeFP()
 * so that changing a multiplier here automatically propagates everywhere.
 *
 * ESPN stat IDs used:
 *   0  = PTS  (Points)
 *   1  = BLK  (Blocks)
 *   2  = STL  (Steals)
 *   3  = AST  (Assists)
 *   6  = REB  (Rebounds)
 *   11 = TO   (Turnovers)
 *   13 = FGM  (Field Goals Made)
 *   14 = FGA  (Field Goals Attempted)
 *   15 = FTM  (Free Throws Made)
 *   16 = FTA  (Free Throws Attempted)
 *   17 = 3PM  (Three Pointers Made)
 *   38 = TD   (Triple Doubles)
 *   39 = QD   (Quadruple Doubles) — ESPN stat ID assumed; verify via /api/debug-stats
 *   40 = GP×30 (Games Played encoded as GP×30 — NOT a scoring stat, used for GP calc only)
 *   41 = TF   (Technical Fouls)
 *   42 = EJ   (Ejections)
 */

/** Maps ESPN stat ID → our league's point multiplier */
export const SCORING: Readonly<Record<string, number>> = {
  '0':   1,   // PTS   ×1
  '1':   4,   // BLK   ×4
  '2':   4,   // STL   ×4
  '3':   2,   // AST   ×2
  '6':   1,   // REB   ×1
  '11': -2,   // TO    ×-2
  '13':  2,   // FGM   ×2
  '14': -1,   // FGA   ×-1
  '15':  1,   // FTM   ×1
  '16': -1,   // FTA   ×-1
  '17':  1,   // 3PM   ×1
  '38':  5,   // TD    ×5
  '39': 100,  // QD    ×100
  '41': -2,   // TF    ×-2
  '42': -5,   // EJ    ×-5
};

/** Human-readable label for each ESPN stat ID (for display / debugging) */
export const STAT_LABELS: Readonly<Record<string, string>> = {
  '0':  'PTS',
  '1':  'BLK',
  '2':  'STL',
  '3':  'AST',
  '6':  'REB',
  '11': 'TO',
  '13': 'FGM',
  '14': 'FGA',
  '15': 'FTM',
  '16': 'FTA',
  '17': '3PM',
  '38': 'TD',
  '39': 'QD',
  '40': 'GP×30',
  '41': 'TF',
  '42': 'EJ',
};

/**
 * Compute league fantasy points from a raw ESPN stats map.
 * Works for both season totals and per-game averages —
 * just pass whichever stat map you have.
 */
export function computeFP(stats: Record<string, number>): number {
  let total = 0;
  for (const [id, mult] of Object.entries(SCORING)) {
    total += (stats[id] || 0) * mult;
  }
  return Math.round(total * 10) / 10;
}

/**
 * Extract games played from a raw ESPN stats map.
 * ESPN encodes GP as GP×30 in stat ID 40.
 */
export function getGP(stats: Record<string, number>): number {
  return Math.round((stats['40'] || 0) / 30);
}

/**
 * Find the full-season actual stat row from ESPN's player.stats array.
 * Returns the raw stats map (stat ID → value), or {} if not found.
 *
 * ESPN's stats array can contain rows from multiple seasons; we prefer
 * statSplitTypeId=0 (full-season totals) + statSourceId=0 (actual, not projected).
 * When multiple such rows exist (cross-season contamination), we pick the one
 * with the highest PTS since that's always the most recent active season.
 */
export function extractSeasonStats(playerStats: unknown[]): Record<string, number> {
  const stats = playerStats as Array<Record<string, unknown>>;

  const actualTotals = stats.filter(
    s => s['statSourceId'] === 0 && s['statSplitTypeId'] === 0
  );

  const best =
    actualTotals.length === 1
      ? actualTotals[0]
      : actualTotals.sort(
          (a, b) =>
            ((b['stats'] as Record<string, number>)?.['0'] ?? 0) -
            ((a['stats'] as Record<string, number>)?.['0'] ?? 0)
        )[0] ||
        // Fallback: any actual row with scoringPeriodId=0
        stats.find(s => s['statSourceId'] === 0 && s['scoringPeriodId'] === 0) ||
        // Last resort: highest-PTS actual row
        [...stats]
          .filter(s => s['statSourceId'] === 0)
          .sort(
            (a, b) =>
              ((b['stats'] as Record<string, number>)?.['0'] ?? 0) -
              ((a['stats'] as Record<string, number>)?.['0'] ?? 0)
          )[0];

  return (best?.['stats'] as Record<string, number>) || {};
}

/**
 * Find the per-game actual stat row from ESPN's player.stats array.
 * statSplitTypeId=1 = per-game averages.
 * Falls back to dividing season totals by GP.
 */
export function extractPerGameStats(playerStats: unknown[]): Record<string, number> {
  const stats = playerStats as Array<Record<string, unknown>>;

  const pg = stats.find(s => s['statSourceId'] === 0 && s['statSplitTypeId'] === 1);
  if (pg?.['stats']) return pg['stats'] as Record<string, number>;

  // Fall back to totals ÷ GP
  const s = extractSeasonStats(playerStats);
  const gp = Math.max(1, getGP(s));
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(s)) out[k] = (v as number) / gp;
  return out;
}
