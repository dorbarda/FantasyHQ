/* eslint-disable @typescript-eslint/no-explicit-any */
import { hasEspnCredentials } from './espn';

const ESPN_S2   = process.env.ESPN_S2;
const SWID      = process.env.SWID;
const LEAGUE_ID = process.env.LEAGUE_ID;

const PRO_TEAMS: Record<number, string> = {
  1:'ATL', 2:'BOS', 3:'NOP', 4:'CHI', 5:'CLE', 6:'DAL', 7:'DEN', 8:'DET',
  9:'GSW', 10:'HOU', 11:'IND', 12:'LAC', 13:'LAL', 14:'MIA', 15:'MIL',
  16:'MIN', 17:'BKN', 18:'NYK', 19:'ORL', 20:'PHI', 21:'PHX', 22:'POR',
  23:'SAC', 24:'SAS', 25:'OKC', 26:'UTA', 27:'WAS', 28:'TOR', 29:'MEM',
  30:'CHA',
};

const POS_MAP: Record<number, string> = {
  1: 'PG', 2: 'SG', 3: 'SF', 4: 'PF', 5: 'C', 6: 'G', 7: 'F', 8: 'F',
};

export interface StatLine {
  pts: number; // league fantasy points (ESPN appliedTotal)
  gp: number;
  avg: number; // pts / gp
}

export interface ProjectionRow {
  playerId: number;
  name: string;
  position: string;
  proTeam: string;
  projLast: StatLine | null; // projection made for last season
  actLast: StatLine | null;  // what actually happened last season
  projNext: StatLine | null; // projection for the upcoming season
}

function line(stat: any): StatLine | null {
  if (!stat) return null;
  const pts = Math.round(stat.appliedTotal ?? 0);
  const gp = stat.stats?.['42'] ?? 0; // ESPN stat 42 = games played
  if (!pts && !gp) return null;
  return { pts, gp, avg: gp > 0 ? Math.round((pts / gp) * 10) / 10 : 0 };
}

/**
 * Projections for the upcoming season next to last season's projection and
 * actuals. `season` is the upcoming season (ending year), e.g. 2027.
 * ESPN ids: 10YYYY = projection, 00YYYY = actual.
 */
export async function getProjectionRows(season: number, limit = 200): Promise<ProjectionRow[]> {
  if (!hasEspnCredentials()) return [];
  const last = season - 1;
  try {
    const filter = JSON.stringify({
      players: {
        limit,
        sortAppliedStatTotal: { sortAsc: false, sortPriority: 1, value: `10${season}` },
        filterStatsForTopScoringPeriodIds: {
          value: 5,
          additionalValue: [`10${season}`, `00${last}`, `10${last}`],
        },
      },
    });
    const res = await fetch(
      `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${season}/segments/0/leagues/${LEAGUE_ID}?view=kona_player_info`,
      {
        headers: {
          Cookie: `espn_s2=${ESPN_S2}; SWID=${SWID}`,
          Accept: 'application/json',
          'x-fantasy-filter': filter,
        },
        next: { revalidate: 3600 },
      },
    );
    if (!res.ok) throw new Error(`ESPN ${res.status}`);
    const data = await res.json();

    const rows: ProjectionRow[] = [];
    for (const entry of (data.players || []) as any[]) {
      const p = entry.player;
      if (!p) continue;
      const byId = (id: string) => (p.stats || []).find((s: any) => s.id === id);
      const projNext = line(byId(`10${season}`));
      if (!projNext) continue;
      rows.push({
        playerId: p.id,
        name: p.fullName || `Player ${p.id}`,
        position: POS_MAP[p.defaultPositionId] || '—',
        proTeam: PRO_TEAMS[p.proTeamId] || '—',
        projLast: line(byId(`10${last}`)),
        actLast: line(byId(`00${last}`)),
        projNext,
      });
    }
    return rows;
  } catch (e) {
    console.error('[draft-prep] projections failed:', e);
    return [];
  }
}
