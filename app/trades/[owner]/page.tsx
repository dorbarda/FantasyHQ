import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import OwnerAvatar from '@/components/OwnerAvatar';
import TradeIdeaCard, { FLAG_LABELS } from '@/components/TradeIdeaCard';
import TradeUnlockForm from '@/components/TradeUnlockForm';
import { lockTrades } from '../actions';
import { listTradeWeeks, loadTradeWeek } from '@/lib/trades-data';
import { ownerToSlug } from '@/lib/team-utils';
import { TRADES_COOKIE, canView, readSession, ADMIN_SLUG } from '@/lib/owner-auth';
import { TRADES_PUBLIC } from '@/lib/trades-launch';

// Behind a per-owner passcode: never cache or pre-render.
export const dynamic = 'force-dynamic';

export const metadata = { title: 'Trade suggestions · Fantasy HQ', robots: { index: false } };

export default async function OwnerTradesPage({
  params,
  searchParams,
}: {
  params: Promise<{ owner: string }>;
  searchParams: Promise<{ week?: string }>;
}) {
  const { owner: slug } = await params;
  const { week: weekParam } = await searchParams;

  const weeks = listTradeWeeks();
  const week = weeks.includes(Number(weekParam)) ? Number(weekParam) : weeks[0];
  const file = week === undefined ? null : loadTradeWeek(week);
  const advice = file?.teams.find(t => ownerToSlug(t.owner) === slug);
  if (!advice) notFound();

  const session = readSession((await cookies()).get(TRADES_COOKIE)?.value, process.env.OWNER_KEYS ?? '', Date.now());

  return (
    <div className="min-h-screen bg-background px-4 sm:px-6 lg:px-8 py-6 max-w-3xl">
      <Link href="/trades" className="text-[13px] font-semibold text-accent-text">← All teams</Link>

      <header className="flex items-center gap-3 mt-3 mb-5">
        <OwnerAvatar ownerName={advice.owner} teamName={advice.teamName} size={52} />
        <div className="min-w-0">
          <h1 className="type-page-title text-foreground truncate">{advice.owner}</h1>
          <p className="text-[13px] text-muted truncate">{advice.teamName}</p>
        </div>
      </header>

      {!(TRADES_PUBLIC ? canView(session, slug) : session === ADMIN_SLUG) ? (
        <TradeUnlockForm slug={slug} owner={advice.owner} />
      ) : (
        <div className="flex flex-col gap-4">
          {!TRADES_PUBLIC && (
            <p className="text-[12px] font-bold uppercase tracking-wider text-warning-text">Preview — not public yet</p>
          )}
          <p className="type-section-label">
            Week {file!.week} · seed {advice.seed} · {advice.record.wins}-{advice.record.losses}
            {advice.record.ties > 0 ? `-${advice.record.ties}` : ''} · {advice.pointsFor.toFixed(1)} points for
          </p>

          <section className="bg-surface border border-border rounded-2xl p-4 flex flex-col gap-3">
            <p className="type-section-label">Diagnosis</p>
            {advice.diagnosis.flags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {advice.diagnosis.flags.map(f => (
                  <span key={f} className="text-[11px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 bg-background border border-border text-foreground">
                    {FLAG_LABELS[f] ?? f}
                  </span>
                ))}
              </div>
            )}
            <p className="text-[15px] leading-relaxed text-foreground">{advice.diagnosis.summary}</p>
          </section>

          {advice.trades.length === 0 ? (
            <p className="text-[14px] text-muted">No trade worth making this week — your roster is fine as it is.</p>
          ) : (
            advice.trades.map((idea, i) => <TradeIdeaCard key={i} idea={idea} rank={i + 1} />)
          )}

          <p className="text-[12px] text-muted">
            Ideas from Claude, based on ESPN data from Monday morning. Numbers on the cards come straight
            from ESPN; trades still need the other owner to say yes.
          </p>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            {weeks.length > 1 ? (
              <nav className="flex flex-wrap gap-1.5" aria-label="Earlier weeks">
                {weeks.map(w => (
                  <Link
                    key={w}
                    href={`/trades/${slug}?week=${w}`}
                    aria-current={w === week ? 'page' : undefined}
                    className={`text-[12px] font-bold rounded-full px-2.5 py-1 border ${
                      w === week ? 'bg-accent text-white border-accent' : 'bg-surface text-foreground border-border'
                    }`}
                  >
                    W{w}
                  </Link>
                ))}
              </nav>
            ) : <span />}
            <form action={lockTrades}>
              <input type="hidden" name="slug" value={slug} />
              <button type="submit" className="text-[13px] font-semibold text-muted underline">
                {session === ADMIN_SLUG ? 'Log out (commissioner)' : 'Lock this page'}
              </button>
            </form>
          </footer>
        </div>
      )}
    </div>
  );
}
