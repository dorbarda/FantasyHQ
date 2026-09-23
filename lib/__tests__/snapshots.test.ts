import { describe, it, expect, vi, beforeEach } from 'vitest';

// readSnapshot reads data/snapshots/<name>.json — serve fake files instead.
const files: Record<string, string> = {};
vi.mock('fs', () => ({
  readFileSync: (file: string) => {
    const name = String(file).split(/[\\/]/).pop()!.replace('.json', '');
    if (!(name in files)) throw new Error('ENOENT');
    return files[name];
  },
}));

const { readSnapshot } = await import('../snapshots');
const { CURRENT_SEASON } = await import('../season');

function put(name: string, body: object) {
  files[name] = JSON.stringify({ generatedAt: '2026-09-22T09:00:00.000Z', data: { rows: [1] }, ...body });
}

/**
 * After a rollover the nightly job keeps last season's file until the new
 * season has data. These guard against that file rendering as the new season
 * — which is exactly what happened on the live recap in September 2026.
 */
describe('readSnapshot season check', () => {
  beforeEach(() => { for (const k of Object.keys(files)) delete files[k]; });

  it('returns a season-scoped snapshot written for the current season', () => {
    put('matchup-depth', { season: CURRENT_SEASON });
    expect(readSnapshot('matchup-depth')?.data).toEqual({ rows: [1] });
  });

  it("rejects a season-scoped snapshot from last season", () => {
    put('matchup-depth', { season: CURRENT_SEASON - 1 });
    expect(readSnapshot('matchup-depth')).toBeNull();
  });

  it('rejects an untagged season-scoped snapshot', () => {
    put('transactions', {});
    expect(readSnapshot('transactions')).toBeNull();
  });

  it('keeps all-time snapshots from an earlier season', () => {
    put('records', { season: CURRENT_SEASON - 1 });
    put('history', {});
    expect(readSnapshot('records')).not.toBeNull();
    expect(readSnapshot('history')).not.toBeNull();
  });

  it('returns null for a missing file', () => {
    expect(readSnapshot('stats')).toBeNull();
  });
});
