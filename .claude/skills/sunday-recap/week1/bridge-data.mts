/**
 * Week 1 only — projection bridge per matchup, for the long Sunday video.
 * Run with: npx tsx .claude/skills/sunday-recap/week1/bridge-data.mts --out recaps/bridge.json
 *
 * Per team:
 *   start      = frozen start-of-week projection (data/projections/<season>/week-01.json)
 *   performance= Σ (points scored as starter − average × games started)   [days played so far]
 *   games      = Σ average × (games started + games tonight) − frozen projected   [missed games, moves]
 *   final      = live + tonight projection   (= start + performance + games)
 * Averages are the same ones the frozen file used (the script stops if any changed).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/* eslint-disable @typescript-eslint/no-explicit-any */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
try {
  for (const line of readFileSync(resolve(ROOT, '.env.local'), 'utf-8').split('\n')) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length && !process.env[key.trim()]) process.env[key.trim()] = rest.join('=').trim();
  }
} catch { /* env already set */ }
process.env.SEASON ??= '2027';
const { ESPN_S2, SWID, LEAGUE_ID } = process.env;
if (!ESPN_S2 || !SWID || !LEAGUE_ID) { console.error('❌ Missing ESPN_S2, SWID, or LEAGUE_ID.'); process.exit(1); }
const outFile = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : null;

const { CURRENT_SEASON } = await import(resolve(ROOT, 'lib/season.ts'));
const { getScheduleSeason, weeksOf } = await import(resolve(ROOT, 'lib/espn-schedule.ts'));
const { projectTeam, playerAverage } = await import(resolve(ROOT, 'lib/week-projections.ts'));
const { winProbability, remainingVariance } = await import(resolve(ROOT, 'lib/win-probability.ts'));
const { dayStatLine, isStarter } = await import(resolve(ROOT, 'lib/lineup.ts'));
const { teamLogoSrc } = await import(resolve(ROOT, 'lib/team-logos.ts'));

const WEEK = 1;
const base = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${CURRENT_SEASON}/segments/0/leagues/${LEAGUE_ID}`;
const get = async (q: string) => {
  const r = await fetch(base + q, { headers: { Cookie: `espn_s2=${ESPN_S2}; SWID=${SWID}`, Accept: 'application/json' } });
  if (!r.ok) { console.error(`❌ ESPN ${r.status}`); process.exit(1); }
  return r.json();
};

const league: any = await get('?view=mTeam&view=mRoster&view=mMatchup&view=mMatchupScore&view=mSettings');
const today: number = league.scoringPeriodId || league.status?.latestScoringPeriod;
const season = await getScheduleSeason();
const weekDays: number[] = weeksOf(season)[WEEK];
const pastDays = weekDays.filter(sp => sp < today);
const frozen = JSON.parse(readFileSync(resolve(ROOT, `data/projections/${CURRENT_SEASON}/week-01.json`), 'utf-8'));

const clean = (s: string) => s.replace(/[\uD800-\uDFFF]|[☀-⟿]|[︀-️]/g, '').replace(/[‘’]/g, "'").trim();
const r1 = (n: number) => Math.round(n * 10) / 10;
const members = new Map<string, any>((league.members || []).map((m: any) => [m.id, m]));
const OWNER_LABEL: Record<string, string> = { 'Nordau Peaky Blinder': 'Barda', "Flint Tropics 70's Show": 'Gelless' };
const played = (day: any) => !!day && (day.appliedTotal > 0 || (day.stats?.['0'] || 0) > 0 || (day.stats?.['40'] || 0) > 0);

// Per day, per team: who started and what they scored.
type Line = { name: string; nba?: string; points: number; started: number; avg: number };
const lines = new Map<number, Map<string, Line>>();
const ids = new Map<string, number>();
const avgFallback = new Map<string, number>();
for (const sp of pastDays) {
  const day: any = await get(`?view=mMatchupScore&view=mBoxscore&scoringPeriodId=${sp}`);
  for (const m of day.schedule.filter((m: any) => m.matchupPeriodId === WEEK)) {
    for (const s of [m.home, m.away]) {
      if (!lines.has(s.teamId)) lines.set(s.teamId, new Map());
      const team = lines.get(s.teamId)!;
      for (const e of s.rosterForCurrentScoringPeriod?.entries || []) {
        const p = e.playerPoolEntry?.player;
        if (!p || !isStarter(e)) continue;
        const stat = dayStatLine(e, sp);
        if (!played(stat)) continue;
        const l = team.get(p.fullName) ?? { name: p.fullName, points: 0, started: 0, avg: 0 };
        ids.set(p.fullName, p.id);
        l.points += stat.appliedTotal; l.started += 1;
        team.set(p.fullName, l);
      }
    }
  }
}

{
  for (const m of frozen.matchups) for (const s of [m.home, m.away]) for (const p of s.roster) avgFallback.set(p.name, p.avg);
  for (const t of league.teams) for (const e of t.roster.entries) {
    const p = e.playerPoolEntry.player;
    avgFallback.set(p.fullName, playerAverage(p, CURRENT_SEASON, WEEK));
  }
  const missing = [...ids].filter(([n]) => !avgFallback.has(n));
  if (missing.length) {
    const filter = { players: { filterIds: { value: missing.map(([, id]) => id) },
      filterStatsForTopScoringPeriodIds: { value: 5, additionalValue: [`10${CURRENT_SEASON}`] } } };
    const r = await fetch(base + '?view=kona_player_info', { headers: { Cookie: `espn_s2=${ESPN_S2}; SWID=${SWID}`, 'x-fantasy-filter': JSON.stringify(filter) } });
    const body: any = await r.json();
    for (const pl of body.players || []) avgFallback.set(pl.player.fullName, playerAverage(pl.player, CURRENT_SEASON, WEEK));
    console.error('Players picked up and dropped this week:', missing.map(([n]) => `${n} (${avgFallback.get(n)})`).join(', '));
  }
}

function side(team: any, espnSide: any, frozenSide: any) {
  const name = clean(team.name);
  const owner = OWNER_LABEL[name] ?? (team.owners || []).map((id: string) => members.get(id)?.firstName ?? '?').join(' & ');
  const live = r1(espnSide.totalPointsLive ?? espnSide.totalPoints ?? 0);
  const hasPlayed = (player: any, sp: number) => sp === today && !!dayStatLine({ playerPoolEntry: { player } }, sp);
  const tonight = projectTeam(team, [today], season.schedules, CURRENT_SEASON, WEEK, hasPlayed);

  const plan = new Map<string, any>(frozenSide.roster.map((p: any) => [p.name, p]));
  const done = lines.get(team.id) ?? new Map<string, Line>();
  const tonightBy = new Map<string, any>(tonight.roster.map((p: any) => [p.name, p]));
  for (const p of tonight.roster) {
    const was = plan.get(p.name);
    if (was && Math.abs(was.avg - p.avg) > 0.05) { console.error(`❌ Average changed: ${p.name} ${was.avg} → ${p.avg}`); process.exit(1); }
  }

  const names = new Set<string>([...plan.keys(), ...done.keys(), ...tonightBy.keys()]);
  const players: any[] = [...names].map(n => {
    const was = plan.get(n), d = done.get(n), t = tonightBy.get(n);
    const avg = t?.avg ?? was?.avg ?? avgFallback.get(n) ?? NaN;
    const started = d?.started ?? 0, gamesTonight = t?.games ?? 0, points = d?.points ?? 0;
    return {
      name: n,
      nba: t?.nba ?? was?.nba ?? '',
      avg,
      plannedGames: was?.games ?? 0,
      planned: was?.projected ?? 0,
      started, points: r1(points), gamesTonight,
      onRosterAtStart: !!was, onRosterNow: tonightBy.has(n),
      status: t?.status ?? was?.status ?? '',
      performance: r1(points - avg * started),
      games: r1(avg * (started + gamesTonight) - (was ? was.avg * was.games : 0)),
    };
  });

  const start = r1(frozenSide.projectedPoints);
  const performance = r1(players.reduce((n, p) => n + p.points - p.avg * p.started, 0));
  const gamesEffect = r1(players.reduce((n, p) => n + p.avg * (p.started + p.gamesTonight) - (p.onRosterAtStart ? p.planned : 0), 0));
  const tonightProj = r1(tonight.projectedPoints);
  const final = r1(live + tonightProj);
  const pointsSum = r1(players.reduce((n, p) => n + p.points, 0));

  return {
    teamId: team.id, name, owner, logo: teamLogoSrc(name),
    start, startGames: frozenSide.games,
    performance, gamesEffect,
    live, pointsCheck: pointsSum,
    tonight: tonightProj, playersTonight: tonight.games,
    final, bridgeCheck: r1(start + performance + gamesEffect),
    movesUsed: team.transactionCounter?.matchupAcquisitionTotals?.[String(WEEK)] ?? 0,
    gamesPlayed: players.reduce((n, p) => n + p.started, 0),
    tonightPlayers: tonight.roster.filter((p: any) => p.games > 0)
      .sort((a: any, b: any) => b.avg - a.avg)
      .map((p: any) => ({ name: p.name, nba: p.nba, avg: p.avg, status: p.status })),
    players: players.filter(p => p.performance || p.games || p.points),
    varStart: remainingVariance(frozenSide.roster),
    varNow: remainingVariance(tonight.roster),
  };
}

const teamById = new Map<number, any>(league.teams.map((t: any) => [t.id, t]));
const frozenById = new Map<number, any>();
for (const m of frozen.matchups) for (const s of [m.home, m.away]) frozenById.set(s.teamId, s);

const matchups = league.schedule
  .filter((m: any) => m.matchupPeriodId === WEEK)
  .map((m: any) => {
    const h = side(teamById.get(m.home.teamId), m.home, frozenById.get(m.home.teamId));
    const a = side(teamById.get(m.away.teamId), m.away, frozenById.get(m.away.teamId));
    const pStart = winProbability({ expected: h.start, variance: h.varStart }, { expected: a.start, variance: a.varStart });
    const pNow = winProbability({ expected: h.final, variance: h.varNow }, { expected: a.final, variance: a.varNow });
    const strip = ({ varStart, varNow, ...rest }: typeof h) => (void varStart, void varNow, rest);
    return {
      home: { ...strip(h), winProbStart: r1(pStart * 100), winProbNow: r1(pNow * 100) },
      away: { ...strip(a), winProbStart: r1((1 - pStart) * 100), winProbNow: r1((1 - pNow) * 100) },
    };
  })
  .sort((x: any, y: any) => Math.max(x.home.winProbNow, x.away.winProbNow) - Math.max(y.home.winProbNow, y.away.winProbNow));

const out = { season: CURRENT_SEASON, week: WEEK, today, pastDays, frozenAt: frozen.frozenAt, generatedAt: new Date().toISOString(), matchups };
if (outFile) writeFileSync(outFile, JSON.stringify(out, null, 2) + '\n');
for (const m of matchups) for (const s of [m.home, m.away])
  console.log(`${s.name.padEnd(26)} start ${s.start}  perf ${s.performance}  games ${s.gamesEffect}  → ${s.bridgeCheck} | final ${s.final} (live ${s.live}, pts ${s.pointsCheck}, tonight ${s.tonight})  win ${s.winProbStart}% → ${s.winProbNow}%`);
