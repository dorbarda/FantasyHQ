import Link from 'next/link';
import Image from 'next/image';

// ─── Icons ────────────────────────────────────────────────────────────────────

function LeagueIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="8" y="28" width="8" height="12" rx="1.5" fill="#C8956C" opacity="0.9"/>
      <rect x="20" y="18" width="8" height="22" rx="1.5" fill="#C8956C"/>
      <rect x="32" y="22" width="8" height="18" rx="1.5" fill="#C8956C" opacity="0.7"/>
      <path d="M9 26l11-10 10 6 11-10" stroke="#E8B88A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function MatchupsIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <circle cx="24" cy="24" r="12" stroke="#C8956C" strokeWidth="2"/>
      <path d="M12 24h24" stroke="#C8956C" strokeWidth="2"/>
      <path d="M24 12c3.5 4 5.5 8 5.5 12s-2 8-5.5 12" stroke="#C8956C" strokeWidth="2" strokeLinecap="round"/>
      <path d="M24 12c-3.5 4-5.5 8-5.5 12s2 8 5.5 12" stroke="#C8956C" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="14" cy="16" r="3" fill="#E8B88A" opacity="0.8"/>
      <circle cx="34" cy="16" r="3" fill="#E8B88A" opacity="0.8"/>
      <path d="M11 34l4-4M33 34l4-4" stroke="#C8956C" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function DepthIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="8" y="10" width="32" height="6" rx="2" fill="#C8956C"/>
      <rect x="8" y="21" width="24" height="5" rx="2" fill="#C8956C" opacity="0.7"/>
      <rect x="8" y="31" width="18" height="5" rx="2" fill="#C8956C" opacity="0.5"/>
      <circle cx="38" cy="33.5" r="4.5" stroke="#E8B88A" strokeWidth="1.5"/>
      <path d="M36.5 33.5h3M38 32v3" stroke="#E8B88A" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function DraftIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="12" y="8" width="24" height="32" rx="3" stroke="#C8956C" strokeWidth="2"/>
      <path d="M20 8v4h8V8" stroke="#C8956C" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M18 22h12M18 28h9" stroke="#C8956C" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M18 16h12" stroke="#E8B88A" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M30 32l2 2 4-4" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <path d="M16 10h16v14c0 6-4 10-8 12-4-2-8-6-8-12V10z" stroke="#C8956C" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M20 22l2.5 2.5L28 19" stroke="#E8B88A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M24 36v4M18 40h12" stroke="#C8956C" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function NBALiveIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="8" y="12" width="32" height="20" rx="3" stroke="#C8956C" strokeWidth="2"/>
      <rect x="18" y="32" width="12" height="4" fill="#C8956C" opacity="0.5"/>
      <path d="M14 36h20" stroke="#C8956C" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="24" cy="22" r="1.5" fill="#F87171"/>
      <rect x="13" y="17" width="10" height="6" rx="1" fill="#F87171" opacity="0.2"/>
      <text x="13.5" y="22" fontSize="4.5" fontWeight="bold" fill="#F87171" fontFamily="sans-serif">LIVE</text>
      <path d="M30 18v8M33 19.5v5M27 20v4" stroke="#E8B88A" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function StatsIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <path d="M10 36l9-10 7 5 12-16" stroke="#C8956C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="36" cy="14" r="7" stroke="#C8956C" strokeWidth="2" opacity="0.8"/>
      <path d="M36 14l4.5-4.5" stroke="#E8B88A" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M36 11v3h3" stroke="#C8956C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="10" cy="36" r="2" fill="#C8956C"/>
      <circle cx="19" cy="26" r="2" fill="#C8956C"/>
      <circle cx="26" cy="31" r="2" fill="#C8956C"/>
    </svg>
  );
}

function MovesIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="8" y="13" width="10" height="5" rx="1.5" fill="#E8B88A" opacity="0.8"/>
      <rect x="30" y="13" width="10" height="5" rx="1.5" fill="#C8956C" opacity="0.8"/>
      <path d="M18 15.5h6l-2-2M24 15.5l-2 2" stroke="#C8956C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M30 15.5h-6" stroke="#C8956C" strokeWidth="1.5" strokeLinecap="round"/>
      <rect x="8" y="30" width="10" height="5" rx="1.5" fill="#C8956C" opacity="0.8"/>
      <rect x="30" y="30" width="10" height="5" rx="1.5" fill="#E8B88A" opacity="0.8"/>
      <path d="M18 32.5h12M26 30.5l2 2-2 2" stroke="#E8B88A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function RecordsIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <path d="M24 8l3.5 7.5 8 1-6 5.5 1.5 8L24 26l-7 4 1.5-8-6-5.5 8-1z" stroke="#C8956C" strokeWidth="2" strokeLinejoin="round" fill="#C8956C" fillOpacity="0.15"/>
      <path d="M18 34v6M30 34v6M15 40h18" stroke="#C8956C" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function RulesIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <path d="M10 12c4-2 8-2 14 0 6-2 10-2 14 0v24c-4-2-8-2-14 0-6-2-10-2-14 0V12z" stroke="#C8956C" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M24 12v24" stroke="#C8956C" strokeWidth="1.5" strokeDasharray="2 2"/>
      <path d="M16 18h5M16 23h5M16 28h5" stroke="#E8B88A" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M27 18h5M27 23h5M27 28h5" stroke="#E8B88A" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

// ─── Nav card ─────────────────────────────────────────────────────────────────

interface Section {
  href: string;
  label: string;
  desc: string;
  Icon: () => JSX.Element;
}

function NavCard({ section }: { section: Section }) {
  const { href, label, desc, Icon } = section;
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-4 transition-all duration-200 hover:bg-white/10 hover:border-[#C8956C]/40 hover:scale-[1.02] active:scale-[0.98]"
    >
      <div className="w-12 h-12 shrink-0 opacity-90 group-hover:opacity-100 transition-opacity">
        <Icon />
      </div>
      <div className="min-w-0">
        <p className="text-[16px] font-bold text-[#F0F4F8] leading-tight group-hover:text-[#C8956C] transition-colors">
          {label}
        </p>
        <p className="text-[12px] text-[#64748B] leading-snug mt-0.5 truncate">
          {desc}
        </p>
      </div>
    </Link>
  );
}

// ─── Sections ─────────────────────────────────────────────────────────────────

const LEFT_SECTIONS: Section[] = [
  { href: '/league',        label: 'League Now',   desc: 'Current Standings & Team Rankings.',           Icon: LeagueIcon   },
  { href: '/matchups',      label: 'Matchups',     desc: 'Weekly Head-to-Head & Playoff Outlook.',       Icon: MatchupsIcon },
  { href: '/matchup-depth', label: 'Depth',        desc: 'Full Roster & Player Status.',                 Icon: DepthIcon    },
  { href: '/draft',         label: 'Draft Board',  desc: 'Past Draft & Pick Tracking.',                  Icon: DraftIcon    },
  { href: '/history',       label: 'History',      desc: 'League Champion Hall of Fame.',                Icon: HistoryIcon  },
];

const RIGHT_SECTIONS: Section[] = [
  { href: '/nba',          label: 'NBA Live',     desc: 'Live Scores & Real-Time Stats.',               Icon: NBALiveIcon  },
  { href: '/stats',        label: 'Season Stats', desc: 'Full Season Performance & Leaderboards.',      Icon: StatsIcon    },
  { href: '/transactions', label: 'Moves',        desc: 'Completed Player Transactions & Trends.',      Icon: MovesIcon    },
  { href: '/records',      label: 'Records',      desc: 'All-Time League Records & Milestones.',        Icon: RecordsIcon  },
  { href: '/rules',        label: 'Rules',        desc: 'Complete League Rules & Settings.',            Icon: RulesIcon    },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="page-home min-h-screen -mx-4 xl:-mx-8 px-4 xl:px-8 pt-10 pb-10 flex flex-col">

      {/* Logo */}
      <div className="flex justify-center mb-8">
        <Image
          src="/logo.png"
          alt="Shaqtin Fantasy HQ"
          width={320}
          height={120}
          className="object-contain drop-shadow-2xl"
          priority
        />
      </div>

      {/* Two-column nav */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4 max-w-[900px] mx-auto w-full">

        {/* Left column */}
        <div className="space-y-2.5">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#64748B] mb-3 px-1">
            Manage Your Team
          </p>
          {LEFT_SECTIONS.map((s) => (
            <NavCard key={s.href} section={s} />
          ))}
        </div>

        {/* Right column */}
        <div className="space-y-2.5">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#64748B] mb-3 px-1">
            League Data
          </p>
          {RIGHT_SECTIONS.map((s) => (
            <NavCard key={s.href} section={s} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-[11px] text-[#1E3050] mt-8">
        © {new Date().getFullYear()} Shaqtin Fantasy HQ
      </p>
    </div>
  );
}
