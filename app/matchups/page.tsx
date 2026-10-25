import Link from 'next/link';
import { hasEspnCredentials, getMatchups } from '@/lib/espn';
import matchupsJson from '@/data/matchups.json';
import { MatchupsData } from '@/lib/types';
import MatchupGrid, { type MatchupDetailData } from '@/components/MatchupGrid';
import SnapshotRefreshButton from '@/components/SnapshotRefreshButton';
import { readWeekProjection, readWeekDaily, previewWeekProjection } from '@/lib/projections-data';
import { matchupDaily } from '@/lib/week-daily';
import { findMatchupProjection, watchNotes } from '@/lib/week-projections';

/** "team4" → 4 */
function espnId(teamId: string): number {
  return Number(teamId.replace(/^team/, ''));
}

export const revalidate = 1800;

export default async function MatchupsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const targetWeek = week ? parseInt(week) : undefined;

  let data: MatchupsData;

  if (hasEspnCredentials()) {
    try {
      data = await getMatchups(targetWeek);
    } catch (err) {
      console.error('ESPN fetch failed, using static data:', err);
      data = matchupsJson as MatchupsData;
    }
  } else {
    data = matchupsJson as MatchupsData;
  }

  // Start-of-week numbers frozen on Sunday. Before games start they are the
  // projection on the cards too — ESPN's live projection is 0 until then.
  // A future week has no frozen file yet: preview it from today's rosters.
  const isFutureWeek = data.week > data.currentWeek;
  const frozen = readWeekProjection(data.week) ?? (isFutureWeek ? await previewWeekProjection(data.week) : null);
  const daily = isFutureWeek ? null : readWeekDaily(data.week);
  const details: Record<string, MatchupDetailData> = {};
  for (const m of data.matchups) {
    const projection = findMatchupProjection(frozen, espnId(m.home.teamId), espnId(m.away.teamId));
    details[m.id] = {
      projection,
      notes: projection ? watchNotes(projection.home, projection.away) : [],
      isPreview: isFutureWeek,
      daily: isFutureWeek ? null : matchupDaily(frozen, daily, espnId(m.home.teamId), espnId(m.away.teamId)),
    };
    if (projection && !m.isLive && !m.isFinal) {
      m.home.projectedScore = projection.home.projectedPoints;
      m.away.projectedScore = projection.away.projectedPoints;
    }
  }
  // Battle of the Week = closest projection; recompute now that projections are real.
  const upcoming = data.matchups.filter(m => !m.isLive && !m.isFinal);
  if (upcoming.length > 0 && upcoming.length === data.matchups.length) {
    const gap = (m: typeof upcoming[number]) => Math.abs(m.home.projectedScore - m.away.projectedScore);
    const closest = upcoming.reduce((a, b) => (gap(b) < gap(a) ? b : a));
    for (const m of data.matchups) m.isBattleOfWeek = m === closest && gap(closest) > 0;
  }

  const isCurrentWeek = data.week === data.currentWeek;
  const prevWeek = data.week > 1 ? data.week - 1 : null;
  const nextWeek = data.week < (data.totalWeeks ?? data.week) ? data.week + 1 : null;

  const liveMatchups     = data.matchups.filter((m) => m.isLive);
  const finalMatchups    = data.matchups.filter((m) => m.isFinal);
  const projectedMatchups = data.matchups.filter((m) => !m.isLive && !m.isFinal);

  return (
    <div className="min-h-screen bg-background px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="type-page-title text-foreground">Matchups</h1>
          <p className="type-page-subtitle mt-1">
            Week {data.week} · Head-to-Head{isFutureWeek ? ' · Upcoming' : !isCurrentWeek ? ' · Final' : ''}
          </p>
        </div>
        <div className="flex items-start gap-4">
        {liveMatchups.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-positive-bright opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-positive-bright"></span>
            </span>
            <span className="text-[12px] font-semibold text-positive-bright">Live</span>
          </div>
        )}
          <SnapshotRefreshButton />
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-center gap-6 mb-6 bg-surface border border-border rounded-xl px-4 py-3">
        {prevWeek ? (
          <Link
            href={`/matchups?week=${prevWeek}`}
            className="text-[13px] text-secondary hover:text-muted transition-colors inline-flex items-center min-h-[32px] px-2"
          >
            ← Wk {prevWeek}
          </Link>
        ) : (
          <span className="w-14" />
        )}
        <span className="text-[13px] font-semibold text-muted">
          Week {data.week}{isCurrentWeek ? ' · Current' : isFutureWeek ? ' · Preview' : ''}
        </span>
        {nextWeek ? (
          <Link
            href={`/matchups?week=${nextWeek}`}
            className="text-[13px] text-secondary hover:text-muted transition-colors inline-flex items-center min-h-[32px] px-2"
          >
            Wk {nextWeek} →
          </Link>
        ) : (
          <span className="w-14" />
        )}
      </div>

      {/* In Progress */}
      {liveMatchups.length > 0 && (
        <section className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted mb-3">
            In Progress
          </p>
          <MatchupGrid matchups={liveMatchups} details={details} />
        </section>
      )}

      {liveMatchups.length > 0 && (projectedMatchups.length > 0 || finalMatchups.length > 0) && (
        <div className="border-b border-border mb-5" />
      )}

      {/* Final (past weeks) */}
      {finalMatchups.length > 0 && (
        <section className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted mb-3">
            Final
          </p>
          <MatchupGrid matchups={finalMatchups} details={details} />
        </section>
      )}

      {/* Projected (current week, not started) */}
      {projectedMatchups.length > 0 && (
        <section className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted mb-3">
            Projected
          </p>
          <MatchupGrid matchups={projectedMatchups} details={details} />
        </section>
      )}
    </div>
  );
}
