/**
 * Fantasy HQ — day-by-day matchup record
 * Run with: npx tsx scripts/update-week-daily.mts
 *
 * Writes data/projections/<season>/week-NN-daily.json for the week of the
 * most recent finished day (yesterday, UTC — same rule as the home recap):
 *   • each team's starters played + points, every finished day
 *   • the home team's win probability after each finished day
 *
 * Runs every morning in the espn-snapshot Action (05:47 and 10:47 Israel).
 * Daily lines are rebuilt each run. The win probability of earlier days is
 * kept as saved; only the latest finished day (and any missing day) is
 * recomputed, because it uses today's rosters for the days still to come —
 * the 10:47 run corrects a late game the 05:47 run caught mid-way.
 * Spec: docs/MATCHUP-DETAIL-SPEC.md §5–6.
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/* eslint-disable @typescript-eslint/no-explicit-any */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

try {
  for (const line of readFileSync(resolve(ROOT, '.env.local'), 'utf-8').split('\n')) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length && !process.env[key.trim()]) {
      process.env[key.trim()] = rest.join('=').trim();
    }
  }
} catch {
  /* no .env.local — fine in CI */
}

const { ESPN_S2, SWID, LEAGUE_ID } = process.env;
if (!ESPN_S2 || !SWID || !LEAGUE_ID) {
  console.error('❌ Missing ESPN_S2, SWID, or LEAGUE_ID in the environment.');
  process.exit(1);
}

// Import AFTER env is loaded — these modules read process.env at load time.
const { CURRENT_SEASON } = await import('../lib/season');
const { getScheduleSeason, weeksOf, buildDateIndex } = await import('../lib/espn-schedule');
const { getNightLineups } = await import('../lib/espn');
const { winProbAfter } = await import('../lib/week-daily');
type WeekDaily = import('../lib/week-daily').WeekDaily;

const season = await getScheduleSeason();
const weeks = weeksOf(season);
const index = buildDateIndex(season.schedules);
const today = new Date().toISOString().slice(0, 10);

// The week holding the latest finished day.
let week = 0;
for (const w of Object.keys(weeks).map(Number).sort((a, b) => a - b)) {
  const first = index.dateFor(weeks[w][0]);
  if (first && first < today) week = w;
}
if (!week) {
  console.log(`⏳ No finished day yet this season (today ${today}).`);
  process.exit(0);
}
const weekDays = weeks[week];
const finished = weekDays
  .map(sp => ({ date: index.dateFor(sp)!, scoringPeriodId: sp }))
  .filter(d => d.date < today);

const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${CURRENT_SEASON}` +
  `/segments/0/leagues/${LEAGUE_ID}?view=mTeam&view=mRoster&view=mMatchup`;
const res = await fetch(url, { headers: { Cookie: `espn_s2=${ESPN_S2}; SWID=${SWID}`, Accept: 'application/json' } });
if (!res.ok) {
  console.error(`❌ ESPN API ${res.status} — cookies expired or LEAGUE_ID/SEASON wrong.`);
  process.exit(1);
}
const league = await res.json();
const teamById = new Map<number, any>((league.teams || []).map((t: any) => [t.id, t]));

// Daily lines, rebuilt every run.
const teams: WeekDaily['teams'] = {};
for (const [i, day] of finished.entries()) {
  for (const t of await getNightLineups(day.scoringPeriodId)) {
    const played = t.starters.filter(p => p.played);
    (teams[String(t.teamId)] ??= Array.from({ length: finished.length }, () => ({ played: 0, points: 0 })))[i] = {
      played: played.length,
      points: Math.round(played.reduce((s, p) => s + p.fantasyPoints, 0) * 10) / 10,
    };
  }
}

const outDir = resolve(ROOT, 'data', 'projections', String(CURRENT_SEASON));
const file = resolve(outDir, `week-${String(week).padStart(2, '0')}-daily.json`);
let previous: WeekDaily | null = null;
try { previous = JSON.parse(readFileSync(file, 'utf-8')); } catch { /* first day of the week */ }

const pairs = (league.schedule || []).filter((m: any) =>
  m.matchupPeriodId === week && (!m.playoffTierType || m.playoffTierType === 'NONE') &&
  teamById.has(m.home?.teamId) && teamById.has(m.away?.teamId));

const matchups: WeekDaily['matchups'] = pairs.map((m: any) => {
  const old = previous?.matchups.find(p => p.homeTeamId === m.home.teamId && p.awayTeamId === m.away.teamId);
  const homeWinProb = finished.map((_, i) => {
    const isLatest = i === finished.length - 1;
    const kept = old?.homeWinProb[i];
    if (!isLatest && kept != null) return kept;
    const remaining = weekDays.filter(sp => sp > finished[i].scoringPeriodId);
    return winProbAfter(teamById.get(m.home.teamId), teamById.get(m.away.teamId), teams, i + 1,
      remaining, season.schedules, CURRENT_SEASON, week);
  });
  return { homeTeamId: m.home.teamId, awayTeamId: m.away.teamId, homeWinProb };
});

const out: WeekDaily = { season: CURRENT_SEASON, week, updatedAt: new Date().toISOString(), days: finished, teams, matchups };
const unchanged = previous && JSON.stringify({ ...previous, updatedAt: '' }) === JSON.stringify({ ...out, updatedAt: '' });
if (unchanged) {
  console.log(`➖ Week ${week} daily: unchanged.`);
  process.exit(0);
}
mkdirSync(outDir, { recursive: true });
writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
console.log(`✅ Week ${week}: ${finished.length} finished day${finished.length === 1 ? '' : 's'} → ${file}`);
for (const m of matchups) {
  const name = (id: number) => (teamById.get(id)?.name ?? `Team ${id}`).trim();
  console.log(`   ${name(m.homeTeamId)} ${Math.round((m.homeWinProb.at(-1) ?? 0) * 100)}%  vs  ${name(m.awayTeamId)}`);
}
