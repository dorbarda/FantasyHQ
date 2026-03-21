'use client';

import { useRouter } from 'next/navigation';

interface DraftYearTabsProps {
  years: number[];
  currentYear: number;
  view?: string;
}

function seasonLabel(year: number) {
  return `${year - 1}-${String(year).slice(2)}`;
}

export default function DraftYearTabs({ years, currentYear, view }: DraftYearTabsProps) {
  const router = useRouter();
  const isHistory = view === 'history';

  return (
    <div className="flex gap-1.5 flex-wrap items-center">
      {years.map(y => {
        const active = !isHistory && y === currentYear;
        return (
          <button
            key={y}
            onClick={() => router.push(`/draft?year=${y}`)}
            className={`px-3 py-1.5 rounded text-[13px] font-medium transition-colors ${
              active
                ? 'bg-[#2A4066] text-white'
                : 'bg-[#142035] border border-[#1E3050] text-[#94A3B8] hover:bg-[#0B1628] hover:text-[#F0F4F8]'
            }`}
          >
            {seasonLabel(y)}
          </button>
        );
      })}

      {/* Divider */}
      <span className="w-px h-5 bg-[#1E3050] mx-1" />

      {/* Player History tab */}
      <button
        onClick={() => router.push('/draft?view=history')}
        className={`px-3 py-1.5 rounded text-[13px] font-medium transition-colors ${
          isHistory
            ? 'bg-[#2A4066] text-white'
            : 'bg-[#142035] border border-[#1E3050] text-[#94A3B8] hover:bg-[#0B1628] hover:text-[#F0F4F8]'
        }`}
      >
        Player History
      </button>

      {/* Value Analysis tab */}
      <button
        onClick={() => router.push(`/draft?year=${currentYear}&view=value`)}
        className={`px-3 py-1.5 rounded text-[13px] font-medium transition-colors ${
          view === 'value'
            ? 'bg-[#2A4066] text-white'
            : 'bg-[#142035] border border-[#1E3050] text-[#94A3B8] hover:bg-[#0B1628] hover:text-[#F0F4F8]'
        }`}
      >
        Value Analysis
      </button>
    </div>
  );
}
