/**
 * Trades tracker — how the players in each trade have done since the trade.
 *
 * For every traded player we split his season games in two:
 *   before = games up to and including the trade day
 *   after  = games from the day after the trade
 * and compare total points and average points per game.
 *
 * Per-game points come from `?view=kona_playercard` with
 * `filterStatsForTopScoringPeriodIds`: one stat entry per game,
 * statSourceId 0 (actual) + statSplitTypeId 5 (single scoring period),
 * `appliedTotal` = fantasy points, `stats['42']` = games played (1).
 *
 * In this daily league a scoring period is one calendar day (US Eastern).
 * The trade's period is read off the NBA schedule (game dates per period);
 * counting back from ESPN's "current period" is only the fallback, since
 * ESPN rolls its period over some hours after midnight ET.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

export interface TradeSplit {
  gp: number;
  pts: number;
  /** Points per game, null with no games. */
  avg: number | null;
}

export interface TradedPlayerTracker {
  before: TradeSplit;
  after: TradeSplit;
  /** after.avg − before.avg, null when either side has no games. */
  avgChange: number | null;
}

export interface GameLine {
  scoringPeriodId: number;
  pts: number;
}

/** One line per game the player actually played this season. */
export function gameLines(player: any, season: number): GameLine[] {
  const seen = new Set<number>();
  const lines: GameLine[] = [];
  for (const s of (player?.stats || []) as any[]) {
    if (s.statSourceId !== 0 || s.statSplitTypeId !== 5) continue;
    if (s.seasonId != null && s.seasonId !== season) continue;
    const period = s.scoringPeriodId;
    if (typeof period !== 'number' || seen.has(period)) continue;
    const gp = s.stats?.['42'] ?? 0;
    if (gp <= 0) continue;
    seen.add(period);
    lines.push({ scoringPeriodId: period, pts: s.appliedTotal || 0 });
  }
  return lines.sort((a, b) => a.scoringPeriodId - b.scoringPeriodId);
}

function split(lines: GameLine[]): TradeSplit {
  const pts = Math.round(lines.reduce((s, l) => s + l.pts, 0) * 10) / 10;
  return { gp: lines.length, pts, avg: lines.length ? Math.round((pts / lines.length) * 10) / 10 : null };
}

/** Before / after split around the trade day (trade day counts as "before"). */
export function trackPlayer(lines: GameLine[], tradePeriod: number): TradedPlayerTracker {
  const before = split(lines.filter(l => l.scoringPeriodId <= tradePeriod));
  const after = split(lines.filter(l => l.scoringPeriodId > tradePeriod));
  const avgChange = before.avg != null && after.avg != null
    ? Math.round((after.avg - before.avg) * 10) / 10
    : null;
  return { before, after, avgChange };
}

/** "2026-11-22" — the US Eastern calendar day of a timestamp. */
export function easternDay(ms: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(ms));
}

/** Scoring period (day) of a timestamp, counted back from today's period. */
export function periodOfDate(ms: number, currentPeriod: number, nowMs: number): number {
  const dayMs = 86_400_000;
  const diff = Math.round(
    (Date.parse(easternDay(nowMs)) - Date.parse(easternDay(ms))) / dayMs,
  );
  return Math.max(0, currentPeriod - diff);
}

/**
 * Scoring period of a timestamp from the NBA schedule: the last game day on
 * or before the trade's US Eastern day. Null when the schedule has no games.
 */
export function periodFromSchedule(
  ms: number,
  schedules: { games: { scoringPeriodId: number; dateMs: number | null }[] }[],
): number | null {
  const day = easternDay(ms);
  let best: number | null = null;
  let any = false;
  for (const t of schedules) {
    for (const g of t.games) {
      if (g.dateMs == null) continue;
      any = true;
      if (easternDay(g.dateMs) <= day && (best == null || g.scoringPeriodId > best)) best = g.scoringPeriodId;
    }
  }
  if (!any) return null;
  return best ?? 0;
}

/** The kona_playercard request for the traded players' game logs. */
export function gameLogRequest(ids: number[], season: number): { params: string; headers: Record<string, string> } {
  return {
    params: '?view=kona_playercard',
    headers: {
      'x-fantasy-filter': JSON.stringify({
        players: {
          filterIds: { value: ids },
          filterStatsForTopScoringPeriodIds: { value: 250, additionalValue: [`00${season}`] },
        },
      }),
    },
  };
}
