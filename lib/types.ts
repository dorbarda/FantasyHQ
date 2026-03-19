export interface Streak {
  type: 'W' | 'L';
  count: number;
}

export interface StandingEntry {
  rank: number;
  powerRank: number;
  teamId: string;
  teamName: string;
  ownerName: string;
  wins: number;
  losses: number;
  points: number;
  streak: Streak;
  isYou: boolean;
  moves: number;
}

export interface MatchupTeam {
  teamId: string;
  teamName: string;
  ownerName: string;
  projectedScore: number;
  actualScore: number;
  isYou: boolean;
}

export interface Matchup {
  id: string;
  home: MatchupTeam;
  away: MatchupTeam;
  isLive: boolean;
}

export interface MatchupsData {
  week: number;
  matchups: Matchup[];
}

export interface Player {
  id: string;
  name: string;
  team: string;
  position: 'G' | 'F' | 'C';
  pts: number;
  reb: number;
  ast: number;
  tpm: number;
  fp: number;
}

export interface SeasonStats {
  teamId: string;
  teamName: string;
  ownerName: string;
  fgm: number;
  fga: number;
  ftm: number;
  fta: number;
  tpm: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  to: number;
  td: number;
  pts: number;
}

export interface CategoryStat {
  value: number;
  rank: number;
}

export interface CategoryStanding {
  teamId: string;
  teamName: string;
  ownerName: string;
  fgPct: CategoryStat;
  ftPct: CategoryStat;
  tpm: CategoryStat;
  reb: CategoryStat;
  ast: CategoryStat;
  stl: CategoryStat;
  blk: CategoryStat;
  to: CategoryStat;
  pts: CategoryStat;
}

export interface LuckTableEntry {
  teamId: string;
  teamName: string;
  ownerName: string;
  pf: number;
  pa: number;
  diff: number;
  pfPerMatch: number;
  paPerMatch: number;
  movesPerMatch: number;
}

export interface StatsData {
  matchesPlayed: number;
  seasonStats: SeasonStats[];
  categoryStandings: CategoryStanding[];
  luckTable: LuckTableEntry[];
}

// ─── History ──────────────────────────────────────────────────────────────────

export interface HistoricalTeam {
  rank: number;
  teamName: string;
  ownerName: string;
  wins: number;
  losses: number;
  pf: number;
  pa: number;
}

export interface HistoricalSeason {
  year: number;
  seasonLabel: string; // e.g. "2024-25"
  champion: HistoricalTeam | null;
  runnerUp: HistoricalTeam | null;
  lastPlace: HistoricalTeam | null;
  finalStandings: HistoricalTeam[];
  mvpPlayer: string;
  notes: string;
}

export interface SeasonOverride {
  year: number;
  mvpPlayer: string;
  notes: string;
}

// ─── Records ──────────────────────────────────────────────────────────────────

export interface Superlative {
  emoji: string;
  label: string;
  value: string;
  teamName: string;
  ownerName: string;
  context: string; // e.g. "Week 14 · 2024-25"
}

export interface H2HRecord {
  wins: number;
  losses: number;
}

export interface OwnerCareer {
  ownerName: string;
  championships: number;
  totalWins: number;
  totalLosses: number;
  winPct: number;
  avgWeeklyScore: number;
  seasonsPlayed: number;
  bestSeasonRecord: string; // e.g. "14-7"
}

export interface RecordsData {
  superlatives: Superlative[];
  h2hMap: Record<string, Record<string, H2HRecord>>;
  ownerNames: string[]; // stable sorted list for matrix axes
  hallOfFame: OwnerCareer[];
}

// ─── Draft Board ──────────────────────────────────────────────────────────────

export type DraftGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' | 'INJ' | '?';

export interface DraftPick {
  overallPick: number;   // 1-based
  round: number;
  roundPick: number;     // pick position within the round
  draftSlot: number;     // column index (team's original draft slot)
  teamId: number;
  ownerName: string;
  playerId: number;
  playerName: string;
  position: string;      // G / F / C
  proTeam: string;
  fp: number;            // season fantasy points (pts + reb*1.2 + ast*1.5 + tpm*3)
  pts: number;
  gp: number;            // games played (minutes / 30 proxy)
  seasonRank: number;    // rank among all drafted players by fp
  delta: number;         // overallPick - seasonRank (positive = outperformed)
  grade: DraftGrade;
}

export interface DraftTeamSlot {
  teamId: number;
  ownerName: string;
  teamName: string;
  draftSlot: number;     // 1 = first overall pick
}

export interface DraftBoardData {
  year: number;
  seasonLabel: string;
  teams: DraftTeamSlot[]; // sorted by draftSlot asc
  picks: DraftPick[];
  rounds: number;
  hasStats: boolean;      // false if player stats fetch failed
}

export interface RulesSection {
  title: string;
  rules: string[];
}

export interface RulesData {
  lastUpdated: string;
  sections: RulesSection[];
}
