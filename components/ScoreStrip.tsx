import type { Matchup } from '@/lib/types';

interface ScoreStripProps {
  matchups: Matchup[];
  week: number;
  closestMatchupId: string;
}

function statusLabel(m: Matchup) {
  if (m.isLive) return { text: 'Live', live: true };
  if (m.isFinal) return { text: 'Final', live: false };
  return { text: 'Upcoming', live: false };
}

export default function ScoreStrip({ matchups, week, closestMatchupId }: ScoreStripProps) {
  return (
    <div className="bg-surface border-b border-border sticky top-0 z-40">
      <div className="flex items-center overflow-x-auto no-scrollbar gap-1 px-4 py-2">
        {/* Week label */}
        <span className="text-[11px] font-semibold text-muted uppercase tracking-wider shrink-0 pr-3 border-r border-border mr-2">
          Wk {week}
        </span>

        {matchups.map((m) => {
          const { text, live } = statusLabel(m);
          const isClosest = m.id === closestMatchupId;
          const homeLeading = m.home.actualScore > m.away.actualScore;
          const awayLeading = m.away.actualScore > m.home.actualScore;

          return (
            <div
              key={m.id}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg shrink-0 border transition-colors
                ${isClosest
                  ? 'border-accent/50 bg-accent/5'
                  : 'border-border bg-background hover:bg-surface-secondary'
                }
              `}
            >
              {/* Home team */}
              <div className="text-right">
                <p className={`text-[11px] font-semibold leading-tight truncate max-w-[70px] ${homeLeading ? 'text-foreground' : 'text-muted'}`}>
                  {m.home.ownerName}
                </p>
                <p className={`text-[14px] font-bold tabular-nums leading-tight ${homeLeading ? 'text-foreground' : 'text-muted'}`}>
                  {m.home.actualScore > 0 ? m.home.actualScore.toFixed(1) : '—'}
                </p>
              </div>

              {/* Status */}
              <div className="flex flex-col items-center gap-0.5 px-1">
                {live ? (
                  <span className="flex items-center gap-1">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-positive opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-positive" />
                    </span>
                  </span>
                ) : null}
                <span className={`text-[10px] font-semibold uppercase tracking-wide ${
                  live ? 'text-positive-strong' : 'text-muted'
                }`}>
                  {text}
                </span>
                {isClosest && (
                  <span className="text-accent">
                    <svg viewBox="0 0 12 12" fill="currentColor" className="w-2.5 h-2.5">
                      <path d="M6 1l1.3 3h3l-2.4 1.8.9 3L6 7l-2.8 1.8.9-3L1.7 4h3z"/>
                    </svg>
                  </span>
                )}
              </div>

              {/* Away team */}
              <div className="text-left">
                <p className={`text-[11px] font-semibold leading-tight truncate max-w-[70px] ${awayLeading ? 'text-foreground' : 'text-muted'}`}>
                  {m.away.ownerName}
                </p>
                <p className={`text-[14px] font-bold tabular-nums leading-tight ${awayLeading ? 'text-foreground' : 'text-muted'}`}>
                  {m.away.actualScore > 0 ? m.away.actualScore.toFixed(1) : '—'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
