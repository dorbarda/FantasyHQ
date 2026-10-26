/**
 * Category profile — the 7 categories shown on the Analysis page radar:
 * FG% (FGM/FGA), FT% (FTM/FTA), REB, AST, STOCKS (STL+BLK), PTS, TO.
 *
 * Built from SeasonStats totals. Each category is ranked across the league
 * (ties share a rank) and turned into a 0-100 score for the radar, where
 * 100 = league leader. TO is the one category where lower is better.
 */
import type { SeasonStats } from './types';

export const PROFILE_KEYS = ['fgPct', 'ftPct', 'reb', 'ast', 'stocks', 'pts', 'to'] as const;
export type ProfileKey = typeof PROFILE_KEYS[number];

export const PROFILE_LABELS: Record<ProfileKey, string> = {
  fgPct: 'FG%', ftPct: 'FT%', reb: 'REB', ast: 'AST', stocks: 'STOCKS', pts: 'PTS', to: 'TO',
};

const LOWER_IS_BETTER: ReadonlySet<ProfileKey> = new Set<ProfileKey>(['to']);

export interface ProfileStat {
  value: number;
  rank: number;   // 1 = best; tied teams share a rank
  score: number;  // 0-100 radar score, 100 = league leader
}

export interface TeamProfile {
  teamId: string;
  teamName: string;
  ownerName: string;
  stats: Record<ProfileKey, ProfileStat>;
}

export interface CategoryLeader {
  key: ProfileKey;
  label: string;
  value: number;
  ownerNames: string[]; // more than one when tied for first
}

export interface CategoryProfile {
  teams: TeamProfile[];
  leaders: CategoryLeader[];
}

function rawValues(s: SeasonStats): Record<ProfileKey, number> {
  return {
    fgPct: s.fga > 0 ? s.fgm / s.fga : 0,
    ftPct: s.fta > 0 ? s.ftm / s.fta : 0,
    reb: s.reb,
    ast: s.ast,
    stocks: s.stl + s.blk,
    pts: s.pts,
    to: s.to,
  };
}

export function computeCategoryProfile(seasonStats: SeasonStats[]): CategoryProfile {
  const n = seasonStats.length;
  const values = seasonStats.map(rawValues);

  const teams: TeamProfile[] = seasonStats.map(s => ({
    teamId: s.teamId,
    teamName: s.teamName,
    ownerName: s.ownerName,
    stats: {} as Record<ProfileKey, ProfileStat>,
  }));

  const leaders: CategoryLeader[] = [];

  for (const key of PROFILE_KEYS) {
    const better = (a: number, b: number) => (LOWER_IS_BETTER.has(key) ? a < b : a > b);
    values.forEach((v, i) => {
      const rank = 1 + values.filter(o => better(o[key], v[key])).length;
      const score = n > 0 ? Math.round(((n + 1 - rank) / n) * 100) : 0;
      teams[i].stats[key] = { value: v[key], rank, score };
    });

    const top = teams.filter(t => t.stats[key].rank === 1);
    if (top.length) {
      leaders.push({
        key,
        label: PROFILE_LABELS[key],
        value: top[0].stats[key].value,
        ownerNames: top.map(t => t.ownerName),
      });
    }
  }

  return { teams, leaders };
}

/** FG% / FT% as "48.1%", counting stats as "12,947". */
export function formatProfileValue(key: ProfileKey, value: number): string {
  if (key === 'fgPct' || key === 'ftPct') return `${(value * 100).toFixed(1)}%`;
  return Math.round(value).toLocaleString('en-US');
}
