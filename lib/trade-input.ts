/**
 * Input for the weekly AI trade suggestions (docs/TRADE-SUGGESTIONS-SPEC.md):
 * every team's roster, record, schedule and moves in one JSON file that the
 * trade-suggestions skill hands to Claude. Every number Claude may quote
 * comes from here, so this is also what the validate step checks against.
 *
 * Pure — takes the raw ESPN league (mTeam, mRoster, mMatchup, mSettings) and
 * the NBA schedule, does no fetching.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { buildWeekMap, buildDateIndex, PRO_TEAM_ABBREV, type ProTeamSchedule } from './espn-schedule';

export interface TradeInputPlayer {
  playerId: number;
  name: string;
  proTeam: string;
  positions: string[];
  slot: 'starter' | 'bench' | 'IR';
  injuryStatus: string;
  gamesPlayed: number;
  /** How he joined this roster (DRAFT, ADD, TRADE…), when, and days since. */
  acquisition: { type: string; date: string | null; daysOnRoster: number | null };
  /**
   * May appear in a trade idea: on this roster at least MIN_DAYS_ON_ROSTER.
   * Pickups that fill a week's schedule hole come and go (Dor, 2026-10-25).
   */
  tradeable: boolean;
  /** Fantasy points per game, ESPN's own appliedAverage. null = no games in that span. */
  avg: {
    season: number | null;
    last7: number | null;
    last15: number | null;
    last30: number | null;
    lastSeason: number | null;
    projected: number | null;
  };
  /** Rank by season average among every rostered player with a game (1 = best). */
  leagueRank: number | null;
  /** Rank by ESPN's projected average among every rostered player. */
  projectedRank: number | null;
  /** NBA games left: this week (from today), rest of the regular season (incl. this week), playoffs. */
  games: { thisWeek: number; restOfRegularSeason: number; playoffs: number; playoffsByRound: number[] };
}

export interface TradeInputTeam {
  teamId: number;
  teamName: string;
  owner: string;
  divisionId: number;
  record: { wins: number; losses: number; ties: number };
  pointsFor: number;
  pointsAgainst: number;
  /** ESPN's current playoff seed (1 = first). */
  seed: number;
  moves: { acquisitions: number; drops: number; trades: number };
  /** Regular-season matchups still to play, from the target week on. */
  upcomingOpponents: { week: number; owner: string }[];
  roster: TradeInputPlayer[];
}

export interface FantasyPeriod {
  matchupPeriod: number;
  start: string;
  end: string;
  days: number[];
}

export interface TradeInput {
  season: number;
  generatedAt: string;
  /** Matchup week the advice is for, and today's scoring period (day). */
  week: number;
  today: number;
  league: {
    name: string;
    teamCount: number;
    regularSeasonWeeks: number;
    playoffTeams: number;
    playoffSeedingRule: string;
    tradeDeadline: string | null;
    vetoVotesRequired: number;
    tradeReviewHours: number;
    lineupSlots: Record<string, number>;
    periods: (FantasyPeriod & { kind: 'regular' | 'playoff' })[];
  };
  teams: TradeInputTeam[];
}

const SLOT_NAMES: Record<number, string> = {
  0: 'PG', 1: 'SG', 2: 'SF', 3: 'PF', 4: 'C', 5: 'G', 6: 'F',
  7: 'SG/SF', 8: 'G/F', 9: 'PF/C', 10: 'F/C', 11: 'UTIL', 12: 'BE', 13: 'IR',
};
const POSITION_SLOTS = [0, 1, 2, 3, 4];

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Fewest days on a roster before a player can be part of a trade idea. */
export const MIN_DAYS_ON_ROSTER = 7;

/**
 * Days of each fantasy matchup period. ESPN's `matchupPeriods` maps a period
 * to the CALENDAR weeks it spans — a playoff round can be two weeks
 * (`19: [19, 20]`) — so the period's days are its calendar weeks joined.
 */
export function buildFantasyPeriods(
  schedules: ProTeamSchedule[],
  matchupPeriods: Record<string, number[]>,
): FantasyPeriod[] {
  const calendarWeekCount = Math.max(0, ...Object.values(matchupPeriods).flat());
  const calendar = buildWeekMap(schedules, calendarWeekCount);
  const index = buildDateIndex(schedules);

  return Object.entries(matchupPeriods)
    .map(([period, weeks]) => {
      const days = weeks.flatMap(w => calendar[w] ?? []);
      return {
        matchupPeriod: Number(period),
        start: (days.length && index.dateFor(days[0])) || '',
        end: (days.length && index.dateFor(days[days.length - 1])) || '',
        days,
      };
    })
    .sort((a, b) => a.matchupPeriod - b.matchupPeriod);
}

/** Games per NBA team on the given days. */
export function gamesOn(schedules: ProTeamSchedule[], days: number[]): Map<number, number> {
  const wanted = new Set(days);
  const counts = new Map<number, number>();
  for (const team of schedules) {
    counts.set(team.proTeamId, team.games.filter(g => wanted.has(g.scoringPeriodId)).length);
  }
  return counts;
}

function statAverage(player: any, id: string): number | null {
  const s = (player.stats || []).find((x: any) => x.id === id);
  if (!s || typeof s.appliedAverage !== 'number') return null;
  // ESPN reports 0 for a span with no games (e.g. a whole season missed) —
  // sometimes with 1 game and 0 points. That is "no data", not a 0 average.
  // Projections carry no games.
  if (!id.startsWith('10') && (!(s.stats?.['42'] > 0) || s.appliedTotal === 0)) return null;
  return r1(s.appliedAverage);
}

function acquisitionOf(entry: any, generatedAt: string): Pick<TradeInputPlayer, 'acquisition' | 'tradeable'> {
  const ms = Number(entry.acquisitionDate);
  const now = Date.parse(generatedAt);
  const days = ms > 0 && Number.isFinite(now) ? r1((now - ms) / 86_400_000) : null;
  return {
    acquisition: {
      type: String(entry.acquisitionType || 'UNKNOWN'),
      date: ms > 0 ? new Date(ms).toISOString() : null,
      daysOnRoster: days,
    },
    // No date → can't prove he's a pickup; treat as settled.
    tradeable: days === null || days >= MIN_DAYS_ON_ROSTER,
  };
}

function rankBy(players: TradeInputPlayer[], value: (p: TradeInputPlayer) => number | null): Map<number, number> {
  const ranked = players
    .filter(p => value(p) !== null)
    .sort((a, b) => (value(b) as number) - (value(a) as number));
  return new Map(ranked.map((p, i) => [p.playerId, i + 1]));
}

export function buildTradeInput(
  league: any,
  schedules: ProTeamSchedule[],
  opts: { season: number; today: number; week?: number; generatedAt: string },
): TradeInput {
  const settings = league.settings || {};
  const sched = settings.scheduleSettings || {};
  const regularSeasonWeeks: number = sched.matchupPeriodCount;
  const periods = buildFantasyPeriods(schedules, sched.matchupPeriods || {}).map(p => ({
    ...p,
    kind: (p.matchupPeriod <= regularSeasonWeeks ? 'regular' : 'playoff') as 'regular' | 'playoff',
  }));
  const regular = periods.filter(p => p.kind === 'regular');
  const playoff = periods.filter(p => p.kind === 'playoff');

  const { today } = opts;
  const week = opts.week
    ?? periods.find(p => p.days.length && p.days[p.days.length - 1] >= today)?.matchupPeriod
    ?? periods[periods.length - 1]?.matchupPeriod;
  const weekPeriod = periods.find(p => p.matchupPeriod === week);
  const weekStart = weekPeriod?.days[0] ?? today;
  const from = Math.max(today, weekStart);

  const thisWeek = gamesOn(schedules, (weekPeriod?.days ?? []).filter(d => d >= from));
  const restOfRegular = gamesOn(schedules, regular.flatMap(p => p.days).filter(d => d >= from));
  const playoffRounds = playoff.map(p => gamesOn(schedules, p.days));

  const members = new Map<string, any>((league.members || []).map((m: any) => [m.id, m]));
  const ownerOf = (team: any) => {
    const m = members.get(team.primaryOwner) ?? members.get(team.owners?.[0]);
    return m ? `${m.firstName} ${m.lastName}`.trim() : `Team ${team.id}`;
  };
  const ownerById = new Map<number, string>((league.teams || []).map((t: any) => [t.id, ownerOf(t)]));

  const season = opts.season;
  const teams: TradeInputTeam[] = (league.teams || []).map((t: any) => {
    const roster: TradeInputPlayer[] = (t.roster?.entries || []).flatMap((e: any) => {
      const p = e.playerPoolEntry?.player;
      if (!p) return [];
      const seasonStat = (p.stats || []).find((x: any) => x.id === `00${season}`);
      const proTeamId: number = p.proTeamId;
      const byRound = playoffRounds.map(r => r.get(proTeamId) ?? 0);
      return [{
        playerId: p.id,
        name: p.fullName || `Player ${p.id}`,
        proTeam: PRO_TEAM_ABBREV[proTeamId] || 'FA',
        positions: POSITION_SLOTS.filter(s => (p.eligibleSlots || []).includes(s)).map(s => SLOT_NAMES[s]),
        slot: e.lineupSlotId === 13 ? 'IR' : e.lineupSlotId === 12 ? 'bench' : 'starter',
        // The roster entry's own injuryStatus is always NORMAL; the player's is real.
        injuryStatus: p.injuryStatus || 'ACTIVE',
        gamesPlayed: seasonStat?.stats?.['42'] ?? 0,
        ...acquisitionOf(e, opts.generatedAt),
        avg: {
          season: statAverage(p, `00${season}`),
          last7: statAverage(p, `01${season}`),
          last15: statAverage(p, `02${season}`),
          last30: statAverage(p, `03${season}`),
          lastSeason: statAverage(p, `00${season - 1}`),
          projected: statAverage(p, `10${season}`),
        },
        leagueRank: null,
        projectedRank: null,
        games: {
          thisWeek: thisWeek.get(proTeamId) ?? 0,
          restOfRegularSeason: restOfRegular.get(proTeamId) ?? 0,
          playoffs: byRound.reduce((a, b) => a + b, 0),
          playoffsByRound: byRound,
        },
      } satisfies TradeInputPlayer];
    });

    const upcomingOpponents = (league.schedule || [])
      .filter((m: any) => m.matchupPeriodId >= week && m.matchupPeriodId <= regularSeasonWeeks
        && (m.home?.teamId === t.id || m.away?.teamId === t.id))
      .map((m: any) => ({
        week: m.matchupPeriodId,
        owner: ownerById.get(m.home?.teamId === t.id ? m.away?.teamId : m.home?.teamId) ?? 'BYE',
      }))
      .sort((a: any, b: any) => a.week - b.week);

    const rec = t.record?.overall || {};
    return {
      teamId: t.id,
      teamName: (t.name || '').trim(),
      owner: ownerOf(t),
      divisionId: t.divisionId,
      record: { wins: rec.wins ?? 0, losses: rec.losses ?? 0, ties: rec.ties ?? 0 },
      pointsFor: r1(rec.pointsFor ?? 0),
      pointsAgainst: r1(rec.pointsAgainst ?? 0),
      seed: t.playoffSeed,
      moves: {
        acquisitions: t.transactionCounter?.acquisitions ?? 0,
        drops: t.transactionCounter?.drops ?? 0,
        trades: t.transactionCounter?.trades ?? 0,
      },
      upcomingOpponents,
      roster,
    };
  });

  const everyone = teams.flatMap(t => t.roster);
  const seasonRank = rankBy(everyone, p => (p.gamesPlayed > 0 ? p.avg.season : null));
  const projRank = rankBy(everyone, p => p.avg.projected);
  for (const p of everyone) {
    p.leagueRank = seasonRank.get(p.playerId) ?? null;
    p.projectedRank = projRank.get(p.playerId) ?? null;
  }
  for (const t of teams) t.roster.sort((a, b) => (a.projectedRank ?? 999) - (b.projectedRank ?? 999));
  teams.sort((a, b) => a.seed - b.seed);

  const lineupSlots: Record<string, number> = {};
  for (const [id, count] of Object.entries(settings.rosterSettings?.lineupSlotCounts || {})) {
    if ((count as number) > 0) lineupSlots[SLOT_NAMES[Number(id)] ?? id] = count as number;
  }
  const deadline = settings.tradeSettings?.deadlineDate;

  return {
    season,
    generatedAt: opts.generatedAt,
    week,
    today,
    league: {
      name: settings.name ?? '',
      teamCount: teams.length,
      regularSeasonWeeks,
      playoffTeams: sched.playoffTeamCount,
      playoffSeedingRule: sched.playoffSeedingRule ?? '',
      tradeDeadline: deadline ? new Date(deadline).toISOString() : null,
      vetoVotesRequired: settings.tradeSettings?.vetoVotesRequired ?? 0,
      tradeReviewHours: settings.tradeSettings?.revisionHours ?? 0,
      lineupSlots,
      periods,
    },
    teams,
  };
}

// ─── Digest ─────────────────────────────────────────────────────────────────

const show = (n: number | null) => (n === null ? '–' : String(n));

/**
 * The same input as compact Markdown — one line per player — so Claude can
 * read all ten rosters at once. Same numbers as the JSON, nothing derived.
 */
export function formatTradeDigest(input: TradeInput): string {
  const l = input.league;
  const week = l.periods.find(p => p.matchupPeriod === input.week);
  const lines: string[] = [
    `# ${l.name} — trade input, week ${input.week} (${week?.start} → ${week?.end})`,
    '',
    `Season ${input.season} · ${l.teamCount} teams · ${l.playoffTeams} make the playoffs · ` +
      `regular season weeks 1–${l.regularSeasonWeeks} · trade deadline ${l.tradeDeadline ?? 'none'} · ` +
      `${l.vetoVotesRequired} veto votes cancel a trade`,
    `Lineup: ${Object.entries(l.lineupSlots).map(([k, v]) => `${v} ${k}`).join(', ')}`,
    `Periods: ${l.periods.map(p => `${p.matchupPeriod}${p.kind === 'playoff' ? 'P' : ''} ${p.start}→${p.end} (${p.days.length}d)`).join(' · ')}`,
    '',
    'Player columns: id · name · NBA team · positions · slot · injury · GP · avg season / L7 / L15 / L30 / last season / projected · ' +
      'league rank (season / projected) · games this week / rest of regular season / playoffs [by round]',
    `⛔ PICKUP = on this roster under ${MIN_DAYS_ON_ROSTER} days — a short-term pickup. Never put him in a trade idea.`,
  ];
  for (const t of input.teams) {
    lines.push(
      '',
      `## Seed ${t.seed} — ${t.owner} (${t.teamName}), team ${t.teamId}, division ${t.divisionId}`,
      `Record ${t.record.wins}-${t.record.losses}-${t.record.ties} · PF ${t.pointsFor} · PA ${t.pointsAgainst} · ` +
        `moves: ${t.moves.acquisitions} adds, ${t.moves.drops} drops, ${t.moves.trades} trades`,
      `Next opponents: ${t.upcomingOpponents.slice(0, 6).map(o => `w${o.week} ${o.owner}`).join(', ')}`,
    );
    for (const p of t.roster) {
      const a = p.avg;
      const g = p.games;
      const pickup = p.tradeable ? '' : `⛔ PICKUP (${p.acquisition.daysOnRoster}d) · `;
      lines.push(
        `- ${pickup}${p.playerId} · ${p.name} · ${p.proTeam} · ${p.positions.join('/')} · ${p.slot} · ${p.injuryStatus} · GP ${p.gamesPlayed} · ` +
          `${show(a.season)} / ${show(a.last7)} / ${show(a.last15)} / ${show(a.last30)} / ${show(a.lastSeason)} / ${show(a.projected)} · ` +
          `rank ${show(p.leagueRank)} / ${show(p.projectedRank)} · games ${g.thisWeek} / ${g.restOfRegularSeason} / ${g.playoffs} [${g.playoffsByRound.join(', ')}]`,
      );
    }
  }
  return lines.join('\n') + '\n';
}
