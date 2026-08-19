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
                ? 'bg-panel-border text-white'
                : 'bg-surface border border-border text-muted hover:bg-surface hover:text-foreground'
            }`}
          >
            {seasonLabel(y)}
          </button>
        );
      })}

      {/* Divider */}
      <span className="w-px h-5 bg-border mx-1" />

      {/* Player History tab */}
      <button
        onClick={() => router.push('/draft?view=history')}
        className={`px-3 py-1.5 rounded text-[13px] font-medium transition-colors ${
          isHistory
            ? 'bg-panel-border text-white'
            : 'bg-surface border border-border text-muted hover:bg-surface hover:text-foreground'
        }`}
      >
        Player History
      </button>

      {/* Value Analysis tab */}
      <button
        onClick={() => router.push(`/draft?year=${currentYear}&view=value`)}
        className={`px-3 py-1.5 rounded text-[13px] font-medium transition-colors ${
          view === 'value'
            ? 'bg-panel-border text-white'
            : 'bg-surface border border-border text-muted hover:bg-surface hover:text-foreground'
        }`}
      >
        Value Analysis
      </button>
    </div>
  );
}
