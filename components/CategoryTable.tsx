import { CategoryStanding } from '@/lib/types';

interface CategoryTableProps {
  standings: CategoryStanding[];
  teamCount: number;
}

function rankColor(rank: number, total: number): string {
  const pct = rank / total;
  if (pct <= 0.2) return 'bg-positive-bright/20 text-positive-bright font-semibold';
  if (pct <= 0.4) return 'bg-positive-bright/10 text-positive-bright font-semibold';
  if (pct <= 0.6) return 'text-muted';
  if (pct <= 0.8) return 'bg-negative-bright/10 text-negative-bright font-semibold';
  return 'bg-negative-bright/20 text-negative-bright font-semibold';
}

function CatCell({ stat, total, isTO = false }: {
  stat: { value: number; rank: number };
  total: number;
  isTO?: boolean;
}) {
  const color = rankColor(stat.rank, total);
  const display = isTO
    ? stat.value.toLocaleString()
    : stat.value > 1
      ? stat.value.toLocaleString()
      : (stat.value * 100).toFixed(2) + '%';

  return (
    <div className={`px-1 py-1.5 text-center text-[12px] rounded ${color}`}>
      {display}
    </div>
  );
}

const CATEGORIES = [
  { key: 'fgPct', label: 'FG%' },
  { key: 'ftPct', label: 'FT%' },
  { key: 'tpm',   label: '3PM' },
  { key: 'reb',   label: 'REB' },
  { key: 'ast',   label: 'AST' },
  { key: 'stl',   label: 'STL' },
  { key: 'blk',   label: 'BLK' },
  { key: 'to',    label: 'TO'  },
  { key: 'pts',   label: 'PTS' },
] as const;

export default function CategoryTable({ standings, teamCount }: CategoryTableProps) {
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="border-b border-border bg-surface-secondary">
              <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-muted w-[180px]">
                Team
              </th>
              {CATEGORIES.map(cat => (
                <th key={cat.key} className="px-1 py-2 text-[11px] font-semibold uppercase tracking-widest text-muted text-center">
                  {cat.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {standings.map((row, idx) => (
              <tr
                key={row.teamId}
                className={`
                  transition-colors cursor-default
                  ${idx < standings.length - 1 ? 'border-b border-border' : ''}
                  hover:bg-surface
                `}
              >
                <td className="px-4 py-2">
                  <p className="text-[13px] font-semibold text-foreground truncate max-w-[160px]">{row.teamName}</p>
                  <p className="text-[11px] text-secondary">{row.ownerName}</p>
                </td>
                <td className="px-1 py-2"><CatCell stat={row.fgPct} total={teamCount} /></td>
                <td className="px-1 py-2"><CatCell stat={row.ftPct} total={teamCount} /></td>
                <td className="px-1 py-2"><CatCell stat={row.tpm} total={teamCount} /></td>
                <td className="px-1 py-2"><CatCell stat={row.reb} total={teamCount} /></td>
                <td className="px-1 py-2"><CatCell stat={row.ast} total={teamCount} /></td>
                <td className="px-1 py-2"><CatCell stat={row.stl} total={teamCount} /></td>
                <td className="px-1 py-2"><CatCell stat={row.blk} total={teamCount} /></td>
                <td className="px-1 py-2"><CatCell stat={row.to} total={teamCount} isTO /></td>
                <td className="px-1 py-2"><CatCell stat={row.pts} total={teamCount} /></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-surface-secondary">
              <td className="px-4 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">Leader</span>
              </td>
              {CATEGORIES.map(cat => {
                const leader = standings.find(s => s[cat.key].rank === 1);
                return (
                  <td key={cat.key} className="px-1 py-2 text-center">
                    <span className="text-[11px] font-semibold text-positive-bright">
                      {leader ? leader.teamName.split(' ')[0] : '—'}
                    </span>
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-t border-border bg-surface-secondary flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-positive-bright/20"></div>
          <span className="text-[11px] text-muted">Top 20%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-positive-bright/10"></div>
          <span className="text-[11px] text-muted">Top 40%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-negative-bright/10"></div>
          <span className="text-[11px] text-muted">Bottom 40%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-negative-bright/20"></div>
          <span className="text-[11px] text-muted">Bottom 20%</span>
        </div>
        <span className="text-[11px] text-muted">· TO: lower is better</span>
      </div>
    </div>
  );
}
