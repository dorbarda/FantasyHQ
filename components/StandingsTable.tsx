import { StandingEntry } from '@/lib/types';
import StreakBadge from './StreakBadge';

interface StandingsTableProps {
  standings: StandingEntry[];
}

export default function StandingsTable({ standings }: StandingsTableProps) {
  return (
    <div className="border border-[#E4E7ED] rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div className="grid grid-cols-[28px_28px_1fr_72px_64px_64px] gap-x-2 px-4 py-2 border-b border-[#E4E7ED] bg-[#F3F4F6]">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280]">#</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280]">PR</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280]">Team</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280] text-right">W–L</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280] text-right">PTS</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280] text-right">Streak</span>
      </div>

      {standings.map((entry, idx) => (
        <div
          key={entry.teamId}
          className={`
            grid grid-cols-[28px_28px_1fr_72px_64px_64px] gap-x-2 items-center px-4 py-2.5
            transition-colors cursor-default hover:bg-[#F8F9FB]
            ${idx < standings.length - 1 ? 'border-b border-[#E4E7ED]' : ''}
          `}
        >
          {/* Standing rank */}
          <span className={`text-[13px] font-semibold tracking-tight ${entry.rank === 1 ? 'text-[#D97706]' : 'text-[#6B7280]'}`}>
            {entry.rank}
          </span>

          {/* Power rank */}
          <span className={`text-[13px] font-semibold tracking-tight ${
            entry.powerRank <= 3 ? 'text-[#059669]' :
            entry.powerRank >= 8 ? 'text-[#DC2626]' :
            'text-[#6B7280]'
          }`}>
            {entry.powerRank}
          </span>

          {/* Team */}
          <div className="min-w-0">
            <p className="text-[13px] font-semibold tracking-tight truncate text-[#111827]">
              {entry.teamName}
            </p>
            <p className="text-[11px] text-[#9CA3AF] truncate">{entry.ownerName}</p>
          </div>

          {/* W-L */}
          <span className="text-[13px] font-medium text-[#111827] text-right tabular-nums">
            {entry.wins}–{entry.losses}
          </span>

          {/* Points */}
          <span className="text-[13px] font-medium text-[#111827] text-right tabular-nums">
            {entry.points.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </span>

          {/* Streak */}
          <div className="flex justify-end">
            <StreakBadge streak={entry.streak} />
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="px-4 py-2 border-t border-[#E4E7ED] bg-[#F3F4F6] flex items-center gap-3">
        <span className="text-[11px] text-[#6B7280]"><span className="font-semibold">#</span> = Standing rank</span>
        <span className="text-[11px] text-[#6B7280]"><span className="font-semibold">PR</span> = Power rank</span>
      </div>
    </div>
  );
}
