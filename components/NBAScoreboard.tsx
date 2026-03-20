import type { NBAGame } from '@/lib/types';

function statusStyle(status: NBAGame['status']) {
  if (status === 'live') return 'text-[#34D399] font-semibold';
  return 'text-[#64748B]';
}

function cleanStatusText(text: string): string {
  return text.replace(/\b0(\d:)/, '$1').trim();
}

function GameCard({ game }: { game: NBAGame }) {
  const { homeTeam: home, awayTeam: away, status, statusText } = game;
  const isLive = status === 'live';
  const isFinal = status === 'final';
  const homeLeads = home.score > away.score;
  const awayLeads = away.score > home.score;

  return (
    <div className={`px-3 py-2.5 rounded border ${isLive ? 'border-[#059669]/30 bg-[#34D399]/5' : 'border-[#1E3050]'}`}>
      {/* Status */}
      <p className={`text-[10px] mb-1.5 ${statusStyle(status)}`}>
        {isLive && (
          <span className="inline-flex items-center gap-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34D399] opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#34D399]" />
            </span>
            {cleanStatusText(statusText)}
          </span>
        )}
        {!isLive && cleanStatusText(statusText)}
      </p>

      {/* Away team */}
      <div className="flex items-center justify-between">
        <span className={`text-[13px] font-semibold ${awayLeads && isFinal ? 'text-[#F0F4F8]' : isLive && awayLeads ? 'text-[#F0F4F8]' : 'text-[#94A3B8]'}`}>
          {away.tricode}
          <span className="text-[10px] font-normal text-[#64748B] ml-1">{away.wins}-{away.losses}</span>
        </span>
        {(isLive || isFinal) && (
          <span className={`text-[14px] font-bold tabular-nums ${awayLeads ? 'text-[#F0F4F8]' : 'text-[#94A3B8]'}`}>
            {away.score}
          </span>
        )}
      </div>

      {/* Home team */}
      <div className="flex items-center justify-between mt-0.5">
        <span className={`text-[13px] font-semibold ${homeLeads && isFinal ? 'text-[#F0F4F8]' : isLive && homeLeads ? 'text-[#F0F4F8]' : 'text-[#94A3B8]'}`}>
          {home.tricode}
          <span className="text-[10px] font-normal text-[#64748B] ml-1">{home.wins}-{home.losses}</span>
        </span>
        {(isLive || isFinal) && (
          <span className={`text-[14px] font-bold tabular-nums ${homeLeads ? 'text-[#F0F4F8]' : 'text-[#94A3B8]'}`}>
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
      <div className="rounded-lg border border-[#1E3050] bg-[#142035] px-4 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-1">NBA Today</p>
        <p className="text-[13px] text-[#94A3B8]">No games scheduled.</p>
      </div>
    );
  }

  const live = games.filter(g => g.status === 'live');
  const upcoming = games.filter(g => g.status === 'pre');
  const final = games.filter(g => g.status === 'final');
  const sorted = [...live, ...upcoming, ...final];

  return (
    <div className="rounded-lg border border-[#1E3050] overflow-hidden bg-[#142035]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1E3050] bg-[#0E1929]">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8]">NBA Today</p>
        <p className="text-[11px] text-[#64748B]">{today}</p>
      </div>

      {/* Live indicator if any */}
      {live.length > 0 && (
        <div className="flex items-center gap-1.5 px-4 py-1.5 bg-[#34D399]/5 border-b border-[#1E3050]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34D399] opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#34D399]" />
          </span>
          <span className="text-[11px] font-semibold text-[#34D399]">{live.length} game{live.length > 1 ? 's' : ''} live</span>
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
