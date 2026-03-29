'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

// ─── Icons ────────────────────────────────────────────────────────────────────

function HomeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 shrink-0">
      <path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M7 18v-6h6v6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}

function LeagueIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 shrink-0">
      <rect x="3" y="12" width="3" height="5" rx="0.75" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="8.5" y="8" width="3" height="9" rx="0.75" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="14" y="10" width="3" height="7" rx="0.75" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M4 11L8.5 7l4 2.5L17 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function MatchupsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 shrink-0">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M3 10h14M10 3c2 2.5 3 4.5 3 7s-1 4.5-3 7M10 3c-2 2.5-3 4.5-3 7s1 4.5 3 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function DepthIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 shrink-0">
      <rect x="3" y="4" width="14" height="3" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="3" y="9" width="10" height="2.5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="3" y="13.5" width="7" height="2.5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}

function DraftIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 shrink-0">
      <rect x="4" y="3" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M7.5 3v2h5V3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M7 9h6M7 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function AnalysisIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 shrink-0">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
      <path d="M3 10h2.5l2-4 3 8 2-5 1.5 3H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function MovesIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 shrink-0">
      <rect x="3" y="5.5" width="5" height="2.5" rx="0.75" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="12" y="5.5" width="5" height="2.5" rx="0.75" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 6.75h2l-1-1M10 6.75l-1 1M12 6.75h-2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="3" y="12" width="5" height="2.5" rx="0.75" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="12" y="12" width="5" height="2.5" rx="0.75" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 13.25h4M14 12.25l1 1-1 1" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function RecordsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 shrink-0">
      <path d="M10 3l2 4.5 4.5.5-3.3 3 1 4.5L10 13l-4.2 2.5 1-4.5L3.5 8l4.5-.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 shrink-0">
      <path d="M7 4h6v7c0 3-2 5-4 6-2-1-4-3-4-6V4h2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M8.5 10.5l1.5 1.5 2.5-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function NBAIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 shrink-0">
      <rect x="3" y="5" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="7.5" cy="9.5" r="1" fill="currentColor" opacity="0.5"/>
      <path d="M5 7.5h4.5M5 11.5h3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
      <path d="M13 7.5v4M15 7.5v4M11.5 8v3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  );
}

function RulesIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 shrink-0">
      <path d="M4 5c2-1 4-1 6 0 2-1 4-1 6 0v11c-2-1-4-1-6 0-2-1-4-1-6 0V5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M10 5v11M6.5 8h2.5M6.5 11h2.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  );
}

function TeamsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 shrink-0">
      <path d="M10 2l2 3h3l-2.5 2 1 3L10 8.5 6.5 10l1-3L5 5h3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M5 13c-1 .5-2 1.5-2 3h14c0-1.5-1-2.5-2-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="7" cy="13" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="13" cy="13" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  );
}

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: 'LEAGUE',
    items: [
      { href: '/',              label: 'Home',        Icon: HomeIcon     },
      { href: '/league',        label: 'League',      Icon: LeagueIcon   },
      { href: '/matchups',      label: 'Matchups',    Icon: MatchupsIcon },
      { href: '/matchup-depth', label: 'Depth',       Icon: DepthIcon    },
      { href: '/draft',         label: 'Draft',       Icon: DraftIcon    },
      { href: '/teams',         label: 'Teams',       Icon: TeamsIcon    },
    ],
  },
  {
    label: 'ANALYTICS',
    items: [
      { href: '/analysis',     label: 'Analysis', Icon: AnalysisIcon },
      { href: '/transactions', label: 'Moves',    Icon: MovesIcon    },
      { href: '/records',      label: 'Records',  Icon: RecordsIcon  },
      { href: '/history',      label: 'History',  Icon: HistoryIcon  },
    ],
  },
  {
    label: 'NBA',
    items: [
      { href: '/nba', label: 'NBA Live', Icon: NBAIcon },
    ],
  },
  {
    label: 'INFO',
    items: [
      { href: '/rules', label: 'Rules', Icon: RulesIcon },
    ],
  },
];

// Flat list for bottom nav (most important pages only)
const BOTTOM_NAV = [
  { href: '/',         label: 'Home',     Icon: HomeIcon     },
  { href: '/league',   label: 'League',   Icon: LeagueIcon   },
  { href: '/matchups', label: 'Matchups', Icon: MatchupsIcon },
  { href: '/matchup-depth', label: 'Depth', Icon: DepthIcon },
  { href: '/analysis', label: 'Analysis', Icon: AnalysisIcon },
];

// ─── Sidebar (desktop) ────────────────────────────────────────────────────────

function DesktopSidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="hidden md:flex fixed top-0 left-0 h-screen w-[220px] bg-[#0B1628] border-r border-[#1E3050] flex-col z-50 overflow-y-auto">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[#1E3050] shrink-0">
        <Image src="/logo.png" alt="Fantasy HQ" width={140} height={52} className="object-contain" priority />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-2 mb-1 text-[10px] font-semibold tracking-[0.15em] text-[#475569] uppercase">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map(({ href, label, Icon }) => {
                const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={`flex items-center gap-2.5 px-2 py-2 rounded-md text-[13px] font-medium transition-all duration-150 ${
                        isActive
                          ? 'bg-[#1E3A5F] text-[#F0F4F8] border-l-2 border-[#C8956C] pl-[6px]'
                          : 'text-[#CBD5E1] hover:bg-white/5 hover:text-[#F0F4F8]'
                      }`}
                    >
                      <span className={isActive ? 'text-[#C8956C]' : 'text-[#64748B]'}>
                        <Icon />
                      </span>
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-[#1E3050] shrink-0">
        <p className="text-[10px] text-[#334155]">© {new Date().getFullYear()} Fantasy HQ</p>
      </div>
    </aside>
  );
}

// ─── Mobile top bar + drawer ──────────────────────────────────────────────────

function MobileNav({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {/* Top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#0B1628] border-b border-[#1E3050] flex items-center justify-between px-4 z-50">
        <Link href="/">
          <Image src="/logo.png" alt="Fantasy HQ" width={100} height={38} className="object-contain" priority />
        </Link>
        <button
          onClick={() => setOpen(true)}
          className="flex flex-col gap-1.5 p-2 rounded-md hover:bg-white/5 transition-colors"
          aria-label="Open menu"
        >
          <span className="block w-5 h-0.5 bg-[#94A3B8]" />
          <span className="block w-5 h-0.5 bg-[#94A3B8]" />
          <span className="block w-5 h-0.5 bg-[#94A3B8]" />
        </button>
      </header>

      {/* Backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div className={`md:hidden fixed top-0 right-0 h-full w-[280px] bg-[#0B1628] border-l border-[#1E3050] z-[70] flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#1E3050]">
          <Image src="/logo.png" alt="Fantasy HQ" width={100} height={38} className="object-contain" />
          <button
            onClick={() => setOpen(false)}
            className="p-2 rounded-md hover:bg-white/5 text-[#94A3B8] transition-colors"
            aria-label="Close menu"
          >
            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-2 mb-1 text-[10px] font-semibold tracking-[0.15em] text-[#475569] uppercase">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map(({ href, label, Icon }) => {
                  const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-all ${
                          isActive
                            ? 'bg-[#1E3A5F] text-[#F0F4F8] border-l-2 border-[#C8956C] pl-[10px]'
                            : 'text-[#CBD5E1] hover:bg-white/5'
                        }`}
                      >
                        <span className={isActive ? 'text-[#C8956C]' : 'text-[#64748B]'}>
                          <Icon />
                        </span>
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-[#1E3050]">
          <p className="text-[10px] text-[#334155]">© {new Date().getFullYear()} Fantasy HQ</p>
        </div>
      </div>

      {/* Bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0B1628] border-t border-[#1E3050] z-50 flex">
        {BOTTOM_NAV.map(({ href, label, Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 py-2 transition-colors ${
                isActive ? 'text-[#C8956C]' : 'text-[#475569] hover:text-[#94A3B8]'
              }`}
            >
              <Icon />
              <span className="text-[9px] font-semibold">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <>
      <DesktopSidebar pathname={pathname} />
      <MobileNav pathname={pathname} />
    </>
  );
}
