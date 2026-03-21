import { hasEspnCredentials, getMatchupDepth } from '@/lib/espn';
import type { MatchupDepthData } from '@/lib/types';
import MatchupDepthTable from '@/components/MatchupDepthTable';

export const revalidate = 1800;

export default async function MatchupDepthPage() {
  if (!hasEspnCredentials()) {
    return (
      <div className="min-h-screen bg-[#071120] px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-[28px] sm:text-[32px] font-black tracking-tight text-[#F0F4F8] mb-2">Matchup Depth</h1>
        <p className="text-[14px] text-[#64748B] mt-1">ESPN credentials required.</p>
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
    <div className="min-h-screen bg-[#071120] px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-[28px] sm:text-[32px] font-black tracking-tight text-[#F0F4F8]">Matchup Depth</h1>
        <p className="text-[14px] text-[#64748B] mt-1">
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
        <p className="text-[14px] text-[#64748B]">Could not load data — try again later.</p>
      )}

      {data && <MatchupDepthTable data={data} />}
    </div>
  );
}
