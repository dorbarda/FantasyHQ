import { Superlative } from '@/lib/types';

interface SuperlativesGridProps {
  superlatives: Superlative[];
}

export default function SuperlativesGrid({ superlatives }: SuperlativesGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {superlatives.map((s) => (
        <div
          key={s.label}
          className="border border-[#1E3050] rounded-lg px-4 py-3 bg-[#142035] hover:bg-[#0B1628] transition-colors"
        >
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-0.5">
              {s.label}
            </p>
            <p className="text-[20px] font-bold tracking-tight text-[#F0F4F8] leading-tight">
              {s.value}
            </p>
            <p className="text-[13px] font-semibold text-[#F0F4F8] mt-0.5 truncate">
              {s.teamName}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-[12px] text-[#94A3B8] truncate">{s.ownerName}</p>
              <span className="text-[#E4E7ED]">·</span>
              <p className="text-[12px] text-[#94A3B8] shrink-0">{s.context}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
