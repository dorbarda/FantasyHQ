import { Player } from '@/lib/types';
import PositionBadge from './PositionBadge';

interface PlayerTableProps {
  players: Player[];
}

export default function PlayerTable({ players }: PlayerTableProps) {
  return (
    <div className="border border-[#E4E7ED] rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div className="grid grid-cols-[28px_1fr_48px_48px_48px_48px_60px] gap-x-2 px-4 py-2 border-b border-[#E4E7ED] bg-[#F3F4F6]">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280]">#</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280]">Player</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280] text-right">PTS</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280] text-right">REB</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280] text-right">AST</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280] text-right">3PM</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280] text-right">FP</span>
      </div>

      {players.map((player, idx) => (
        <div
          key={player.id}
          className={`
            grid grid-cols-[28px_1fr_48px_48px_48px_48px_60px] gap-x-2 items-center px-4 py-2.5
            transition-colors cursor-default
            ${idx < players.length - 1 ? 'border-b border-[#E4E7ED]' : ''}
            hover:bg-[#F8F9FB]
          `}
        >
          <span className="text-[12px] font-medium text-[#9CA3AF]">{idx + 1}</span>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <PositionBadge position={player.position} />
              <p className="text-[13px] font-semibold tracking-tight text-[#111827] truncate">{player.name}</p>
            </div>
            <p className="text-[11px] text-[#9CA3AF]">{player.team}</p>
          </div>

          <span className="text-[13px] font-medium text-[#111827] text-right tabular-nums">{player.pts.toFixed(1)}</span>
          <span className="text-[13px] font-medium text-[#111827] text-right tabular-nums">{player.reb.toFixed(1)}</span>
          <span className="text-[13px] font-medium text-[#111827] text-right tabular-nums">{player.ast.toFixed(1)}</span>
          <span className="text-[13px] font-medium text-[#111827] text-right tabular-nums">{player.tpm.toFixed(1)}</span>
          <span className="text-[13px] font-bold text-[#2563EB] text-right tabular-nums">{player.fp.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}
