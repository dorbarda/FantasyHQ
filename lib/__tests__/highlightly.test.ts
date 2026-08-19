import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isVerified,
  isEmbeddable,
  normalizeHighlight,
  extractItems,
  usableHighlights,
  getHighlightsForDate,
  getHighlightsForDates,
  hasHighlightlyKey,
  HighlightlyError,
} from '../highlightly';

const GOOD = {
  id: 'h1',
  title: 'Jokic triple-double',
  embedUrl: 'https://www.youtube.com/embed/abc123',
  embeddable: true,
  verified: true,
  source: 'YouTube',
  date: '2025-12-01',
  match: { title: 'DEN @ LAL' },
};

describe('rights checks', () => {
  it('accepts a clip that is both embeddable and verified', () => {
    expect(isEmbeddable(GOOD)).toBe(true);
    expect(isVerified(GOOD)).toBe(true);
  });

  it('rejects a clip that may not be embedded', () => {
    expect(isEmbeddable({ ...GOOD, embeddable: false })).toBe(false);
  });

  it('rejects a clip with no embed URL even when the flag says yes', () => {
    expect(isEmbeddable({ ...GOOD, embedUrl: undefined })).toBe(false);
  });

  it('treats a missing embeddable flag as not embeddable', () => {
    expect(isEmbeddable({ ...GOOD, embeddable: undefined })).toBe(false);
  });

  it('accepts VERIFIED expressed as a string state', () => {
    expect(isVerified({ verified: 'VERIFIED' })).toBe(true);
    expect(isVerified({ verificationStatus: 'verified' })).toBe(true);
  });

  it('rejects an unverified clip', () => {
    expect(isVerified({ verified: false })).toBe(false);
    expect(isVerified({ verified: 'UNVERIFIED' })).toBe(false);
    expect(isVerified({})).toBe(false);
  });
});

describe('normalizeHighlight', () => {
  it('maps the fields the UI needs', () => {
    const clip = normalizeHighlight(GOOD, '2025-12-01')!;
    expect(clip).toEqual({
      id: 'h1',
      title: 'Jokic triple-double',
      embedUrl: 'https://www.youtube.com/embed/abc123',
      source: 'youtube',
      date: '2025-12-01',
      match: 'DEN @ LAL',
    });
  });

  it('refuses any clip failing the rights check', () => {
    expect(normalizeHighlight({ ...GOOD, embeddable: false }, '2025-12-01')).toBeNull();
    expect(normalizeHighlight({ ...GOOD, verified: false }, '2025-12-01')).toBeNull();
  });

  it('falls back to the requested date when the item has none', () => {
    const clip = normalizeHighlight({ ...GOOD, date: undefined }, '2025-12-02')!;
    expect(clip.date).toBe('2025-12-02');
  });

  it('trims a full timestamp down to a day', () => {
    const clip = normalizeHighlight({ ...GOOD, date: '2025-12-01T23:10:00Z' }, '')!;
    expect(clip.date).toBe('2025-12-01');
  });

  it('survives junk instead of throwing', () => {
    expect(normalizeHighlight(null, '2025-12-01')).toBeNull();
    expect(normalizeHighlight('nope', '2025-12-01')).toBeNull();
    expect(normalizeHighlight({}, '2025-12-01')).toBeNull();
  });
});

describe('extractItems', () => {
  it('accepts a bare array', () => {
    expect(extractItems([GOOD])).toHaveLength(1);
  });

  it('accepts the common envelope keys', () => {
    for (const key of ['data', 'highlights', 'results', 'response']) {
      expect(extractItems({ [key]: [GOOD] })).toHaveLength(1);
    }
  });

  it('returns nothing for an unrecognised shape', () => {
    expect(extractItems(null)).toEqual([]);
    expect(extractItems({ nope: [GOOD] })).toEqual([]);
  });
});

describe('usableHighlights', () => {
  it('keeps only clips that pass both rights checks', () => {
    const raw = {
      data: [
        GOOD,
        { ...GOOD, id: 'h2', embeddable: false },      // not embeddable
        { ...GOOD, id: 'h3', verified: false },        // not verified
        { ...GOOD, id: 'h4' },                         // fine
      ],
    };
    const clips = usableHighlights(raw, '2025-12-01');
    expect(clips.map(c => c.id)).toEqual(['h1', 'h4']);
  });

  it('deduplicates by id', () => {
    const raw = { data: [GOOD, { ...GOOD }, { ...GOOD }] };
    expect(usableHighlights(raw, '2025-12-01')).toHaveLength(1);
  });

  it('respects the limit', () => {
    const raw = { data: Array.from({ length: 20 }, (_, i) => ({ ...GOOD, id: `h${i}` })) };
    expect(usableHighlights(raw, '2025-12-01', 3)).toHaveLength(3);
  });

  it('returns nothing when every clip fails the rights check', () => {
    const raw = { data: [{ ...GOOD, verified: false }, { ...GOOD, id: 'x', embeddable: false }] };
    expect(usableHighlights(raw, '2025-12-01')).toEqual([]);
  });

  it('returns nothing for an unexpected response shape', () => {
    expect(usableHighlights({ unexpected: true }, '2025-12-01')).toEqual([]);
    expect(usableHighlights(null, '2025-12-01')).toEqual([]);
  });
});

/**
 * A refusal and a quiet day look identical if you only check for an empty
 * result — that mix-up reported a real 403 as "no data for this season yet".
 */
describe('API refusal vs. a quiet day', () => {
  const realFetch = globalThis.fetch;
  const realKey = process.env.HIGHLIGHTLY_API_KEY;

  beforeEach(() => { process.env.HIGHLIGHTLY_API_KEY = 'test-key'; });
  afterEach(() => {
    globalThis.fetch = realFetch;
    if (realKey === undefined) delete process.env.HIGHLIGHTLY_API_KEY;
    else process.env.HIGHLIGHTLY_API_KEY = realKey;
  });

  function mockFetch(init: { ok: boolean; status?: number; body?: unknown; text?: string }) {
    globalThis.fetch = (async () => ({
      ok: init.ok,
      status: init.status ?? 200,
      json: async () => init.body ?? {},
      text: async () => init.text ?? '',
    })) as unknown as typeof fetch;
  }

  it('throws on a 403 rather than pretending there were no clips', async () => {
    mockFetch({ ok: false, status: 403, text: 'plan does not include highlights' });
    await expect(getHighlightsForDate('2026-04-15')).rejects.toBeInstanceOf(HighlightlyError);
  });

  it('explains what a 403 usually means and quotes the body', async () => {
    mockFetch({ ok: false, status: 403, text: 'plan does not include highlights' });
    await expect(getHighlightsForDate('2026-04-15')).rejects.toThrow(/not allowed/);
    await expect(getHighlightsForDate('2026-04-15')).rejects.toThrow(/plan does not include highlights/);
  });

  it('names the rate limit on a 429', async () => {
    mockFetch({ ok: false, status: 429 });
    await expect(getHighlightsForDate('2026-04-15')).rejects.toThrow(/100\/day/);
  });

  it('points at the header on a 401', async () => {
    mockFetch({ ok: false, status: 401 });
    await expect(getHighlightsForDate('2026-04-15')).rejects.toThrow(/wrong header/);
  });

  it('returns empty — not an error — when the API answers with no clips', async () => {
    mockFetch({ ok: true, body: { data: [] } });
    await expect(getHighlightsForDate('2026-08-15')).resolves.toEqual([]);
  });

  it('rethrows when every date was refused', async () => {
    mockFetch({ ok: false, status: 403 });
    await expect(getHighlightsForDates(['2026-04-15', '2026-04-16'])).rejects.toBeInstanceOf(HighlightlyError);
  });

  it('stays quiet when the API simply had nothing on those days', async () => {
    mockFetch({ ok: true, body: { data: [] } });
    await expect(getHighlightsForDates(['2026-08-15', '2026-08-16'])).resolves.toEqual({});
  });
});

describe('hasHighlightlyKey', () => {
  const realKey = process.env.HIGHLIGHTLY_API_KEY;
  afterEach(() => {
    if (realKey === undefined) delete process.env.HIGHLIGHTLY_API_KEY;
    else process.env.HIGHLIGHTLY_API_KEY = realKey;
  });

  it('reflects the environment at call time, not at import time', () => {
    delete process.env.HIGHLIGHTLY_API_KEY;
    expect(hasHighlightlyKey()).toBe(false);
    process.env.HIGHLIGHTLY_API_KEY = 'set-later';
    expect(hasHighlightlyKey()).toBe(true);
  });
});
