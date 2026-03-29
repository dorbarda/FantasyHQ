import { hasEspnCredentials, getMatchupDepth, getPlayoffDepth } from '@/lib/espn';
import type { MatchupDepthData } from '@/lib/types';
import MatchupDepthTable from '@/components/MatchupDepthTable';
import DepthTabNav from '@/components/DepthTabNav';
import DepthStatsCharts from '@/components/DepthStatsCharts';
import { Suspense } from 'react';

export const revalidate = 1800;

type Tab = 'full' | 'playoff' | 'stats';

const TAB_META: Record<Tab, { title: string; subtitle: string }> = {
  full:    { title: 'Full Season Depth',  subtitle: 'Players played per day · Score per player · Efficiency — regular season' },
  playoff: { title: 'Playoff Depth',      subtitle: 'Players played per day · Score per player · Efficiency — weeks 19–22' },
  stats:   { title: 'Depth Stats',        subtitle: 'Charts & visualizations across the full season' },
};

export default async function MatchupDepthPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  if (!hasEspnCredentials()) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-[28px] sm:text-[32px] font-black tracking-tight text-[#0F172A] mb-2">Matchup Depth</h1>
        <p className="text-[14px] text-[#475569] mt-1">ESPN credentials required.</p>
      </div>
    );
  }

  const tab: Tab = (searchParams.tab as Tab) === 'playoff' || (searchParams.tab as Tab) === 'stats'
    ? (searchParams.tab as Tab)
    : 'full';

  const meta = TAB_META[tab];

  // Fetch data — stats tab reuses full season data
  let data: MatchupDepthData | null = null;
  let error = false;

  try {
    if (tab === 'playoff') {
      data = await getPlayoffDepth();
    } else {
      data = await getMatchupDepth();
    }
  } catch (err) {
    console.error('Matchup depth fetch failed:', err);
    error = true;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-[28px] sm:text-[32px] font-black tracking-tight text-[#0F172A]">{meta.title}</h1>
        <p className="text-[14px] text-[#475569] mt-1">{meta.subtitle}</p>
      </div>

      {/* Tab nav */}
      <Suspense fallback={null}>
        <DepthTabNav active={tab} />
      </Suspense>

      {error && (
        <p className="text-[14px] text-[#475569]">Could not load data — try again later.</p>
      )}

      {/* Full Season tab */}
      {tab === 'full' && data && (
        <>
          {data.completedPeriods.length > 0 && (
            <p className="text-[13px] text-[#94A3B8] mb-4">
              {data.completedPeriods.length} week{data.completedPeriods.length !== 1 ? 's' : ''} completed
            </p>
          )}
          <MatchupDepthTable data={data} />
        </>
      )}

      {/* Playoff tab */}
      {tab === 'playoff' && data && (
        <>
          {data.completedPeriods.length === 0 ? (
            <div className="border border-[#E2E8F0] rounded-lg px-6 py-10 text-center bg-white">
              <p className="text-[15px] font-semibold text-[#0F172A]">Playoffs haven&apos;t started yet</p>
              <p className="text-[13px] text-[#94A3B8] mt-1">Data will appear once week 19 completes.</p>
            </div>
          ) : (
            <>
              <p className="text-[13px] text-[#94A3B8] mb-4">
                {data.completedPeriods.length} playoff week{data.completedPeriods.length !== 1 ? 's' : ''} completed
                {' · '}weeks {data.completedPeriods[0]}–{data.completedPeriods[data.completedPeriods.length - 1]}
              </p>
              <MatchupDepthTable data={data} />
            </>
          )}
        </>
      )}

      {/* Stats tab */}
      {tab === 'stats' && data && (
        <DepthStatsCharts rows={data.rows} periods={data.completedPeriods} />
      )}
    </div>
  );
}
