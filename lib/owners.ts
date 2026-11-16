/**
 * One person, one name. ESPN shows the same owner under different names:
 * a display label ("Gelless"), the member's full name ("Dor Gelless"), or a
 * co-owned team ("Dor Gelless & the monkey comeback"). Records, head-to-head
 * and recap highlights compare owners through this, so a name change never
 * splits someone's history.
 */
import { OWNER_COLORS } from './owner-meta';

/** Short display labels used by lib/espn.ts → full owner name. */
const ALIASES: Record<string, string> = {
  Gelless: 'Dor Gelless',
  Barda: 'Dor Barda',
};

const KNOWN = new Set(Object.keys(OWNER_COLORS));

export function canonicalOwner(name: string): string {
  const n = name.trim();
  if (ALIASES[n]) return ALIASES[n];
  if (KNOWN.has(n)) return n;
  // Co-owned team: keep the league member we know.
  if (n.includes(' & ')) {
    const known = n.split(' & ').map(s => s.trim()).map(s => ALIASES[s] ?? s).find(s => KNOWN.has(s));
    if (known) return known;
  }
  return n;
}

export function sameOwner(a: string, b: string): boolean {
  return canonicalOwner(a) === canonicalOwner(b);
}
