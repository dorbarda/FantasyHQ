/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  RecordsData, Superlative, H2HRecord, OwnerCareer,
} from './types';

import { ALL_SEASONS, CURRENT_SEASON, seasonLabel } from './season';

const ESPN_S2   = process.env.ESPN_S2;
const SWID      = process.env.SWID;
const LEAGUE_ID = process.env.LEAGUE_ID;

// Automated/placeholder teams that should be excluded from H2H records.
// Matched case-insensitively against team name OR owner name.
function isGhostTeam(name: string): boolean {
  return /fake/i.test(name);
}

// All years to pull — historical + current season
const ALL_YEARS = ALL_SEASONS;

async function espnFetch(year: number, params: string, noCache = false): Promise<any> {
  const base = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${year}/segments/0/leagues/${LEAGUE_ID}`;
  const cacheOpt: RequestInit = noCache
    ? { cache: 'no-store' }
    : { next: { revalidate: year < CURRENT_SEASON ? 86400 : 1800 } } as RequestInit;
  const res = await fetch(`${base}${params}`, {
    headers: { Cookie: `espn_s2=${ESPN_S2}; SWID=${SWID}`, Accept: 'application/json' },
    ...cacheOpt,
  });
  if (!res.ok) throw new Error(`ESPN ${res.status} · year=${year}`);
  return res.json();
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface SeasonMatchup {
  year: number;
  seasonLabel: string;
  week: number;
  isPlayoff: boolean;
  home: { teamName: string; ownerName: string; score: number };
  away: { teamName: string; ownerName: string; score: number };
  margin: number;
  winner: 'home' | 'away';
}

interface SeasonSummary {
  year: number;
  seasonLabel: string;
  championOwner: string | null;
  teams: Array<{ ownerName: string; teamName: string; wins: number; losses: number; pf: number }>;
}

// ─── Fetch one season ─────────────────────────────────────────────────────────

async function fetchSeason(year: number): Promise<{ matchups: SeasonMatchup[]; summary: SeasonSummary }> {
  const [teamsData, scheduleData] = await Promise.all([
    espnFetch(year, '?view=mTeam&view=mStandings'),
    espnFetch(year, '?view=mMatchup&view=mMatchupScore', true),
  ]);

  // Member → name
  const memberMap: Record<string, string> = {};
  for (const m of teamsData.members || []) {
    memberMap[m.id] = `${m.firstName} ${m.lastName}`.trim();
  }

  // Team ID → { name, owner }
  const teamMap: Record<number, { teamName: string; ownerName: string }> = {};
  for (const t of teamsData.teams || []) {
    const ownerName = (t.owners || []).map((id: string) => memberMap[id] || 'Unknown').join(' & ');
    teamMap[t.id] = { teamName: t.name || `Team ${t.id}`, ownerName };
  }

  const label = seasonLabel(year);

  // Season summary (per-team records)
  const teams = (teamsData.teams || []).map((t: any) => {
    const rec = t.record?.overall || {};
    return {
      ownerName: teamMap[t.id]?.ownerName ?? 'Unknown',
      teamName:  teamMap[t.id]?.teamName  ?? `Team ${t.id}`,
      wins:      rec.wins    || 0,
      losses:    rec.losses  || 0,
      pf:        Math.round((rec.pointsFor || 0) * 10) / 10,
    };
  });

  // Champion: winner of last WINNERS_BRACKET game
  const schedule: any[] = scheduleData.schedule || [];
  const playoffGames = schedule.filter(
    (m: any) => m.playoffTierType === 'WINNERS_BRACKET' || m.playoffTierType === 'CHAMPIONSHIP'
  );
  let championOwner: string | null = null;
  if (playoffGames.length > 0) {
    const final = playoffGames.reduce((latest: any, m: any) =>
      m.matchupPeriodId > latest.matchupPeriodId ? m : latest
    );
    const homeScore = final.home?.totalPoints || 0;
    const awayScore = final.away?.totalPoints || 0;
    if (homeScore > 0 || awayScore > 0) {
      const winnerId: number = homeScore >= awayScore ? final.home?.teamId : final.away?.teamId;
      championOwner = teamMap[winnerId]?.ownerName ?? null;
    }
  }

  // Matchups
  const matchups: SeasonMatchup[] = [];
  for (const m of schedule) {
    const home = m.home || {};
    const away = m.away || {};
    const homeScore = Math.round((home.totalPoints || 0) * 100) / 100;
    const awayScore = Math.round((away.totalPoints || 0) * 100) / 100;

    // Skip unplayed matchups
    if (homeScore === 0 && awayScore === 0) continue;
    // Skip byes
    if (!home.teamId || !away.teamId) continue;

    const homeInfo = teamMap[home.teamId];
    const awayInfo = teamMap[away.teamId];
    if (!homeInfo || !awayInfo) continue;

    const isPlayoff = m.playoffTierType != null && m.playoffTierType !== 'NONE';
    const margin = Math.round(Math.abs(homeScore - awayScore) * 100) / 100;

    matchups.push({
      year,
      seasonLabel: label,
      week: m.matchupPeriodId || 0,
      isPlayoff,
      home: { teamName: homeInfo.teamName, ownerName: homeInfo.ownerName, score: homeScore },
      away: { teamName: awayInfo.teamName, ownerName: awayInfo.ownerName, score: awayScore },
      margin,
      winner: homeScore >= awayScore ? 'home' : 'away',
    });
  }

  return { matchups, summary: { year, seasonLabel: label, championOwner, teams } };
}

// ─── Superlatives ─────────────────────────────────────────────────────────────

function computeSuperlatives(
  matchups: SeasonMatchup[],
  summaries: SeasonSummary[]
): Superlative[] {
  const played = matchups.filter(m => m.home.score > 0 && m.away.score > 0);

  // Helper: pick team (home or away) from a matchup
  const hi = (m: SeasonMatchup) => m.home.score >= m.away.score ? m.home : m.away;
  const lo = (m: SeasonMatchup) => m.home.score < m.away.score ? m.home : m.away;

  // 1. Highest single-week score
  const highScore = played.reduce((best, m) => {
    const side = m.home.score >= m.away.score ? m.home : m.away;
    const bestSide = best ? (best.home.score >= best.away.score ? best.home : best.away) : null;
    return !bestSide || side.score > bestSide.score ? m : best;
  }, played[0]);

  // 2. Lowest single-week score
  const lowScore = played.reduce((worst, m) => {
    const side = m.home.score < m.away.score ? m.home : m.away;
    const worstSide = worst ? (worst.home.score < worst.away.score ? worst.home : worst.away) : null;
    return !worstSide || side.score < worstSide.score ? m : worst;
  }, played[0]);

  // 3. Biggest blowout
  const biggestWin = played.reduce((best, m) => !best || m.margin > best.margin ? m : best, played[0]);

  // 4. Closest matchup
  const closest = played.reduce((best, m) => !best || m.margin < best.margin ? m : best, played[0]);

  // 5 & 6. Best / worst single-season record (from summaries, reg season)
  const allTeamSeasons = summaries.flatMap(s => s.teams.map(t => ({ ...t, seasonLabel: s.seasonLabel })));
  const bestRecord  = allTeamSeasons.reduce((best, t) => !best || t.wins > best.wins ? t : best, allTeamSeasons[0]);
  const worstRecord = allTeamSeasons.reduce((worst, t) => !worst || t.wins < worst.wins ? t : worst, allTeamSeasons[0]);

  // 7. Longest win streak in a single season
  let longestStreak = { ownerName: '', teamName: '', length: 0, seasonLabel: '' };
  for (const summary of summaries) {
    const ownerSet = new Set(summary.teams.map(t => t.ownerName));
    const owners = Array.from(ownerSet);
    for (const owner of owners) {
      const ownerGames = matchups
        .filter(m => m.year === summary.year &&
          (m.home.ownerName === owner || m.away.ownerName === owner))
        .sort((a, b) => a.week - b.week);

      let streak = 0;
      let max = 0;
      for (const m of ownerGames) {
        const won = (m.home.ownerName === owner && m.winner === 'home') ||
          (m.away.ownerName === owner && m.winner === 'away');
        streak = won ? streak + 1 : 0;
        max = Math.max(max, streak);
      }
      if (max > longestStreak.length) {
        const team = summary.teams.find(t => t.ownerName === owner);
        longestStreak = { ownerName: owner, teamName: team?.teamName ?? '', length: max, seasonLabel: summary.seasonLabel };
      }
    }
  }

  // 8. Highest season PF
  const highPF = allTeamSeasons.reduce((best, t) => !best || t.pf > best.pf ? t : best, allTeamSeasons[0]);

  const result: Superlative[] = [];

  if (highScore) {
    const side = hi(highScore);
    result.push({ emoji: '🔥', label: 'Highest Score (Week)', value: `${side.score.toLocaleString()} pts`, teamName: side.teamName, ownerName: side.ownerName, context: `Week ${highScore.week} · ${highScore.seasonLabel}` });
  }
  if (lowScore) {
    const side = lo(lowScore);
    result.push({ emoji: '💀', label: 'Lowest Score (Week)', value: `${side.score.toLocaleString()} pts`, teamName: side.teamName, ownerName: side.ownerName, context: `Week ${lowScore.week} · ${lowScore.seasonLabel}` });
  }
  if (biggestWin) {
    const winner = biggestWin.winner === 'home' ? biggestWin.home : biggestWin.away;
    result.push({ emoji: '💥', label: 'Biggest Blowout', value: `+${biggestWin.margin.toLocaleString()} margin`, teamName: winner.teamName, ownerName: winner.ownerName, context: `Week ${biggestWin.week} · ${biggestWin.seasonLabel}` });
  }
  if (closest) {
    const winner = closest.winner === 'home' ? closest.home : closest.away;
    result.push({ emoji: '😅', label: 'Closest Matchup', value: `${closest.margin} pt margin`, teamName: winner.teamName, ownerName: winner.ownerName, context: `Week ${closest.week} · ${closest.seasonLabel}` });
  }
  if (bestRecord) {
    result.push({ emoji: '📈', label: 'Best Season Record', value: `${bestRecord.wins}–${bestRecord.losses}`, teamName: bestRecord.teamName, ownerName: bestRecord.ownerName, context: bestRecord.seasonLabel });
  }
  if (worstRecord) {
    result.push({ emoji: '📉', label: 'Worst Season Record', value: `${worstRecord.wins}–${worstRecord.losses}`, teamName: worstRecord.teamName, ownerName: worstRecord.ownerName, context: worstRecord.seasonLabel });
  }
  if (longestStreak.length > 0) {
    result.push({ emoji: '🔄', label: 'Longest Win Streak', value: `${longestStreak.length} in a row`, teamName: longestStreak.teamName, ownerName: longestStreak.ownerName, context: longestStreak.seasonLabel });
  }
  if (highPF) {
    result.push({ emoji: '📊', label: 'Highest Season PF', value: `${highPF.pf.toLocaleString()} pts`, teamName: highPF.teamName, ownerName: highPF.ownerName, context: highPF.seasonLabel });
  }

  return result;
}

// ─── Head-to-Head matrix ──────────────────────────────────────────────────────

function computeH2H(matchups: SeasonMatchup[]): {
  h2hMap: Record<string, Record<string, H2HRecord>>;
  ownerNames: string[];
} {
  const h2hMap: Record<string, Record<string, H2HRecord>> = {};

  const ensure = (a: string, b: string) => {
    h2hMap[a] ??= {};
    h2hMap[a][b] ??= { wins: 0, losses: 0 };
  };

  for (const m of matchups) {
    const A = m.home.ownerName;
    const B = m.away.ownerName;
    if (A === B) continue;
    // Exclude ghost/automated teams from H2H records
    if (isGhostTeam(m.home.teamName) || isGhostTeam(m.away.teamName)) continue;
    if (isGhostTeam(A) || isGhostTeam(B)) continue;

    ensure(A, B);
    ensure(B, A);

    if (m.winner === 'home') {
      h2hMap[A][B].wins++;
      h2hMap[B][A].losses++;
    } else {
      h2hMap[A][B].losses++;
      h2hMap[B][A].wins++;
    }
  }

  const ownerNames = Object.keys(h2hMap).sort();
  return { h2hMap, ownerNames };
}

// ─── Hall of Fame ─────────────────────────────────────────────────────────────

function computeHallOfFame(
  matchups: SeasonMatchup[],
  summaries: SeasonSummary[]
): OwnerCareer[] {
  // Collect all owners across all seasons
  const allOwnersSet = new Set<string>();
  for (const s of summaries) s.teams.forEach(t => allOwnersSet.add(t.ownerName));
  const allOwners = Array.from(allOwnersSet);

  const careers: OwnerCareer[] = [];

  for (const owner of allOwners) {
    const ownerMatchups = matchups.filter(
      m => m.home.ownerName === owner || m.away.ownerName === owner
    );

    let totalWins = 0;
    let totalLosses = 0;
    let totalScore = 0;
    let weekCount = 0;

    for (const m of ownerMatchups) {
      const isHome = m.home.ownerName === owner;
      const won = isHome ? m.winner === 'home' : m.winner === 'away';
      if (won) totalWins++; else totalLosses++;
      totalScore += isHome ? m.home.score : m.away.score;
      weekCount++;
    }

    // Championships
    const championships = summaries.filter(s => s.championOwner === owner).length;

    // Seasons played
    const seasonsPlayed = summaries.filter(s => s.teams.some(t => t.ownerName === owner)).length;

    // Best season record
    const ownerSeasons = summaries.flatMap(s =>
      s.teams.filter(t => t.ownerName === owner)
    );
    const bestSeason = ownerSeasons.reduce(
      (best, t) => !best || t.wins > best.wins ? t : best,
      ownerSeasons[0]
    );

    careers.push({
      ownerName: owner,
      championships,
      totalWins,
      totalLosses,
      winPct: weekCount > 0 ? Math.round((totalWins / weekCount) * 1000) / 10 : 0,
      avgWeeklyScore: weekCount > 0 ? Math.round((totalScore / weekCount) * 10) / 10 : 0,
      seasonsPlayed,
      bestSeasonRecord: bestSeason ? `${bestSeason.wins}–${bestSeason.losses}` : '—',
    });
  }

  // Sort: championships desc → win% desc → total wins desc
  return careers.sort((a, b) =>
    b.championships - a.championships ||
    b.winPct - a.winPct ||
    b.totalWins - a.totalWins
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getAllRecords(): Promise<RecordsData> {
  const results = await Promise.allSettled(ALL_YEARS.map(fetchSeason));

  const allMatchups: SeasonMatchup[] = [];
  const summaries: SeasonSummary[] = [];

  for (const r of results) {
    if (r.status === 'fulfilled') {
      allMatchups.push(...r.value.matchups);
      summaries.push(r.value.summary);
    }
  }

  const superlatives = computeSuperlatives(allMatchups, summaries);
  const { h2hMap, ownerNames } = computeH2H(allMatchups);
  const hallOfFame = computeHallOfFame(allMatchups, summaries);

  return { superlatives, h2hMap, ownerNames, hallOfFame };
}
