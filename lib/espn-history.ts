/* eslint-disable @typescript-eslint/no-explicit-any */
import type { HistoricalSeason, HistoricalTeam } from './types';

const ESPN_S2 = process.env.ESPN_S2;
const SWID = process.env.SWID;
const LEAGUE_ID = process.env.LEAGUE_ID;

const HISTORY_YEARS = [2025, 2024, 2023, 2022, 2021] as const;

function seasonLabel(year: number): string {
  return `${year - 1}-${String(year).slice(2)}`;
}

async function espnFetchYear(year: number, params: string): Promise<any> {
  const base = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${year}/segments/0/leagues/${LEAGUE_ID}`;
  const res = await fetch(`${base}${params}`, {
    headers: {
      Cookie: `espn_s2=${ESPN_S2}; SWID=${SWID}`,
      Accept: 'application/json',
    },
    // Historical data never changes — cache for 24 h
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error(`ESPN ${res.status} for year=${year}`);
  return res.json();
}

function buildMemberMap(members: any[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const m of members) {
    map[m.id] = `${m.firstName} ${m.lastName}`.trim();
  }
  return map;
}

async function fetchOneSeason(year: number): Promise<HistoricalSeason> {
  // Fetch teams/standings + full schedule in parallel
  const [standingsData, scheduleData] = await Promise.all([
    espnFetchYear(year, '?view=mTeam&view=mStandings'),
    espnFetchYear(year, '?view=mMatchup&view=mMatchupScore'),
  ]);

  const members: any[] = standingsData.members || [];
  const memberMap = buildMemberMap(members);

  // ── Build team lookup ───────────────────────────────────────────────────────
  const teamMap: Record<number, { name: string; owner: string }> = {};
  for (const t of standingsData.teams as any[]) {
    const ownerName = (t.owners || [])
      .map((id: string) => memberMap[id] || 'Unknown')
      .join(' & ');
    teamMap[t.id] = { name: t.name || `Team ${t.id}`, owner: ownerName };
  }

  // ── Final standings ────────────────────────────────────────────────────────
  // rankCalculatedFinal = ESPN's post-playoff final position (1=champion, 2=runner-up, …)
  // playoffSeed         = regular-season seeding — used only as fallback for older seasons
  const finalStandings: HistoricalTeam[] = (standingsData.teams as any[])
    .map((t: any) => {
      const record = t.record?.overall || {};
      return {
        rank: t.rankCalculatedFinal || t.playoffSeed || 99,
        teamName: teamMap[t.id]?.name ?? `Team ${t.id}`,
        ownerName: teamMap[t.id]?.owner ?? 'Unknown',
        wins: record.wins || 0,
        losses: record.losses || 0,
        pf: Math.round((record.pointsFor || 0) * 10) / 10,
        pa: Math.round((record.pointsAgainst || 0) * 10) / 10,
      };
    })
    .sort((a, b) => a.rank - b.rank);

  // ── Find champion from playoff schedule ────────────────────────────────────
  const schedule: any[] = scheduleData.schedule || [];

  // Championship game = highest-period WINNERS_BRACKET matchup
  const playoffGames = schedule.filter(
    (m: any) =>
      m.playoffTierType === 'WINNERS_BRACKET' ||
      m.playoffTierType === 'CHAMPIONSHIP'
  );

  let champion: HistoricalTeam | null = null;
  let runnerUp: HistoricalTeam | null = null;

  if (playoffGames.length > 0) {
    const finalGame = playoffGames.reduce((latest: any, m: any) =>
      m.matchupPeriodId > latest.matchupPeriodId ? m : latest
    );

    const home = finalGame.home || {};
    const away = finalGame.away || {};
    const homeScore = home.totalPoints || 0;
    const awayScore = away.totalPoints || 0;

    const winnerId: number = homeScore >= awayScore ? home.teamId : away.teamId;
    const loserId: number  = homeScore >= awayScore ? away.teamId : home.teamId;

    champion  = finalStandings.find(t => t.teamName === teamMap[winnerId]?.name) ??
      buildTeamFromId(winnerId, teamMap);
    runnerUp  = finalStandings.find(t => t.teamName === teamMap[loserId]?.name) ??
      buildTeamFromId(loserId, teamMap);
  } else {
    // Fallback: rank 1 team is champion (regular season winner)
    champion = finalStandings[0] ?? null;
    runnerUp = finalStandings[1] ?? null;
  }

  const lastPlace =
    finalStandings.length > 0
      ? finalStandings[finalStandings.length - 1]
      : null;

  return {
    year,
    seasonLabel: seasonLabel(year),
    champion,
    runnerUp,
    lastPlace,
    finalStandings,
    mvpPlayer: '',
    notes: '',
  };
}

function buildTeamFromId(
  teamId: number,
  teamMap: Record<number, { name: string; owner: string }>
): HistoricalTeam {
  return {
    rank: 0,
    teamName: teamMap[teamId]?.name ?? `Team ${teamId}`,
    ownerName: teamMap[teamId]?.owner ?? 'Unknown',
    wins: 0,
    losses: 0,
    pf: 0,
    pa: 0,
  };
}

// Public: fetch all historical seasons in parallel, silently skip failures
export async function getAllHistoricalSeasons(): Promise<HistoricalSeason[]> {
  const results = await Promise.allSettled(
    HISTORY_YEARS.map(year => fetchOneSeason(year))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<HistoricalSeason> => r.status === 'fulfilled')
    .map(r => r.value);
}

export { HISTORY_YEARS };
