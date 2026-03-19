export interface Streak {
  type: 'W' | 'L';
  count: number;
}

export interface StandingEntry {
  rank: number;
  teamId: string;
  teamName: string;
  ownerName: string;
  wins: number;
  losses: number;
  points: number;
  streak: Streak;
  isYou: boolean;
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

export interface Prize {
  place: string;
  ownerName: string;
  prize: string;
}

export interface SeasonChampion {
  teamName: string;
  ownerName: string;
  record: string;
  finalScore: number;
}

export interface SeasonRunnerUp {
  teamName: string;
  ownerName: string;
  record: string;
}

export interface HistoryEntry {
  season: string;
  champion: SeasonChampion;
  runnerUp: SeasonRunnerUp;
  prizes: Prize[];
  mvpPlayer: string;
  notes: string;
}

export interface RulesSection {
  title: string;
  rules: string[];
}

export interface RulesData {
  lastUpdated: string;
  sections: RulesSection[];
}
