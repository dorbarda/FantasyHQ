import type { NBAGame } from '@/lib/types';

function statusStyle(status: NBAGame['status']) {
  if (status === 'live') return 'text-positive-bright font-semibold';
  return 'text-secondary';
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
    <div className={`px-3 py-2.5 rounded border ${isLive ? 'border-positive/30 bg-positive-bright/5' : 'border-border'}`}>
      {/* Status */}
      <p className={`text-[10px] mb-1.5 ${statusStyle(status)}`}>
        {isLive && (
          <span className="inline-flex items-center gap-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-positive-bright opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-positive-bright" />
            </span>
            {cleanStatusText(statusText)}
          </span>
        )}
        {!isLive && cleanStatusText(statusText)}
      </p>

      {/* Away team */}
      <div className="flex items-center justify-between">
        <span className={`text-[13px] font-semibold ${awayLeads && isFinal ? 'text-foreground' : isLive && awayLeads ? 'text-foreground' : 'text-muted'}`}>
          {away.tricode}
          <span className="text-[10px] font-normal text-secondary ml-1">{away.wins}-{away.losses}</span>
        </span>
        {(isLive || isFinal) && (
          <span className={`text-[14px] font-bold tabular-nums ${awayLeads ? 'text-foreground' : 'text-muted'}`}>
            {away.score}
          </span>
        )}
      </div>

      {/* Home team */}
      <div className="flex items-center justify-between mt-0.5">
        <span className={`text-[13px] font-semibold ${homeLeads && isFinal ? 'text-foreground' : isLive && homeLeads ? 'text-foreground' : 'text-muted'}`}>
          {home.tricode}
          <span className="text-[10px] font-normal text-secondary ml-1">{home.wins}-{home.losses}</span>
        </span>
        {(isLive || isFinal) && (
          <span className={`text-[14px] font-bold tabular-nums ${homeLeads ? 'text-foreground' : 'text-muted'}`}>
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
      <div className="rounded-lg border border-border bg-surface px-4 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted mb-1">NBA Today</p>
        <p className="text-[13px] text-muted">No games scheduled.</p>
      </div>
    );
  }

  const live = games.filter(g => g.status === 'live');
  const upcoming = games.filter(g => g.status === 'pre');
  const final = games.filter(g => g.status === 'final');
  const sorted = [...live, ...upcoming, ...final];

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface-secondary">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">NBA Today</p>
        <p className="text-[11px] text-secondary">{today}</p>
      </div>

      {/* Live indicator if any */}
      {live.length > 0 && (
        <div className="flex items-center gap-1.5 px-4 py-1.5 bg-positive-bright/5 border-b border-border">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-positive-bright opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-positive-bright" />
          </span>
          <span className="text-[11px] font-semibold text-positive-bright">{live.length} game{live.length > 1 ? 's' : ''} live</span>
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
