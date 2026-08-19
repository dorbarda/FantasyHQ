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
export interface ScheduleSeason {
  currentWeek: number;
  maxWeek: number;
  /** week → scoring period ids (days) it covers */
  weeks: Record<number, number[]>;
  schedules: ProTeamSchedule[];
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
 * week → scoring period ids, from `settings.scheduleSettings.matchupPeriods`.
 *
 * Covers future weeks, which the per-matchup `pointsByScoringPeriod` route used
 * in lib/espn.ts cannot — that only exists once a week has been scored.
 */
export function parseMatchupPeriods(raw: any): Record<number, number[]> {
  const periods = raw?.settings?.scheduleSettings?.matchupPeriods;
  const out: Record<number, number[]> = {};
  if (!periods || typeof periods !== 'object') return out;

  for (const [weekKey, days] of Object.entries(periods)) {
    const week = Number(weekKey);
    if (Number.isNaN(week)) continue;
    const list = (Array.isArray(days) ? days : [])
      .map(Number)
      .filter(n => !Number.isNaN(n))
      .sort((a, b) => a - b);
    if (list.length > 0) out[week] = list;
  }
  return out;
}

// ─── Matrix building (pure) ──────────────────────────────────────────────────

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/**
 * Label each day of the week from the games actually scheduled on it. ESPN
 * gives dates per game rather than per scoring period, so the earliest game
 * found on a day names it; a day with no games anywhere stays unlabelled.
 */
function buildDays(schedules: ProTeamSchedule[], scoringPeriods: number[]): ScheduleDay[] {
  const earliest = new Map<number, number>();
  for (const team of schedules) {
    for (const g of team.games) {
      if (g.dateMs === null) continue;
      const current = earliest.get(g.scoringPeriodId);
      if (current === undefined || g.dateMs < current) earliest.set(g.scoringPeriodId, g.dateMs);
    }
  }

  return scoringPeriods.map(scoringPeriodId => {
    const ms = earliest.get(scoringPeriodId);
    if (ms === undefined) return { scoringPeriodId, weekday: '', label: '' };
    const d = new Date(ms);
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

/** Slice one week out of an already-loaded season. */
export function weekFromSeason(season: ScheduleSeason, week: number): ScheduleWeek | null {
  const scoringPeriods = season.weeks[week];
  if (!scoringPeriods || scoringPeriods.length === 0) return null;
  return buildWeekMatrix(season.schedules, scoringPeriods, {
    week,
    currentWeek: season.currentWeek,
    maxWeek: season.maxWeek,
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

  const schedules = parseProTeamSchedules(scheduleRaw);
  const weeks = parseMatchupPeriods(settingsRaw);
  const weekNumbers = Object.keys(weeks).map(Number).sort((a, b) => a - b);

  const currentWeek: number =
    settingsRaw?.status?.currentMatchupPeriod ||
    settingsRaw?.scoringPeriodId ||
    weekNumbers[0] ||
    1;

  return {
    currentWeek,
    maxWeek: weekNumbers.length ? weekNumbers[weekNumbers.length - 1] : currentWeek,
    weeks,
    schedules,
  };
}
