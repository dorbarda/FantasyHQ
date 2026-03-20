import { StandingEntry } from '@/lib/types';
import StreakBadge from './StreakBadge';

interface StandingsTableProps {
  standings: StandingEntry[];
}

export default function StandingsTable({ standings }: StandingsTableProps) {
  return (
    <div className="border border-[#1E3050] rounded-lg overflow-hidden bg-[#142035]">
      {/* Header */}
      <div className="grid grid-cols-[28px_28px_1fr_72px_64px_64px] gap-x-2 px-4 py-2 border-b border-[#1E3050] bg-[#0E1929]">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8]">#</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8]">PR</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8]">Team</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] text-right">W–L</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] text-right">PTS</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] text-right">Streak</span>
      </div>

      {standings.map((entry, idx) => (
        <div
          key={entry.teamId}
          className={`
            grid grid-cols-[28px_28px_1fr_72px_64px_64px] gap-x-2 items-center px-4 py-2.5
            transition-colors cursor-default hover:bg-[#0B1628]
            ${idx < standings.length - 1 ? 'border-b border-[#1E3050]' : ''}
          `}
        >
          {/* Standing rank */}
          <span className={`text-[13px] font-semibold tracking-tight ${entry.rank === 1 ? 'text-[#FB923C]' : 'text-[#94A3B8]'}`}>
            {entry.rank}
          </span>

          {/* Power rank */}
          <span className={`text-[13px] font-semibold tracking-tight ${
            entry.powerRank <= 3 ? 'text-[#34D399]' :
            entry.powerRank >= 8 ? 'text-[#F87171]' :
            'text-[#94A3B8]'
          }`}>
            {entry.powerRank}
          </span>

          {/* Team */}
          <div className="min-w-0">
            <p className="text-[13px] font-semibold tracking-tight truncate text-[#F0F4F8]">
              {entry.teamName}
            </p>
            <p className="text-[11px] text-[#64748B] truncate">{entry.ownerName}</p>
          </div>

          {/* W-L */}
          <span className="text-[13px] font-medium text-[#F0F4F8] text-right tabular-nums">
            {entry.wins}–{entry.losses}
          </span>

          {/* Points */}
          <span className="text-[13px] font-medium text-[#F0F4F8] text-right tabular-nums">
            {entry.points.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </span>

          {/* Streak */}
          <div className="flex justify-end">
            <StreakBadge streak={entry.streak} />
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="px-4 py-2 border-t border-[#1E3050] bg-[#0E1929] flex items-center gap-3">
        <span className="text-[11px] text-[#94A3B8]"><span className="font-semibold">#</span> = Standing rank</span>
        <span className="text-[11px] text-[#94A3B8]"><span className="font-semibold">PR</span> = Power rank</span>
      </div>
    </div>
  );
}
