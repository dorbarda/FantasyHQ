'use client';

import { useRouter } from 'next/navigation';

interface DraftYearTabsProps {
  years: number[];
  currentYear: number;
}

function seasonLabel(year: number) {
  return `${year - 1}-${String(year).slice(2)}`;
}

export default function DraftYearTabs({ years, currentYear }: DraftYearTabsProps) {
  const router = useRouter();

  return (
    <div className="flex gap-1.5 flex-wrap">
      {years.map(y => {
        const active = y === currentYear;
        return (
          <button
            key={y}
            onClick={() => router.push(`/draft?year=${y}`)}
            className={`px-3 py-1.5 rounded text-[13px] font-medium transition-colors ${
              active
                ? 'bg-[#111827] text-white'
                : 'bg-white border border-[#E4E7ED] text-[#6B7280] hover:bg-[#F8F9FB] hover:text-[#111827]'
            }`}
          >
            {seasonLabel(y)}
          </button>
        );
      })}
    </div>
  );
}
