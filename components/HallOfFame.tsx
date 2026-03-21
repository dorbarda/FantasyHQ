import { OwnerCareer } from '@/lib/types';

interface HallOfFameProps {
  careers: OwnerCareer[];
}

export default function HallOfFame({ careers }: HallOfFameProps) {
  return (
    <div className="border border-[#E2E8F0] rounded-lg overflow-hidden bg-white">
      {/* Column headers */}
      <div className="grid grid-cols-[1fr_60px_72px_56px_72px_72px] gap-x-2 px-4 py-2 border-b border-[#E2E8F0] bg-[#F1F5F9]">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8]">Owner</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] text-right">Titles</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] text-right">W–L</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] text-right">Win%</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] text-right">Avg/Wk</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] text-right">Best</span>
      </div>

      {careers.map((c, idx) => (
        <div
          key={c.ownerName}
          className={`
            grid grid-cols-[1fr_60px_72px_56px_72px_72px] gap-x-2 items-center px-4 py-2.5
            transition-colors hover:bg-white
            ${idx < careers.length - 1 ? 'border-b border-[#E2E8F0]' : ''}
          `}
        >
          {/* Owner */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[13px] font-semibold text-[#0F172A] truncate">{c.ownerName}</p>
              {idx === 0 && c.championships > 0 && (
                <span className="text-[10px] font-bold text-[#FB923C] bg-[#FB923C]/10 rounded px-1.5 py-0.5 shrink-0">
                  GOAT
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#475569]">{c.seasonsPlayed} season{c.seasonsPlayed !== 1 ? 's' : ''}</p>
          </div>

          {/* Championships */}
          <div className="flex justify-end items-center">
            {c.championships > 0 ? (
              <span className="text-[13px] font-bold text-[#FB923C] tabular-nums">{c.championships}</span>
            ) : (
              <span className="text-[13px] text-[#E4E7ED]">—</span>
            )}
          </div>

          {/* W-L */}
          <span className="text-[13px] font-medium text-[#0F172A] text-right tabular-nums">
            {c.totalWins}–{c.totalLosses}
          </span>

          {/* Win% */}
          <span className={`text-[13px] font-semibold text-right tabular-nums ${
            c.winPct >= 55 ? 'text-[#34D399]' :
            c.winPct >= 45 ? 'text-[#0F172A]' :
            'text-[#F87171]'
          }`}>
            {c.winPct.toFixed(1)}%
          </span>

          {/* Avg weekly score */}
          <span className="text-[13px] font-medium text-[#0F172A] text-right tabular-nums">
            {c.avgWeeklyScore.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </span>

          {/* Best season record */}
          <span className="text-[13px] font-medium text-[#94A3B8] text-right tabular-nums">
            {c.bestSeasonRecord}
          </span>
        </div>
      ))}
    </div>
  );
}
