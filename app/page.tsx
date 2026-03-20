import Link from 'next/link';

const SECTIONS = [
  {
    href: '/league',
    label: 'League Now',
    description: 'Standings, playoffs & weekly matchups',
    icon: '🏆',
    color: '#1D4ED8',
    bg: '#EFF6FF',
    border: '#BFDBFE',
  },
  {
    href: '/nba',
    label: 'NBA Live',
    description: 'Games today, conference standings & stat leaders',
    icon: '🏀',
    color: '#DC2626',
    bg: '#FEF2F2',
    border: '#FECACA',
  },
  {
    href: '/matchups',
    label: 'Matchups',
    description: 'This week\'s head-to-head results',
    icon: '⚔️',
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#DDD6FE',
  },
  {
    href: '/players',
    label: 'Players',
    description: 'Top fantasy performers this season',
    icon: '⭐',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
  },
  {
    href: '/stats',
    label: 'Season Stats',
    description: 'Category standings, totals & luck table',
    icon: '📊',
    color: '#059669',
    bg: '#ECFDF5',
    border: '#A7F3D0',
  },
  {
    href: '/matchup-depth',
    label: 'Depth',
    description: 'Player usage & score efficiency by week',
    icon: '📈',
    color: '#0891B2',
    bg: '#ECFEFF',
    border: '#A5F3FC',
  },
  {
    href: '/transactions',
    label: 'Moves',
    description: 'Waiver wire adds & manager activity',
    icon: '🔄',
    color: '#BE185D',
    bg: '#FDF2F8',
    border: '#FBCFE8',
  },
  {
    href: '/draft',
    label: 'Draft Board',
    description: 'Draft picks, grades & player performance',
    icon: '📋',
    color: '#6B7280',
    bg: '#F9FAFB',
    border: '#E5E7EB',
  },
  {
    href: '/records',
    label: 'Records',
    description: 'Superlatives, H2H matrix & hall of fame',
    icon: '🎖️',
    color: '#92400E',
    bg: '#FFFBEB',
    border: '#FDE68A',
  },
  {
    href: '/history',
    label: 'History',
    description: 'Past seasons, champions & final standings',
    icon: '📜',
    color: '#374151',
    bg: '#F9FAFB',
    border: '#E5E7EB',
  },
  {
    href: '/rules',
    label: 'Rules',
    description: 'Scoring settings & league bylaws',
    icon: '📖',
    color: '#6B7280',
    bg: '#F9FAFB',
    border: '#E5E7EB',
  },
];

export default function HomePage() {
  return (
    <div className="py-8">
      {/* Hero */}
      <div className="mb-8 text-center">
        <h1 className="text-[32px] font-bold tracking-tight text-[#111827]">Fantasy HQ</h1>
        <p className="text-[15px] text-[#6B7280] font-medium mt-1">
          Your private NBA fantasy basketball dashboard
        </p>
      </div>

      {/* Featured top two — larger cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {SECTIONS.slice(0, 2).map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group flex items-center gap-4 rounded-2xl border p-5 transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
            style={{
              borderColor: section.border,
              backgroundColor: section.bg,
            }}
          >
            <span className="text-[40px] shrink-0 select-none">{section.icon}</span>
            <div className="min-w-0">
              <p
                className="text-[17px] font-bold leading-tight"
                style={{ color: section.color }}
              >
                {section.label}
              </p>
              <p className="text-[13px] text-[#6B7280] mt-0.5 leading-snug">
                {section.description}
              </p>
            </div>
            <span
              className="ml-auto text-[18px] shrink-0 transition-transform group-hover:translate-x-1"
              style={{ color: section.color }}
            >
              →
            </span>
          </Link>
        ))}
      </div>

      {/* Rest of the sections — smaller grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SECTIONS.slice(2).map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group flex items-center gap-3 rounded-2xl border p-4 transition-all hover:shadow-sm hover:-translate-y-0.5 active:scale-[0.98]"
            style={{
              borderColor: section.border,
              backgroundColor: section.bg,
            }}
          >
            <span className="text-[28px] shrink-0 select-none">{section.icon}</span>
            <div className="min-w-0 flex-1">
              <p
                className="text-[14px] font-bold leading-tight"
                style={{ color: section.color }}
              >
                {section.label}
              </p>
              <p className="text-[12px] text-[#6B7280] mt-0.5 leading-snug truncate">
                {section.description}
              </p>
            </div>
            <span
              className="text-[14px] shrink-0 transition-transform group-hover:translate-x-0.5 text-[#D1D5DB]"
            >
              →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
