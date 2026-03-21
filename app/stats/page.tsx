import { hasEspnCredentials, getStatsData } from '@/lib/espn';
import statsJson from '@/data/stats.json';
import { StatsData } from '@/lib/types';
import CategoryRadarChart from '@/components/CategoryRadarChart';
import SeasonStatsChart from '@/components/SeasonStatsChart';
import PfPaScatterChart from '@/components/PfPaScatterChart';

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
    <div className="min-h-screen bg-[#071120] px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-black tracking-tight text-[#F0F4F8]">Stats</h1>
          <p className="text-[14px] text-[#64748B] mt-1">
            Season totals · {data.matchesPlayed} matchups played
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34D399] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34D399]"></span>
          </span>
          <span className="text-[12px] font-bold text-[#34D399]">Live</span>
        </div>
      </div>

      {/* Category Radar */}
      <section className="mb-6 bg-[#0B1628] border border-[#1E3050] rounded-xl px-4 sm:px-6 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-4">
          Category Standings
        </p>
        <CategoryRadarChart standings={data.categoryStandings} teamCount={teamCount} />
      </section>

      {/* Season Totals Bar Chart */}
      <section className="mb-6 bg-[#0B1628] border border-[#1E3050] rounded-xl px-4 sm:px-6 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-4">
          Season Totals
        </p>
        <SeasonStatsChart stats={data.seasonStats} />
      </section>

      {/* Points For / Against Scatter */}
      <section className="mb-6 bg-[#0B1628] border border-[#1E3050] rounded-xl px-4 sm:px-6 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-4">
          Points For / Against
        </p>
        <PfPaScatterChart entries={data.luckTable} />
      </section>
    </div>
  );
}
