/**
 * Personal strategy agent — the math. Pure: no I/O, so every rule is tested
 * in strategy/engine.test.ts. strategy/build.mts fetches ESPN and calls this.
 *
 * Not part of the website: nothing in app/ imports this folder.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── League shape ────────────────────────────────────────────────────────────

/** Starting slot instances: PG, SG, SF, PF, C, G, F, then 3× UTIL. */
export const STARTING_SLOTS = [0, 1, 2, 3, 4, 5, 6, 11, 11, 11];
export const SLOT_LABEL: Record<number, string> = {
  0: 'PG', 1: 'SG', 2: 'SF', 3: 'PF', 4: 'C', 5: 'G', 6: 'F', 11: 'UTIL',
};
const BENCH_SLOT = 12;
const IR_SLOT = 13;
const POSITION: Record<number, string> = { 1: 'PG', 2: 'SG', 3: 'SF', 4: 'PF', 5: 'C' };
const GROUP: Record<number, Group> = { 1: 'G', 2: 'G', 3: 'F', 4: 'F', 5: 'C' };
/** Statuses that mean "won't play" — projected at zero games. */
const SITTING = new Set(['OUT', 'SUSPENSION', 'INJURY_RESERVE']);

/**
 * How much one player's fantasy points swing from game to game: standard
 * deviation ÷ average. Measured 2026-10-20 on last season's ESPN game logs —
 * 224 players averaging 20+, 6,835 games: median 0.462.
 */
export const GAME_CV = 0.46;
/**
 * How wrong a player's per-game average itself may be (role change, slump).
 * An assumption, not measured — it widens the win-chance spread a little.
 */
export const AVERAGE_ERROR = 0.15;
/** Player-games before a team's defense number counts fully (shrinkage). */
const DEFENSE_PRIOR_GAMES = 20;
const DEFENSE_CLAMP: [number, number] = [0.85, 1.15];

export type Group = 'G' | 'F' | 'C';

export interface AgentPlayer {
  id: number;
  name: string;
  pos: string;
  group: Group;
  proTeamId: number;
  eligible: number[];
  status: string;
  onIR: boolean;
  /** ESPN lineup slot on a fantasy roster; undefined for free agents. */
  lineupSlotId?: number;
  gp: number;
  seasonAvg: number;
  l7: number;
  l15: number;
  l30: number;
  proj: number;
  lastSeasonAvg: number;
  /** Per-game points the agent projects with — see formAverage(). */
  form: number;
  /** League-wide ownership (all ESPN leagues) and its 7-day change. */
  owned: number;
  ownedChange: number;
  /** Free agents only. */
  freeStatus?: 'FREEAGENT' | 'WAIVERS';
  /** First scoring period this player can be in my lineup (waivers clear later). */
  availableFromSp?: number;
  /** Scoring periods where ESPN already has a stat line (he already played). */
  playedSps: number[];
}

/**
 * Per-game value used for projecting. Early in the season it leans on ESPN's
 * projection (last season's average if ESPN has none); each game played shifts
 * weight to real form, fully by game 10. Real form = 60% last 15 days + 40%
 * season average, so a hot streak counts without ignoring the bigger sample.
 */
export function formAverage(p: Pick<AgentPlayer, 'gp' | 'seasonAvg' | 'l15' | 'proj' | 'lastSeasonAvg'>): number {
  const base = p.proj > 0 ? p.proj : p.lastSeasonAvg;
  if (p.gp <= 0) return round1(base);
  const recent = p.l15 > 0 ? 0.6 * p.l15 + 0.4 * p.seasonAvg : p.seasonAvg;
  const w = Math.min(p.gp, 10) / 10;
  return round1(base * (1 - w) + recent * w);
}

/** Recent form vs. the bigger picture: last 7 days minus season (or projection before games). */
export function trendOf(p: Pick<AgentPlayer, 'gp' | 'l7' | 'seasonAvg' | 'proj'>): number {
  if (p.l7 <= 0) return 0;
  const ref = p.gp >= 5 ? p.seasonAvg : (p.proj || p.seasonAvg);
  return round1(p.l7 - ref);
}

/** Normalize an ESPN player object (from mRoster or kona_player_info). */
export function parsePlayer(
  raw: any,
  season: number,
  extra: { lineupSlotId?: number; freeStatus?: string; availableFromSp?: number } = {},
): AgentPlayer {
  const stats: any[] = raw?.stats || [];
  const stat = (id: string) => stats.find(s => s.id === id);
  const avg = (id: string) => stat(id)?.appliedAverage ?? 0;
  const pid = raw?.defaultPositionId as number;
  const base = {
    gp: stat(`00${season}`)?.stats?.['42'] ?? 0,
    seasonAvg: round1(avg(`00${season}`)),
    l7: round1(avg(`01${season}`)),
    l15: round1(avg(`02${season}`)),
    l30: round1(avg(`03${season}`)),
    proj: round1(avg(`10${season}`)),
    lastSeasonAvg: round1(avg(`00${season - 1}`)),
  };
  const lineupSlotId = extra.lineupSlotId;
  return {
    id: raw?.id,
    name: raw?.fullName || `Player ${raw?.id}`,
    pos: POSITION[pid] ?? '',
    group: GROUP[pid] ?? 'F',
    proTeamId: raw?.proTeamId ?? 0,
    eligible: (raw?.eligibleSlots || []).filter((s: number) => STARTING_SLOTS.includes(s)),
    status: raw?.injuryStatus || 'ACTIVE',
    onIR: lineupSlotId === IR_SLOT,
    lineupSlotId,
    ...base,
    form: formAverage(base),
    owned: round1(raw?.ownership?.percentOwned ?? 0),
    ownedChange: round1(raw?.ownership?.percentChange ?? 0),
    freeStatus: extra.freeStatus === 'WAIVERS' ? 'WAIVERS' : extra.freeStatus === 'FREEAGENT' ? 'FREEAGENT' : undefined,
    availableFromSp: extra.availableFromSp,
    playedSps: stats
      .filter(s => s.statSourceId === 0 && s.statSplitTypeId === 5 && s.scoringPeriodId > 0)
      .map(s => s.scoringPeriodId),
  };
}

// ─── NBA calendar + opponent defense ─────────────────────────────────────────

export interface Calendar {
  /** proTeamId → scoringPeriodId → opponent proTeamId */
  games: Map<number, Map<number, number>>;
  abbrev: Map<number, string>;
  dateFor: (sp: number) => string;
}

export function buildCalendar(
  schedules: { proTeamId: number; abbrev: string; games: { scoringPeriodId: number; opponentId: number }[] }[],
  dateFor: (sp: number) => string,
): Calendar {
  const games = new Map<number, Map<number, number>>();
  const abbrev = new Map<number, string>();
  for (const s of schedules) {
    games.set(s.proTeamId, new Map(s.games.map(g => [g.scoringPeriodId, g.opponentId])));
    abbrev.set(s.proTeamId, s.abbrev);
  }
  return { games, abbrev, dateFor };
}

export interface GameLog { proTeamId: number; group: Group; sp: number; fp: number; baseline: number }

/** One player's game logs from kona_player_info (statSplitTypeId 5 = one day). */
export function gameLogs(raw: any, season: number): GameLog[] {
  const stats: any[] = raw?.stats || [];
  const baseline = stats.find(s => s.id === `00${season}`)?.appliedAverage ?? 0;
  const group = GROUP[raw?.defaultPositionId] ?? 'F';
  return stats
    .filter(s => s.statSourceId === 0 && s.statSplitTypeId === 5 && (s.stats?.['40'] ?? 0) > 0)
    .map(s => ({ proTeamId: raw.proTeamId, group, sp: s.scoringPeriodId, fp: s.appliedTotal ?? 0, baseline }));
}

export interface Defense {
  /** Multiplier on a player's average vs. this NBA team, for his position group. */
  factor: (opponentId: number, group: Group) => number;
  /** Player-games behind the numbers; 0 means "no data yet, everything is 1.0". */
  sample: number;
}

/**
 * How each NBA team defends each position group: for every game a player
 * (averaging 15+) played, his points ÷ his own season average, averaged per
 * opponent and group. Shrunk toward 1.0 when the sample is small, and clamped
 * to ±15% so one odd night can't dominate.
 */
export function buildDefense(logs: GameLog[], cal: Calendar): Defense {
  const sums = new Map<string, { ratio: number; n: number }>();
  let sample = 0;
  for (const g of logs) {
    if (g.baseline < 15) continue;
    const opp = cal.games.get(g.proTeamId)?.get(g.sp);
    if (opp === undefined) continue; // traded since, or schedule gap
    const key = `${opp}:${g.group}`;
    const cur = sums.get(key) ?? { ratio: 0, n: 0 };
    cur.ratio += g.fp / g.baseline;
    cur.n++;
    sums.set(key, cur);
    sample++;
  }
  const factors = new Map<string, number>();
  for (const [key, { ratio, n }] of sums) {
    const raw = ratio / n;
    const shrunk = 1 + (raw - 1) * (n / (n + DEFENSE_PRIOR_GAMES));
    factors.set(key, Math.min(DEFENSE_CLAMP[1], Math.max(DEFENSE_CLAMP[0], shrunk)));
  }
  return { factor: (opp, group) => factors.get(`${opp}:${group}`) ?? 1, sample };
}

export const NEUTRAL_DEFENSE: Defense = { factor: () => 1, sample: 0 };

/**
 * A healthy player in an IR slot makes the roster illegal on ESPN, which then
 * usually blocks adds; an OUT player in the lineup wastes a spot. Pair them:
 * the projection assumes the swap is made, and the alert tells Dor to make it.
 */
export function fixIR(players: AgentPlayer[]): { players: AgentPlayer[]; alerts: string[] } {
  const alerts: string[] = [];
  const healthy = players.filter(p => p.onIR && p.status === 'ACTIVE');
  const out = players.filter(p => !p.onIR && SITTING.has(p.status)).sort((a, b) => b.form - a.form);
  const swap = new Map<AgentPlayer, AgentPlayer>();
  for (const h of healthy) {
    const o = out.shift();
    if (o) {
      swap.set(h, { ...h, onIR: false, lineupSlotId: BENCH_SLOT });
      swap.set(o, { ...o, onIR: true, lineupSlotId: IR_SLOT });
      alerts.push(`Fix your IR first: move ${o.name} (out) to IR and ${h.name} back to your lineup. ESPN lists ${h.name} as healthy, and while he sits on IR ESPN usually blocks your adds. The numbers below assume you make this swap.`);
    } else {
      alerts.push(`${h.name} is healthy but on IR. ESPN usually blocks adds until he's back on the roster, so you may need to drop someone to make room.`);
    }
  }
  return { players: players.map(p => swap.get(p) ?? p), alerts };
}

// ─── Lineup simulation ───────────────────────────────────────────────────────

/**
 * Incremental slot matching: add players one at a time (best first); a
 * player starts if some re-shuffle of the current starters fits him in.
 * Kuhn's augmenting path only rewrites assignments on success, so a failed
 * try leaves the lineup as it was. Greedy by average is optimal here
 * (startable sets form a matroid).
 */
class Lineup {
  owner: number[] = new Array(STARTING_SLOTS.length).fill(-1);
  constructor(private eligible: number[][]) {}
  private place(p: number, seen: Set<number>): boolean {
    for (let i = 0; i < STARTING_SLOTS.length; i++) {
      if (!this.eligible[p].includes(STARTING_SLOTS[i]) || seen.has(i)) continue;
      seen.add(i);
      if (this.owner[i] === -1 || this.place(this.owner[i], seen)) { this.owner[i] = p; return true; }
    }
    return false;
  }
  tryAdd(p: number): boolean { return this.place(p, new Set()); }
  emptySlots(): string[] {
    return STARTING_SLOTS.filter((_, i) => this.owner[i] === -1).map(s => SLOT_LABEL[s]);
  }
}

export interface DayGame { id: number; name: string; opp: string; factor: number; pts: number }

export interface DayPlan {
  sp: number;
  date: string;
  starters: DayGame[];
  /** Players with a game who don't fit the 10 starting spots. */
  benched: string[];
  /** Starting spots nobody fills — an add that plays that day scores there. */
  emptySlots: string[];
  /** Starters who already played today (their points are in the actual score). */
  alreadyPlayed: number;
  points: number;
}

export interface TeamWeek {
  days: DayPlan[];
  points: number;
  games: number;
  lost: number;
  /** Projected points per player this span. */
  byPlayer: Map<number, { games: number; points: number }>;
  /** Standard deviation of the projected total — see winChance(). */
  sigma: number;
}

/**
 * Who would start each remaining day and what they'd score.
 * Points per game = form average × opponent defense factor.
 * IR and OUT/suspended players get no games; waiver adds only from the day
 * they clear. `today` games already played are left to the actual score:
 * a starter who played keeps his spot, a bench player who played is done.
 */
export function simulateWeek(
  players: AgentPlayer[],
  days: number[],
  cal: Calendar,
  defense: Defense,
  today = -1,
): TeamWeek {
  const byPlayer = new Map<number, { games: number; points: number }>();
  const out: DayPlan[] = [];
  let lost = 0;
  let variance = 0;

  for (const sp of days) {
    const withGame = players.filter(p =>
      !p.onIR && !SITTING.has(p.status) &&
      (p.availableFromSp === undefined || sp >= p.availableFromSp) &&
      cal.games.get(p.proTeamId)?.has(sp));
    const played = sp === today ? withGame.filter(p => p.playedSps.includes(sp)) : [];
    const keep = played.filter(p => p.lineupSlotId !== undefined && p.lineupSlotId !== BENCH_SLOT);
    const playing = withGame.filter(p => !played.includes(p)).sort((a, b) => b.form - a.form);

    const order = [...keep, ...playing];
    const lineup = new Lineup(order.map(p => p.eligible));
    const starters: DayGame[] = [];
    const benched: string[] = [];
    order.forEach((p, i) => {
      if (!lineup.tryAdd(i)) {
        if (i >= keep.length) { benched.push(p.name); lost++; }
        return;
      }
      if (i < keep.length) return;
      const opp = cal.games.get(p.proTeamId)!.get(sp)!;
      const factor = defense.factor(opp, p.group);
      const pts = p.form * factor;
      starters.push({ id: p.id, name: p.name, opp: cal.abbrev.get(opp) ?? '', factor: round2(factor), pts: round1(pts) });
      const cur = byPlayer.get(p.id) ?? { games: 0, points: 0 };
      cur.games++;
      cur.points += pts;
      byPlayer.set(p.id, cur);
      variance += (GAME_CV * pts) ** 2;
    });
    out.push({
      sp,
      date: cal.dateFor(sp),
      starters,
      benched,
      emptySlots: lineup.emptySlots(),
      alreadyPlayed: keep.length,
      points: round1(starters.reduce((n, g) => n + g.pts, 0)),
    });
  }
  for (const v of byPlayer.values()) {
    variance += (AVERAGE_ERROR * v.points) ** 2;
    v.points = round1(v.points);
  }
  return {
    days: out,
    points: round1(out.reduce((n, d) => n + d.points, 0)),
    games: out.reduce((n, d) => n + d.starters.length, 0),
    lost,
    byPlayer,
    sigma: Math.sqrt(variance),
  };
}

// ─── Win chance + verdict ────────────────────────────────────────────────────

/**
 * Chance my final beats theirs: normal approximation of
 * (mine − theirs), each side's spread from simulateWeek().sigma.
 * Points already scored are certain; only the rest varies.
 */
export function winChance(myFinal: number, oppFinal: number, mySigma: number, oppSigma: number): number {
  const sd = Math.sqrt(mySigma ** 2 + oppSigma ** 2);
  if (sd === 0) return myFinal > oppFinal ? 1 : myFinal < oppFinal ? 0 : 0.5;
  return normalCdf((myFinal - oppFinal) / sd);
}

export type VerdictKey = 'favored' | 'tossup' | 'underdog' | 'longshot';

export interface Verdict { key: VerdictKey; label: string; advice: string }

export function verdictFor(p: number): Verdict {
  if (p >= 0.65) return {
    key: 'favored', label: 'Favored',
    advice: 'Protect the lead: fill every empty spot, but don\'t drop a good player for a one-day stream.',
  };
  if (p >= 0.4) return {
    key: 'tossup', label: 'Toss-up',
    advice: 'Every game counts. Use each day\'s add on whoever fills an empty spot that day.',
  };
  if (p >= 0.15) return {
    key: 'underdog', label: 'Underdog',
    advice: 'You need volume. Stream every day, pick players with the most games left.',
  };
  return {
    key: 'longshot', label: 'Long shot',
    advice: 'Stop chasing this week. Spend adds on players who help next week (see the Next week list).',
  };
}

// ─── Matchup analysis ────────────────────────────────────────────────────────

export interface Side {
  teamId: number;
  teamName: string;
  owner: string;
  players: AgentPlayer[];
  actual: number;
}

export interface MatchupReport {
  week: number;
  days: number[];
  me: Side & { sim: TeamWeek; final: number };
  opp: Side & { sim: TeamWeek; final: number };
  winChance: number;
  verdict: Verdict;
  notes: string[];
}

const STATUS_LABEL: Record<string, string> = {
  DAY_TO_DAY: 'day-to-day', OUT: 'out', SUSPENSION: 'suspended', INJURY_RESERVE: 'IR',
};

export function analyzeMatchup(
  week: number, days: number[], me: Side, opp: Side, cal: Calendar, defense: Defense, today = -1,
): MatchupReport {
  const mySim = simulateWeek(me.players, days, cal, defense, today);
  const oppSim = simulateWeek(opp.players, days, cal, defense, today);
  const myFinal = round1(me.actual + mySim.points);
  const oppFinal = round1(opp.actual + oppSim.points);
  const p = winChance(myFinal, oppFinal, mySim.sigma, oppSim.sigma);
  return {
    week, days,
    me: { ...me, sim: mySim, final: myFinal },
    opp: { ...opp, sim: oppSim, final: oppFinal },
    winChance: p,
    verdict: verdictFor(p),
    notes: matchupNotes(me, mySim, opp, oppSim),
  };
}

/** Plain-language list of where I'm short, most important first. */
export function matchupNotes(me: Side, mySim: TeamWeek, opp: Side, oppSim: TeamWeek): string[] {
  const notes: string[] = [];
  const gap = mySim.games - oppSim.games;
  if (gap < 0) notes.push(`You have ${-gap} fewer games left than ${opp.teamName} (${mySim.games} vs ${oppSim.games}).`);
  else if (gap > 0) notes.push(`You have ${gap} more games left than ${opp.teamName} (${mySim.games} vs ${oppSim.games}).`);

  const open = mySim.days.filter(d => d.emptySlots.length > 0);
  if (open.length > 0) {
    const total = open.reduce((n, d) => n + d.emptySlots.length, 0);
    notes.push(`${total} empty starting spot${total === 1 ? '' : 's'} on ${open.map(d => `${weekday(d.date)} (${d.emptySlots.length})`).join(', ')} — free points for an add.`);
  }
  // Position holes matter on normal nights; on a light night every spot is empty anyway.
  for (const d of mySim.days) {
    if (d.emptySlots.length > 4) continue;
    const missing = [...new Set(d.emptySlots.filter(s => s !== 'UTIL'))];
    if (missing.length > 0) notes.push(`${weekday(d.date)}: nobody to play ${missing.join(', ')} — look for that position.`);
  }
  if (mySim.lost > 0) {
    notes.push(`${mySim.lost} game${mySim.lost === 1 ? '' : 's'} wasted on the bench (more players than spots). A drop costs you little on those days.`);
  }
  const hurt = me.players.filter(p => !p.onIR && p.status !== 'ACTIVE');
  if (hurt.length) notes.push(`Your injuries: ${hurt.map(p => `${p.name} (${STATUS_LABEL[p.status] ?? p.status.toLowerCase()})`).join(', ')}.`);
  const oppHurt = opp.players.filter(p => !p.onIR && p.status !== 'ACTIVE');
  if (oppHurt.length) notes.push(`Their injuries: ${oppHurt.map(p => `${p.name} (${STATUS_LABEL[p.status] ?? p.status.toLowerCase()})`).join(', ')}.`);
  return notes;
}

// ─── Free agents ─────────────────────────────────────────────────────────────

export interface Pickup {
  player: AgentPlayer;
  /** Projected points my team gains over the span, after the best drop. */
  gain: number;
  drop: AgentPlayer | null;
  /** Games he'd actually start for me in the span; opponents marked ↑ soft / ↓ tough defense. */
  games: number;
  opponents: string[];
  /** True when he's worse than the drop over the season — a short-term stream. */
  stream: boolean;
}

/**
 * Rank free agents by what they add to MY projected total over `days`:
 * re-run the lineup with him in and each possible drop out, keep the best.
 * Drops are limited to my 2 lowest-form players, plus anyone whose form is
 * lower than his (a real upgrade), so a good player with a light week is
 * never offered as a drop for a stream.
 */
export function rankPickups(
  roster: AgentPlayer[],
  freeAgents: AgentPlayer[],
  days: number[],
  cal: Calendar,
  defense: Defense,
  today = -1,
  limit = 15,
): Pickup[] {
  if (days.length === 0) return [];
  const base = simulateWeek(roster, days, cal, defense, today).points;
  const active = roster.filter(p => !p.onIR);
  const weakest = [...active].sort((a, b) => a.form - b.form).slice(0, 2);

  const results: Pickup[] = [];
  const candidates = freeAgents
    .filter(fa => days.some(sp =>
      cal.games.get(fa.proTeamId)?.has(sp) && (fa.availableFromSp === undefined || sp >= fa.availableFromSp)))
    .filter(fa => !SITTING.has(fa.status))
    .sort((a, b) => b.form - a.form)
    .slice(0, 80);

  for (const fa of candidates) {
    const drops = new Set(weakest);
    for (const p of active) if (p.form < fa.form) drops.add(p);
    let best: { gain: number; drop: AgentPlayer; sim: TeamWeek } | null = null;
    for (const d of drops) {
      const sim = simulateWeek([...roster.filter(p => p !== d), fa], days, cal, defense, today);
      const gain = sim.points - base;
      if (!best || gain > best.gain) best = { gain, drop: d, sim };
    }
    if (!best || best.gain <= 0) continue;
    const mine = best.sim.days.flatMap(d => d.starters.filter(g => g.id === fa.id)
      .map(g => `${g.opp}${g.factor >= 1.05 ? '↑' : g.factor <= 0.95 ? '↓' : ''}`));
    results.push({
      player: fa,
      gain: round1(best.gain),
      drop: best.drop,
      games: mine.length,
      opponents: mine,
      stream: fa.form < best.drop.form,
    });
  }
  return results.sort((a, b) => b.gain - a.gain).slice(0, limit);
}

export interface TwoDayPlan { today: Pickup | null; tomorrow: Pickup | null; total: number }

/**
 * Best use of today's and tomorrow's adds together (1 add per day). One add
 * alone can mislead: dropping a player who plays tonight wastes his game, so
 * waiting a day — or using today's add on someone else — can be worth more.
 * Tries "no add today" and today's top 10, then the best add tomorrow on top
 * of each. Both gains are over the rest of the same week, so they add up.
 */
export function planTwoDays(
  roster: AgentPlayer[],
  freeAgents: AgentPlayer[],
  days: number[],
  cal: Calendar,
  defense: Defense,
  today = -1,
): TwoDayPlan | null {
  if (days.length === 0) return null;
  const firsts: (Pickup | null)[] = [null, ...rankPickups(roster, freeAgents, days, cal, defense, today, 10)];
  let best: TwoDayPlan | null = null;
  for (const a of firsts) {
    const r1 = a ? [...roster.filter(p => p !== a.drop), a.player] : roster;
    const b = days.length > 1
      ? rankPickups(r1, freeAgents.filter(f => f !== a?.player), days.slice(1), cal, defense, today, 1)[0] ?? null
      : null;
    const total = round1((a?.gain ?? 0) + (b?.gain ?? 0));
    if (!best || total > best.total) best = { today: a, tomorrow: b, total };
  }
  return best && best.total > 0 ? best : null;
}

/** Free agents getting hot: last 7 days well above their usual, or being added across ESPN. */
export function trending(freeAgents: AgentPlayer[], limit = 12): AgentPlayer[] {
  const anyGames = freeAgents.some(p => p.l7 > 0);
  return [...freeAgents]
    .filter(p => !SITTING.has(p.status))
    .filter(p => anyGames ? p.l7 >= 15 : p.ownedChange > 0)
    .sort((a, b) => anyGames
      ? (trendOf(b) - trendOf(a)) || (b.ownedChange - a.ownedChange)
      : b.ownedChange - a.ownedChange)
    .slice(0, limit);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function weekday(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
}

/** Standard normal CDF (Abramowitz–Stegun 7.1.26, error < 1.5e-7). */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t
    * Math.exp(-(z * z) / 2);
  return z >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}

function round1(n: number): number { return Math.round(n * 10) / 10; }
function round2(n: number): number { return Math.round(n * 100) / 100; }
