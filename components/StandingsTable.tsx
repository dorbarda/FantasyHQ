import { StandingEntry } from '@/lib/types';
import StreakBadge from './StreakBadge';

interface StandingsTableProps {
  standings: StandingEntry[];
}

export default function StandingsTable({ standings }: StandingsTableProps) {
  return (
    <div className="border border-[#eff3f4] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[28px_28px_1fr_72px_64px_64px] gap-x-2 px-4 py-2 border-b border-[#eff3f4] bg-[#f7f9f9]">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#536471]">#</span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#536471]">PR</span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#536471]">Team</span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#536471] text-right">W–L</span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#536471] text-right">PTS</span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#536471] text-right">Streak</span>
      </div>

      {standings.map((entry, idx) => (
        <div
          key={entry.teamId}
          className={`
            grid grid-cols-[28px_28px_1fr_72px_64px_64px] gap-x-2 items-center px-4 py-3
            transition-colors cursor-default
            ${idx < standings.length - 1 ? 'border-b border-[#eff3f4]' : ''}
            ${entry.isYou ? 'bg-[#1d9bf0]/[0.03] hover:bg-[#1d9bf0]/[0.06]' : 'hover:bg-[#f7f9f9]'}
          `}
        >
          {/* Standing rank */}
          <span className={`text-[14px] font-bold tracking-tight ${entry.rank === 1 ? 'text-[#ff7a00]' : 'text-[#536471]'}`}>
            {entry.rank}
          </span>

          {/* Power rank */}
          <span className={`text-[13px] font-bold tracking-tight ${
            entry.powerRank <= 3 ? 'text-[#00ba7c]' :
            entry.powerRank >= 8 ? 'text-[#f4212e]' :
            'text-[#536471]'
          }`}>
            {entry.powerRank}
          </span>

          {/* Team */}
          <div className="min-w-0 flex items-center gap-1.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[#f7f9f9] border ${entry.isYou ? 'border-[#1d9bf0]' : 'border-[#eff3f4]'}`}>
              <span className="text-[13px]">🏀</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <p className={`text-[14px] font-bold tracking-tight truncate ${entry.isYou ? 'text-[#1d9bf0]' : 'text-[#0f1419]'}`}>
                  {entry.teamName}
                </p>
                {entry.isYou && (
                  <span className="text-[10px] font-bold text-[#1d9bf0] bg-[#1d9bf0]/10 rounded px-1 py-0.5 shrink-0">You</span>
                )}
              </div>
              <p className="text-[12px] text-[#536471] font-medium truncate">{entry.ownerName}</p>
            </div>
          </div>

          {/* W-L */}
          <span className="text-[14px] font-medium text-[#0f1419] text-right tabular-nums">
            {entry.wins}–{entry.losses}
          </span>

          {/* Points */}
          <span className="text-[14px] font-medium text-[#0f1419] text-right tabular-nums">
            {entry.points.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </span>

          {/* Streak */}
          <div className="flex justify-end">
            <StreakBadge streak={entry.streak} />
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="px-4 py-2 border-t border-[#eff3f4] bg-[#f7f9f9] flex items-center gap-3">
        <span className="text-[11px] text-[#536471]"><span className="font-bold">#</span> = Standing rank</span>
        <span className="text-[11px] text-[#536471]"><span className="font-bold">PR</span> = Power rank</span>
      </div>
    </div>
  );
}
