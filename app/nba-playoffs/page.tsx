import { Suspense } from 'react';
import betsJson          from '@/data/playoff-bets.json';
import resultsJson       from '@/data/playoff-results.json';
import finesJson         from '@/data/playoff-fines.json';
import playoffHistoryJson from '@/data/playoff-history.json';
import { computeAllScores } from '@/lib/playoff-scoring';
import type {
  OwnerPlayoffBets,
  PlayoffResults,
  PlayoffFine,
} from '@/lib/types';
import PlayoffTabNav from '@/components/PlayoffTabNav';
import OwnerBracketView from '@/components/OwnerBracketView';
import BetsTabV2 from '@/components/BetsTabV2';
import AnalyticsTabV2 from '@/components/AnalyticsTabV2';

interface PlayoffHistoryEntry {
  year: number;
  label: string;
  nbaChampion: string;
  nbaRunnerUp: string;
  nbaScore: string;
  fantasyWinner:   { ownerName: string; points: number; exactScores: number };
  fantasyRunnerUp: { ownerName: string; points: number; exactScores: number };
}

export const revalidate = 300;

// ─── Cast JSON to typed shapes ────────────────────────────────────────────────

const allBets: OwnerPlayoffBets[] = betsJson.owners as OwnerPlayoffBets[];
const results: PlayoffResults     = resultsJson as PlayoffResults;
const fines: PlayoffFine[]        = finesJson as PlayoffFine[];

// ─── Stage detection ─────────────────────────────────────────────────────────
// Only advance past play-in once all play-in games have a winner
const playInComplete = results.playIn.every(g => g.winner !== null);

// ─── Leaderboard tab ──────────────────────────────────────────────────────────

function LeaderboardTab() {
  if (allBets.length === 0) {
    return (
      <div className="text-center py-16 text-[#94A3B8] text-[14px]">
        No bets entered yet — data/playoff-bets.json is empty.
      </div>
    );
  }

  const rawScores = computeAllScores(allBets, results);

  // Apply fines and re-sort
  const scores = rawScores
    .map(s => {
      const fine = fines.find(f => f.ownerName === s.ownerName);
      return fine ? { ...s, total: s.total + fine.points, fine } : { ...s, fine: undefined };
    })
    .sort((a, b) => b.total - a.total);

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
                <td className="px-4 py-3 font-semibold text-[#0F172A]">
                  <span className="inline-flex items-center gap-1.5">
                    {s.ownerName}
                    {s.fine && (
                      <span
                        title={`Fine: ${s.fine.reason} (${s.fine.points} pts)`}
                        style={{
                          display: 'inline-block',
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: '#EF4444',
                          flexShrink: 0,
                          cursor: 'help',
                        }}
                      />
                    )}
                  </span>
                </td>
                <td className="px-4 py-3 font-black text-[18px] text-[#0F172A]">
                  <span>{s.total}</span>
                  {s.fine && (
                    <span className="ml-1.5 text-[11px] font-semibold text-[#EF4444]">
                      ({s.fine.points})
                    </span>
                  )}
                </td>
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
    </div>
  );
}

// ─── Bets tab ─────────────────────────────────────────────────────────────────

function BetsTab() {
  return <BetsTabV2 allBets={allBets} results={results} />;
}

// ─── Analytics tab ────────────────────────────────────────────────────────────

function AnalyticsTab() {
  return <AnalyticsTabV2 allBets={allBets} results={results} fines={fines} />;
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
    { round: 'Round 1',           correct: '2',    exact: '+2 bonus', wrong43: '+1' },
    { round: 'Semifinals',        correct: '3',    exact: '+3 bonus', wrong43: '+2' },
    { round: 'Conference Finals', correct: '4',    exact: '+4 bonus', wrong43: '+3' },
    { round: 'NBA Finals',        correct: '5',    exact: '+5 bonus', wrong43: '+4' },
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

// ─── Bracket tab ─────────────────────────────────────────────────────────────

function BracketTab() {
  if (allBets.length === 0) {
    return (
      <div className="text-center py-16 text-[#94A3B8] text-[14px]">
        No bets entered yet — data/playoff-bets.json is empty.
      </div>
    );
  }

  const r1Series = results.series.filter(s => s.round === 1);
  const r2Series = results.series.filter(s => s.round === 2);
  const r3Series = results.series.filter(s => s.round === 3);
  const championResults = {
    west: results.series.find(s => s.seriesId === 'r3-w')?.winner ?? null,
    east: results.series.find(s => s.seriesId === 'r3-e')?.winner ?? null,
    nba:  results.series.find(s => s.seriesId === 'r4')?.winner   ?? null,
  };

  return (
    <OwnerBracketView
      owners={allBets}
      r1Series={r1Series}
      r2Series={r2Series}
      r3Series={r3Series}
      championResults={championResults}
    />
  );
}

// ─── History tab ─────────────────────────────────────────────────────────────

function HistoryTab() {
  const history = playoffHistoryJson as PlayoffHistoryEntry[];
  const sorted  = [...history].sort((a, b) => b.year - a.year);

  if (sorted.length === 0) {
    return (
      <div className="text-center py-16 text-[#94A3B8] text-[14px]">
        No past seasons logged yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {sorted.map(entry => (
        <div
          key={entry.year}
          className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm"
        >
          {/* Season header */}
          <div className="px-5 pt-4 pb-3 border-b border-[#E2E8F0] bg-gradient-to-r from-[#F8FAFC] to-[#F1F5F9] flex items-center justify-between">
            <h2 className="text-[20px] font-black tracking-tight text-[#0F172A]">
              {entry.label} Season
            </h2>
            <span className="text-[11px] font-semibold text-[#94A3B8]">
              🏀 {entry.nbaChampion} won {entry.nbaScore} over {entry.nbaRunnerUp}
            </span>
          </div>

          {/* Fantasy winner + runner-up */}
          <div className="px-5 py-4 flex flex-col sm:flex-row gap-3">
            {/* Winner */}
            <div className="flex-1 flex items-center gap-3 bg-[#FFFBEB] border border-[#F59E0B]/30 rounded-xl px-4 py-3">
              <span className="text-[28px] shrink-0">🏆</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#D97706] mb-0.5">Fantasy Champion</p>
                <p className="text-[16px] font-black text-[#0F172A] truncate">{entry.fantasyWinner.ownerName}</p>
                <p className="text-[12px] font-semibold text-[#D97706]">
                  {entry.fantasyWinner.points} pts · {entry.fantasyWinner.exactScores} exact
                </p>
              </div>
            </div>
            {/* Runner-up */}
            <div className="flex-1 flex items-center gap-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3">
              <span className="text-[28px] shrink-0">🥈</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8] mb-0.5">Runner-Up</p>
                <p className="text-[16px] font-black text-[#0F172A] truncate">{entry.fantasyRunnerUp.ownerName}</p>
                <p className="text-[12px] text-[#94A3B8]">
                  {entry.fantasyRunnerUp.points} pts · {entry.fantasyRunnerUp.exactScores} exact
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
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
  const tab = ['leaderboard', 'bets', 'analytics', 'bracket', 'results', 'rules', 'history'].includes(tabParam)
    ? (tabParam as 'leaderboard' | 'bets' | 'analytics' | 'bracket' | 'results' | 'rules' | 'history')
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
      {tab === 'bracket'     && <BracketTab />}
      {tab === 'results'     && <ResultsTab />}
      {tab === 'rules'       && <RulesTab />}
      {tab === 'history'     && <HistoryTab />}
    </div>
  );
}
