'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  if (pathname === '/') return null;

  return (
    <header className="sticky top-0 z-50 bg-[#0E1929] border-b border-[#1E3050]">
      <div className="max-w-[1100px] mx-auto h-[44px] flex items-center px-4 xl:px-8">
        <Link href="/" className="flex items-center gap-2 group">
          <svg viewBox="0 0 28 28" fill="none" className="w-6 h-6 shrink-0">
            <circle cx="14" cy="14" r="13" stroke="#C8956C" strokeWidth="1.5" fill="none"/>
            <path d="M1 14h26M14 1c4.5 3.5 6 8 6 13s-1.5 9.5-6 13" stroke="#C8956C" strokeWidth="1.2" opacity="0.5" fill="none"/>
            <path d="M14 1c-4.5 3.5-6 8-6 13s1.5 9.5 6 13" stroke="#C8956C" strokeWidth="1.2" opacity="0.5" fill="none"/>
            <ellipse cx="14" cy="12" rx="4.5" ry="5" fill="#C8956C" opacity="0.85"/>
            <path d="M7 22c1-3 3.5-4.5 7-4.5s6 1.5 7 4.5" fill="#C8956C" opacity="0.85"/>
          </svg>
          <span className="text-[14px] font-black text-[#C8956C] tracking-tight group-hover:text-[#D4A77C] transition-colors">
            Shaqtin
          </span>
          <span className="text-[10px] font-semibold text-[#64748B] tracking-[0.15em] uppercase group-hover:text-[#94A3B8] transition-colors">
            Fantasy HQ
          </span>
        </Link>
      </div>
    </header>
  );
}
