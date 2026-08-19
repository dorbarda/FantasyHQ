import { Player } from '@/lib/types';
import PositionBadge from './PositionBadge';

interface PlayerTableProps {
  players: Player[];
}

export default function PlayerTable({ players }: PlayerTableProps) {
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-surface">
      {/* Header */}
      <div className="grid grid-cols-[28px_1fr_48px_48px_48px_48px_60px] gap-x-2 px-4 py-2 border-b border-border bg-surface-secondary">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">#</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">Player</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted text-right">PTS</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted text-right">REB</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted text-right">AST</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted text-right">3PM</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted text-right">FP</span>
      </div>

      {players.map((player, idx) => (
        <div
          key={player.id}
          className={`
            grid grid-cols-[28px_1fr_48px_48px_48px_48px_60px] gap-x-2 items-center px-4 py-2.5
            transition-colors cursor-default
            ${idx < players.length - 1 ? 'border-b border-border' : ''}
            hover:bg-surface
          `}
        >
          <span className="text-[12px] font-medium text-secondary">{idx + 1}</span>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <PositionBadge position={player.position} />
              <p className="text-[13px] font-semibold tracking-tight text-foreground truncate">{player.name}</p>
            </div>
            <p className="text-[11px] text-secondary">{player.team}</p>
          </div>

          <span className="text-[13px] font-medium text-foreground text-right tabular-nums">{player.pts.toFixed(1)}</span>
          <span className="text-[13px] font-medium text-foreground text-right tabular-nums">{player.reb.toFixed(1)}</span>
          <span className="text-[13px] font-medium text-foreground text-right tabular-nums">{player.ast.toFixed(1)}</span>
          <span className="text-[13px] font-medium text-foreground text-right tabular-nums">{player.tpm.toFixed(1)}</span>
          <span className="text-[13px] font-bold text-accent text-right tabular-nums">{player.fp.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}
