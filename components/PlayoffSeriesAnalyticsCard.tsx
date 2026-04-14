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
  winPicks: string[];    // which team each owner picked to win
  scorePicks: string[];  // score each owner picked (empty for play-in)
  isPlayIn?: boolean;
}

function shortName(team: string) {
  const parts = team.trim().split(' ');
  return parts[parts.length - 1]; // last word, e.g. "Thunder", "Celtics"
}

export default function PlayoffSeriesAnalyticsCard({ label, teams, winPicks, scorePicks, isPlayIn }: Props) {
  const total = winPicks.filter(Boolean).length;

  // ── Win split ──────────────────────────────────────────────────────────────
  const teamACt = winPicks.filter(p => p.trim().toLowerCase() === teams[0].trim().toLowerCase()).length;
  const teamBCt = winPicks.filter(p => p.trim().toLowerCase() === teams[1].trim().toLowerCase()).length;
  const teamAPct = total > 0 ? Math.round((teamACt / total) * 100) : 0;
  const teamBPct = total > 0 ? Math.round((teamBCt / total) * 100) : 0;

  // ── Pie data ───────────────────────────────────────────────────────────────
  let pieData: { name: string; value: number; color: string }[];

  if (isPlayIn || scorePicks.filter(Boolean).length === 0) {
    // Play-in: pie = team win distribution
    pieData = [
      { name: shortName(teams[0]) || 'Team A', value: teamACt,        color: TEAM_COLORS[0] },
      { name: shortName(teams[1]) || 'Team B', value: teamBCt,        color: TEAM_COLORS[1] },
    ].filter(d => d.value > 0);
  } else {
    // Series: pie = score distribution
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

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col gap-3">
      <p className="text-[12px] font-semibold text-[#0F172A]">{label}</p>

      {/* Teams */}
      {(teams[0] || teams[1]) && (
        <p className="text-[11px] text-[#64748B] -mt-1">
          {teams[0] || '?'} <span className="text-[#94A3B8] mx-1">vs</span> {teams[1] || '?'}
        </p>
      )}

      {total === 0 ? (
        <p className="text-[12px] text-[#94A3B8] italic">No bets yet</p>
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
            <div className="border-t border-[#F1F5F9] pt-3 space-y-2">
              {[
                { team: teams[0], count: teamACt, pct: teamAPct, color: TEAM_COLORS[0] },
                { team: teams[1], count: teamBCt, pct: teamBPct, color: TEAM_COLORS[1] },
              ].map(({ team, count, pct, color }) => team ? (
                <div key={team} className="flex items-center gap-2">
                  <span
                    className="shrink-0 w-2 h-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-[11px] text-[#0F172A] flex-1 truncate">{team}</span>
                  <span className="text-[11px] font-semibold text-[#475569] shrink-0">
                    {count}/{total} · {pct}%
                  </span>
                </div>
              ) : null)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
