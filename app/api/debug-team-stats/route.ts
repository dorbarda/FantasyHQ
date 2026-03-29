/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Debug endpoint — shows computed team season stat totals for any year.
 * Uses the same roster-summation logic as the category radar.
 *
 * GET /api/debug-team-stats?year=2025
 */
import { NextResponse } from 'next/server';
import { extractSeasonStats } from '@/lib/scoring';

const ESPN_S2   = process.env.ESPN_S2;
const SWID      = process.env.SWID;
const LEAGUE_ID = process.env.LEAGUE_ID;

export async function GET(req: Request) {
  if (!ESPN_S2 || !SWID || !LEAGUE_ID) {
    return NextResponse.json({ error: 'Missing ESPN credentials' }, { status: 400 });
  }

  const year = new URL(req.url).searchParams.get('year') || '2025';
  const base = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${year}/segments/0/leagues/${LEAGUE_ID}`;

  const res = await fetch(`${base}?view=mTeam&view=mRoster`, {
    headers: { Cookie: `espn_s2=${ESPN_S2}; SWID=${SWID}`, Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) return NextResponse.json({ error: `ESPN ${res.status}` }, { status: 502 });
  const data = await res.json();

  const memberMap: Record<string, string> = {};
  for (const m of (data.members || []) as any[]) {
    memberMap[m.id] = `${m.firstName} ${m.lastName}`.trim();
  }

  const STAT_IDS: Record<string, string> = {
    pts: '0', blk: '1', stl: '2', ast: '3', reb: '6',
    to: '11', fgm: '13', fga: '14', ftm: '15', fta: '16', tpm: '17',
  };

  const results = (data.teams as any[]).map(team => {
    const ownerName = (team.owners || [])
      .map((id: string) => memberMap[id] || 'Unknown')
      .join(' & ');

    const totals: Record<string, number> = {};
    for (const id of Object.values(STAT_IDS)) totals[id] = 0;

    let playerCount = 0;
    for (const entry of (team.roster?.entries || []) as any[]) {
      const p = entry.playerPoolEntry?.player;
      if (!p) continue;
      const s = extractSeasonStats(p.stats || []);
      for (const id of Object.values(STAT_IDS)) totals[id] += s[id] || 0;
      playerCount++;
    }

    const fgPct = totals['14'] > 0 ? (totals['13'] / totals['14'] * 100).toFixed(2) + '%' : '—';
    const ftPct = totals['16'] > 0 ? (totals['15'] / totals['16'] * 100).toFixed(2) + '%' : '—';

    return {
      teamName: team.name,
      ownerName,
      playerCount,
      PTS:  Math.round(totals['0']),
      REB:  Math.round(totals['6']),
      AST:  Math.round(totals['3']),
      STL:  Math.round(totals['2']),
      BLK:  Math.round(totals['1']),
      '3PM': Math.round(totals['17']),
      TO:   Math.round(totals['11']),
      FGM:  Math.round(totals['13']),
      FGA:  Math.round(totals['14']),
      FTM:  Math.round(totals['15']),
      FTA:  Math.round(totals['16']),
      'FG%': fgPct,
      'FT%': ftPct,
    };
  });

  return NextResponse.json({ year, teams: results }, { status: 200 });
}
