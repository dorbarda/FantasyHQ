import { hasEspnCredentials, getMatchupDepth } from '@/lib/espn';
import type { MatchupDepthData } from '@/lib/types';
import MatchupDepthTable from '@/components/MatchupDepthTable';

export const revalidate = 1800;

export default async function MatchupDepthPage() {
  if (!hasEspnCredentials()) {
    return (
      <div className="py-5">
        <h1 className="text-[28px] font-bold tracking-tight text-[#F0F4F8] mb-2">Matchup Depth</h1>
        <p className="text-[15px] text-[#94A3B8]">ESPN credentials required.</p>
      </div>
    );
  }

  let data: MatchupDepthData | null = null;
  let error = false;

  try {
    data = await getMatchupDepth();
  } catch (err) {
    console.error('Matchup depth fetch failed:', err);
    error = true;
  }

  const weeksShown = data?.completedPeriods.length ?? 0;

  return (
    <div className="py-5">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-[28px] font-bold tracking-tight text-[#F0F4F8]">Matchup Depth</h1>
        <p className="text-[15px] text-[#94A3B8] font-medium">
          Players played per day · Score per player · Efficiency
        </p>
      </div>

      {/* Summary line */}
      {data && weeksShown > 0 && (
        <p className="text-[13px] text-[#94A3B8] mb-4">
          {weeksShown} week{weeksShown !== 1 ? 's' : ''} · {data.rows.length / (data.completedPeriods.length || 1)} teams per week
        </p>
      )}

      {error && (
        <p className="text-[15px] text-[#94A3B8]">Could not load data — try again later.</p>
      )}

      {data && <MatchupDepthTable data={data} />}
    </div>
  );
}
