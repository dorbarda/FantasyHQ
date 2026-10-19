/**
 * Fantasy HQ — freeze next week's matchup projections
 * Run with: npx tsx scripts/freeze-week-projections.mts [--week N] [--force] [--results-only]
 *
 * Two passes:
 *   1. Results — every frozen week whose matchups ESPN has since decided gets
 *      its final scores written into `actual` (only empty ones; nothing else
 *      in the file changes). The daily snapshot Action runs this pass alone
 *      (--results-only), so a week is filled the morning after it ends.
 *   2. Freeze — the Sunday Action also freezes the coming week (below).
 *
 * Runs Sunday evening (week-projections Action), before Monday's new matchup
 * week. Writes data/projections/<season>/week-NN.json ONCE: an existing file
 * is never overwritten (without --force), because the point is to compare the
 * start-of-week picture with how the week ends. Spec: docs/MATCHUP-DETAIL-SPEC.md.
 *
 * Without --week it picks the next week that hasn't started yet.
 * Requires ESPN_S2, SWID, LEAGUE_ID (and SEASON) in the environment or .env.local.
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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
const { getScheduleSeason, weeksOf, buildDateIndex, nbaDate } = await import('../lib/espn-schedule');
const { buildWeekProjection, fillActuals } = await import('../lib/week-projections');

const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${CURRENT_SEASON}` +
  `/segments/0/leagues/${LEAGUE_ID}?view=mTeam&view=mRoster&view=mMatchup`;
const res = await fetch(url, { headers: { Cookie: `espn_s2=${ESPN_S2}; SWID=${SWID}`, Accept: 'application/json' } });
if (!res.ok) {
  console.error(`❌ ESPN API ${res.status} — cookies expired or LEAGUE_ID/SEASON wrong.`);
  process.exit(1);
}
const league = await res.json();

const outDir = resolve(ROOT, 'data', 'projections', String(CURRENT_SEASON));

// ── 1. Results ──────────────────────────────────────────────────────────────
for (const name of existsSync(outDir) ? readdirSync(outDir).filter(f => /^week-\d+\.json$/.test(f)).sort() : []) {
  const path = resolve(outDir, name);
  const frozen = JSON.parse(readFileSync(path, 'utf-8'));
  const filled = fillActuals(frozen, league);
  if (filled > 0) {
    writeFileSync(path, JSON.stringify(frozen, null, 2) + '\n');
    console.log(`🏁 Week ${frozen.week}: final scores filled for ${filled} matchup${filled === 1 ? '' : 's'}.`);
  }
}

const args = process.argv.slice(2);
if (args.includes('--results-only')) process.exit(0);

// ── 2. Freeze ───────────────────────────────────────────────────────────────
const force = args.includes('--force');
const weekArg = args.includes('--week') ? Number(args[args.indexOf('--week') + 1]) : null;

const season = await getScheduleSeason();
const weeks = weeksOf(season);
const index = buildDateIndex(season.schedules);
const today = nbaDate(Date.now());

/** The first week whose first day is after today — next Monday's matchup. */
const week = weekArg ?? Number(
  Object.keys(weeks).map(Number).sort((a, b) => a - b)
    .find(w => (index.dateFor(weeks[w][0]) ?? '') > today)
);
if (!week || !weeks[week]) {
  console.log(`⏳ No upcoming week to freeze (today ${today}).`);
  process.exit(0);
}

const file = resolve(outDir, `week-${String(week).padStart(2, '0')}.json`);
if (existsSync(file) && !force) {
  console.log(`➖ Week ${week} already frozen — ${file} left untouched.`);
  process.exit(0);
}

const scoringPeriods = weeks[week];
const days = scoringPeriods.map(sp => index.dateFor(sp)!);
const projection = buildWeekProjection(
  league, week, scoringPeriods, days, season.schedules, CURRENT_SEASON, new Date().toISOString(),
);
if (projection.matchups.length === 0) {
  console.error(`❌ ESPN returned no matchups for week ${week}.`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(file, JSON.stringify(projection, null, 2) + '\n');
console.log(`✅ Week ${week} (${days[0]} → ${days[days.length - 1]}) frozen: ${file}`);
for (const { home, away } of projection.matchups) {
  console.log(`   ${home.teamName}  ${home.games}g ${home.projectedPoints}  vs  ${away.projectedPoints} ${away.games}g  ${away.teamName}`);
}
