import { hasEspnCredentials, getStatsData } from '@/lib/espn';
import statsJson from '@/data/stats.json';
import { StatsData } from '@/lib/types';
import CategoryTable from '@/components/CategoryTable';
import SeasonStatsTable from '@/components/SeasonStatsTable';

export const revalidate = 1800;

export default async function StatsPage() {
  let data: StatsData;

  if (hasEspnCredentials()) {
    try {
      data = await getStatsData();
    } catch (err) {
      console.error('ESPN fetch failed, using static data:', err);
      data = statsJson as StatsData;
    }
  } else {
    data = statsJson as StatsData;
  }

  const teamCount = data.categoryStandings.length;

  return (
    <div className="py-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#0f1419]">Stats</h1>
          <p className="text-[15px] text-[#536471] font-medium">
            Season totals · {data.matchesPlayed} matchups played
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ba7c] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ba7c]"></span>
          </span>
          <span className="text-[12px] font-bold text-[#00ba7c]">Live</span>
        </div>
      </div>

      {/* Category standings */}
      <section className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#536471] mb-3">
          Category Standings
        </p>
        <CategoryTable standings={data.categoryStandings} teamCount={teamCount} />
      </section>

      <div className="border-b border-[#eff3f4] mb-5" />

      {/* Season stats */}
      <section>
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#536471] mb-3">
          Season Totals
        </p>
        <SeasonStatsTable stats={data.seasonStats} />
      </section>
    </div>
  );
}
