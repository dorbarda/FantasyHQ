import { describe, it, expect } from 'vitest';
import {
  parseOwnerKeys, checkCode, makeSession, readSession, canView,
  recordFailure, lockedFor, ADMIN_SLUG, MAX_ATTEMPTS, ATTEMPT_WINDOW_MS, SESSION_DAYS, type AttemptStore,
} from '../owner-auth';

const RAW = '{"dor-barda": "kn6j", "nir-zele": "ZX8N", "empty": " "}';
const keys = parseOwnerKeys(RAW);
const NOW = Date.UTC(2026, 9, 26);

describe('parseOwnerKeys', () => {
  it('upper-cases codes and drops empty ones', () => {
    expect([...keys]).toEqual([['dor-barda', 'KN6J'], ['nir-zele', 'ZX8N']]);
  });
  it('locks everyone out on missing or broken config', () => {
    expect(parseOwnerKeys(undefined).size).toBe(0);
    expect(parseOwnerKeys('not json').size).toBe(0);
    expect(parseOwnerKeys('["KN6J"]').size).toBe(0);
  });
});

describe('checkCode', () => {
  it('opens only the owner the code belongs to', () => {
    expect(checkCode('dor-barda', 'KN6J', keys, undefined)).toBe('dor-barda');
    expect(checkCode('nir-zele', 'KN6J', keys, undefined)).toBeNull();
  });
  it('ignores case and spaces', () => {
    expect(checkCode('dor-barda', ' kn 6j ', keys, undefined)).toBe('dor-barda');
  });
  it('lets the commissioner in anywhere, and nobody with an empty code', () => {
    expect(checkCode('nir-zele', 'boss-key', keys, 'boss-key')).toBe(ADMIN_SLUG);
    expect(checkCode('dor-barda', '', keys, '')).toBeNull();
    expect(checkCode('unknown', 'KN6J', keys, undefined)).toBeNull();
  });
});

describe('sessions', () => {
  const cookie = makeSession('dor-barda', RAW, NOW);

  it('round-trips and expires', () => {
    expect(readSession(cookie, RAW, NOW + 1000)).toBe('dor-barda');
    expect(readSession(cookie, RAW, NOW + SESSION_DAYS * 86_400_000 + 1)).toBeNull();
  });
  it('rejects a cookie edited to another owner', () => {
    const [, expires, mac] = cookie.split('.');
    expect(readSession(`nir-zele.${expires}.${mac}`, RAW, NOW)).toBeNull();
  });
  it('logs everyone out when the codes change, and without a secret', () => {
    expect(readSession(cookie, RAW.replace('ZX8N', 'AAAA'), NOW)).toBeNull();
    expect(readSession(cookie, '', NOW)).toBeNull();
    expect(readSession('junk', RAW, NOW)).toBeNull();
  });
  it('canView: own page or commissioner', () => {
    expect(canView('dor-barda', 'dor-barda')).toBe(true);
    expect(canView('dor-barda', 'nir-zele')).toBe(false);
    expect(canView(ADMIN_SLUG, 'nir-zele')).toBe(true);
    expect(canView(null, 'nir-zele')).toBe(false);
  });
});

describe('rate limit', () => {
  it(`locks after ${MAX_ATTEMPTS} wrong codes until the window ends`, () => {
    const store: AttemptStore = new Map();
    for (let i = 1; i < MAX_ATTEMPTS; i++) expect(recordFailure(store, 'ip|dor', NOW)).toBe(0);
    expect(recordFailure(store, 'ip|dor', NOW)).toBe(ATTEMPT_WINDOW_MS);
    expect(lockedFor(store, 'ip|dor', NOW + 1000)).toBe(ATTEMPT_WINDOW_MS - 1000);
    expect(lockedFor(store, 'ip|other', NOW)).toBe(0);
    expect(lockedFor(store, 'ip|dor', NOW + ATTEMPT_WINDOW_MS)).toBe(0);
    expect(recordFailure(store, 'ip|dor', NOW + ATTEMPT_WINDOW_MS)).toBe(0); // fresh window
  });
});
