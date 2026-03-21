import { LuckTableEntry } from '@/lib/types';

interface LuckTableProps {
  entries: LuckTableEntry[];
}

export default function LuckTable({ entries }: LuckTableProps) {
  const sorted = [...entries].sort((a, b) => b.pf - a.pf);

  return (
    <div className="border border-[#E2E8F0] rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#F1F5F9]">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8]">
          Points For / Against
        </p>
        <p className="text-[12px] text-[#94A3B8] mt-0.5">
          Luck vs. performance
        </p>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_64px_64px_64px_56px_56px_68px] gap-x-2 px-4 py-2 border-b border-[#E2E8F0] bg-[#F1F5F9]">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8]">Team</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] text-right">PF</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] text-right">PA</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] text-right">Diff</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] text-right">PF/M</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] text-right">PA/M</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] text-right">Moves/M</span>
      </div>

      {sorted.map((entry, idx) => (
        <div
          key={entry.teamId}
          className={`
            grid grid-cols-[1fr_64px_64px_64px_56px_56px_68px] gap-x-2 items-center px-4 py-2.5
            transition-colors cursor-default
            ${idx < sorted.length - 1 ? 'border-b border-[#E2E8F0]' : ''}
            hover:bg-white
          `}
        >
          <div className="min-w-0">
            <p className="text-[13px] font-semibold tracking-tight text-[#0F172A] truncate">{entry.teamName}</p>
            <p className="text-[11px] text-[#475569] truncate">{entry.ownerName}</p>
          </div>

          <span className="text-[13px] font-medium text-[#0F172A] text-right tabular-nums">
            {entry.pf.toLocaleString()}
          </span>

          <span className="text-[13px] font-medium text-[#0F172A] text-right tabular-nums">
            {entry.pa.toLocaleString()}
          </span>

          <span className={`text-[13px] font-semibold text-right tabular-nums ${
            entry.diff > 0 ? 'text-[#34D399]' : entry.diff < 0 ? 'text-[#F87171]' : 'text-[#94A3B8]'
          }`}>
            {entry.diff > 0 ? '+' : ''}{entry.diff.toLocaleString()}
          </span>

          <span className="text-[13px] font-medium text-[#0F172A] text-right tabular-nums">
            {entry.pfPerMatch.toLocaleString()}
          </span>

          <span className="text-[13px] font-medium text-[#94A3B8] text-right tabular-nums">
            {entry.paPerMatch.toLocaleString()}
          </span>

          <span className="text-[13px] font-medium text-[#94A3B8] text-right tabular-nums">
            {entry.movesPerMatch.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}
