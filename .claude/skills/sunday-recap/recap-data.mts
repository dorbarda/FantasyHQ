/**
 * Sunday recap — live numbers for every matchup of the current week.
 * Run with: npx tsx .claude/skills/sunday-recap/recap-data.mts [--as-if-last-night] [--out file.json]
 *
 * Uses the site's own logic (lib/week-projections + lib/win-probability), so
 * projected scores and win % match the matchups page.
 *
 *   • live score + gap (ESPN totalPointsLive)
 *   • starters left tonight + key players tonight (games not started yet)
 *   • moves left this week: 1 move per day of the matchup (week 1 = 6 days)
 *   • projected final score + win % for the rest of the week
 *
 * --as-if-last-night: test mode — treat today as the week's last day
 * (projection = live score + tonight only). On a real Sunday both modes match.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/* eslint-disable @typescript-eslint/no-explicit-any */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

try {
  for (const line of readFileSync(resolve(ROOT, '.env.local'), 'utf-8').split('\n')) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length && !process.env[key.trim()]) process.env[key.trim()] = rest.join('=').trim();
  }
} catch {
  /* no .env.local — fine when the env already has the secrets */
}
process.env.SEASON ??= '2027';

const { ESPN_S2, SWID, LEAGUE_ID } = process.env;
if (!ESPN_S2 || !SWID || !LEAGUE_ID) {
  console.error('❌ Missing ESPN_S2, SWID, or LEAGUE_ID in the environment.');
  process.exit(1);
}

const args = process.argv.slice(2);
const asIfLastNight = args.includes('--as-if-last-night');
const outFile = args.includes('--out') ? args[args.indexOf('--out') + 1] : null;

// Import AFTER env is loaded — these modules read process.env at load time.
const { CURRENT_SEASON } = await import(resolve(ROOT, 'lib/season.ts'));
const { getScheduleSeason, weeksOf, buildDateIndex } = await import(resolve(ROOT, 'lib/espn-schedule.ts'));
const { projectTeam } = await import(resolve(ROOT, 'lib/week-projections.ts'));
const { winProbability, remainingVariance } = await import(resolve(ROOT, 'lib/win-probability.ts'));
const { dayStatLine } = await import(resolve(ROOT, 'lib/lineup.ts'));
const { teamLogoSrc } = await import(resolve(ROOT, 'lib/team-logos.ts'));
const { startWinProb } = await import(resolve(ROOT, 'lib/week-daily.ts'));

const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${CURRENT_SEASON}` +
  `/segments/0/leagues/${LEAGUE_ID}?view=mTeam&view=mRoster&view=mMatchup&view=mMatchupScore&view=mSettings`;
const res = await fetch(url, { headers: { Cookie: `espn_s2=${ESPN_S2}; SWID=${SWID}`, Accept: 'application/json' } });
if (!res.ok) {
  console.error(`❌ ESPN API ${res.status} — cookies expired or LEAGUE_ID/SEASON wrong.`);
  process.exit(1);
}
const league = await res.json();

const week: number = league.status?.currentMatchupPeriod;
const today: number = league.scoringPeriodId || league.status?.latestScoringPeriod;
const season = await getScheduleSeason();
const weekDays: number[] = weeksOf(season)[week] ?? [];
const index = buildDateIndex(season.schedules);
const remaining = asIfLastNight ? [today] : weekDays.filter(sp => sp >= today);
const isLastDay = today === weekDays.at(-1);

// League rule: 1 move per day of the matchup, so the weekly limit is the
// week's length (usually 7; ESPN: matchupLimitPerScoringPeriod).
const moveLimit = weekDays.length;
const members = new Map<string, any>((league.members || []).map((m: any) => [m.id, m]));
// Same overrides as lib/espn.ts — two owners share a first name.
const OWNER_LABEL: Record<string, string> = { 'Nordau Peaky Blinder': 'Barda', "Flint Tropics 70's Show": 'Gelless' };
const clean = (s: string) => s.replace(/[\uD800-\uDFFF]|[☀-⟿]|[︀-️]/g, '').replace(/[‘’]/g, "'").trim();

const hasPlayed = (player: any, sp: number) => sp === today && !!dayStatLine({ playerPoolEntry: { player } }, sp);
const r1 = (n: number) => Math.round(n * 10) / 10;

function side(team: any, espnSide: any) {
  const name = clean(team.name || `Team ${team.id}`);
  const owner = OWNER_LABEL[name] ?? (team.owners || []).map((id: string) => members.get(id)?.firstName ?? '?').join(' & ');
  const live = r1(espnSide.totalPointsLive ?? espnSide.totalPoints ?? 0);
  const rest = projectTeam(team, remaining, season.schedules, CURRENT_SEASON, week, hasPlayed);
  const tonight = projectTeam(team, [today], season.schedules, CURRENT_SEASON, week, hasPlayed);
  const movesUsed: number = team.transactionCounter?.matchupAcquisitionTotals?.[String(week)] ?? 0;
  return {
    teamId: team.id,
    name,
    owner,
    logo: teamLogoSrc(name),
    live,
    playersLeftTonight: tonight.games,
    gamesLeftWeek: rest.games,
    keyPlayersTonight: tonight.roster
      .filter((p: any) => p.games > 0)
      .sort((a: any, b: any) => b.avg - a.avg)
      .slice(0, 3)
      .map((p: any) => ({ name: p.name, nba: p.nba, avg: p.avg, status: p.status })),
    movesUsed,
    movesLeft: Math.max(0, moveLimit - movesUsed),
    projected: r1(live + rest.projectedPoints),
    variance: remainingVariance(rest.roster),
    tonightPoints: r1(tonight.projectedPoints),
    _tonightRoster: tonight.roster,
  };
}

const teamById = new Map<number, any>((league.teams || []).map((t: any) => [t.id, t]));

/* ── Story of the week ────────────────────────────────────────────────
 * Compares the frozen start-of-week projection (data/projections/<season>/
 * week-NN.json) with what happened: starter-games played, points per game,
 * players who missed games, pickups, and the daily win % path
 * (week-NN-daily.json). Per-day rosters come from ESPN (one call per day). */
const projDir = resolve(ROOT, 'data/projections', String(CURRENT_SEASON));
const readJson = (f: string) => { try { return JSON.parse(readFileSync(resolve(projDir, f), 'utf-8')); } catch { return null; } };
const frozen = readJson(`week-${String(week).padStart(2, '0')}.json`);
const daily = readJson(`week-${String(week).padStart(2, '0')}-daily.json`);
const frozenTeam = new Map<number, any>();
for (const m of frozen?.matchups || []) { frozenTeam.set(m.home.teamId, m.home); frozenTeam.set(m.away.teamId, m.away); }

// teamId → player name → { games, points } as a starter on finished days.
const played = new Map<number, Map<string, { games: number; points: number; avg: number }>>();
const finishedDays = weekDays.filter(sp => sp < today);
for (const sp of finishedDays) {
  const r = await fetch(url.replace(/\?view=.*/, `?view=mRoster&scoringPeriodId=${sp}`),
    { headers: { Cookie: `espn_s2=${ESPN_S2}; SWID=${SWID}`, Accept: 'application/json' } });
  if (!r.ok) { console.error(`⚠️ day ${sp}: ESPN ${r.status} — story left out`); played.clear(); break; }
  for (const t of (await r.json()).teams || []) {
    const byName = played.get(t.id) ?? new Map();
    played.set(t.id, byName);
    for (const e of t.roster?.entries || []) {
      if (e.lineupSlotId === 12 || e.lineupSlotId === 13) continue;
      const line = dayStatLine(e, sp);
      if (!line || !(line.appliedTotal > 0 || (line.stats?.['0'] || 0) > 0 || (line.stats?.['40'] || 0) > 0)) continue;
      const p = e.playerPoolEntry.player;
      const cur = byName.get(p.fullName) ?? { games: 0, points: 0, avg: 0 };
      cur.games++; cur.points = r1(cur.points + (line.appliedTotal || 0));
      byName.set(p.fullName, cur);
    }
  }
}

function story(s: any) {
  const start = frozenTeam.get(s.teamId);
  const mine = played.get(s.teamId);
  if (!start || !mine) return null;
  const startAvg = start.games ? start.projectedPoints / start.games : 0;
  const gamesPlayed = [...mine.values()].reduce((n, p) => n + p.games, 0);
  const startByName = new Map<string, any>(start.roster.map((p: any) => [p.name, p]));
  const nowByName = new Map<string, any>(s._tonightRoster.map((p: any) => [p.name, p]));
  // Players from the start-of-week roster who got fewer games than projected.
  const missed = start.roster
    .filter((p: any) => p.games > 0)
    .map((p: any) => {
      const got = (mine.get(p.name)?.games ?? 0) + (nowByName.get(p.name)?.games ?? 0);
      return { name: p.name, avg: p.avg, projectedGames: p.games, games: got, status: nowByName.get(p.name)?.status ?? 'DROPPED',
        lost: r1((p.games - got) * p.avg) };
    })
    .filter((p: any) => p.games < p.projectedGames)
    .sort((a: any, b: any) => b.lost - a.lost)
    .slice(0, 3);
  const pickups = [...mine.entries()]
    .filter(([name]) => !startByName.has(name))
    .map(([name, p]) => ({ name, games: p.games, points: p.points }))
    .sort((a, b) => b.points - a.points);
  const vsAvg = [...mine.entries()]
    .filter(([name]) => startByName.has(name))
    .map(([name, p]) => ({ name, games: p.games, points: p.points, avg: startByName.get(name).avg,
      perGame: r1(p.points / p.games), diff: r1(p.points - p.games * startByName.get(name).avg) }))
    .sort((a, b) => b.diff - a.diff);
  return {
    startProjected: start.projectedPoints,
    startGames: start.games,
    startAvgPerGame: r1(startAvg),
    gamesPlayed,
    gamesTotal: gamesPlayed + s.playersLeftTonight,
    avgPerGame: gamesPlayed ? r1(s.live / gamesPlayed) : 0,
    // Final projection − start projection, split into more/fewer games and points per game.
    volumeEffect: r1((gamesPlayed + s.playersLeftTonight - start.games) * startAvg),
    performanceEffect: r1(s.projected - start.projectedPoints - (gamesPlayed + s.playersLeftTonight - start.games) * startAvg),
    missed,
    pickups: pickups.slice(0, 3),
    pickupPoints: r1(pickups.reduce((n, p) => n + p.points, 0)),
    bestVsAvg: vsAvg.slice(0, 2),
    worstVsAvg: vsAvg.slice(-2).reverse(),
  };
}
const matchups = (league.schedule || [])
  .filter((m: any) => m.matchupPeriodId === week && (!m.playoffTierType || m.playoffTierType === 'NONE') &&
    teamById.has(m.home?.teamId) && teamById.has(m.away?.teamId))
  .map((m: any) => {
    const home = side(teamById.get(m.home.teamId), m.home);
    const away = side(teamById.get(m.away.teamId), m.away);
    const pHome = winProbability({ expected: home.projected, variance: home.variance },
      { expected: away.projected, variance: away.variance });
    const leader = home.live >= away.live ? home : away;
    const favorite = pHome >= 0.5 ? home : away;
    const strip = ({ variance, _tonightRoster, ...rest }: typeof home) => (void variance, void _tonightRoster, rest);
    const fh = frozenTeam.get(home.teamId), fa = frozenTeam.get(away.teamId);
    const dm = (daily?.matchups || []).find((x: any) => x.homeTeamId === home.teamId && x.awayTeamId === away.teamId);
    // Underdog's night: points per player needed tonight if the favorite's players hit their averages.
    const dog = favorite === home ? away : home, fav = favorite === home ? home : away;
    const need = r1(fav.live + fav.tonightPoints - dog.live);
    return {
      home: { ...strip(home), winProb: Math.round(pHome * 1000) / 10, story: story(home) },
      away: { ...strip(away), winProb: Math.round((1 - pHome) * 1000) / 10, story: story(away) },
      // Home win % at the start of the week and after each finished day.
      homeWinPath: fh && fa ? [Math.round(startWinProb(fh, fa) * 1000) / 10,
        ...(dm?.homeWinProb || []).map((p: number | null) => (p == null ? null : Math.round(p * 1000) / 10))] : null,
      // Lead (home − away) at the end of each finished day, with each side's points and starter-games that day.
      leadPath: daily?.teams?.[home.teamId] && daily?.teams?.[away.teamId] ? (() => {
        let lead = 0;
        return daily.days.map((d: any, i: number) => {
          const h = daily.teams[home.teamId][i], a = daily.teams[away.teamId][i];
          lead += h.points - a.points;
          return { date: d.date, lead: r1(lead), home: { points: h.points, played: h.played }, away: { points: a.points, played: a.played } };
        });
      })() : null,
      underdogTonight: dog.playersLeftTonight || fav.playersLeftTonight ? {
        team: dog.name,
        players: dog.playersLeftTonight,
        expectedPoints: dog.tonightPoints,
        expectedPerPlayer: dog.playersLeftTonight ? r1(dog.tonightPoints / dog.playersLeftTonight) : 0,
        favoriteExpectedPoints: fav.tonightPoints,
        favoritePlayers: fav.playersLeftTonight,
        pointsNeeded: need,
        perPlayerNeeded: dog.playersLeftTonight ? r1(need / dog.playersLeftTonight) : null,
      } : null,
      gap: r1(Math.abs(home.live - away.live)),
      leader: home.live === away.live ? null : leader.name,
      projectedGap: r1(Math.abs(home.projected - away.projected)),
      projectedWinner: favorite.name,
      favoriteWinProb: Math.round(Math.max(pHome, 1 - pHome) * 1000) / 10,
    };
  })
  // Closest first: the matchup nearest a coin flip leads.
  .sort((a: any, b: any) => a.favoriteWinProb - b.favoriteWinProb);

const out = {
  season: CURRENT_SEASON,
  week,
  date: index.dateFor(today),
  scoringPeriodId: today,
  isLastDay,
  mode: asIfLastNight ? 'as-if-last-night (test)' : 'rest-of-week',
  moveLimitPerWeek: moveLimit,
  generatedAt: new Date().toISOString(),
  matchups,
};

const json = JSON.stringify(out, null, 2);
if (outFile) writeFileSync(outFile, json + '\n');
console.log(json);
