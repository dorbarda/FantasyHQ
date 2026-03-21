import Image from 'next/image';
import { StandingEntry } from '@/lib/types';
import { teamLogoSrc } from '@/lib/team-logos';
import StreakBadge from './StreakBadge';

interface StandingsTableProps {
  standings: StandingEntry[];
}

export default function StandingsTable({ standings }: StandingsTableProps) {
  return (
    <div className="border border-[#E2E8F0] rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div className="grid grid-cols-[28px_28px_36px_1fr_72px_64px_64px] gap-x-2 px-4 py-2 border-b border-[#E2E8F0] bg-[#F1F5F9]">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8]">#</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8]">PR</span>
        <span />
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8]">Team</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] text-right">W–L</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] text-right">PTS</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] text-right">Streak</span>
      </div>

      {standings.map((entry, idx) => (
        <div
          key={entry.teamId}
          className={`
            grid grid-cols-[28px_28px_36px_1fr_72px_64px_64px] gap-x-2 items-center px-4 py-2.5
            transition-colors cursor-default hover:bg-white
            ${idx < standings.length - 1 ? 'border-b border-[#E2E8F0]' : ''}
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

          {/* Avatar */}
          {(() => {
            const src = teamLogoSrc(entry.teamName);
            return src ? (
              <Image src={src} alt={entry.teamName} width={28} height={28} className="rounded-full object-cover object-top w-7 h-7" />
            ) : <span />;
          })()}

          {/* Team */}
          <div className="min-w-0">
            <p className="text-[13px] font-semibold tracking-tight truncate text-[#0F172A]">
              {entry.teamName}
            </p>
            <p className="text-[11px] text-[#475569] truncate">{entry.ownerName}</p>
          </div>

          {/* W-L */}
          <span className="text-[13px] font-medium text-[#0F172A] text-right tabular-nums">
            {entry.wins}–{entry.losses}
          </span>

          {/* Points */}
          <span className="text-[13px] font-medium text-[#0F172A] text-right tabular-nums">
            {entry.points.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </span>

          {/* Streak */}
          <div className="flex justify-end">
            <StreakBadge streak={entry.streak} />
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="px-4 py-2 border-t border-[#E2E8F0] bg-[#F1F5F9] flex items-center gap-3">
        <span className="text-[11px] text-[#94A3B8]"><span className="font-semibold">#</span> = Standing rank</span>
        <span className="text-[11px] text-[#94A3B8]"><span className="font-semibold">PR</span> = Power rank</span>
      </div>
    </div>
  );
}
