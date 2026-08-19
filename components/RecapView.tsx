import Link from 'next/link';
import OwnerAvatar from './OwnerAvatar';
import RecapCard from './RecapCard';
import type { WeeklyRecap } from '@/lib/recap';

/**
 * The whole recap for one week. Laid out to be screenshotted on a phone: the
 * award grid stands on its own without the header, so a crop still makes
 * sense in the group chat.
 */
export default function RecapView({
  recap,
  seasonLabel,
  prevWeek,
  nextWeek,
}: {
  recap: WeeklyRecap;
  seasonLabel: string;
  prevWeek: number | null;
  nextWeek: number | null;
}) {
  // The week's headline: whichever was more extreme, the blowout or the squeaker.
  const beatdown = recap.awards.find(a => a.id === 'beatdown')?.winners[0];
  const heartAttack = recap.awards.find(a => a.id === 'heartAttack')?.winners[0];

  return (
    <div className="min-h-screen bg-background px-4 sm:px-6 lg:px-8 py-6">
      <div className="max-w-5xl">
        {/* Header */}
        <div className="mb-5">
          <h1 className="type-page-title text-foreground">Week {recap.week} Recap</h1>
          <p className="type-page-subtitle mt-1">
            {seasonLabel} · {recap.matchups.length} matchups · {recap.teamCount} teams
          </p>
        </div>

        {/* Headline fact */}
        {(beatdown || heartAttack) && (
          <div className="rounded-2xl bg-panel text-white px-5 py-4 mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-accent mb-1.5">
              Story of the week
            </p>
            {beatdown && (
              <p className="text-[15px] leading-snug">
                <span className="font-bold">{beatdown.ownerName}</span> put{' '}
                <span className="font-bold">{beatdown.value.toFixed(1)}</span> on{' '}
                <span className="font-bold">{beatdown.opponentName}</span>
                {heartAttack && (
                  <>
                    , while <span className="font-bold">{heartAttack.ownerName}</span> survived by{' '}
                    <span className="font-bold">{heartAttack.value.toFixed(1)}</span>
                  </>
                )}
                .
              </p>
            )}
          </div>
        )}

        {/* Award grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {recap.awards.map(a => (
            <RecapCard key={a.id} award={a} />
          ))}
        </div>

        {/* All results */}
        <section className="mb-6">
          <p className="type-section-label mb-3">All Results</p>
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            {recap.matchups.map((m, i) => (
              <div
                key={`${m.home.ownerName}-${m.away.ownerName}`}
                className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-surface-secondary' : ''}`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <OwnerAvatar ownerName={m.home.ownerName} teamName={m.home.teamName} size={26} />
                  <span className="text-[13px] font-bold text-foreground truncate">{m.home.ownerName}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 tabular-nums">
                  <span className="text-[15px] font-black text-foreground">{m.home.score.toFixed(1)}</span>
                  <span className="text-[11px] text-muted">–</span>
                  <span className="text-[15px] font-bold text-muted">{m.away.score.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                  <span className="text-[13px] font-medium text-secondary truncate text-right">{m.away.ownerName}</span>
                  <OwnerAvatar ownerName={m.away.ownerName} teamName={m.away.teamName} size={26} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Week navigation */}
        <div className="flex items-center justify-between">
          {prevWeek ? (
            <Link
              href={`/recap/${prevWeek}`}
              className="text-[13px] font-semibold text-accent-text hover:text-accent transition-colors inline-flex items-center min-h-[32px]"
            >
              ← Week {prevWeek}
            </Link>
          ) : <span />}
          {nextWeek ? (
            <Link
              href={`/recap/${nextWeek}`}
              className="text-[13px] font-semibold text-accent-text hover:text-accent transition-colors inline-flex items-center min-h-[32px]"
            >
              Week {nextWeek} →
            </Link>
          ) : <span />}
        </div>
      </div>
    </div>
  );
}
