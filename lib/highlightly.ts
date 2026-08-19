/**
 * Highlightly — NBA highlight clips for the weekly recap.
 *
 * Why this vendor: it's the only free source that carries video. Everything
 * else in docs/DATA-SOURCES.md gives numbers.
 *
 * ── Rights ───────────────────────────────────────────────────────────────
 * Clips are aggregated from YouTube, Twitter, Reddit and similar, so not all
 * of them are legal to embed. Two fields decide it:
 *   • `embeddable` — whether embedding is permitted at all
 *   • a VERIFIED marker — the clip comes from an official rights-holding channel
 * usableHighlights() below keeps only clips that satisfy BOTH, and it is the
 * only function the UI is allowed to take clips from. An unverified clip is
 * somebody's re-upload; embedding that, even on a private site, is the thing
 * to avoid. Do not relax this filter without deciding that deliberately.
 *
 * ── Shape confidence ─────────────────────────────────────────────────────
 * The environment this was written in cannot reach Highlightly, so the base
 * URL, header name and response shape all come from their documentation
 * rather than a live call. The parser therefore accepts several plausible
 * shapes and returns [] instead of throwing. Run `npm run probe-sources`
 * (with HIGHLIGHTLY_API_KEY set) to see the real response and confirm.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Config is read at call time, not module load. The snapshot script loads
 * .env.local itself, and tests need to vary the key — neither works if the
 * value is frozen the moment this module is imported.
 */
const DEFAULT_HOST = 'basketball.highlightly.net';

function apiKey(): string | undefined {
  return process.env.HIGHLIGHTLY_API_KEY;
}

/**
 * Direct Highlightly access. If the key came from RapidAPI instead, set
 * HIGHLIGHTLY_API_HOST to the RapidAPI host and the request switches to
 * RapidAPI's header pair.
 */
function apiHost(): string {
  return process.env.HIGHLIGHTLY_API_HOST || DEFAULT_HOST;
}

export function hasHighlightlyKey() {
  return !!apiKey();
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Highlight {
  id: string;
  title: string;
  /** URL safe to embed in an iframe — only set when embedding is permitted. */
  embedUrl: string;
  /** Where the clip was aggregated from: youtube, twitter, reddit, espn… */
  source: string;
  /** YYYY-MM-DD, the day the game was played. */
  date: string;
  /** Free-text description of the match, when the API supplies one. */
  match: string;
}

/** Clips grouped by the day they belong to. */
export type HighlightsByDate = Record<string, Highlight[]>;

// ─── Pure parsing and filtering ──────────────────────────────────────────────

function firstString(...values: unknown[]): string {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

/** True when the API marked this clip as coming from a verified/official source. */
export function isVerified(raw: any): boolean {
  // Documented as a VERIFIED marker; seen described both as a boolean flag and
  // as a string state, so accept either rather than guessing one.
  if (raw?.verified === true) return true;
  const state = firstString(raw?.verified, raw?.verificationStatus, raw?.state, raw?.status);
  return state.toUpperCase() === 'VERIFIED';
}

/** True when the API says this clip may be embedded. */
export function isEmbeddable(raw: any): boolean {
  return raw?.embeddable === true && !!firstString(raw?.embedUrl, raw?.embed_url);
}

/**
 * Normalize one API item. Returns null when it isn't a usable clip — that
 * includes anything failing the rights check, so callers can't accidentally
 * keep one.
 */
export function normalizeHighlight(raw: any, fallbackDate: string): Highlight | null {
  if (!raw || typeof raw !== 'object') return null;
  if (!isEmbeddable(raw) || !isVerified(raw)) return null;

  const embedUrl = firstString(raw.embedUrl, raw.embed_url);
  if (!embedUrl) return null;

  const id = firstString(raw.id, raw.highlightId, embedUrl);
  const date = firstString(raw.date, raw.matchDate, fallbackDate).slice(0, 10);

  return {
    id,
    title: firstString(raw.title, raw.description, 'NBA highlight'),
    embedUrl,
    source: firstString(raw.source, 'unknown').toLowerCase(),
    date,
    match: firstString(raw.match?.title, raw.matchTitle, raw.match?.name),
  };
}

/** Pull the clip array out of whichever envelope the API used. */
export function extractItems(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  for (const key of ['data', 'highlights', 'results', 'response']) {
    if (Array.isArray(raw?.[key])) return raw[key];
  }
  return [];
}

/**
 * The ONLY way clips should reach the UI: parse, then keep just the ones that
 * are both embeddable and verified. Deduplicated by id.
 */
export function usableHighlights(raw: any, date: string, limit = 6): Highlight[] {
  const seen = new Set<string>();
  const out: Highlight[] = [];

  for (const item of extractItems(raw)) {
    const clip = normalizeHighlight(item, date);
    if (!clip || seen.has(clip.id)) continue;
    seen.add(clip.id);
    out.push(clip);
    if (out.length >= limit) break;
  }
  return out;
}

// ─── Fetching ────────────────────────────────────────────────────────────────

function headers(): Record<string, string> {
  const key = apiKey() as string;
  const host = apiHost();
  if (host.includes('rapidapi.com')) {
    return { 'x-rapidapi-key': key, 'x-rapidapi-host': host, Accept: 'application/json' };
  }
  return { 'x-api-key': key, Accept: 'application/json' };
}

/** The API refused us — as opposed to answering with no clips. */
export class HighlightlyError extends Error {}

/**
 * Highlights for one date.
 *
 * Throws HighlightlyError when the API refuses the request, and returns [] when
 * it answers with nothing usable. Keeping those apart matters: "no clips" is
 * normal out of season, while a refusal means the key, host or header is wrong
 * and someone has to go fix it. Only the nightly job calls this — pages read
 * the snapshot file — so throwing here cannot affect a page render.
 */
export async function getHighlightsForDate(date: string, limit = 6): Promise<Highlight[]> {
  if (!apiKey()) return [];

  const host = apiHost();
  const url = `https://${host}/highlights?date=${encodeURIComponent(date)}&leagueName=NBA&limit=${limit * 4}`;
  let res: Response;
  try {
    res = await fetch(url, { headers: headers(), next: { revalidate: 86400 } } as RequestInit);
  } catch (err) {
    throw new HighlightlyError(`could not reach ${host}: ${err instanceof Error ? err.message : err}`);
  }

  if (!res.ok) {
    // The body normally says exactly why — quota, plan, bad key — and that is
    // the difference between a five-second fix and an afternoon of guessing.
    let detail = '';
    try {
      detail = (await res.text()).slice(0, 200).replace(/\s+/g, ' ').trim();
    } catch {
      /* body unavailable — status alone still tells us something */
    }
    const hint =
      res.status === 401 ? ' (key not accepted — wrong header for this key?)'
      : res.status === 403 ? ' (key accepted but not allowed — wrong host, or plan lacks /highlights?)'
      : res.status === 429 ? ' (rate limited — free tier is 100/day)'
      : '';
    throw new HighlightlyError(
      `HTTP ${res.status} from ${host} for ${date}${hint}${detail ? ` — ${detail}` : ''}`
    );
  }

  try {
    return usableHighlights(await res.json(), date, limit);
  } catch (err) {
    throw new HighlightlyError(`unreadable response for ${date}: ${err instanceof Error ? err.message : err}`);
  }
}

/**
 * Highlights for a set of dates, fetched in sequence to stay polite on a
 * 100-requests-a-day free tier. Days with nothing usable are omitted.
 *
 * If EVERY date was refused, the API is misconfigured rather than quiet, so
 * this rethrows the first reason instead of returning an innocent-looking {}.
 */
export async function getHighlightsForDates(
  dates: string[],
  perDay = 4
): Promise<HighlightsByDate> {
  const byDate: HighlightsByDate = {};
  let firstError: HighlightlyError | null = null;
  let refused = 0;

  for (const date of dates) {
    try {
      const clips = await getHighlightsForDate(date, perDay);
      if (clips.length > 0) byDate[date] = clips;
    } catch (err) {
      refused++;
      if (!firstError && err instanceof HighlightlyError) firstError = err;
    }
  }

  if (firstError && refused === dates.length) throw firstError;
  return byDate;
}
