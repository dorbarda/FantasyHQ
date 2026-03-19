import { OwnerCareer } from '@/lib/types';

interface HallOfFameProps {
  careers: OwnerCareer[];
}

function trophies(n: number) {
  if (n === 0) return null;
  return Array.from({ length: n }, (_, i) => (
    <span key={i} className="text-[14px]">🏆</span>
  ));
}

export default function HallOfFame({ careers }: HallOfFameProps) {
  return (
    <div className="border border-[#eff3f4] rounded-2xl overflow-hidden">
      {/* Column headers */}
      <div className="grid grid-cols-[1fr_60px_72px_56px_72px_72px] gap-x-2 px-4 py-2 border-b border-[#eff3f4] bg-[#f7f9f9]">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#536471]">Owner</span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#536471] text-right">🏆</span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#536471] text-right">W–L</span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#536471] text-right">Win%</span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#536471] text-right">Avg/Wk</span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#536471] text-right">Best</span>
      </div>

      {careers.map((c, idx) => (
        <div
          key={c.ownerName}
          className={`
            grid grid-cols-[1fr_60px_72px_56px_72px_72px] gap-x-2 items-center px-4 py-3
            transition-colors hover:bg-[#f7f9f9]
            ${idx < careers.length - 1 ? 'border-b border-[#eff3f4]' : ''}
            ${c.championships > 0 ? 'bg-[#ff7a00]/[0.02]' : ''}
          `}
        >
          {/* Owner */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[14px] font-bold text-[#0f1419] truncate">{c.ownerName}</p>
              {idx === 0 && c.championships > 0 && (
                <span className="text-[10px] font-bold text-[#ff7a00] bg-[#ff7a00]/10 rounded px-1.5 py-0.5 shrink-0">
                  GOAT
                </span>
              )}
            </div>
            <p className="text-[12px] text-[#536471]">{c.seasonsPlayed} season{c.seasonsPlayed !== 1 ? 's' : ''}</p>
          </div>

          {/* Championships */}
          <div className="flex justify-end items-center gap-0.5">
            {c.championships > 0 ? (
              trophies(Math.min(c.championships, 3))
            ) : (
              <span className="text-[13px] text-[#eff3f4]">—</span>
            )}
            {c.championships > 3 && (
              <span className="text-[11px] font-bold text-[#ff7a00]">×{c.championships}</span>
            )}
          </div>

          {/* W-L */}
          <span className="text-[13px] font-medium text-[#0f1419] text-right tabular-nums">
            {c.totalWins}–{c.totalLosses}
          </span>

          {/* Win% */}
          <span className={`text-[13px] font-bold text-right tabular-nums ${
            c.winPct >= 55 ? 'text-[#00ba7c]' :
            c.winPct >= 45 ? 'text-[#0f1419]' :
            'text-[#f4212e]'
          }`}>
            {c.winPct.toFixed(1)}%
          </span>

          {/* Avg weekly score */}
          <span className="text-[13px] font-medium text-[#0f1419] text-right tabular-nums">
            {c.avgWeeklyScore.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </span>

          {/* Best season record */}
          <span className="text-[13px] font-medium text-[#536471] text-right tabular-nums">
            {c.bestSeasonRecord}
          </span>
        </div>
      ))}
    </div>
  );
}
