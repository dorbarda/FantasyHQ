import type { NBAGame } from '@/lib/types';

function statusStyle(status: NBAGame['status']) {
  if (status === 'live') return 'text-[#00ba7c] font-bold';
  if (status === 'final') return 'text-[#536471]';
  return 'text-[#536471]';
}

function cleanStatusText(text: string): string {
  // "Q3 05:23" → "Q3 5:23" | "Final" | "7:30 pm ET"
  return text.replace(/\b0(\d:)/, '$1').trim();
}

function GameCard({ game }: { game: NBAGame }) {
  const { homeTeam: home, awayTeam: away, status, statusText } = game;
  const isLive = status === 'live';
  const isFinal = status === 'final';
  const homeLeads = home.score > away.score;
  const awayLeads = away.score > home.score;

  return (
    <div className={`px-3 py-2.5 rounded-xl border ${isLive ? 'border-[#00ba7c]/30 bg-[#00ba7c]/5' : 'border-[#eff3f4]'}`}>
      {/* Status */}
      <p className={`text-[10px] mb-1.5 ${statusStyle(status)}`}>
        {isLive && (
          <span className="inline-flex items-center gap-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ba7c] opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00ba7c]" />
            </span>
            {cleanStatusText(statusText)}
          </span>
        )}
        {!isLive && cleanStatusText(statusText)}
      </p>

      {/* Away team */}
      <div className="flex items-center justify-between">
        <span className={`text-[13px] font-bold ${awayLeads && isFinal ? 'text-[#0f1419]' : isLive && awayLeads ? 'text-[#0f1419]' : 'text-[#536471]'}`}>
          {away.tricode}
          <span className="text-[10px] font-normal text-[#536471] ml-1">{away.wins}-{away.losses}</span>
        </span>
        {(isLive || isFinal) && (
          <span className={`text-[14px] font-black tabular-nums ${awayLeads ? 'text-[#0f1419]' : 'text-[#536471]'}`}>
            {away.score}
          </span>
        )}
      </div>

      {/* Home team */}
      <div className="flex items-center justify-between mt-0.5">
        <span className={`text-[13px] font-bold ${homeLeads && isFinal ? 'text-[#0f1419]' : isLive && homeLeads ? 'text-[#0f1419]' : 'text-[#536471]'}`}>
          {home.tricode}
          <span className="text-[10px] font-normal text-[#536471] ml-1">{home.wins}-{home.losses}</span>
        </span>
        {(isLive || isFinal) && (
          <span className={`text-[14px] font-black tabular-nums ${homeLeads ? 'text-[#0f1419]' : 'text-[#536471]'}`}>
            {home.score}
          </span>
        )}
      </div>
    </div>
  );
}

export default function NBAScoreboard({ games }: { games: NBAGame[] }) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });

  if (games.length === 0) {
    return (
      <div className="rounded-2xl border border-[#eff3f4] px-4 py-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#536471] mb-1">NBA Today</p>
        <p className="text-[13px] text-[#536471]">No games scheduled.</p>
      </div>
    );
  }

  const live = games.filter(g => g.status === 'live');
  const upcoming = games.filter(g => g.status === 'pre');
  const final = games.filter(g => g.status === 'final');

  // Sort: live first, then upcoming, then final
  const sorted = [...live, ...upcoming, ...final];

  return (
    <div className="rounded-2xl border border-[#eff3f4] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#eff3f4] bg-[#f7f9f9]">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#536471]">NBA Today</p>
        <p className="text-[11px] text-[#536471]">{today}</p>
      </div>

      {/* Live indicator if any */}
      {live.length > 0 && (
        <div className="flex items-center gap-1.5 px-4 py-2 bg-[#00ba7c]/5 border-b border-[#eff3f4]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ba7c] opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00ba7c]" />
          </span>
          <span className="text-[11px] font-bold text-[#00ba7c]">{live.length} game{live.length > 1 ? 's' : ''} live</span>
        </div>
      )}

      {/* Games */}
      <div className="p-3 flex flex-col gap-2">
        {sorted.map(g => (
          <GameCard key={g.gameId} game={g} />
        ))}
      </div>
    </div>
  );
}
