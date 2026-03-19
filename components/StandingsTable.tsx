import { StandingEntry } from '@/lib/types';
import StreakBadge from './StreakBadge';

interface StandingsTableProps {
  standings: StandingEntry[];
}

export default function StandingsTable({ standings }: StandingsTableProps) {
  return (
    <div className="border border-[#eff3f4] rounded-2xl overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-[32px_1fr_80px_80px_80px] gap-x-2 px-4 py-2 border-b border-[#eff3f4] bg-[#f7f9f9]">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#536471]">#</span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#536471]">Team</span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#536471] text-right">W–L</span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#536471] text-right">PTS</span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#536471] text-right">Streak</span>
      </div>

      {/* Table rows */}
      {standings.map((entry, idx) => (
        <div
          key={entry.teamId}
          className={`
            grid grid-cols-[32px_1fr_80px_80px_80px] gap-x-2 items-center px-4 py-3
            transition-colors cursor-default
            ${idx < standings.length - 1 ? 'border-b border-[#eff3f4]' : ''}
            ${entry.isYou ? 'bg-[#1d9bf0]/[0.03] hover:bg-[#1d9bf0]/[0.06]' : 'hover:bg-[#f7f9f9]'}
          `}
        >
          {/* Rank */}
          <span
            className={`
              text-[14px] font-bold tracking-tight
              ${entry.rank === 1 ? 'text-[#ff7a00]' : 'text-[#536471]'}
            `}
          >
            {entry.rank}
          </span>

          {/* Team info */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              {/* Avatar */}
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center shrink-0
                  bg-[#f7f9f9] border
                  ${entry.isYou ? 'border-[#1d9bf0]' : 'border-[#eff3f4]'}
                `}
              >
                <span className="text-[14px]">🏀</span>
              </div>
              <div className="min-w-0">
                <p
                  className={`
                    text-[14px] font-bold tracking-tight truncate
                    ${entry.isYou ? 'text-[#1d9bf0]' : 'text-[#0f1419]'}
                  `}
                >
                  {entry.teamName}
                </p>
                <div className="flex items-center gap-1">
                  <p className="text-[12px] text-[#536471] font-medium truncate">{entry.ownerName}</p>
                  {entry.isYou && (
                    <span className="text-[10px] font-bold text-[#1d9bf0] bg-[#1d9bf0]/10 rounded px-1 py-0.5 shrink-0">
                      You
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* W-L */}
          <span className="text-[14px] font-medium text-[#0f1419] text-right">
            {entry.wins}–{entry.losses}
          </span>

          {/* Points */}
          <span className="text-[14px] font-medium text-[#0f1419] text-right">
            {entry.points.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </span>

          {/* Streak */}
          <div className="flex justify-end">
            <StreakBadge streak={entry.streak} />
          </div>
        </div>
      ))}
    </div>
  );
}
