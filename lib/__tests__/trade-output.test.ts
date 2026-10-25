import { describe, it, expect } from 'vitest';
import { validateTradeDraft, unknownNumbers, allowedNumbers, type TradeDraft } from '../trade-output';
import type { TradeInput, TradeInputPlayer, TradeInputTeam } from '../trade-input';

// ── Fixtures ─────────────────────────────────────────────────────────────────

function player(playerId: number, name: string, projected: number, season: number | null = 40): TradeInputPlayer {
  return {
    playerId, name, proTeam: 'BOS', positions: ['PG'], slot: 'starter', injuryStatus: 'ACTIVE', gamesPlayed: 3,
    avg: { season, last7: season, last15: season, last30: season, lastSeason: 35.5, projected },
    leagueRank: 5, projectedRank: 7,
    games: { thisWeek: 4, restOfRegularSeason: 56, playoffs: 13, playoffsByRound: [7, 3, 3] },
  };
}

function team(owner: string, seed: number, roster: TradeInputPlayer[], teamName = `${owner} FC`): TradeInputTeam {
  return {
    teamId: seed, teamName, owner, divisionId: 0,
    record: { wins: 1, losses: 0, ties: 0 }, pointsFor: 812.4, pointsAgainst: 700,
    seed, moves: { acquisitions: 5, drops: 4, trades: 0 }, upcomingOpponents: [], roster,
  };
}

const input: TradeInput = {
  season: 2027,
  generatedAt: 'in',
  week: 2,
  today: 7,
  league: {
    name: 'L', teamCount: 3, regularSeasonWeeks: 18, playoffTeams: 8, playoffSeedingRule: 'X',
    tradeDeadline: '2027-03-01T10:00:00.000Z', vetoVotesRequired: 4, tradeReviewHours: 24,
    lineupSlots: { PG: 1, BE: 1 }, // roster max 2
    periods: [],
  },
  teams: [
    team('Ann', 1, [player(1, 'Star One', 50.2), player(2, 'Depth Two', 20.1)], "Flint Tropics 70's Show"),
    team('Bob', 2, [player(3, 'Bob Guard', 45.6), player(4, 'Bob Wing', 30)]),
    team('Cid', 3, [player(5, 'Cid Big', 25.3)]),
  ],
};

const okTrade = (partnerOwner: string, give: number[], get: number[]) => ({
  partnerOwner, give, get, whyForYou: 'Upgrade at guard.', whyTheyAccept: 'They get a star.',
});

function draft(over: Partial<TradeDraft['teams'][number]> & { owner: string }): TradeDraft['teams'][number] {
  return { diagnosis: { summary: 'Solid team.', flags: [] }, trades: [], ...over };
}

const goodDraft = (): TradeDraft => ({
  week: 2,
  teams: [
    draft({ owner: 'Ann', diagnosis: { summary: 'Star One averages 40 and 50.2 projected.', flags: ['contender'] }, trades: [okTrade('Bob', [2], [4])] }),
    draft({ owner: 'Bob', trades: [okTrade('Ann', [3], [1])] }),
    draft({ owner: 'Cid', trades: [okTrade('Bob', [5], [4])] }),
  ],
});

const run = (d: TradeDraft, now = new Date('2026-10-26T08:00:00Z')) =>
  validateTradeDraft(input, d, { generatedAt: 'out', now });

// ── Tests ────────────────────────────────────────────────────────────────────

describe('validateTradeDraft', () => {
  it('accepts a clean draft and fills the cards from the input', () => {
    const { errors, file } = run(goodDraft());
    expect(errors).toEqual([]);
    const idea = file!.teams.find(t => t.owner === 'Ann')!.trades[0];
    expect(idea.give[0]).toMatchObject({ playerId: 2, name: 'Depth Two', avgProjected: 20.1, gamesPlayoffs: 13 });
    expect(idea.get[0]).toMatchObject({ playerId: 4, name: 'Bob Wing', avgSeason: 40 });
    expect(idea.partnerTeamName).toBe('Bob FC');
    expect(file!.teams.map(t => t.owner)).toEqual(['Ann', 'Bob', 'Cid']);
    expect(file!.tradeDeadline).toBe(input.league.tradeDeadline);
  });

  it('rejects a player who is not on that roster', () => {
    const d = goodDraft();
    d.teams[0].trades = [okTrade('Bob', [3], [4])]; // 3 is Bob's
    expect(run(d).errors).toContain("Ann: trade 1: player id(s) 3 not on Ann's roster.");
  });

  it('rejects unknown owners, self-trades, missing and duplicate teams', () => {
    const d = goodDraft();
    d.teams[1].trades = [okTrade('Bob', [3], [4])];
    d.teams[2].owner = 'Zed';
    const { errors, file } = run(d);
    expect(file).toBeNull();
    expect(errors).toEqual(expect.arrayContaining([
      'Bob: trade 1: trade with yourself.',
      'Zed: unknown owner.',
      'Cid: missing from the draft.',
    ]));
    const twice = goodDraft();
    twice.teams.push(draft({ owner: 'Ann' }));
    expect(run(twice).errors).toContain('Ann: appears twice.');
  });

  it('rejects a number in the prose that is not in the data', () => {
    const d = goodDraft();
    d.teams[0].diagnosis.summary = 'Star One averages 52.7 — elite.';
    expect(run(d).errors).toContain('Ann: summary has number(s) not in the data: 52.7.');
  });

  it('allows numbers from a trade partner, rounded the digest way', () => {
    const d = goodDraft();
    d.teams[0].trades[0].whyForYou = 'Bob Wing gives you 30.0 a night and 13 playoff games; Bob Guard is 46 projected.';
    expect(run(d).errors).toEqual([]);
  });

  it('does not allow numbers from a team the prose is not about', () => {
    const d = goodDraft();
    d.teams[1].diagnosis.summary = 'Cid Big projects 25.3.'; // Bob trades only with Ann
    expect(run(d).errors).toContain('Bob: summary has number(s) not in the data: 25.3.');
  });

  it('ignores digits inside names', () => {
    const d = goodDraft();
    d.teams[1].trades[0].whyTheyAccept = "Flint Tropics 70's Show needs a guard.";
    expect(run(d).errors).toEqual([]);
  });

  it('rejects unknown flags, too many trades, empty and long text', () => {
    const d = goodDraft();
    d.teams[0].diagnosis.flags = ['superteam'];
    d.teams[1].trades = [okTrade('Ann', [3], [1]), okTrade('Ann', [3], [2]), okTrade('Ann', [4], [1]), okTrade('Ann', [4], [2])];
    d.teams[2].trades[0].whyTheyAccept = '';
    d.teams[2].diagnosis.summary = 'x'.repeat(701);
    const { errors } = run(d);
    expect(errors).toEqual(expect.arrayContaining([
      'Ann: unknown flag "superteam".',
      'Bob: 4 trades (max 3).',
      'Cid: trade 1: empty whyTheyAccept.',
      'Cid: summary is 701 chars (max 700).',
    ]));
  });

  it('rejects the same trade twice and a side with too many players', () => {
    const d = goodDraft();
    d.teams[0].trades = [okTrade('Bob', [2], [4]), okTrade('Bob', [2], [4])];
    d.teams[1].trades = [okTrade('Ann', [], [1])];
    const { errors } = run(d);
    expect(errors).toContain('Ann: trade 2: same trade listed twice.');
    expect(errors).toContain('Bob: trade 1: "give" needs 1–3 players.');
  });

  it('counts the drops a 2-for-1 forces on the receiving side', () => {
    const d = goodDraft();
    d.teams[2].trades = [okTrade('Bob', [5], [3, 4])]; // Cid 1 → 2 players (max 2), Bob 2 → 1
    const idea = run(d).file!.teams.find(t => t.owner === 'Cid')!.trades[0];
    expect(idea.dropsNeeded).toEqual({ you: 0, partner: 0 });
    d.teams[0].trades = [okTrade('Bob', [2], [3, 4])]; // Ann 2 → 3 players
    const ann = run(d).file!.teams.find(t => t.owner === 'Ann')!.trades[0];
    expect(ann.dropsNeeded).toEqual({ you: 1, partner: 0 });
  });

  it('warns when the partner gives up far more projected value', () => {
    const d = goodDraft();
    d.teams[2].trades = [okTrade('Ann', [5], [1])]; // 25.3 for 50.2
    expect(run(d).warnings).toContain('Cid: trade 1: Ann gives up much more projected value — may say no.');
  });

  it('does not warn on two-for-one when the partner gets the best player', () => {
    const d = goodDraft();
    d.teams[2].trades = [okTrade('Bob', [5], [3, 4])]; // Bob gives 45.6 + 30, including the best player, for 25.3
    expect(run(d).warnings.some(w => w.startsWith('Cid'))).toBe(true);
    d.teams[0].trades = [okTrade('Bob', [1], [3, 4])]; // Bob gives 45.6 + 30 for the 50.2 star
    expect(run(d).warnings.some(w => w.startsWith('Ann'))).toBe(false);
  });

  it('refuses after the trade deadline and on the wrong week', () => {
    const late = run(goodDraft(), new Date('2027-03-02T00:00:00Z'));
    expect(late.errors[0]).toMatch(/deadline .* has passed/);
    expect(run({ ...goodDraft(), week: 3 }).errors).toContain('Draft is for week 3, input is week 2.');
  });
});

describe('unknownNumbers', () => {
  const allowed = allowedNumbers(input, [input.teams[0]]);
  it('accepts stored, one-decimal and whole spellings', () => {
    expect(unknownNumbers('50.2, 20.1, 50, 812.4, 812 and 2027', allowed, [])).toEqual([]);
    expect(unknownNumbers('40.0 average', allowed, [])).toEqual([]);
  });
  it('accepts small counts such as weeks and "2-for-1"', () => {
    expect(unknownNumbers('a 2-for-1 in week 2, top 3', allowed, [])).toEqual([]);
  });
  it('flags a made-up stat', () => {
    expect(unknownNumbers('he averages 61.3', allowed, [])).toEqual(['61.3']);
  });
});
