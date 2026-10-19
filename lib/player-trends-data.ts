/**
 * Loading side of the home page's player trends (lib/player-trends.ts).
 *
 * Built nightly into data/snapshots/player-trends.json. The preseason
 * projection is frozen once per season into
 * data/projections/<season>/preseason-ranks.json: ESPN keeps updating its
 * season projection during the season, so "projected at season start" has to
 * be saved before opening night. The file is written only when missing.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { readSnapshot } from './snapshots';
import { CURRENT_SEASON } from './season';
import {
  RELEVANT_TOP,
  rankByValue,
  type PlayerTrendsData,
  type PreseasonRank,
  type TrendPlayer,
} from './player-trends';

/** Players stored for the last-30 list — more than shown. */
const STORED_LAST30 = 20;

function preseasonFile(season: number): string {
  return path.join(process.cwd(), 'data', 'projections', String(season), 'preseason-ranks.json');
}

function readPreseasonRanks(season: number): PreseasonRank[] | null {
  try {
    return JSON.parse(readFileSync(preseasonFile(season), 'utf-8')).players as PreseasonRank[];
  } catch {
    return null;
  }
}

/** Returns null before opening night (nobody has points yet). */
export async function buildPlayerTrendsSnapshot(): Promise<PlayerTrendsData | null> {
  // Imported here so a page-side import never loads the ESPN client.
  const { getPlayerPool } = await import('./espn');
  const pool = await getPlayerPool();
  const started = pool.some(p => p.seasonPts !== 0);

  let preseason = readPreseasonRanks(CURRENT_SEASON);
  if (!preseason) {
    const projected = pool.filter(p => p.projPts > 0);
    const ranks = rankByValue(projected, p => p.projPts);
    preseason = projected
      .map(p => ({ playerId: p.playerId, name: p.name, projPts: p.projPts, rank: ranks.get(p)! }))
      .sort((a, b) => a.rank - b.rank);
    if (preseason.length > 0) {
      mkdirSync(path.dirname(preseasonFile(CURRENT_SEASON)), { recursive: true });
      writeFileSync(
        preseasonFile(CURRENT_SEASON),
        JSON.stringify({ frozenAt: new Date().toISOString(), seasonStarted: started, players: preseason }, null, 1) + '\n',
      );
      console.log(`🧊 preseason ranks frozen (${preseason.length} players)${started ? ' — season already started!' : ''}`);
    }
  }
  if (!started) return null;

  const projRank = new Map(preseason.map(p => [p.playerId, p.rank]));
  const ranks = rankByValue(pool, p => p.seasonPts);
  const players: TrendPlayer[] = pool.map(p => ({
    playerId: p.playerId,
    name: p.name,
    proTeam: p.proTeam,
    ownerName: p.ownerName,
    seasonPts: p.seasonPts,
    gp: p.gp,
    last30Pts: p.last30Pts,
    rank: ranks.get(p)!,
    projRank: projRank.get(p.playerId) ?? null,
  }));

  // Keep only who the page can show: the last-30 leaders and both top-100s.
  const last30Ids = new Set(
    [...players].sort((a, b) => b.last30Pts - a.last30Pts).slice(0, STORED_LAST30).map(p => p.playerId)
  );
  return {
    players: players
      .filter(p => last30Ids.has(p.playerId) || p.rank <= RELEVANT_TOP || (p.projRank ?? Infinity) <= RELEVANT_TOP)
      .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name)),
  };
}

/** Snapshot-only: a page render must never call ESPN for this. */
export function loadPlayerTrends(): PlayerTrendsData | null {
  return readSnapshot<PlayerTrendsData>('player-trends')?.data ?? null;
}
