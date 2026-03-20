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
    <div className="page-home min-h-screen -mx-4 xl:-mx-8 px-4 xl:px-8 pt-14 pb-10">

      {/* Logo */}
      <div className="text-center mb-10">
        <h1 className="text-[38px] font-black text-white tracking-tight leading-none">
          Shaqtin
        </h1>
        <div className="w-10 h-[3px] bg-[#3B82F6] rounded-full mx-auto my-2" />
        <p className="text-[13px] font-semibold text-[#64748B] tracking-[0.2em] uppercase">
          Fantasy HQ
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="flex items-center justify-center bg-white rounded-xl h-24 px-3 text-[15px] font-bold text-[#111827] text-center transition-all duration-150 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.02] active:scale-95"
          >
            {section.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
