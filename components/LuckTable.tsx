import { LuckTableEntry } from '@/lib/types';

interface LuckTableProps {
  entries: LuckTableEntry[];
}

export default function LuckTable({ entries }: LuckTableProps) {
  const sorted = [...entries].sort((a, b) => b.pf - a.pf);

  return (
    <div className="border border-[#eff3f4] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#eff3f4] bg-[#f7f9f9]">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#536471]">
          טבלת המזלות
        </p>
        <p className="text-[12px] text-[#536471] mt-0.5">
          Points for / against — luck vs. performance
        </p>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_64px_64px_64px_56px_56px_68px] gap-x-2 px-4 py-2 border-b border-[#eff3f4] bg-[#f7f9f9]">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#536471]">Team</span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#536471] text-right">PF</span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#536471] text-right">PA</span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#536471] text-right">Diff</span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#536471] text-right">PF/M</span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#536471] text-right">PA/M</span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#536471] text-right">חילופים/M</span>
      </div>

      {sorted.map((entry, idx) => (
        <div
          key={entry.teamId}
          className={`
            grid grid-cols-[1fr_64px_64px_64px_56px_56px_68px] gap-x-2 items-center px-4 py-3
            transition-colors cursor-default
            ${idx < sorted.length - 1 ? 'border-b border-[#eff3f4]' : ''}
            hover:bg-[#f7f9f9]
          `}
        >
          <div className="min-w-0">
            <p className="text-[14px] font-bold tracking-tight text-[#0f1419] truncate">{entry.teamName}</p>
            <p className="text-[12px] text-[#536471] truncate">{entry.ownerName}</p>
          </div>

          <span className="text-[14px] font-medium text-[#0f1419] text-right tabular-nums">
            {entry.pf.toLocaleString()}
          </span>

          <span className="text-[14px] font-medium text-[#0f1419] text-right tabular-nums">
            {entry.pa.toLocaleString()}
          </span>

          <span className={`text-[14px] font-bold text-right tabular-nums ${
            entry.diff > 0 ? 'text-[#00ba7c]' : entry.diff < 0 ? 'text-[#f4212e]' : 'text-[#536471]'
          }`}>
            {entry.diff > 0 ? '+' : ''}{entry.diff.toLocaleString()}
          </span>

          <span className="text-[13px] font-medium text-[#0f1419] text-right tabular-nums">
            {entry.pfPerMatch.toLocaleString()}
          </span>

          <span className="text-[13px] font-medium text-[#536471] text-right tabular-nums">
            {entry.paPerMatch.toLocaleString()}
          </span>

          <span className="text-[13px] font-medium text-[#536471] text-right tabular-nums">
            {entry.movesPerMatch.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}
