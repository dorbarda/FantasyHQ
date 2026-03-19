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
          className="border border-[#eff3f4] rounded-2xl px-4 py-3 hover:bg-[#f7f9f9] transition-colors"
        >
          <div className="flex items-start gap-3">
            <span className="text-[24px] leading-none mt-0.5">{s.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#536471] mb-0.5">
                {s.label}
              </p>
              <p className="text-[20px] font-black tracking-tight text-[#0f1419] leading-tight">
                {s.value}
              </p>
              <p className="text-[13px] font-bold text-[#0f1419] mt-0.5 truncate">
                {s.teamName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-[12px] text-[#536471] truncate">{s.ownerName}</p>
                <span className="text-[#eff3f4]">·</span>
                <p className="text-[12px] text-[#536471] shrink-0">{s.context}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
