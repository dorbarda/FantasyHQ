import type { MatchupDepthRow } from './types';

/**
 * Power rankings — who is hot right now.
 *
 * Teams are ranked by score per player started over the last `window`
 * completed weeks (total points ÷ total players, so a 14-day week counts as
 * one week, not two). Improvement is measured against the `window` weeks
 * before that: the change in score/player and the move in rank.
 */

export interface PowerRankingEntry {
  teamId: string;
  teamName: string;
  ownerName: string;
  rank: number;
  recentScorePP: number;
  /** null when there aren't enough earlier weeks to compare against */
  priorScorePP: number | null;
  priorRank: number | null;
  /** recentScorePP - priorScorePP */
  change: number | null;
  /** priorRank - rank: positive = moved up */
  rankMove: number | null;
  /** score/player per week, oldest first, covering both windows */
  weekly: { week: number; scorePP: number }[];
}

export interface PowerRankings {
  entries: PowerRankingEntry[];
  recentWeeks: number[];
  priorWeeks: number[];
}

function scorePerPlayer(rows: MatchupDepthRow[]): number | null {
  const players = rows.reduce((s, r) => s + r.totalPlayers, 0);
  if (players <= 0) return null;
  return rows.reduce((s, r) => s + r.teamScore, 0) / players;
}

function rankBy(values: Map<string, number>): Map<string, number> {
  const ordered = [...values.entries()].sort((a, b) => b[1] - a[1]);
  return new Map(ordered.map(([id], i) => [id, i + 1]));
}

export function computePowerRankings(rows: MatchupDepthRow[], window = 3): PowerRankings {
  const completed = rows.filter(r => r.won !== null);
  const weeks = [...new Set(completed.map(r => r.matchupPeriod))].sort((a, b) => a - b);
  const recentWeeks = weeks.slice(-window);
  const priorWeeks = weeks.slice(-window * 2, -window);

  const byTeam = new Map<string, MatchupDepthRow[]>();
  for (const r of completed) {
    if (!byTeam.has(r.teamId)) byTeam.set(r.teamId, []);
    byTeam.get(r.teamId)!.push(r);
  }

  const recent = new Map<string, number>();
  const prior = new Map<string, number>();
  for (const [teamId, tRows] of byTeam) {
    const r = scorePerPlayer(tRows.filter(x => recentWeeks.includes(x.matchupPeriod)));
    if (r !== null) recent.set(teamId, r);
    const p = scorePerPlayer(tRows.filter(x => priorWeeks.includes(x.matchupPeriod)));
    if (p !== null) prior.set(teamId, p);
  }

  const recentRanks = rankBy(recent);
  // Only rank the prior window when every ranked team has one, so a rank
  // move always compares the same set of teams.
  const priorRanks = priorWeeks.length > 0 && [...recent.keys()].every(id => prior.has(id))
    ? rankBy(new Map([...prior].filter(([id]) => recent.has(id))))
    : null;

  const shownWeeks = [...priorWeeks, ...recentWeeks];
  const entries: PowerRankingEntry[] = [...recent.entries()].map(([teamId, recentScorePP]) => {
    const tRows = byTeam.get(teamId)!;
    const priorScorePP = prior.get(teamId) ?? null;
    const rank = recentRanks.get(teamId)!;
    const priorRank = priorRanks?.get(teamId) ?? null;
    return {
      teamId,
      teamName: tRows[0].teamName,
      ownerName: tRows[0].ownerName,
      rank,
      recentScorePP,
      priorScorePP,
      priorRank,
      change: priorScorePP !== null ? recentScorePP - priorScorePP : null,
      rankMove: priorRank !== null ? priorRank - rank : null,
      weekly: shownWeeks.flatMap(week => {
        const row = tRows.find(x => x.matchupPeriod === week);
        return row && row.totalPlayers > 0
          ? [{ week, scorePP: row.teamScore / row.totalPlayers }]
          : [];
      }),
    };
  });
  entries.sort((a, b) => a.rank - b.rank);

  return { entries, recentWeeks, priorWeeks };
}
