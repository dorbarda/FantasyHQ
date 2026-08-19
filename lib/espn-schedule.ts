/**
 * NBA schedule grid — games per week and back-to-backs, per NBA team.
 *
 * Two ESPN calls feed this:
 *   1. season level, `?view=proTeamSchedules_wl` — every NBA team's season
 *      schedule, keyed by scoring period (in a daily league a scoring period
 *      is one calendar day).
 *   2. league level, `?view=mSettings` — `scheduleSettings.matchupPeriods`
 *      maps each fantasy week to the scoring periods it covers. This is the
 *      whole season including future weeks, which is the point: the page
 *      exists to look ahead.
 *
 * The parsing and matrix building below are pure functions over already
 * fetched JSON, so they're unit-testable the way lib/recap.ts is. Only
 * getScheduleWeek() touches the network.
 *
 * NOTE: the shape of `proTeamSchedules_wl` is documented rather than verified
 * (see docs/DATA-SOURCES.md §1.1) — the session that wrote this could not
 * reach ESPN. Both parsers below accept the documented shape and a couple of
 * plausible variants, and return an empty result rather than throwing, so a
 * shape surprise degrades to "no schedule yet" instead of a broken page.
 * Run `npm run probe-sources` to confirm the real shape.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { CURRENT_SEASON } from './season';

const ESPN_S2 = process.env.ESPN_S2;
const SWID = process.env.SWID;
const LEAGUE_ID = process.env.LEAGUE_ID;

/** Season-level endpoint — deliberately WITHOUT the /segments/0/leagues/{id} suffix. */
const SEASON_BASE = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${CURRENT_SEASON}`;
const LEAGUE_BASE = `${SEASON_BASE}/segments/0/leagues/${LEAGUE_ID}`;

export const PRO_TEAM_ABBREV: Record<number, string> = {
  1:'ATL', 2:'BOS', 3:'NOP', 4:'CHI', 5:'CLE', 6:'DAL', 7:'DEN', 8:'DET',
  9:'GSW', 10:'HOU', 11:'IND', 12:'LAC', 13:'LAL', 14:'MIA', 15:'MIL',
  16:'MIN', 17:'BKN', 18:'NYK', 19:'ORL', 20:'PHI', 21:'PHX', 22:'POR',
  23:'SAC', 24:'SAS', 25:'OKC', 26:'UTA', 27:'WAS', 28:'TOR', 29:'MEM',
  30:'CHA',
};

// ─── Types ───────────────────────────────────────────────────────────────────

/** One NBA game, flattened from ESPN's per-team schedule. */
export interface ProGame {
  scoringPeriodId: number;
  opponentId: number;
  isHome: boolean;
  dateMs: number | null;
}

export interface ProTeamSchedule {
  proTeamId: number;
  abbrev: string;
  games: ProGame[];
}

/** A single day column in the grid. */
export interface ScheduleDay {
  scoringPeriodId: number;
  /** "Mon" — derived from the games actually scheduled that day. */
  weekday: string;
  /** "Dec 2" — empty when no game anywhere in the league that day. */
  label: string;
}

/** One cell: the game an NBA team plays on a given day, or null for a rest day. */
export interface ScheduleCell {
  opponent: string;
  isHome: boolean;
  /** True when this game is the second half of a back-to-back. */
  isBackToBack: boolean;
}

export interface ScheduleRow {
  proTeamId: number;
  abbrev: string;
  /** One entry per day in `days`, null where the team doesn't play. */
  cells: (ScheduleCell | null)[];
  gameCount: number;
  /** Pairs of games on consecutive days, counted within this week only. */
  backToBacks: number;
}

export interface ScheduleWeek {
  week: number;
  currentWeek: number;
  maxWeek: number;
  days: ScheduleDay[];
  rows: ScheduleRow[];
  /** Most and fewest games any team plays this week — drives the legend. */
  maxGames: number;
  minGames: number;
}

/** Everything the page needs, cached whole so a week switch costs nothing. */
/**
 * What the nightly job stores.
 *
 * Deliberately only what ESPN told us: the schedules and how many fantasy
 * weeks the league has. The week → days map and the current week are DERIVED,
 * and deriving them on read rather than freezing them here means a fix to that
 * logic takes effect on the next deploy instead of waiting for the next
 * snapshot. The first version of this file stored the computed map, and a
 * corrected mapping went on serving the old broken weeks until the job re-ran.
 */
export interface ScheduleSeason {
  /** How many matchup periods the league has. */
  weekCount: number;
  schedules: ProTeamSchedule[];

  /**
   * Older snapshots stored the derived map. Read only as a fallback source of
   * weekCount so a stale file still renders; never used as the map itself.
   * @deprecated
   */
  weeks?: Record<number, number[]>;
  /** @deprecated superseded by currentWeekFor() */
  currentWeek?: number;
  /** @deprecated derived from weekCount */
  maxWeek?: number;
}

// ─── Parsing (pure) ──────────────────────────────────────────────────────────

/**
 * Pull every NBA team's games out of a proTeamSchedules_wl response.
 *
 * Documented shape: `settings.proTeams[]`, each with `id`, `abbrev` and
 * `proGamesByScoringPeriod: { "<scoringPeriodId>": [game, …] }`. Games carry
 * `homeProTeamId` / `awayProTeamId` and a `date` in epoch milliseconds.
 */
export function parseProTeamSchedules(raw: any): ProTeamSchedule[] {
  const proTeams: any[] = raw?.settings?.proTeams ?? raw?.proTeams ?? [];
  if (!Array.isArray(proTeams) || proTeams.length === 0) return [];

  const out: ProTeamSchedule[] = [];

  for (const team of proTeams) {
    const proTeamId = Number(team?.id);
    // id 0 is the free-agent pseudo-team ESPN includes in this list
    if (!proTeamId || Number.isNaN(proTeamId)) continue;

    const abbrev: string = team?.abbrev || PRO_TEAM_ABBREV[proTeamId] || `T${proTeamId}`;
    const byPeriod = team?.proGamesByScoringPeriod;
    const games: ProGame[] = [];

    if (byPeriod && typeof byPeriod === 'object') {
      for (const [periodKey, periodGames] of Object.entries(byPeriod)) {
        const scoringPeriodId = Number(periodKey);
        if (Number.isNaN(scoringPeriodId)) continue;

        for (const g of (Array.isArray(periodGames) ? periodGames : []) as any[]) {
          const home = Number(g?.homeProTeamId);
          const away = Number(g?.awayProTeamId);
          if (Number.isNaN(home) || Number.isNaN(away)) continue;

          const isHome = home === proTeamId;
          const opponentId = isHome ? away : home;
          // Skip anything that doesn't actually involve this team
          if (!isHome && away !== proTeamId) continue;

          const rawDate = g?.date ?? g?.startTime ?? null;
          const dateMs = typeof rawDate === 'number' && rawDate > 0 ? rawDate : null;

          games.push({ scoringPeriodId, opponentId, isHome, dateMs });
        }
      }
    }

    games.sort((a, b) => a.scoringPeriodId - b.scoringPeriodId);
    out.push({ proTeamId, abbrev, games });
  }

  return out;
}

/**
 * How many matchup periods (fantasy weeks) the league has.
 *
 * NOTE: `scheduleSettings.matchupPeriods` also *looks* like a week → days map,
 * and that is how this module first read it. In fantasy basketball it is not:
 * it maps each matchup period to itself ({1:[1], 2:[2], …}), because a
 * basketball matchup never spans several of ESPN's own periods the way an NFL
 * one can. Reading it as days gave every week exactly one day, and the grid
 * claimed each NBA team played once a week all season. Only its SIZE is
 * meaningful here; the days come from buildWeekMap() below.
 */
export function countMatchupPeriods(raw: any): number {
  const periods = raw?.settings?.scheduleSettings?.matchupPeriods;
  if (periods && typeof periods === 'object') {
    const weeks = Object.keys(periods).map(Number).filter(n => !Number.isNaN(n));
    if (weeks.length > 0) return Math.max(...weeks);
  }
  const count = Number(raw?.settings?.scheduleSettings?.matchupPeriodCount);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

/**
 * The calendar day a game belongs to.
 *
 * Games tip in the US evening, which is already past midnight UTC, so a plain
 * UTC date files a Tuesday night game under Wednesday. Shifting to US Pacific
 * puts every game on the day it was actually played. Checked against a full
 * season: with the shift all 164 game days agree on one anchor, without it
 * they split 89/75.
 */
const NBA_DAY_SHIFT_MS = 8 * 60 * 60 * 1000;

export function nbaDate(ms: number): string {
  return new Date(ms - NBA_DAY_SHIFT_MS).toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/** 0 = Sunday … 1 = Monday. */
function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/**
 * Scoring periods are consecutive calendar days, so day N is simply the
 * season's first day plus N-1. Recovering that anchor from the games lets us
 * date every scoring period — including ones with no NBA game, which appear
 * nowhere in the schedule but still belong to a fantasy week.
 */
export function buildDateIndex(schedules: ProTeamSchedule[]) {
  const earliest = new Map<number, string>();
  for (const team of schedules) {
    for (const g of team.games) {
      if (g.dateMs === null) continue;
      const d = nbaDate(g.dateMs);
      const current = earliest.get(g.scoringPeriodId);
      if (current === undefined || d < current) earliest.set(g.scoringPeriodId, d);
    }
  }

  // Every game day implies an anchor; take the one they mostly agree on so a
  // single odd fixture can't shift the whole season.
  const votes = new Map<string, number>();
  for (const [sp, date] of earliest) {
    const implied = addDays(date, -(sp - 1));
    votes.set(implied, (votes.get(implied) ?? 0) + 1);
  }

  let anchor: string | null = null;
  let best = 0;
  for (const [candidate, count] of votes) {
    if (count > best) { anchor = candidate; best = count; }
  }

  const maxScoringPeriod = earliest.size > 0 ? Math.max(...earliest.keys()) : 0;

  return {
    anchor,
    maxScoringPeriod,
    /** Date of any scoring period, game or not. */
    dateFor(scoringPeriodId: number): string | null {
      return anchor ? addDays(anchor, scoringPeriodId - 1) : null;
    },
  };
}

/**
 * week → the scoring period ids (days) it covers.
 *
 * ESPN fantasy basketball weeks run Monday to Sunday; week 1 is short whenever
 * the season tips off mid-week. Verified against a played season: this
 * reproduces 6 days for week 1 (Tue 21 Oct → Sun 26 Oct) and 7 for every week
 * after, matching the per-week day counts recorded in the matchup-depth data.
 */
export function buildWeekMap(
  schedules: ProTeamSchedule[],
  weekCount: number
): Record<number, number[]> {
  const index = buildDateIndex(schedules);
  if (!index.anchor || weekCount < 1) return {};

  const weeks: Record<number, number[]> = {};
  let week = 1;
  let current: number[] = [];

  for (let sp = 1; sp <= index.maxScoringPeriod; sp++) {
    const date = index.dateFor(sp)!;
    if (current.length > 0 && weekdayOf(date) === 1) {
      weeks[week++] = current;
      current = [];
      if (week > weekCount) return weeks;
    }
    current.push(sp);
  }
  if (current.length > 0 && week <= weekCount) weeks[week] = current;
  return weeks;
}

// ─── Matrix building (pure) ──────────────────────────────────────────────────

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/**
 * Label each day column. Uses the derived date index rather than only the days
 * that happen to have games, so an empty Monday still shows its date.
 */
function buildDays(schedules: ProTeamSchedule[], scoringPeriods: number[]): ScheduleDay[] {
  const index = buildDateIndex(schedules);

  return scoringPeriods.map(scoringPeriodId => {
    const date = index.dateFor(scoringPeriodId);
    if (!date) return { scoringPeriodId, weekday: '', label: '' };
    const d = new Date(`${date}T00:00:00Z`);
    return {
      scoringPeriodId,
      weekday: WEEKDAYS[d.getUTCDay()],
      label: `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`,
    };
  });
}

/**
 * Build the grid for one fantasy week.
 *
 * Back-to-backs are counted within the week: a game on scoring period N
 * followed by one on N+1 is one back-to-back, and the second game is the one
 * flagged. A pair straddling the week boundary belongs to neither week — the
 * grid shows one week at a time, so counting it in both would double it.
 */
export function buildWeekMatrix(
  schedules: ProTeamSchedule[],
  scoringPeriods: number[],
  meta: { week: number; currentWeek: number; maxWeek: number }
): ScheduleWeek {
  const days = buildDays(schedules, scoringPeriods);
  const periodIndex = new Map(scoringPeriods.map((sp, i) => [sp, i]));

  const rows: ScheduleRow[] = schedules.map(team => {
    const cells: (ScheduleCell | null)[] = scoringPeriods.map(() => null);

    // Only this week's games, in day order
    const weekGames = team.games
      .filter(g => periodIndex.has(g.scoringPeriodId))
      .sort((a, b) => a.scoringPeriodId - b.scoringPeriodId);

    let backToBacks = 0;
    let previousPeriod: number | null = null;

    for (const g of weekGames) {
      const isBackToBack = previousPeriod !== null && g.scoringPeriodId === previousPeriod + 1;
      if (isBackToBack) backToBacks++;

      const idx = periodIndex.get(g.scoringPeriodId)!;
      cells[idx] = {
        opponent: PRO_TEAM_ABBREV[g.opponentId] || `T${g.opponentId}`,
        isHome: g.isHome,
        isBackToBack,
      };
      previousPeriod = g.scoringPeriodId;
    }

    return {
      proTeamId: team.proTeamId,
      abbrev: team.abbrev,
      cells,
      gameCount: weekGames.length,
      backToBacks,
    };
  });

  // Heaviest schedules first — that's the question the page answers. Ties break
  // on fewer back-to-backs (easier to actually start those players), then name.
  rows.sort((a, b) =>
    b.gameCount - a.gameCount ||
    a.backToBacks - b.backToBacks ||
    a.abbrev.localeCompare(b.abbrev)
  );

  const counts = rows.map(r => r.gameCount);

  return {
    ...meta,
    days,
    rows,
    maxGames: counts.length ? Math.max(...counts) : 0,
    minGames: counts.length ? Math.min(...counts) : 0,
  };
}

/** How many fantasy weeks the season has, tolerating older snapshots. */
export function weekCountOf(season: ScheduleSeason): number {
  if (season.weekCount > 0) return season.weekCount;
  const stored = season.weeks ? Object.keys(season.weeks).length : 0;
  return stored;
}

/** The week → days map, computed fresh from the stored schedules. */
export function weeksOf(season: ScheduleSeason): Record<number, number[]> {
  return buildWeekMap(season.schedules, weekCountOf(season));
}

/**
 * Which week we're in, decided by today's date rather than by ESPN's
 * currentMatchupPeriod — that field reported 21 for a season which had not
 * started, so the page opened on the final week of a season nobody had played.
 *
 * Before the season opens this is week 1; after it ends, the last week.
 */
export function currentWeekFor(season: ScheduleSeason, today = new Date()): number {
  const weeks = weeksOf(season);
  const numbers = Object.keys(weeks).map(Number).sort((a, b) => a - b);
  if (numbers.length === 0) return 1;

  const index = buildDateIndex(season.schedules);
  if (!index.anchor) return numbers[0];

  const todayStr = nbaDate(today.getTime());

  for (const week of numbers) {
    const days = weeks[week];
    const last = index.dateFor(days[days.length - 1]);
    if (last && todayStr <= last) return week;
  }
  return numbers[numbers.length - 1];
}

/**
 * The calendar dates (UTC, YYYY-MM-DD) on which NBA games are played during a
 * fantasy week. Used to ask a date-based API — Highlightly — for exactly the
 * days that week covers, instead of guessing a range.
 */
export function datesForWeek(season: ScheduleSeason, week: number): string[] {
  const scoringPeriods = new Set(weeksOf(season)[week] ?? []);
  if (scoringPeriods.size === 0) return [];

  const dates = new Set<string>();
  for (const team of season.schedules) {
    for (const g of team.games) {
      if (!scoringPeriods.has(g.scoringPeriodId) || g.dateMs === null) continue;
      dates.add(nbaDate(g.dateMs));
    }
  }
  return [...dates].sort();
}

/** Slice one week out of an already-loaded season. */
export function weekFromSeason(season: ScheduleSeason, week: number): ScheduleWeek | null {
  const weeks = weeksOf(season);
  const scoringPeriods = weeks[week];
  if (!scoringPeriods || scoringPeriods.length === 0) return null;

  const numbers = Object.keys(weeks).map(Number).sort((a, b) => a - b);
  return buildWeekMatrix(season.schedules, scoringPeriods, {
    week,
    currentWeek: currentWeekFor(season),
    maxWeek: numbers[numbers.length - 1],
  });
}

// ─── Fetching ────────────────────────────────────────────────────────────────

export function hasEspnCredentials() {
  return !!(ESPN_S2 && SWID && LEAGUE_ID);
}

async function espnGet(url: string, revalidate: number): Promise<any> {
  const res = await fetch(url, {
    headers: {
      Cookie: `espn_s2=${ESPN_S2}; SWID=${SWID}`,
      Accept: 'application/json',
    },
    next: { revalidate },
  } as RequestInit);
  if (!res.ok) throw new Error(`ESPN API ${res.status} for ${url}`);
  return res.json();
}

/**
 * Load the whole season's grid data in two calls. The NBA schedule barely
 * changes, so both are cached for a day — a week switch on the page is then
 * free, and the nightly snapshot keeps it working when the cookies expire.
 */
export async function getScheduleSeason(): Promise<ScheduleSeason> {
  const [scheduleRaw, settingsRaw] = await Promise.all([
    espnGet(`${SEASON_BASE}?view=proTeamSchedules_wl`, 86400),
    espnGet(`${LEAGUE_BASE}?view=mSettings`, 86400),
  ]);

  return {
    weekCount: countMatchupPeriods(settingsRaw),
    schedules: parseProTeamSchedules(scheduleRaw),
  };
}
