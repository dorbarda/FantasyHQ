import { Suspense } from 'react';
import betsJson    from '@/data/playoff-bets.json';
import resultsJson from '@/data/playoff-results.json';
import { computeAllScores, FINALS_WINNER_POINTS } from '@/lib/playoff-scoring';
import type {
  OwnerPlayoffBets,
  PlayoffResults,
  SeriesScoreStatus,
} from '@/lib/types';
import PlayoffTabNav from '@/components/PlayoffTabNav';
import PlayoffSeriesAnalyticsCard from '@/components/PlayoffSeriesAnalyticsCard';

export const revalidate = 300;

// ─── Cast JSON to typed shapes ────────────────────────────────────────────────

const allBets: OwnerPlayoffBets[]   = betsJson.owners as OwnerPlayoffBets[];
const results: PlayoffResults       = resultsJson as PlayoffResults;

// ─── Stage detection ─────────────────────────────────────────────────────────
// Only advance past play-in once all play-in games have a winner
const playInComplete = results.playIn.every(g => g.winner !== null);

// ─── Cell colour helper ───────────────────────────────────────────────────────

function statusStyle(status: SeriesScoreStatus | 'none'): string {
  switch (status) {
    case 'exact':   return 'bg-[#FEF9C3] border-2 border-[#EAB308] text-[#713F12]';
    case 'correct': return 'bg-[#DCFCE7] text-[#14532D]';
    case 'wrong43': return 'bg-[#FEF3C7] text-[#92400E]';
    case 'wrong':   return 'bg-[#FEE2E2] text-[#7F1D1D]';
    default:        return 'bg-white text-[#475569]';
  }
}

// ─── Pre-Bets section (shared) ───────────────────────────────────────────────

const PRE_BET_ROWS = [
  { key: 'westChampion'  as const, label: 'West Champion', pts: '+7', resultSeriesId: 'r3-w' },
  { key: 'eastChampion'  as const, label: 'East Champion', pts: '+7', resultSeriesId: 'r3-e' },
  { key: 'nbaChampion'   as const, label: 'NBA Champion',  pts: '+15–30', resultSeriesId: 'r4'  },
];

function preBetStatus(pick: string, seriesId: string): SeriesScoreStatus | 'none' {
  const actual = results.series.find(s => s.seriesId === seriesId)?.winner ?? null;
  if (!pick || actual === null) return 'none';
  return pick.trim().toLowerCase() === actual.trim().toLowerCase() ? 'correct' : 'wrong';
}

function PreBetsSection({ compact = false }: { compact?: boolean }) {
  if (allBets.length === 0) return null;

  if (compact) {
    // Compact version for leaderboard: owner cards with 3 picks
    return (
      <div className="mb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#94A3B8] mb-3">
          Pre-Season Bets
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {allBets.map(owner => (
            <div key={owner.ownerName} className="bg-white border border-[#E2E8F0] rounded-xl p-3">
              <p className="text-[12px] font-bold text-[#0F172A] mb-2 truncate">{owner.ownerName.split(' ')[0]}</p>
              <div className="space-y-1.5">
                {PRE_BET_ROWS.map(row => {
                  const pick   = owner.bonusBets[row.key] ?? '';
                  const status = preBetStatus(pick, row.resultSeriesId);
                  return (
                    <div key={row.key}>
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-[#94A3B8] mb-0.5">{row.label}</p>
                      <span className={`inline-block text-[11px] font-medium rounded px-1.5 py-0.5 leading-tight ${statusStyle(status)}`}>
                        {pick || '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Full table version for Bets tab
  const owners = allBets.map(o => o.ownerName);
  return (
    <div className="mb-8 bg-[#FAFBFF] border-2 border-[#C8956C]/30 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[18px]">🏆</span>
        <p className="text-[13px] font-bold text-[#0F172A]">Pre-Season Bets</p>
        <span className="text-[11px] text-[#94A3B8] ml-1">· Conference &amp; NBA Champions</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
        <table className="text-[12px] border-collapse w-full">
          <thead>
            <tr className="bg-white border-b border-[#E2E8F0]">
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8] sticky left-0 bg-white z-10 min-w-[130px]">Bet</th>
              {owners.map(o => (
                <th key={o} className="px-2 py-2.5 text-center text-[10px] font-semibold text-[#94A3B8] min-w-[90px]">
                  {o.split(' ')[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PRE_BET_ROWS.map((row, ri) => {
              const actual = results.series.find(s => s.seriesId === row.resultSeriesId)?.winner ?? null;
              return (
                <tr key={row.key} className={`border-b border-[#F1F5F9] last:border-0 ${ri % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'}`}>
                  <td className="px-3 py-2.5 sticky left-0 bg-inherit z-10 whitespace-nowrap">
                    <p className="text-[12px] font-semibold text-[#0F172A]">{row.label}</p>
                    <p className="text-[10px] text-[#C8956C] font-semibold">{row.pts}</p>
                    {actual && (
                      <p className="text-[10px] text-[#10B981] mt-0.5">✓ {actual}</p>
                    )}
                  </td>
                  {owners.map(ownerName => {
                    const pick   = allBets.find(o => o.ownerName === ownerName)?.bonusBets[row.key] ?? '';
                    const status = preBetStatus(pick, row.resultSeriesId);
                    const teamPts = row.key === 'nbaChampion' && pick ? (FINALS_WINNER_POINTS[pick] ?? 15) : null;
                    return (
                      <td key={ownerName} className="px-2 py-2.5 text-center">
                        {pick ? (
                          <div className="inline-flex flex-col items-center gap-0.5">
                            <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${statusStyle(status)}`}>
                              {pick}
                            </span>
                            {teamPts !== null && (
                              <span className="text-[9px] font-semibold text-[#C8956C]">+{teamPts}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#CBD5E1]">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Leaderboard tab ──────────────────────────────────────────────────────────

function LeaderboardTab() {
  if (allBets.length === 0) {
    return (
      <div className="text-center py-16 text-[#94A3B8] text-[14px]">
        No bets entered yet — data/playoff-bets.json is empty.
      </div>
    );
  }

  const scores = computeAllScores(allBets, results);
  const rankColors = ['bg-[#FEF9C3] border border-[#EAB308]', 'bg-[#F1F5F9] border border-[#CBD5E1]', 'bg-[#FDF6F0] border border-[#FDBA74]'];

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] mb-8">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              {['Rank', 'Owner', 'Total', 'Play-In', 'Rd 1', 'Semis', 'Conf Finals', 'Finals', 'Bonus'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scores.map((s, i) => (
              <tr key={s.ownerName} className={`border-b border-[#F1F5F9] last:border-0 ${i < 3 ? rankColors[i] : (i % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]')}`}>
                <td className="px-4 py-3 font-bold text-[#0F172A]">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </td>
                <td className="px-4 py-3 font-semibold text-[#0F172A]">{s.ownerName}</td>
                <td className="px-4 py-3 font-black text-[18px] text-[#0F172A]">{s.total}</td>
                <td className="px-4 py-3 text-[#475569]">{s.bySection.playIn}</td>
                <td className="px-4 py-3 text-[#475569]">{s.bySection.rounds[0]}</td>
                <td className="px-4 py-3 text-[#475569]">{s.bySection.rounds[1]}</td>
                <td className="px-4 py-3 text-[#475569]">{s.bySection.rounds[2]}</td>
                <td className="px-4 py-3 text-[#475569]">{s.bySection.rounds[3]}</td>
                <td className="px-4 py-3 text-[#475569]">{s.bySection.bonus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PreBetsSection compact />
    </div>
  );
}

// ─── Bets tab ─────────────────────────────────────────────────────────────────

function BetsSection({
  title,
  seriesIds,
  isPlayIn,
}: {
  title: string;
  seriesIds: string[];
  isPlayIn?: boolean;
}) {
  if (allBets.length === 0) return null;

  const owners = allBets.map(o => o.ownerName);

  // Build per-series rows
  const rows = seriesIds.map(id => {
    const resultItem = isPlayIn
      ? results.playIn.find(r => r.gameId === id)
      : results.series.find(r => r.seriesId === id);

    const label  = resultItem?.label ?? id;
    const winner = resultItem?.winner ?? null;
    const score  = isPlayIn ? null : (resultItem as { score?: string | null })?.score ?? null;

    // per-owner pick + status
    const ownerCells = owners.map(ownerName => {
      const ownerBets = allBets.find(o => o.ownerName === ownerName);
      const pick   = isPlayIn
        ? ownerBets?.playIn.find(p => p.gameId === id)?.pick ?? ''
        : ownerBets?.series.find(s => s.seriesId === id)?.pick ?? '';
      const pickScore = isPlayIn ? null : (ownerBets?.series.find(s => s.seriesId === id)?.score ?? null);

      let status: SeriesScoreStatus | 'none' = 'none';
      if (pick && winner !== null) {
        const correct = pick.trim().toLowerCase() === winner.trim().toLowerCase();
        if (correct) {
          if (!isPlayIn && pickScore && score && pickScore === score) status = 'exact';
          else status = 'correct';
        } else {
          if (!isPlayIn && score === '4-3' && pickScore === '4-3') status = 'wrong43';
          else status = 'wrong';
        }
      }
      return { pick, pickScore, status };
    });

    return { id, label, winner, score, ownerCells };
  });

  return (
    <div className="mb-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#94A3B8] mb-3">{title}</p>
      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
        <table className="text-[12px] border-collapse w-full">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8] sticky left-0 bg-[#F8FAFC] z-10 min-w-[120px]">
                Series
              </th>
              {owners.map(o => (
                <th key={o} className="px-2 py-2 text-center text-[10px] font-semibold text-[#94A3B8] min-w-[90px]">
                  {o.split(' ')[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={row.id} className={`border-b border-[#F1F5F9] last:border-0 ${ri % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'}`}>
                <td className="px-3 py-2 font-semibold text-[#0F172A] sticky left-0 bg-inherit z-10 whitespace-nowrap">
                  <span className="block text-[12px]">{row.label}</span>
                  {row.winner && (
                    <span className="block text-[10px] text-[#10B981] font-normal mt-0.5">
                      ✓ {row.winner}{row.score ? ` (${row.score})` : ''}
                    </span>
                  )}
                </td>
                {row.ownerCells.map((cell, ci) => (
                  <td key={owners[ci]} className="px-2 py-2 text-center">
                    {cell.pick ? (
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium leading-tight ${statusStyle(cell.status)}`}>
                        {cell.pick}
                        {cell.pickScore && (
                          <span className="block text-[9px] opacity-70">{cell.pickScore}</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-[#CBD5E1]">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BetsTab() {
  if (allBets.length === 0) {
    return (
      <div className="text-center py-16 text-[#94A3B8] text-[14px]">
        No bets entered yet — data/playoff-bets.json is empty.
      </div>
    );
  }

  const playInIds = results.playIn.map(p => p.gameId);
  const r1Ids     = results.series.filter(s => s.round === 1).map(s => s.seriesId);
  const r2Ids     = results.series.filter(s => s.round === 2).map(s => s.seriesId);
  const r3Ids     = results.series.filter(s => s.round === 3).map(s => s.seriesId);
  const r4Ids     = results.series.filter(s => s.round === 4).map(s => s.seriesId);

  return (
    <div>
      <PreBetsSection />
      <BetsSection title="Play-In" seriesIds={playInIds} isPlayIn />
      {playInComplete && <BetsSection title="Round 1"           seriesIds={r1Ids} />}
      {playInComplete && <BetsSection title="Semifinals"        seriesIds={r2Ids} />}
      {playInComplete && <BetsSection title="Conference Finals" seriesIds={r3Ids} />}
      {playInComplete && <BetsSection title="NBA Finals"        seriesIds={r4Ids} />}
    </div>
  );
}

// ─── Analytics tab ────────────────────────────────────────────────────────────

function AnalyticsRound({ title, items, isPlayIn }: {
  title: string;
  items: { id: string; label: string; teams: [string, string] }[];
  isPlayIn?: boolean;
}) {
  return (
    <div className="mb-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#94A3B8] mb-4">{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map(item => {
          const winPicks = isPlayIn
            ? allBets.map(o => o.playIn.find(p => p.gameId === item.id)?.pick ?? '')
            : allBets.map(o => o.series.find(s => s.seriesId === item.id)?.pick ?? '');
          const scorePicks = isPlayIn
            ? []
            : allBets.map(o => o.series.find(s => s.seriesId === item.id)?.score ?? '');
          return (
            <PlayoffSeriesAnalyticsCard
              key={item.id}
              label={item.label}
              teams={item.teams}
              winPicks={winPicks}
              scorePicks={scorePicks}
              isPlayIn={isPlayIn}
            />
          );
        })}
      </div>
    </div>
  );
}

function AnalyticsTab() {
  if (allBets.length === 0) {
    return (
      <div className="text-center py-16 text-[#94A3B8] text-[14px]">
        No bets entered yet — data/playoff-bets.json is empty.
      </div>
    );
  }

  const playInItems = results.playIn.map(p => ({ id: p.gameId,    label: p.label, teams: p.teams }));
  const r1Items     = results.series.filter(s => s.round === 1).map(s => ({ id: s.seriesId, label: s.label, teams: s.teams }));
  const r2Items     = results.series.filter(s => s.round === 2).map(s => ({ id: s.seriesId, label: s.label, teams: s.teams }));
  const r3Items     = results.series.filter(s => s.round === 3).map(s => ({ id: s.seriesId, label: s.label, teams: s.teams }));
  const r4Items     = results.series.filter(s => s.round === 4).map(s => ({ id: s.seriesId, label: s.label, teams: s.teams }));

  return (
    <div>
      <AnalyticsRound title="Play-In" items={playInItems} isPlayIn />
      {playInComplete && <AnalyticsRound title="Round 1"           items={r1Items} />}
      {playInComplete && <AnalyticsRound title="Semifinals"        items={r2Items} />}
      {playInComplete && <AnalyticsRound title="Conference Finals" items={r3Items} />}
      {playInComplete && <AnalyticsRound title="NBA Finals"        items={r4Items} />}
    </div>
  );
}

// ─── Results tab ─────────────────────────────────────────────────────────────

function ResultsSection({ title, items, isPlayIn }: {
  title: string;
  items: { label: string; teams: [string, string]; winner: string | null; score?: string | null }[];
  isPlayIn?: boolean;
}) {
  return (
    <div className="mb-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#94A3B8] mb-3">{title}</p>
      <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
        {items.map((item, i) => (
          <div key={i} className={`flex items-center justify-between px-4 py-3 border-b border-[#F1F5F9] last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'}`}>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-[#0F172A]">{item.label}</p>
              {item.teams[0] || item.teams[1] ? (
                <p className="text-[12px] text-[#64748B] mt-0.5">
                  {item.teams[0] || 'TBD'} vs {item.teams[1] || 'TBD'}
                </p>
              ) : null}
            </div>
            <div className="shrink-0 ml-4">
              {item.winner ? (
                <div className="flex items-center gap-2">
                  {!isPlayIn && item.score && (
                    <span className="text-[11px] font-bold bg-[#F8FAFC] border border-[#E2E8F0] rounded px-2 py-0.5 text-[#475569]">
                      {item.score}
                    </span>
                  )}
                  <span className="text-[12px] font-semibold text-[#10B981] bg-[#DCFCE7] rounded-lg px-3 py-1">
                    ✓ {item.winner}
                  </span>
                </div>
              ) : (
                <span className="text-[12px] text-[#94A3B8] italic">— Pending —</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultsTab() {
  // Filter out items where both team slots are still empty (e.g. loser-bracket
  // games whose participants aren't determined yet, or later rounds with no teams).
  const hasTeams = (t: [string, string]) => t[0] || t[1];

  const playInGames = results.playIn.filter(g => hasTeams(g.teams));
  const r1Games     = results.series.filter(s => s.round === 1 && hasTeams(s.teams));
  const r2Games     = results.series.filter(s => s.round === 2 && hasTeams(s.teams));
  const r3Games     = results.series.filter(s => s.round === 3 && hasTeams(s.teams));
  const r4Games     = results.series.filter(s => s.round === 4 && hasTeams(s.teams));

  return (
    <div>
      {playInGames.length > 0 && <ResultsSection title="Play-In"           items={playInGames} isPlayIn />}
      {r1Games.length > 0     && <ResultsSection title="Round 1"           items={r1Games} />}
      {r2Games.length > 0     && <ResultsSection title="Semifinals"        items={r2Games} />}
      {r3Games.length > 0     && <ResultsSection title="Conference Finals" items={r3Games} />}
      {r4Games.length > 0     && <ResultsSection title="NBA Finals"        items={r4Games} />}
    </div>
  );
}

// ─── Rules tab ───────────────────────────────────────────────────────────────

function RulesTab() {
  const bonusRows = [
    { bet: 'West Conference Champion', pts: '+7' },
    { bet: 'East Conference Champion', pts: '+7' },
    { bet: 'NBA Champion',             pts: '+15' },
    { bet: 'Both Conference Champions correct',                    pts: '+5 bonus' },
    { bet: 'Both Conferences + NBA Champion correct',              pts: '+10 bonus (stacks with +5)' },
  ];

  const seriesRows = [
    { round: 'Play-In',           correct: '1',    exact: '—', wrong43: '—' },
    { round: 'Round 1',           correct: '2',    exact: '+4 bonus', wrong43: '+1' },
    { round: 'Semifinals',        correct: '3',    exact: '+6 bonus', wrong43: '+2' },
    { round: 'Conference Finals', correct: '4',    exact: '+8 bonus', wrong43: '+3' },
    { round: 'NBA Finals',        correct: '5',    exact: '+10 bonus', wrong43: '+4' },
  ];

  return (
    <div className="max-w-2xl space-y-8">
      {/* Bonus Bets */}
      <div>
        <p className="text-[15px] font-bold text-[#0F172A] mb-4">Bonus Bets</p>
        <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Bet</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Points</th>
              </tr>
            </thead>
            <tbody>
              {bonusRows.map((row, i) => (
                <tr key={i} className={`border-b border-[#F1F5F9] last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'}`}>
                  <td className="px-4 py-3 text-[#0F172A]">{row.bet}</td>
                  <td className="px-4 py-3 text-right font-bold text-[#C8956C]">{row.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Series Scoring */}
      <div>
        <p className="text-[15px] font-bold text-[#0F172A] mb-4">Series Scoring</p>
        <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Round</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Correct Winner</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Exact Score</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">4-3 (Wrong Winner)</th>
              </tr>
            </thead>
            <tbody>
              {seriesRows.map((row, i) => (
                <tr key={i} className={`border-b border-[#F1F5F9] last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'}`}>
                  <td className="px-4 py-3 font-semibold text-[#0F172A]">{row.round}</td>
                  <td className="px-4 py-3 text-center font-bold text-[#10B981]">{row.correct}</td>
                  <td className="px-4 py-3 text-center font-bold text-[#EAB308]">{row.exact}</td>
                  <td className="px-4 py-3 text-center font-bold text-[#F59E0B]">{row.wrong43}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Special bonus */}
      <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-xl px-5 py-4">
        <p className="text-[13px] font-bold text-[#92400E] mb-1">⭐ Special Bonus</p>
        <p className="text-[13px] text-[#92400E]">
          All 8 Round 1 series winners correct → <strong>+8 points</strong>
        </p>
      </div>

      {/* Legend */}
      <div>
        <p className="text-[13px] font-bold text-[#0F172A] mb-3">Score Legend</p>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Exact (winner + score)', style: 'bg-[#FEF9C3] border-2 border-[#EAB308] text-[#713F12]' },
            { label: 'Correct winner',         style: 'bg-[#DCFCE7] text-[#14532D]' },
            { label: '4-3 wrong winner',       style: 'bg-[#FEF3C7] text-[#92400E]' },
            { label: 'Wrong',                  style: 'bg-[#FEE2E2] text-[#7F1D1D]' },
            { label: 'Pending',                style: 'bg-white border border-[#E2E8F0] text-[#475569]' },
          ].map(({ label, style }) => (
            <span key={label} className={`text-[12px] font-medium rounded px-2.5 py-1 ${style}`}>{label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function NBAPlayoffsPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const tabParam = searchParams.tab ?? 'leaderboard';
  const tab = ['leaderboard', 'bets', 'analytics', 'results', 'rules'].includes(tabParam)
    ? (tabParam as 'leaderboard' | 'bets' | 'analytics' | 'results' | 'rules')
    : 'leaderboard';

  const ownerCount     = allBets.length;
  const playInDone     = results.playIn.filter(g => g.winner !== null).length;
  const playInTotal    = results.playIn.length;
  const seriesComplete = results.series.filter(s => s.winner !== null).length;
  const seriesTotal    = results.series.length;

  const stageLabel = !playInComplete
    ? `Play-In · ${playInDone}/${playInTotal} games complete`
    : `Playoffs · ${seriesComplete}/${seriesTotal} series complete`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[28px] sm:text-[32px] font-black tracking-tight text-[#0F172A]">
          NBA 2026 Playoffs
        </h1>
        <p className="text-[14px] text-[#475569] mt-1">
          {ownerCount > 0
            ? `${ownerCount} participants · ${stageLabel}`
            : `Play-In Tournament · April 14–17 · Playoffs begin April 18`}
        </p>
      </div>

      {/* Tab nav */}
      <Suspense>
        <PlayoffTabNav active={tab} />
      </Suspense>

      {/* Tab content */}
      {tab === 'leaderboard' && <LeaderboardTab />}
      {tab === 'bets'        && <BetsTab />}
      {tab === 'analytics'   && <AnalyticsTab />}
      {tab === 'results'     && <ResultsTab />}
      {tab === 'rules'       && <RulesTab />}
    </div>
  );
}
