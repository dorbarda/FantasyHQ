/**
 * Expected return dates for injured players. ESPN's roster views (mRoster)
 * leave `injuryDetails` empty; the player card view fills it in, e.g.
 * `{ expectedReturnDate: [2026, 11, 21], outForSeason: false, type: 'Foot' }`.
 * The projections use it so an OUT player counts again from his return date
 * instead of missing the whole week (lib/week-projections.ts firstPlayableDay).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

/** Players of every roster in the given league responses. */
function rosterPlayers(leagues: any[]): any[] {
  return leagues.flatMap(l => (l?.teams || []) as any[])
    .flatMap(t => (t.roster?.entries || []) as any[])
    .map(e => e.playerPoolEntry?.player)
    .filter(Boolean);
}

/** Ids of rostered players who are not ACTIVE — the ones a card is needed for. */
export function injuredPlayerIds(leagues: any[]): number[] {
  const ids = rosterPlayers(leagues)
    .filter(p => p.injuryStatus && p.injuryStatus !== 'ACTIVE' && typeof p.id === 'number')
    .map(p => p.id as number);
  return [...new Set(ids)];
}

/** The `?view=kona_playercard` request for those players. */
export function playerCardRequest(ids: number[]): { params: string; headers: Record<string, string> } {
  return {
    params: '?view=kona_playercard',
    headers: { 'x-fantasy-filter': JSON.stringify({ players: { filterIds: { value: ids } } }) },
  };
}

/** Copies `injuryDetails` from a player card response onto the roster players. Returns how many got one. */
export function applyInjuryDetails(leagues: any[], cards: any): number {
  const byId = new Map<number, any>();
  for (const x of (cards?.players || []) as any[]) {
    const p = x?.player;
    if (p?.id && p.injuryDetails) byId.set(p.id, p.injuryDetails);
  }
  let n = 0;
  for (const p of rosterPlayers(leagues)) {
    const d = byId.get(p.id);
    if (d) { p.injuryDetails = d; n++; }
  }
  return n;
}

/**
 * Fetches the cards and fills in `injuryDetails` on the given league responses
 * (mutates them). Never throws: without the dates, OUT players simply miss
 * their next game only.
 */
export async function attachInjuryDetails(
  leagues: any[],
  fetchJson: (params: string, headers: Record<string, string>) => Promise<any>,
): Promise<void> {
  const ids = injuredPlayerIds(leagues);
  if (ids.length === 0) return;
  try {
    const { params, headers } = playerCardRequest(ids);
    applyInjuryDetails(leagues, await fetchJson(params, headers));
  } catch (err) {
    console.error('Injury details fetch failed:', err);
  }
}
