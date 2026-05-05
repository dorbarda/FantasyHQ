// Shared data for FantasyHQ Playoff designs
// Sourced from data/playoff-bets.json + data/playoff-results.json

window.PLAYOFF_DATA = (function () {
  const owners = [
    { name: "Yuval Halevy",   color: "#EF4444" },
    { name: "Barak Miller",   color: "#3B82F6" },
    { name: "Dor Gelless",    color: "#10B981" },
    { name: "Ilay Mendel",    color: "#8B5CF6" },
    { name: "Yoav Coracos",   color: "#F59E0B" },
    { name: "Dor Barda",      color: "#0EA5E9" },
    { name: "Omer Rosenberg", color: "#EC4899" },
    { name: "Yotam Goldin",   color: "#14B8A6" },
    { name: "Amir Ben Izhak", color: "#A855F7" },
  ];

  // Team meta (real NBA city/name + brand colors)
  const TEAMS = {
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

  const playInResults = [
    { gameId: "east-7v8",   label: "East #7 vs #8",  teams: ["Philadelphia 76ers","Orlando Magic"],            winner: "Philadelphia 76ers" },
    { gameId: "east-9v10",  label: "East #9 vs #10", teams: ["Charlotte Hornets","Miami Heat"],                winner: "Charlotte Hornets" },
    { gameId: "east-loser", label: "East Survivor",  teams: ["Orlando Magic","Charlotte Hornets"],             winner: "Orlando Magic" },
    { gameId: "west-7v8",   label: "West #7 vs #8",  teams: ["Phoenix Suns","Portland Trail Blazers"],         winner: "Portland Trail Blazers" },
    { gameId: "west-9v10",  label: "West #9 vs #10", teams: ["Los Angeles Clippers","Golden State Warriors"],  winner: "Golden State Warriors" },
    { gameId: "west-loser", label: "West Survivor",  teams: ["Phoenix Suns","Golden State Warriors"],          winner: "Phoenix Suns" },
  ];

  const seriesResults = [
    { id: "r1-e1", round: 1, conf: "east", label: "East 1v8", teams: ["Detroit Pistons","Orlando Magic"],          winner: "Detroit Pistons",       score: "4-3" },
    { id: "r1-e2", round: 1, conf: "east", label: "East 2v7", teams: ["Boston Celtics","Philadelphia 76ers"],      winner: "Philadelphia 76ers",    score: "4-3" },
    { id: "r1-e3", round: 1, conf: "east", label: "East 3v6", teams: ["New York Knicks","Atlanta Hawks"],          winner: "New York Knicks",       score: "4-2" },
    { id: "r1-e4", round: 1, conf: "east", label: "East 4v5", teams: ["Cleveland Cavaliers","Toronto Raptors"],    winner: "Cleveland Cavaliers",   score: "4-3" },
    { id: "r1-w1", round: 1, conf: "west", label: "West 1v8", teams: ["Oklahoma City Thunder","Phoenix Suns"],     winner: "Oklahoma City Thunder", score: "4-0" },
    { id: "r1-w2", round: 1, conf: "west", label: "West 2v7", teams: ["San Antonio Spurs","Portland Trail Blazers"], winner: "San Antonio Spurs",   score: "4-1" },
    { id: "r1-w3", round: 1, conf: "west", label: "West 3v6", teams: ["Denver Nuggets","Minnesota Timberwolves"],  winner: "Minnesota Timberwolves", score: "4-2" },
    { id: "r1-w4", round: 1, conf: "west", label: "West 4v5", teams: ["Los Angeles Lakers","Houston Rockets"],     winner: "Los Angeles Lakers",    score: "4-2" },
    { id: "r2-e1", round: 2, conf: "east", label: "East Semis 1", teams: ["Detroit Pistons","Cleveland Cavaliers"], winner: null, score: null },
    { id: "r2-e2", round: 2, conf: "east", label: "East Semis 2", teams: ["New York Knicks","Philadelphia 76ers"],  winner: null, score: null },
    { id: "r2-w1", round: 2, conf: "west", label: "West Semis 1", teams: ["Oklahoma City Thunder","Los Angeles Lakers"], winner: null, score: null },
    { id: "r2-w2", round: 2, conf: "west", label: "West Semis 2", teams: ["Minnesota Timberwolves","San Antonio Spurs"], winner: null, score: null },
  ];

  // owner -> { seriesId: {pick, score} }
  const bets = {
    "Yuval Halevy":   { "r1-w1":["Oklahoma City Thunder","4-0"], "r1-w2":["San Antonio Spurs","4-2"], "r1-w3":["Denver Nuggets","4-3"], "r1-w4":["Houston Rockets","4-2"], "r1-e1":["Detroit Pistons","4-1"], "r1-e2":["Boston Celtics","4-1"], "r1-e3":["New York Knicks","4-2"], "r1-e4":["Cleveland Cavaliers","4-2"], "r2-e1":["Detroit Pistons","4-3"], "r2-e2":["New York Knicks","4-3"], "r2-w1":["Oklahoma City Thunder","4-1"], "r2-w2":["San Antonio Spurs","4-2"] },
    "Barak Miller":   { "r1-w1":["Oklahoma City Thunder","4-0"], "r1-w2":["San Antonio Spurs","4-1"], "r1-w3":["Denver Nuggets","4-3"], "r1-w4":["Houston Rockets","4-2"], "r1-e1":["Orlando Magic","4-3"],   "r1-e2":["Boston Celtics","4-1"], "r1-e3":["New York Knicks","4-0"], "r1-e4":["Cleveland Cavaliers","4-1"], "r2-e1":["Cleveland Cavaliers","4-2"], "r2-e2":["Philadelphia 76ers","4-2"], "r2-w1":["Oklahoma City Thunder","4-1"], "r2-w2":["San Antonio Spurs","4-3"] },
    "Dor Gelless":    { "r1-w1":["Oklahoma City Thunder","4-0"], "r1-w2":["San Antonio Spurs","4-0"], "r1-w3":["Denver Nuggets","4-3"], "r1-w4":["Houston Rockets","4-1"], "r1-e1":["Detroit Pistons","4-1"], "r1-e2":["Boston Celtics","4-0"], "r1-e3":["New York Knicks","4-2"], "r1-e4":["Cleveland Cavaliers","4-2"], "r2-e1":["Cleveland Cavaliers","4-2"], "r2-e2":["New York Knicks","4-2"],     "r2-w1":["Oklahoma City Thunder","4-1"], "r2-w2":["Minnesota Timberwolves","4-3"] },
    "Ilay Mendel":    { "r1-w1":["Oklahoma City Thunder","4-0"], "r1-w2":["San Antonio Spurs","4-2"], "r1-w3":["Denver Nuggets","4-2"], "r1-w4":["Houston Rockets","4-1"], "r1-e1":["Detroit Pistons","4-1"], "r1-e2":["Boston Celtics","4-1"], "r1-e3":["New York Knicks","4-3"], "r1-e4":["Cleveland Cavaliers","4-0"], "r2-e1":["Detroit Pistons","4-3"],     "r2-e2":["Philadelphia 76ers","4-2"], "r2-w1":["Oklahoma City Thunder","4-2"], "r2-w2":["San Antonio Spurs","4-2"] },
    "Yoav Coracos":   { "r1-w1":["Oklahoma City Thunder","4-1"], "r1-w2":["San Antonio Spurs","4-1"], "r1-w3":["Denver Nuggets","4-2"], "r1-w4":["Houston Rockets","4-1"], "r1-e1":["Detroit Pistons","4-1"], "r1-e2":["Boston Celtics","4-1"], "r1-e3":["New York Knicks","4-3"], "r1-e4":["Cleveland Cavaliers","4-1"], "r2-e1":["Cleveland Cavaliers","4-2"], "r2-e2":["Philadelphia 76ers","4-2"], "r2-w1":["Oklahoma City Thunder","4-0"], "r2-w2":["Minnesota Timberwolves","4-3"] },
    "Dor Barda":      { "r1-w1":["Oklahoma City Thunder","4-2"], "r1-w2":["San Antonio Spurs","4-1"], "r1-w3":["Denver Nuggets","4-2"], "r1-w4":["Houston Rockets","4-0"], "r1-e1":["Detroit Pistons","4-0"], "r1-e2":["Boston Celtics","4-1"], "r1-e3":["New York Knicks","4-3"], "r1-e4":["Cleveland Cavaliers","4-3"], "r2-e1":["Detroit Pistons","4-3"],     "r2-e2":["New York Knicks","4-3"],     "r2-w1":["Oklahoma City Thunder","4-0"], "r2-w2":["Minnesota Timberwolves","4-3"] },
    "Omer Rosenberg": { "r1-w1":["Oklahoma City Thunder","4-0"], "r1-w2":["San Antonio Spurs","4-1"], "r1-w3":["Denver Nuggets","4-2"], "r1-w4":["Houston Rockets","4-2"], "r1-e1":["Detroit Pistons","4-2"], "r1-e2":["Boston Celtics","4-2"], "r1-e3":["New York Knicks","4-1"], "r1-e4":["Toronto Raptors","4-2"],     "r2-e1":["Cleveland Cavaliers","4-3"], "r2-e2":["New York Knicks","4-2"],     "r2-w1":["Oklahoma City Thunder","4-1"], "r2-w2":["San Antonio Spurs","4-1"] },
    "Yotam Goldin":   { "r1-w1":["Oklahoma City Thunder","4-0"], "r1-w2":["San Antonio Spurs","4-1"], "r1-w3":["Denver Nuggets","4-2"], "r1-w4":["Houston Rockets","4-1"], "r1-e1":["Detroit Pistons","4-1"], "r1-e2":["Boston Celtics","4-0"], "r1-e3":["New York Knicks","4-2"], "r1-e4":["Cleveland Cavaliers","4-2"], "r2-e1":[null,null], "r2-e2":["New York Knicks","4-2"],     "r2-w1":["Oklahoma City Thunder","4-1"], "r2-w2":["San Antonio Spurs","4-2"] },
    "Amir Ben Izhak": { "r1-w1":["Oklahoma City Thunder","4-1"], "r1-w2":["San Antonio Spurs","4-1"], "r1-w3":["Denver Nuggets","4-3"], "r1-w4":["Houston Rockets","4-2"], "r1-e1":["Detroit Pistons","4-1"], "r1-e2":["Boston Celtics","4-2"], "r1-e3":["New York Knicks","4-2"], "r1-e4":["Cleveland Cavaliers","4-3"], "r2-e1":["Detroit Pistons","4-3"],     "r2-e2":["Philadelphia 76ers","4-2"], "r2-w1":["Oklahoma City Thunder","4-1"], "r2-w2":["Minnesota Timberwolves","4-2"] },
  };

  // Compute totals for leaderboard (round 1 only, since only round 1 is complete)
  // Scoring: correct=2, exact=+2, wrong-but-43=+1
  function scoreFor(ownerName) {
    const ob = bets[ownerName] || {};
    let total = 0, correct = 0, exact = 0, wrong = 0, picks = 0, upsetsCalled = 0;
    seriesResults.forEach(s => {
      if (!s.winner) return;
      const [pick, score] = ob[s.id] || [];
      if (!pick) return;
      picks += 1;
      const isWin = pick === s.winner;
      if (isWin) {
        correct += 1; total += 2;
        if (score === s.score) { exact += 1; total += 2; }
        // upset = picked the lower seed (heuristic: winner team !== first listed in label)
        if (s.teams.indexOf(s.winner) === 1) upsetsCalled += 1;
      } else {
        wrong += 1;
        if (s.score === "4-3" && score === "4-3") total += 1;
      }
    });
    const acc = picks ? Math.round((correct / picks) * 100) : 0;
    return { total, correct, exact, wrong, picks, acc, upsetsCalled };
  }

  // Streaks (most recent N completed series for an owner, in series order)
  function streakFor(ownerName) {
    const ob = bets[ownerName] || {};
    const completed = seriesResults.filter(s => s.winner);
    return completed.map(s => {
      const [pick, score] = ob[s.id] || [];
      if (!pick) return null;
      if (pick === s.winner) return score === s.score ? "exact" : "correct";
      return "wrong";
    });
  }

  // Series-level pick distribution
  function pickDistribution(seriesId) {
    const series = seriesResults.find(s => s.id === seriesId);
    if (!series) return null;
    const counts = {};
    Object.entries(bets).forEach(([owner, ob]) => {
      const [pick] = ob[seriesId] || [];
      if (!pick) return;
      counts[pick] = (counts[pick] || 0) + 1;
    });
    return counts;
  }

  // Per-team aggregates: who bet on this team across all their series
  function teamBetSummary() {
    const summary = {};
    seriesResults.forEach(s => {
      s.teams.forEach(team => {
        if (!summary[team]) summary[team] = { picks: [], series: [] };
      });
      Object.entries(bets).forEach(([owner, ob]) => {
        const [pick, score] = ob[s.id] || [];
        if (pick) {
          if (!summary[pick]) summary[pick] = { picks: [], series: [] };
          summary[pick].picks.push({ owner, seriesId: s.id, score, result: s.winner });
        }
      });
    });
    return summary;
  }

  // Rank
  const standings = owners
    .map(o => ({ ...o, ...scoreFor(o.name), streak: streakFor(o.name) }))
    .sort((a,b) => b.total - a.total);

  // Initials helper
  function initials(name) {
    return name.split(" ").map(p => p[0]).join("").slice(0,2).toUpperCase();
  }

  return {
    owners, TEAMS, playInResults, seriesResults, bets,
    scoreFor, streakFor, pickDistribution, teamBetSummary,
    standings, initials,
  };
})();
