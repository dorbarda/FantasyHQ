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
import type { MatchupDepthRow, HistoryMatchup, WeeklyTopPlayer, BenchGame } from './types';
import { canonicalOwner } from './owners';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AwardId =
  | 'noLuck'        // לאילי אין מזל
  | 'slotzki';      // פרס הסלוצקי

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

export type HighlightId =
  | 'allTimeHigh' | 'seasonHigh' | 'personalBest'
  | 'allTimeLow' | 'seasonLow'
  | 'playerRecord' | 'upset' | 'benchBlunder';

/** A "season highlight" — something that only happens on some weeks. */
export interface SeasonHighlight {
  id: HighlightId;
  emoji: string;
  title: string;
  /** Owner it is about (empty for a player record). */
  ownerName: string;
  teamName: string;
  /** Player it is about, for player highlights. */
  playerName?: string;
  proTeam?: string;
  /** Headline number. */
  value: number;
  /** One line: what happened and what it beat. */
  detail: string;
}

export interface WeeklyRecap {
  week: number;
  awards: Award[];
  highlights: SeasonHighlight[];
  /** Sentences for the "Story of the week" box. */
  story: string[];
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
  noLuck:      { name: 'לאילי אין מזל', rtl: true,  gloss: 'Unluckiest loss' },
  slotzki:     { name: 'פרס הסלוצקי',   rtl: true,  gloss: 'Luckiest win' },
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

export interface RecapContext {
  /** Finished games from earlier seasons (lib/espn-records.ts). */
  pastSeasons?: HistoryMatchup[];
  /** Top 10 players per week of this season. */
  topPlayersByWeek?: { matchupPeriod: number; players: WeeklyTopPlayer[] }[];
  /** Biggest bench games per week of this season. */
  benchGamesByWeek?: { matchupPeriod: number; games: BenchGame[] }[];
}

export function computeWeeklyRecap(
  rows: MatchupDepthRow[],
  week: number,
  ctx: RecapContext = {},
): WeeklyRecap | null {
  const wk = weekRows(rows, week);
  if (wk.length === 0) return null;

  const played = wk.filter(hasOpponent);
  const winners = played.filter(r => r.won === true);
  const losers = played.filter(r => r.won === false);
  const scores = wk.map(r => r.teamScore);

  const awards: Award[] = [];

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

  const matchups = buildMatchups(played);
  const highlights = computeHighlights(rows, week, wk, ctx);

  return {
    week,
    awards: awards.filter(a => a.winners.length > 0),
    highlights,
    story: buildStory(rows, week, highlights, matchups),
    matchups,
    teamCount: wk.length,
  };
}

// ─── Season highlights ────────────────────────────────────────────────────────
//
// Scores are compared as they are (decided 2026-11-16), even though weeks
// differ in length. Only regular-season games count for score records:
// playoff rounds can span two weeks, so their totals aren't comparable.
// Upsets use every past meeting, playoffs included.

/** Below this, a bench game isn't worth a highlight. */
export const BENCH_MIN_POINTS = 40;
/** Personal best only counts once an owner has this many past weeks. */
const PERSONAL_BEST_MIN_WEEKS = 10;

interface PastScore { owner: string; score: number; where: string }

function fmt(n: number): string {
  return Number.isInteger(n) ? n.toLocaleString('en-US') : n.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

function pick<T>(items: T[], score: (t: T) => number): T {
  return items.reduce((a, b) => (score(b) > score(a) ? b : a));
}

function computeHighlights(
  rows: MatchupDepthRow[],
  week: number,
  wk: MatchupDepthRow[],
  ctx: RecapContext,
): SeasonHighlight[] {
  const out: SeasonHighlight[] = [];
  const past = (ctx.pastSeasons ?? []).filter(m => !m.isPlayoff);
  const thisSeasonBefore = rows.filter(r => r.matchupPeriod < week && !isGhost(r));

  const seasonScores: PastScore[] = thisSeasonBefore.map(r => ({
    owner: canonicalOwner(r.ownerName), score: r.teamScore, where: `Week ${r.matchupPeriod}`,
  }));
  const allScores: PastScore[] = [
    ...past.flatMap(m => [m.home, m.away].map(side => ({
      owner: canonicalOwner(side.ownerName), score: side.score, where: `Week ${m.week} · ${m.seasonLabel}`,
    }))),
    ...seasonScores.map(p => ({ ...p, where: `${p.where} · this season` })),
  ];
  const nameOf = (owner: string) =>
    rows.find(r => canonicalOwner(r.ownerName) === owner)?.ownerName ?? owner;
  const ownerHL = (
    id: HighlightId, emoji: string, title: string, r: MatchupDepthRow, detail: string,
  ): SeasonHighlight => ({
    id, emoji, title, ownerName: r.ownerName, teamName: r.teamName, value: round1(r.teamScore), detail,
  });

  // ── Highest score: all-time, else season. ──
  const top = Math.max(...wk.map(r => r.teamScore));
  const topRows = wk.filter(r => r.teamScore === top);
  const highDone = new Set<string>();
  if (past.length > 0 && allScores.length > 0) {
    const best = pick(allScores, p => p.score);
    if (top > best.score) {
      for (const r of topRows) {
        out.push(ownerHL('allTimeHigh', '👑', 'All-time record week', r,
          `Highest score in league history. Old record: ${fmt(best.score)} by ${nameOf(best.owner)} (${best.where})`));
        highDone.add(canonicalOwner(r.ownerName));
      }
    }
  }
  if (highDone.size === 0 && seasonScores.length > 0) {
    const best = pick(seasonScores, p => p.score);
    if (top > best.score) {
      for (const r of topRows) {
        out.push(ownerHL('seasonHigh', '🔥', 'Season-high week', r,
          `Highest score this season. Old high: ${fmt(best.score)} by ${nameOf(best.owner)} (${best.where})`));
        highDone.add(canonicalOwner(r.ownerName));
      }
    }
  }

  // ── Personal best (all-time, own history). ──
  for (const r of wk) {
    const owner = canonicalOwner(r.ownerName);
    const mine = allScores.filter(p => p.owner === owner);
    if (mine.length < PERSONAL_BEST_MIN_WEEKS) continue;
    const best = pick(mine, p => p.score);
    if (r.teamScore <= best.score) continue;
    const already = out.find(h => (h.id === 'allTimeHigh' || h.id === 'seasonHigh') && canonicalOwner(h.ownerName) === owner);
    if (already) {
      if (already.id === 'seasonHigh') already.detail += `. Also a personal best (old: ${fmt(best.score)})`;
      continue;
    }
    out.push(ownerHL('personalBest', '💪', 'Personal best', r,
      `Best week ever for this owner. Old best: ${fmt(best.score)} (${best.where})`));
  }

  // ── Lowest score: all-time, else season. ──
  const low = Math.min(...wk.map(r => r.teamScore));
  const lowRows = wk.filter(r => r.teamScore === low);
  let lowDone = false;
  if (past.length > 0 && allScores.length > 0) {
    const worst = pick(allScores, p => -p.score);
    if (low < worst.score) {
      lowDone = true;
      for (const r of lowRows) {
        out.push(ownerHL('allTimeLow', '💀', 'All-time lowest week', r,
          `Lowest score in league history. Old low: ${fmt(worst.score)} by ${nameOf(worst.owner)} (${worst.where})`));
      }
    }
  }
  if (!lowDone && seasonScores.length > 0) {
    const worst = pick(seasonScores, p => -p.score);
    if (low < worst.score) {
      for (const r of lowRows) {
        out.push(ownerHL('seasonLow', '🥶', 'Season-low week', r,
          `Lowest score this season. Old low: ${fmt(worst.score)} by ${nameOf(worst.owner)} (${worst.where})`));
      }
    }
  }

  // ── Player record week (this season only). ──
  const weeksTop = ctx.topPlayersByWeek ?? [];
  const thisTop = weeksTop.find(w => w.matchupPeriod === week)?.players ?? [];
  const before = weeksTop.filter(w => w.matchupPeriod < week && w.players.length > 0);
  if (thisTop.length > 0 && before.length > 0) {
    const prev = pick(before.map(w => ({ w: w.matchupPeriod, p: w.players[0] })), x => x.p.totalPoints);
    for (const p of thisTop.filter(p => p.totalPoints === thisTop[0].totalPoints)) {
      if (p.totalPoints <= prev.p.totalPoints) continue;
      out.push({
        id: 'playerRecord', emoji: '⭐', title: 'Player record week',
        ownerName: p.ownerNames[0] ?? '', teamName: '', playerName: p.playerName, proTeam: p.proTeam,
        value: p.totalPoints,
        detail: `${p.games} games, ${fmt(p.avgPoints)} avg. Old season high: ${fmt(prev.p.totalPoints)} by ${prev.p.playerName} (Week ${prev.w})`,
      });
    }
  }

  // ── Upsets: a win over someone he usually loses to. ──
  for (const r of wk.filter(r => r.won === true && hasOpponent(r))) {
    const a = canonicalOwner(r.ownerName);
    const b = canonicalOwner(r.opponentName);
    // Oldest first: earlier seasons (playoffs included), then this season.
    const meetings: boolean[] = [
      ...(ctx.pastSeasons ?? [])
        .filter(m => {
          const h = canonicalOwner(m.home.ownerName), w = canonicalOwner(m.away.ownerName);
          return (h === a && w === b) || (h === b && w === a);
        })
        .map(m => canonicalOwner(m.winner === 'home' ? m.home.ownerName : m.away.ownerName) === a),
      ...thisSeasonBefore
        .filter(x => canonicalOwner(x.ownerName) === a && canonicalOwner(x.opponentName) === b && x.won !== null)
        .sort((x, y) => x.matchupPeriod - y.matchupPeriod)
        .map(x => x.won === true),
    ];
    const n = meetings.length;
    const wins = meetings.filter(Boolean).length;
    let streak = 0;
    for (let i = n - 1; i >= 0 && !meetings[i]; i--) streak++;

    let detail: string | null = null;
    if (wins === 0 && n >= 2) detail = `First win ever against ${r.opponentName} (was 0–${n})`;
    else if (streak >= 3) detail = `Ended a ${streak}-game losing streak against ${r.opponentName} (was ${wins}–${n - wins} all-time)`;
    else if (n >= 4 && wins / n <= 0.25) detail = `Only win #${wins + 1} against ${r.opponentName} in ${n + 1} games (was ${wins}–${n - wins})`;
    if (detail) {
      out.push({
        id: 'upset', emoji: '😱', title: 'Upset', ownerName: r.ownerName, teamName: r.teamName,
        value: round1(r.teamScore), detail: `${detail}. Won ${fmt(round1(r.teamScore))}–${fmt(round1(r.opponentScore))}`,
      });
    }
  }

  // ── Bench blunder: the week's biggest game left on a bench. ──
  const bench = ctx.benchGamesByWeek?.find(w => w.matchupPeriod === week)?.games[0];
  if (bench && bench.fantasyPoints >= BENCH_MIN_POINTS && !isGhost({ teamName: bench.teamName, ownerName: bench.ownerName } as MatchupDepthRow)) {
    out.push({
      id: 'benchBlunder', emoji: '🪑', title: 'Bench blunder', ownerName: bench.ownerName, teamName: bench.teamName,
      playerName: bench.playerName, proTeam: bench.proTeam, value: bench.fantasyPoints,
      detail: `${bench.playerName} scored ${fmt(bench.fantasyPoints)} on ${bench.ownerName}'s bench`,
    });
  }

  return out;
}

// ─── Story of the week ────────────────────────────────────────────────────────

/** Sole leader after `week` (most wins, then most points), or null on a tie in wins. */
function leaderAfter(rows: MatchupDepthRow[], week: number): { owner: string; wins: number; losses: number } | null {
  const table = new Map<string, { owner: string; wins: number; losses: number; pf: number }>();
  for (const r of rows) {
    if (r.matchupPeriod > week || isGhost(r) || r.won === null || !hasOpponent(r)) continue;
    const t = table.get(r.ownerName) ?? { owner: r.ownerName, wins: 0, losses: 0, pf: 0 };
    if (r.won) t.wins++; else t.losses++;
    t.pf += r.teamScore;
    table.set(r.ownerName, t);
  }
  const all = [...table.values()].sort((a, b) => b.wins - a.wins || b.pf - a.pf);
  if (all.length === 0 || (all[1] && all[1].wins === all[0].wins)) return null;
  return all[0];
}

const STORY_ORDER: HighlightId[] = [
  'allTimeHigh', 'playerRecord', 'upset', 'personalBest', 'seasonHigh', 'allTimeLow', 'benchBlunder', 'seasonLow',
];

function storyLine(h: SeasonHighlight): string {
  const pts = fmt(h.value);
  switch (h.id) {
    case 'allTimeHigh':  return `${h.ownerName} scored ${pts}, the highest week in league history.`;
    case 'seasonHigh':   return `${h.ownerName} scored ${pts}, the best week of the season.`;
    case 'personalBest': return `${h.ownerName} had a personal best with ${pts}.`;
    case 'allTimeLow':   return `${h.ownerName} scored only ${pts}, the lowest week in league history.`;
    case 'seasonLow':    return `${h.ownerName} scored only ${pts}, the lowest week of the season.`;
    case 'playerRecord': return `${h.playerName} put up ${pts} points, the best player week of the season.`;
    case 'upset':        return `Upset: ${h.ownerName}. ${h.detail}.`;
    case 'benchBlunder': return `${h.detail}.`;
  }
}

function buildStory(
  rows: MatchupDepthRow[],
  week: number,
  highlights: SeasonHighlight[],
  matchups: RecapMatchup[],
): string[] {
  const story: string[] = [];

  // New #1 in the standings.
  if (week > 1) {
    const now = leaderAfter(rows, week);
    const before = leaderAfter(rows, week - 1);
    if (now && now.owner !== before?.owner) {
      story.push(before
        ? `${now.owner} took first place from ${before.owner} (now ${now.wins}–${now.losses}).`
        : `${now.owner} is alone in first place (${now.wins}–${now.losses}).`);
    }
  }

  // The two biggest highlights.
  const ranked = [...highlights].sort((a, b) => STORY_ORDER.indexOf(a.id) - STORY_ORDER.indexOf(b.id));
  for (const h of ranked.slice(0, 2)) story.push(storyLine(h));

  // Quiet week: fall back to the biggest blowout.
  if (story.length === 0 && matchups[0]?.winner) {
    const m = matchups[0];
    story.push(`${m.home.ownerName} beat ${m.away.ownerName} by ${fmt(m.margin)}, the biggest win of the week.`);
  }
  return story;
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

// ─── Season top weekly scores ────────────────────────────────────────────────

export interface TopWeeklyScore extends WeeklyTopPlayer {
  matchupPeriod: number;
}

/**
 * Best single-week player totals of the season so far, across every finished
 * week's top 10 (the same lists the recap shows). A player can appear more
 * than once, one row per week. Ties: fewer games first, then earlier week.
 */
export function topWeeklyScores(
  topPlayersByWeek: { matchupPeriod: number; players: WeeklyTopPlayer[] }[] | undefined,
  limit = 10,
): TopWeeklyScore[] {
  return (topPlayersByWeek ?? [])
    .flatMap(w => w.players.map(p => ({ ...p, matchupPeriod: w.matchupPeriod })))
    .sort((a, b) =>
      b.totalPoints - a.totalPoints || a.games - b.games || a.matchupPeriod - b.matchupPeriod)
    .slice(0, limit);
}

export interface TopManagerWeek {
  matchupPeriod: number;
  ownerName: string;
  teamName: string;
  teamScore: number;
  opponentName: string;
  opponentScore: number;
  won: boolean;
}

/**
 * Best single-week team scores of the season so far, finished weeks only
 * (won !== null). Ties: earlier week first.
 */
export function topManagerWeeks(rows: MatchupDepthRow[], limit = 10): TopManagerWeek[] {
  return rows
    .filter((r): r is MatchupDepthRow & { won: boolean } => r.won !== null)
    .map(r => ({
      matchupPeriod: r.matchupPeriod,
      ownerName: canonicalOwner(r.ownerName),
      teamName: r.teamName.trim(),
      teamScore: r.teamScore,
      opponentName: canonicalOwner(r.opponentName),
      opponentScore: r.opponentScore,
      won: r.won,
    }))
    .sort((a, b) => b.teamScore - a.teamScore || a.matchupPeriod - b.matchupPeriod)
    .slice(0, limit);
}
