import Link from 'next/link';
import { hasEspnCredentials, getMatchups } from '@/lib/espn';
import matchupsJson from '@/data/matchups.json';
import { MatchupsData } from '@/lib/types';
import MatchupCard from '@/components/MatchupCard';

export const revalidate = 1800;

export default async function MatchupsPage({
  searchParams,
}: {
  searchParams: { week?: string };
}) {
  const targetWeek = searchParams.week ? parseInt(searchParams.week) : undefined;

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
    <div className="py-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#F0F4F8]">Matchups</h1>
          <p className="text-[15px] text-[#94A3B8] font-medium">
            Week {data.week} · Head-to-Head{!isCurrentWeek ? ' · Final' : ''}
          </p>
        </div>
        {liveMatchups.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34D399] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34D399]"></span>
            </span>
            <span className="text-[12px] font-semibold text-[#34D399]">Live</span>
          </div>
        )}
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-center gap-5 mb-5">
        {prevWeek ? (
          <Link
            href={`/matchups?week=${prevWeek}`}
            className="text-[13px] text-[#64748B] hover:text-[#94A3B8] transition-colors"
          >
            ← Wk {prevWeek}
          </Link>
        ) : (
          <span className="w-14" />
        )}
        <span className="text-[13px] font-semibold text-[#94A3B8]">
          Week {data.week}{isCurrentWeek ? ' · Current' : ''}
        </span>
        {nextWeek ? (
          <Link
            href={`/matchups?week=${nextWeek}`}
            className="text-[13px] text-[#64748B] hover:text-[#94A3B8] transition-colors"
          >
            Wk {nextWeek} →
          </Link>
        ) : (
          <span className="w-14" />
        )}
      </div>

      {/* In Progress */}
      {liveMatchups.length > 0 && (
        <section className="mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-3">
            In Progress
          </p>
          <div className="flex flex-col gap-3">
            {liveMatchups.map((matchup) => (
              <MatchupCard key={matchup.id} matchup={matchup} />
            ))}
          </div>
        </section>
      )}

      {liveMatchups.length > 0 && (projectedMatchups.length > 0 || finalMatchups.length > 0) && (
        <div className="border-b border-[#1E3050] mb-5" />
      )}

      {/* Final (past weeks) */}
      {finalMatchups.length > 0 && (
        <section className="mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-3">
            Final
          </p>
          <div className="flex flex-col gap-3">
            {finalMatchups.map((matchup) => (
              <MatchupCard key={matchup.id} matchup={matchup} />
            ))}
          </div>
        </section>
      )}

      {/* Projected (current week, not started) */}
      {projectedMatchups.length > 0 && (
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-3">
            Projected
          </p>
          <div className="flex flex-col gap-3">
            {projectedMatchups.map((matchup) => (
              <MatchupCard key={matchup.id} matchup={matchup} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
