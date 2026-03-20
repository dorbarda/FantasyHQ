import Link from 'next/link';

const SECTIONS = [
  { href: '/league',        label: 'League Now'   },
  { href: '/nba',           label: 'NBA Live'      },
  { href: '/matchups',      label: 'Matchups'      },
  { href: '/stats',         label: 'Season Stats'  },
  { href: '/matchup-depth', label: 'Depth'         },
  { href: '/transactions',  label: 'Moves'         },
  { href: '/draft',         label: 'Draft Board'   },
  { href: '/records',       label: 'Records'       },
  { href: '/history',       label: 'History'       },
  { href: '/rules',         label: 'Rules'         },
];

export default function HomePage() {
  return (
    <div className="py-8">
      <div className="grid grid-cols-2 gap-3">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="flex items-center justify-center rounded-xl border border-[#E4E7ED] bg-white h-24 transition-all hover:shadow-sm hover:border-[#D1D5DB] active:scale-[0.98]"
          >
            <span className="text-[16px] font-bold text-[#111827] text-center px-3">
              {section.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
