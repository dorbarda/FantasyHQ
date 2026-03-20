import { hasEspnCredentials, getMatchupDepth } from '@/lib/espn';
import type { MatchupDepthRow } from '@/lib/types';
import AnalysisTable, { type TeamAnalytics } from '@/components/AnalysisTable';
import WeeklyHighlights, { type WeeklyScoreEntry } from '@/components/WeeklyHighlights';

export const revalidate = 1800;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = avg(arr);
  return Math.sqrt(arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / arr.length);
}

// ─── Computation ──────────────────────────────────────────────────────────────

function computeAnalytics(rows: MatchupDepthRow[]): {
  teams: TeamAnalytics[];
  topScores: WeeklyScoreEntry[];
  bottomScores: WeeklyScoreEntry[];
  biggestBlowouts: WeeklyScoreEntry[];
  leagueSummary: { totalWeeks: number; avgLeagueScore: number; highScore: number; lowScore: number };
} {
  const completedRows = rows.filter(r => r.won !== null);

  // Group by team
  const byTeam: Record<string, MatchupDepthRow[]> = {};
  for (const row of completedRows) {
    if (!byTeam[row.teamId]) byTeam[row.teamId] = [];
    byTeam[row.teamId].push(row);
  }

  // Group by week (all teams' rows per week) for expected-wins computation
  const byWeek: Record<number, MatchupDepthRow[]> = {};
  for (const row of completedRows) {
    if (!byWeek[row.matchupPeriod]) byWeek[row.matchupPeriod] = [];
    byWeek[row.matchupPeriod].push(row);
  }

  // Expected wins per team: for each week, fraction of opponents you'd beat
  const expectedWinsMap: Record<string, number> = {};
  for (const weekRows of Object.values(byWeek)) {
    const n = weekRows.length;
    for (const row of weekRows) {
      const beaten = weekRows.filter((r: MatchupDepthRow) => r.teamId !== row.teamId && r.teamScore < row.teamScore).length;
      const ew = n > 1 ? beaten / (n - 1) : 0;
      expectedWinsMap[row.teamId] = (expectedWinsMap[row.teamId] ?? 0) + ew;
    }
  }

  // Build per-team analytics
  const teams: TeamAnalytics[] = [];
  for (const [teamId, tRows] of Object.entries(byTeam)) {
    const scores = tRows.map((r: MatchupDepthRow) => r.teamScore);
    const spps = tRows.map((r: MatchupDepthRow) => r.scorePP).filter((v: number) => v > 0 && isFinite(v));
    // avgPlayers per day = totalPlayers / days in that week, avg across weeks
    const playersPerDay = tRows.map((r: MatchupDepthRow) => {
      const days = r.dailyPlayers.length || 1;
      return r.totalPlayers / days;
    });

    const wins = tRows.filter((r: MatchupDepthRow) => r.won === true).length;
    const losses = tRows.filter((r: MatchupDepthRow) => r.won === false).length;

    const bestRow = tRows.reduce((b: MatchupDepthRow, r: MatchupDepthRow) => r.teamScore > b.teamScore ? r : b, tRows[0]);
    const worstRow = tRows.reduce((w: MatchupDepthRow, r: MatchupDepthRow) => r.teamScore < w.teamScore ? r : w, tRows[0]);

    // Depth advantage: weeks where you started more total players than opponent
    let depthAdvWins = 0, depthAdvTotal = 0, depthDisadvWins = 0, depthDisadvTotal = 0;
    for (const r of tRows) {
      const hadAdvantage = r.totalPlayers > 0 && r.opponentScore !== undefined;
      // Find the opponent row to compare totalPlayers
      const oppRow = completedRows.find(
        or => or.matchupPeriod === r.matchupPeriod && or.ownerName === r.opponentName
      );
      if (!oppRow) continue;
      if (r.totalPlayers > oppRow.totalPlayers) {
        depthAdvTotal++;
        if (r.won) depthAdvWins++;
      } else if (r.totalPlayers < oppRow.totalPlayers) {
        depthDisadvTotal++;
        if (r.won) depthDisadvWins++;
      }
    }

    const expectedWins = expectedWinsMap[teamId] ?? 0;

    teams.push({
      teamId,
      teamName: tRows[0].teamName,
      ownerName: tRows[0].ownerName,
      isYou: tRows[0].isYou,
      wins,
      losses,
      avgScore: avg(scores),
      scoreStdDev: stdDev(scores),
      bestWeekScore: bestRow.teamScore,
      bestWeekPeriod: bestRow.matchupPeriod,
      worstWeekScore: worstRow.teamScore,
      worstWeekPeriod: worstRow.matchupPeriod,
      avgPlayers: avg(playersPerDay),
      avgScorePP: avg(spps),
      expectedWins,
      luckDelta: wins - expectedWins,
      depthAdvWins,
      depthAdvTotal,
      depthDisadvWins,
      depthDisadvTotal,
    });
  }

  // Default sort by avg score desc
  teams.sort((a, b) => b.avgScore - a.avgScore);

  // Weekly highlights — all completed rows as WeeklyScoreEntry
  const allEntries: WeeklyScoreEntry[] = completedRows.map(r => ({
    ownerName: r.ownerName,
    teamName: r.teamName,
    isYou: r.isYou,
    week: r.matchupPeriod,
    score: r.teamScore,
    opponentName: r.opponentName,
    opponentScore: r.opponentScore,
    won: r.won,
    margin: r.teamScore - r.opponentScore,
  }));

  const topScores = [...allEntries].sort((a, b) => b.score - a.score).slice(0, 5);
  const bottomScores = [...allEntries].sort((a, b) => a.score - b.score).slice(0, 5);
  const biggestBlowouts = [...allEntries]
    .filter(e => e.won === true)
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 5);

  const allScores = completedRows.map(r => r.teamScore);
  return {
    teams,
    topScores,
    bottomScores,
    biggestBlowouts,
    leagueSummary: {
      totalWeeks: Object.keys(byWeek).length,
      avgLeagueScore: avg(allScores),
      highScore: Math.max(...allScores),
      lowScore: Math.min(...allScores),
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AnalysisPage() {
  if (!hasEspnCredentials()) {
    return (
      <div className="py-5">
        <h1 className="text-[28px] font-bold tracking-tight text-[#F0F4F8] mb-2">Analysis</h1>
        <p className="text-[15px] text-[#94A3B8]">ESPN credentials required.</p>
      </div>
    );
  }

  let error = false;
  let result: ReturnType<typeof computeAnalytics> | null = null;

  try {
    const data = await getMatchupDepth();
    if (data.rows.length > 0) result = computeAnalytics(data.rows);
  } catch (err) {
    console.error('Analysis fetch failed:', err);
    error = true;
  }

  if (error || !result) {
    return (
      <div className="py-5">
        <h1 className="text-[28px] font-bold tracking-tight text-[#F0F4F8] mb-2">Analysis</h1>
        <p className="text-[15px] text-[#94A3B8]">Could not load data — try again later.</p>
      </div>
    );
  }

  const { teams, topScores, bottomScores, biggestBlowouts, leagueSummary } = result;

  // Depth insight cards
  const mostPlayers = [...teams].sort((a, b) => b.avgPlayers - a.avgPlayers)[0];
  const mostConsistent = [...teams].sort((a, b) => a.scoreStdDev - b.scoreStdDev)[0];
  const luckiest = [...teams].sort((a, b) => b.luckDelta - a.luckDelta)[0];
  const mostEfficient = [...teams].sort((a, b) => b.avgScorePP - a.avgScorePP)[0];

  return (
    <div className="py-5">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-[28px] font-bold tracking-tight text-[#F0F4F8]">Analysis</h1>
        <p className="text-[15px] text-[#94A3B8] font-medium">
          {leagueSummary.totalWeeks} week{leagueSummary.totalWeeks !== 1 ? 's' : ''} · avg {leagueSummary.avgLeagueScore.toFixed(1)} pts/team · season high {leagueSummary.highScore.toFixed(1)}
        </p>
      </div>

      {/* Insight cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Most Consistent', value: mostConsistent.ownerName, sub: `±${mostConsistent.scoreStdDev.toFixed(1)} std dev`, color: '#34D399' },
          { label: 'Most Efficient', value: mostEfficient.ownerName, sub: `${mostEfficient.avgScorePP.toFixed(1)} pts/player`, color: '#C8956C' },
          { label: 'Most Starters', value: mostPlayers.ownerName, sub: `${mostPlayers.avgPlayers.toFixed(2)} players/day`, color: '#94A3B8' },
          { label: 'Luckiest', value: luckiest.ownerName, sub: `+${luckiest.luckDelta.toFixed(1)} luck delta`, color: luckiest.luckDelta >= 0 ? '#34D399' : '#F87171' },
        ].map(card => (
          <div key={card.label} className="bg-[#161b22] border border-[#1E3050] rounded-xl px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: card.color }}>
              {card.label}
            </p>
            <p className="text-[15px] font-bold text-[#F0F4F8] leading-tight">{card.value}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Team rankings table */}
      <section className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-3">
          Team Rankings · Click any column header to sort
        </p>
        <AnalysisTable teams={teams} />
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {[
            ['Std Dev', 'Score volatility week to week — lower means more consistent'],
            ['Avg PPD', 'Average players started per day of the week'],
            ['Score/PP', 'Average score per player started — quality over quantity'],
            ['Luck', 'Actual wins minus expected wins (if you played every team each week)'],
          ].map(([term, def]) => (
            <p key={term} className="text-[11px] text-[#64748B]">
              <span className="text-[#94A3B8] font-medium">{term}:</span> {def}
            </p>
          ))}
        </div>
      </section>

      <div className="border-b border-[#1E3050] mb-6" />

      {/* Weekly highlights */}
      <section className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-3">
          Weekly Highlights
        </p>
        <WeeklyHighlights
          topScores={topScores}
          bottomScores={bottomScores}
          biggestBlowouts={biggestBlowouts}
        />
      </section>

      <div className="border-b border-[#1E3050] mb-6" />

      {/* Depth analysis table */}
      <section>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-3">
          Depth Advantage
        </p>
        <p className="text-[12px] text-[#64748B] mb-3">
          Win rate when starting more players than your opponent vs. fewer players
        </p>
        <div className="overflow-x-auto rounded-xl border border-[#1E3050]">
          <table className="w-full text-sm">
            <thead className="border-b border-[#1E3050] bg-[#0d1117]/60">
              <tr>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]">Team</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]">More Players</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]">Fewer Players</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]">Depth Matters?</th>
              </tr>
            </thead>
            <tbody>
              {[...teams].sort((a, b) => {
                const aPct = a.depthAdvTotal > 0 ? a.depthAdvWins / a.depthAdvTotal : 0;
                const bPct = b.depthAdvTotal > 0 ? b.depthAdvWins / b.depthAdvTotal : 0;
                return bPct - aPct;
              }).map(t => {
                const advPct = t.depthAdvTotal > 0 ? t.depthAdvWins / t.depthAdvTotal : null;
                const disadvPct = t.depthDisadvTotal > 0 ? t.depthDisadvWins / t.depthDisadvTotal : null;
                const delta = advPct !== null && disadvPct !== null ? advPct - disadvPct : null;
                return (
                  <tr key={t.teamId} className={`border-b border-[#1E3050]/50 last:border-0 ${t.isYou ? 'bg-[#1a2744]/40' : 'hover:bg-[#161b22]/60'}`}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        {t.isYou && <span className="text-[9px] font-bold bg-[#C8956C]/20 text-[#C8956C] border border-[#C8956C]/30 rounded px-1 py-0.5">YOU</span>}
                        <span className="text-[13px] font-semibold text-[#F0F4F8]">{t.ownerName}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {advPct !== null ? (
                        <span className="text-[13px] font-mono" style={{ color: advPct >= 0.6 ? '#34D399' : advPct >= 0.4 ? '#94A3B8' : '#F87171' }}>
                          {(advPct * 100).toFixed(0)}%
                        </span>
                      ) : <span className="text-[#64748B]">—</span>}
                      <span className="ml-1.5 text-[11px] text-[#64748B]">({t.depthAdvWins}/{t.depthAdvTotal})</span>
                    </td>
                    <td className="px-3 py-2.5">
                      {disadvPct !== null ? (
                        <span className="text-[13px] font-mono" style={{ color: disadvPct >= 0.5 ? '#34D399' : disadvPct >= 0.3 ? '#94A3B8' : '#F87171' }}>
                          {(disadvPct * 100).toFixed(0)}%
                        </span>
                      ) : <span className="text-[#64748B]">—</span>}
                      <span className="ml-1.5 text-[11px] text-[#64748B]">({t.depthDisadvWins}/{t.depthDisadvTotal})</span>
                    </td>
                    <td className="px-3 py-2.5">
                      {delta !== null ? (
                        <span className={`text-[12px] font-medium ${delta > 0.15 ? 'text-[#34D399]' : delta < -0.1 ? 'text-[#F87171]' : 'text-[#94A3B8]'}`}>
                          {delta > 0.15 ? 'Yes — depth wins' : delta < -0.1 ? 'No — talent wins' : 'Neutral'}
                        </span>
                      ) : <span className="text-[#64748B]">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
