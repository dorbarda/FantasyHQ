import { Player } from '@/lib/types';
import PositionBadge from './PositionBadge';

interface PlayerTableProps {
  players: Player[];
}

export default function PlayerTable({ players }: PlayerTableProps) {
  return (
    <div className="border border-[#1E3050] rounded-lg overflow-hidden bg-[#142035]">
      {/* Header */}
      <div className="grid grid-cols-[28px_1fr_48px_48px_48px_48px_60px] gap-x-2 px-4 py-2 border-b border-[#1E3050] bg-[#0E1929]">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8]">#</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8]">Player</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] text-right">PTS</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] text-right">REB</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] text-right">AST</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] text-right">3PM</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] text-right">FP</span>
      </div>

      {players.map((player, idx) => (
        <div
          key={player.id}
          className={`
            grid grid-cols-[28px_1fr_48px_48px_48px_48px_60px] gap-x-2 items-center px-4 py-2.5
            transition-colors cursor-default
            ${idx < players.length - 1 ? 'border-b border-[#1E3050]' : ''}
            hover:bg-[#0B1628]
          `}
        >
          <span className="text-[12px] font-medium text-[#64748B]">{idx + 1}</span>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <PositionBadge position={player.position} />
              <p className="text-[13px] font-semibold tracking-tight text-[#F0F4F8] truncate">{player.name}</p>
            </div>
            <p className="text-[11px] text-[#64748B]">{player.team}</p>
          </div>

          <span className="text-[13px] font-medium text-[#F0F4F8] text-right tabular-nums">{player.pts.toFixed(1)}</span>
          <span className="text-[13px] font-medium text-[#F0F4F8] text-right tabular-nums">{player.reb.toFixed(1)}</span>
          <span className="text-[13px] font-medium text-[#F0F4F8] text-right tabular-nums">{player.ast.toFixed(1)}</span>
          <span className="text-[13px] font-medium text-[#F0F4F8] text-right tabular-nums">{player.tpm.toFixed(1)}</span>
          <span className="text-[13px] font-bold text-[#C8956C] text-right tabular-nums">{player.fp.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}
