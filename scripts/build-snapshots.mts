/**
 * Fantasy HQ — nightly snapshot builder
 * Run with: npx tsx scripts/build-snapshots.mts
 *
 * Calls the heavy ESPN loaders from lib/ and writes their output to
 * data/snapshots/<name>.json as { generatedAt, data }. The espn-snapshot
 * GitHub Action runs this nightly and commits the results, so the
 * analytical pages read fresh snapshots instead of fanning out live ESPN
 * calls on every request.
 *
 * Requires ESPN_S2, SWID, LEAGUE_ID in the environment (or .env.local).
 * Exits non-zero if any snapshot fails, so the Action turns red and
 * notifies the owner — that's the expired-cookie alarm.
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(ROOT, 'data', 'snapshots');

// Load .env.local for local runs; CI provides real env vars.
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

if (!process.env.ESPN_S2 || !process.env.SWID || !process.env.LEAGUE_ID) {
  console.error('❌ Missing ESPN_S2, SWID, or LEAGUE_ID in the environment.');
  process.exit(1);
}

// Import AFTER env is loaded — lib/espn.ts reads process.env at module level.
const { getStatsData, getTransactions, getMatchupDepth, getPlayoffDepth, checkEspnAuth } =
  await import('../lib/espn');
const { getAllRecords } = await import('../lib/espn-records');
const { getScheduleSeason } = await import('../lib/espn-schedule');
const { buildHighlightsSnapshot } = await import('../lib/highlights-data');
const { getAllHistoricalSeasons } = await import('../lib/espn-history');

// Some loaders (records, history) swallow per-season fetch errors and return
// empty structures, so a dead cookie would silently overwrite good snapshots
// with empty ones. Each job validates its result looks non-empty before the
// write; an empty result never overwrites a good file.
//
// Whether an empty result FAILS the run depends on the auth probe below. An
// empty snapshot means one of two completely different things:
//   • ESPN rejected us      → the cookies died      → fail loudly, that's the alarm
//   • ESPN answered fine    → season hasn't started → warn, keep the old file
// Conflating them is what makes an alarm useless: between a rollover and
// opening night, every night would be red and you'd learn to ignore the mail.
/* eslint-disable @typescript-eslint/no-explicit-any */
// The fourth field marks a job optional: it still writes when it works, but a
// failure is logged and does NOT fail the run. Reserved for nice-to-have data
// from third parties — a red run must keep meaning "the ESPN cookies expired".
const jobs: Array<[string, () => Promise<unknown>, (d: any) => boolean, boolean?]> = [
  ['stats', getStatsData, d => d.seasonStats?.length > 0],
  ['records', getAllRecords, d => d.hallOfFame?.length > 0],
  ['history', getAllHistoricalSeasons, d => Array.isArray(d) && d.length > 0],
  ['transactions', getTransactions, d => d.byFantasyTeam?.length > 0],
  ['matchup-depth', getMatchupDepth, d => d.rows?.length > 0],
  ['playoff-depth', getPlayoffDepth, d => d.rows?.length > 0],
  // NBA schedule grid — season-static, so one nightly write keeps /schedule
  // working (and fast) all week even when the cookies expire.
  ['schedule', getScheduleSeason, d => d.schedules?.length > 0 && Object.keys(d.weeks ?? {}).length > 0],
  // Highlight clips for the recap — optional, and skipped entirely without a key.
  ['highlights', buildHighlightsSnapshot, d => Object.keys(d ?? {}).length > 0, true],
];

mkdirSync(OUT_DIR, { recursive: true });

// Say which season this run is for, loudly. Without it, a SEASON variable that
// never reached the Action looks identical to one that did — the only hint is
// which numbers show up in the data, which nobody reads.
const { CURRENT_SEASON, CURRENT_SEASON_LABEL } = await import('../lib/season');
console.log(
  `📅 Season ${CURRENT_SEASON} (${CURRENT_SEASON_LABEL})` +
  (process.env.SEASON ? '' : '  ← SEASON not set, using the built-in default')
);

// Auth probe first — this is what gives an empty result its meaning. It exits
// on failure, so everything past this point knows the cookies are good.
try {
  await checkEspnAuth();
  console.log('🔑 ESPN cookies OK\n');
} catch (err) {
  console.error(`❌ ESPN rejected the request: ${err instanceof Error ? err.message : err}`);
  console.error('The espn_s2/SWID cookies have expired, or LEAGUE_ID/SEASON is wrong.');
  console.error('Refresh them and re-run — no snapshots were touched.');
  process.exit(1);
}

const failures: string[] = [];
const pending: string[] = [];

for (const [name, load, looksValid, optional] of jobs) {
  const started = Date.now();
  try {
    const data = await load();
    if (!looksValid(data)) {
      // Cookies are alive (probe above), so this is a season with no data yet.
      // Keep the existing file and carry on — this is not a failure.
      pending.push(name);
      console.warn(`⏳ ${name}: no data for this season yet — existing snapshot left untouched`);
      continue;
    }
    const payload = { generatedAt: new Date().toISOString(), data };
    writeFileSync(resolve(OUT_DIR, `${name}.json`), JSON.stringify(payload) + '\n');
    console.log(`✅ ${name} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (optional) {
      console.warn(`⚠️  ${name} skipped (optional): ${message}`);
      continue;
    }
    failures.push(name);
    console.error(`❌ ${name}: ${message}`);
  }
}

if (pending.length > 0) {
  console.log(`\n⏳ Waiting on season data: ${pending.join(', ')} — normal before opening night.`);
}

if (failures.length > 0) {
  console.error(`\n❌ ${failures.length}/${jobs.filter(j => !j[3]).length} required snapshots failed: ${failures.join(', ')}`);
  console.error('The cookies were valid, so these are real errors, not a rollover — read the messages above.');
  process.exit(1);
}
console.log(`\n🏀 All required snapshots written to data/snapshots/`);
