/**
 * Trade requests — an owner asks Claude about one player (docs/TRADE-REQUESTS-SPEC.md):
 *   sell: "I want to trade my player X — what can I get?"
 *   buy:  "I want player Y — what can I offer his owner?"
 *
 * The site saves each request as `pending` in the owner's file,
 * data/trade-requests/<season>/<slug>.json. A scheduled Claude session
 * (skill trade-requests) answers every pending request a few times a day,
 * and validateRequestAnswers() checks the answers like the weekly ideas:
 * players on the right rosters, no pickups, no invented numbers.
 *
 * Pure — no I/O.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ownerNamer, type TradeInput, type TradeInputTeam } from './trade-input';
import {
  checkTradeIdeas, checkProse, MAX_TRADES, MAX_SUMMARY_CHARS,
  type TradeDraftIdea, type TradeIdea,
} from './trade-output';
import { ownerToSlug } from './team-utils';

export type TradeRequestKind = 'sell' | 'buy';

export interface TradeRequestAnswer {
  answeredAt: string;
  /** When the ESPN data behind the answer was fetched. */
  inputGeneratedAt: string;
  summary: string;
  trades: TradeIdea[];
}

export interface TradeRequest {
  id: string;
  kind: TradeRequestKind;
  playerId: number;
  playerName: string;
  /** Who had the player when the request was sent (the owner himself for "sell"). */
  playerOwner: string;
  note: string;
  createdAt: string;
  /** The commissioner can ask on any team's page; those don't count toward the daily limit. */
  by: 'owner' | 'commissioner';
  status: 'pending' | 'answered';
  answer?: TradeRequestAnswer;
}

export interface TradeRequestFile {
  season: number;
  owner: string;
  requests: TradeRequest[];
}

/** Requests an owner may send per day (Israel time). */
export const MAX_REQUESTS_PER_DAY = 2;
export const MAX_NOTE_CHARS = 200;

/**
 * When the scheduled task answers, Israel time — must match its cron
 * (`47 9,15,21 * * *` in Asia/Jerusalem). Shown on the page as "about 10:00".
 */
export const ANSWER_RUNS = ['09:47', '15:47', '21:47'];

export const requestFilePath = (season: number, slug: string) => `data/trade-requests/${season}/${slug}.json`;

// ─── Time ───────────────────────────────────────────────────────────────────

const ISRAEL = 'Asia/Jerusalem';

/** "2026-11-11" — the Israel calendar day of an instant. */
export function israelDay(iso: string | number | Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ISRAEL, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(iso));
}

function israelClock(now: Date): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: ISRAEL, hour: '2-digit', minute: '2-digit', hour12: false })
    .format(now);
}

/** The next answer run as a rounded clock time, e.g. "16:00" (tomorrow's first run after the last). */
export function nextAnswerRun(now: Date): string {
  const clock = israelClock(now);
  const next = ANSWER_RUNS.find(t => t > clock) ?? ANSWER_RUNS[0];
  const [h, m] = next.split(':').map(Number);
  return `${String((h + (m >= 30 ? 1 : 0)) % 24).padStart(2, '0')}:00`;
}

export function requestsLeftToday(file: TradeRequestFile | null, now: Date): number {
  const today = israelDay(now);
  const used = (file?.requests ?? []).filter(r => r.by === 'owner' && israelDay(r.createdAt) === today).length;
  return Math.max(0, MAX_REQUESTS_PER_DAY - used);
}

// ─── Rosters for the form ───────────────────────────────────────────────────

export interface PickerPlayer {
  playerId: number;
  name: string;
  proTeam: string;
  positions: string[];
}

export interface PickerTeam {
  owner: string;
  teamName: string;
  players: PickerPlayer[];
}

const POSITIONS: [number, string][] = [[0, 'PG'], [1, 'SG'], [2, 'SF'], [3, 'PF'], [4, 'C']];

/** Every roster from a raw ESPN league (mTeam + mRoster), owners named as in the trade input. */
export function pickerRosters(league: any, proTeamAbbrev: Record<number, string>): PickerTeam[] {
  const ownerOf = ownerNamer(league);
  return (league.teams || []).map((t: any) => ({
    owner: ownerOf(t),
    teamName: (t.name || '').trim(),
    players: (t.roster?.entries || []).flatMap((e: any) => {
      const p = e.playerPoolEntry?.player;
      if (!p) return [];
      return [{
        playerId: p.id,
        name: p.fullName || `Player ${p.id}`,
        proTeam: proTeamAbbrev[p.proTeamId] || 'FA',
        positions: POSITIONS.filter(([s]) => (p.eligibleSlots || []).includes(s)).map(([, n]) => n),
      }];
    }).sort((a: PickerPlayer, b: PickerPlayer) => a.name.localeCompare(b.name)),
  })).sort((a: PickerTeam, b: PickerTeam) => a.owner.localeCompare(b.owner));
}

// ─── New request (site) ─────────────────────────────────────────────────────

/**
 * Check a request from the form against live rosters and build it.
 * Returns an error message for the owner, or the request.
 */
export function buildRequest(
  args: { owner: string; kind: string; playerId: number; note: string; by: 'owner' | 'commissioner' },
  rosters: PickerTeam[],
  now: Date,
  random: string,
): { error: string } | { request: TradeRequest } {
  const { owner, kind, playerId, by } = args;
  const note = args.note.trim().replace(/\s+/g, ' ');
  if (kind !== 'sell' && kind !== 'buy') return { error: 'Pick what you want to do.' };
  if (note.length > MAX_NOTE_CHARS) return { error: `Note is too long (max ${MAX_NOTE_CHARS} characters).` };
  const mine = rosters.find(t => t.owner === owner);
  if (!mine) return { error: 'Your team was not found in ESPN.' };

  const holder = rosters.find(t => t.players.some(p => p.playerId === playerId));
  const player = holder?.players.find(p => p.playerId === playerId);
  if (!holder || !player) return { error: 'That player is not on a roster in the league.' };
  if (kind === 'sell' && holder !== mine) return { error: `${player.name} is not on your roster.` };
  if (kind === 'buy' && holder === mine) return { error: `${player.name} is already yours.` };

  return {
    request: {
      id: `${now.toISOString().replace(/[:.]/g, '-')}-${random}`,
      kind,
      playerId,
      playerName: player.name,
      playerOwner: holder.owner,
      note,
      createdAt: now.toISOString(),
      by,
      status: 'pending',
    },
  };
}

// ─── Answers (scheduled Claude session) ─────────────────────────────────────

export interface RequestAnswerDraft {
  answers: {
    id: string;
    summary: string;
    trades: TradeDraftIdea[];
  }[];
}

export interface RequestValidation {
  errors: string[];
  warnings: string[];
  /** Answers checked and turned into cards, by request id. Empty when there are errors. */
  answers: Map<string, TradeRequestAnswer>;
}

export const pendingRequests = (files: TradeRequestFile[]) =>
  files.flatMap(f => f.requests.filter(r => r.status === 'pending').map(r => ({ owner: f.owner, request: r })));

/**
 * Check Claude's answers. Every pending request needs exactly one answer.
 *   sell — every idea gives the requested player.
 *   buy  — every idea gets the requested player (so the partner is whoever has him now).
 * When the player can't be traded any more (moved, dropped, a new pickup) the
 * answer has no ideas and the summary says why.
 */
export function validateRequestAnswers(
  input: TradeInput,
  files: TradeRequestFile[],
  draft: RequestAnswerDraft,
  opts: { generatedAt: string },
): RequestValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const answers = new Map<string, TradeRequestAnswer>();

  const pending = new Map(pendingRequests(files).map(x => [x.request.id, x]));
  const teamBySlug = new Map<string, TradeInputTeam>(input.teams.map(t => [ownerToSlug(t.owner), t]));
  const seen = new Set<string>();

  for (const a of draft.answers ?? []) {
    const where = `request ${a.id}:`;
    const item = pending.get(a.id);
    if (!item) { errors.push(`${where} not a pending request.`); continue; }
    if (seen.has(a.id)) { errors.push(`${where} answered twice.`); continue; }
    seen.add(a.id);
    const { request } = item;

    const team = teamBySlug.get(ownerToSlug(item.owner));
    if (!team) { errors.push(`${where} owner ${item.owner} not in the input.`); continue; }

    const summary = (a.summary ?? '').trim();
    if (!summary) errors.push(`${where} empty summary.`);
    if (summary.length > MAX_SUMMARY_CHARS) errors.push(`${where} summary is ${summary.length} chars (max ${MAX_SUMMARY_CHARS}).`);

    const trades = Array.isArray(a.trades) ? a.trades : [];
    if (trades.length > MAX_TRADES) errors.push(`${where} ${trades.length} trades (max ${MAX_TRADES}).`);

    const holder = input.teams.find(t => t.roster.some(p => p.playerId === request.playerId));
    const player = holder?.roster.find(p => p.playerId === request.playerId);
    const possible = !!player && player.tradeable && (request.kind === 'sell' ? holder === team : holder !== team);
    if (!possible && trades.length) {
      errors.push(`${where} ${request.playerName} can't be traded this way any more (moved, dropped or a new pickup) — answer with no trades and say why.`);
    }
    if (possible && !trades.length) warnings.push(`${where} no trade ideas — make sure the summary says why.`);

    trades.forEach((tr, i) => {
      const side = request.kind === 'sell' ? tr.give : tr.get;
      if (!Array.isArray(side) || !side.includes(request.playerId)) {
        errors.push(`${where} trade ${i + 1}: must ${request.kind === 'sell' ? 'give' : 'get'} ${request.playerName} (${request.playerId}).`);
      }
    });

    const { ideas, partners } = checkTradeIdeas(input, team, trades, where, errors, warnings);
    checkProse(input, partners, [
      ['summary', summary],
      ...trades.flatMap((tr, i) => [
        [`trade ${i + 1} whyForYou`, tr.whyForYou ?? ''],
        [`trade ${i + 1} whyTheyAccept`, tr.whyTheyAccept ?? ''],
      ] as [string, string][]),
    ], where, errors);

    answers.set(a.id, { answeredAt: opts.generatedAt, inputGeneratedAt: input.generatedAt, summary, trades: ideas });
  }

  for (const id of pending.keys()) if (!seen.has(id)) errors.push(`request ${id}: no answer.`);

  return { errors, warnings, answers: errors.length ? new Map() : answers };
}

/** The file with these answers filled in. Requests not in `answers` stay as they are. */
export function applyAnswers(file: TradeRequestFile, answers: Map<string, TradeRequestAnswer>): TradeRequestFile {
  return {
    ...file,
    requests: file.requests.map(r =>
      r.status === 'pending' && answers.has(r.id) ? { ...r, status: 'answered', answer: answers.get(r.id) } : r,
    ),
  };
}
