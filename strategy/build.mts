/**
 * Personal strategy agent — fetch live ESPN data, run strategy/engine.ts,
 * write strategy/out/strategy.html (the private artifact page) and
 * strategy/out/report.json (the same numbers, for the /strategy skill).
 *
 *   npx tsx strategy/build.mts                # my team (Dor Barda, team 4)
 *   STRATEGY_TEAM_ID=3 npx tsx strategy/build.mts
 *
 * Needs ESPN_S2, SWID, LEAGUE_ID. Output is git-ignored: it never reaches the
 * repo or the website.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Season = ending year. The site reads SEASON at import time and defaults to
// 2026, so set it before importing anything from lib/.
if (!process.env.SEASON) {
  const now = new Date();
  process.env.SEASON = String(now.getUTCMonth() >= 7 ? now.getUTCFullYear() + 1 : now.getUTCFullYear());
}
const SEASON = Number(process.env.SEASON);
const MY_TEAM_ID = Number(process.env.STRATEGY_TEAM_ID || 4);

const { loadScheduleSeason } = await import('../lib/schedule-data');
const { weeksOf, buildDateIndex, nbaDate } = await import('../lib/espn-schedule');
const engine = await import('./engine');
const { renderPage } = await import('./render');
type Report = import('./render').Report;

const { ESPN_S2, SWID, LEAGUE_ID } = process.env;
if (!ESPN_S2 || !SWID || !LEAGUE_ID) {
  console.error('Missing ESPN_S2 / SWID / LEAGUE_ID.');
  process.exit(1);
}
const BASE = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${SEASON}/segments/0/leagues/${LEAGUE_ID}`;

async function espn(params: string, filter?: object): Promise<any> {
  const res = await fetch(`${BASE}${params}`, {
    headers: {
      Cookie: `espn_s2=${ESPN_S2}; SWID=${SWID}`,
      Accept: 'application/json',
      ...(filter ? { 'x-fantasy-filter': JSON.stringify(filter) } : {}),
    },
  });
  if (!res.ok) throw new Error(`ESPN ${res.status} for ${params}`);
  return res.json();
}

const ids = ['00', '01', '02', '03', '10'].map(p => `${p}${SEASON}`).concat(`00${SEASON - 1}`);
const [league, pool, scheduleSeason] = await Promise.all([
  espn('?view=mTeam&view=mRoster&view=mMatchup&view=mMatchupScore&view=mSettings'),
  // Most-owned 800 players: every free agent worth a look, plus the game logs
  // (last 21 days) that measure each NBA team's defense.
  espn('?view=kona_player_info', {
    players: {
      limit: 800,
      sortPercOwned: { sortAsc: false, sortPriority: 1 },
      filterStatsForTopScoringPeriodIds: { value: 21, additionalValue: ids },
    },
  }),
  loadScheduleSeason(),
]);
if (!scheduleSeason) throw new Error('No NBA schedule (snapshot or live).');

// ─── Calendar ────────────────────────────────────────────────────────────────

const index = buildDateIndex(scheduleSeason.schedules);
const weeks = weeksOf(scheduleSeason);
const cal = engine.buildCalendar(scheduleSeason.schedules, sp => index.dateFor(sp) ?? '');
const today: number = league.scoringPeriodId ?? league.status?.latestScoringPeriod ?? 1;

let currentWeek: number = league.status?.currentMatchupPeriod ?? 1;
// After the last day of a week, ESPN can still report it as current.
if (!(weeks[currentWeek] ?? []).some(sp => sp >= today) && weeks[currentWeek + 1]) currentWeek++;
const nextWeek = weeks[currentWeek + 1] ? currentWeek + 1 : null;

/** First scoring period on or after an epoch-ms date (waiver clear date). */
function spOnOrAfter(ms: number): number {
  const date = nbaDate(ms);
  for (let sp = 1; sp <= index.maxScoringPeriod + 7; sp++) {
    if ((index.dateFor(sp) ?? '') >= date) return sp;
  }
  return index.maxScoringPeriod + 1;
}

// ─── Teams ───────────────────────────────────────────────────────────────────

const members = new Map<string, string>(
  (league.members || []).map((m: any) => [m.id, `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim()]));
const teams = new Map<number, { name: string; owner: string; players: any[] }>();
for (const t of league.teams || []) {
  teams.set(t.id, {
    name: (t.name || `Team ${t.id}`).trim(),
    owner: members.get(t.owners?.[0]) ?? '',
    players: (t.roster?.entries || []).map((e: any) =>
      engine.parsePlayer(e.playerPoolEntry?.player, SEASON, { lineupSlotId: e.lineupSlotId })),
  });
}
const me = teams.get(MY_TEAM_ID);
if (!me) throw new Error(`Team ${MY_TEAM_ID} not in league.`);

function opponentIn(week: number): { teamId: number; myPts: number; oppPts: number } | null {
  const m = (league.schedule || []).find((s: any) =>
    s.matchupPeriodId === week && (s.home?.teamId === MY_TEAM_ID || s.away?.teamId === MY_TEAM_ID));
  if (!m || !m.away) return null;
  const mine = m.home.teamId === MY_TEAM_ID ? m.home : m.away;
  const theirs = m.home.teamId === MY_TEAM_ID ? m.away : m.home;
  const pts = (side: any) => side.totalPointsLive ?? side.totalPoints ?? 0;
  return { teamId: theirs.teamId, myPts: pts(mine), oppPts: pts(theirs) };
}

function side(teamId: number, actual: number): import('./engine').Side {
  const t = teams.get(teamId)!;
  return { teamId, teamName: t.name, owner: t.owner, players: t.players, actual };
}

// ─── Free agents + defense ───────────────────────────────────────────────────

const freeAgents: import('./engine').AgentPlayer[] = [];
const logs: import('./engine').GameLog[] = [];
for (const e of pool.players || []) {
  const raw = e.player;
  if (!raw) continue;
  logs.push(...engine.gameLogs(raw, SEASON));
  if (e.onTeamId !== 0 || (e.status !== 'FREEAGENT' && e.status !== 'WAIVERS') || !raw.proTeamId) continue;
  freeAgents.push(engine.parsePlayer(raw, SEASON, {
    freeStatus: e.status,
    availableFromSp: e.status === 'WAIVERS' && e.waiverProcessDate ? spOnOrAfter(e.waiverProcessDate) : undefined,
  }));
}
const defense = engine.buildDefense(logs, cal);

// ─── Analysis ────────────────────────────────────────────────────────────────

const cur = opponentIn(currentWeek);
const remaining = (weeks[currentWeek] ?? []).filter(sp => sp >= today);
const current = cur
  ? engine.analyzeMatchup(currentWeek, remaining, side(MY_TEAM_ID, cur.myPts), side(cur.teamId, cur.oppPts), cal, defense, today)
  : null;

const nxt = nextWeek ? opponentIn(nextWeek) : null;
const nextDays = nextWeek ? weeks[nextWeek] : [];
// Next week: everyone on waivers today has cleared by then.
const faNext = freeAgents.map(p => ({ ...p, availableFromSp: undefined }));
const next = nxt && nextWeek
  ? engine.analyzeMatchup(nextWeek, nextDays, side(MY_TEAM_ID, 0), side(nxt.teamId, 0), cal, defense)
  : null;

function playsOn(list: import('./engine').Pickup[], sp: number | undefined) {
  if (sp === undefined) return [];
  return list.filter(p => cal.games.get(p.player.proTeamId)?.has(sp) &&
    (p.player.availableFromSp === undefined || sp >= p.player.availableFromSp)).slice(0, 8);
}

const report: Report = {
  generatedAt: new Date().toISOString(),
  season: SEASON,
  today: { sp: today, date: cal.dateFor(today) },
  team: { id: MY_TEAM_ID, name: me.name, owner: me.owner },
  defenseSample: defense.sample,
  current,
  next,
  pickups: {
    // An add is for the rest of the week (a dropped player can't come straight
    // back), so today's and tomorrow's lists rank by rest-of-week gain too,
    // limited to players who play that day.
    today: playsOn(engine.rankPickups(me.players, freeAgents, remaining, cal, defense, today, 60), remaining[0]),
    tomorrow: playsOn(engine.rankPickups(me.players, freeAgents, remaining.slice(1), cal, defense, today, 60), remaining[1]),
    restOfWeek: engine.rankPickups(me.players, freeAgents, remaining, cal, defense, today, 12),
    nextWeek: engine.rankPickups(me.players, faNext, nextDays, cal, defense, -1, 12),
  },
  trending: engine.trending(freeAgents),
  roster: me.players,
};

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out');
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, (_, v) => v instanceof Map ? Object.fromEntries(v) : v, 2));
writeFileSync(path.join(outDir, 'strategy.html'), renderPage(report, cal));

const pct = (p?: number) => p === undefined ? '—' : `${Math.round(p * 100)}%`;
console.log(`Week ${currentWeek}: ${current ? `${current.me.final} vs ${current.opp.final} (${current.opp.teamName}), win ${pct(current.winChance)} — ${current.verdict.label}` : 'no matchup'}`);
if (next) console.log(`Week ${nextWeek}: ${next.me.final} vs ${next.opp.final} (${next.opp.teamName}), win ${pct(next.winChance)}`);
console.log(`Free agents scanned: ${freeAgents.length}; defense sample: ${defense.sample} player-games.`);
console.log(`Wrote ${path.join(outDir, 'strategy.html')}`);

