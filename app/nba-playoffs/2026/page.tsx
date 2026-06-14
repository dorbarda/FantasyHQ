import betsJson    from '@/data/playoff-bets.json';
import resultsJson from '@/data/playoff-results.json';
import finesJson   from '@/data/playoff-fines.json';
import { computeAllScores } from '@/lib/playoff-scoring';
import type { OwnerPlayoffBets, PlayoffResults, PlayoffFine } from '@/lib/types';
import Link from 'next/link';

export const revalidate = false; // static — archived season never changes

const allBets: OwnerPlayoffBets[] = betsJson.owners as OwnerPlayoffBets[];
const results: PlayoffResults     = resultsJson as PlayoffResults;
const fines: PlayoffFine[]        = finesJson as PlayoffFine[];

// ─── Final standings ─────────────────────────────────────────────────────────

function FinalStandings() {
  const rawScores = computeAllScores(allBets, results);
  const scores = rawScores
    .map(s => {
      const fine = fines.find(f => f.ownerName === s.ownerName);
      return fine ? { ...s, total: s.total + fine.points, fine } : { ...s, fine: undefined };
    })
    .sort((a, b) => b.total - a.total);

  // Count exact scores per owner
  const exactCountMap: Record<string, number> = {};
  for (const s of scores) {
    exactCountMap[s.ownerName] = s.detail.filter(d => d.status === 'exact').length;
  }

  const rankColors = [
    'bg-[#FEF9C3] border-l-4 border-l-[#EAB308]',
    'bg-[#F1F5F9] border-l-4 border-l-[#94A3B8]',
    'bg-[#FDF6F0] border-l-4 border-l-[#FDBA74]',
  ];
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm mb-6">
      <div className="px-5 pt-4 pb-3 border-b border-[#E2E8F0] bg-gradient-to-r from-[#F8FAFC] to-[#F1F5F9]">
        <p className="text-[11px] font-black uppercase tracking-widest text-[#94A3B8]">Final Standings</p>
      </div>
      <div className="divide-y divide-[#F1F5F9]">
        {scores.map((s, i) => (
          <div
            key={s.ownerName}
            className={`flex items-center gap-3 px-5 py-3 ${i < 3 ? rankColors[i] : 'bg-white'}`}
          >
            <span className="text-[18px] w-7 shrink-0 text-center">
              {i < 3 ? medals[i] : <span className="text-[13px] font-bold text-[#94A3B8]">#{i + 1}</span>}
            </span>
            <span className="flex-1 text-[14px] font-semibold text-[#0F172A] truncate">{s.ownerName}</span>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[11px] text-[#94A3B8] tabular-nums">
                {exactCountMap[s.ownerName]} exact
              </span>
              {s.fine && (
                <span className="text-[11px] text-[#EF4444] tabular-nums">({s.fine.points})</span>
              )}
              <span className="text-[18px] font-black tabular-nums text-[#0F172A]">{s.total}</span>
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
  return (
    <div className="mb-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#94A3B8] mb-2">{title}</p>
      <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
        {items.map((item, i) => (
          <div key={i} className={`flex items-center justify-between px-4 py-2.5 border-b border-[#F1F5F9] last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'}`}>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-[#0F172A]">{item.label}</p>
              <p className="text-[12px] text-[#64748B] mt-0.5">{item.teams[0]} vs {item.teams[1]}</p>
            </div>
            {item.winner && (
              <div className="flex items-center gap-2 shrink-0 ml-4">
                {item.score && (
                  <span className="text-[11px] font-bold bg-[#F8FAFC] border border-[#E2E8F0] rounded px-2 py-0.5 text-[#475569]">
                    {item.score}
                  </span>
                )}
                <span className="text-[12px] font-semibold text-[#10B981] bg-[#DCFCE7] rounded-lg px-3 py-1">
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

function NBAResults() {
  const r1 = results.series.filter(s => s.round === 1);
  const r2 = results.series.filter(s => s.round === 2);
  const r3 = results.series.filter(s => s.round === 3);
  const r4 = results.series.filter(s => s.round === 4);

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 pt-4 pb-3 border-b border-[#E2E8F0] bg-gradient-to-r from-[#F8FAFC] to-[#F1F5F9]">
        <p className="text-[11px] font-black uppercase tracking-widest text-[#94A3B8]">NBA Results</p>
      </div>
      <div className="px-5 py-4">
        <ResultsSection title="Round 1"           items={r1} />
        <ResultsSection title="Semifinals"        items={r2} />
        <ResultsSection title="Conference Finals" items={r3} />
        <ResultsSection title="NBA Finals"        items={r4} />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Archive2026Page() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/nba-playoffs"
          className="text-[12px] font-semibold text-[#94A3B8] hover:text-[#475569] transition-colors mb-2 inline-flex items-center gap-1"
        >
          ← Back to Playoffs
        </Link>
        <h1 className="text-[28px] sm:text-[32px] font-black tracking-tight text-[#0F172A]">
          2026 Playoffs Archive
        </h1>
        <p className="text-[14px] text-[#475569] mt-1">
          {allBets.length} participants · Season complete · 🏆 New York Knicks won 4-1
        </p>
      </div>

      <FinalStandings />
      <NBAResults />
    </div>
  );
}
