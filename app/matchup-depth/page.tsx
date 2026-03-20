import { hasEspnCredentials, getMatchupDepth } from '@/lib/espn';
import type { MatchupDepthData } from '@/lib/types';
import MatchupDepthTable from '@/components/MatchupDepthTable';

export const revalidate = 1800;

export default async function MatchupDepthPage() {
  if (!hasEspnCredentials()) {
    return (
      <div className="py-5">
        <h1 className="text-[28px] font-bold tracking-tight text-[#111827] mb-2">Matchup Depth</h1>
        <p className="text-[15px] text-[#6B7280]">ESPN credentials required.</p>
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
        <h1 className="text-[28px] font-bold tracking-tight text-[#111827]">Matchup Depth</h1>
        <p className="text-[15px] text-[#6B7280] font-medium">
          Players played per day · Score per player · Efficiency
        </p>
      </div>

      {/* Summary line */}
      {data && weeksShown > 0 && (
        <p className="text-[13px] text-[#6B7280] mb-4">
          {weeksShown} week{weeksShown !== 1 ? 's' : ''} · {data.rows.length / (data.completedPeriods.length || 1)} teams per week
        </p>
      )}

      {error && (
        <p className="text-[15px] text-[#6B7280]">Could not load data — try again later.</p>
      )}

      {data && <MatchupDepthTable data={data} />}
    </div>
  );
}
