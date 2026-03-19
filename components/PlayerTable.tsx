import { Player } from '@/lib/types';
import PositionBadge from './PositionBadge';

interface PlayerTableProps {
  players: Player[];
}

export default function PlayerTable({ players }: PlayerTableProps) {
  return (
    <div className="border border-[#eff3f4] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[28px_1fr_48px_48px_48px_48px_60px] gap-x-2 px-4 py-2 border-b border-[#eff3f4] bg-[#f7f9f9]">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#536471]">#</span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#536471]">Player</span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#536471] text-right">PTS</span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#536471] text-right">REB</span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#536471] text-right">AST</span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#536471] text-right">3PM</span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#536471] text-right">FP</span>
      </div>

      {/* Rows */}
      {players.map((player, idx) => (
        <div
          key={player.id}
          className={`
            grid grid-cols-[28px_1fr_48px_48px_48px_48px_60px] gap-x-2 items-center px-4 py-3
            transition-colors cursor-default
            ${idx < players.length - 1 ? 'border-b border-[#eff3f4]' : ''}
            hover:bg-[#f7f9f9]
          `}
        >
          <span className="text-[13px] font-medium text-[#536471]">{idx + 1}</span>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <PositionBadge position={player.position} />
              <p className="text-[14px] font-bold tracking-tight text-[#0f1419] truncate">{player.name}</p>
            </div>
            <p className="text-[11px] text-[#536471] font-medium">{player.team}</p>
          </div>

          <span className="text-[14px] font-medium text-[#0f1419] text-right">{player.pts.toFixed(1)}</span>
          <span className="text-[14px] font-medium text-[#0f1419] text-right">{player.reb.toFixed(1)}</span>
          <span className="text-[14px] font-medium text-[#0f1419] text-right">{player.ast.toFixed(1)}</span>
          <span className="text-[14px] font-medium text-[#0f1419] text-right">{player.tpm.toFixed(1)}</span>
          <span className="text-[14px] font-bold text-[#1d9bf0] text-right">{player.fp.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}
