import { SeasonStats } from '@/lib/types';

interface SeasonStatsTableProps {
  stats: SeasonStats[];
}

export default function SeasonStatsTable({ stats }: SeasonStatsTableProps) {
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-border bg-surface-secondary">
              <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-muted w-[160px] sticky left-0 bg-surface-secondary">
                Team
              </th>
              {['FGM','FGA','FTM','FTA','3PM','REB','AST','STL','BLK','TO','TD','PTS'].map(col => (
                <th key={col} className={`px-2 py-2 text-[11px] font-semibold uppercase tracking-widest text-right ${
                  col === 'PTS' ? 'text-accent' : 'text-muted'
                }`}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.map((row, idx) => (
              <tr
                key={row.teamId}
                className={`
                  transition-colors cursor-default
                  ${idx < stats.length - 1 ? 'border-b border-border' : ''}
                  hover:bg-surface
                `}
              >
                <td className="px-4 py-2 sticky left-0 bg-surface">
                  <p className="text-[13px] font-semibold text-foreground truncate max-w-[148px]">{row.teamName}</p>
                  <p className="text-[11px] text-secondary">{row.ownerName}</p>
                </td>
                <td className="px-2 py-2 text-[13px] font-medium text-foreground text-right tabular-nums">{row.fgm.toLocaleString()}</td>
                <td className="px-2 py-2 text-[13px] font-medium text-muted text-right tabular-nums">{row.fga.toLocaleString()}</td>
                <td className="px-2 py-2 text-[13px] font-medium text-foreground text-right tabular-nums">{row.ftm.toLocaleString()}</td>
                <td className="px-2 py-2 text-[13px] font-medium text-muted text-right tabular-nums">{row.fta.toLocaleString()}</td>
                <td className="px-2 py-2 text-[13px] font-medium text-foreground text-right tabular-nums">{row.tpm.toLocaleString()}</td>
                <td className="px-2 py-2 text-[13px] font-medium text-foreground text-right tabular-nums">{row.reb.toLocaleString()}</td>
                <td className="px-2 py-2 text-[13px] font-medium text-foreground text-right tabular-nums">{row.ast.toLocaleString()}</td>
                <td className="px-2 py-2 text-[13px] font-medium text-foreground text-right tabular-nums">{row.stl.toLocaleString()}</td>
                <td className="px-2 py-2 text-[13px] font-medium text-foreground text-right tabular-nums">{row.blk.toLocaleString()}</td>
                <td className="px-2 py-2 text-[13px] font-medium text-negative-bright text-right tabular-nums">{row.to.toLocaleString()}</td>
                <td className="px-2 py-2 text-[13px] font-medium text-foreground text-right tabular-nums">{row.td}</td>
                <td className="px-2 py-2 text-[13px] font-bold text-accent text-right tabular-nums">{row.pts.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 border-t border-border bg-surface-secondary">
        <p className="text-[11px] text-muted">Season cumulative totals · Swipe right for all columns · TO in red (lower is better) · TD = Triple Doubles</p>
      </div>
    </div>
  );
}
