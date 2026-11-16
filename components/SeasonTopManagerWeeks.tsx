import Link from 'next/link';
import type { TopManagerWeek } from '@/lib/recap';

/**
 * The season's 10 best single-week team scores. Only finished weeks count,
 * so it changes on Mondays, like the players table next to it.
 */
export default function SeasonTopManagerWeeks({ weeks }: { weeks: TopManagerWeek[] }) {
  if (weeks.length === 0) return null;

  return (
    <section>
      <p className="type-section-label mb-3">Top 10 Weekly Scores · Managers</p>
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
          <span className="w-5 text-right">#</span>
          <span className="flex-1">Manager</span>
          <span className="w-9 text-right">Wk</span>
          <span className="w-24 text-right">Opp</span>
          <span className="w-16 text-right">Score</span>
        </div>
        {weeks.map((w, i) => (
          <div
            key={`${w.ownerName}-${w.matchupPeriod}`}
            className="flex items-center gap-3 px-4 py-2.5 border-t border-surface-secondary tabular-nums"
          >
            <span className="w-5 text-right text-[12px] font-bold text-muted">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-foreground truncate">{w.ownerName}</p>
              <p className="text-[11px] text-secondary truncate">{w.teamName}</p>
            </div>
            <Link
              href={`/recap/${w.matchupPeriod}`}
              className="w-9 text-right text-[12px] font-semibold text-secondary hover:text-foreground"
            >
              {w.matchupPeriod}
            </Link>
            <div className="w-24 text-right min-w-0">
              <p className={`text-[12px] font-bold ${w.won ? 'text-positive-bright' : 'text-negative-bright'}`}>
                {w.won ? 'W' : 'L'} {w.opponentScore.toFixed(0)}
              </p>
              <p className="text-[11px] text-secondary truncate">{w.opponentName}</p>
            </div>
            <span className="w-16 text-right text-[14px] font-black text-foreground">{w.teamScore.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
