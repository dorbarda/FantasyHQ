/**
 * NBA games for one US date — ESPN's public scoreboard (no key, no cookies).
 * Parsing is pure and tested; the fetch is cached 5 minutes.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ScoreboardTeam {
  /** ESPN pro team id — the same id fantasy rosters use (proTeamId). */
  id: number;
  abbrev: string;
  score: number | null;
  record: string;
  winner: boolean;
  /** Team's top scorer: "P. Siakam", 23. */
  topScorer: { name: string; points: number } | null;
}

export interface ScoreboardGame {
  id: string;
  /** Tip-off, ISO UTC. */
  start: string;
  state: 'pre' | 'in' | 'post';
  /** "Final", "Final/OT", "Q3 4:12", … */
  detail: string;
  /** e.g. "NBA Mexico City Game", when ESPN has one. */
  note: string | null;
  home: ScoreboardTeam;
  away: ScoreboardTeam;
}

function parseTeam(c: any): ScoreboardTeam {
  const pts = (c?.leaders ?? []).find((l: any) => l?.name === 'points')?.leaders?.[0];
  const score = c?.score != null && c.score !== '' ? Number(c.score) : null;
  return {
    id: Number(c?.team?.id ?? c?.id ?? 0),
    abbrev: c?.team?.abbreviation ?? '?',
    score: Number.isFinite(score) ? score : null,
    record: c?.records?.[0]?.summary ?? '',
    winner: c?.winner === true,
    topScorer: pts ? { name: pts.athlete?.shortName ?? pts.athlete?.displayName ?? '', points: Number(pts.value ?? pts.displayValue) } : null,
  };
}

export function parseScoreboard(raw: any): ScoreboardGame[] {
  return ((raw?.events ?? []) as any[])
    .map((e): ScoreboardGame | null => {
      const c = e?.competitions?.[0];
      const home = c?.competitors?.find((x: any) => x.homeAway === 'home');
      const away = c?.competitors?.find((x: any) => x.homeAway === 'away');
      if (!home || !away) return null;
      const state = e?.status?.type?.state;
      return {
        id: String(e.id),
        start: e.date ?? c?.date ?? '',
        state: state === 'in' || state === 'post' ? state : 'pre',
        detail: e?.status?.type?.shortDetail ?? '',
        note: c?.notes?.find((n: any) => n?.headline)?.headline ?? null,
        home: parseTeam(home),
        away: parseTeam(away),
      };
    })
    .filter((g): g is ScoreboardGame => g !== null)
    .sort((a, b) => a.start.localeCompare(b.start));
}

/** The game's top scorer of both teams. */
export function gameTopScorer(g: ScoreboardGame): { name: string; points: number; abbrev: string } | null {
  const sides = [g.away, g.home].filter(t => t.topScorer);
  if (sides.length === 0) return null;
  const best = sides.reduce((a, b) => (b.topScorer!.points > a.topScorer!.points ? b : a));
  return { ...best.topScorer!, abbrev: best.abbrev };
}

/** Tip-off in Israel time: "22:30". */
export function israelTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jerusalem' });
}

/** Israel weekday of the tip-off: "Sun". */
export function israelDay(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Asia/Jerusalem' });
}

/** "2026-11-07" → "2026-11-08" */
export function nextDate(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export async function getScoreboard(date: string): Promise<ScoreboardGame[]> {
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${date.replace(/-/g, '')}`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return [];
    return parseScoreboard(await res.json());
  } catch {
    return [];
  }
}
