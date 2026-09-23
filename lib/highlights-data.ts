/**
 * Loading side of the recap highlights.
 *
 * Built nightly, in two steps, and committed to data/snapshots/highlights.json:
 *   1. who — the best fantasy games on our league's rosters each day
 *      (lib/espn.ts getTopPerformers)
 *   2. video — that player's clip on the official NBA YouTube channel, else
 *      his game's full highlights (lib/youtube.ts)
 * Pages only ever read the snapshot: a render must never wait on YouTube.
 *
 * Without a YOUTUBE_API_KEY the job falls back to Highlightly, whose free
 * plan returns no NBA clips (checked 2026-09-23) — kept for a paid plan.
 */
import { readSnapshot } from './snapshots';
import { buildDateIndex, datesForWeek, PRO_TEAM_ABBREV, type ScheduleSeason } from './espn-schedule';
import {
  getHighlightsForDates,
  hasHighlightlyKey,
  type Highlight,
  type HighlightsByDate,
} from './highlightly';
import {
  hasYoutubeKey,
  getNbaUploadsSince,
  filterPlayableHere,
  pickClips,
  toHighlight,
  type Performer,
} from './youtube';

/** Days back to cover — comfortably more than one fantasy week. */
const SNAPSHOT_DAYS = 10;
/** Top fantasy games per day that we look for a video of. */
const PERFORMERS_PER_DAY = 5;
/** Clips shown on one recap. */
export const RECAP_CLIP_LIMIT = 8;

function recentDates(days: number, now = new Date()): string[] {
  const out: string[] = [];
  for (let i = 1; i <= days; i++) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out.reverse();
}

/** The last N completed days that belong to this season, with their ESPN scoring period. */
function recentScoringDays(schedule: ScheduleSeason, days: number) {
  const index = buildDateIndex(schedule.schedules);
  if (!index.anchor) return [];
  const anchorMs = Date.parse(`${index.anchor}T00:00:00Z`);
  return recentDates(days)
    .map(date => ({ date, scoringPeriodId: Math.round((Date.parse(`${date}T00:00:00Z`) - anchorMs) / 86_400_000) + 1 }))
    .filter(d => d.scoringPeriodId >= 1 && d.scoringPeriodId <= index.maxScoringPeriod);
}

async function buildFromYoutube(): Promise<HighlightsByDate> {
  const schedule = readSnapshot<ScheduleSeason>('schedule');
  if (!schedule) return {};
  const days = recentScoringDays(schedule.data, SNAPSHOT_DAYS);
  if (days.length === 0) return {}; // before opening night

  // Imported here so a Highlightly-only or page-side import never loads the ESPN client.
  const { getTopPerformers } = await import('./espn');
  const performers: Performer[] = (await getTopPerformers(days, PERFORMERS_PER_DAY)).map(p => ({
    date: p.date,
    playerName: p.playerName,
    proTeam: PRO_TEAM_ABBREV[p.proTeamId] ?? '',
    fantasyPoints: p.fantasyPoints,
    ownerName: p.ownerName,
  }));
  if (performers.length === 0) return {};

  const uploads = await getNbaUploadsSince(days[0].date);
  const playable = await filterPlayableHere(uploads.map(v => v.id));
  const clips = pickClips(performers, uploads.filter(v => playable.has(v.id)));

  const byDate: HighlightsByDate = {};
  for (const clip of clips) (byDate[clip.performer.date] ??= []).push(toHighlight(clip));
  return byDate;
}

/**
 * Built nightly. Returns {} when there's nothing new — never wipes old days:
 * fresh days are merged over the existing snapshot, so a recap keeps its
 * clips after its week drops out of the 10-day window.
 */
export async function buildHighlightsSnapshot(): Promise<HighlightsByDate> {
  let fresh: HighlightsByDate = {};
  if (hasYoutubeKey()) fresh = await buildFromYoutube();
  else if (hasHighlightlyKey()) fresh = await getHighlightsForDates(recentDates(SNAPSHOT_DAYS));
  if (Object.keys(fresh).length === 0) return {};

  const existing = readSnapshot<HighlightsByDate>('highlights')?.data ?? {};
  return { ...existing, ...fresh };
}

/**
 * Clips for the given days, newest day first. Reads only the snapshot, so a
 * page render costs nothing and works with no key configured.
 */
export function loadHighlightsForDates(dates: string[], limit = RECAP_CLIP_LIMIT): Highlight[] {
  const snap = readSnapshot<HighlightsByDate>('highlights');
  if (!snap) return [];

  const wanted = new Set(dates);
  const clips = Object.entries(snap.data)
    .filter(([date]) => wanted.has(date))
    .sort(([a], [b]) => b.localeCompare(a))
    .flatMap(([, dayClips]) => dayClips);

  // Best fantasy games first when we know them; otherwise newest day first.
  if (clips.some(c => c.fantasyPoints !== undefined)) {
    clips.sort((a, b) => (b.fantasyPoints ?? 0) - (a.fantasyPoints ?? 0));
  }
  return clips.slice(0, limit);
}

/**
 * Clips belonging to one fantasy week. Snapshot-only and synchronous on
 * purpose: rendering a recap must not make a network call, and a missing
 * schedule or highlights snapshot simply means no video that week.
 */
export function loadHighlightsForWeek(week: number): Highlight[] {
  const schedule = readSnapshot<ScheduleSeason>('schedule');
  if (!schedule) return [];
  return loadHighlightsForDates(datesForWeek(schedule.data, week));
}
