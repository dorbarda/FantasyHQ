/**
 * Daily recap for the home page — pure logic, no I/O.
 * Spec: docs/HOME-SPEC.md. Data comes from the `nightly` snapshot, built by
 * lib/nightly-data.ts.
 */

export interface NightPlayer {
  playerName: string;
  proTeam: string;
  fantasyPoints: number;
  ownerName: string;
  teamName: string;
}

export interface NightTeam {
  ownerName: string;
  teamName: string;
  /** Sum of that day's starter fantasy points, 1 decimal. */
  points: number;
  playersPlayed: number;
}

export interface NightlyRecap {
  /** YYYY-MM-DD, the US date the games were played. */
  date: string;
  scoringPeriodId: number;
  teams: NightTeam[];
  /** Best starters of the night, highest first. */
  players: NightPlayer[];
}

export interface ManagerAward extends NightTeam {
  /** points ÷ playersPlayed, 1 decimal. */
  perPlayer: number;
}

export const TOP_PLAYERS = 5;

const round1 = (n: number) => Math.round(n * 10) / 10;
const ratio = (t: NightTeam) => (t.playersPlayed > 0 ? t.points / t.playersPlayed : 0);
const toAward = (t: NightTeam): ManagerAward => ({ ...t, perPlayer: round1(ratio(t)) });

/** Highest total points; tie → higher points per player. */
export function managerOfTheNight(teams: NightTeam[]): ManagerAward | null {
  const played = teams.filter(t => t.playersPlayed > 0);
  if (played.length === 0) return null;
  const best = [...played].sort((a, b) => b.points - a.points || ratio(b) - ratio(a))[0];
  return toAward(best);
}

/** Lowest points per player who played; tie → lower total. Nobody played → left out. */
export function worstManagerOfTheNight(teams: NightTeam[]): ManagerAward | null {
  const played = teams.filter(t => t.playersPlayed > 0);
  if (played.length === 0) return null;
  const worst = [...played].sort((a, b) => ratio(a) - ratio(b) || a.points - b.points)[0];
  return toAward(worst);
}

/** Highest fantasy points first; tie → alphabetical. */
export function topPlayers(players: NightPlayer[], n = TOP_PLAYERS): NightPlayer[] {
  return [...players]
    .sort((a, b) => b.fantasyPoints - a.fantasyPoints || a.playerName.localeCompare(b.playerName))
    .slice(0, n);
}

/** True when at least one starter in the league played that day. */
export function isGameNight(recap: Pick<NightlyRecap, 'teams'>): boolean {
  return recap.teams.some(t => t.playersPlayed > 0);
}
