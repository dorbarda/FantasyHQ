import Link from 'next/link';
import { hasEspnCredentials, getMatchups } from '@/lib/espn';
import matchupsJson from '@/data/matchups.json';
import { MatchupsData } from '@/lib/types';
import MatchupCard from '@/components/MatchupCard';

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

  const isCurrentWeek = data.week === data.currentWeek;
  const prevWeek = data.week > 1 ? data.week - 1 : null;
  const nextWeek = data.week < (data.currentWeek ?? data.week) ? data.week + 1 : null;

  const liveMatchups     = data.matchups.filter((m) => m.isLive);
  const finalMatchups    = data.matchups.filter((m) => m.isFinal);
  const projectedMatchups = data.matchups.filter((m) => !m.isLive && !m.isFinal);

  return (
    <div className="min-h-screen bg-background px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-black tracking-tight text-foreground">Matchups</h1>
          <p className="text-[14px] text-secondary mt-1">
            Week {data.week} · Head-to-Head{!isCurrentWeek ? ' · Final' : ''}
          </p>
        </div>
        {liveMatchups.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-positive-bright opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-positive-bright"></span>
            </span>
            <span className="text-[12px] font-semibold text-positive-bright">Live</span>
          </div>
        )}
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-center gap-6 mb-6 bg-surface border border-border rounded-xl px-4 py-3">
        {prevWeek ? (
          <Link
            href={`/matchups?week=${prevWeek}`}
            className="text-[13px] text-secondary hover:text-muted transition-colors"
          >
            ← Wk {prevWeek}
          </Link>
        ) : (
          <span className="w-14" />
        )}
        <span className="text-[13px] font-semibold text-muted">
          Week {data.week}{isCurrentWeek ? ' · Current' : ''}
        </span>
        {nextWeek ? (
          <Link
            href={`/matchups?week=${nextWeek}`}
            className="text-[13px] text-secondary hover:text-muted transition-colors"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveMatchups.map((matchup) => (
              <MatchupCard key={matchup.id} matchup={matchup} />
            ))}
          </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {finalMatchups.map((matchup) => (
              <MatchupCard key={matchup.id} matchup={matchup} />
            ))}
          </div>
        </section>
      )}

      {/* Projected (current week, not started) */}
      {projectedMatchups.length > 0 && (
        <section className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted mb-3">
            Projected
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projectedMatchups.map((matchup) => (
              <MatchupCard key={matchup.id} matchup={matchup} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
