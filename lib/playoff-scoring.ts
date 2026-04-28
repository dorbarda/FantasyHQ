import type {
  OwnerPlayoffBets,
  PlayoffResults,
  OwnerScoreResult,
  SeriesScoreDetail,
  SeriesScoreStatus,
} from './types';

// ─── Scoring constants ────────────────────────────────────────────────────────

export const FINALS_WINNER_POINTS: Record<string, number> = {
  'Oklahoma City Thunder':    15,
  'San Antonio Spurs':        17,
  'Boston Celtics':           17,
  'Denver Nuggets':           19,
  'Cleveland Cavaliers':      20,
  'Detroit Pistons':          21,
  'New York Knicks':          22,
  'Houston Rockets':          23,
  'Minnesota Timberwolves':   24,
  'Atlanta Hawks':            26,
  'Orlando Magic':            26,
  'Los Angeles Lakers':       27,
  'Philadelphia 76ers':       27,
  'Toronto Raptors':          28,
  'Phoenix Suns':             29,
  'Portland Trail Blazers':   30,
};

const ROUND_POINTS = {
  playIn: { winner: 1, exact: 0, wrong43: 0 },
  1:      { winner: 2, exact: 2, wrong43: 1 },
  2:      { winner: 3, exact: 3, wrong43: 2 },
  3:      { winner: 4, exact: 4, wrong43: 3 },
  4:      { winner: 5, exact: 5, wrong43: 4 },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function teamMatches(pick: string, actual: string): boolean {
  if (!pick || !actual) return false;
  return pick.trim().toLowerCase() === actual.trim().toLowerCase();
}

// ─── Main scoring function ────────────────────────────────────────────────────

export function computeOwnerScore(
  ownerBets: OwnerPlayoffBets,
  results: PlayoffResults,
): OwnerScoreResult {
  const detail: SeriesScoreDetail[] = [];
  let playInPts = 0;
  const roundPts: [number, number, number, number] = [0, 0, 0, 0];

  // ── Play-In ──────────────────────────────────────────────────────────────
  for (const bet of ownerBets.playIn) {
    const result = results.playIn.find(r => r.gameId === bet.gameId);
    if (!result || result.winner === null) {
      detail.push({ seriesId: bet.gameId, earned: 0, status: 'pending' });
      continue;
    }
    const correct = teamMatches(bet.pick, result.winner);
    const earned = correct ? ROUND_POINTS.playIn.winner : 0;
    const status: SeriesScoreStatus = correct ? 'correct' : 'wrong';
    playInPts += earned;
    detail.push({ seriesId: bet.gameId, earned, status });
  }

  // ── Series ───────────────────────────────────────────────────────────────
  for (const bet of ownerBets.series) {
    const result = results.series.find(r => r.seriesId === bet.seriesId);
    if (!result || result.winner === null) {
      detail.push({ seriesId: bet.seriesId, earned: 0, status: 'pending' });
      continue;
    }

    const roundKey = result.round as 1 | 2 | 3 | 4;
    const pts = ROUND_POINTS[roundKey];
    const correctWinner = teamMatches(bet.pick, result.winner);

    let status: SeriesScoreStatus;
    let earned: number;

    if (correctWinner) {
      const exactScore = result.score && bet.score && bet.score === result.score;
      if (exactScore) {
        status = 'exact';
        earned = pts.winner + pts.exact;
      } else {
        status = 'correct';
        earned = pts.winner;
      }
    } else {
      // Wrong winner — check for 4-3 wrong (picked the loser and the score was 4-3)
      const was43 = result.score === '4-3' && bet.score === '4-3';
      if (was43) {
        status = 'wrong43';
        earned = pts.wrong43;
      } else {
        status = 'wrong';
        earned = 0;
      }
    }

    roundPts[roundKey - 1] += earned;
    detail.push({ seriesId: bet.seriesId, earned, status });
  }

  // ── Bonus bets ───────────────────────────────────────────────────────────
  let bonusPts = 0;
  const bonus = ownerBets.bonusBets;

  // Find west/east/finals winners from series results
  const westFinalResult  = results.series.find(s => s.seriesId === 'r3-w');
  const eastFinalResult  = results.series.find(s => s.seriesId === 'r3-e');
  const nbaFinalResult   = results.series.find(s => s.seriesId === 'r4');

  const westCorrect  = westFinalResult?.winner !== null && teamMatches(bonus.westChampion,  westFinalResult!.winner!);
  const eastCorrect  = eastFinalResult?.winner !== null && teamMatches(bonus.eastChampion,  eastFinalResult!.winner!);
  const champCorrect = nbaFinalResult?.winner  !== null && teamMatches(bonus.nbaChampion,   nbaFinalResult!.winner!);

  if (westCorrect)  bonusPts += 7;
  if (eastCorrect)  bonusPts += 7;
  if (champCorrect) bonusPts += FINALS_WINNER_POINTS[bonus.nbaChampion] ?? 15;

  // Combo bonuses
  if (westCorrect && eastCorrect)               bonusPts += 5;
  if (westCorrect && eastCorrect && champCorrect) bonusPts += 10;  // stacks with +5

  // All 8 Round 1 winners correct
  const r1Series = results.series.filter(s => s.round === 1);
  const r1Bets   = ownerBets.series.filter(b => r1Series.some(s => s.seriesId === b.seriesId));
  const allR1Done    = r1Series.length === 8 && r1Series.every(s => s.winner !== null);
  const allR1Correct = allR1Done && r1Series.every(s => {
    const b = r1Bets.find(b => b.seriesId === s.seriesId);
    return b && teamMatches(b.pick, s.winner!);
  });
  if (allR1Correct) bonusPts += 8;

  return {
    total: playInPts + roundPts[0] + roundPts[1] + roundPts[2] + roundPts[3] + bonusPts,
    bySection: { playIn: playInPts, rounds: roundPts, bonus: bonusPts },
    detail,
  };
}

// ─── Convenience: score all owners ───────────────────────────────────────────

export function computeAllScores(
  owners: OwnerPlayoffBets[],
  results: PlayoffResults,
): Array<{ ownerName: string } & OwnerScoreResult> {
  return owners
    .map(o => ({ ownerName: o.ownerName, ...computeOwnerScore(o, results) }))
    .sort((a, b) => b.total - a.total);
}
