import Link from 'next/link';

const SECTIONS = [
  {
    href: '/league',
    label: 'League Now',
    description: 'Standings, playoffs & weekly matchups',
    accent: '#1D4ED8',
  },
  {
    href: '/nba',
    label: 'NBA Live',
    description: 'Games today, conference standings & stat leaders',
    accent: '#DC2626',
  },
  {
    href: '/matchups',
    label: 'Matchups',
    description: "This week's head-to-head results",
    accent: '#7C3AED',
  },
  {
    href: '/stats',
    label: 'Season Stats',
    description: 'Category standings, totals & luck table',
    accent: '#059669',
  },
  {
    href: '/matchup-depth',
    label: 'Depth',
    description: 'Player usage & score efficiency by week',
    accent: '#0891B2',
  },
  {
    href: '/transactions',
    label: 'Moves',
    description: 'Waiver wire adds & manager activity',
    accent: '#BE185D',
  },
  {
    href: '/draft',
    label: 'Draft Board',
    description: 'Draft picks, grades & player performance',
    accent: '#374151',
  },
  {
    href: '/records',
    label: 'Records',
    description: 'Superlatives, H2H matrix & hall of fame',
    accent: '#92400E',
  },
  {
    href: '/history',
    label: 'History',
    description: 'Past seasons, champions & final standings',
    accent: '#374151',
  },
  {
    href: '/rules',
    label: 'Rules',
    description: 'Scoring settings & league bylaws',
    accent: '#6B7280',
  },
];

export default function HomePage() {
  return (
    <div className="py-8">
      {/* Hero */}
      <div className="mb-6 text-center">
        <h1 className="text-[28px] font-bold tracking-tight text-[#111827]">Fantasy HQ</h1>
        <p className="text-[14px] text-[#6B7280] font-medium mt-1">
          NBA fantasy basketball dashboard
        </p>
      </div>

      {/* 2-column grid — all screen sizes */}
      <div className="grid grid-cols-2 gap-3">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group flex flex-col rounded-xl border border-[#E4E7ED] bg-white overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
          >
            {/* Colored top accent bar */}
            <div className="h-[3px] w-full" style={{ backgroundColor: section.accent }} />

            <div className="flex flex-col gap-1 p-4 flex-1">
              <p
                className="text-[14px] font-bold leading-tight"
                style={{ color: section.accent }}
              >
                {section.label}
              </p>
              <p className="text-[12px] text-[#6B7280] leading-snug">
                {section.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
