/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';

const ESPN_S2 = process.env.ESPN_S2;
const SWID = process.env.SWID;
const LEAGUE_ID = process.env.LEAGUE_ID;
const SEASON = process.env.SEASON || '2026';

const BASE = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${SEASON}/segments/0/leagues/${LEAGUE_ID}`;

async function espnGet(params: string) {
  const res = await fetch(`${BASE}${params}`, {
    headers: { Cookie: `espn_s2=${ESPN_S2}; SWID=${SWID}`, Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) return { error: res.status, url: `${BASE}${params}` };
  return res.json();
}

export async function GET() {
  if (!ESPN_S2 || !SWID || !LEAGUE_ID) {
    return NextResponse.json({ error: 'Missing ESPN credentials' }, { status: 400 });
  }

  // 1. Get current scoring period
  const status = await espnGet('?view=mTeam');
  const scoringPeriodId: number =
    status.scoringPeriodId ||
    status.status?.latestScoringPeriod ||
    status.status?.currentMatchupPeriod ||
    1;
  const currentMatchupPeriod: number = status.status?.currentMatchupPeriod || 1;

  // 2. Sample a few scoring periods to find trades (first 5, middle 5, last 5)
  const mid = Math.floor(scoringPeriodId / 2);
  const periodsToCheck = [
    ...Array.from({ length: 5 }, (_, i) => i + 1),
    ...Array.from({ length: 5 }, (_, i) => mid + i),
    ...Array.from({ length: 5 }, (_, i) => Math.max(1, scoringPeriodId - 4 + i)),
  ].filter((v, i, a) => a.indexOf(v) === i && v >= 1 && v <= scoringPeriodId);

  const results = await Promise.all(periodsToCheck.map(p => espnGet(`?view=mTransactions2&scoringPeriodId=${p}`)));

  const allTx: any[] = [];
  for (const r of results) allTx.push(...(r.transactions || []));

  // Deduplicate
  const seen = new Set<string>();
  const unique = allTx.filter(tx => {
    if (seen.has(tx.id)) return false;
    seen.add(tx.id);
    return true;
  });

  const trades = unique.filter(tx => (tx.type as string || '').toUpperCase().includes('TRADE'));

  return NextResponse.json({
    scoringPeriodId,
    currentMatchupPeriod,
    periodsChecked: periodsToCheck,
    totalTransactions: unique.length,
    totalTrades: trades.length,
    trades: trades.map(tx => ({
      id: tx.id,
      type: tx.type,
      status: tx.status,
      processDate: tx.processDate,
      executionDate: tx.executionDate,
      items: (tx.items || []).map((item: any) => ({
        type: item.type,
        playerId: item.playerId,
        fromTeamId: item.fromTeamId,
        toTeamId: item.toTeamId,
      })),
    })),
    // Also show all unique tx types seen
    txTypes: Array.from(new Set(unique.map((tx: any) => tx.type as string))),
  });
}
