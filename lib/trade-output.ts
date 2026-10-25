/**
 * Weekly AI trade suggestions — what Claude writes, and the check that turns
 * it into the file the site reads (docs/TRADE-SUGGESTIONS-SPEC.md §4).
 *
 * Claude writes a DRAFT: owners, player ids and prose. It never types a stat.
 * validateTradeDraft() rejects anything that isn't true in the input — a
 * player not on that roster, an unknown owner, a number in the prose that the
 * input doesn't contain — and fills every number on the cards from the input
 * itself, so the cards are right by construction.
 *
 * Pure — no I/O.
 */
import type { TradeInput, TradeInputPlayer, TradeInputTeam } from './trade-input';

export const DIAGNOSIS_FLAGS = [
  'no-star',        // no player in the league's top tier
  'thin-middle',    // stars plus a weak bench, nothing in between
  'too-much-depth', // roster spots spent on similar low-value players
  'inactive',       // few moves compared with the league
  'tough-schedule', // few NBA games or strong opponents ahead
  'injuries',       // key players out or day-to-day
  'playoff-push',   // must improve now to make / seed the playoffs
  'contender',      // strong enough to build for the playoff weeks
] as const;
export type DiagnosisFlag = (typeof DIAGNOSIS_FLAGS)[number];

/**
 * Why a trade makes sense. Shown as chips on the card. "sell-high" and
 * "buy-low" are the league's own words (Dor, 2026-10-25): when a trade is
 * one, its prose must say so, and prose that says so must carry the label.
 */
export const TRADE_ANGLES = [
  'sell-high',        // you give a player far above his projection
  'buy-low',          // you get a player far below his projection
  'consolidation',    // two (or three) for one better player
  'depth',            // one for two, filling holes or empty spots
  'positional-need',  // fixes a missing position
  'playoff-schedule', // more games in the playoff weeks
  'injury-cover',     // replaces players who are OUT
] as const;
export type TradeAngle = (typeof TRADE_ANGLES)[number];

/** Angles whose words must appear in the prose, and the pattern that finds them. */
const SPOKEN_ANGLES: [TradeAngle, RegExp][] = [
  ['sell-high', /sell(ing)?[\s-]+(him |them |it )?high/i],
  ['buy-low', /buy(ing)?[\s-]+(him |them |it )?low/i],
];

export const MAX_TRADES = 3;
export const MAX_PLAYERS_PER_SIDE = 3;
export const MAX_SUMMARY_CHARS = 700;
export const MAX_WHY_CHARS = 400;
/**
 * Partner gives up more than this share of projected value AND the best player
 * in the deal → "may say no" warning. Giving two for one star is normal.
 */
const LOPSIDED_SHARE = 0.2;

// ─── Draft (written by Claude) ───────────────────────────────────────────────

export interface TradeDraft {
  week: number;
  teams: {
    owner: string;
    diagnosis: { summary: string; flags: string[] };
    trades: {
      partnerOwner: string;
      give: number[]; // player ids
      get: number[];
      angles: string[];
      whyForYou: string;
      whyTheyAccept: string;
    }[];
  }[];
}

// ─── Final file (read by the site) ───────────────────────────────────────────

export interface TradePlayerCard {
  playerId: number;
  name: string;
  proTeam: string;
  positions: string[];
  injuryStatus: string;
  avgSeason: number | null;
  avgLast15: number | null;
  avgProjected: number | null;
  gamesRestOfRegularSeason: number;
  gamesPlayoffs: number;
}

export interface TradeIdea {
  partnerOwner: string;
  partnerTeamName: string;
  give: TradePlayerCard[];
  get: TradePlayerCard[];
  angles: TradeAngle[];
  whyForYou: string;
  whyTheyAccept: string;
  /** Players each side must drop to stay within the roster limit. */
  dropsNeeded: { you: number; partner: number };
}

export interface TradeTeamAdvice {
  owner: string;
  teamName: string;
  seed: number;
  record: { wins: number; losses: number; ties: number };
  pointsFor: number;
  diagnosis: { summary: string; flags: DiagnosisFlag[] };
  trades: TradeIdea[];
}

export interface TradeWeekFile {
  season: number;
  week: number;
  generatedAt: string;
  inputGeneratedAt: string;
  tradeDeadline: string | null;
  teams: TradeTeamAdvice[];
}

export interface TradeValidation {
  errors: string[];
  warnings: string[];
  file: TradeWeekFile | null;
}

// ─── Number check ────────────────────────────────────────────────────────────

/** Every number in a value, skipping scoring-period day lists. */
function collectNumbers(value: unknown, out: number[]): void {
  if (typeof value === 'number') out.push(value);
  else if (Array.isArray(value)) value.forEach(v => collectNumbers(v, out));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) if (k !== 'days') collectNumbers(v, out);
  }
}

/** The spellings of a number Claude may use: as stored, 1 decimal, whole. */
function spellings(n: number): string[] {
  return [String(n), n.toFixed(1), String(Math.round(n))];
}

/**
 * Numbers prose may quote: anything in the teams it talks about and the league
 * block, small counts (weeks, rounds, players, "top 10"), and the seasons.
 */
export function allowedNumbers(input: TradeInput, teams: TradeInputTeam[]): Set<string> {
  const nums: number[] = [input.season, input.season - 1, input.week];
  for (let i = 0; i <= input.league.periods.length + 1; i++) nums.push(i);
  collectNumbers(input.league, nums);
  for (const t of teams) collectNumbers(t, nums);
  return new Set(nums.flatMap(spellings));
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Numbers in `text` that `allowed` doesn't contain. Names are removed first ("70's Show"). */
export function unknownNumbers(text: string, allowed: Set<string>, names: string[]): string[] {
  let clean = text;
  for (const name of [...names].sort((a, b) => b.length - a.length)) {
    if (name) clean = clean.replace(new RegExp(escapeRe(name), 'gi'), ' ');
  }
  return (clean.match(/\d+(?:\.\d+)?/g) ?? []).filter(token => {
    const n = Number(token);
    return !allowed.has(token) && !allowed.has(String(n)) && !allowed.has(n.toFixed(1));
  });
}

// ─── Validation ──────────────────────────────────────────────────────────────

function card(p: TradeInputPlayer): TradePlayerCard {
  return {
    playerId: p.playerId,
    name: p.name,
    proTeam: p.proTeam,
    positions: p.positions,
    injuryStatus: p.injuryStatus,
    avgSeason: p.avg.season,
    avgLast15: p.avg.last15,
    avgProjected: p.avg.projected,
    gamesRestOfRegularSeason: p.games.restOfRegularSeason,
    gamesPlayoffs: p.games.playoffs,
  };
}

const projected = (ps: TradeInputPlayer[]) => ps.reduce((s, p) => s + (p.avg.projected ?? 0), 0);
const best = (ps: TradeInputPlayer[]) => Math.max(0, ...ps.map(p => p.avg.projected ?? 0));

export function validateTradeDraft(
  input: TradeInput,
  draft: TradeDraft,
  opts: { generatedAt: string; now?: Date },
): TradeValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const now = opts.now ?? new Date(opts.generatedAt);

  if (input.league.tradeDeadline && new Date(input.league.tradeDeadline) <= now) {
    errors.push(`Trade deadline ${input.league.tradeDeadline} has passed — no suggestions this week.`);
  }
  if (draft.week !== input.week) errors.push(`Draft is for week ${draft.week}, input is week ${input.week}.`);

  const byOwner = new Map(input.teams.map(t => [t.owner, t]));
  const rosterMax = Object.values(input.league.lineupSlots).reduce((a, b) => a + b, 0);
  const allNames = input.teams.flatMap(t => [t.owner, t.teamName, ...t.roster.map(p => p.name)]);
  const timesSuggested = new Map<number, number>();

  const seen = new Set<string>();
  const advice: TradeTeamAdvice[] = [];

  for (const dt of draft.teams ?? []) {
    const team = byOwner.get(dt.owner);
    const where = `${dt.owner}:`;
    if (!team) { errors.push(`${where} unknown owner.`); continue; }
    if (seen.has(dt.owner)) { errors.push(`${where} appears twice.`); continue; }
    seen.add(dt.owner);

    const summary = (dt.diagnosis?.summary ?? '').trim();
    if (!summary) errors.push(`${where} empty diagnosis summary.`);
    if (summary.length > MAX_SUMMARY_CHARS) errors.push(`${where} summary is ${summary.length} chars (max ${MAX_SUMMARY_CHARS}).`);
    const flags = dt.diagnosis?.flags ?? [];
    for (const f of flags) {
      if (!(DIAGNOSIS_FLAGS as readonly string[]).includes(f)) errors.push(`${where} unknown flag "${f}".`);
    }
    if (new Set(flags).size !== flags.length) errors.push(`${where} duplicate flags.`);

    const trades = dt.trades ?? [];
    if (trades.length > MAX_TRADES) errors.push(`${where} ${trades.length} trades (max ${MAX_TRADES}).`);
    if (trades.length === 0) warnings.push(`${where} no trade ideas.`);

    const partnersInProse = new Set<TradeInputTeam>([team]);
    const ideas: TradeIdea[] = [];
    const tradeKeys = new Set<string>();

    trades.forEach((tr, i) => {
      const at = `${where} trade ${i + 1}:`;
      const partner = byOwner.get(tr.partnerOwner);
      if (!partner) { errors.push(`${at} unknown partner "${tr.partnerOwner}".`); return; }
      if (partner === team) { errors.push(`${at} trade with yourself.`); return; }
      partnersInProse.add(partner);

      const side = (ids: number[], from: TradeInputTeam, label: string): TradeInputPlayer[] | null => {
        if (!Array.isArray(ids) || ids.length < 1 || ids.length > MAX_PLAYERS_PER_SIDE) {
          errors.push(`${at} "${label}" needs 1–${MAX_PLAYERS_PER_SIDE} players.`);
          return null;
        }
        if (new Set(ids).size !== ids.length) { errors.push(`${at} "${label}" repeats a player.`); return null; }
        const players = ids.map(id => from.roster.find(p => p.playerId === id));
        const missing = ids.filter((_, k) => !players[k]);
        if (missing.length) {
          errors.push(`${at} player id(s) ${missing.join(', ')} not on ${from.owner}'s roster.`);
          return null;
        }
        return players as TradeInputPlayer[];
      };
      const give = side(tr.give, team, 'give');
      const get = side(tr.get, partner, 'get');

      for (const [label, text] of [['whyForYou', tr.whyForYou], ['whyTheyAccept', tr.whyTheyAccept]] as const) {
        const t = (text ?? '').trim();
        if (!t) errors.push(`${at} empty ${label}.`);
        if (t.length > MAX_WHY_CHARS) errors.push(`${at} ${label} is ${t.length} chars (max ${MAX_WHY_CHARS}).`);
      }
      const angles = Array.isArray(tr.angles) ? tr.angles : [];
      if (angles.length === 0) errors.push(`${at} needs at least one angle.`);
      for (const a of angles) {
        if (!(TRADE_ANGLES as readonly string[]).includes(a)) errors.push(`${at} unknown angle "${a}".`);
      }
      for (const [angle, words] of SPOKEN_ANGLES) {
        const said = words.test(tr.whyForYou ?? '');
        if (angles.includes(angle) && !said) errors.push(`${at} angle "${angle}" but whyForYou never says "${angle.replace('-', ' ')}".`);
        if (!angles.includes(angle) && said) errors.push(`${at} whyForYou says "${angle.replace('-', ' ')}" but the angle is missing.`);
      }
      if (!give || !get) return;

      const key = `${partner.owner}|${[...tr.give].sort().join(',')}|${[...tr.get].sort().join(',')}`;
      if (tradeKeys.has(key)) errors.push(`${at} same trade listed twice.`);
      tradeKeys.add(key);

      for (const p of [...give, ...get]) timesSuggested.set(p.playerId, (timesSuggested.get(p.playerId) ?? 0) + 1);

      const gaveValue = projected(get); // what the partner gives up
      const gotValue = projected(give);
      if (gaveValue > 0 && (gaveValue - gotValue) / gaveValue > LOPSIDED_SHARE && best(get) >= best(give)) {
        warnings.push(`${at} ${partner.owner} gives up much more projected value — may say no.`);
      }

      ideas.push({
        partnerOwner: partner.owner,
        partnerTeamName: partner.teamName,
        give: give.map(card),
        get: get.map(card),
        angles: angles as TradeAngle[],
        whyForYou: tr.whyForYou.trim(),
        whyTheyAccept: tr.whyTheyAccept.trim(),
        dropsNeeded: {
          you: Math.max(0, team.roster.length - give.length + get.length - rosterMax),
          partner: Math.max(0, partner.roster.length - get.length + give.length - rosterMax),
        },
      });
    });

    // Prose may only quote numbers from this team, its trade partners, or the league.
    const allowed = allowedNumbers(input, [...partnersInProse]);
    const texts: [string, string][] = [
      ['summary', summary],
      ...trades.flatMap((tr, i) => [
        [`trade ${i + 1} whyForYou`, tr.whyForYou ?? ''],
        [`trade ${i + 1} whyTheyAccept`, tr.whyTheyAccept ?? ''],
      ] as [string, string][]),
    ];
    for (const [label, text] of texts) {
      const bad = unknownNumbers(text, allowed, allNames);
      if (bad.length) errors.push(`${where} ${label} has number(s) not in the data: ${[...new Set(bad)].join(', ')}.`);
    }

    advice.push({
      owner: team.owner,
      teamName: team.teamName,
      seed: team.seed,
      record: team.record,
      pointsFor: team.pointsFor,
      diagnosis: { summary, flags: flags as DiagnosisFlag[] },
      trades: ideas,
    });
  }

  for (const t of input.teams) if (!seen.has(t.owner)) errors.push(`${t.owner}: missing from the draft.`);
  for (const [id, n] of timesSuggested) {
    if (n > 3) {
      const name = input.teams.flatMap(t => t.roster).find(p => p.playerId === id)?.name ?? id;
      warnings.push(`${name} is in ${n} trade ideas.`);
    }
  }

  if (errors.length) return { errors, warnings, file: null };

  const order = new Map(input.teams.map((t, i) => [t.owner, i]));
  advice.sort((a, b) => (order.get(a.owner) ?? 0) - (order.get(b.owner) ?? 0));
  return {
    errors,
    warnings,
    file: {
      season: input.season,
      week: input.week,
      generatedAt: opts.generatedAt,
      inputGeneratedAt: input.generatedAt,
      tradeDeadline: input.league.tradeDeadline,
      teams: advice,
    },
  };
}
