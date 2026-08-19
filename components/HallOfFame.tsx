import { OwnerCareer } from '@/lib/types';

interface HallOfFameProps {
  careers: OwnerCareer[];
}

export default function HallOfFame({ careers }: HallOfFameProps) {
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-surface">
      {/* Column headers */}
      <div className="grid grid-cols-[1fr_60px_72px_56px_72px_72px] gap-x-2 px-4 py-2 border-b border-border bg-surface-secondary">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">Owner</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted text-right">Titles</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted text-right">W–L</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted text-right">Win%</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted text-right">Avg/Wk</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted text-right">Best</span>
      </div>

      {careers.map((c, idx) => (
        <div
          key={c.ownerName}
          className={`
            grid grid-cols-[1fr_60px_72px_56px_72px_72px] gap-x-2 items-center px-4 py-2.5
            transition-colors hover:bg-surface
            ${idx < careers.length - 1 ? 'border-b border-border' : ''}
          `}
        >
          {/* Owner */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[13px] font-semibold text-foreground truncate">{c.ownerName}</p>
              {idx === 0 && c.championships > 0 && (
                <span className="text-[10px] font-bold text-warning-bright bg-warning-bright/10 rounded px-1.5 py-0.5 shrink-0">
                  GOAT
                </span>
              )}
            </div>
            <p className="text-[11px] text-secondary">{c.seasonsPlayed} season{c.seasonsPlayed !== 1 ? 's' : ''}</p>
          </div>

          {/* Championships */}
          <div className="flex justify-end items-center">
            {c.championships > 0 ? (
              <span className="text-[13px] font-bold text-warning-bright tabular-nums">{c.championships}</span>
            ) : (
              <span className="text-[13px] text-border">—</span>
            )}
          </div>

          {/* W-L */}
          <span className="text-[13px] font-medium text-foreground text-right tabular-nums">
            {c.totalWins}–{c.totalLosses}
          </span>

          {/* Win% */}
          <span className={`text-[13px] font-semibold text-right tabular-nums ${
            c.winPct >= 55 ? 'text-positive-bright' :
            c.winPct >= 45 ? 'text-foreground' :
            'text-negative-bright'
          }`}>
            {c.winPct.toFixed(1)}%
          </span>

          {/* Avg weekly score */}
          <span className="text-[13px] font-medium text-foreground text-right tabular-nums">
            {c.avgWeeklyScore.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </span>

          {/* Best season record */}
          <span className="text-[13px] font-medium text-muted text-right tabular-nums">
            {c.bestSeasonRecord}
          </span>
        </div>
      ))}
    </div>
  );
}
