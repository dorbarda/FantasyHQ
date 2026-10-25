import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { TRADES_PUBLIC } from '@/lib/trades-launch';
import { TRADES_COOKIE, ADMIN_SLUG, readSession } from '@/lib/owner-auth';
import OwnerAvatar from '@/components/OwnerAvatar';
import { loadLatestTradeWeek } from '@/lib/trades-data';
import { ownerToSlug } from '@/lib/team-utils';
import { CURRENT_SEASON_LABEL } from '@/lib/season';

// Reads the week file at request time; the advice itself is never shown here.
export const dynamic = 'force-dynamic';

export const metadata = { title: 'Trade suggestions · Fantasy HQ' };

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Jerusalem' });
}

export default async function TradesPage() {
  if (!TRADES_PUBLIC) {
    const session = readSession((await cookies()).get(TRADES_COOKIE)?.value, process.env.OWNER_KEYS ?? '', Date.now());
    if (session !== ADMIN_SLUG) notFound();
  }
  const latest = loadLatestTradeWeek();

  return (
    <div className="min-h-screen bg-background px-4 sm:px-6 lg:px-8 py-6 max-w-3xl">
      <h1 className="type-page-title text-foreground">Trade suggestions</h1>
      {!TRADES_PUBLIC && (
        <p className="text-[12px] font-bold uppercase tracking-wider text-warning-text mt-1">Preview — only you can see this</p>
      )}
      <p className="type-page-subtitle mt-1 mb-5">
        Every Monday Claude reviews each roster and suggests up to three trades to help you make
        the playoffs and win the league. Each page opens only with its owner&apos;s code.
      </p>

      {!latest ? (
        <p className="text-[14px] text-muted">The first suggestions arrive on Monday.</p>
      ) : (
        <>
          <p className="type-section-label mb-2">
            {CURRENT_SEASON_LABEL} · Week {latest.week} · updated {formatDay(latest.generatedAt)}
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {latest.teams.map(t => (
              <li key={t.owner}>
                <Link
                  href={`/trades/${ownerToSlug(t.owner)}`}
                  className="flex items-center gap-3 bg-surface border border-border rounded-2xl px-3 py-2.5 hover:border-border-strong"
                >
                  <OwnerAvatar ownerName={t.owner} teamName={t.teamName} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold text-foreground truncate">{t.owner}</p>
                    <p className="text-[12px] text-muted truncate">{t.teamName}</p>
                  </div>
                  <span aria-hidden className="text-[14px]">🔒</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
