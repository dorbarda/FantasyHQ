/**
 * Owner-only access for the trade suggestions (docs/TRADE-SUGGESTIONS-SPEC.md §5).
 *
 * Each owner has a short passcode in the `OWNER_KEYS` env var —
 * `{"dor-barda": "KN6J", …}`, keyed by ownerToSlug(). Never in the repo.
 * The commissioner's `ADMIN_KEY` opens every team.
 *
 * A correct code sets a signed cookie: `<slug>.<expiresMs>.<hmac>`, where
 * slug is `*` for the commissioner. The HMAC key is OWNER_KEYS itself, so
 * changing any code logs everyone out.
 *
 * Pure apart from node:crypto — the env, cookie and clock are passed in.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export const TRADES_COOKIE = 'fhq_trades';
export const SESSION_DAYS = 180;
export const ADMIN_SLUG = '*';

/** Wrong codes allowed per IP and owner before a cool-down. */
export const MAX_ATTEMPTS = 5;
export const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

/** `{"dor-barda": "KN6J"}` → Map, codes upper-cased. Bad JSON → empty map (nobody gets in). */
export function parseOwnerKeys(raw: string | undefined): Map<string, string> {
  if (!raw) return new Map();
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return new Map();
    return new Map(
      Object.entries(parsed)
        .filter((e): e is [string, string] => typeof e[1] === 'string' && e[1].trim() !== '')
        .map(([slug, code]) => [slug, code.trim().toUpperCase()]),
    );
  } catch {
    return new Map();
  }
}

function sameText(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Who a typed code unlocks for this owner's page: the owner's slug, `*` for
 * the commissioner, or null. Case-insensitive; spaces ignored.
 */
export function checkCode(
  slug: string,
  typed: string,
  keys: Map<string, string>,
  adminKey: string | undefined,
): string | null {
  const code = typed.replace(/\s+/g, '').toUpperCase();
  if (!code) return null;
  const ownerCode = keys.get(slug);
  if (ownerCode && sameText(code, ownerCode)) return slug;
  if (adminKey && sameText(typed.trim(), adminKey)) return ADMIN_SLUG;
  return null;
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function makeSession(slug: string, secret: string, now: number): string {
  const payload = `${slug}.${now + SESSION_DAYS * 86_400_000}`;
  return `${payload}.${sign(payload, secret)}`;
}

/** The slug a cookie proves (`*` = commissioner), or null if forged, expired or malformed. */
export function readSession(cookie: string | undefined, secret: string, now: number): string | null {
  if (!cookie || !secret) return null;
  const parts = cookie.split('.');
  if (parts.length !== 3) return null;
  const [slug, expires, mac] = parts;
  if (!sameText(mac, sign(`${slug}.${expires}`, secret))) return null;
  if (!(Number(expires) > now)) return null;
  return slug;
}

export function canView(session: string | null, slug: string): boolean {
  return session === ADMIN_SLUG || (session !== null && session === slug);
}

// ─── Rate limit ──────────────────────────────────────────────────────────────

export type AttemptStore = Map<string, { count: number; resetAt: number }>;

/**
 * Count a wrong code. Returns ms to wait when the key is locked out, else 0.
 * Best effort: the store lives in one server instance's memory, so the limit
 * is per instance — enough to stop someone looping through 4-character codes.
 */
export function recordFailure(store: AttemptStore, key: string, now: number): number {
  const entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
    return 0;
  }
  entry.count++;
  return entry.count >= MAX_ATTEMPTS ? entry.resetAt - now : 0;
}

/** ms until this key may try again; 0 = go ahead. */
export function lockedFor(store: AttemptStore, key: string, now: number): number {
  const entry = store.get(key);
  if (!entry || entry.resetAt <= now || entry.count < MAX_ATTEMPTS) return 0;
  return entry.resetAt - now;
}
