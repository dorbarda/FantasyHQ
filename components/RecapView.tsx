import Link from 'next/link';
import OwnerAvatar from './OwnerAvatar';
import RecapCard from './RecapCard';
import RecapHighlights from './RecapHighlights';
import RecapTopPlayers from './RecapTopPlayers';
import RecapSeasonHighlights from './RecapSeasonHighlights';
import type { WeeklyRecap } from '@/lib/recap';
import type { Highlight } from '@/lib/highlightly';
import type { WeeklyTopPlayer } from '@/lib/types';

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
  highlights = [],
  topPlayers = [],
}: {
  recap: WeeklyRecap;
  seasonLabel: string;
  prevWeek: number | null;
  nextWeek: number | null;
  /** Embeddable, verified clips for this week — empty renders nothing. */
  highlights?: Highlight[];
  /** Week's top 10 players by total points (all games) — empty renders nothing. */
  topPlayers?: WeeklyTopPlayer[];
}) {
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

        {/* Story of the week */}
        {recap.story.length > 0 && (
          <div className="rounded-2xl bg-panel text-white px-5 py-4 mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-accent mb-1.5">
              Story of the week
            </p>
            {recap.story.map(line => (
              <p key={line} className="text-[15px] leading-snug mt-1 first:mt-0">{line}</p>
            ))}
          </div>
        )}

        {/* Season highlights — only on weeks that have them */}
        <RecapSeasonHighlights highlights={recap.highlights} />

        {/* Award grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {recap.awards.map(a => (
            <RecapCard key={a.id} award={a} />
          ))}
        </div>

        {/* Top 10 players — renders nothing on older snapshots */}
        <RecapTopPlayers players={topPlayers} />

        {/* Highlights — renders nothing when there are no usable clips */}
        <RecapHighlights clips={highlights} />

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
