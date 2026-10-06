/**
 * Loading side of the home page's daily recap (docs/HOME-SPEC.md).
 *
 * Built nightly into data/snapshots/nightly.json: the most recent finished day
 * that had games, looking back up to LOOKBACK_DAYS. A day with no games is
 * never written, so the file keeps the last game night.
 */
import { readSnapshot } from './snapshots';
import { PRO_TEAM_ABBREV, type ScheduleSeason } from './espn-schedule';
import { recentScoringDays } from './highlights-data';
import { isGameNight, type NightlyRecap, type NightPlayer } from './nightly';

const LOOKBACK_DAYS = 10;
/** Players stored per night — more than shown, so the page can change its mind. */
const STORED_PLAYERS = 10;

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Returns null before opening night or when no game day is in the window. */
export async function buildNightlySnapshot(): Promise<NightlyRecap | null> {
  const schedule = readSnapshot<ScheduleSeason>('schedule');
  if (!schedule) return null;
  const days = recentScoringDays(schedule.data, LOOKBACK_DAYS).reverse(); // newest first

  // Imported here so a page-side import never loads the ESPN client.
  const { getNightLineups } = await import('./espn');

  for (const { date, scoringPeriodId } of days) {
    const lineups = await getNightLineups(scoringPeriodId);
    const recap: NightlyRecap = {
      date,
      scoringPeriodId,
      teams: lineups.map(t => ({
        ownerName: t.ownerName,
        teamName: t.teamName,
        points: round1(t.starters.reduce((s, p) => s + p.fantasyPoints, 0)),
        playersPlayed: t.starters.filter(p => p.played).length,
      })),
      players: lineups
        .flatMap(t =>
          t.starters
            .filter(p => p.played)
            .map<NightPlayer>(p => ({
              playerName: p.playerName,
              proTeam: PRO_TEAM_ABBREV[p.proTeamId] ?? '',
              fantasyPoints: round1(p.fantasyPoints),
              ownerName: t.ownerName,
              teamName: t.teamName,
            }))
        )
        .sort((a, b) => b.fantasyPoints - a.fantasyPoints)
        .slice(0, STORED_PLAYERS),
    };
    if (isGameNight(recap)) return recap;
  }
  return null;
}

/** Snapshot-only: a page render must never call ESPN for this. */
export function loadNightlyRecap(): NightlyRecap | null {
  return readSnapshot<NightlyRecap>('nightly')?.data ?? null;
}
