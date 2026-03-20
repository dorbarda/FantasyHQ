'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  if (pathname === '/') return null;

  return (
    <header className="sticky top-0 z-50 bg-[#0E1929] border-b border-[#1E3050]">
      <div className="max-w-[1100px] mx-auto h-[44px] flex items-center px-4 xl:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-[#64748B] hover:text-[#C8956C] transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span className="text-[12px] font-semibold tracking-[0.15em] uppercase text-[#C8956C]">
            Fantasy HQ
          </span>
        </Link>
      </div>
    </header>
  );
}
