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
  moves: number;
}

export interface MatchupTeam {
  teamId: string;
  teamName: string;
  ownerName: string;
  projectedScore: number;
  actualScore: number;
  wins: number;
  losses: number;
  playersRemainingToday: number;
}

export interface Matchup {
  id: string;
  home: MatchupTeam;
  away: MatchupTeam;
  isLive: boolean;
  isFinal: boolean;
  isBattleOfWeek: boolean;
  h2h: { homeWins: number; awayWins: number };
}

export interface MatchupsData {
  week: number;
  currentWeek: number;
  totalWeeks: number;
  matchups: Matchup[];
}

export interface Player {
  id: string;
  name: string;
  team: string;
  position: 'G' | 'F' | 'C';
  // Full season per-game averages
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tpm: number;
  to: number;
  fp: number;   // FP/g from league scoring rules
  // Last 7 days per-game averages
  pts7: number;
  reb7: number;
  ast7: number;
  stl7: number;
  blk7: number;
  tpm7: number;
  to7: number;
  fp7: number;  // L7 FP/g from league scoring rules
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

// ─── Matchup Depth ────────────────────────────────────────────────────────────

export interface MatchupDepthRow {
  matchupPeriod: number;
  teamId: string;
  teamName: string;
  ownerName: string;
  dailyPlayers: number[];     // players who played each day of the matchup (length = days in week)
  totalPlayers: number;       // sum of dailyPlayers
  teamScore: number;
  opponentName: string;
  opponentScore: number;
  won: boolean | null;        // null = in progress
  scorePP: number;            // teamScore / totalPlayers
  efficiency: number;         // scorePP / totalPlayers  (= teamScore / totalPlayers²)
}

export interface MatchupDepthData {
  rows: MatchupDepthRow[];
  daysPerMatchup: number;     // usually 7
  currentMatchupPeriod: number;
  completedPeriods: number[];
}

// ─── Playoff Bracket ─────────────────────────────────────────────────────────

export interface BracketTeam {
  teamId: string;
  teamName: string;
  ownerName: string;
  score: number;
  seed: number;
  playersRemainingToday: number;
}

export interface BracketMatchup {
  id: string;
  round: number;              // 1 = first playoff round
  bracketType: 'winners' | 'consolation';
  matchupPeriodId: number;
  home: BracketTeam;
  away: BracketTeam | null;
  winner: 'home' | 'away' | null;
  isCurrentRound: boolean;
}

export interface PlayoffBracketData {
  isPlayoffs: boolean;
  currentMatchupPeriod: number;
  totalRounds: number;
  winners: BracketMatchup[];
  consolation: BracketMatchup[];
  champion: BracketTeam | null;
}

// ─── NBA Scoreboard ───────────────────────────────────────────────────────────

export interface NBATeam {
  tricode: string;
  city: string;
  name: string;
  score: number;
  wins: number;
  losses: number;
}

export interface NBAGame {
  gameId: string;
  status: 'pre' | 'live' | 'final';
  statusText: string;
  period: number;
  gameTimeUTC: string;
  homeTeam: NBATeam;
  awayTeam: NBATeam;
}

// ─── NBA Live Page ────────────────────────────────────────────────────────────

export interface NBAConferenceStanding {
  rank: number;
  teamTricode: string;
  teamCity: string;
  teamName: string;
  wins: number;
  losses: number;
  pct: number;
  gb: string;
  homeRecord: string;
  awayRecord: string;
  l10: string;
  streak: string;
  clinched: string;
}

export interface NBAStatLeader {
  rank: number;
  playerId: number;
  playerName: string;
  team: string;
  gp: number;
  value: number;
}

export interface NBAStatLeadersData {
  pts: NBAStatLeader[];
  reb: NBAStatLeader[];
  ast: NBAStatLeader[];
  stl: NBAStatLeader[];
  blk: NBAStatLeader[];
  tpm: NBAStatLeader[];
}

export interface CategoryPercentiles {
  ownerName: string;
  fgPct: number;
  ftPct: number;
  tpm: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  to: number;
  pts: number;
  seasonsCount: number;
}

// ─── History ─────────────────────────────────────────────────────────────────

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

// ─── Transactions ─────────────────────────────────────────────────────────────

export interface TransactionPlayer {
  playerId: number;
  playerName: string;
  proTeam: string;
  position: string;
  addCount: number;
}

export interface FantasyTeamActivity {
  teamId: string;
  teamName: string;
  ownerName: string;
  topPlayer: string;
  topPlayerProTeam: string;
  topPlayerCount: number;
  totalAdds: number;
}

export interface TradedPlayer {
  playerId: number;
  playerName: string;
  proTeam: string;
  position: string;
}

export interface TradeTeam {
  teamId: number;
  teamName: string;
  ownerName: string;
}

export interface TradeEvent {
  tradeId: string;
  date: number; // ms timestamp
  teamA: TradeTeam;
  teamB: TradeTeam;
  teamAReceived: TradedPlayer[];
  teamBReceived: TradedPlayer[];
}

export interface TransactionsData {
  topAddedPlayers: TransactionPlayer[];
  addsByNbaTeam: { team: string; count: number }[];
  byFantasyTeam: FantasyTeamActivity[];
  totalAdds: number;
  trades: TradeEvent[];
}

// ─── NBA Playoff Betting ──────────────────────────────────────────────────────

export interface PlayoffFine { ownerName: string; points: number; reason: string; }

export interface PlayoffPlayInBet { gameId: string; pick: string; }
export interface PlayoffSeriesBet { seriesId: string; pick: string; score: '4-0' | '4-1' | '4-2' | '4-3'; }
export interface PlayoffBonusBets { westChampion: string; eastChampion: string; nbaChampion: string; }
export interface OwnerPlayoffBets {
  ownerName: string;
  bonusBets: PlayoffBonusBets;
  playIn: PlayoffPlayInBet[];
  series: PlayoffSeriesBet[];
}

export interface PlayInResult  { gameId: string; conference: 'east' | 'west'; label: string; teams: [string, string]; winner: string | null; }
export interface SeriesResult  { seriesId: string; round: 1 | 2 | 3 | 4; conference: 'east' | 'west' | 'finals'; label: string; teams: [string, string]; winner: string | null; score: string | null; }
export interface PlayoffResults { playIn: PlayInResult[]; series: SeriesResult[]; }

export type SeriesScoreStatus = 'pending' | 'correct' | 'exact' | 'wrong43' | 'wrong';

export interface SeriesScoreDetail {
  seriesId: string;
  earned: number;
  status: SeriesScoreStatus;
}

export interface OwnerScoreResult {
  total: number;
  bySection: { playIn: number; rounds: [number, number, number, number]; bonus: number };
  detail: SeriesScoreDetail[];
}

// ─── Rules ────────────────────────────────────────────────────────────────────

export interface RulesSection {
  title: string;
  rules: string[];
}

export interface RulesData {
  lastUpdated: string;
  sections: RulesSection[];
}
