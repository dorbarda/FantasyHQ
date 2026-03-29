import { hasEspnCredentials, getMatchupDepth } from '@/lib/espn';
import { NextResponse } from 'next/server';

// Cached for 24 h — completed weeks are historical and never change.
// All depth page tab variants (?tab=full, ?tab=stats, ?tab=playoff) share
// this single cached response instead of each doing 120+ ESPN calls.
export const revalidate = 86400;

export async function GET() {
  if (!hasEspnCredentials()) {
    return NextResponse.json({ rows: [], daysPerMatchup: 7, currentMatchupPeriod: 1, completedPeriods: [] });
  }
  try {
    const data = await getMatchupDepth();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ rows: [], daysPerMatchup: 7, currentMatchupPeriod: 1, completedPeriods: [] }, { status: 500 });
  }
}
