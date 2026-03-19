import { hasEspnCredentials, getStandings } from '@/lib/espn';
import standingsJson from '@/data/standings.json';
import { StandingEntry } from '@/lib/types';
import StatCards from '@/components/StatCards';
import StandingsTable from '@/components/StandingsTable';

export const revalidate = 1800; // 30 min

const TOTAL_WEEKS = 25;

export default async function HomePage() {
  let standings: StandingEntry[];
  let week = 18;

  if (hasEspnCredentials()) {
    try {
      standings = await getStandings();
      // Derive current week from season position (approx)
      const totalGames = standings.reduce((sum, t) => sum + t.wins + t.losses, 0);
      week = Math.round(totalGames / standings.length) || 18;
    } catch (err) {
      console.error('ESPN fetch failed, using static data:', err);
      standings = standingsJson as StandingEntry[];
    }
  } else {
    standings = standingsJson as StandingEntry[];
  }

  return (
    <div className="py-5">
      <section className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#536471] mb-3">
          At a Glance
        </p>
        <StatCards standings={standings} currentWeek={week} totalWeeks={TOTAL_WEEKS} />
      </section>

      <div className="border-b border-[#eff3f4] mb-5" />

      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#536471]">
            Standings
          </p>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ba7c] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ba7c]"></span>
            </span>
            <span className="text-[12px] font-bold text-[#00ba7c]">Live · Week {week}</span>
          </div>
        </div>
        <StandingsTable standings={standings} />
      </section>
    </div>
  );
}
