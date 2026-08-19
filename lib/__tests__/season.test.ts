import { describe, it, expect } from 'vitest';
import { seasonLabel, seasonLabelDisplay, FIRST_SEASON } from '../season';

/**
 * These are load-bearing beyond display: seasonLabel() feeds the Season query
 * parameter of stats.nba.com, which rejects any other format. A rollover bug
 * here is silent — the API just returns the wrong season.
 */
describe('seasonLabel', () => {
  it('formats an ESPN season id as the NBA season string', () => {
    expect(seasonLabel(2026)).toBe('2025-26');
    expect(seasonLabel(2027)).toBe('2026-27');
  });

  it('uses a plain hyphen, which is what stats.nba.com requires', () => {
    expect(seasonLabel(2027)).not.toContain('–');
    expect(seasonLabel(2027)).toMatch(/^\d{4}-\d{2}$/);
  });

  it('handles a decade rollover', () => {
    expect(seasonLabel(2030)).toBe('2029-30');
    expect(seasonLabel(2031)).toBe('2030-31');
  });

  it('handles a century rollover without producing a bare zero', () => {
    expect(seasonLabel(2100)).toBe('2099-00');
  });
});

describe('seasonLabelDisplay', () => {
  it('uses an en dash for prose', () => {
    expect(seasonLabelDisplay(2027)).toBe('2026–27');
  });

  it('differs from the API format only by the dash', () => {
    expect(seasonLabelDisplay(2027).replace('–', '-')).toBe(seasonLabel(2027));
  });
});

describe('FIRST_SEASON', () => {
  it('predates any season we could roll into', () => {
    expect(FIRST_SEASON).toBeLessThan(2027);
  });
});
