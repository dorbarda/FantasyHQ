'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: 'Standings', href: '/' },
  { label: 'Matchups', href: '/matchups' },
  { label: 'Players', href: '/players' },
  { label: 'Stats', href: '/stats' },
  { label: 'Draft', href: '/draft' },
  { label: 'Records', href: '/records' },
  { label: 'History', href: '/history' },
  { label: 'Rules', href: '/rules' },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-[#eff3f4]">
      <div className="max-w-[1100px] mx-auto h-[53px] flex items-center justify-between px-4 xl:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 shrink-0">
          <span className="text-[20px]">🏀</span>
          <span className="font-bold text-[17px] text-[#0f1419] tracking-tight">Fantasy HQ</span>
        </Link>

        {/* Nav tabs */}
        <nav className="flex items-center h-[53px] overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center h-[53px] px-3 text-[15px] whitespace-nowrap transition-colors
                  ${isActive
                    ? 'font-bold text-[#0f1419] border-b-2 border-[#1d9bf0]'
                    : 'font-medium text-[#536471] hover:bg-[#f7f9f9]'
                  }
                `}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Week badge */}
        <div className="shrink-0 ml-2">
          <span className="border border-[#eff3f4] text-[#536471] text-[13px] font-medium rounded-full px-3 py-1 whitespace-nowrap">
            Week 18
          </span>
        </div>
      </div>
    </header>
  );
}
