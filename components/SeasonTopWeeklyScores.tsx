import Link from 'next/link';
import NbaLogo from './NbaLogo';
import type { TopWeeklyScore } from '@/lib/recap';

/**
 * The season's 10 best single-week player totals, from the weekly recap's
 * top-10 lists. Only finished weeks count, so it changes on Mondays.
 */
export default function SeasonTopWeeklyScores({ scores }: { scores: TopWeeklyScore[] }) {
  if (scores.length === 0) return null;

  return (
    <section>
      <p className="type-section-label mb-3">Top 10 Weekly Scores · Players</p>
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
          <span className="w-5 text-right">#</span>
          <span className="flex-1">Player</span>
          <span className="w-9 text-right">Wk</span>
          <span className="w-8 text-right">GP</span>
          <span className="w-14 text-right">Total</span>
          <span className="w-12 text-right">AVG</span>
        </div>
        {scores.map((p, i) => (
          <div
            key={`${p.playerId}-${p.matchupPeriod}`}
            className="flex items-center gap-3 px-4 py-2.5 border-t border-surface-secondary tabular-nums"
          >
            <span className="w-5 text-right text-[12px] font-bold text-muted">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <NbaLogo team={p.proTeam} size={16} />
                <span className="text-[13px] font-bold text-foreground truncate">{p.playerName}</span>
              </div>
              <p className="text-[11px] text-secondary truncate">{p.ownerNames.join(' / ')}</p>
            </div>
            <Link
              href={`/recap/${p.matchupPeriod}`}
              className="w-9 text-right text-[12px] font-semibold text-secondary hover:text-foreground"
            >
              {p.matchupPeriod}
            </Link>
            <span className="w-8 text-right text-[12px] text-secondary">{p.games}</span>
            <span className="w-14 text-right text-[14px] font-black text-foreground">{p.totalPoints.toFixed(1)}</span>
            <span className="w-12 text-right text-[13px] font-semibold text-secondary">{p.avgPoints.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
