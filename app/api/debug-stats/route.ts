/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Diagnostic endpoint — shows the raw ESPN stats payload for a few sampled players
 * from every data source we use, for both year=2025 and year=2026.
 *
 * GET /api/debug-stats
 * GET /api/debug-stats?year=2025         — single year
 * GET /api/debug-stats?playerId=3934672  — filter to one player (Jalen Brunson)
 */
import { NextResponse } from 'next/server';

const ESPN_S2   = process.env.ESPN_S2;
const SWID      = process.env.SWID;
const LEAGUE_ID = process.env.LEAGUE_ID;

function base(year: number) {
  return `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${year}/segments/0/leagues/${LEAGUE_ID}`;
}

async function get(year: number, params: string, extraHeaders?: Record<string, string>) {
  const res = await fetch(`${base(year)}${params}`, {
    headers: {
      Cookie: `espn_s2=${ESPN_S2}; SWID=${SWID}`,
      Accept: 'application/json',
      ...extraHeaders,
    },
    cache: 'no-store',
  });
  if (!res.ok) return { __error: res.status, __url: `${base(year)}${params}` };
  return res.json();
}

/** Summarise a player's stats array into something readable */
function summariseStats(stats: any[], label: string) {
  return {
    source: label,
    rowCount: stats.length,
    rows: stats.map((s: any) => ({
      statSourceId:    s.statSourceId,
      statSplitTypeId: s.statSplitTypeId,
      scoringPeriodId: s.scoringPeriodId,
      appliedStatTotal: s.appliedStatTotal,
      // Key counting stats (ESPN stat IDs)
      PTS: s.stats?.['0'],
      BLK: s.stats?.['1'],
      STL: s.stats?.['2'],
      AST: s.stats?.['3'],
      REB: s.stats?.['6'],
      TO:  s.stats?.['11'],
      FGM: s.stats?.['13'],
      FGA: s.stats?.['14'],
      FTM: s.stats?.['15'],
      FTA: s.stats?.['16'],
      '3PM': s.stats?.['17'],
      GP_raw: s.stats?.['40'],  // divide by 30 to get GP
      // Special stats — verifying IDs
      stat38_TD_assumed:  s.stats?.['38'],
      stat39_QD_assumed:  s.stats?.['39'],  // ← need to confirm this is QD
      stat41_TF_assumed:  s.stats?.['41'],
      stat42_EJ_assumed:  s.stats?.['42'],
      // Dump any stat IDs with non-zero values we haven't mapped yet
      unknownNonZero: Object.entries(s.stats || {})
        .filter(([id, v]) =>
          !['0','1','2','3','6','11','13','14','15','16','17','38','39','40','41','42'].includes(id) &&
          (v as number) !== 0
        )
        .map(([id, v]) => ({ id, value: v })),
    })),
  };
}

export async function GET(req: Request) {
  if (!ESPN_S2 || !SWID || !LEAGUE_ID) {
    return NextResponse.json({ error: 'Missing ESPN credentials' }, { status: 400 });
  }

  const url = new URL(req.url);
  const filterPlayerId = url.searchParams.get('playerId')
    ? parseInt(url.searchParams.get('playerId')!)
    : null;
  const yearParam = url.searchParams.get('year')
    ? parseInt(url.searchParams.get('year')!)
    : null;

  const years = yearParam ? [yearParam] : [2025, 2026];
  const result: any = {};

  for (const year of years) {
    const yearKey = `year_${year}`;
    result[yearKey] = {};

    // ── Source A: mRoster ──────────────────────────────────────────────────────
    try {
      const data = await get(year, '?view=mRoster&view=mTeam');
      const players: any[] = [];
      for (const team of (data.teams || [])) {
        for (const entry of (team.roster?.entries || [])) {
          const p = entry.playerPoolEntry?.player;
          if (!p) continue;
          if (filterPlayerId && p.id !== filterPlayerId) continue;
          players.push({
            id:   p.id,
            name: p.fullName,
            defaultPositionId: p.defaultPositionId,
            proTeamId: p.proTeamId,
            ...summariseStats(p.stats || [], 'mRoster'),
          });
          if (!filterPlayerId && players.length >= 3) break;
        }
        if (!filterPlayerId && players.length >= 3) break;
      }
      result[yearKey].mRoster = players.length ? players : { note: 'no players found' };
    } catch (e: any) {
      result[yearKey].mRoster = { error: e.message };
    }

    // ── Source B: kona — same filter the draft page uses ──────────────────────
    for (const value of [17, 25]) {
      const konaKey = `kona_value${value}`;
      try {
        const filter = JSON.stringify({
          players: {
            limit: 10,
            sortAppliedStatTotal: { sortAsc: false, sortPriority: 1, value: `00${year}` },
            filterStatsForTopScoringPeriodIds: { value, additionalValue: [`00${year}`] },
            ...(filterPlayerId ? { filterByPlayerIds: { value: [filterPlayerId] } } : {}),
          },
        });
        const data = await get(year, '?view=kona_player_info', { 'x-fantasy-filter': filter });
        const players: any[] = [];
        for (const entry of (data.players || [])) {
          const p = entry.playerPoolEntry?.player;
          if (!p) continue;
          if (filterPlayerId && p.id !== filterPlayerId) continue;
          players.push({
            id:   p.id,
            name: p.fullName,
            onRosterTeamId: entry.onTeamId,
            ...summariseStats(p.stats || [], konaKey),
          });
          if (!filterPlayerId && players.length >= 3) break;
        }
        result[yearKey][konaKey] = players.length ? players : { note: 'no matching players in top-10' };
      } catch (e: any) {
        result[yearKey][konaKey] = { error: e.message };
      }
    }

    // ── Source C: kona with filterByPlayerIds (if provided) ───────────────────
    if (filterPlayerId) {
      try {
        const filter = JSON.stringify({
          players: {
            limit: 5,
            filterByPlayerIds: { value: [filterPlayerId] },
            filterStatsForTopScoringPeriodIds: { value: 25, additionalValue: [`00${year}`] },
          },
        });
        const data = await get(year, '?view=kona_player_info', { 'x-fantasy-filter': filter });
        const players: any[] = [];
        for (const entry of (data.players || [])) {
          const p = entry.playerPoolEntry?.player;
          if (!p) continue;
          players.push({
            id:   p.id,
            name: p.fullName,
            onRosterTeamId: entry.onTeamId,
            ...summariseStats(p.stats || [], 'kona_filterByPlayerIds'),
          });
        }
        result[yearKey].kona_filterByPlayerIds = players.length
          ? players
          : { note: 'filterByPlayerIds returned no results' };
      } catch (e: any) {
        result[yearKey].kona_filterByPlayerIds = { error: e.message };
      }
    }
  }

  return NextResponse.json(result, { status: 200 });
}
