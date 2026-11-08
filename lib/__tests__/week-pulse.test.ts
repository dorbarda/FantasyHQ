import { describe, expect, it } from 'vitest';
import { shortName, tonightFrom, winPulse } from '../week-pulse';
import type { WinProbPoint } from '../week-daily';
import type { ProjectedPlayer } from '../week-projections';

const day = (slot: number, left: number): WinProbPoint => ({ label: `d${slot}`, date: null, left, slot, kind: 'day' });
const change = (slot: number, left: number): WinProbPoint => ({ label: 'c', date: null, left, slot, kind: 'change' });

describe('winPulse', () => {
  it('is null with no points', () => {
    expect(winPulse([])).toBeNull();
  });

  it('has no swing before the first night', () => {
    expect(winPulse([day(0, 0.6), change(0.5, 0.55)])).toEqual({ now: 0.55, lastNight: null });
  });

  it('swing = last day dot minus the dot before it', () => {
    expect(winPulse([day(0, 0.5), day(1, 0.4), change(1.5, 0.45), day(2, 0.7)]))
      .toEqual({ now: 0.7, lastNight: 0.25 });
  });

  it('now follows a move after the night, swing stays the night', () => {
    expect(winPulse([day(0, 0.5), day(1, 0.4), day(2, 0.3), change(2.4, 0.35)]))
      .toEqual({ now: 0.35, lastNight: -0.1 });
  });
});

describe('tonightFrom', () => {
  const p = (name: string, avg: number, games: number): ProjectedPlayer =>
    ({ name, pos: 'F', nba: 'BOS', status: 'ACTIVE', onIR: false, avg, games, projected: avg * games });

  it('counts games and keeps the best averages', () => {
    const t = tonightFrom([p('A', 30, 1), p('B', 50, 1), p('C', 60, 0), p('D', 20, 1)]);
    expect(t.games).toBe(3);
    expect(t.top.map(x => x.name)).toEqual(['B', 'A']);
  });

  it('is empty when nobody plays', () => {
    expect(tonightFrom([p('A', 30, 0)])).toEqual({ games: 0, top: [] });
  });
});

describe('shortName', () => {
  it('shortens first names', () => {
    expect(shortName('Jayson Tatum')).toBe('J. Tatum');
    expect(shortName('Shai Gilgeous-Alexander')).toBe('S. Gilgeous-Alexander');
    expect(shortName('Nene')).toBe('Nene');
  });
});
