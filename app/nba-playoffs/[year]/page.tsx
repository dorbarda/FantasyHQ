import { notFound } from 'next/navigation';
import Link from 'next/link';
import { loadPlayoffYear, listPlayoffYears } from '@/lib/playoffs';
import { computeAllScores } from '@/lib/playoff-scoring';
import type { PlayoffYearData } from '@/lib/playoffs';

export const dynamicParams = false;

export function generateStaticParams() {
  return listPlayoffYears().map(year => ({ year: String(year) }));
}

// ─── Final standings ─────────────────────────────────────────────────────────

function FinalStandings({ pool }: { pool: PlayoffYearData }) {
  const rawScores = computeAllScores(pool.bets, pool.results);
  const scores = rawScores
    .map(s => {
      const fine = pool.fines.find(f => f.ownerName === s.ownerName);
      return fine ? { ...s, total: s.total + fine.points, fine } : { ...s, fine: undefined };
    })
    .sort((a, b) => b.total - a.total);

  // Count exact scores per owner
  const exactCountMap: Record<string, number> = {};
  for (const s of scores) {
    exactCountMap[s.ownerName] = s.detail.filter(d => d.status === 'exact').length;
  }

  const rankColors = [
    'bg-gold-surface border-l-4 border-l-[#EAB308]',
    'bg-surface-secondary border-l-4 border-l-[#94A3B8]',
    'bg-bronze-surface border-l-4 border-l-[#FDBA74]',
  ];
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm mb-6">
      <div className="px-5 pt-4 pb-3 border-b border-border bg-gradient-to-r from-background to-surface-secondary">
        <p className="text-[11px] font-black uppercase tracking-widest text-muted">Final Standings</p>
      </div>
      <div className="divide-y divide-surface-secondary">
        {scores.map((s, i) => (
          <div
            key={s.ownerName}
            className={`flex items-center gap-3 px-5 py-3 ${i < 3 ? rankColors[i] : 'bg-surface'}`}
          >
            <span className="text-[18px] w-7 shrink-0 text-center">
              {i < 3 ? medals[i] : <span className="text-[13px] font-bold text-muted">#{i + 1}</span>}
            </span>
            <span className="flex-1 text-[14px] font-semibold text-foreground truncate">{s.ownerName}</span>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[11px] text-muted tabular-nums">
                {exactCountMap[s.ownerName]} exact
              </span>
              {s.fine && (
                <span className="text-[11px] text-negative tabular-nums">({s.fine.points})</span>
              )}
              <span className="text-[18px] font-black tabular-nums text-foreground">{s.total}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── NBA Results ─────────────────────────────────────────────────────────────

function ResultsSection({ title, items }: {
  title: string;
  items: { label: string; teams: [string, string]; winner: string | null; score?: string | null }[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted mb-2">{title}</p>
      <div className="rounded-xl border border-border overflow-hidden">
        {items.map((item, i) => (
          <div key={i} className={`flex items-center justify-between px-4 py-2.5 border-b border-surface-secondary last:border-0 ${i % 2 === 0 ? 'bg-surface' : 'bg-background'}`}>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-foreground">{item.label}</p>
              <p className="text-[12px] text-tertiary mt-0.5">{item.teams[0]} vs {item.teams[1]}</p>
            </div>
            {item.winner && (
              <div className="flex items-center gap-2 shrink-0 ml-4">
                {item.score && (
                  <span className="text-[11px] font-bold bg-background border border-border rounded px-2 py-0.5 text-secondary">
                    {item.score}
                  </span>
                )}
                <span className="text-[12px] font-semibold text-positive bg-positive-surface rounded-lg px-3 py-1">
                  ✓ {item.winner}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function NBAResults({ pool }: { pool: PlayoffYearData }) {
  const { series } = pool.results;
  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 pt-4 pb-3 border-b border-border bg-gradient-to-r from-background to-surface-secondary">
        <p className="text-[11px] font-black uppercase tracking-widest text-muted">NBA Results</p>
      </div>
      <div className="px-5 py-4">
        <ResultsSection title="Round 1"           items={series.filter(s => s.round === 1)} />
        <ResultsSection title="Semifinals"        items={series.filter(s => s.round === 2)} />
        <ResultsSection title="Conference Finals" items={series.filter(s => s.round === 3)} />
        <ResultsSection title="NBA Finals"        items={series.filter(s => s.round === 4)} />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PlayoffArchivePage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year } = await params;
  const pool = loadPlayoffYear(parseInt(year, 10));
  if (!pool) notFound();

  const finals = pool.results.series.find(s => s.round === 4);
  const champLine = finals?.winner
    ? `Season complete · 🏆 ${finals.winner} won ${finals.score ?? ''}`.trim()
    : 'Season in progress';

  return (
    <div className="min-h-screen bg-background px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/nba-playoffs"
          className="text-[12px] font-semibold text-muted hover:text-secondary transition-colors mb-2 inline-flex items-center gap-1 min-h-[32px] py-1"
        >
          ← Back to Playoffs
        </Link>
        <h1 className="type-page-title text-foreground">
          {pool.year} Playoffs Archive
        </h1>
        <p className="type-page-subtitle mt-1">
          {pool.bets.length} participants · {champLine}
        </p>
      </div>

      <FinalStandings pool={pool} />
      <NBAResults pool={pool} />
    </div>
  );
}
