/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NBAGame, NBAConferenceStanding, NBAStatLeader, NBAStatLeadersData } from './types';

const NBA_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Referer: 'https://www.nba.com/',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Origin: 'https://www.nba.com',
};

const NBA_STATS_HEADERS = {
  ...NBA_HEADERS,
  'x-nba-stats-origin': 'stats',
  'x-nba-stats-token': 'true',
};

async function fetchWithTimeout(url: string, options: RequestInit, ms = 5000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function getNBAScoreboard(): Promise<NBAGame[]> {
  try {
    const res = await fetch(
      'https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json',
      {
        headers: NBA_HEADERS,
        next: { revalidate: 60 }, // 1-minute cache — live games update frequently
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const games: any[] = data.scoreboard?.games ?? [];

    return games.map((g: any): NBAGame => ({
      gameId: g.gameId,
      status: g.gameStatus === 1 ? 'pre' : g.gameStatus === 2 ? 'live' : 'final',
      statusText: g.gameStatusText ?? '',
      period: g.period ?? 0,
      gameTimeUTC: g.gameTimeUTC ?? '',
      homeTeam: {
        tricode: g.homeTeam.teamTricode,
        city: g.homeTeam.teamCity,
        name: g.homeTeam.teamName,
        score: g.homeTeam.score ?? 0,
        wins: g.homeTeam.wins ?? 0,
        losses: g.homeTeam.losses ?? 0,
      },
      awayTeam: {
        tricode: g.awayTeam.teamTricode,
        city: g.awayTeam.teamCity,
        name: g.awayTeam.teamName,
        score: g.awayTeam.score ?? 0,
        wins: g.awayTeam.wins ?? 0,
        losses: g.awayTeam.losses ?? 0,
      },
    }));
  } catch {
    return [];
  }
}

export async function getNBAConferenceStandings(): Promise<{
  east: NBAConferenceStanding[];
  west: NBAConferenceStanding[];
}> {
  try {
    const res = await fetchWithTimeout(
      'https://stats.nba.com/stats/leaguestandingsv3?LeagueID=00&Season=2025-26&SeasonType=Regular+Season',
      { headers: NBA_STATS_HEADERS, next: { revalidate: 3600 } }
    );
    if (!res.ok) return { east: [], west: [] };
    const data = await res.json();
    const resultSet = data.resultSets?.[0];
    if (!resultSet) return { east: [], west: [] };

    const headers: string[] = resultSet.headers;
    const rows: any[][] = resultSet.rowSet;

    const idx = (name: string) => headers.indexOf(name);

    const east: NBAConferenceStanding[] = [];
    const west: NBAConferenceStanding[] = [];

    for (const row of rows) {
      const conf: string = row[idx('Conference')] ?? '';
      const entry: NBAConferenceStanding = {
        rank: row[idx('PlayoffRank')] ?? 0,
        teamTricode: row[idx('TeamSlug')]?.toUpperCase().slice(0, 3) ?? '',
        teamCity: row[idx('TeamCity')] ?? '',
        teamName: row[idx('TeamName')] ?? '',
        wins: row[idx('WINS')] ?? 0,
        losses: row[idx('LOSSES')] ?? 0,
        pct: row[idx('WinPCT')] ?? 0,
        gb: String(row[idx('ConferenceGamesBack')] ?? '-'),
        homeRecord: row[idx('Home')] ?? '',
        awayRecord: row[idx('Road')] ?? '',
        l10: row[idx('L10')] ?? '',
        streak: String(row[idx('strCurrentStreak')] ?? ''),
        clinched: row[idx('ClinchIndicator')] ?? '',
      };
      if (conf === 'East') east.push(entry);
      else if (conf === 'West') west.push(entry);
    }

    east.sort((a, b) => a.rank - b.rank);
    west.sort((a, b) => a.rank - b.rank);

    return { east, west };
  } catch {
    return { east: [], west: [] };
  }
}

async function fetchStatLeaders(statCategory: string, top: number = 3): Promise<NBAStatLeader[]> {
  try {
    const url =
      `https://stats.nba.com/stats/leagueleaders?LeagueID=00&PerMode=PerGame` +
      `&Scope=S&Season=2025-26&SeasonType=Regular+Season&StatCategory=${statCategory}`;
    const res = await fetchWithTimeout(url, {
      headers: NBA_STATS_HEADERS,
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const resultSet = data.resultSet;
    if (!resultSet) return [];

    const headers: string[] = resultSet.headers;
    const rows: any[][] = resultSet.rowSet.slice(0, top);

    const idx = (name: string) => headers.indexOf(name);
    const statIdx = idx(statCategory);

    return rows.map((row, i) => ({
      rank: i + 1,
      playerId: row[idx('PLAYER_ID')] ?? 0,
      playerName: row[idx('PLAYER')] ?? '',
      team: row[idx('TEAM')] ?? '',
      gp: row[idx('GP')] ?? 0,
      value: row[statIdx] ?? 0,
    }));
  } catch {
    return [];
  }
}

export async function getNBAStatLeaders(): Promise<NBAStatLeadersData> {
  const [pts, reb, ast, stl, blk, tpm] = await Promise.all([
    fetchStatLeaders('PTS'),
    fetchStatLeaders('REB'),
    fetchStatLeaders('AST'),
    fetchStatLeaders('STL'),
    fetchStatLeaders('BLK'),
    fetchStatLeaders('FG3M'),
  ]);
  return { pts, reb, ast, stl, blk, tpm };
}
