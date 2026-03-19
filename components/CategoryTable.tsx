import { CategoryStanding } from '@/lib/types';

interface CategoryTableProps {
  standings: CategoryStanding[];
  teamCount: number;
}

function rankColor(rank: number, total: number): string {
  const pct = rank / total;
  if (pct <= 0.2) return 'bg-[#00ba7c]/20 text-[#007a52] font-bold';
  if (pct <= 0.4) return 'bg-[#00ba7c]/10 text-[#00ba7c] font-bold';
  if (pct <= 0.6) return 'text-[#536471]';
  if (pct <= 0.8) return 'bg-[#f4212e]/10 text-[#f4212e] font-bold';
  return 'bg-[#f4212e]/20 text-[#c0001f] font-bold';
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
    <div className="border border-[#eff3f4] rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="border-b border-[#eff3f4] bg-[#f7f9f9]">
              <th className="text-left px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-[#536471] w-[180px]">
                Team
              </th>
              {CATEGORIES.map(cat => (
                <th key={cat.key} className="px-1 py-2 text-[11px] font-bold uppercase tracking-widest text-[#536471] text-center">
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
                  ${idx < standings.length - 1 ? 'border-b border-[#eff3f4]' : ''}
                  hover:bg-[#f7f9f9]
                `}
              >
                <td className="px-4 py-2.5">
                  <p className="text-[13px] font-bold text-[#0f1419] truncate max-w-[160px]">{row.teamName}</p>
                  <p className="text-[11px] text-[#536471]">{row.ownerName}</p>
                </td>
                <td className="px-1 py-2">
                  <CatCell stat={row.fgPct} total={teamCount} />
                </td>
                <td className="px-1 py-2">
                  <CatCell stat={row.ftPct} total={teamCount} />
                </td>
                <td className="px-1 py-2">
                  <CatCell stat={row.tpm} total={teamCount} />
                </td>
                <td className="px-1 py-2">
                  <CatCell stat={row.reb} total={teamCount} />
                </td>
                <td className="px-1 py-2">
                  <CatCell stat={row.ast} total={teamCount} />
                </td>
                <td className="px-1 py-2">
                  <CatCell stat={row.stl} total={teamCount} />
                </td>
                <td className="px-1 py-2">
                  <CatCell stat={row.blk} total={teamCount} />
                </td>
                <td className="px-1 py-2">
                  <CatCell stat={row.to} total={teamCount} isTO />
                </td>
                <td className="px-1 py-2">
                  <CatCell stat={row.pts} total={teamCount} />
                </td>
              </tr>
            ))}
          </tbody>
          {/* Category rank row */}
          <tfoot>
            <tr className="border-t border-[#eff3f4] bg-[#f7f9f9]">
              <td className="px-4 py-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#536471]">Leader</span>
              </td>
              {CATEGORIES.map(cat => {
                const leader = standings.find(s => s[cat.key].rank === 1);
                return (
                  <td key={cat.key} className="px-1 py-2 text-center">
                    <span className="text-[11px] font-bold text-[#00ba7c]">
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
      <div className="px-4 py-2 border-t border-[#eff3f4] bg-[#f7f9f9] flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#00ba7c]/20"></div>
          <span className="text-[11px] text-[#536471]">Top 20%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#00ba7c]/10"></div>
          <span className="text-[11px] text-[#536471]">Top 40%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#f4212e]/10"></div>
          <span className="text-[11px] text-[#536471]">Bottom 40%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#f4212e]/20"></div>
          <span className="text-[11px] text-[#536471]">Bottom 20%</span>
        </div>
        <span className="text-[11px] text-[#536471]">· TO: lower is better</span>
      </div>
    </div>
  );
}
