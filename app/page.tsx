import { hasEspnCredentials, getStandings, getPlayoffBracket } from '@/lib/espn';
import { getNBAScoreboard } from '@/lib/nba';
import standingsJson from '@/data/standings.json';
import type { StandingEntry, PlayoffBracketData, NBAGame } from '@/lib/types';
import StandingsTable from '@/components/StandingsTable';
import PlayoffBracket from '@/components/PlayoffBracket';
import NBAScoreboard from '@/components/NBAScoreboard';

export const revalidate = 1800;

export default async function HomePage() {
  let standings: StandingEntry[] = standingsJson as StandingEntry[];
  let bracket: PlayoffBracketData | null = null;
  let nbaGames: NBAGame[] = [];
  let week = 17;

  // Run all fetches in parallel
  const [espnResult, nbaResult] = await Promise.allSettled([
    hasEspnCredentials()
      ? (async () => {
          const [s, b] = await Promise.all([getStandings(), getPlayoffBracket()]);
          return { standings: s, bracket: b };
        })()
      : Promise.resolve(null),
    getNBAScoreboard(),
  ]);

  if (espnResult.status === 'fulfilled' && espnResult.value) {
    standings = espnResult.value.standings;
    bracket = espnResult.value.bracket;
    // Infer week from standings (max wins+losses)
    const played = Math.max(...standings.map(s => s.wins + s.losses));
    week = played > 0 ? played : week;
  }
  if (nbaResult.status === 'fulfilled') {
    nbaGames = nbaResult.value;
  }

  const isPlayoffs = bracket?.isPlayoffs ?? false;

  return (
    <div className="py-5">
      {/* Two-column layout: main content + NBA sidebar */}
      <div className="flex gap-6 items-start">

        {/* ── Main column ── */}
        <div className="flex-1 min-w-0">
          {isPlayoffs && bracket ? (
            /* ── Playoffs: show bracket ── */
            <PlayoffBracket data={bracket} />
          ) : (
            /* ── Regular season: show standings ── */
            <>
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-[28px] font-bold tracking-tight text-[#111827]">Standings</h1>
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#059669] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#059669]" />
                  </span>
                  <span className="text-[12px] font-semibold text-[#059669]">Live · Week {week}</span>
                </div>
              </div>
              <StandingsTable standings={standings} />
            </>
          )}
        </div>

        {/* ── NBA sidebar ── */}
        <div className="w-[260px] shrink-0 hidden md:block">
          <NBAScoreboard games={nbaGames} />
        </div>

      </div>

      {/* NBA sidebar on mobile (below main content) */}
      <div className="mt-6 md:hidden">
        <NBAScoreboard games={nbaGames} />
      </div>
    </div>
  );
}
