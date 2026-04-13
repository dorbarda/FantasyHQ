'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

type Tab = 'leaderboard' | 'bets' | 'analytics' | 'results' | 'rules';

const TABS: { id: Tab; label: string }[] = [
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'bets',        label: 'Teams Bets'  },
  { id: 'analytics',   label: 'Analytics'   },
  { id: 'results',     label: 'Results'     },
  { id: 'rules',       label: 'Scoring Rules' },
];

export default function PlayoffTabNav({ active }: { active: Tab }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function navigate(tab: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-1 p-1 bg-[#F1F5F9] rounded-lg border border-[#E2E8F0] w-fit mb-6">
      {TABS.map(t => (
        <button
          key={t.id}
          onClick={() => navigate(t.id)}
          className={`px-4 py-1.5 rounded-md text-[13px] font-semibold transition-all ${
            active === t.id
              ? 'bg-white text-[#0F172A] shadow-sm border border-[#E2E8F0]'
              : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
