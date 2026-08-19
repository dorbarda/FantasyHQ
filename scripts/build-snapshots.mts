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
const { getStatsData, getTransactions, getMatchupDepth, getPlayoffDepth } =
  await import('../lib/espn');
const { getAllRecords } = await import('../lib/espn-records');
const { getScheduleSeason } = await import('../lib/espn-schedule');
const { getAllHistoricalSeasons } = await import('../lib/espn-history');

// Some loaders (records, history) swallow per-season fetch errors and return
// empty structures, so a dead cookie would silently overwrite good snapshots
// with empty ones. Each job validates its result looks non-empty before the
// write; an empty result counts as a failure and leaves the old file alone.
/* eslint-disable @typescript-eslint/no-explicit-any */
const jobs: Array<[string, () => Promise<unknown>, (d: any) => boolean]> = [
  ['stats', getStatsData, d => d.seasonStats?.length > 0],
  ['records', getAllRecords, d => d.hallOfFame?.length > 0],
  ['history', getAllHistoricalSeasons, d => Array.isArray(d) && d.length > 0],
  ['transactions', getTransactions, d => d.byFantasyTeam?.length > 0],
  ['matchup-depth', getMatchupDepth, d => d.rows?.length > 0],
  ['playoff-depth', getPlayoffDepth, d => d.rows?.length > 0],
  // NBA schedule grid — season-static, so one nightly write keeps /schedule
  // working (and fast) all week even when the cookies expire.
  ['schedule', getScheduleSeason, d => d.schedules?.length > 0 && Object.keys(d.weeks ?? {}).length > 0],
];

mkdirSync(OUT_DIR, { recursive: true });

const failures: string[] = [];

for (const [name, load, looksValid] of jobs) {
  const started = Date.now();
  try {
    const data = await load();
    if (!looksValid(data)) {
      throw new Error('result is empty — snapshot not written (expired cookies, or no data for this season yet)');
    }
    const payload = { generatedAt: new Date().toISOString(), data };
    writeFileSync(resolve(OUT_DIR, `${name}.json`), JSON.stringify(payload) + '\n');
    console.log(`✅ ${name} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  } catch (err) {
    failures.push(name);
    console.error(`❌ ${name}: ${err instanceof Error ? err.message : err}`);
  }
}

if (failures.length > 0) {
  console.error(`\n❌ ${failures.length}/${jobs.length} snapshots failed: ${failures.join(', ')}`);
  console.error('If errors are ESPN 401s, the espn_s2/SWID cookies have expired — refresh them.');
  process.exit(1);
}
console.log(`\n🏀 All ${jobs.length} snapshots written to data/snapshots/`);
