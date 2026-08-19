/**
 * Weekly recap — the story of one matchup week.
 *
 * Pure: every function here takes already-loaded data and returns a typed
 * result, with no fetching. That is what keeps it testable (see
 * lib/__tests__/recap.test.ts) and lets pages feed it from the nightly
 * snapshots instead of fanning out live ESPN calls.
 *
 * Spec: docs/RECAP-SPEC.md. Award names are league in-jokes chosen by the
 * league — use them verbatim; do not translate or reword them.
 */
import type { MatchupDepthRow, TransactionPlayer } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AwardId =
  | 'beatdown'      // עשה לו גלס
  | 'heartAttack'   // Heart Attack
  | 'ceiling'       // Ceiling
  | 'noLuck'        // לאילי אין מזל
  | 'slotzki'       // פרס הסלוצקי
  | 'grinder'       // עשה ברדה
  | 'sniper'        // Sniper
  | 'hotPickup';    // Hot Pickup

export interface AwardWinner {
  ownerName: string;
  teamName: string;
  /** Headline number for the tile (margin, score, players, efficiency…). */
  value: number;
  /** How the number should be shown. */
  format: 'score' | 'margin' | 'count' | 'decimal';
  teamScore?: number;
  opponentName?: string;
  opponentScore?: number;
  /** Only used by Hot Pickup, which is about a player rather than an owner. */
  playerName?: string;
  proTeam?: string;
}

export interface Award {
  id: AwardId;
  /** Display name, exactly as the league chose it. */
  name: string;
  /** Whether `name` is Hebrew, so the UI can set dir and font. */
  rtl: boolean;
  /** Small English subtitle shown under the name. */
  gloss: string;
  /** All tied recipients — never silently truncated to one. */
  winners: AwardWinner[];
}

export interface RecapMatchup {
  home: { ownerName: string; teamName: string; score: number };
  away: { ownerName: string; teamName: string; score: number };
  margin: number;
  /** Owner name of the winner, or null if the scores tied exactly. */
  winner: string | null;
}

export interface WeeklyRecap {
  week: number;
  awards: Award[];
  matchups: RecapMatchup[];
  /** Teams counted this week, after excluding ghosts. */
  teamCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Automated/placeholder teams, matching lib/espn-records.ts. */
function isGhost(row: MatchupDepthRow): boolean {
  return /fake/i.test(row.teamName) || /fake/i.test(row.ownerName);
}

/** A row can only feed matchup-level awards if it actually had an opponent. */
function hasOpponent(row: MatchupDepthRow): boolean {
  return Boolean(row.opponentName) && row.opponentName !== 'TBD';
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Rows for one completed week, ghosts removed. Returns [] when the week has
 * no rows or is still in progress, which callers render as "no recap yet"
 * rather than a half-filled page.
 */
function weekRows(rows: MatchupDepthRow[], week: number): MatchupDepthRow[] {
  const inWeek = rows.filter(r => r.matchupPeriod === week && !isGhost(r));
  if (inWeek.length === 0) return [];
  if (inWeek.some(r => r.won === null)) return []; // still playing
  return inWeek;
}

/**
 * Pick every row tied for the best `score`, so ties are shown rather than
 * resolved arbitrarily. `eligible` filters first; an empty result means the
 * award simply isn't given this week.
 */
function bestOf<T>(items: T[], score: (item: T) => number): T[] {
  if (items.length === 0) return [];
  const top = Math.max(...items.map(score));
  return items.filter(i => score(i) === top);
}

function toWinner(
  row: MatchupDepthRow,
  value: number,
  format: AwardWinner['format'],
): AwardWinner {
  return {
    ownerName: row.ownerName,
    teamName: row.teamName,
    value,
    format,
    teamScore: round1(row.teamScore),
    opponentName: row.opponentName,
    opponentScore: round1(row.opponentScore),
  };
}

// ─── Award definitions ────────────────────────────────────────────────────────

const META: Record<AwardId, { name: string; rtl: boolean; gloss: string }> = {
  beatdown:    { name: 'עשה לו גלס',    rtl: true,  gloss: 'Biggest blowout' },
  heartAttack: { name: 'Heart Attack',   rtl: false, gloss: 'Closest game' },
  ceiling:     { name: 'Ceiling',        rtl: false, gloss: 'Highest score' },
  noLuck:      { name: 'לאילי אין מזל', rtl: true,  gloss: 'Unluckiest loss' },
  slotzki:     { name: 'פרס הסלוצקי',   rtl: true,  gloss: 'Luckiest win' },
  grinder:     { name: 'עשה ברדה',      rtl: true,  gloss: 'Most starter games' },
  sniper:      { name: 'Sniper',         rtl: false, gloss: 'Best points per slot' },
  hotPickup:   { name: 'Hot Pickup',     rtl: false, gloss: 'Most added player' },
};

function award(id: AwardId, winners: AwardWinner[]): Award {
  return { id, ...META[id], winners };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

/** Weeks that have a renderable recap, newest first. */
export function listRecapWeeks(rows: MatchupDepthRow[]): number[] {
  const weeks = new Set(rows.map(r => r.matchupPeriod));
  return [...weeks]
    .filter(w => weekRows(rows, w).length > 0)
    .sort((a, b) => b - a);
}

/** The most recent week with a renderable recap, or null if there is none. */
export function latestRecapWeek(rows: MatchupDepthRow[]): number | null {
  return listRecapWeeks(rows)[0] ?? null;
}

export function computeWeeklyRecap(
  rows: MatchupDepthRow[],
  week: number,
  opts: { addsThisWeek?: TransactionPlayer[] } = {},
): WeeklyRecap | null {
  const wk = weekRows(rows, week);
  if (wk.length === 0) return null;

  const played = wk.filter(hasOpponent);
  const winners = played.filter(r => r.won === true);
  const losers = played.filter(r => r.won === false);
  const scores = wk.map(r => r.teamScore);

  const awards: Award[] = [];

  // עשה לו גלס — biggest margin of victory.
  const margin = (r: MatchupDepthRow) => r.teamScore - r.opponentScore;
  if (winners.length > 0) {
    awards.push(award('beatdown',
      bestOf(winners, margin).map(r => toWinner(r, round1(margin(r)), 'margin'))));
  }

  // Heart Attack — smallest margin of victory (best = smallest, so negate).
  if (winners.length > 0) {
    awards.push(award('heartAttack',
      bestOf(winners, r => -margin(r)).map(r => toWinner(r, round1(margin(r)), 'margin'))));
  }

  // Ceiling — highest single score, opponent or not.
  awards.push(award('ceiling',
    bestOf(wk, r => r.teamScore).map(r => toWinner(r, round1(r.teamScore), 'score'))));

  // לאילי אין מזל — the loser whose score would have beaten the most other
  // teams this week. Historical projections don't exist, so "should have won"
  // is measured against the rest of the league that week.
  const beatCount = (r: MatchupDepthRow) =>
    scores.filter(s => s < r.teamScore).length;
  if (losers.length > 0) {
    awards.push(award('noLuck',
      bestOf(losers, r => beatCount(r) * 1000 + r.teamScore) // ties → higher score
        .map(r => toWinner(r, beatCount(r), 'count'))));
  }

  // פרס הסלוצקי — the winner whose score would have lost to the most others.
  const loseCount = (r: MatchupDepthRow) =>
    scores.filter(s => s > r.teamScore).length;
  if (winners.length > 0) {
    awards.push(award('slotzki',
      bestOf(winners, r => loseCount(r) * 1000 - r.teamScore) // ties → lower score
        .map(r => toWinner(r, loseCount(r), 'count'))));
  }

  // עשה ברדה — most starter games used.
  awards.push(award('grinder',
    bestOf(wk, r => r.totalPlayers).map(r => toWinner(r, r.totalPlayers, 'count'))));

  // Sniper — best points per starter game.
  awards.push(award('sniper',
    bestOf(wk, r => r.efficiency).map(r => toWinner(r, r.efficiency, 'decimal'))));

  // Hot Pickup — needs per-week adds, which the transactions snapshot only
  // gains after the change in docs/RECAP-SPEC.md §4. Absent until then.
  const adds = opts.addsThisWeek ?? [];
  if (adds.length > 0) {
    const top = Math.max(...adds.map(a => a.addCount));
    awards.push(award('hotPickup', adds
      .filter(a => a.addCount === top)
      .map(a => ({
        ownerName: '',
        teamName: '',
        playerName: a.playerName,
        proTeam: a.proTeam,
        value: a.addCount,
        format: 'count' as const,
      }))));
  }

  return {
    week,
    awards: awards.filter(a => a.winners.length > 0),
    matchups: buildMatchups(played),
    teamCount: wk.length,
  };
}

/**
 * Rows arrive one per team, so each matchup appears twice. Pair them up and
 * emit each once, with the winner first.
 */
function buildMatchups(played: MatchupDepthRow[]): RecapMatchup[] {
  const seen = new Set<string>();
  const out: RecapMatchup[] = [];

  for (const row of played) {
    const key = [row.ownerName, row.opponentName].sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key);

    const opponent = played.find(r => r.ownerName === row.opponentName);
    const winnerFirst = row.won === true || row.teamScore >= row.opponentScore;
    const a = winnerFirst ? row : opponent ?? row;

    out.push({
      home: {
        ownerName: a.ownerName,
        teamName: a.teamName,
        score: round1(a.teamScore),
      },
      away: {
        ownerName: a.opponentName,
        teamName: opponent && opponent.ownerName === a.opponentName ? opponent.teamName : a.opponentName,
        score: round1(a.opponentScore),
      },
      margin: round1(Math.abs(row.teamScore - row.opponentScore)),
      winner: row.teamScore === row.opponentScore ? null : a.ownerName,
    });
  }

  return out.sort((x, y) => y.margin - x.margin);
}
