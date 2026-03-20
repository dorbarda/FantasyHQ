import { hasEspnCredentials, getMatchups } from '@/lib/espn';
import matchupsJson from '@/data/matchups.json';
import { MatchupsData } from '@/lib/types';
import MatchupCard from '@/components/MatchupCard';

export const revalidate = 1800;

export default async function MatchupsPage() {
  let data: MatchupsData;

  if (hasEspnCredentials()) {
    try {
      data = await getMatchups();
    } catch (err) {
      console.error('ESPN fetch failed, using static data:', err);
      data = matchupsJson as MatchupsData;
    }
  } else {
    data = matchupsJson as MatchupsData;
  }

  const liveMatchups = data.matchups.filter((m) => m.isLive);
  const upcomingMatchups = data.matchups.filter((m) => !m.isLive);

  return (
    <div className="py-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#111827]">Matchups</h1>
          <p className="text-[15px] text-[#6B7280] font-medium">Week {data.week} · Head-to-Head</p>
        </div>
        {liveMatchups.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#059669] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#059669]"></span>
            </span>
            <span className="text-[12px] font-semibold text-[#059669]">Live</span>
          </div>
        )}
      </div>

      {liveMatchups.length > 0 && (
        <section className="mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280] mb-3">
            In Progress
          </p>
          <div className="flex flex-col gap-3">
            {liveMatchups.map((matchup) => (
              <MatchupCard key={matchup.id} matchup={matchup} />
            ))}
          </div>
        </section>
      )}

      {liveMatchups.length > 0 && upcomingMatchups.length > 0 && (
        <div className="border-b border-[#E4E7ED] mb-5" />
      )}

      {upcomingMatchups.length > 0 && (
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280] mb-3">
            Projected
          </p>
          <div className="flex flex-col gap-3">
            {upcomingMatchups.map((matchup) => (
              <MatchupCard key={matchup.id} matchup={matchup} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
