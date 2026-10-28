/**
 * Fantasy HQ — day-by-day matchup record
 * Run with: npx tsx scripts/update-week-daily.mts
 *
 * Writes data/projections/<season>/week-NN-daily.json for the week of the
 * most recent finished day (yesterday, UTC — same rule as the home recap),
 * and for the week of today when a new week has begun:
 *   • each team's starters played + points, every finished day
 *   • the home team's win probability after each finished day (big dot)
 *   • every change of 1 point or more in between (small dot) — roster moves
 *     during the day, with who made them
 *
 * Runs on every espn-snapshot Action run (scheduled + hourly from outside).
 * Daily lines are rebuilt each run. While a game is on, no win % is saved:
 * a day's big dot is computed once, on the first run after its games are all
 * over, and kept from then on.
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
const { winProbAfter, startWinProb, gamesInProgress, rosterIds, countMoves, CHANGE_THRESHOLD } = await import('../lib/week-daily');
const { readWeekProjection } = await import('../lib/projections-data');
type WeekDaily = import('../lib/week-daily').WeekDaily;

const season = await getScheduleSeason();
const weeks = weeksOf(season);
const index = buildDateIndex(season.schedules);
const now = new Date();
const today = now.toISOString().slice(0, 10);
const weekNums = Object.keys(weeks).map(Number).sort((a, b) => a - b);
const finishedOf = (w: number) => weeks[w]
  .map(sp => ({ date: index.dateFor(sp)!, scoringPeriodId: sp }))
  .filter(d => d.date < today);

// The week holding the latest finished day, then today's week if a new one began.
let lastWeek = 0;
for (const w of weekNums) {
  const first = index.dateFor(weeks[w][0]);
  if (first && first < today) lastWeek = w;
}
const todayWeek = weekNums.find(w => weeks[w].some(sp => index.dateFor(sp) === today)) ?? 0;
const todo = [lastWeek, todayWeek].filter((w, i, a) => w && a.indexOf(w) === i);
if (todo.length === 0) {
  console.log(`⏳ No finished day yet this season (today ${today}).`);
  process.exit(0);
}

const allFinished = new Set(weekNums.flatMap(w => finishedOf(w).map(d => d.scoringPeriodId)));
const live = gamesInProgress(season.schedules, allFinished, now.getTime());
if (live) console.log('🏀 Games on — daily lines only, no new win % dots.');

const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${CURRENT_SEASON}` +
  `/segments/0/leagues/${LEAGUE_ID}?view=mTeam&view=mRoster&view=mMatchup`;
const res = await fetch(url, { headers: { Cookie: `espn_s2=${ESPN_S2}; SWID=${SWID}`, Accept: 'application/json' } });
if (!res.ok) {
  console.error(`❌ ESPN API ${res.status} — cookies expired or LEAGUE_ID/SEASON wrong.`);
  process.exit(1);
}
const league = await res.json();
const teamById = new Map<number, any>((league.teams || []).map((t: any) => [t.id, t]));
const rostersNow: Record<string, string[]> = {};
for (const [id, t] of teamById) rostersNow[String(id)] = rosterIds(t);

const outDir = resolve(ROOT, 'data', 'projections', String(CURRENT_SEASON));
const fileOf = (w: number) => resolve(outDir, `week-${String(w).padStart(2, '0')}-daily.json`);
const readDaily = (w: number): WeekDaily | null => {
  try { return JSON.parse(readFileSync(fileOf(w), 'utf-8')); } catch { return null; }
};
// Rosters at the last dot of the week before — so moves made before a new
// week's first run still count on its first dot.
const seedRosters = readDaily(lastWeek)?.rosters;

for (const week of todo) {
  const weekDays = weeks[week];
  const finished = finishedOf(week);

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

  const previous = readDaily(week);
  const baseline = previous?.rosters ?? (week !== lastWeek ? seedRosters : undefined) ?? {};
  const rosters: Record<string, string[]> = { ...baseline };
  const frozen = readWeekProjection(week, CURRENT_SEASON);

  const pairs = (league.schedule || []).filter((m: any) =>
    m.matchupPeriodId === week && (!m.playoffTierType || m.playoffTierType === 'NONE') &&
    teamById.has(m.home?.teamId) && teamById.has(m.away?.teamId));

  const matchups: WeekDaily['matchups'] = pairs.map((m: any) => {
    const h = m.home.teamId as number;
    const a = m.away.teamId as number;
    const old = previous?.matchups.find(p => p.homeTeamId === h && p.awayTeamId === a);
    const prob = (dayCount: number) => winProbAfter(teamById.get(h), teamById.get(a), teams, dayCount,
      weekDays.filter(sp => dayCount === 0 || sp > finished[dayCount - 1].scoringPeriodId),
      season.schedules, CURRENT_SEASON, week);
    // Moves since this matchup's last dot; a new dot resets the count.
    let moved = false;
    const movesNow = () => {
      const out: Record<string, number> = {};
      for (const id of [h, a]) {
        const n = countMoves(baseline[String(id)], rostersNow[String(id)]);
        if (n) out[String(id)] = n;
      }
      return Object.keys(out).length ? out : null;
    };

    const homeWinProb: (number | null)[] = [];
    const dayMoves: (Record<string, number> | null)[] = [];
    finished.forEach((_, i) => {
      const kept = old?.homeWinProb[i];
      if (kept != null) {
        homeWinProb.push(kept);
        dayMoves.push(old?.dayMoves?.[i] ?? null);
      } else if (live) {
        homeWinProb.push(null);
        dayMoves.push(null);
      } else {
        homeWinProb.push(prob(i + 1));
        dayMoves.push(movesNow());
        moved = true;
      }
    });

    // A change between dots: only from a run with no game on and days still to come.
    const changes = [...(old?.changes ?? [])];
    const day = finished.length;
    if (!live && finished.length < weekDays.length) {
      const startP = frozen?.matchups.find(x => x.home.teamId === h && x.away.teamId === a);
      const lastDot = changes.filter(c => c.day === day).at(-1)?.homeWinProb
        ?? (day > 0 ? homeWinProb[day - 1] : startP ? startWinProb(startP.home, startP.away) : null);
      const p = prob(day);
      if (lastDot != null && Math.abs(p - lastDot) >= CHANGE_THRESHOLD) {
        const moves = movesNow();
        changes.push({ at: now.toISOString(), day, homeWinProb: p, ...(moves ? { moves } : {}) });
        moved = true;
      }
    }

    if (moved || !baseline[String(h)]) {
      rosters[String(h)] = rostersNow[String(h)];
      rosters[String(a)] = rostersNow[String(a)];
    }
    return {
      homeTeamId: h, awayTeamId: a, homeWinProb,
      ...(dayMoves.some(Boolean) ? { dayMoves } : {}),
      ...(changes.length ? { changes } : {}),
    };
  });

  const out: WeekDaily = {
    season: CURRENT_SEASON, week, updatedAt: now.toISOString(), days: finished, teams, matchups, rosters,
  };
  const unchanged = previous && JSON.stringify({ ...previous, updatedAt: '' }) === JSON.stringify({ ...out, updatedAt: '' });
  if (unchanged) {
    console.log(`➖ Week ${week} daily: unchanged.`);
    continue;
  }
  mkdirSync(outDir, { recursive: true });
  writeFileSync(fileOf(week), JSON.stringify(out, null, 2) + '\n');
  console.log(`✅ Week ${week}: ${finished.length} finished day${finished.length === 1 ? '' : 's'} → ${fileOf(week)}`);
  for (const m of matchups) {
    const name = (id: number) => (teamById.get(id)?.name ?? `Team ${id}`).trim();
    const p = m.changes?.filter(c => c.day === finished.length).at(-1)?.homeWinProb ?? m.homeWinProb.at(-1);
    console.log(`   ${name(m.homeTeamId)} ${p == null ? '–' : `${Math.round(p * 100)}%`}  vs  ${name(m.awayTeamId)}`);
  }
}
