'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

type Tab = 'full' | 'playoff' | 'stats';

const TABS: { id: Tab; label: string }[] = [
  { id: 'full',    label: 'Full Season' },
  { id: 'playoff', label: 'Playoff' },
  { id: 'stats',   label: 'Stats' },
];

export default function DepthTabNav({ active }: { active: Tab }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function navigate(tab: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex gap-1 p-1 bg-surface-secondary rounded-lg border border-border w-fit mb-6">
      {TABS.map(t => (
        <button
          key={t.id}
          onClick={() => navigate(t.id)}
          className={`px-4 py-1.5 rounded-md text-[13px] font-semibold transition-all ${
            active === t.id
              ? 'bg-surface text-foreground shadow-sm border border-border'
              : 'text-tertiary hover:text-foreground'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
