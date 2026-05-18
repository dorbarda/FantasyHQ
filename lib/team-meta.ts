export interface TeamMeta {
  abbr: string;
  primary: string;
  secondary: string;
}

export const TEAM_META: Record<string, TeamMeta> = {
  "Oklahoma City Thunder":   { abbr: "OKC", primary: "#007AC1", secondary: "#EF3B24" },
  "Phoenix Suns":            { abbr: "PHX", primary: "#1D1160", secondary: "#E56020" },
  "San Antonio Spurs":       { abbr: "SAS", primary: "#000000", secondary: "#C4CED4" },
  "Portland Trail Blazers":  { abbr: "POR", primary: "#E03A3E", secondary: "#000000" },
  "Denver Nuggets":          { abbr: "DEN", primary: "#0E2240", secondary: "#FEC524" },
  "Minnesota Timberwolves":  { abbr: "MIN", primary: "#0C2340", secondary: "#236192" },
  "Los Angeles Lakers":      { abbr: "LAL", primary: "#552583", secondary: "#FDB927" },
  "Houston Rockets":         { abbr: "HOU", primary: "#CE1141", secondary: "#000000" },
  "Los Angeles Clippers":    { abbr: "LAC", primary: "#C8102E", secondary: "#1D428A" },
  "Golden State Warriors":   { abbr: "GSW", primary: "#1D428A", secondary: "#FFC72C" },
  "Detroit Pistons":         { abbr: "DET", primary: "#C8102E", secondary: "#1D42BA" },
  "Orlando Magic":           { abbr: "ORL", primary: "#0077C0", secondary: "#000000" },
  "Boston Celtics":          { abbr: "BOS", primary: "#007A33", secondary: "#BA9653" },
  "Philadelphia 76ers":      { abbr: "PHI", primary: "#006BB6", secondary: "#ED174C" },
  "New York Knicks":         { abbr: "NYK", primary: "#006BB6", secondary: "#F58426" },
  "Atlanta Hawks":           { abbr: "ATL", primary: "#E03A3E", secondary: "#C1D32F" },
  "Cleveland Cavaliers":     { abbr: "CLE", primary: "#860038", secondary: "#FDBB30" },
  "Toronto Raptors":         { abbr: "TOR", primary: "#CE1141", secondary: "#000000" },
  "Charlotte Hornets":       { abbr: "CHA", primary: "#1D1160", secondary: "#00788C" },
  "Miami Heat":              { abbr: "MIA", primary: "#98002E", secondary: "#F9A01B" },
};

export function getTeamMeta(team: string): TeamMeta {
  return TEAM_META[team] ?? {
    abbr: team.split(" ").pop()?.slice(0, 3).toUpperCase() ?? "???",
    primary: "#94A3B8",
    secondary: "#CBD5E1",
  };
}
