import { describe, it, expect } from 'vitest';
import {
  buildRequest, validateRequestAnswers, applyAnswers, requestsLeftToday, israelDay, nextAnswerRun,
  pickerRosters, pendingRequests,
  type PickerTeam, type TradeRequest, type TradeRequestFile, type RequestAnswerDraft,
} from '../trade-requests';
import type { TradeInput, TradeInputPlayer, TradeInputTeam } from '../trade-input';

// ── Fixtures ─────────────────────────────────────────────────────────────────

function player(playerId: number, name: string, projected: number, tradeable = true): TradeInputPlayer {
  return {
    playerId, name, proTeam: 'BOS', positions: ['PG'], slot: 'starter', injuryStatus: 'ACTIVE', gamesPlayed: 3,
    acquisition: { type: 'DRAFT', date: null, daysOnRoster: 20 }, tradeable,
    avg: { season: 40, last7: 40, last15: 40, last30: 40, lastSeason: 35.5, projected },
    leagueRank: 5, projectedRank: 7,
    games: { thisWeek: 4, restOfRegularSeason: 56, playoffs: 13, playoffsByRound: [7, 3, 3] },
  };
}

function team(owner: string, seed: number, roster: TradeInputPlayer[]): TradeInputTeam {
  return {
    teamId: seed, teamName: `${owner} FC`, owner, divisionId: 0,
    record: { wins: 1, losses: 0, ties: 0 }, pointsFor: 812.4, pointsAgainst: 700,
    seed, moves: { acquisitions: 5, drops: 4, trades: 0 }, upcomingOpponents: [], roster,
  };
}

const input: TradeInput = {
  season: 2027, generatedAt: 'input-time', week: 3, today: 20,
  league: {
    name: 'L', teamCount: 3, regularSeasonWeeks: 18, playoffTeams: 8, playoffSeedingRule: 'X',
    tradeDeadline: null, vetoVotesRequired: 4, tradeReviewHours: 24, lineupSlots: { PG: 5 }, periods: [],
  },
  teams: [
    team('Ann Lee', 1, [player(1, 'Star One', 50.2), player(2, 'Depth Two', 20.1), player(9, 'New Guy', 15, false)]),
    team('Bob Ray', 2, [player(3, 'Bob Guard', 45.6), player(4, 'Bob Wing', 30)]),
    team('Cid Fox', 3, [player(5, 'Cid Big', 25.3)]),
  ],
};

const req = (over: Partial<TradeRequest>): TradeRequest => ({
  id: 'r1', kind: 'sell', playerId: 2, playerName: 'Depth Two', playerOwner: 'Ann Lee', note: '',
  createdAt: '2026-11-11T08:00:00.000Z', by: 'owner', status: 'pending', ...over,
});

const fileOf = (requests: TradeRequest[], owner = 'Ann Lee'): TradeRequestFile => ({ season: 2027, owner, requests });

const idea = (partnerOwner: string, give: number[], get: number[]) => ({
  partnerOwner, give, get, angles: ['depth'], whyForYou: 'Fills a hole.', whyTheyAccept: 'They need a guard.',
});

const check = (files: TradeRequestFile[], draft: RequestAnswerDraft) =>
  validateRequestAnswers(input, files, draft, { generatedAt: 'now' });

// ── buildRequest ─────────────────────────────────────────────────────────────

const rosters: PickerTeam[] = [
  { owner: 'Ann Lee', teamName: 'A', players: [{ playerId: 1, name: 'Star One', proTeam: 'BOS', positions: ['PG'] }] },
  { owner: 'Bob Ray', teamName: 'B', players: [{ playerId: 3, name: 'Bob Guard', proTeam: 'LAL', positions: ['SG'] }] },
];
const now = new Date('2026-11-11T08:15:03.123Z');

describe('buildRequest', () => {
  it('builds a sell request for your own player', () => {
    const r = buildRequest({ owner: 'Ann Lee', kind: 'sell', playerId: 1, note: '  need  a C ', by: 'owner' }, rosters, now, 'ab12');
    expect(r).toEqual({
      request: {
        id: '2026-11-11T08-15-03-123Z-ab12', kind: 'sell', playerId: 1, playerName: 'Star One', playerOwner: 'Ann Lee',
        note: 'need a C', createdAt: now.toISOString(), by: 'owner', status: 'pending',
      },
    });
  });

  it('records who has the player for a buy request', () => {
    const r = buildRequest({ owner: 'Ann Lee', kind: 'buy', playerId: 3, note: '', by: 'owner' }, rosters, now, 'x');
    expect('request' in r && r.request.playerOwner).toBe('Bob Ray');
  });

  it('refuses the wrong side, unknown players and long notes', () => {
    const base = { owner: 'Ann Lee', note: '', by: 'owner' as const };
    expect(buildRequest({ ...base, kind: 'sell', playerId: 3 }, rosters, now, 'x')).toEqual({ error: 'Bob Guard is not on your roster.' });
    expect(buildRequest({ ...base, kind: 'buy', playerId: 1 }, rosters, now, 'x')).toEqual({ error: 'Star One is already yours.' });
    expect(buildRequest({ ...base, kind: 'buy', playerId: 77 }, rosters, now, 'x')).toHaveProperty('error');
    expect(buildRequest({ ...base, kind: 'trade', playerId: 1 }, rosters, now, 'x')).toHaveProperty('error');
    expect(buildRequest({ ...base, kind: 'sell', playerId: 1, note: 'x'.repeat(201) }, rosters, now, 'x')).toHaveProperty('error');
  });
});

// ── Limits and times ─────────────────────────────────────────────────────────

describe('requestsLeftToday', () => {
  it('counts the owner\'s requests on the Israel day only', () => {
    const f = fileOf([
      req({ id: 'a', createdAt: '2026-11-10T21:30:00.000Z' }), // 23:30 Israel, day before
      req({ id: 'b', createdAt: '2026-11-10T22:30:00.000Z' }), // 00:30 Israel, today
      req({ id: 'c', createdAt: '2026-11-11T07:00:00.000Z', by: 'commissioner' }),
    ]);
    expect(israelDay('2026-11-10T22:30:00.000Z')).toBe('2026-11-11');
    expect(requestsLeftToday(f, now)).toBe(1);
    expect(requestsLeftToday(null, now)).toBe(2);
  });
});

describe('nextAnswerRun', () => {
  it('rounds the next run to the hour, wrapping to the morning', () => {
    expect(nextAnswerRun(new Date('2026-11-11T06:00:00Z'))).toBe('10:00'); // 08:00 Israel
    expect(nextAnswerRun(new Date('2026-11-11T08:00:00Z'))).toBe('16:00'); // 10:00 Israel
    expect(nextAnswerRun(new Date('2026-11-11T20:00:00Z'))).toBe('10:00'); // 22:00 Israel
  });
});

describe('pickerRosters', () => {
  it('names owners like the trade input and lists positions', () => {
    const league = {
      members: [{ id: 'm1', firstName: 'Ann', lastName: 'Lee' }],
      teams: [{ id: 1, name: ' A ', primaryOwner: 'm1', roster: { entries: [
        { playerPoolEntry: { player: { id: 1, fullName: 'Zed', proTeamId: 2, eligibleSlots: [1, 2, 5, 12] } } },
        { playerPoolEntry: { player: { id: 2, fullName: 'Abe', proTeamId: 0, eligibleSlots: [4] } } },
      ] } }],
    };
    expect(pickerRosters(league, { 2: 'BOS' })).toEqual([{
      owner: 'Ann Lee', teamName: 'A', players: [
        { playerId: 2, name: 'Abe', proTeam: 'FA', positions: ['C'] },
        { playerId: 1, name: 'Zed', proTeam: 'BOS', positions: ['SG', 'SF'] },
      ],
    }]);
  });
});

// ── validateRequestAnswers ───────────────────────────────────────────────────

describe('validateRequestAnswers', () => {
  it('accepts a sell answer that gives the player, and fills the cards', () => {
    const files = [fileOf([req({})])];
    const v = check(files, { answers: [{ id: 'r1', summary: 'Depth Two projects 20.1.', trades: [idea('Bob Ray', [2], [4])] }] });
    expect(v.errors).toEqual([]);
    const a = v.answers.get('r1')!;
    expect(a.inputGeneratedAt).toBe('input-time');
    expect(a.trades[0].get[0].name).toBe('Bob Wing');
    const updated = applyAnswers(files[0], v.answers);
    expect(updated.requests[0].status).toBe('answered');
    expect(pendingRequests([updated])).toEqual([]);
  });

  it('requires every idea to include the requested player on the right side', () => {
    const sell = check([fileOf([req({})])], { answers: [{ id: 'r1', summary: 'x', trades: [idea('Bob Ray', [1], [4])] }] });
    expect(sell.errors.join()).toMatch(/must give Depth Two/);
    const buy = check([fileOf([req({ kind: 'buy', playerId: 3, playerName: 'Bob Guard', playerOwner: 'Bob Ray' })])],
      { answers: [{ id: 'r1', summary: 'x', trades: [idea('Bob Ray', [2], [4])] }] });
    expect(buy.errors.join()).toMatch(/must get Bob Guard/);
    expect(buy.answers.size).toBe(0);
  });

  it('accepts a buy answer with the player\'s current owner', () => {
    const v = check([fileOf([req({ kind: 'buy', playerId: 3, playerName: 'Bob Guard', playerOwner: 'Bob Ray' })])],
      { answers: [{ id: 'r1', summary: 'Go get him.', trades: [idea('Bob Ray', [1], [3])] }] });
    expect(v.errors).toEqual([]);
  });

  it('wants no trades when the player can\'t be traded any more', () => {
    const pickup = req({ playerId: 9, playerName: 'New Guy' });
    const withTrades = check([fileOf([pickup])], { answers: [{ id: 'r1', summary: 'x', trades: [idea('Bob Ray', [9], [4])] }] });
    expect(withTrades.errors.join()).toMatch(/can't be traded this way/);
    const empty = check([fileOf([pickup])], { answers: [{ id: 'r1', summary: 'New Guy is a fresh pickup.', trades: [] }] });
    expect(empty.errors).toEqual([]);
    expect(empty.answers.get('r1')!.trades).toEqual([]);
  });

  it('needs one answer per pending request and no others', () => {
    const files = [fileOf([req({}), req({ id: 'done', status: 'answered' })])];
    expect(check(files, { answers: [] }).errors).toEqual(['request r1: no answer.']);
    expect(check(files, { answers: [{ id: 'done', summary: 'x', trades: [] }] }).errors).toContain('request done: not a pending request.');
  });

  it('checks numbers in the prose', () => {
    const v = check([fileOf([req({})])], { answers: [{ id: 'r1', summary: 'He scores 99.9 a night.', trades: [] }] });
    expect(v.errors.join()).toMatch(/99\.9/);
  });
});
