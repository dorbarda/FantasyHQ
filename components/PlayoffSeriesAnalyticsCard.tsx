'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const SCORE_COLORS: Record<string, string> = {
  '4-0': '#10B981',
  '4-1': '#3B82F6',
  '4-2': '#8B5CF6',
  '4-3': '#F59E0B',
};

const TEAM_COLORS = ['#C8956C', '#475569'];

interface Props {
  label: string;
  teams: [string, string];
  winPicks: string[];
  scorePicks: string[];
  ownerNames: string[];
  isPlayIn?: boolean;
}

function shortName(team: string) {
  const parts = team.trim().split(' ');
  return parts[parts.length - 1];
}

export default function PlayoffSeriesAnalyticsCard({ label, teams, winPicks, scorePicks, ownerNames, isPlayIn }: Props) {
  const total = winPicks.filter(Boolean).length;

  // ── Win split ──────────────────────────────────────────────────────────────
  const teamACt = winPicks.filter(p => p.trim().toLowerCase() === teams[0].trim().toLowerCase()).length;
  const teamBCt = winPicks.filter(p => p.trim().toLowerCase() === teams[1].trim().toLowerCase()).length;
  const teamAPct = total > 0 ? Math.round((teamACt / total) * 100) : 0;
  const teamBPct = total > 0 ? Math.round((teamBCt / total) * 100) : 0;

  // ── Pie data ───────────────────────────────────────────────────────────────
  let pieData: { name: string; value: number; color: string }[];

  if (isPlayIn || scorePicks.filter(Boolean).length === 0) {
    pieData = [
      { name: shortName(teams[0]) || 'Team A', value: teamACt, color: TEAM_COLORS[0] },
      { name: shortName(teams[1]) || 'Team B', value: teamBCt, color: TEAM_COLORS[1] },
    ].filter(d => d.value > 0);
  } else {
    const counts: Record<string, number> = {};
    for (const s of scorePicks) {
      if (s) counts[s] = (counts[s] ?? 0) + 1;
    }
    pieData = Object.entries(counts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([score, value]) => ({
        name: score,
        value,
        color: SCORE_COLORS[score] ?? '#94A3B8',
      }));
  }

  const hasPie = pieData.length > 0 && total > 0;

  // ── Contrarian bet ─────────────────────────────────────────────────────────
  const ownerBets = ownerNames
    .map((name, i) => ({
      owner: name.split(' ')[0],
      team: winPicks[i] ?? '',
      score: scorePicks[i] ?? '',
    }))
    .filter(b => b.team);

  const comboCounts: Record<string, number> = {};
  for (const b of ownerBets) {
    const key = isPlayIn ? b.team : `${b.team}|${b.score}`;
    comboCounts[key] = (comboCounts[key] ?? 0) + 1;
  }

  const contrarian = ownerBets.find(b => {
    const key = isPlayIn ? b.team : `${b.team}|${b.score}`;
    return comboCounts[key] === 1;
  }) ?? null;

  return (
    <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
      {/* Header: team names as primary, seed label as secondary */}
      {(teams[0] && teams[1]) ? (
        <div>
          <p className="text-[12px] font-semibold text-foreground leading-tight">
            {shortName(teams[0])} <span className="text-muted font-normal">vs</span> {shortName(teams[1])}
          </p>
          <p className="text-[10px] text-muted mt-0.5">{label}</p>
        </div>
      ) : (
        <p className="text-[12px] font-semibold text-foreground">{label}</p>
      )}

      {total === 0 ? (
        <p className="text-[12px] text-muted italic">No bets yet</p>
      ) : (
        <>
          {/* Pie chart */}
          {hasPie && (
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name} (${value})`}
                    labelLine={false}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Win % split */}
          {!isPlayIn && (
            <div className="border-t border-surface-secondary pt-3 space-y-2">
              {[
                { team: teams[0], count: teamACt, pct: teamAPct, color: TEAM_COLORS[0] },
                { team: teams[1], count: teamBCt, pct: teamBPct, color: TEAM_COLORS[1] },
              ].map(({ team, count, pct, color }) => team ? (
                <div key={team} className="flex items-center gap-2">
                  <span className="shrink-0 w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[11px] text-foreground flex-1 truncate">{team}</span>
                  <span className="text-[11px] font-semibold text-secondary shrink-0">
                    {count}/{total} · {pct}%
                  </span>
                </div>
              ) : null)}
            </div>
          )}

          {/* Contrarian bet */}
          {contrarian && (
            <div className="border-t border-surface-secondary pt-2">
              <p className="text-[9px] font-bold uppercase tracking-wide text-muted mb-1">Contrarian</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px]">🎯</span>
                <span className="text-[11px] font-semibold text-secondary">{contrarian.owner}</span>
                <span className="text-[10px] text-muted">·</span>
                <span className="text-[11px] font-medium text-foreground">{shortName(contrarian.team)}</span>
                {!isPlayIn && contrarian.score && (
                  <span className="text-[10px] text-tertiary">({contrarian.score})</span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
