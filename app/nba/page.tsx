import { getNBAScoreboard, getNBAConferenceStandings, getNBAStatLeaders } from '@/lib/nba';
import type { NBAGame, NBAConferenceStanding, NBAStatLeadersData } from '@/lib/types';
import NBAScoreboard from '@/components/NBAScoreboard';
import NBAConferenceStandings from '@/components/NBAConferenceStandings';
import NBAStatLeaders from '@/components/NBAStatLeaders';

export const dynamic = 'force-dynamic';

export default async function NBALivePage() {
  let games: NBAGame[] = [];
  let east: NBAConferenceStanding[] = [];
  let west: NBAConferenceStanding[] = [];
  let statLeaders: NBAStatLeadersData = { pts: [], reb: [], ast: [], stl: [], blk: [], tpm: [] };

  const [gamesResult, standingsResult, leadersResult] = await Promise.allSettled([
    getNBAScoreboard(),
    getNBAConferenceStandings(),
    getNBAStatLeaders(),
  ]);

  if (gamesResult.status === 'fulfilled') games = gamesResult.value;
  if (standingsResult.status === 'fulfilled') {
    east = standingsResult.value.east;
    west = standingsResult.value.west;
  }
  if (leadersResult.status === 'fulfilled') statLeaders = leadersResult.value;

  const liveCount = games.filter((g) => g.status === 'live').length;

  return (
    <div className="py-5 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#F0F4F8]">NBA Live</h1>
          <p className="text-[15px] text-[#94A3B8] font-medium">
            2025–26 Season
          </p>
        </div>
        {liveCount > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34D399] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34D399]" />
            </span>
            <span className="text-[12px] font-semibold text-[#34D399]">
              {liveCount} game{liveCount > 1 ? 's' : ''} live
            </span>
          </div>
        )}
      </div>

      {/* 3-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Col 1 — Today's Games */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-3">
            Today&apos;s Games
          </p>
          <NBAScoreboard games={games} />
        </section>

        {/* Col 2 — Stat Leaders */}
        <NBAStatLeaders leaders={statLeaders} />

        {/* Col 3 — Conference Standings */}
        <NBAConferenceStandings east={east} west={west} />
      </div>
    </div>
  );
}
