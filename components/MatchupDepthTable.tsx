import type { MatchupDepthData } from '@/lib/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function heatColor(value: number, min: number, max: number): string {
  if (max === min) return '';
  const pct = (value - min) / (max - min);
  if (pct >= 0.7) return 'bg-[#34D399]/10 text-[#34D399]';
  if (pct >= 0.4) return 'bg-[#F1F5F9] text-[#94A3B8]';
  return 'bg-[#F87171]/8 text-[#F87171]';
}

function WL({ won }: { won: boolean | null }) {
  if (won === null) return <span className="text-[#475569] text-[11px]">—</span>;
  return (
    <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${won ? 'bg-[#34D399]/15 text-[#34D399]' : 'bg-[#F87171]/10 text-[#F87171]'}`}>
      {won ? 'W' : 'L'}
    </span>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────

interface Props {
  data: MatchupDepthData;
}

export default function MatchupDepthTable({ data }: Props) {
  const { rows, daysPerMatchup, completedPeriods } = data;

  if (rows.length === 0) {
    return (
      <div className="border border-[#E2E8F0] rounded-lg px-6 py-10 text-center bg-white">
        <p className="text-[15px] font-semibold text-[#0F172A]">No completed matchups yet</p>
        <p className="text-[13px] text-[#94A3B8] mt-1">Data will appear once week 1 is complete.</p>
      </div>
    );
  }

  const allTotals     = rows.map(r => r.totalPlayers);
  const allScorePP    = rows.map(r => r.scorePP);
  const allEfficiency = rows.map(r => r.efficiency);
  const minTotal = Math.min(...allTotals), maxTotal = Math.max(...allTotals);
  const minSPP   = Math.min(...allScorePP), maxSPP   = Math.max(...allScorePP);
  const minEff   = Math.min(...allEfficiency), maxEff = Math.max(...allEfficiency);

  const dayLabels = Array.from({ length: daysPerMatchup }, (_, i) => `D${i + 1}`);

  return (
    <div className="border border-[#E2E8F0] rounded-lg overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table style={{ minWidth: 900, width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F1F5F9]">
              <th className="sticky left-0 bg-[#F1F5F9] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8] w-8">WK</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8] min-w-[140px]">Team</th>
              {dayLabels.map(d => (
                <th key={d} className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8] w-8">{d}</th>
              ))}
              <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]">Total</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]">Score</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8] min-w-[110px]">Opponent</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]">Opp Score</th>
              <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]">W/L</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]">Score/PP</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]">Efficiency</th>
            </tr>
          </thead>
          <tbody>
            {completedPeriods.map(period => {
              const periodRows = rows.filter(r => r.matchupPeriod === period);
              return periodRows.map((row, rowIdx) => (
                <tr
                  key={`${period}-${row.teamId}`}
                  className={`border-b border-[#E2E8F0] last:border-0
                    ${rowIdx === 0 ? 'border-t-2 border-t-[#E4E7ED]' : ''}
                    hover:bg-white
                  `}
                >
                  {/* Week */}
                  <td className="sticky left-0 bg-inherit px-3 py-2 text-center">
                    {rowIdx === 0 ? (
                      <span className="text-[11px] font-semibold text-[#94A3B8]">{period}</span>
                    ) : null}
                  </td>

                  {/* Team name */}
                  <td className="px-3 py-2">
                    <p className="text-[12px] font-semibold truncate max-w-[130px] text-[#0F172A]">
                      {row.ownerName.split(' ')[0]}
                    </p>
                    <p className="text-[10px] text-[#475569] truncate max-w-[130px]">{row.teamName}</p>
                  </td>

                  {/* Daily player counts */}
                  {Array.from({ length: daysPerMatchup }, (_, i) => {
                    const val = row.dailyPlayers[i] ?? 0;
                    const allVals = rows.flatMap(r => r.dailyPlayers[i] ?? 0);
                    const mn = Math.min(...allVals), mx = Math.max(...allVals);
                    return (
                      <td key={i} className="px-1 py-2 text-center">
                        <span className={`text-[12px] font-semibold tabular-nums rounded px-1 ${val > 0 ? heatColor(val, mn, mx) : 'text-[#D1D5DB]'}`}>
                          {val > 0 ? val : '—'}
                        </span>
                      </td>
                    );
                  })}

                  {/* Total players */}
                  <td className="px-3 py-2 text-center">
                    <span className={`text-[12px] font-semibold tabular-nums rounded px-1.5 py-0.5 ${heatColor(row.totalPlayers, minTotal, maxTotal)}`}>
                      {row.totalPlayers > 0 ? row.totalPlayers : '—'}
                    </span>
                  </td>

                  {/* Team score */}
                  <td className="px-3 py-2 text-right">
                    <span className={`text-[12px] font-bold tabular-nums ${row.won === true ? 'text-[#0F172A]' : 'text-[#94A3B8]'}`}>
                      {row.teamScore.toLocaleString()}
                    </span>
                  </td>

                  {/* Opponent */}
                  <td className="px-3 py-2">
                    <span className="text-[12px] text-[#94A3B8] truncate block max-w-[100px]">
                      {row.opponentName.split(' ')[0]}
                    </span>
                  </td>

                  {/* Opponent score */}
                  <td className="px-3 py-2 text-right">
                    <span className="text-[12px] tabular-nums text-[#94A3B8]">
                      {row.opponentScore.toLocaleString()}
                    </span>
                  </td>

                  {/* W/L */}
                  <td className="px-3 py-2 text-center">
                    <WL won={row.won} />
                  </td>

                  {/* Score PP */}
                  <td className="px-3 py-2 text-right">
                    <span className={`text-[12px] font-semibold tabular-nums rounded px-1.5 py-0.5 ${heatColor(row.scorePP, minSPP, maxSPP)}`}>
                      {row.scorePP > 0 ? row.scorePP.toFixed(1) : '—'}
                    </span>
                  </td>

                  {/* Efficiency */}
                  <td className="px-3 py-2 text-right">
                    <span className={`text-[12px] font-semibold tabular-nums rounded px-1.5 py-0.5 ${heatColor(row.efficiency, minEff, maxEff)}`}>
                      {row.efficiency > 0 ? row.efficiency.toFixed(2) : '—'}
                    </span>
                  </td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-3 border-t border-[#E2E8F0] bg-[#F1F5F9] text-[10px] text-[#94A3B8]">
        <span><strong>Score/PP</strong> = Team Score ÷ Players Played</span>
        <span><strong>Efficiency</strong> = Score/PP ÷ Players Played</span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-[#34D399]/20" /> high
          <span className="inline-block w-3 h-3 rounded bg-[#F87171]/10 ml-1" /> low
        </span>
        {rows.some(r => r.totalPlayers === 0) && (
          <span className="text-[#FB923C]">— = per-day roster data unavailable (team totals still shown)</span>
        )}
      </div>
    </div>
  );
}
