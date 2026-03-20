'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'League', href: '/league' },
  { label: 'NBA Live', href: '/nba' },
  { label: 'Matchups', href: '/matchups' },
  { label: 'Stats', href: '/stats' },
  { label: 'Depth', href: '/matchup-depth' },
  { label: 'Moves', href: '/transactions' },
  { label: 'Draft', href: '/draft' },
  { label: 'Records', href: '/records' },
  { label: 'History', href: '/history' },
  { label: 'Rules', href: '/rules' },
];

export default function Header() {
  const pathname = usePathname();
  const isHome = pathname === '/';

  return (
    <header className="sticky top-0 z-50 bg-[#0F172A] border-b border-white/5">
      <div className="max-w-[1100px] mx-auto h-[52px] flex items-center justify-between px-4 xl:px-8">
        {/* Logo / back arrow */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          {!isHome && (
            <span className="text-[#94A3B8] text-[16px]">←</span>
          )}
          <span className="font-bold text-[16px] text-white tracking-tight">Fantasy HQ</span>
        </Link>

        {/* Nav tabs */}
        <nav className="flex items-center h-[52px] overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center h-[52px] px-3 text-[13px] font-medium whitespace-nowrap
                  transition-colors relative
                  ${isActive
                    ? 'text-white'
                    : 'text-[#94A3B8] hover:text-[#CBD5E1]'
                  }
                `}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#60A5FA] rounded-t" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Week badge */}
        <div className="shrink-0 ml-2">
          <span className="border border-white/10 text-[#94A3B8] text-[12px] font-medium rounded px-2.5 py-1 whitespace-nowrap">
            Week 18
          </span>
        </div>
      </div>
    </header>
  );
}
