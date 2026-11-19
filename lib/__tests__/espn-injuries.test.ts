import { describe, it, expect } from 'vitest';
import { applyInjuryDetails, injuredPlayerIds } from '../espn-injuries';

const league = () => ({ teams: [{ roster: { entries: [
  { playerPoolEntry: { player: { id: 1, injuryStatus: 'OUT' } } },
  { playerPoolEntry: { player: { id: 2, injuryStatus: 'ACTIVE' } } },
  { playerPoolEntry: { player: { id: 3, injuryStatus: 'DAY_TO_DAY' } } },
] } }] });

describe('espn-injuries', () => {
  it('asks only for players who are not ACTIVE, once each', () => {
    expect(injuredPlayerIds([league(), league()])).toEqual([1, 3]);
  });
  it('copies the return date onto every roster copy of the player', () => {
    const a = league(); const b = league();
    const d = { expectedReturnDate: [2026, 11, 21], outForSeason: false };
    const n = applyInjuryDetails([a, b], { players: [{ player: { id: 1, injuryDetails: d } }] });
    expect(n).toBe(2);
    expect((a.teams[0].roster.entries[0].playerPoolEntry.player as any).injuryDetails).toEqual(d); // eslint-disable-line @typescript-eslint/no-explicit-any
  });
});
