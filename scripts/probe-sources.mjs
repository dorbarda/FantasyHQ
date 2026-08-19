/**
 * Fantasy HQ — data source probe
 * Run with: node scripts/probe-sources.mjs
 *
 * Checks every endpoint proposed in docs/DATA-SOURCES.md and reports whether
 * it actually answers, how big the response is, and a one-line shape summary.
 *
 * Why this exists: the research pass that wrote docs/DATA-SOURCES.md ran
 * behind an egress proxy that blocked every sports host, so the endpoints
 * there are documented from source but were never called. Run this from a
 * machine with normal internet to confirm them before building on any of it.
 *
 * ESPN_S2, SWID and LEAGUE_ID (from .env.local or the environment) unlock the
 * private league probes; without them those are skipped and the public ones
 * still run.
 *
 * Exits 0 always — this is a report, not a gate.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Same .env.local loader the snapshot script uses.
try {
  for (const line of readFileSync(resolve(ROOT, '.env.local'), 'utf-8').split('\n')) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length && !process.env[key.trim()]) {
      process.env[key.trim()] = rest.join('=').trim();
    }
  }
} catch {
  /* no .env.local — public probes still run */
}

const { ESPN_S2, SWID, LEAGUE_ID } = process.env;
const SEASON = process.env.SEASON || '2026';
const HAS_CREDS = !!(ESPN_S2 && SWID && LEAGUE_ID);

const LEAGUE_BASE = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${SEASON}/segments/0/leagues/${LEAGUE_ID}`;
const SEASON_BASE = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${SEASON}`;
const ESPN_SITE = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const NBA_HEADERS = {
  'User-Agent': UA,
  Referer: 'https://www.nba.com/',
  Origin: 'https://www.nba.com',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
};

/** Describe the useful shape of a response without dumping the whole thing. */
function summarize(json) {
  if (json == null) return 'null';
  if (Array.isArray(json)) return `array[${json.length}]`;
  const keys = Object.keys(json);
  const parts = keys.slice(0, 6).map(k => {
    const v = json[k];
    if (Array.isArray(v)) return `${k}[${v.length}]`;
    if (v && typeof v === 'object') return `${k}{}`;
    return k;
  });
  return parts.join(' ') + (keys.length > 6 ? ` …+${keys.length - 6}` : '');
}

const results = [];

async function probe(label, url, { headers = {}, note = '' } = {}) {
  const started = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json', ...headers },
      signal: controller.signal,
    });
    clearTimeout(timer);

    const body = await res.text();
    const ms = Date.now() - started;
    const kb = (body.length / 1024).toFixed(1);

    if (!res.ok) {
      results.push({ label, ok: false, detail: `HTTP ${res.status} (${ms}ms)`, note });
      return null;
    }

    let json = null;
    try {
      json = JSON.parse(body);
    } catch {
      results.push({ label, ok: false, detail: `HTTP 200 but not JSON (${kb}KB)`, note });
      return null;
    }

    results.push({ label, ok: true, detail: `HTTP 200 ${kb}KB ${ms}ms — ${summarize(json)}`, note });
    return json;
  } catch (err) {
    const kind = err.name === 'AbortError' ? 'timeout after 20s' : err.message;
    results.push({ label, ok: false, detail: kind, note });
    return null;
  }
}

// ─── §1 ESPN fantasy (private league — needs cookies) ────────────────────────

async function probeFantasy() {
  if (!HAS_CREDS) {
    console.log('⏭  Skipping private-league probes — set ESPN_S2, SWID, LEAGUE_ID to include them.\n');
    return;
  }
  const cookie = { Cookie: `espn_s2=${ESPN_S2}; SWID=${SWID}` };

  // §1.1 — the priority-1 source: NBA schedule by pro team (SEASON level, not league)
  const sched = await probe(
    '§1.1 proTeamSchedules_wl (games per week)',
    `${SEASON_BASE}?view=proTeamSchedules_wl`,
    { headers: cookie, note: 'season-level URL — no /segments/0/leagues suffix' }
  );
  // lib/espn-schedule.ts parses exactly these fields — verify each one is really there.
  if (sched?.settings?.proTeams) {
    const teams = sched.settings.proTeams.filter(t => t.id !== 0);
    const withGames = teams.filter(t => t.proGamesByScoringPeriod);
    console.log(
      `   ↳ ${teams.length} pro teams, ${withGames.length} carry proGamesByScoringPeriod ` +
      `— games-per-week is computable: ${withGames.length > 0 ? 'YES' : 'NO'}`
    );

    const sampleTeam = withGames[0];
    const samplePeriod = sampleTeam && Object.keys(sampleTeam.proGamesByScoringPeriod)[0];
    const sampleGame = samplePeriod && sampleTeam.proGamesByScoringPeriod[samplePeriod]?.[0];
    if (sampleGame) {
      const need = ['homeProTeamId', 'awayProTeamId', 'date'];
      const missing = need.filter(k => sampleGame[k] === undefined);
      console.log(`   ↳ game keys: ${Object.keys(sampleGame).join(', ')}`);
      console.log(
        missing.length === 0
          ? '   ↳ parser fields all present — lib/espn-schedule.ts should parse this as-is'
          : `   ↳ ⚠ MISSING ${missing.join(', ')} — update parseProTeamSchedules() in lib/espn-schedule.ts`
      );
    } else {
      console.log('   ↳ ⚠ no sample game found — inspect the response before trusting /schedule');
    }
  } else if (sched) {
    console.log('   ↳ ⚠ no settings.proTeams in the response — the /schedule parser expects it');
  }

  // The week → days map the schedule grid slices on (works for future weeks)
  const settings = await probe(
    '§1.1 mSettings scheduleSettings.matchupPeriods',
    `${LEAGUE_BASE}?view=mSettings`,
    { headers: cookie, note: '/schedule maps fantasy weeks to days with this' }
  );
  const matchupPeriods = settings?.settings?.scheduleSettings?.matchupPeriods;
  if (matchupPeriods) {
    const weeks = Object.keys(matchupPeriods);
    console.log(
      `   ↳ ${weeks.length} weeks mapped, e.g. week ${weeks[0]} → days ` +
      `[${(matchupPeriods[weeks[0]] || []).join(', ')}]`
    );
  } else if (settings) {
    console.log('   ↳ ⚠ no scheduleSettings.matchupPeriods — /schedule cannot map weeks to days');
  }

  // §1.2 / §1.3 / §1.5 — splits, injury status, ownership all ride one call
  const players = await probe(
    '§1.2 kona_player_info (splits + injury + ownership)',
    `${LEAGUE_BASE}?view=kona_player_info`,
    {
      headers: {
        ...cookie,
        'x-fantasy-filter': JSON.stringify({
          players: {
            limit: 50,
            filterStatus: { value: ['FREEAGENT', 'WAIVERS'] },
            sortPercOwned: { sortPriority: 2, sortAsc: false },
          },
        }),
      },
    }
  );
  const sample = players?.players?.[0]?.player;
  if (sample) {
    const splitIds = [...new Set((sample.stats || []).map(s => String(s.id).slice(0, 2)))].sort();
    console.log(
      `   ↳ sample "${sample.fullName}": stat-split prefixes [${splitIds.join(', ')}] ` +
      `(00=season 10=proj 01=L7 02=L15 03=L30)`
    );
    console.log(
      `   ↳ injuryStatus=${sample.injuryStatus ?? 'ABSENT'} injured=${sample.injured ?? 'ABSENT'} ` +
      `percentOwned=${sample.ownership?.percentOwned ?? 'ABSENT'} ` +
      `percentChange=${sample.ownership?.percentChange ?? 'ABSENT'}`
    );
  }

  // §1.6 — per-week adds, the Hot Pickup unblock
  await probe(
    '§1.6 kona_league_communication (per-week adds)',
    `${LEAGUE_BASE}/communication/?view=kona_league_communication`,
    {
      headers: {
        ...cookie,
        'x-fantasy-filter': JSON.stringify({
          topics: {
            filterType: { value: ['ACTIVITY_TRANSACTIONS'] },
            limit: 25,
            sortMessageDate: { sortPriority: 1, sortAsc: false },
            filterIncludeMessageTypeIds: { value: [178, 180, 179, 239, 181, 244, 188] },
          },
        }),
      },
      note: 'if this 404s, fall back to extending mTransactions2 per RECAP-SPEC §4',
    }
  );

  // §1.4 — player news (no cookies needed, but needs a real player id)
  const playerId = sample?.id;
  if (playerId) {
    await probe(
      '§1.4 fantasy player news',
      `https://site.api.espn.com/apis/fantasy/v3/games/fba/news/players?playerId=${playerId}`
    );
  }

  // §1.7 — cheap season-state call
  await probe('§1.7 mStatus', `${LEAGUE_BASE}?view=mStatus`, { headers: cookie });
}

// ─── §2 ESPN public (no auth) ────────────────────────────────────────────────

async function probePublicEspn() {
  const inj = await probe('§2 ESPN league-wide injuries', `${ESPN_SITE}/injuries`);
  if (inj) {
    const count = (inj.injuries || []).reduce((n, t) => n + (t.injuries?.length || 0), 0);
    console.log(`   ↳ ${inj.injuries?.length ?? 0} teams, ${count} injury entries`);
  }
  await probe('§2 ESPN team schedule (BOS)', `${ESPN_SITE}/teams/2/schedule`);
  await probe('§2 ESPN news', `${ESPN_SITE}/news`);
  await probe('§2 ESPN teams (logos/colours)', `${ESPN_SITE}/teams`);
  await probe('§2 ESPN scoreboard', `${ESPN_SITE}/scoreboard`);
}

// ─── §3 NBA official (cloud-IP block suspected) ──────────────────────────────

async function probeNba() {
  const sched = await probe(
    '§3.1 cdn.nba.com full season schedule',
    'https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_1.json',
    { headers: NBA_HEADERS }
  );
  if (sched?.leagueSchedule?.gameDates) {
    const dates = sched.leagueSchedule.gameDates;
    const games = dates.reduce((n, d) => n + (d.games?.length || 0), 0);
    console.log(`   ↳ ${dates.length} game dates, ${games} games`);
  }

  await probe(
    '§3.1 cdn.nba.com today scoreboard (in use)',
    'https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json',
    { headers: NBA_HEADERS }
  );

  // §3.2 — the one most likely to be blocked from a cloud host
  await probe(
    '§3.2 stats.nba.com leagueleaders',
    'https://stats.nba.com/stats/leagueleaders?LeagueID=00&PerMode=PerGame' +
      '&Scope=S&Season=2025-26&SeasonType=Regular+Season&StatCategory=PTS',
    {
      headers: { ...NBA_HEADERS, 'x-nba-stats-origin': 'stats', 'x-nba-stats-token': 'true' },
      note: 'NBA blocks cloud IPs — a hang/timeout here from a server is expected, from a laptop is not',
    }
  );
}

// ─── report ──────────────────────────────────────────────────────────────────

console.log(`\nFantasy HQ data source probe — season ${SEASON}`);
console.log(`Private league probes: ${HAS_CREDS ? 'enabled' : 'SKIPPED (no credentials)'}\n`);

await probeFantasy();
await probePublicEspn();
await probeNba();

console.log('\n─── summary ───');
for (const r of results) {
  console.log(`${r.ok ? '✅' : '❌'} ${r.label}\n     ${r.detail}${r.note ? `\n     note: ${r.note}` : ''}`);
}

const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} endpoints answered.`);
if (failed) {
  console.log('Failures above are the ones to re-check before building on them in docs/DATA-SOURCES.md.');
}
