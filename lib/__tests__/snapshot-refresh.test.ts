import { describe, it, expect } from 'vitest';
import { refreshStatus, type RunInfo } from '../snapshot-refresh';

const NOW = Date.parse('2026-10-25T12:00:00Z');
const ago = (min: number) => new Date(NOW - min * 60_000).toISOString();
const run = (startedMin: number, conclusion: string | null, status = 'completed'): RunInfo => ({
  status,
  startedAt: ago(startedMin),
  snapshot: { conclusion, completedAt: conclusion ? ago(startedMin - 3) : null },
});

describe('refreshStatus', () => {
  it('allows an update 30+ minutes after the last one', () => {
    const s = refreshStatus([run(40, 'success')], NOW);
    expect(s.lastUpdate).toBe(ago(37));
    expect(s.nextAllowedAt).toBeNull();
  });

  it('blocks for 30 minutes after the last update', () => {
    const s = refreshStatus([run(20, 'success')], NOW);
    expect(s.nextAllowedAt).toBe(new Date(Date.parse(ago(17)) + 30 * 60_000).toISOString());
  });

  it('blocks while a run is going and keeps the previous update time', () => {
    const s = refreshStatus([run(2, null, 'in_progress'), run(300, 'success')], NOW);
    expect(s.running).toBe(true);
    expect(s.lastUpdate).toBe(ago(297));
    expect(s.nextAllowedAt).not.toBeNull();
  });

  it('ignores scheduled runs that skipped the snapshot job', () => {
    const s = refreshStatus([run(5, 'skipped'), run(60, 'success')], NOW);
    expect(s.lastUpdate).toBe(ago(57));
    expect(s.nextAllowedAt).toBeNull();
  });

  it('a recent failed run also blocks, but is not the last update', () => {
    const s = refreshStatus([run(10, 'failure'), run(60, 'success')], NOW);
    expect(s.lastUpdate).toBe(ago(57));
    expect(s.nextAllowedAt).toBe(new Date(Date.parse(ago(10)) + 30 * 60_000).toISOString());
  });
});
