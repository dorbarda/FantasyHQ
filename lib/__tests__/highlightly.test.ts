import { describe, it, expect } from 'vitest';
import {
  isVerified,
  isEmbeddable,
  normalizeHighlight,
  extractItems,
  usableHighlights,
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
