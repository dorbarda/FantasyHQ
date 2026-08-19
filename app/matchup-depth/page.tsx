import { hasEspnCredentials, getMatchupDepth, getPlayoffDepth } from '@/lib/espn';
import { readSnapshot } from '@/lib/snapshots';
import type { MatchupDepthData } from '@/lib/types';
import MatchupDepthTable from '@/components/MatchupDepthTable';
import DepthTabNav from '@/components/DepthTabNav';
import DepthStatsCharts from '@/components/DepthStatsCharts';
import { Suspense } from 'react';

// Full Season and Playoff tabs: ISR cached for 24 h (completed weeks never change).
// Stats tab: page shell renders immediately; charts load client-side via /api/depth-stats.
export const revalidate = 86400;

type Tab = 'full' | 'playoff' | 'stats';

const TAB_META: Record<Tab, { title: string; subtitle: string }> = {
  full:    { title: 'Full Season Depth',  subtitle: 'Players played per day · Score per player · Efficiency — regular season' },
  playoff: { title: 'Playoff Depth',      subtitle: 'Players played per day · Score per player · Efficiency — weeks 19–22' },
  stats:   { title: 'Depth Stats',        subtitle: 'Charts & visualizations across the full season' },
};

export default async function MatchupDepthPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabQuery } = await searchParams;
  const tab: Tab = (tabQuery as Tab) === 'playoff' || (tabQuery as Tab) === 'stats'
    ? (tabQuery as Tab)
    : 'full';

  const snap = tab !== 'stats'
    ? readSnapshot<MatchupDepthData>(tab === 'playoff' ? 'playoff-depth' : 'matchup-depth')
    : null;

  if (!snap && !hasEspnCredentials()) {
    return (
      <div className="min-h-screen bg-background px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-[28px] sm:text-[32px] font-black tracking-tight text-foreground mb-2">Matchup Depth</h1>
        <p className="text-[14px] text-secondary mt-1">ESPN credentials required.</p>
      </div>
    );
  }

  const meta = TAB_META[tab];

  // Stats tab: don't block on server data — charts fetch via API client-side.
  // Full/Playoff: fetch here (ISR cached per URL variant).
  let data: MatchupDepthData | null = null;
  let error = false;

  if (tab !== 'stats') {
    if (snap) {
      data = snap.data;
    } else {
      try {
        data = tab === 'playoff' ? await getPlayoffDepth() : await getMatchupDepth();
      } catch (err) {
        console.error('Matchup depth fetch failed:', err);
        error = true;
      }
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-5">
        <h1 className="text-[28px] sm:text-[32px] font-black tracking-tight text-foreground">{meta.title}</h1>
        <p className="text-[14px] text-secondary mt-1">{meta.subtitle}</p>
      </div>

      <Suspense fallback={null}>
        <DepthTabNav active={tab} />
      </Suspense>

      {error && (
        <p className="text-[14px] text-secondary">Could not load data — try again later.</p>
      )}

      {tab === 'full' && data && (
        <>
          {data.completedPeriods.length > 0 && (
            <p className="text-[13px] text-muted mb-4">
              {data.completedPeriods.length} week{data.completedPeriods.length !== 1 ? 's' : ''} completed
            </p>
          )}
          <MatchupDepthTable data={data} />
        </>
      )}

      {tab === 'playoff' && data && (
        <>
          {data.completedPeriods.length === 0 ? (
            <div className="border border-border rounded-lg px-6 py-10 text-center bg-surface">
              <p className="text-[15px] font-semibold text-foreground">Playoffs haven&apos;t started yet</p>
              <p className="text-[13px] text-muted mt-1">Data will appear once week 19 completes.</p>
            </div>
          ) : (
            <>
              <p className="text-[13px] text-muted mb-4">
                {data.completedPeriods.length} playoff week{data.completedPeriods.length !== 1 ? 's' : ''} completed
                {' · '}weeks {data.completedPeriods[0]}–{data.completedPeriods[data.completedPeriods.length - 1]}
              </p>
              <MatchupDepthTable data={data} />
            </>
          )}
        </>
      )}

      {/* Stats tab: shell renders instantly, charts load client-side */}
      {tab === 'stats' && <DepthStatsCharts />}
    </div>
  );
}
