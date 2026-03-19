/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NBAGame } from './types';

const NBA_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Referer: 'https://www.nba.com/',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Origin: 'https://www.nba.com',
};

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
