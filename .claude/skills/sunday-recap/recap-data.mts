/**
 * Sunday recap — live numbers for every matchup of the current week.
 * Run with: npx tsx .claude/skills/sunday-recap/recap-data.mts [--as-if-last-night] [--out file.json]
 *
 * Uses the site's own logic (lib/week-projections + lib/win-probability), so
 * projected scores and win % match the matchups page.
 *
 *   • live score + gap (ESPN totalPointsLive)
 *   • starters left tonight + key players tonight (games not started yet)
 *   • moves used this week vs. the weekly limit (ESPN settings)
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

const moveLimit: number = league.settings?.acquisitionSettings?.matchupAcquisitionLimit ?? -1;
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
    // Not shown until the weekly limit is confirmed: ESPN says 1, yet some teams used 2 in week 1.
    movesLeft: null as number | null,
    projected: r1(live + rest.projectedPoints),
    variance: remainingVariance(rest.roster),
  };
}

const teamById = new Map<number, any>((league.teams || []).map((t: any) => [t.id, t]));
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
    const strip = ({ variance: _v, ...rest }: typeof home) => rest;
    return {
      home: { ...strip(home), winProb: Math.round(pHome * 1000) / 10 },
      away: { ...strip(away), winProb: Math.round((1 - pHome) * 1000) / 10 },
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
