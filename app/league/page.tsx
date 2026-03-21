import { hasEspnCredentials, getStandings, getPlayoffBracket } from '@/lib/espn';
import standingsJson from '@/data/standings.json';
import type { StandingEntry, PlayoffBracketData } from '@/lib/types';
import StandingsTable from '@/components/StandingsTable';
import PlayoffBracket from '@/components/PlayoffBracket';

export const revalidate = 1800;

export default async function LeaguePage() {
  let standings: StandingEntry[] = standingsJson as StandingEntry[];
  let bracket: PlayoffBracketData | null = null;
  let week = 17;

  const espnResult = await Promise.allSettled([
    hasEspnCredentials()
      ? (async () => {
          const [s, b] = await Promise.all([getStandings(), getPlayoffBracket()]);
          return { standings: s, bracket: b };
        })()
      : Promise.resolve(null),
  ]);

  const result = espnResult[0];
  if (result.status === 'fulfilled' && result.value) {
    standings = result.value.standings;
    bracket = result.value.bracket;
    const played = Math.max(...standings.map((s) => s.wins + s.losses));
    week = played > 0 ? played : week;
  }

  const isPlayoffs = bracket?.isPlayoffs ?? false;

  return (
    <div className="min-h-screen bg-[#071120] px-4 sm:px-6 lg:px-8 py-6">
      {isPlayoffs && bracket ? (
        <PlayoffBracket data={bracket} />
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-[28px] sm:text-[32px] font-black tracking-tight text-[#F0F4F8]">Standings</h1>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34D399] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34D399]" />
              </span>
              <span className="text-[12px] font-semibold text-[#34D399]">Live · Week {week}</span>
            </div>
          </div>
          <StandingsTable standings={standings} />
        </>
      )}
    </div>
  );
}
