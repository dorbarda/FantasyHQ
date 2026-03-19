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
    <div className="flex gap-1 flex-wrap">
      {years.map(y => {
        const active = y === currentYear;
        return (
          <button
            key={y}
            onClick={() => router.push(`/draft?year=${y}`)}
            className={`px-3 py-1.5 rounded-full text-[13px] font-bold transition-colors ${
              active
                ? 'bg-[#0f1419] text-white'
                : 'bg-[#eff3f4] text-[#536471] hover:bg-[#e7e7e7]'
            }`}
          >
            {seasonLabel(y)}
          </button>
        );
      })}
    </div>
  );
}
