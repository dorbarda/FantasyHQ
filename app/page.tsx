import standings from '@/data/standings.json';
import { StandingEntry } from '@/lib/types';
import StatCards from '@/components/StatCards';
import StandingsTable from '@/components/StandingsTable';

const CURRENT_WEEK = 18;
const TOTAL_WEEKS = 21;

export default function HomePage() {
  const data = standings as StandingEntry[];

  return (
    <div className="py-5">
      {/* At a glance */}
      <section className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#536471] mb-3">
          At a Glance
        </p>
        <StatCards standings={data} currentWeek={CURRENT_WEEK} totalWeeks={TOTAL_WEEKS} />
      </section>

      <div className="border-b border-[#eff3f4] mb-5" />

      {/* Standings */}
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
            <span className="text-[12px] font-bold text-[#00ba7c]">Live · Week {CURRENT_WEEK}</span>
          </div>
        </div>
        <StandingsTable standings={data} />
      </section>
    </div>
  );
}
