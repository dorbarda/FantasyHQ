/**
 * YouTube — highlight videos from the official NBA channel for the recap.
 *
 * Step 2 of the highlights pipeline. Step 1 (lib/espn.ts getTopPerformers)
 * picks the best fantasy games on our league's rosters; this file finds a
 * video for each: the player's own clip if the NBA posted one, else the
 * full-game highlights of the game he played in.
 *
 * Why the NBA channel's uploads playlist and not search: playlistItems.list
 * costs 1 quota unit per 50 videos, search.list costs 100 per query. The
 * free quota is 10,000 units a day; a nightly run uses ~15.
 *
 * Titles look like this (checked against real uploads, 2026-09):
 *   "#7 TRAIL BLAZERS at #2 SPURS | FULL GAME 5 HIGHLIGHTS | April 28, 2026"
 * so both teams and the game date can be read off the title.
 *
 * The parsing and matching below are pure; only the two fetch functions at
 * the bottom touch the network, and only the nightly job calls them.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Highlight } from './highlightly';

/** Official NBA channel (UCWJ2lWNubArHWmf3FIHbfcQ) — its uploads playlist is UU + the same suffix. */
export const NBA_UPLOADS_PLAYLIST = 'UUWJ2lWNubArHWmf3FIHbfcQ';

/** We only need to know whether a clip plays for viewers in Israel. */
const VIEWER_REGION = 'IL';

const API = 'https://www.googleapis.com/youtube/v3';

export function hasYoutubeKey() {
  return !!process.env.YOUTUBE_API_KEY;
}

export interface YoutubeVideo {
  id: string;
  title: string;
  publishedAt: string; // ISO
}

/** ESPN pro team abbreviation → the nickname the NBA channel uses in titles. */
export const TEAM_NICKNAME: Record<string, string> = {
  ATL: 'HAWKS', BOS: 'CELTICS', BKN: 'NETS', CHA: 'HORNETS', CHI: 'BULLS',
  CLE: 'CAVALIERS', DAL: 'MAVERICKS', DEN: 'NUGGETS', DET: 'PISTONS',
  GSW: 'WARRIORS', GS: 'WARRIORS', HOU: 'ROCKETS', IND: 'PACERS',
  LAC: 'CLIPPERS', LAL: 'LAKERS', MEM: 'GRIZZLIES', MIA: 'HEAT', MIL: 'BUCKS',
  MIN: 'TIMBERWOLVES', NOP: 'PELICANS', NO: 'PELICANS', NYK: 'KNICKS',
  NY: 'KNICKS', OKC: 'THUNDER', ORL: 'MAGIC', PHI: '76ERS', PHX: 'SUNS',
  POR: 'TRAIL BLAZERS', SAC: 'KINGS', SAS: 'SPURS', SA: 'SPURS',
  TOR: 'RAPTORS', UTA: 'JAZZ', UTAH: 'JAZZ', WAS: 'WIZARDS', WSH: 'WIZARDS',
};

// ─── Pure helpers ────────────────────────────────────────────────────────────

/** Lowercase, no accents, no punctuation: "Nikola Jokić" and "NIKOLA JOKIC" both → "nikola jokic". */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "Jaren Jackson Jr." → "jaren jackson" — suffixes are often dropped in titles. */
function nameKey(fullName: string): string {
  return normalize(fullName).replace(/\b(jr|sr|ii|iii|iv)\b/g, '').replace(/\s+/g, ' ').trim();
}

export function isFullGameHighlights(title: string): boolean {
  return /\|\s*FULL GAME( \d+)? HIGHLIGHTS/i.test(title);
}

const MONTHS: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
};

/** "… | April 28, 2026" → "2026-04-28", or null. */
export function dateFromTitle(title: string): string | null {
  const m = title.match(/\b([A-Za-z]+) (\d{1,2}), (\d{4})\s*$/);
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  return month ? `${m[3]}-${month}-${m[2].padStart(2, '0')}` : null;
}

/** "#7 TRAIL BLAZERS at #2 SPURS | FULL GAME …" → "TRAIL BLAZERS at SPURS". */
export function matchupFromTitle(title: string): string {
  return title.split('|')[0].replace(/#\d+\s*/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * The NBA day a video belongs to. Game nights run late in US time, so a clip
 * posted at 03:00 UTC is still the previous evening's game — same 8-hour
 * shift lib/espn-schedule.ts nbaDate() uses for game times.
 */
export function nbaDayOf(iso: string): string {
  return new Date(Date.parse(iso) - 8 * 3_600_000).toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/** A clip posted on the game's NBA day or the day after counts as that game's. */
function postedAround(v: YoutubeVideo, date: string): boolean {
  const day = nbaDayOf(v.publishedAt);
  return day === date || day === addDays(date, 1);
}

/** The player's own clip from that night: his full name in the title, not a full-game recap. */
export function findPlayerVideo(videos: YoutubeVideo[], playerName: string, date: string): YoutubeVideo | null {
  const key = nameKey(playerName);
  if (key.split(' ').length < 2) return null; // a lone surname is too ambiguous
  return videos.find(v =>
    !isFullGameHighlights(v.title) &&
    postedAround(v, date) &&
    ` ${normalize(v.title)} `.includes(` ${key} `)
  ) ?? null;
}

/** Full-game highlights of the game that team played on that date. */
export function findGameVideo(videos: YoutubeVideo[], proTeam: string, date: string): YoutubeVideo | null {
  const nickname = TEAM_NICKNAME[proTeam];
  if (!nickname) return null;
  return videos.find(v => {
    if (!isFullGameHighlights(v.title)) return false;
    const played = dateFromTitle(v.title) ?? nbaDayOf(v.publishedAt);
    if (played !== date) return false;
    return ` ${matchupFromTitle(v.title).toUpperCase()} `.includes(` ${nickname} `);
  }) ?? null;
}

/**
 * Whether a video can play embedded, for viewers here. Fed with a
 * videos.list item (parts: status, contentDetails).
 */
export function isPlayableHere(item: any): boolean {
  if (item?.status?.embeddable !== true) return false;
  if (item?.status?.privacyStatus !== 'public') return false;
  const rr = item?.contentDetails?.regionRestriction;
  if (Array.isArray(rr?.blocked) && rr.blocked.includes(VIEWER_REGION)) return false;
  if (Array.isArray(rr?.allowed) && !rr.allowed.includes(VIEWER_REGION)) return false;
  return true;
}

export function embedUrlFor(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

// ─── Picking clips for top performers ────────────────────────────────────────

export interface Performer {
  date: string;          // NBA day, YYYY-MM-DD
  playerName: string;
  proTeam: string;       // ESPN abbreviation
  fantasyPoints: number;
  ownerName: string;
}

/**
 * One clip per performer: his own video if there is one, else his game's.
 * A game video already used by a better performer isn't repeated.
 */
export function pickClips(performers: Performer[], videos: YoutubeVideo[]): Array<{ performer: Performer; video: YoutubeVideo; kind: 'player' | 'game' }> {
  const used = new Set<string>();
  const out: Array<{ performer: Performer; video: YoutubeVideo; kind: 'player' | 'game' }> = [];
  const ranked = [...performers].sort((a, b) => b.fantasyPoints - a.fantasyPoints);

  for (const performer of ranked) {
    const own = findPlayerVideo(videos, performer.playerName, performer.date);
    const video = own && !used.has(own.id) ? own : findGameVideo(videos, performer.proTeam, performer.date);
    if (!video || used.has(video.id)) continue;
    used.add(video.id);
    out.push({ performer, video, kind: video === own ? 'player' : 'game' });
  }
  return out;
}

export function toHighlight(p: { performer: Performer; video: YoutubeVideo; kind: 'player' | 'game' }): Highlight {
  return {
    id: p.video.id,
    title: p.video.title,
    embedUrl: embedUrlFor(p.video.id),
    source: 'nba on youtube',
    date: p.performer.date,
    match: p.kind === 'game' ? matchupFromTitle(p.video.title) : '',
    player: p.performer.playerName,
    ownerName: p.performer.ownerName,
    fantasyPoints: p.performer.fantasyPoints,
  };
}

// ─── Fetching ────────────────────────────────────────────────────────────────

export class YoutubeError extends Error {}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** One API call. A 5xx ("backendError") is usually momentary, so retry it twice. */
async function get(path: string, params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams({ ...params, key: process.env.YOUTUBE_API_KEY as string });
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API}/${path}?${qs}`);
    if (res.ok) return res.json();
    if (res.status >= 500 && attempt < 2) {
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    let detail = '';
    try { detail = (await res.text()).slice(0, 300).replace(/\s+/g, ' ').trim(); } catch { /* none */ }
    throw new YoutubeError(`YouTube ${path} HTTP ${res.status}${detail ? ` — ${detail}` : ''}`);
  }
}

/** search.list returns titles HTML-escaped ("Jokić &amp; …"); playlistItems doesn't. */
export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/** Official NBA channel id, for search. */
const NBA_CHANNEL_ID = 'UCWJ2lWNubArHWmf3FIHbfcQ';

/**
 * Search the NBA channel between two days. 100 quota units per call, so it's
 * for looking far back (the check script), where paging the whole uploads
 * list would take hundreds of pages — and YouTube starts failing that deep.
 */
export async function searchNbaChannel(q: string, fromDate: string, toDate: string): Promise<YoutubeVideo[]> {
  const data = await get('search', {
    part: 'snippet',
    channelId: NBA_CHANNEL_ID,
    q,
    type: 'video',
    maxResults: '10',
    publishedAfter: `${fromDate}T00:00:00Z`,
    publishedBefore: `${toDate}T23:59:59Z`,
  });
  return ((data.items ?? []) as any[])
    .filter(i => i?.id?.videoId && i?.snippet?.publishedAt)
    .map(i => ({ id: i.id.videoId, title: decodeEntities(String(i.snippet.title ?? '')), publishedAt: i.snippet.publishedAt }));
}

/**
 * Every NBA upload since the given day, newest first. The playlist comes back
 * newest first, so paging stops as soon as a page reaches older videos.
 */
export async function getNbaUploadsSince(sinceDate: string, maxPages = 300): Promise<YoutubeVideo[]> {
  const cutoff = Date.parse(`${sinceDate}T00:00:00Z`);
  const out: YoutubeVideo[] = [];
  let pageToken = '';

  for (let page = 0; page < maxPages; page++) {
    const data = await get('playlistItems', {
      part: 'snippet',
      playlistId: NBA_UPLOADS_PLAYLIST,
      maxResults: '50',
      ...(pageToken ? { pageToken } : {}),
    });
    let reachedOlder = false;
    for (const item of (data.items ?? []) as any[]) {
      const id = item?.snippet?.resourceId?.videoId;
      const publishedAt = item?.snippet?.publishedAt;
      if (!id || !publishedAt) continue;
      if (Date.parse(publishedAt) < cutoff) { reachedOlder = true; continue; }
      out.push({ id, title: String(item.snippet.title ?? ''), publishedAt });
    }
    pageToken = data.nextPageToken ?? '';
    if (reachedOlder || !pageToken) break;
  }
  return out;
}

/** Of the given ids, the ones that can play embedded here (videos.list, 1 unit per 50). */
export async function filterPlayableHere(ids: string[]): Promise<Set<string>> {
  const ok = new Set<string>();
  for (let i = 0; i < ids.length; i += 50) {
    const data = await get('videos', { part: 'status,contentDetails', id: ids.slice(i, i + 50).join(',') });
    for (const item of (data.items ?? []) as any[]) {
      if (isPlayableHere(item)) ok.add(item.id);
    }
  }
  return ok;
}
