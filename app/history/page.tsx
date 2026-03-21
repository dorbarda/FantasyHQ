import { hasEspnCredentials } from '@/lib/espn';
import { getAllHistoricalSeasons } from '@/lib/espn-history';
import overridesJson from '@/data/history.json';
import { HistoricalSeason, SeasonOverride } from '@/lib/types';
import SeasonCard from '@/components/SeasonCard';

export const revalidate = 86400; // historical data — revalidate once a day

export default async function HistoryPage() {
  const overrides = overridesJson as SeasonOverride[];

  let seasons: HistoricalSeason[] = [];

  if (hasEspnCredentials()) {
    try {
      seasons = await getAllHistoricalSeasons();
    } catch (err) {
      console.error('ESPN history fetch failed:', err);
    }
  }

  // If ESPN is unavailable, show skeleton seasons from overrides so the page isn't blank
  if (seasons.length === 0) {
    seasons = overrides.map(o => ({
      year: o.year,
      seasonLabel: `${o.year - 1}-${String(o.year).slice(2)}`,
      champion: null,
      runnerUp: null,
      lastPlace: null,
      finalStandings: [],
      mvpPlayer: o.mvpPlayer,
      notes: o.notes,
    }));
  }

  // Merge manual overrides (mvpPlayer, notes) into ESPN data
  const merged = seasons.map(season => {
    const override = overrides.find(o => o.year === season.year);
    return {
      ...season,
      mvpPlayer: override?.mvpPlayer || season.mvpPlayer,
      notes: override?.notes || season.notes,
    };
  });

  // Most recent first
  merged.sort((a, b) => b.year - a.year);

  return (
    <div className="min-h-screen bg-[#071120] px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-5">
        <h1 className="text-[28px] sm:text-[32px] font-black tracking-tight text-[#F0F4F8]">History</h1>
        <p className="text-[14px] text-[#64748B] mt-1">
          {merged.length} seasons · Champions &amp; final standings
        </p>
      </div>

      <div className="flex flex-col gap-5">
        {merged.map(season => (
          <SeasonCard key={season.year} season={season} />
        ))}
      </div>
    </div>
  );
}
