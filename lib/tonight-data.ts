/**
 * Who still plays today, per fantasy team — live ESPN rosters + the NBA
 * schedule, through the same lineup rules as the projections (IR out, OUT
 * players don't start, 10 starting spots). Games already started don't count.
 * Server only. Null when ESPN or the schedule is unavailable.
 */
import { getLeagueRosters, hasEspnCredentials } from './espn';
import { loadScheduleSeason } from './schedule-data';
import { dayStatLine } from './lineup';
import { projectTeam } from './week-projections';
import { tonightFrom, type TonightTeam } from './week-pulse';
import { CURRENT_SEASON } from './season';

export interface TonightData {
  /** Fantasy team id → who still plays today. */
  teams: Map<number, TonightTeam>;
  /** NBA team id (ESPN proTeamId) → players on a league roster, IR left out. */
  rostered: Map<number, number>;
}

export async function loadTonight(week: number): Promise<TonightData | null> {
  if (!hasEspnCredentials()) return null;
  try {
    const [league, season] = await Promise.all([getLeagueRosters(), loadScheduleSeason()]);
    if (!season) return null;
    const today: number = league.scoringPeriodId || league.status?.latestScoringPeriod;
    if (!today) return null;
    const hasPlayed = (player: any, sp: number) => !!dayStatLine({ playerPoolEntry: { player } }, sp); // eslint-disable-line @typescript-eslint/no-explicit-any
    const teams = new Map<number, TonightTeam>();
    const rostered = new Map<number, number>();
    for (const team of league.teams || []) {
      const p = projectTeam(team, [today], season.schedules, CURRENT_SEASON, week, hasPlayed);
      teams.set(team.id, tonightFrom(p.roster));
      for (const e of team.roster?.entries || []) {
        const pro = e.playerPoolEntry?.player?.proTeamId;
        if (e.lineupSlotId !== 13 && pro) rostered.set(pro, (rostered.get(pro) ?? 0) + 1);
      }
    }
    return { teams, rostered };
  } catch (err) {
    console.error('Tonight load failed:', err);
    return null;
  }
}
