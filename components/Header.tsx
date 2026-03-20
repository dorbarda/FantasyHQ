'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  if (pathname === '/') return null;

  return (
    <header className="sticky top-0 z-50 bg-[#0E1929] border-b border-[#1E3050]">
      <div className="max-w-[1100px] mx-auto h-[44px] flex items-center px-4 xl:px-8">
        <Link href="/" className="flex items-center opacity-90 hover:opacity-100 transition-opacity">
          <Image
            src="/logo.png"
            alt="Shaqtin Fantasy HQ"
            width={140}
            height={52}
            className="object-contain"
          />
        </Link>
      </div>
    </header>
  );
}
