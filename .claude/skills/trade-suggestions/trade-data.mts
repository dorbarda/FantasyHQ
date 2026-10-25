/**
 * Weekly trade suggestions — the input Claude reads: every roster, record,
 * schedule and move count, from live ESPN. Spec: docs/TRADE-SUGGESTIONS-SPEC.md.
 * Run with: npx tsx .claude/skills/trade-suggestions/trade-data.mts [--week N] [--out file.json]
 *
 * --week N: the matchup week to advise for. Default: the week that contains
 * today (on the Monday run, the week that starts that day).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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
const outFile = args.includes('--out') ? args[args.indexOf('--out') + 1] : null;
const weekArg = args.includes('--week') ? Number(args[args.indexOf('--week') + 1]) : undefined;

// Import AFTER env is loaded — these modules read process.env at load time.
const { CURRENT_SEASON } = await import(resolve(ROOT, 'lib/season.ts'));
const { getScheduleSeason, buildDateIndex, nbaDate } = await import(resolve(ROOT, 'lib/espn-schedule.ts'));
const { buildTradeInput } = await import(resolve(ROOT, 'lib/trade-input.ts'));

const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${CURRENT_SEASON}` +
  `/segments/0/leagues/${LEAGUE_ID}?view=mTeam&view=mRoster&view=mMatchup&view=mSettings`;
const res = await fetch(url, { headers: { Cookie: `espn_s2=${ESPN_S2}; SWID=${SWID}`, Accept: 'application/json' } });
if (!res.ok) {
  console.error(`❌ ESPN API ${res.status} — cookies expired or LEAGUE_ID/SEASON wrong.`);
  process.exit(1);
}
const league = await res.json();
const season = await getScheduleSeason();

// Today by the NBA calendar (US Pacific), not ESPN's scoringPeriodId, which
// can lag a day around midnight. Monday 10:00 Israel is already Monday here.
const index = buildDateIndex(season.schedules);
const todayStr = nbaDate(Date.now());
const daysFromAnchor = index.anchor
  ? Math.round((Date.parse(todayStr) - Date.parse(index.anchor)) / 86_400_000) + 1
  : 0;
const today = Math.max(daysFromAnchor, league.scoringPeriodId ?? 0, 1);

const input = buildTradeInput(league, season.schedules, {
  season: CURRENT_SEASON,
  today,
  week: weekArg,
  generatedAt: new Date().toISOString(),
});

const json = JSON.stringify(input, null, 2);
if (outFile) {
  mkdirSync(dirname(resolve(outFile)), { recursive: true });
  writeFileSync(outFile, json);
  console.log(`✅ ${input.teams.length} teams, week ${input.week} → ${outFile}`);
} else {
  console.log(json);
}
