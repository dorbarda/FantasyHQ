import Link from 'next/link';
import OwnerAvatar from './OwnerAvatar';
import type { WeeklyRecap } from '@/lib/recap';

/**
 * Compact home-page block: the week's two or three headline awards, linking
 * to the full recap. Keeps the recap discoverable without hunting for it.
 */
export default function RecapTeaser({ recap }: { recap: WeeklyRecap }) {
  const featured = ['beatdown', 'noLuck', 'slotzki']
    .map(id => recap.awards.find(a => a.id === id))
    .filter(Boolean)
    .slice(0, 3);

  if (featured.length === 0) return null;

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <p className="text-[13px] font-bold text-foreground">Week {recap.week} Recap</p>
          <p className="text-[11px] text-muted">Awards from the week just gone</p>
        </div>
        <Link
          href="/recap"
          className="text-[12px] font-medium text-accent-text hover:text-accent transition-colors inline-flex items-center min-h-[24px] shrink-0"
        >
          Full recap →
        </Link>
      </div>
      <div className="divide-y divide-surface-secondary">
        {featured.map(award => {
          const w = award!.winners[0];
          return (
            <div key={award!.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                {award!.rtl ? (
                  <p dir="rtl" className="type-he text-[13px] text-foreground truncate text-left">{award!.name}</p>
                ) : (
                  <p className="text-[13px] font-bold text-foreground truncate">{award!.name}</p>
                )}
                <p className="text-[10px] text-muted truncate">{award!.gloss}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <OwnerAvatar ownerName={w.ownerName} teamName={w.teamName} size={22} />
                <span className="text-[12px] font-semibold text-secondary truncate max-w-[110px]">
                  {w.playerName ?? w.ownerName}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
