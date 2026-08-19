import type { ScheduleWeek, ScheduleRow } from '@/lib/espn-schedule';

/** Game count drives the colour — that's the question the grid answers. */
function countColor(games: number, maxGames: number): string {
  if (games === 0) return 'text-muted';
  if (games >= maxGames && maxGames > 0) return 'text-positive-bright';
  if (games <= 2) return 'text-negative-bright';
  return 'text-foreground';
}

function rowTint(games: number, maxGames: number): string {
  if (games >= maxGames && maxGames > 0) return 'bg-positive-bright/[0.05]';
  if (games <= 2) return 'bg-negative-bright/[0.04]';
  return '';
}

function teamsWith(rows: ScheduleRow[], predicate: (r: ScheduleRow) => boolean): string {
  const hits = rows.filter(predicate).map(r => r.abbrev);
  return hits.length > 0 ? hits.join(', ') : '—';
}

function SummaryTile({ label, value, detail, tone }: {
  label: string;
  value: string;
  detail: string;
  tone: 'positive' | 'negative' | 'warning';
}) {
  const toneClass =
    tone === 'positive' ? 'text-positive-bright'
    : tone === 'negative' ? 'text-negative-bright'
    : 'text-warning-bright';

  return (
    <div className="bg-surface border border-border rounded-xl px-4 py-3 min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">{label}</p>
      <p className={`type-stat mt-1 ${toneClass}`}>{value}</p>
      <p className="text-[12px] text-secondary mt-0.5 break-words">{detail}</p>
    </div>
  );
}

export default function ScheduleMatrix({ week }: { week: ScheduleWeek }) {
  const { days, rows, maxGames, minGames } = week;

  const busiest = teamsWith(rows, r => r.gameCount === maxGames && maxGames > 0);
  const quietest = teamsWith(rows, r => r.gameCount === minGames);
  const mostB2B = Math.max(0, ...rows.map(r => r.backToBacks));
  const b2bTeams = teamsWith(rows, r => r.backToBacks === mostB2B && mostB2B > 0);

  return (
    <div className="space-y-4">
      {/* Week at a glance — the part worth screenshotting */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryTile
          label="Busiest"
          value={`${maxGames} games`}
          detail={busiest}
          tone="positive"
        />
        <SummaryTile
          label="Quietest"
          value={`${minGames} games`}
          detail={quietest}
          tone="negative"
        />
        <SummaryTile
          label="Most back-to-backs"
          value={mostB2B === 0 ? 'None' : `${mostB2B}×`}
          detail={mostB2B === 0 ? 'No team plays consecutive days' : b2bTeams}
          tone="warning"
        />
      </div>

      {/* The grid */}
      <div className="border border-border rounded-lg overflow-hidden bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: `${72 + days.length * 64 + 112}px` }}>
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                <th className="sticky left-0 bg-surface-secondary px-3 py-2 text-left w-[72px] z-10">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                    Team
                  </span>
                </th>
                {days.map(day => (
                  <th key={day.scoringPeriodId} className="px-1 py-2 text-center min-w-[64px]">
                    <span className="block text-[11px] font-semibold text-muted">
                      {day.weekday || '·'}
                    </span>
                    <span className="block text-[10px] text-secondary whitespace-nowrap">
                      {day.label || '—'}
                    </span>
                  </th>
                ))}
                <th className="px-2 py-2 text-center min-w-[56px] border-l border-border">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                    GP
                  </span>
                </th>
                <th className="px-2 py-2 text-center min-w-[56px]">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                    B2B
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.proTeamId}
                  className={`${i < rows.length - 1 ? 'border-b border-border' : ''} ${rowTint(row.gameCount, maxGames)}`}
                >
                  <td className="sticky left-0 bg-surface px-3 py-2 border-r border-border z-10">
                    <span className="text-[13px] font-semibold text-foreground">{row.abbrev}</span>
                  </td>

                  {row.cells.map((cell, idx) => (
                    <td key={days[idx].scoringPeriodId} className="px-1 py-2 text-center">
                      {cell ? (
                        <span
                          className={`inline-flex flex-col items-center leading-tight ${
                            cell.isBackToBack ? 'text-warning-bright' : 'text-foreground'
                          }`}
                          title={
                            `${cell.isHome ? 'vs' : 'at'} ${cell.opponent}` +
                            (cell.isBackToBack ? ' · back-to-back' : '')
                          }
                        >
                          <span className="text-[12px] font-medium whitespace-nowrap">
                            {cell.isHome ? '' : '@'}{cell.opponent}
                          </span>
                          {cell.isBackToBack && (
                            <span className="text-[9px] font-semibold uppercase tracking-wider">
                              b2b
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-[12px] text-border">·</span>
                      )}
                    </td>
                  ))}

                  <td className="px-2 py-2 text-center border-l border-border">
                    <span className={`text-[14px] font-semibold tabular-nums ${countColor(row.gameCount, maxGames)}`}>
                      {row.gameCount}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <span className={`text-[13px] tabular-nums ${row.backToBacks > 0 ? 'text-warning-bright font-semibold' : 'text-muted'}`}>
                      {row.backToBacks || '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2.5 border-t border-border bg-surface-secondary flex items-center gap-x-4 gap-y-1.5 flex-wrap">
          <span className="text-[11px] text-muted">
            <span className="text-foreground font-medium">BOS</span> = home ·{' '}
            <span className="text-foreground font-medium">@BOS</span> = away
          </span>
          <span className="text-[11px] text-muted">
            <span className="text-warning-bright font-semibold">b2b</span> = second of consecutive days
          </span>
          <span className="text-[11px] text-muted">
            GP = games this week, <span className="text-positive-bright font-semibold">green</span> for
            the most, <span className="text-negative-bright font-semibold">red</span> for two or fewer
          </span>
        </div>
      </div>
    </div>
  );
}
